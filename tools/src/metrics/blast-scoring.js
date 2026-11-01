/**
 * Computes direct and multi-hop coupling metrics for a symbol.
 */
function calculateCoupling(symbolId, index) {
  const callersMap = index.inboundDirect.get(symbolId);
  const directCallers = callersMap ? Array.from(callersMap.values()) : [];
  const uniqueFiles = new Set(directCallers.map(c => c.file));

  // Multi-hop transitive callers (up to 3 hops)
  const multiHopMap = index.getMultiHopBlast ? index.getMultiHopBlast(symbolId, 3) : new Map();
  const hop1Count = directCallers.length;
  let hop2Count = 0;
  let hop3Count = 0;

  for (const dist of multiHopMap.values()) {
    if (dist === 2) hop2Count++;
    if (dist === 3) hop3Count++;
  }

  const outboundSet = index.outboundDirect ? (index.outboundDirect.get(symbolId) || new Set()) : new Set();
  const outboundCount = outboundSet.size;
  const outboundTargets = Array.from(outboundSet).map(tid => {
    const tsym = index.catalog ? index.catalog.get(tid) : null;
    return {
      callerId: tid,
      callerName: tsym ? tsym.name : tid,
      file: tsym ? tsym.file : 'unknown',
      type: tsym ? tsym.type : 'unknown'
    };
  });

  const afferentCoupling = hop1Count;
  const efferentCoupling = outboundCount;
  const instability = (afferentCoupling + efferentCoupling > 0)
    ? Number((efferentCoupling / (afferentCoupling + efferentCoupling)).toFixed(2))
    : 0;

  return {
    directCallers,
    uniqueFiles,
    hop1Count,
    hop2Count,
    hop3Count,
    totalTransitive: multiHopMap.size,
    outboundTargets,
    outboundCount,
    afferentCoupling,
    efferentCoupling,
    instability
  };
}

/**
 * Determines impact tier label based on direct caller count and file reach.
 */
function determineImpactTier(hop1Count, uniqueFilesCount, totalTransitive) {
  if (hop1Count === 0) {
    return 'ISOLATED (0 callers)';
  }
  if (hop1Count >= 6 || uniqueFilesCount >= 3) {
    return `CRITICAL (${hop1Count} direct callers across ${uniqueFilesCount} files, ${totalTransitive} transitive)`;
  }
  if (hop1Count >= 3 || uniqueFilesCount >= 2) {
    return `MEDIUM (${hop1Count} direct callers across ${uniqueFilesCount} files, ${totalTransitive} transitive)`;
  }
  return `LOW (${hop1Count} caller in ${uniqueFilesCount} file)`;
}

/**
 * Computes control-flow and object-oriented complexity scaling multiplier.
 */
function calculateComplexityMultiplier(sym) {
  const depth = sym && sym.nestingDepth ? sym.nestingDepth : 0;
  const cyclomatic = sym && sym.cyclomaticComplexity ? sym.cyclomaticComplexity : 1;
  const cognitive = sym && sym.cognitiveComplexity ? sym.cognitiveComplexity : 0;
  const paramCount = sym && sym.paramCount !== undefined ? sym.paramCount : 0;
  const returnCount = sym && sym.returnCount !== undefined ? sym.returnCount : 0;
  const cm = sym && sym.classMetrics ? sym.classMetrics : null;

  const mDepth = 0.15 * Math.min(depth, 6);
  const mCyclo = 0.05 * Math.max(0, cyclomatic - 1);
  const mCog = 0.04 * Math.max(0, cognitive - 2);
  const mParams = 0.10 * Math.max(0, paramCount - 3);
  const mReturns = 0.05 * Math.max(0, returnCount - 3);

  // Class-level OO complexity factors
  let mClass = 0;
  if (sym && sym.type === 'class' && cm) {
    const mWmc = 0.01 * Math.max(0, (cm.wmcCyclomatic || 0) - 20);
    const mCbo = 0.08 * Math.max(0, (cm.cbo || 0) - 3);
    const mDit = 0.05 * Math.max(0, (cm.dit || 0) - 2);
    mClass = mWmc + mCbo + mDit;
  }

  const multiplier = 1.0 + mDepth + mCyclo + mCog + mParams + mReturns + mClass;

  return {
    multiplier,
    factors: {
      mDepth,
      mCyclo,
      mCog,
      mParams,
      mReturns,
      mClass
    }
  };
}

