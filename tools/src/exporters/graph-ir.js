const { DEFAULT_LAYERS, getLayerForFile, getEffectiveSubsystems } = require('../config/layers');
const { computeSymbolBlastSummary } = require('../metrics/blast-scoring');

const MAX_EXPORTED_CONCEPT_INTERSECTIONS = 10000;

function exportGraphIR(allFileResults, blastIndex, rootDir, changedSymbolIds = new Set()) {
  const nodes = [];

  for (const [id, sym] of blastIndex.catalog.entries()) {
    const br = computeSymbolBlastSummary(id, blastIndex);
    const layer = getLayerForFile(sym.file);

    nodes.push({
      id,
      name: sym.name,
      parent: sym.parentClass ? `${sym.file}#${sym.parentClass}` : sym.file,
      file: sym.file,
      layer,
      type: sym.type,
      extends: sym.extends || null,
      isEntryPoint: Boolean(br.entryPointType),
      entryPointType: br.entryPointType,
      entryPointPaths: br.entryPointPaths || [],
      cycleId: sym.cycleId ?? null,
      cycleSize: Array.isArray(sym.cycleMembers) ? sym.cycleMembers.length : 0,
      startLine: sym.startLine,
      endLine: sym.endLine,
      loc: sym.loc,
      nestingDepth: sym.nestingDepth || 0,
      cyclomaticComplexity: sym.cyclomaticComplexity || 1,
      cognitiveComplexity: sym.cognitiveComplexity || 0,
      paramCount: sym.paramCount || 0,
      returnCount: sym.returnCount || 0,
      isMonolithic: Boolean(sym.isMonolithic),
      isLifecycle: Boolean(sym.isLifecycleHook),
      comment: sym.comment || null,
      decisions: sym.decisions || null,
      fileDecisions: sym.fileDecisions || null,
      changed: changedSymbolIds.has(id),
      outboundCount: br.outboundCount,
      afferentCoupling: br.afferentCoupling,
      efferentCoupling: br.efferentCoupling,
      instability: br.instability,
      inCycle: br.inCycle,
      layerViolationsCount: br.layerViolationsCount,
      classMetrics: br.classMetrics,
      riskScore: br.riskScore,
      riskCategory: br.riskCategory,
      riskBreakdown: br.breakdown,
      blastRadius: {
        impact: br.impact,
        riskScore: br.riskScore,
        riskCategory: br.riskCategory,
        breakdown: br.breakdown,
        directCallers: br.directCount,
        hop2Callers: br.hop2Count,
        transitiveCallers: br.transitiveCount,
        filesAffected: br.filesCount,
        outboundCount: br.outboundCount
      }
    });
  }

  // Filter edges to valid catalog items
  const validEdges = blastIndex.edges.filter(e => blastIndex.catalog.has(e.source) && blastIndex.catalog.has(e.target));
  const allConceptIntersections = blastIndex.conceptMap ? blastIndex.conceptMap.intersections : [];
  const exportedConceptIntersections = allConceptIntersections.slice(0, MAX_EXPORTED_CONCEPT_INTERSECTIONS);

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalFiles: allFileResults.length,
      totalSymbols: nodes.length,
      totalEdges: validEdges.length,
      totalCycles: blastIndex.cycles ? blastIndex.cycles.length : 0,
      cyclesCount: blastIndex.cycles ? blastIndex.cycles.length : 0,
      totalLayerViolations: blastIndex.layerViolations ? blastIndex.layerViolations.length : 0,
      layerViolationsCount: blastIndex.layerViolations ? blastIndex.layerViolations.length : 0,
      classesCount: blastIndex.classes ? blastIndex.classes.length : 0,
      totalConceptIntersections: allConceptIntersections.length,
      conceptIntersectionsTruncated: allConceptIntersections.length > exportedConceptIntersections.length,
      hasDiff: changedSymbolIds.size > 0,
      changedCount: changedSymbolIds.size
    },
    subsystems: getEffectiveSubsystems(),
    concepts: blastIndex.conceptMap ? Array.from(blastIndex.conceptMap.catalog.values()).map(c => ({
      id: c.id,
      name: c.name,
      category: c.category,
      description: c.description,
      files: Array.from(c.files),
      symbolsCount: c.symbols.length,
      governingEnums: c.governingEnums.map(e => ({ id: e.id, name: e.name, file: e.file }))
    })) : [],
    conceptIntersections: exportedConceptIntersections,
    nodes,
    edges: validEdges
  };
}

module.exports = {
  exportGraphIR
};
