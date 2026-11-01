/**
 * Plain-English Mentoring & Coaching Review Generator
 *
 * Translates AST Decision Cards, Codebase Decision Summaries, and Semantic Decision Diffs
 * into clear, constructive, plain-English feedback that junior and mid-level developers
 * can immediately understand and act upon.
 */

const QUERY_LIKE_PREFIXES = /^(get|is|has|can|should|check|find|query|resolve|compute|calculate|evaluate|detect|validate)[A-Z_]/;

function checkSymbolFindings(card) {
  const findings = [];
  const name = card.name.split('.').pop();
  const isQueryNamed = QUERY_LIKE_PREFIXES.test(name);

  // 1. Command-Query Separation (CQS): Function named like a question that mutates data or writes files
  const writesFiles = card.operationsAndTrust.sideEffects.includes('filesystem_write');
  const mutatesProps = card.contractAndData.stateWrites.filter(w => !w.startsWith('this.'));
  if (isQueryNamed && (writesFiles || mutatesProps.length > 0)) {
    findings.push({
      severity: 'HIGH',
      lens: 'Contracts & Data',
      title: 'Surprise Side Effects (Command-Query Separation)',
      symbol: card.name,
      location: `${card.file}:${card.lines}`,
      whatDecisionWasMade: `'${card.name}' is named like a read-only question/calculation, but it modifies ${writesFiles ? 'the filesystem' : `input/external properties (${mutatesProps.join(', ')})`}.`,
      whyItMatters: `Other developers calling '${name}(...)' expect it to only compute and return an answer. Secretly changing passed-in objects or files causes bugs that are very hard to track down.`,
      coachingTip: `Either keep '${name}' pure (return a new object with the result instead of modifying properties in-place) or rename it to start with an action verb like 'update...', 'apply...', or 'tag...'.`
    });
  }

  // 2. Mixed Return Shapes (Ambiguous Return Contract)
  const shapes = (card.contractAndData.returnContract || '').split(' | ').map(s => s.split(' ')[0]).filter(Boolean);
  const distinctNonNull = shapes.filter(s => s !== 'null' && s !== 'void' && s !== 'expression');
  if (distinctNonNull.length >= 2 || (shapes.includes('boolean') && shapes.includes('Object'))) {
    findings.push({
      severity: 'MEDIUM',
      lens: 'Contracts & Data',
      title: 'Inconsistent Return Contract',
      symbol: card.name,
      location: `${card.file}:${card.lines}`,
      whatDecisionWasMade: `'${card.name}' returns different data types depending on the branch (${card.contractAndData.returnContract}).`,
      whyItMatters: `Every caller has to remember to write extra 'if (typeof result === ...)' checks before using the return value, or risk a runtime crash.`,
      coachingTip: `Pick one consistent return shape for '${card.name}'—for example, always return an Object (or 'null' when not found), or always return an Array (empty '[]' when nothing matches).`
    });
  }

  // 3. Nested Loop Scaling Cost O(N^2) without Map/Set index
  if (card.behaviorAndHeuristics.scalingProfile.startsWith('O(N^') && card.contractAndData.collections.length === 0) {
    findings.push({
      severity: 'MEDIUM',
      lens: 'Behavior & Heuristics',
      title: `Quadratic Scaling Loop (${card.behaviorAndHeuristics.scalingProfile})`,
      symbol: card.name,
      location: `${card.file}:${card.lines}`,
      whatDecisionWasMade: `'${card.name}' uses nested loops over standard arrays without a 'Map' or 'Set' lookup table.`,
      whyItMatters: `With 10 items this runs 100 steps, which feels fast. With 2,000 items it runs 4,000,000 steps and can freeze the app.`,
      coachingTip: `Before the loop, index the items you are searching for into a 'new Map()' or 'new Set()' so each lookup inside the loop takes 1 step instead of scanning the whole array.`
    });
  }

  // 4. Mixing Business/Domain Logic with I/O or Process Exit
  const hasHardExit = card.operationsAndTrust.sideEffects.includes('process_exit');
  const hasFileIO = card.operationsAndTrust.sideEffects.includes('filesystem_read') || card.operationsAndTrust.sideEffects.includes('filesystem_write');
  const hasDomainBranches = card.behaviorAndHeuristics.branchPredicates.length >= 3;
  if (hasHardExit && card.architecture.layer !== 'Presentation') {
    findings.push({
      severity: 'HIGH',
      lens: 'Operations & Trust',
      title: 'Hard Process Exit Inside Non-CLI Layer',
      symbol: card.name,
      location: `${card.file}:${card.lines}`,
      whatDecisionWasMade: `'${card.name}' lives in '${card.architecture.layer}' but calls 'process.exit()' directly.`,
      whyItMatters: `Calling 'process.exit()' deep inside application or domain code kills the entire program immediately—making it impossible for callers, servers, or unit tests to catch the error and recover.`,
      coachingTip: `Throw a descriptive 'new Error(...)' (or return an error result) from '${card.name}', and let the top-level CLI entry point decide whether to exit.`
    });
  } else if (hasFileIO && hasDomainBranches && !card.file.includes('cli') && !card.file.includes('cache')) {
    findings.push({
      severity: 'LOW',
      lens: 'Architecture & Structure',
      title: 'Business Rules Mixed with File I/O',
      symbol: card.name,
      location: `${card.file}:${card.lines}`,
      whatDecisionWasMade: `'${card.name}' combines branching decision logic (${card.behaviorAndHeuristics.branchPredicates.length} conditions) with direct filesystem reads/writes.`,
      whyItMatters: `When a function both decides what to do and reads/writes disk files, you can't unit-test the decision rules without creating real files on disk.`,
      coachingTip: `Split this into two steps: a pure helper function that takes data in and returns the computed result, and a thin wrapper that reads/writes the file.`
    });
  }

  // 5. Swallowing Errors Silently
  if (card.operationsAndTrust.errorHandling.includes('swallows_error')) {
    findings.push({
      severity: 'LOW',
      lens: 'Operations & Trust',
      title: 'Silent Error Swallowing (Empty or Unlogged Catch)',
      symbol: card.name,
      location: `${card.file}:${card.lines}`,
      whatDecisionWasMade: `'${card.name}' catches exceptions without returning an explicit fallback value or rethrowing.`,
      whyItMatters: `If something unexpected fails inside the 'try' block, the program continues silently with half-finished state, making debugging much harder.`,
      coachingTip: `If ignoring the error is intentional (e.g., optional cleanup), return a clear fallback value or log a warning explaining why it is safe to continue.`
    });
  }

  // 6. Hardcoded Magic Numbers / Thresholds
  if (card.behaviorAndHeuristics.thresholds.length >= 2) {
    findings.push({
      severity: 'LOW',
      lens: 'Behavior & Heuristics',
      title: 'Hardcoded Domain Thresholds ("Magic Numbers")',
      symbol: card.name,
      location: `${card.file}:${card.lines}`,
      whatDecisionWasMade: `'${card.name}' embeds numeric rules directly in its conditions: ${card.behaviorAndHeuristics.thresholds.join(', ')}.`,
      whyItMatters: `Someone reading '${card.behaviorAndHeuristics.thresholds[0]}' six months from now won't know *why* that number was chosen or if the same threshold is duplicated elsewhere.`,
      coachingTip: `Extract these numbers into named constants at the top of the file (e.g., 'const MAX_NESTING_DEPTH = 4') or move them into your config object.`
    });
  }

  return findings;
}