/**
 * Calculates architectural rule violation penalty points.
 */
function calculateArchitecturalPenalties(sym) {
  const inCycle = Boolean(sym && sym.inCycle);
  const layerViolationsCount = sym && sym.layerViolationsCount ? sym.layerViolationsCount : 0;

  const pLayer = 10 * layerViolationsCount;
  const pCycle = inCycle ? 15 : 0;

  return {
    pLayer,
    pCycle,
    total: pLayer + pCycle
  };
}

/**
 * Extracts and normalizes symbol risk features into a flat evaluation record.
 */
function extractSymbolRiskFeatures(riskScore, sym, metrics) {
  const { afferentCoupling = 0, efferentCoupling = 0 } = metrics || {};
  const cm = sym && sym.classMetrics ? sym.classMetrics : null;
  const isClass = Boolean(sym && sym.type === 'class');

  return {
    riskScore,
    cyclomatic: sym && sym.cyclomaticComplexity ? sym.cyclomaticComplexity : 1,
    cognitive: sym && sym.cognitiveComplexity ? sym.cognitiveComplexity : 0,
    depth: sym && sym.nestingDepth ? sym.nestingDepth : 0,
    paramCount: sym && sym.paramCount !== undefined ? sym.paramCount : 0,
    returnCount: sym && sym.returnCount !== undefined ? sym.returnCount : 0,
    isMonolithic: Boolean(sym && sym.isMonolithic),
    inCycle: Boolean(sym && sym.inCycle),
    layerViolationsCount: sym && sym.layerViolationsCount ? sym.layerViolationsCount : 0,
    afferentCoupling,
    efferentCoupling,
    cbo: (isClass && cm) ? (cm.cbo || 0) : 0,
    wmcCyclo: (isClass && cm) ? (cm.wmcCyclomatic || 0) : 0
  };
}

const CRITICAL_RULES = [
  f => f.riskScore >= 60,
  f => f.cyclomatic >= 15,
  f => f.cognitive >= 25,
  f => f.isMonolithic,
  f => f.inCycle && f.layerViolationsCount > 0,
  f => f.afferentCoupling >= 6,
  f => f.cbo >= 8,
  f => f.wmcCyclo >= 60
];

const HIGH_RULES = [
  f => f.riskScore >= 25,
  f => f.cyclomatic >= 8,
  f => f.cognitive >= 15,
  f => f.depth >= 4,
  f => f.layerViolationsCount > 0,
  f => f.inCycle,
  f => f.afferentCoupling >= 4,
  f => f.efferentCoupling >= 6,
  f => f.cbo >= 5,
  f => f.wmcCyclo >= 35
];

const MEDIUM_RULES = [
  f => f.riskScore >= 10,
  f => f.cyclomatic >= 4,
  f => f.cognitive >= 6,
  f => f.paramCount >= 4,
  f => f.returnCount >= 4,
  f => f.afferentCoupling >= 2,
  f => f.efferentCoupling >= 3,
  f => f.depth >= 3,
  f => f.cbo >= 3,
  f => f.wmcCyclo >= 15
];

/**
 * Evaluates calibrated multi-tier risk rating for a symbol.
 */
function determineRiskCategory(riskScore, sym, metrics) {
  const f = extractSymbolRiskFeatures(riskScore, sym, metrics);

  if (CRITICAL_RULES.some(rule => rule(f))) return 'CRITICAL HOTSPOT';
  if (HIGH_RULES.some(rule => rule(f))) return 'HIGH';
  if (MEDIUM_RULES.some(rule => rule(f))) return 'MEDIUM';

  return 'LOW';
}

