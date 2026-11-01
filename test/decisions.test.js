const test = require('node:test');
const assert = require('node:assert');
const { parseFileAST } = require('../tools/src/parser/javascript');
const { diffFileASTDecisions, diffSymbolDecisions } = require('../tools/src/vcs/decision-diff');
const { formatDecisionDiffReport, buildSymbolDecisionCard, summarizeCodebaseDecisions } = require('../tools/src/commands/decisions');
const { generateCoachingReview, formatCoachingReview } = require('../tools/src/commands/review');
const { buildBlastRadiusIndex } = require('../tools/src/graph/graph-builder');

test('harvestFunctionDecisions & harvestFileDecisions extract all 4 Decision Lenses accurately', () => {
  const sampleCode = `
    const fs = require('node:fs');
    const { helper } = require('./local-helper');

    let cachedSession = null;
    const ALLOWED_ROLES = new Set(['admin', 'reviewer']);

    /**
     * Evaluates order risk and persists audit entry if critical.
     */
    function evaluateOrderPolicy(order, options = { strict: true }) {
      if (!order || !order.items) return null;
      if (options.dryRun) return { status: 'SKIPPED', score: 0 };

      const visitedItems = new Map();
      let totalScore = 0;

      for (const item of order.items) {
        if (item.amount > 1000) {
          totalScore += 50;
        }
        visitedItems.set(item.id, item);
      }

      if (totalScore >= 100) {
        fs.writeFileSync('/tmp/audit.json', JSON.stringify({ id: order.id, score: totalScore }));
        return { status: 'FLAGGED', score: totalScore };
      }

      return { status: 'APPROVED', score: totalScore };
    }

    module.exports = {
      evaluateOrderPolicy
    };
  `;

  const parsed = parseFileAST('src/services/OrderPolicy.js', sampleCode);

  // 1. File-level structural decisions
  assert.ok(parsed.fileDecisions);
  assert.deepStrictEqual(parsed.fileDecisions.externalDependencies, ['node:fs']);
  assert.deepStrictEqual(parsed.fileDecisions.internalImports, ['./local-helper']);
  assert.deepStrictEqual(parsed.fileDecisions.exportedSymbols, ['evaluateOrderPolicy']);
  assert.strictEqual(parsed.fileDecisions.moduleState.length, 2);
  assert.strictEqual(parsed.fileDecisions.moduleState[0].name, 'cachedSession');
  assert.strictEqual(parsed.fileDecisions.moduleState[0].kind, 'mutable_singleton');
  assert.strictEqual(parsed.fileDecisions.moduleState[1].name, 'ALLOWED_ROLES');
  assert.strictEqual(parsed.fileDecisions.moduleState[1].kind, 'static_Set');

  // 2. Symbol-level decisions across the 4 Lenses
  const fn = parsed.symbols.functions[0];
  assert.strictEqual(fn.name, 'evaluateOrderPolicy');
  const d = fn.decisions;
  assert.ok(d);

  // Contract & Data Lens
  assert.strictEqual(d.contract.visibility, 'exported');
  assert.strictEqual(d.contract.params.length, 2);
  assert.strictEqual(d.contract.params[1].kind, 'default_param');
  assert.deepStrictEqual(d.contract.accessedOptions, ['options.dryRun']);
  assert.strictEqual(d.contract.guards.length, 2);
  assert.strictEqual(d.contract.guards[0].condition, '!order || !order.items');
  assert.ok(d.contract.returns.shapes.includes('Object'));
  assert.ok(d.contract.returns.shapes.includes('null'));
  assert.deepStrictEqual(d.contract.returns.objectKeys, ['status', 'score']);
  assert.deepStrictEqual(d.data.collections, ['Map']);
  assert.strictEqual(d.data.mutatesState, true);

  // Behavioral & Heuristic Lens
  assert.strictEqual(d.control.archetype, 'indexer_aggregator');
  assert.strictEqual(d.control.scalingProfile, 'O(N) indexed-lookup');
  assert.ok(d.control.thresholds.includes('item.amount > 1000'));
  assert.ok(d.control.thresholds.includes('totalScore >= 100'));

  // Operational & Trust Lens
  assert.strictEqual(d.operational.isPure, false);
  assert.ok(d.operational.sideEffects.includes('filesystem_write'));
});

