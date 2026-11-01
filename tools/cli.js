#!/usr/bin/env node

/**
 * codereview Unified CLI
 *
 * Universal, project-independent entry point for AST analysis,
 * intent concept routing, symbol inspection, blast radius checks, and linting.
 */

const fs = require('node:fs');
const path = require('node:path');

const { findProjectRoot, loadProjectConfig } = require('./src/config/layers');
const { parseFileAST, collectFiles } = require('./src/parser/javascript');
const { buildBlastRadiusIndex } = require('./src/graph/graph-builder');
const { exportGraphIR } = require('./src/exporters/graph-ir');
const { formatSymbolsMarkdown } = require('./src/exporters/markdown-map');
const { runInspectCommand } = require('./src/commands/inspect');
const { runBlastCommand } = require('./src/commands/blast');
const { runLintCommand } = require('./src/commands/lint');
const { getChangedLinesFromDiff, intersectDiffWithSymbols } = require('./src/vcs/git-diff');
const { computeGitDecisionDiff, diffGraphSnapshots } = require('./src/vcs/decision-diff');
const { runDecisionsCommand, formatDecisionDiffReport, summarizeCodebaseDecisions } = require('./src/commands/decisions');
const { generateCoachingReview, formatCoachingReview } = require('./src/commands/review');
const { computeSymbolBlastSummary } = require('./src/metrics/blast-scoring');
const { resolveGraphPaths, isCacheFresh, loadCachedGraph, saveCachedGraph } = require('./src/cache/graph-cache');
const { runConversationCommand } = require('./src/commands/conversation');
const { runImproveCommand, runFeedbackCommand } = require('./src/commands/improve');
const { logTelemetryEvent } = require('./src/telemetry/feedback-logger');

function printHelp() {
  console.log(`
codereview - Universal Static Architecture & Multi-Hop Blast Radius Engine

Usage:
  codereview <subcommand> [arguments...] [options]

Core Subcommands:
  review [target] [dir]    Plain-English mentoring & coaching review of code decisions
  decisions [target] [dir] Explore program decisions across the 4 Reviewer Lenses
  concept <query> [dir]    Fast human intent concept query (auto-cached)
  query <regex> [dir]      Fast symbol search with [Lstart-Lend] line ranges
  blast <symbol> [dir]     Multi-hop caller blast radius and risk rating
  diff [ref] [dir]         Semantic Decision Diff & blast radius of git changes (default: HEAD)
  lint [dir]               Architecture layers & cognitive/cyclomatic lint scorecard
  sync [dir]               Build & export ast_symbol_map.md and ast_graph.json
  verify [dir]             Complete Phase 3 check: syncs map/graph, runs lint & git diff
  classify <file> <layer>  Assigns file to architectural layer in codereview.config.json
  init [dir]               Scaffold codereview.config.json and perform initial sync
  inspect [file|dir]       Interactive table inspector (--top N, --section S)
  audit <transcript>       Audit conversation adherence against rules
  feedback <message> [dir] Log friction, unhelpful returns, or missing domain synonyms
  improve [dir]            Analyze failure logs & suggest taxonomy/routing enhancements
                           (--apply to merge missing keywords into codereview.config.json)

Options:
  --json                   Output structured JSON
  --apply                  Auto-apply suggested taxonomy improvements (improve subcommand)
  --query <q>              Original query associated with feedback (feedback subcommand)
  --symbol <s>             Target symbol associated with feedback (feedback subcommand)
  --help, -h               Show this help message

Examples:
  codereview concept "contract board reward"
  codereview query "generateBoard|acceptContract"
  codereview blast acceptContract
  codereview feedback "Searched for energy shields; found in deflectorGrid" --query "energy shields"
  codereview improve
  codereview improve --apply
`);
}

function resolveTarget(dirArg = '.') {
  const currentWorkingDir = process.cwd();
  const rawTarget = dirArg || '.';
  const resolved = path.isAbsolute(rawTarget) ? rawTarget : path.resolve(currentWorkingDir, rawTarget);
  const rootDir = findProjectRoot(resolved);
  return { targetDir: resolved, rootDir };
}

function buildGraphIndex(targetDir, rootDir) {
  loadProjectConfig(rootDir);
  const files = collectFiles(targetDir);
  const allFileResults = [];

  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    const res = parseFileAST(file, code);
    allFileResults.push({ filePath: file, ...res });
  }

  const blastIndex = buildBlastRadiusIndex(allFileResults, rootDir);
  const graphData = exportGraphIR(allFileResults, blastIndex, rootDir, new Set());
  return { allFileResults, blastIndex, graphData };
}

