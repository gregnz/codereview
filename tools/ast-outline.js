#!/usr/bin/env node

/**
 * AST Outline & Multi-Hop Blast Radius Analyzer
 * 
 * General-purpose static code analysis and architecture exploration platform.
 * Provides Tree-Sitter AST parsing, call graph resolution, C&K OO metrics,
 * circular dependency detection, architectural layering validation, and multi-format exporters.
 */

const fs = require('node:fs');
const path = require('node:path');

// CLI parser & commands
const { parseCliArgs, printHelp } = require('./src/cli/args');
const { runLintCommand } = require('./src/commands/lint');
const { runExportCommand } = require('./src/commands/export');
const { runBlastCommand } = require('./src/commands/blast');
const { runQueryCommand } = require('./src/commands/query');
const { runMermaidCommand } = require('./src/commands/mermaid');
const { runMapCommand } = require('./src/commands/map');
const { runInspectCommand } = require('./src/commands/inspect');
const { runConceptCommand } = require('./src/commands/concept');

// Config & Layers
const { getLayerForFile, loadProjectConfig, findProjectRoot } = require('./src/config/layers');

// Parser & AST Helpers
const { parseFileAST, collectFiles } = require('./src/parser/javascript');
const { parseProjectFiles } = require('./src/parser/project-parser');
const { getParamCount, getReturnCount } = require('./src/parser/ast-helpers');

// Complexity & Metrics
const { getCyclomaticComplexity } = require('./src/metrics/cyclomatic');
const { getCognitiveComplexity } = require('./src/metrics/cognitive');
const { computeSymbolBlastSummary } = require('./src/metrics/blast-scoring');

// Graph Resolution & Index
const { resolveCalleeTargets } = require('./src/graph/call-resolver');
const { buildBlastRadiusIndex } = require('./src/graph/graph-builder');

// VCS Diff Intersect
const { getChangedLinesFromDiff, intersectDiffWithSymbols } = require('./src/vcs/git-diff');

// Exporters
const { formatSymbolsMarkdown } = require('./src/exporters/markdown-map');
const { exportGraphIR } = require('./src/exporters/graph-ir');
const { generateMermaidDiagram } = require('./src/exporters/mermaid');

// ============================================================================
// CLI Entry Point
// ============================================================================

function resolveTargetDirectory(target = '.') {
  const currentWorkingDir = process.cwd();
  const rawTarget = target || '.';
  const resolved = path.isAbsolute(rawTarget) ? rawTarget : path.resolve(currentWorkingDir, rawTarget);

  if (fs.existsSync(resolved)) {
    const rootDir = findProjectRoot(resolved);
    return { resolvedTarget: resolved, rootDir };
  }

  // Check if target exists relative to parent directory
  const parentTarget = path.resolve(currentWorkingDir, '..', rawTarget);
  if (fs.existsSync(parentTarget)) {
    const rootDir = findProjectRoot(parentTarget);
    return { resolvedTarget: parentTarget, rootDir };
  }

  console.error(`Target path does not exist: ${resolved}`);
  process.exit(1);
}