test('diffFileASTDecisions detects contract, data structure, heuristic threshold, and side-effect changes', () => {
  const beforeCode = `
    function matchCandidates(items, minScore = 50) {
      if (!items) return [];
      const matched = [];
      for (const item of items) {
        for (const other of items) {
          if (item.score >= 50 && item.id !== other.id) {
            matched.push(item.id);
          }
        }
      }
      return matched;
    }
    module.exports = {};
  `;

  const afterCode = `
    const fs = require('node:fs');
    let lastRunCache = null;

    function matchCandidates(items, minScore = 75, options = {}) {
      if (!items || items.length === 0) return null;
      const seen = new Set();
      for (const item of items) {
        if (item.score >= 75) {
          seen.add(item.id);
        }
      }
      if (options.persist) {
        fs.writeFileSync('out.json', JSON.stringify(Array.from(seen)));
      }
      return { ids: Array.from(seen), count: seen.size };
    }
    module.exports = { matchCandidates };
  `;

  const baseParsed = parseFileAST('src/Matcher.js', beforeCode);
  const targetParsed = parseFileAST('src/Matcher.js', afterCode);

  const fileDiff = diffFileASTDecisions('src/Matcher.js', baseParsed, targetParsed);

  // File-level deltas: external dependency, exported surface, module-level singleton
  const fileCategories = fileDiff.fileLevelDeltas.map(d => d.category);
  assert.ok(fileCategories.includes('External Supply Chain'));
  assert.ok(fileCategories.includes('Exported Module Surface'));
  assert.ok(fileCategories.includes('Module-Scope State / Singletons'));

  // Symbol-level deltas on matchCandidates
  assert.strictEqual(fileDiff.modifiedSymbolDecisions.length, 1);
  const symDeltas = fileDiff.modifiedSymbolDecisions[0].deltas;
  const categories = symDeltas.map(d => d.category);

  assert.ok(categories.includes('Module Export Visibility'));
  assert.ok(categories.includes('Signature Contract'));
  assert.ok(categories.includes('Options Contract'));
  assert.ok(categories.includes('Return Contract'));
  assert.ok(categories.includes('Data Structures'));
  assert.ok(categories.includes('Precondition Guards'));
  assert.ok(categories.includes('Scaling & Algorithmic Cost'));
  assert.ok(categories.includes('Domain Heuristics & Thresholds'));
  assert.ok(categories.includes('I/O & Side Effects'));

  // Verify formatted Decision Review Report contains the 4 Reviewer Lenses
  const reportText = formatDecisionDiffReport({
    gitRef: 'HEAD',
    touchedFilesCount: 1,
    fileDiffs: [fileDiff],
    pureRefactorings: [{ name: 'unchangedHelper', type: 'function', file: 'src/Matcher.js', lines: 'L40-L50' }]
  });

  assert.ok(reportText.includes('[Architecture & Structure]'));
  assert.ok(reportText.includes('[Contract & Data]'));
  assert.ok(reportText.includes('[Behavior & Heuristics]'));
  assert.ok(reportText.includes('[Operations & Trust]'));
  assert.ok(reportText.includes('[Pure Refactorings — Lines Changed, Zero Decisions Changed]'));
});

test('diffSymbolDecisions recognizes pure refactoring when comments/formatting or local variable names change', () => {
  const v1 = parseFileAST('src/calc.js', `
    function computeTotal(items) {
      if (!items) return 0;
      let sum = 0;
      for (const x of items) {
        if (x.price > 100) sum += x.price;
      }
      return sum;
    }
  `);

  const v2 = parseFileAST('src/calc.js', `
    // Refactored local variable names and formatting
    function computeTotal(items) {
      if (!items) return 0;

      let runningTotal = 0;
      for (const product of items) {
        if (product.price > 100) {
          runningTotal += product.price;
        }
      }
      return runningTotal;
    }
  `);

  const deltas = diffSymbolDecisions(v1.symbols.functions[0], v2.symbols.functions[0]);
  assert.strictEqual(deltas.length, 0);
});

test('generateCoachingReview translates decision anti-patterns into plain-English mentoring feedback', () => {
  const code = `
    let globalCounter = 0;

    function checkUserEligibility(user, items) {
      if (!user) return false;
      user.checked = true;
      for (const a of items) {
        for (const b of items) {
          if (a.score > 250 && b.score > 500) {
            return { eligible: true, bonus: a.score };
          }
        }
      }
      return { eligible: false };
    }

    module.exports = { checkUserEligibility };
  `;

  const filePath = '/tmp/UserEligibility.js';
  const parsed = parseFileAST(filePath, code);
  const allFileResults = [{ filePath, ...parsed }];
  const blastIndex = buildBlastRadiusIndex(allFileResults, '/tmp');
  const summary = summarizeCodebaseDecisions(allFileResults, blastIndex, '/tmp');
  const review = generateCoachingReview(summary, blastIndex);

  const titles = review.findings.map(f => f.title);
  assert.ok(titles.includes('Surprise Side Effects (Command-Query Separation)'));
  assert.ok(titles.includes('Inconsistent Return Contract'));
  assert.ok(titles.includes('Quadratic Scaling Loop (O(N^2) nested-loops)'));
  assert.ok(titles.includes('Shared Module-Level Mutable State'));
  assert.ok(titles.includes('Hardcoded Domain Thresholds ("Magic Numbers")'));

  const formatted = formatCoachingReview(review);
  assert.ok(formatted.includes('SENIOR DEVELOPER MENTORING & DECISION REVIEW'));
  assert.ok(formatted.includes('Decision Made :'));
  assert.ok(formatted.includes('Why It Matters:'));
  assert.ok(formatted.includes('How to Improve:'));
});