function getOrBuildGraph(targetDir, rootDir) {
  const { existingPath, defaultCachePath } = resolveGraphPaths(targetDir, rootDir);
  if (existingPath && isCacheFresh(existingPath, targetDir)) {
    const cached = loadCachedGraph(existingPath);
    if (cached) return { graphData: cached, sourcePath: existingPath, fromCache: true };
  }

  const { blastIndex, graphData, allFileResults } = buildGraphIndex(targetDir, rootDir);
  saveCachedGraph(graphData, defaultCachePath);
  return { graphData, blastIndex, allFileResults, sourcePath: defaultCachePath, fromCache: false };
}

function handleConceptCommand(query, dirArg, asJson) {
  if (!query) {
    console.error('Error: Please provide a concept query, e.g.: codereview concept "mission routing"');
    process.exit(1);
  }
  const { targetDir, rootDir } = resolveTarget(dirArg);
  const { graphData } = getOrBuildGraph(targetDir, rootDir);
  const result = runInspectCommand(graphData, { concept: query, json: asJson });

  const matchedConcepts = result?.matchedConcepts || [];
  const directMatches = result?.directSymbolMatches || [];
  if (matchedConcepts.length === 0 && directMatches.length === 0) {
    logTelemetryEvent(rootDir, {
      type: 'EMPTY_CONCEPT',
      command: 'concept',
      input: query,
      targetDir
    });
  }

  return result;
}

function handleQueryCommand(regexQuery, dirArg, asJson) {
  if (!regexQuery) {
    console.error('Error: Please provide a search query, e.g.: codereview query "acceptContract"');
    process.exit(1);
  }
  const { targetDir, rootDir } = resolveTarget(dirArg);
  const { graphData } = getOrBuildGraph(targetDir, rootDir);
  const result = runInspectCommand(graphData, { query: regexQuery, json: asJson });

  const matched = result?.matchedSymbols || (Array.isArray(result) ? result : []);
  if (matched.length === 0) {
    logTelemetryEvent(rootDir, {
      type: 'EMPTY_QUERY',
      command: 'query',
      input: regexQuery,
      targetDir
    });
  }

  return result;
}

function handleBlastCommand(symbolName, dirArg) {
  if (!symbolName) {
    console.error('Error: Please provide a symbol name, e.g.: codereview blast acceptContract');
    process.exit(1);
  }
  const { targetDir, rootDir } = resolveTarget(dirArg);
  const { blastIndex } = buildGraphIndex(targetDir, rootDir);
  return runBlastCommand(symbolName, blastIndex);
}

function handleReviewCommand(targetArg, dirArg, asJson) {
  let targetQuery = targetArg || null;
  let effectiveDir = dirArg || '.';

  if (targetArg && !dirArg) {
    const candidatePath = path.isAbsolute(targetArg) ? targetArg : path.resolve(process.cwd(), targetArg);
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) {
      effectiveDir = targetArg;
      targetQuery = null;
    }
  }

  const { targetDir, rootDir } = resolveTarget(effectiveDir);
  const { allFileResults, blastIndex } = buildGraphIndex(targetDir, rootDir);
  const summary = summarizeCodebaseDecisions(allFileResults, blastIndex, rootDir, targetQuery);
  const diffMap = getChangedLinesFromDiff('HEAD', rootDir);
  const decisionDiff = computeGitDecisionDiff('HEAD', allFileResults, blastIndex, rootDir, diffMap);
  const review = generateCoachingReview(summary, blastIndex, decisionDiff);

  if (asJson) {
    console.log(JSON.stringify(review, null, 2));
  } else {
    console.log(formatCoachingReview(review));
  }
  return review;
}

function handleDecisionsCommand(targetArg, dirArg, asJson) {
  let targetQuery = targetArg || null;
  let effectiveDir = dirArg || '.';

  // If only 1 positional argument is given and it is an existing directory, treat it as dirArg
  if (targetArg && !dirArg) {
    const candidatePath = path.isAbsolute(targetArg) ? targetArg : path.resolve(process.cwd(), targetArg);
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) {
      effectiveDir = targetArg;
      targetQuery = null;
    }
  }

  const { targetDir, rootDir } = resolveTarget(effectiveDir);
  const { allFileResults, blastIndex } = buildGraphIndex(targetDir, rootDir);
  return runDecisionsCommand(targetQuery, allFileResults, blastIndex, rootDir, { json: asJson });
}

