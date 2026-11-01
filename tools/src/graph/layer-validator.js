const { getLayerForFile, getEffectiveLayerRanks } = require('../config/layers');

/**
 * Checks if a single edge represents an architectural layer inversion.
 */
function evaluateEdgeViolation(e, sSym, tSym, customRanks = getEffectiveLayerRanks()) {
  if (!sSym || !tSym) return null;

  const sLayer = getLayerForFile(sSym.file);
  const tLayer = getLayerForFile(tSym.file);
  const sRank = customRanks[sLayer] || 3;
  const tRank = customRanks[tLayer] || 3;

  // Inversion: deeper/foundational layer calling a higher-level presentation/application layer
  if (sRank > tRank && e.type !== 'event_signal') {
    const violationReason = `${sLayer} (Rank ${sRank}) ➔ ${tLayer} (Rank ${tRank})`;
    return {
      source: e.source,
      sourceName: sSym.name,
      sourceFile: sSym.file,
      sourceLayer: sLayer,
      target: e.target,
      targetName: tSym.name,
      targetFile: tSym.file,
      targetLayer: tLayer,
      line: e.line,
      type: e.type,
      reason: violationReason
    };
  }

  return null;
}

/**
 * Validates architectural layering between source and target symbols across edges.
 * Flags inversion breaches (when a lower-layer dependency calls a higher-layer component,
 * excluding event_signal which is decoupled).
 * 
 * @param {Array<Object>} edges - List of edge objects { source, target, type, line, ... }
 * @param {Map<string, Object>} catalog - Symbol catalog
 * @param {Object} [customRanks] - Optional layer rank overrides
 * @returns {Array<Object>} Array of detected layer violation descriptors
 */
function checkLayerViolations(edges, catalog, customRanks = getEffectiveLayerRanks()) {
  const layerViolations = [];

  for (const e of edges) {
    const sSym = catalog.get(e.source);
    const tSym = catalog.get(e.target);
    const violation = evaluateEdgeViolation(e, sSym, tSym, customRanks);

    if (violation) {
      e.isLayerViolation = true;
      e.violationReason = violation.reason;
      layerViolations.push(violation);

      sSym.layerViolationsCount = (sSym.layerViolationsCount || 0) + 1;
      if (sSym.parentClass) {
        const pId = `${sSym.file}#${sSym.parentClass}`;
        const pSym = catalog.get(pId);
        if (pSym) {
          pSym.layerViolationsCount = (pSym.layerViolationsCount || 0) + 1;
        }
      }
    }
  }

  return layerViolations;
}

module.exports = {
  checkLayerViolations,
  evaluateEdgeViolation
};
