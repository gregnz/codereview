const fs = require('node:fs');
const path = require('node:path');
const { exportGraphIR } = require('../exporters/graph-ir');

/**
 * Exports complete Graph IR to JSON and synchronizes data.js for D3 visualization.
 */
function runExportCommand(exportGraph, allFileResults, blastIndex, rootDir, changedSymbolIds) {
  const graphData = exportGraphIR(allFileResults, blastIndex, rootDir, changedSymbolIds);
  const writePath = path.isAbsolute(exportGraph) ? exportGraph : path.resolve(rootDir, exportGraph);

  fs.mkdirSync(path.dirname(writePath), { recursive: true });
  fs.writeFileSync(writePath, JSON.stringify(graphData, null, 2), 'utf8');

  if (path.basename(writePath) === 'graph.json') {
    const dataJsPath = path.join(path.dirname(writePath), 'data.js');
    fs.writeFileSync(dataJsPath, 'window.INITIAL_GRAPH_DATA = ' + JSON.stringify(graphData) + ';', 'utf8');
  }

  console.log(`Successfully exported unified Graph IR to: ${writePath}`);
  console.log(`Nodes: ${graphData.nodes.length} | Edges: ${graphData.edges.length} | Changed: ${graphData.metadata.changedCount}`);
  return graphData;
}

module.exports = {
  runExportCommand
};