function handleDiffCommand(diffRef, dirArg, asJson) {
  let ref = diffRef || 'HEAD';
  let effectiveDir = dirArg || '.';

  // If the first argument is a directory (e.g. `codereview diff tools`), shift it to effectiveDir
  if (diffRef && !dirArg) {
    const cand = path.isAbsolute(diffRef) ? diffRef : path.resolve(process.cwd(), diffRef);
    if (fs.existsSync(cand) && fs.statSync(cand).isDirectory()) {
      effectiveDir = diffRef;
      ref = 'HEAD';
    }
  }

  const { targetDir, rootDir } = resolveTarget(effectiveDir);
  const { allFileResults, blastIndex, graphData } = buildGraphIndex(targetDir, rootDir);

  // If `ref` points to an existing .json baseline graph file, diff against that snapshot directly
  const refPath = path.isAbsolute(ref) ? ref : path.resolve(process.cwd(), ref);
  if (ref.endsWith('.json') && fs.existsSync(refPath)) {
    const baseGraph = JSON.parse(fs.readFileSync(refPath, 'utf8'));
    const decisionDiff = diffGraphSnapshots(baseGraph, graphData, path.basename(refPath));
    const output = {
      diffRef: path.basename(refPath),
      changedSymbolsCount: 0,
      changedSymbols: [],
      decisionDiff
    };
    if (asJson) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log(formatDecisionDiffReport(decisionDiff, []));
    }
    return output;
  }

  const diffMap = getChangedLinesFromDiff(ref, rootDir);
  const changedSymbolIds = intersectDiffWithSymbols(diffMap, blastIndex);

  const changedReport = Array.from(changedSymbolIds).map(id => {
    const sym = blastIndex.catalog.get(id);
    const br = computeSymbolBlastSummary(id, blastIndex);
    return {
      id,
      name: sym.parentClass ? `${sym.parentClass}.${sym.name}` : sym.name,
      file: sym.file,
      lines: `L${sym.startLine}-L${sym.endLine}`,
      riskRating: br.riskCategory || br.riskRating,
      riskScore: br.riskScore,
      directCallers: br.directCount ?? br.directCallersCount ?? 0,
      transitiveCallers: br.transitiveCount ?? br.transitiveReachability ?? 0
    };
  });

  const decisionDiff = computeGitDecisionDiff(ref, allFileResults, blastIndex, rootDir, diffMap);
  const output = {
    diffRef: ref,
    changedSymbolsCount: changedReport.length,
    changedSymbols: changedReport,
    decisionDiff
  };

  if (asJson) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(formatDecisionDiffReport(decisionDiff, changedReport));
  }
  return output;
}

function handleLintCommand(dirArg) {
  const { targetDir, rootDir } = resolveTarget(dirArg);
  const { allFileResults, blastIndex } = buildGraphIndex(targetDir, rootDir);
  return runLintCommand(allFileResults, blastIndex, rootDir);
}

function handleSyncCommand(dirArg) {
  const { targetDir, rootDir } = resolveTarget(dirArg);
  const { allFileResults, blastIndex, graphData } = buildGraphIndex(targetDir, rootDir);
  const mapPath = path.join(targetDir, 'ast_symbol_map.md');
  const graphPath = path.join(targetDir, 'ast_graph.json');

  const mapContent = formatSymbolsMarkdown(allFileResults, blastIndex, rootDir, new Set());
  fs.writeFileSync(mapPath, mapContent, 'utf8');
  fs.writeFileSync(graphPath, JSON.stringify(graphData, null, 2), 'utf8');

  console.log(`Successfully synced codereview artifacts:`);
  console.log(`- ${mapPath}`);
  console.log(`- ${graphPath}`);
  console.log(`Total Symbols: ${blastIndex.catalog.size} | Call Edges: ${blastIndex.edges.length}`);
}

function handleClassifyCommand(filePath, layerName, dirArg) {
  if (!filePath || !layerName) {
    console.error('Error: Please provide file and layer name, e.g.: codereview classify "src/services/AuthService.js" "Domain Services"');
    process.exit(1);
  }
  const { targetDir, rootDir } = resolveTarget(dirArg);
  const configPath = path.join(rootDir, 'codereview.config.json');

  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
      console.error(`Error reading ${configPath}:`, err.message);
      process.exit(1);
    }
  } else {
    config = {
      layers: {
        "Presentation": ["cli", "ui", "views", "components"],
        "Application": ["commands", "controllers", "routes"],
        "Domain Logic": ["services", "models", "domain", "engine"],
        "Infrastructure": ["config", "db", "utils", "vcs", "lib"]
      },
      layerRanks: {
        "Presentation": 1,
        "Application": 2,
        "Domain Logic": 3,
        "Infrastructure": 4
      }
    };
  }

  if (!config.layers) config.layers = {};
  if (!Array.isArray(config.layers[layerName])) {
    config.layers[layerName] = [];
  }

  const baseName = path.basename(filePath);
  if (!config.layers[layerName].includes(baseName) && !config.layers[layerName].includes(filePath)) {
    config.layers[layerName].push(baseName);
  }

  for (const [otherLayer, files] of Object.entries(config.layers)) {
    if (otherLayer !== layerName && Array.isArray(files)) {
      config.layers[otherLayer] = files.filter(f => f !== baseName && f !== filePath);
    }
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  console.log(`\nSuccessfully classified '${baseName}' as '${layerName}' in:`);
  console.log(`- ${configPath}\n`);

  handleSyncCommand(targetDir);
}