/**
 * Generates a structured Coaching & Mentoring Review from a codebase decision summary and blastIndex.
 */
function generateCoachingReview(summary, blastIndex, decisionDiff = null) {
  const strengths = [];
  const findings = [];
  const diffQuestions = [];

  const total = summary.totalSymbolsInspected || 1;
  const pureCount = summary.cards.filter(c => c.operationsAndTrust.isPure).length;
  const purePct = Math.round((pureCount / total) * 100);

  if (purePct >= 50) {
    strengths.push(`Clean Separation of Logic: ${pureCount} of ${total} symbols (${purePct}%) are pure functions with no hidden I/O or state mutations, making them easy to test and reason about.`);
  }

  const cyclesCount = blastIndex.cycles ? blastIndex.cycles.length : 0;
  const violationsCount = blastIndex.layerViolations ? blastIndex.layerViolations.length : 0;
  if (cyclesCount === 0 && violationsCount === 0) {
    strengths.push(`Healthy Architecture Boundaries: Zero circular dependency loops and zero architectural layer violations across all ${total} symbols.`);
  }

  const indexedCount = summary.cards.filter(c => c.behaviorAndHeuristics.scalingProfile === 'O(N) indexed-lookup').length;
  if (indexedCount > 0) {
    strengths.push(`Good Data Structure Choices: ${indexedCount} functions use 'Map' or 'Set' for fast O(1) lookups instead of slow nested array scans.`);
  }

  // Check module-level mutable state
  for (const mod of summary.statefulModules || []) {
    const mutables = mod.state.filter(s => s.includes('mutable_singleton'));
    if (mutables.length > 0) {
      findings.push({
        severity: 'MEDIUM',
        lens: 'Contracts & Data',
        title: 'Shared Module-Level Mutable State',
        symbol: mod.file,
        location: mod.file,
        whatDecisionWasMade: `Module '${mod.file}' stores mutable state in a top-level variable: ${mutables.join(', ')}.`,
        whyItMatters: `Top-level 'let' variables act like hidden globals—any function in this file can change it, and data from one run can leak into the next run or test.`,
        coachingTip: `If this is a cache, make sure there is a clear invalidation or reset helper; otherwise, pass state explicitly as a function parameter.`
      });
    }
  }

  // Check architectural layer violations
  for (const v of (blastIndex.layerViolations || []).slice(0, 5)) {
    findings.push({
      severity: 'HIGH',
      lens: 'Architecture & Structure',
      title: 'Architectural Layer Inversion ("Foundation Calling the Roof")',
      symbol: v.sourceName,
      location: `${v.sourceFile}:L${v.line}`,
      whatDecisionWasMade: `'${v.sourceName}' in lower layer [${v.sourceLayer}] directly calls '${v.targetName}' in higher layer [${v.targetLayer}].`,
      whyItMatters: `Low-level infrastructure and domain modules should be reusable building blocks. When they reach up into UI or controller code, you can't reuse or test the building block on its own.`,
      coachingTip: `Instead of '${v.sourceName}' calling '${v.targetName}' directly, have '${v.sourceName}' return data (or emit an event), and let [${v.targetLayer}] call down into [${v.sourceLayer}].`
    });
  }

  // Check per-symbol findings
  for (const card of summary.cards) {
    if (card.type === 'function' || card.type === 'method') {
      findings.push(...checkSymbolFindings(card));
    }
  }

  // Sort findings by severity (HIGH -> MEDIUM -> LOW)
  const rank = { HIGH: 1, MEDIUM: 2, LOW: 3 };
  findings.sort((a, b) => (rank[a.severity] || 9) - (rank[b.severity] || 9));

  return {
    filterTarget: summary.filterTarget || null,
    totalSymbolsInspected: summary.totalSymbolsInspected,
    strengths,
    findings,
    diffQuestions: collectDiffQuestions(decisionDiff)
  };
}

