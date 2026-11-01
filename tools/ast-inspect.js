#!/usr/bin/env node

/**
 * AST Graph Inspector & Complexity Hotspot Diagnostic Tool
 *
 * Provides instant CLI inspection of AST Graph IR metrics without writing bespoke JS:
 * - Summary metadata & totals
 * - Top N Cognitive Complexity symbols
 * - Top N Blast Radius Risk Score symbols & caller reachability
 * - Object-Oriented Class Metrics (WMC, CBO, RFC, methods, LOC)
 * - Critical & High Risk Architectural Hotspots
 */

const { parseArgs } = require('node:util');
const { runInspectCommand } = require('./src/commands/inspect');

const CLI_OPTIONS = {
  top: { type: 'string', default: '15' },
  section: { type: 'string', default: 'all' },
  layer: { type: 'string' },
  query: { type: 'string' },
  concept: { type: 'string' },
  json: { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h', default: false }
};

function printHelp() {
  console.log(`
AST Graph Inspector & Metrics Diagnostic Tool

Usage:
  node tools/ast-inspect.js [graphJsonFile] [options]
  npm run inspect -- [graphJsonFile] [options]

Arguments:
  graphJsonFile            Path to graph JSON file (defaults to auto-discovering
                           codereview_graph.json, graph.json, ast_graph.json)

Options:
  --top <number>           Number of top symbols to display per section (default: 15)
  --section <name>         Filter output to a specific section:
                           'all' (default), 'cognitive', 'risk', 'classes', 'hotspots', 'metadata'
  --layer <name>           Filter symbols by architectural layer (e.g. 'Presentation', 'Domain Services')
  --query <substring>      Filter symbols matching name or ID substring
  --concept <query>        Semantic human-level concept query (e.g. "session authentication token expiration")
  --json                   Output diagnostic data as structured JSON
  -h, --help               Show this help message

Examples:
  # Inspect default project graph (full report)
  node tools/ast-inspect.js

  # Inspect a specific graph JSON file
  node tools/ast-inspect.js codereview_graph.json
  node tools/ast-inspect.js path/to/graph.json

  # Semantic human concept query
  node tools/ast-inspect.js --concept "session authentication token expiration"

  # Inspect top 10 cognitive complexity hotspots
  node tools/ast-inspect.js --top 10 --section cognitive

  # Inspect top risk scores for a specific layer
  node tools/ast-inspect.js --layer Presentation --section risk
`);
}

function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: CLI_OPTIONS,
    allowPositionals: true
  });

  if (values.help) {
    printHelp();
    return;
  }

  const targetFile = positionals[0] || null;

  try {
    runInspectCommand(targetFile, {
      top: values.top,
      section: values.section,
      layer: values.layer,
      query: values.query,
      concept: values.concept,
      json: values.json
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  main
};