function main() {
  const cli = parseCliArgs();

  if (cli.help) {
    printHelp();
    return;
  }

  const { resolvedTarget, rootDir } = resolveTargetDirectory(cli.target);

  // Load project-specific architectural configuration if present
  loadProjectConfig(rootDir);

  const files = collectFiles(resolvedTarget);
  const allFileResults = parseProjectFiles(files, rootDir);

  // Build the multi-hop blast radius & graph index
  const blastIndex = buildBlastRadiusIndex(allFileResults, rootDir);

  // Intersect with git diff if requested
  let changedSymbolIds = new Set();
  if (cli.diffRef) {
    const diffMap = getChangedLinesFromDiff(cli.diffRef, rootDir);
    changedSymbolIds = intersectDiffWithSymbols(diffMap, blastIndex);
  }

  // Dispatch to command handlers
  if (cli.runSync) {
    const mapFile = path.join(resolvedTarget, 'ast_symbol_map.md');
    const graphFile = path.join(resolvedTarget, 'ast_graph.json');
    runMapCommand(mapFile, allFileResults, blastIndex, rootDir);
    runExportCommand(graphFile, allFileResults, blastIndex, rootDir, changedSymbolIds);
    console.log(`\nOne-step sync complete:`);
    console.log(`- Symbol Map: ${mapFile}`);
    console.log(`- Graph IR:   ${graphFile}`);
    return;
  }

  if (cli.runVerify) {
    console.log('========================================================');
    console.log('   CodeReview Full Verification & Lifecycle Sync       ');
    console.log('========================================================\n');

    const mapFile = path.join(resolvedTarget, 'ast_symbol_map.md');
    const graphFile = path.join(resolvedTarget, 'ast_graph.json');
    runMapCommand(mapFile, allFileResults, blastIndex, rootDir);
    runExportCommand(graphFile, allFileResults, blastIndex, rootDir, changedSymbolIds);

    console.log('\n--- Architecture & Complexity Linter ---');
    runLintCommand(allFileResults, blastIndex, rootDir);

    console.log('\n--- Modified Symbols (vs HEAD) ---');
    const diffMap = getChangedLinesFromDiff('HEAD', rootDir);
    const diffChanged = intersectDiffWithSymbols(diffMap, blastIndex);
    const changedReport = Array.from(diffChanged).map(id => {
      const sym = blastIndex.catalog.get(id);
      const br = computeSymbolBlastSummary(id, blastIndex);
      return {
        id,
        name: sym ? (sym.parentClass ? `${sym.parentClass}.${sym.name}` : sym.name) : id,
        file: sym ? sym.file : 'unknown',
        lines: sym ? `L${sym.startLine}-L${sym.endLine}` : '',
        riskRating: br.riskCategory,
        riskScore: br.riskScore,
        directCallersCount: br.directCount,
        transitiveReachability: br.transitiveCount
      };
    });
    if (changedReport.length === 0) {
      console.log('(No modified symbols detected against HEAD)\n');
    } else {
      for (const item of changedReport) {
        console.log(`- ${item.name} (${item.file}:${item.lines}) [${item.riskRating}, Score: ${item.riskScore}] Callers: ${item.directCallersCount || 0} direct, ${item.transitiveReachability || 0} transitive`);
      }
      console.log('');
    }
    console.log('Verification complete.\n');
    return;
  }

  if (cli.runLint) {
    return runLintCommand(allFileResults, blastIndex, rootDir);
  }

  if (cli.runInspect) {
    const graphData = exportGraphIR(allFileResults, blastIndex, rootDir, changedSymbolIds);
    return runInspectCommand(graphData, {
      top: cli.top,
      section: cli.section,
      json: cli.asJson
    });
  }

  if (cli.mermaidTarget) {
    return runMermaidCommand(cli.mermaidTarget, blastIndex);
  }

  if (cli.blastTarget) {
    return runBlastCommand(cli.blastTarget, blastIndex);
  }

  if (cli.query) {
    return runQueryCommand(cli.query, blastIndex);
  }

  if (cli.concept) {
    return runConceptCommand(cli.concept, blastIndex, { json: cli.asJson });
  }

  if (cli.exportGraph) {
    return runExportCommand(cli.exportGraph, allFileResults, blastIndex, rootDir, changedSymbolIds);
  }

  if (cli.diffRef && !cli.writeMap) {
    const changedReport = Array.from(changedSymbolIds).map(id => {
      const sym = blastIndex.catalog.get(id);
      const br = computeSymbolBlastSummary(id, blastIndex);
      return {
        id,
        name: sym ? (sym.parentClass ? `${sym.parentClass}.${sym.name}` : sym.name) : id,
        file: sym ? sym.file : 'unknown',
        lines: sym ? `L${sym.startLine}-L${sym.endLine}` : '',
        riskRating: br.riskCategory,
        riskScore: br.riskScore,
        directCallersCount: br.directCount,
        transitiveReachability: br.transitiveCount,
        directCallers: br.directCallers
      };
    });
    if (cli.asJson) {
      console.log(JSON.stringify({
        diffRef: cli.diffRef,
        changedSymbolsCount: changedReport.length,
        changedSymbols: changedReport
      }, null, 2));
    } else {
      console.log(`\nChanged Symbols against '${cli.diffRef}': ${changedReport.length}\n`);
      if (changedReport.length === 0) {
        console.log(`(No modified symbols detected against ${cli.diffRef})\n`);
      } else {
        for (const item of changedReport) {
          console.log(`- ${item.name} (${item.file}:${item.lines}) [${item.riskRating}, Score: ${item.riskScore}] Callers: ${item.directCallersCount || 0} direct, ${item.transitiveReachability || 0} transitive`);
        }
        console.log('');
      }
    }
    return changedReport;
  }

  if (cli.asJson) {
    const output = allFileResults.map(r => ({
      file: path.relative(rootDir, r.filePath),
      layer: getLayerForFile(r.filePath),
      lines: r.lineCount,
      symbols: r.symbols
    }));
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  runMapCommand(cli.writeMap, allFileResults, blastIndex, rootDir);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseFileAST,
  buildBlastRadiusIndex,
  computeSymbolBlastSummary,
  exportGraphIR,
  generateMermaidDiagram,
  getLayerForFile,
  loadProjectConfig,
  getCyclomaticComplexity,
  getCognitiveComplexity,
  getParamCount,
  getReturnCount,
  collectFiles,
  resolveCalleeTargets
};
