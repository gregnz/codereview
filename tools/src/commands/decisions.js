/**
 * Decision Explorer & Decision Diff Formatter
 *
 * Provides a human-first, low-cognitive-load view of the decisions embedded in a
 * symbol, file, or directory across the 4 Reviewer Lenses:
 *   1. Architecture & Structure
 *   2. Contracts & Data
 *   3. Behavior & Heuristics
 *   4. Operations & Trust
 */

const path = require('node:path');
const { getLayerForFile } = require('../config/layers');
const { computeSymbolBlastSummary } = require('../metrics/blast-scoring');
const { resolveSymbolIds } = require('../graph/graph-builder');

function formatParamBrief(p) {
  if (!p) return '';
  if (p.kind === 'options_bag') {
    const keys = (p.keys && p.keys.length > 0) ? `{ ${p.keys.join(', ')} }` : p.name;
    return p.defaultValue ? `${keys} = ${p.defaultValue}` : keys;
  }
  if (p.kind === 'default_param') return `${p.name} = ${p.defaultValue}`;
  return p.name;
}

/**
 * Builds a structured Decision Card object for a symbol in the blastIndex.
 */
function buildSymbolDecisionCard(symbolId, blastIndex) {
  const sym = blastIndex.catalog.get(symbolId);
  if (!sym) return null;
  const br = computeSymbolBlastSummary(symbolId, blastIndex);
  const layer = getLayerForFile(sym.file);
  const d = sym.decisions || {};
  const fd = sym.fileDecisions || {};

  const paramsText = (d.contract?.params || []).map(formatParamBrief).join(', ');
  const retShapes = (d.contract?.returns?.shapes || []).join(' | ') || (sym.type === 'class' ? 'Instance' : 'void');
  const retKeys = (d.contract?.returns?.objectKeys || []).join(', ');
  const returnContract = retKeys ? `${retShapes} { ${retKeys} }` : retShapes;

  return {
    id: symbolId,
    name: sym.parentClass ? `${sym.parentClass}.${sym.name}` : sym.name,
    type: sym.type,
    file: sym.file,
    lines: `L${sym.startLine}-L${sym.endLine}`,
    comment: sym.comment || null,
    architecture: {
      layer,
      visibility: d.contract?.visibility || sym.visibility || 'internal',
      riskRating: br.riskCategory,
      riskScore: br.riskScore,
      directCallers: br.directCount,
      transitiveCallers: br.transitiveCount,
      outboundCalls: br.outboundCount,
      inCycle: br.inCycle,
      layerViolations: br.layerViolationsCount,
      externalDependencies: fd.externalDependencies || []
    },
    contractAndData: {
      signature: `${sym.name}(${paramsText})`,
      accessedOptions: d.contract?.accessedOptions || [],
      returnContract,
      enumKeys: sym.keys || null,
      collections: d.data?.collections || [],
      stateReads: d.data?.stateReads || [],
      stateWrites: d.data?.stateWrites || [],
      mutatesState: Boolean(d.data?.mutatesState),
      moduleState: fd.moduleState || []
    },
    behaviorAndHeuristics: {
      archetype: d.control?.archetype || sym.type,
      executionMode: d.control?.executionMode || 'sync',
      scalingProfile: d.control?.scalingProfile || 'O(1)',
      guards: d.contract?.guards || [],
      branchPredicates: d.control?.branchPredicates || [],
      thresholds: d.control?.thresholds || []
    },
    operationsAndTrust: {
      isPure: Boolean(d.operational?.isPure),
      deterministicSort: Boolean(d.operational?.deterministicSort),
      nonDeterministicSources: d.operational?.nonDeterministicSources || [],
      errorHandling: d.operational?.errorHandling || [],
      sideEffects: d.operational?.sideEffects || [],
      trustAndSanitization: d.operational?.trustAndSanitization || []
    }
  };
}

/**
 * Formats a single Symbol Decision Card for readable terminal output.
 */