function formatSingleDiffQuestion(sym, d) {
  if (d.category === 'Return Contract') {
    return `In '${sym.name}' (${sym.file}), the return shape changed from '${d.before}' to '${d.after}'. Did you check that all callers handle the new shape?`;
  }
  if (d.category === 'Signature Contract') {
    return `In '${sym.name}' (${sym.file}), the parameters changed from ${d.before} to ${d.after}. Are existing callers still passing arguments in the right order?`;
  }
  if (d.category === 'Domain Heuristics & Thresholds') {
    return `In '${sym.name}' (${sym.file}), the threshold rule changed from (${d.before}) to (${d.after}). Was this tuning change intentional?`;
  }
  if (d.category === 'I/O & Side Effects') {
    return `'${sym.name}' (${sym.file}) changed its side effects from [${d.before}] to [${d.after}]. Should this function be doing I/O directly?`;
  }
  if (d.category === 'Scaling & Algorithmic Cost') {
    return `'${sym.name}' (${sym.file}) changed scaling cost from '${d.before}' to '${d.after}'.`;
  }
  return null;
}

function collectDiffQuestions(decisionDiff) {
  if (!decisionDiff || !Array.isArray(decisionDiff.fileDiffs)) return [];
  const allSymbols = decisionDiff.fileDiffs.flatMap(fd => fd.modifiedSymbolDecisions || []);
  const questions = [];
  for (const sym of allSymbols) {
    for (const d of sym.deltas || []) {
      const q = formatSingleDiffQuestion(sym, d);
      if (q) questions.push(q);
    }
  }
  return questions;
}

function formatCoachingReview(review) {
  const lines = [];
  lines.push(`========================================================================`);
  lines.push(`🧑‍🏫 SENIOR DEVELOPER MENTORING & DECISION REVIEW (${review.totalSymbolsInspected} symbols)`);
  lines.push(`========================================================================`);

  if (review.totalSymbolsInspected === 0) {
    lines.push(`\n⚠️  No symbols matched '${review.filterTarget || ''}'. Run without arguments to review the whole project.\n`);
    return lines.join('\n');
  }

  // 1. What Went Well
  lines.push(`\n✅ WHAT YOU DID WELL (Architectural Strengths):`);
  if (review.strengths.length === 0) {
    lines.push(`   • Codebase parsed cleanly and is ready for decision review.`);
  } else {
    for (const s of review.strengths) {
      lines.push(`   • ${s}`);
    }
  }

  // 2. Recent Diff Questions (if any)
  if (review.diffQuestions && review.diffQuestions.length > 0) {
    lines.push(`\n💬 QUESTIONS ABOUT YOUR RECENT CHANGES (vs Git HEAD):`);
    for (const q of review.diffQuestions.slice(0, 8)) {
      lines.push(`   ? ${q}`);
    }
  }

  // 3. Prioritized Coaching Topics
  const topFindings = review.findings.slice(0, 8);
  lines.push(`\n🎯 TOP COACHING OPPORTUNITIES (${topFindings.length} of ${review.findings.length} total):`);
  if (topFindings.length === 0) {
    lines.push(`   🎉 No high-risk decision anti-patterns detected!`);
  } else {
    topFindings.forEach((f, idx) => {
      const badge = f.severity === 'HIGH' ? '🔴 [HIGH PRIORITY]' : (f.severity === 'MEDIUM' ? '🟡 [MEDIUM]' : '🔵 [NIT / POLISH]');
      lines.push(`\n   ${idx + 1}. ${badge} ${f.title} — ${f.symbol} (${f.location})`);
      lines.push(`      • Decision Made : ${f.whatDecisionWasMade}`);
      lines.push(`      • Why It Matters: ${f.whyItMatters}`);
      lines.push(`      • How to Improve: ${f.coachingTip}`);
    });
  }

  lines.push('');
  return lines.join('\n');
}

module.exports = {
  checkSymbolFindings,
  generateCoachingReview,
  formatCoachingReview
};