function handleVerifyCommand(dirArg, asJson) {
  const { targetDir, rootDir } = resolveTarget(dirArg);
  console.log('========================================================');
  console.log('   CodeReview Full Verification & Lifecycle Sync       ');
  console.log('========================================================\n');

  console.log('1. Synchronizing AST Symbol Map & Graph IR:');
  handleSyncCommand(dirArg);

  console.log('\n2. Auditing Architectural Layers & Complexity:');
  handleLintCommand(dirArg);

  console.log('\n3. Calculating Impacted Callers on Modified Code (vs HEAD):');
  handleDiffCommand('HEAD', dirArg, asJson);

  console.log('\nVerification complete.\n');
}

function handleInitCommand(dirArg) {
  const { targetDir, rootDir } = resolveTarget(dirArg);
  const configPath = path.join(rootDir, 'codereview.config.json');

  if (!fs.existsSync(configPath)) {
    const templateConfig = {
      layers: {
        "Presentation": ["cli", "ui", "views", "components"],
        "Application": ["commands", "controllers", "routes"],
        "Domain Logic": ["services", "models", "domain", "engine"],
        "Infrastructure": ["config", "db", "utils", "vcs", "lib"]
      },
      layerRanks: {
        "Presentation": 1,
        "Application": 2,
        "Domain Logic": 3,
        "Infrastructure": 4
      },
      ignore: ["dist", "build", "coverage", ".codereview"]
    };
    fs.writeFileSync(configPath, JSON.stringify(templateConfig, null, 2), 'utf8');
    console.log(`Created project configuration at: ${configPath}`);
  } else {
    console.log(`Project configuration already exists: ${configPath}`);
  }

  handleSyncCommand(targetDir);
}

function main() {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.length === 0 || rawArgs.includes('--help') || rawArgs.includes('-h')) {
    printHelp();
    return;
  }

  const asJson = rawArgs.includes('--json');
  const asApply = rawArgs.includes('--apply');
  const args = rawArgs.filter(a => a !== '--json' && a !== '--apply' && !a.startsWith('--query=') && !a.startsWith('--symbol='));
  const subcommand = args[0];

  try {
    switch (subcommand) {
      case 'review':
        return handleReviewCommand(args[1], args[2], asJson);
      case 'decisions':
        return handleDecisionsCommand(args[1], args[2], asJson);
      case 'concept':
        return handleConceptCommand(args[1], args[2], asJson);
      case 'query':
        return handleQueryCommand(args[1], args[2], asJson);
      case 'blast':
        return handleBlastCommand(args[1], args[2]);
      case 'diff':
        return handleDiffCommand(args[1], args[2], asJson);
      case 'lint':
        return handleLintCommand(args[1]);
      case 'sync':
        return handleSyncCommand(args[1]);
      case 'verify':
        return handleVerifyCommand(args[1], asJson);
      case 'classify':
        return handleClassifyCommand(args[1], args[2], args[3]);
      case 'init':
        return handleInitCommand(args[1]);
      case 'audit':
        return runConversationCommand(args[1]);
      case 'feedback': {
        const queryVal = rawArgs.find((a, i) => rawArgs[i - 1] === '--query');
        const symbolVal = rawArgs.find((a, i) => rawArgs[i - 1] === '--symbol');
        return runFeedbackCommand(args[1], { query: queryVal, symbol: symbolVal }, args[2]);
      }
      case 'improve':
        return runImproveCommand(args[1], { apply: asApply, json: asJson });
      default:
        console.error(`Unknown subcommand: ${subcommand}`);
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    const { rootDir } = resolveTarget(args[1] || '.');
    logTelemetryEvent(rootDir, {
      type: 'EXECUTION_ERROR',
      command: subcommand,
      input: args[1] || null,
      error: err.message,
      stack: err.stack
    });
    throw err;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
  resolveTarget,
  buildGraphIndex,
  getOrBuildGraph
};
