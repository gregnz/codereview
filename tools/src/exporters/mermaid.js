const { computeSymbolBlastSummary } = require('../metrics/blast-scoring');
const { resolveSymbolIds } = require('../graph/graph-builder');

function generateMermaidDiagram(symbolName, blastIndex) {
  // Find matching symbol IDs
  const matchedIds = resolveSymbolIds(symbolName, blastIndex);
  if (!matchedIds || matchedIds.length === 0) {
    return `%% Symbol not found: ${symbolName}`;
  }

  const targetId = matchedIds[0];
  const targetSym = blastIndex.catalog.get(targetId);
  const br = computeSymbolBlastSummary(targetId, blastIndex);

  let mm = `flowchart LR\n`;
  mm += `  classDef target fill:#ef4444,stroke:#991b1b,stroke-width:3px,color:#fff;\n`;
  mm += `  classDef direct fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff;\n`;
  mm += `  classDef transitive fill:#e2e8f0,stroke:#64748b,stroke-width:1px,color:#0f172a;\n`;
  mm += `  classDef callee fill:#38bdf8,stroke:#0284c7,stroke-width:1px,color:#0f172a;\n\n`;

  function cleanId(id) {
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  const targetNodeId = cleanId(targetId);
  mm += `  ${targetNodeId}["${targetSym.name}\\n(${targetSym.file})"]:::target\n\n`;

  // 1. Direct callers
  for (const c of br.directCallers) {
    const cId = cleanId(c.callerId);
    mm += `  ${cId}["${c.callerName}\\n(${c.file}:L${c.line})"]:::direct -->|calls| ${targetNodeId}\n`;
  }

  // 2. Outbound callees
  const outCallees = blastIndex.outboundDirect.get(targetId);
  if (outCallees) {
    for (const outId of outCallees) {
      const outSym = blastIndex.catalog.get(outId);
      if (outSym) {
        const outNodeId = cleanId(outId);
        mm += `  ${targetNodeId} -->|calls| ${outNodeId}["${outSym.name}\\n(${outSym.file})"]:::callee\n`;
      }
    }
  }

  return mm;
}

module.exports = {
  generateMermaidDiagram
};