function formatSymbolDecisionCard(card) {
  const lines = [];
  lines.push(`========================================================================`);
  lines.push(`🎯 DECISION CARD: ${card.name} (${card.type})`);
  lines.push(`   Location: ${card.file}:${card.lines} | Layer: ${card.architecture.layer}`);
  if (card.comment) {
    lines.push(`   Intent:   "${card.comment}"`);
  }
  lines.push(`========================================================================`);

  // 1. Architecture & Structure
  lines.push(`\n1. [Architecture & Structure]`);
  lines.push(`   • Visibility & Role : ${card.architecture.visibility} | Archetype: ${card.behaviorAndHeuristics.archetype}`);
  lines.push(`   • Coupling & Blast  : ${card.architecture.directCallers} direct callers (${card.architecture.transitiveCallers} transitive) | Calls ${card.architecture.outboundCalls} symbols | Risk: ${card.architecture.riskRating} (${card.architecture.riskScore})`);
  if (card.architecture.externalDependencies.length > 0) {
    lines.push(`   • External Packages : ${card.architecture.externalDependencies.join(', ')}`);
  }
  if (card.architecture.inCycle || card.architecture.layerViolations > 0) {
    lines.push(`   • Boundary Warnings : Cycle=${card.architecture.inCycle}, LayerViolations=${card.architecture.layerViolations}`);
  }

  // 2. Contract & Data
  lines.push(`\n2. [Contracts & Data Structures]`);
  if (card.type === 'enum') {
    lines.push(`   • State/Config Keys : ${(card.contractAndData.enumKeys || []).join(', ')}`);
  } else {
    lines.push(`   • Input Signature   : ${card.contractAndData.signature}`);
    if (card.contractAndData.accessedOptions.length > 0) {
      lines.push(`   • Options Consumed  : ${card.contractAndData.accessedOptions.join(', ')}`);
    }
    lines.push(`   • Return Contract   : ${card.contractAndData.returnContract}`);
    lines.push(`   • Data Structures   : ${card.contractAndData.collections.length > 0 ? card.contractAndData.collections.join(', ') : 'Primitives / Standard Arrays'}`);
    const mutText = card.contractAndData.mutatesState
      ? `Mutates state/collections${card.contractAndData.stateWrites.length > 0 ? ` (${card.contractAndData.stateWrites.join(', ')})` : ''}`
      : 'Immutable / Read-Only';
    lines.push(`   • Mutation Policy   : ${mutText}`);
  }

  // 3. Behavior & Heuristics
  if (card.type !== 'enum') {
    lines.push(`\n3. [Behavior, Control & Domain Heuristics]`);
    lines.push(`   • Execution & Cost  : ${card.behaviorAndHeuristics.executionMode} | Scaling: ${card.behaviorAndHeuristics.scalingProfile}`);
    if (card.behaviorAndHeuristics.guards.length > 0) {
      const gStr = card.behaviorAndHeuristics.guards.map(g => `if (${g.condition}) ➔ ${g.action}`).join('; ');
      lines.push(`   • Entry Preconditions: ${gStr}`);
    }
    if (card.behaviorAndHeuristics.thresholds.length > 0) {
      lines.push(`   • Domain Thresholds : ${card.behaviorAndHeuristics.thresholds.join(' | ')}`);
    }
    if (card.behaviorAndHeuristics.branchPredicates.length > 0) {
      lines.push(`   • Key Branch Rules  : ${card.behaviorAndHeuristics.branchPredicates.slice(0, 5).join('  ||  ')}`);
    }

    // 4. Operations & Trust
    lines.push(`\n4. [Operations, Side Effects & Trust]`);
    lines.push(`   • Side Effects / IO : ${card.operationsAndTrust.sideEffects.join(', ')}`);
    lines.push(`   • Error Strategy    : ${card.operationsAndTrust.errorHandling.join(', ')}`);
    const detParts = [card.operationsAndTrust.isPure ? 'Pure' : 'Impure'];
    if (card.operationsAndTrust.deterministicSort) detParts.push('Deterministic .sort()');
    if (card.operationsAndTrust.nonDeterministicSources.length > 0) {
      detParts.push(`Ambient inputs: ${card.operationsAndTrust.nonDeterministicSources.join(', ')}`);
    }
    lines.push(`   • Determinism       : ${detParts.join(' | ')}`);
    if (card.operationsAndTrust.trustAndSanitization.length > 0) {
      lines.push(`   • Trust / Validation: ${card.operationsAndTrust.trustAndSanitization.join(', ')}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Formats a high-level codebase or file Decision Summary when no single symbol is targeted.
 */
function summarizeCodebaseDecisions(allFileResults, blastIndex, rootDir, filterTarget = null) {
  const cards = [];
  for (const id of blastIndex.catalog.keys()) {
    const sym = blastIndex.catalog.get(id);
    if (filterTarget) {
      const normFilter = filterTarget.toLowerCase();
      if (
        !sym.file.toLowerCase().includes(normFilter) &&
        !sym.name.toLowerCase().includes(normFilter) &&
        !id.toLowerCase().includes(normFilter)
      ) {
        continue;
      }
    }
    const card = buildSymbolDecisionCard(id, blastIndex);
    if (card) cards.push(card);
  }

  // Group by archetype and collect key decisions across the codebase
  const archetypeCounts = {};
  const ioBoundaries = [];
  const statefulModules = [];
  const domainThresholds = [];

  const seenFiles = new Set();
  for (const r of allFileResults) {
    const rel = path.relative(rootDir, r.filePath);
    if (filterTarget && !rel.toLowerCase().includes(filterTarget.toLowerCase())) continue;
    if (seenFiles.has(rel)) continue;
    seenFiles.add(rel);
    if (r.fileDecisions?.moduleState?.length > 0) {
      statefulModules.push({
        file: rel,
        state: r.fileDecisions.moduleState.map(s => `${s.name} (${s.kind})`)
      });
    }
  }

  for (const c of cards) {
    if (c.type === 'function' || c.type === 'method') {
      const arch = c.behaviorAndHeuristics.archetype;
      archetypeCounts[arch] = (archetypeCounts[arch] || 0) + 1;

      const nonPureIO = c.operationsAndTrust.sideEffects.filter(s => s !== 'pure' && s !== 'console_io');
      if (nonPureIO.length > 0) {
        ioBoundaries.push({ name: c.name, file: c.file, lines: c.lines, effects: nonPureIO });
      }
      if (c.behaviorAndHeuristics.thresholds.length > 0) {
        domainThresholds.push({ name: c.name, file: c.file, thresholds: c.behaviorAndHeuristics.thresholds });
      }
    }
  }

  return {
    filterTarget,
    rootDir,
    totalSymbolsInspected: cards.length,
    archetypeDistribution: archetypeCounts,
    statefulModules,
    ioBoundaries,
    domainThresholds,
    cards
  };
}

function formatCodebaseDecisionSummary(summary) {
  const lines = [];
  lines.push(`========================================================================`);
  lines.push(`🏛️  ARCHITECTURAL & PROGRAM DECISION SUMMARY (${summary.totalSymbolsInspected} symbols)`);
  lines.push(`========================================================================`);

  if (summary.totalSymbolsInspected === 0) {
    lines.push(`\n⚠️  No symbols matched filter '${summary.filterTarget || ''}' in ${summary.rootDir || 'current directory'}.`);
    lines.push(`💡 Tip: To inspect the entire current project, run without a filter:`);
    lines.push(`   codereview decisions`);
    lines.push(`   (or pass a symbol/file name from this project, e.g. 'codereview decisions Ship')\n`);
    return lines.join('\n');
  }

  lines.push(`\n1. [Control Flow Archetypes]`);
  for (const [arch, count] of Object.entries(summary.archetypeDistribution).sort((a, b) => b[1] - a[1])) {
    lines.push(`   • ${arch.padEnd(24)} : ${count} symbols`);
  }

  lines.push(`\n2. [Module State, Caches & Policy Tables]`);
  if (summary.statefulModules.length === 0) {
    lines.push(`   • All inspected modules are stateless.`);
  } else {
    for (const m of summary.statefulModules) {
      lines.push(`   • ${m.file}: ${m.state.join(', ')}`);
    }
  }

  lines.push(`\n3. [I/O, Subprocess & Side-Effect Boundaries]`);
  if (summary.ioBoundaries.length === 0) {
    lines.push(`   • Pure computation (no filesystem/subprocess boundaries).`);
  } else {
    for (const io of summary.ioBoundaries.slice(0, 15)) {
      lines.push(`   • ${io.name} (${io.file}:${io.lines}) ➔ [${io.effects.join(', ')}]`);
    }
  }

  lines.push(`\n4. [Embedded Domain Heuristics & Thresholds]`);
  if (summary.domainThresholds.length === 0) {
    lines.push(`   • No numeric domain thresholds detected.`);
  } else {
    for (const dt of summary.domainThresholds.slice(0, 15)) {
      lines.push(`   • ${dt.name} (${dt.file}) ➔ ${dt.thresholds.join(', ')}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Formats a Git Decision Diff report into a concise Reviewer Decision Scorecard.
 */
function formatDecisionDiffReport(decisionDiff, changedReport = []) {
  const lines = [];
  lines.push(`========================================================================`);
  lines.push(`🔍 DECISION REVIEW DIFF (vs '${decisionDiff.gitRef}')`);
  lines.push(`========================================================================`);

  // Aggregate all deltas by Lens
  const byLens = {
    'Architecture & Structure': [],
    'Contract & Data': [],
    'Behavior & Heuristics': [],
    'Operations & Trust': []
  };

  let totalDecisionDeltas = 0;
  const allAdded = [];
  const allRemoved = [];

  for (const fd of decisionDiff.fileDiffs || []) {
    for (const d of fd.fileLevelDeltas || []) {
      totalDecisionDeltas++;
      byLens[d.lens] = byLens[d.lens] || [];
      byLens[d.lens].push({
        scope: `${fd.file} [Module]`,
        ...d
      });
    }
    for (const s of fd.addedSymbols || []) allAdded.push(s);
    for (const s of fd.removedSymbols || []) allRemoved.push(s);

    for (const symDiff of fd.modifiedSymbolDecisions || []) {
      for (const d of symDiff.deltas) {
        totalDecisionDeltas++;
        byLens[d.lens] = byLens[d.lens] || [];
        byLens[d.lens].push({
          scope: `${symDiff.name} (${symDiff.file}:${symDiff.lines})`,
          ...d
        });
      }
    }
  }

  if (totalDecisionDeltas === 0 && allAdded.length === 0 && allRemoved.length === 0 && decisionDiff.pureRefactorings.length === 0) {
    lines.push(`\n(No code or decision changes detected against '${decisionDiff.gitRef}')\n`);
    return lines.join('\n');
  }

  lines.push(`\nSummary: ${totalDecisionDeltas} Decision Change(s) | +${allAdded.length} New Symbol(s) | -${allRemoved.length} Removed | ${decisionDiff.pureRefactorings.length} Pure Refactoring(s)`);

  for (const [lensName, items] of Object.entries(byLens)) {
    if (items.length === 0) continue;
    lines.push(`\n── [${lensName}] (${items.length}) ──────────────────────────────────`);
    for (const item of items) {
      lines.push(`  • ${item.scope}`);
      lines.push(`    [${item.category}] ${item.summary}`);
      lines.push(`      Before: ${item.before}`);
      lines.push(`      After : ${item.after}`);
    }
  }

  if (allAdded.length > 0) {
    lines.push(`\n── [New Symbols Introduced] (${allAdded.length}) ───────────────────────────`);
    for (const s of allAdded) {
      const effects = s.decisions?.operational?.sideEffects?.join(', ') || 'none';
      const ret = (s.decisions?.contract?.returns?.shapes || []).join('|') || 'void';
      lines.push(`  + ${s.name} (${s.file}:${s.lines}) [${s.layer}] — archetype:${s.archetype}, returns:${ret}, io:${effects}`);
    }
  }

  if (allRemoved.length > 0) {
    lines.push(`\n── [Removed Symbols] (${allRemoved.length}) ──────────────────────────────────`);
    for (const s of allRemoved) {
      lines.push(`  - ${s.name} (${s.file}:${s.lines}) [${s.layer}]`);
    }
  }

  if (decisionDiff.pureRefactorings.length > 0) {
    lines.push(`\n── [Pure Refactorings — Lines Changed, Zero Decisions Changed] (${decisionDiff.pureRefactorings.length}) ──`);
    for (const pr of decisionDiff.pureRefactorings) {
      lines.push(`  ✓ ${pr.name} (${pr.file}:${pr.lines}) — Safe internal edit (contracts, data structures & control preserved)`);
    }
  }

  if (changedReport.length > 0) {
    lines.push(`\n── [Blast Radius of Modified Symbols] (${changedReport.length}) ───────────────────`);
    for (const item of changedReport) {
      lines.push(`  💥 ${item.name} (${item.file}:${item.lines}) [${item.riskRating}, Score: ${item.riskScore}] Callers: ${item.directCallers} direct, ${item.transitiveCallers} transitive`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * CLI runner for `codereview decisions [targetSymbolOrFile]`
 */
function runDecisionsCommand(targetQuery, allFileResults, blastIndex, rootDir, options = {}) {
  if (targetQuery) {
    const matchedIds = resolveSymbolIds(targetQuery, blastIndex);
    if (matchedIds.length === 1) {
      const card = buildSymbolDecisionCard(matchedIds[0], blastIndex);
      if (options.json) {
        console.log(JSON.stringify(card, null, 2));
      } else {
        console.log(formatSymbolDecisionCard(card));
      }
      return card;
    }
    if (matchedIds.length > 1 && matchedIds.length <= 5) {
      const cards = matchedIds.map(id => buildSymbolDecisionCard(id, blastIndex)).filter(Boolean);
      if (options.json) {
        console.log(JSON.stringify(cards, null, 2));
      } else {
        for (const c of cards) console.log(formatSymbolDecisionCard(c));
      }
      return cards;
    }
  }

  const summary = summarizeCodebaseDecisions(allFileResults, blastIndex, rootDir, targetQuery || null);
  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(formatCodebaseDecisionSummary(summary));
  }
  return summary;
}

module.exports = {
  buildSymbolDecisionCard,
  formatSymbolDecisionCard,
  summarizeCodebaseDecisions,
  formatCodebaseDecisionSummary,
  formatDecisionDiffReport,
  runDecisionsCommand
};
