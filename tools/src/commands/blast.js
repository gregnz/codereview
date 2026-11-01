const { getLayerForFile } = require('../config/layers');
const { computeSymbolBlastSummary } = require('../metrics/blast-scoring');
const { resolveSymbolIds } = require('../graph/graph-builder');

/**
 * Executes a targeted blast radius and risk query for a given symbol identifier.
 */
function runBlastCommand(blastTarget, blastIndex) {
  const matched = resolveSymbolIds(blastTarget, blastIndex);
  if (!matched || matched.length === 0) {
    console.error(`Symbol not found: ${blastTarget}`);
    try {
      const { logTelemetryEvent } = require('../telemetry/feedback-logger');
      logTelemetryEvent(process.cwd(), {
        type: 'UNKNOWN_SYMBOL',
        command: 'blast',
        input: blastTarget
      });
    } catch {
      // non-blocking
    }
    process.exit(1);
  }

  const targetId = matched[0];
  const sym = blastIndex.catalog.get(targetId);
  const br = computeSymbolBlastSummary(targetId, blastIndex);

  const output = {
    symbol: blastTarget,
    id: targetId,
    definedAt: `${sym.file}:L${sym.startLine}-L${sym.endLine}`,
    type: sym.type,
    layer: getLayerForFile(sym.file),
    complexity: {
      loc: br.loc,
      nestingDepth: br.nestingDepth,
      cyclomaticComplexity: br.cyclomaticComplexity,
      cognitiveComplexity: br.cognitiveComplexity,
      paramCount: br.paramCount,
      returnCount: br.returnCount,
      isMonolithic: br.isMonolithic
    },
    blastRadius: {
      impactScore: br.impact,
      riskRating: br.riskCategory,
      riskScore: br.riskScore,
      riskBreakdown: br.breakdown,
      directCallersCount: br.directCount,
      hop2CallersCount: br.hop2Count,
      transitiveReachability: br.transitiveCount,
      filesAffected: br.filesCount,
      directCallers: br.directCallers
    }
  };

  console.log(JSON.stringify(output, null, 2));
  return output;
}

module.exports = {
  runBlastCommand
};