/**
 * Computes multi-factor complexity blast radius impact, composite risk score,
 * and calibrated risk categorization for any catalog symbol.
 */
function computeSymbolBlastSummary(symbolId, index) {
  const sym = index.catalog.get(symbolId);
  const coupling = calculateCoupling(symbolId, index);
  const impact = determineImpactTier(coupling.hop1Count, coupling.uniqueFiles.size, coupling.totalTransitive);

  const loc = sym && sym.loc ? sym.loc : 10;
  const baseCoupling = Math.max(0.5, coupling.afferentCoupling + (0.5 * coupling.efferentCoupling));
  const baseBlast = baseCoupling * Math.log2(Math.max(1, loc) + 1);

  const { multiplier, factors } = calculateComplexityMultiplier(sym);
  const penalties = calculateArchitecturalPenalties(sym);

  const riskScore = Math.round((baseBlast * multiplier) + penalties.total);
  const riskCategory = determineRiskCategory(riskScore, sym, coupling);

  const breakdown = {
    baseBlast: Number(baseBlast.toFixed(2)),
    complexityMultiplier: Number(multiplier.toFixed(2)),
    architecturalPenalty: penalties.total,
    cyclomaticWeight: Number(factors.mCyclo.toFixed(2)),
    cognitiveWeight: Number(factors.mCog.toFixed(2)),
    nestingWeight: Number(factors.mDepth.toFixed(2)),
    paramWeight: Number(factors.mParams.toFixed(2)),
    returnWeight: Number(factors.mReturns.toFixed(2)),
    classWeight: Number(factors.mClass.toFixed(2)),
    layerPenalty: penalties.pLayer,
    cyclePenalty: penalties.pCycle
  };

  const entryPointPaths = index.getPathsFromEntryPoints ? index.getPathsFromEntryPoints(symbolId, 3) : [];
  const entryPointType = index.getEntryPointType ? index.getEntryPointType(symbolId) : null;

  return {
    directCount: coupling.hop1Count,
    outboundCount: coupling.outboundCount,
    outboundTargets: coupling.outboundTargets,
    afferentCoupling: coupling.afferentCoupling,
    efferentCoupling: coupling.efferentCoupling,
    instability: coupling.instability,
    hop2Count: coupling.hop2Count,
    hop3Count: coupling.hop3Count,
    transitiveCount: coupling.totalTransitive,
    filesCount: coupling.uniqueFiles.size,
    directCallers: coupling.directCallers,
    entryPointPaths,
    entryPointType,
    isEntryPoint: Boolean(entryPointType),
    inCycle: Boolean(sym && sym.inCycle),
    cycleMembers: sym && sym.cycleMembers ? sym.cycleMembers : [],
    layerViolationsCount: sym && sym.layerViolationsCount ? sym.layerViolationsCount : 0,
    classMetrics: sym && sym.classMetrics ? sym.classMetrics : null,
    impact,
    riskScore,
    riskCategory,
    breakdown,
    isMonolithic: Boolean(sym && sym.isMonolithic),
    nestingDepth: sym && sym.nestingDepth ? sym.nestingDepth : 0,
    cyclomaticComplexity: sym && sym.cyclomaticComplexity ? sym.cyclomaticComplexity : 1,
    cognitiveComplexity: sym && sym.cognitiveComplexity ? sym.cognitiveComplexity : 0,
    paramCount: sym && sym.paramCount !== undefined ? sym.paramCount : 0,
    returnCount: sym && sym.returnCount !== undefined ? sym.returnCount : 0,
    loc
  };
}

module.exports = {
  calculateCoupling,
  determineImpactTier,
  calculateComplexityMultiplier,
  calculateArchitecturalPenalties,
  determineRiskCategory,
  computeSymbolBlastSummary
};
