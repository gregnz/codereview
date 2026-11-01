const { parseArgs } = require('node:util');

const CLI_OPTIONS = {
  json: { type: 'boolean', default: false },
  'write-map': { type: 'string' },
  'export-graph': { type: 'string' },
  'graph-json': { type: 'string' },
  query: { type: 'string' },
  'blast-radius': { type: 'string' },
  mermaid: { type: 'string' },
  diff: { type: 'string' },
  sync: { type: 'boolean', default: false },
  verify: { type: 'boolean', default: false },
  lint: { type: 'boolean', default: false },
  inspect: { type: 'boolean', default: false },
  top: { type: 'string', default: '15' },
  section: { type: 'string', default: 'all' },
  concept: { type: 'string' },
  help: { type: 'boolean', short: 'h', default: false }
};

function parseCliArgs(rawArgs = process.argv.slice(2)) {
  const normalized = [];
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (['--diff', '--write-map', '--export-graph', '--graph-json'].includes(arg)) {
      const next = rawArgs[i + 1];
      if (!next || next.startsWith('--')) {
        const def = arg === '--diff' ? 'HEAD' : arg.includes('graph') ? 'ast_graph.json' : 'ast_symbol_map.md';
        normalized.push(`${arg}=${def}`);
        continue;
      }
    }
    normalized.push(arg);
  }

  const { values, positionals } = parseArgs({
    args: normalized,
    options: CLI_OPTIONS,
    allowPositionals: true
  });

  const exportGraph = values['export-graph'] || values['graph-json'] || null;

  return {
    target: positionals[0] || '.',
    asJson: values.json || false,
    writeMap: values['write-map'] || null,
    exportGraph,
    query: values.query || null,
    blastTarget: values['blast-radius'] || null,
    mermaidTarget: values.mermaid || null,
    diffRef: values.diff || null,
    runSync: values.sync || false,
    runVerify: values.verify || false,
    runLint: values.lint || false,
    runInspect: values.inspect || false,
    top: values.top || '15',
    section: values.section || 'all',
    concept: values.concept || null,
    help: values.help || false
  };
}

function printHelp() {
  console.log(`
AST Outline & Blast Radius Analysis CLI

Usage:
  node tools/ast-outline.js [targetPath] [options]

Options:
  --sync                  One-step sync: writes ast_symbol_map.md and ast_graph.json
  --verify                Complete Phase 3 check: syncs artifacts, runs lint, and checks git diff
  --export-graph [file]   Export full architecture Graph IR to JSON (default: ast_graph.json)
  --write-map [file]      Generate Markdown AST symbol map (default: ast_symbol_map.md)
  --json                  Output raw symbol outline to stdout as JSON
  --lint                  Display static complexity hotspot summary and warnings
  --inspect               Inspect complexity hotspots, top cognitive/risk symbols, and class metrics
  --concept <query>       Semantic human-level concept query (e.g. "session authentication token expiration")
  --top <number>          Limit top items in inspection report (default: 15)
  --section <name>        Filter inspection section: 'all', 'cognitive', 'risk', 'classes', 'hotspots'
  --blast-radius <symbol> Print multi-hop blast radius impact for a given symbol ID
  --mermaid <symbol>      Generate Mermaid dependency flowchart for a given symbol ID
  --query <query>         Filter and inspect symbols matching name or substring
  --diff [ref]            Intersect blast radius with git diff (default: HEAD)
  -h, --help              Show this help message
`);
}

module.exports = {
  parseCliArgs,
  printHelp
};
