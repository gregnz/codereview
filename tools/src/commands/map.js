const fs = require('node:fs');
const path = require('node:path');
const { formatSymbolsMarkdown } = require('../exporters/markdown-map');

/**
 * Generates Markdown AST symbol map and either writes it to disk or prints to stdout.
 */
function runMapCommand(writeMap, allFileResults, blastIndex, rootDir) {
  const markdown = formatSymbolsMarkdown(allFileResults, blastIndex, rootDir);

  if (writeMap) {
    const writePath = path.isAbsolute(writeMap) ? writeMap : path.resolve(rootDir, writeMap);
    fs.mkdirSync(path.dirname(writePath), { recursive: true });
    fs.writeFileSync(writePath, markdown, 'utf8');
    console.log(`Successfully wrote AST symbol map with multi-hop Blast Radius to: ${writePath}`);
  } else {
    console.log(markdown);
  }

  return markdown;
}

module.exports = {
  runMapCommand
};
