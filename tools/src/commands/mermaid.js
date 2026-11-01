const { generateMermaidDiagram } = require('../exporters/mermaid');

/**
 * Generates and prints a Mermaid dependency flowchart for a given symbol.
 */
function runMermaidCommand(mermaidTarget, blastIndex) {
  const diagram = generateMermaidDiagram(mermaidTarget, blastIndex);
  console.log(diagram);
  return diagram;
}

module.exports = {
  runMermaidCommand
};
