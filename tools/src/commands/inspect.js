const fs = require('node:fs');
const path = require('node:path');
const { sanitizeQuery } = require('./query');

/**
 * Extracts normalized metrics from a graph node, handling both flat and nested schemas.
 */
function getNodeMetrics(node) {
  const cog = node.cognitiveComplexity ?? node.metrics?.cognitive ?? 0;
  const cyc = node.cyclomaticComplexity ?? node.metrics?.cyclomatic ?? 1;
  const loc = node.loc ?? node.metrics?.loc ?? 0;
  const depth = node.nestingDepth ?? node.metrics?.maxNesting ?? node.metrics?.depth ?? 0;
  const riskScore = node.riskScore ?? node.blastRadius?.riskScore ?? 0;
  const riskCategory = node.riskCategory ?? node.blastRadius?.riskCategory ?? node.blastRadius?.riskLevel ?? 'LOW';
  
  const directCallers = node.blastRadius?.directCallers 
    ?? (Array.isArray(node.blastRadius?.callers) ? node.blastRadius.callers.length : (node.afferentCoupling ?? 0));
  const transitiveCallers = node.blastRadius?.transitiveCallers ?? directCallers;
  const hop2Callers = node.blastRadius?.hop2Callers ?? 0;
  
  const afferentCoupling = node.afferentCoupling ?? 0;
  const efferentCoupling = node.efferentCoupling ?? 0;
  const instability = node.instability ?? 0;
  const inCycle = Boolean(node.inCycle);
  const layerViolationsCount = node.layerViolationsCount ?? 0;

  return {
    cog, cyc, loc, depth, riskScore, riskCategory,
    directCallers, transitiveCallers, hop2Callers,
    afferentCoupling, efferentCoupling, instability,
    inCycle, layerViolationsCount
  };
}

/**
 * Extracts normalized class metrics from a class node.
 */
function getClassMetrics(node) {
  if (!node.classMetrics && node.type !== 'class') return null;
  const cm = node.classMetrics || {};
  const methods = cm.methodsCount ?? cm.methodCount ?? (Array.isArray(node.methods) ? node.methods.length : 0);
  const wmc = cm.wmc ?? ((cm.wmcCyclomatic || 0) + (cm.wmcCognitive || 0)) ?? (node.cyclomaticComplexity || 0);
  const cbo = cm.cbo ?? 0;
  const rfc = cm.rfc ?? (methods + cbo);
  const dit = cm.dit ?? 0;
  const noc = cm.noc ?? 0;
  const loc = cm.wmcLoc ?? node.loc ?? 0;

  return { methods, wmc, cbo, rfc, dit, noc, loc };
}

/**
 * Generates an inspection report object from graph data.
 */
function generateInspectionData(graphData, options = {}) {
  const topLimit = parseInt(options.top || '15', 10);
  const filterLayer = options.layer ? options.layer.toLowerCase() : null;
  const filterQuery = options.query ? options.query.toLowerCase() : null;

  let nodes = (graphData.nodes || []).filter(n => n.type !== 'file');

  if (filterLayer) {
    nodes = nodes.filter(n => (n.layer || '').toLowerCase().includes(filterLayer));
  }

  if (options.query) {
    const { cleanQuery, typeFilter } = sanitizeQuery(options.query);
    let queryMatcher;
    try {
      queryMatcher = new RegExp(cleanQuery, 'i');
    } catch {
      queryMatcher = { test: s => Boolean(s && s.toLowerCase().includes(cleanQuery.toLowerCase())) };
    }
    nodes = nodes.filter(n => {
      if (typeFilter) {
        const allowedTypes = Array.isArray(typeFilter) ? typeFilter : [typeFilter];
        if (!allowedTypes.includes(n.type)) return false;
      }
      return queryMatcher.test(n.id) ||
        (n.name && queryMatcher.test(n.name)) ||
        (n.file && queryMatcher.test(n.file));
    });
  }

  const matchedSymbols = options.query
    ? nodes.slice(0, topLimit * 2).map(n => ({ node: n, metrics: getNodeMetrics(n) }))
    : [];

  // Top Cognitive Complexity
  const topCognitive = [...nodes]
    .map(n => ({ node: n, metrics: getNodeMetrics(n) }))
    .sort((a, b) => b.metrics.cog - a.metrics.cog || b.metrics.cyc - a.metrics.cyc)
    .slice(0, topLimit);

  // Top Blast Radius Risk Score
  const topRisk = [...nodes]
    .map(n => ({ node: n, metrics: getNodeMetrics(n) }))
    .sort((a, b) => b.metrics.riskScore - a.metrics.riskScore || b.metrics.cog - a.metrics.cog)
    .slice(0, topLimit);

  // Top Cyclomatic Complexity
  const topCyclomatic = [...nodes]
    .map(n => ({ node: n, metrics: getNodeMetrics(n) }))
    .sort((a, b) => b.metrics.cyc - a.metrics.cyc || b.metrics.cog - a.metrics.cog)
    .slice(0, topLimit);

  // Class Metrics
  const classNodes = (graphData.nodes || []).filter(n => n.type === 'class');
  const topClasses = classNodes
    .map(c => ({ node: c, classMetrics: getClassMetrics(c) }))
    .filter(c => c.classMetrics !== null)
    .sort((a, b) => b.classMetrics.wmc - a.classMetrics.wmc || b.classMetrics.cbo - a.classMetrics.cbo)
    .slice(0, topLimit);

  // Hotspots (Critical or High risk, or in cycle, or layer violations)
  const hotspots = nodes
    .map(n => ({ node: n, metrics: getNodeMetrics(n) }))
    .filter(item => 
      ['CRITICAL HOTSPOT', 'CRITICAL', 'HIGH'].includes(item.metrics.riskCategory) ||
      item.metrics.inCycle ||
      item.metrics.layerViolationsCount > 0
    )
    .sort((a, b) => b.metrics.riskScore - a.metrics.riskScore);

  return {
    metadata: graphData.metadata || {},
    subsystems: graphData.subsystems || [],
    matchedSymbols,
    topCognitive,
    topRisk,
    topCyclomatic,
    topClasses,
    hotspots
  };
}

/**
 * Formats inspection data as a clean, human-readable terminal output.
 */
function formatInspectionOutput(reportData, options = {}) {
  const section = (options.section || (options.query ? 'query' : 'all')).toLowerCase();
  const topLimit = parseInt(options.top || '15', 10);
  const out = [];

  // Metadata Header
  if (section === 'all' || section === 'metadata') {
    out.push('Metadata: ' + JSON.stringify(reportData.metadata, null, 2));
  }

  // Matched Symbols (when --query is provided)
  if (section === 'all' || section === 'query' || section === 'symbols') {
    if (reportData.matchedSymbols && reportData.matchedSymbols.length > 0) {
      out.push(`\n--- Matched Symbols (${reportData.matchedSymbols.length} found — Direct Line Ranges & Callers) ---`);
      reportData.matchedSymbols.forEach(({ node, metrics }) => {
        const lines = (node.startLine && node.endLine) ? `L${node.startLine}-L${node.endLine}` : '';
        out.push(`${node.id} [${node.layer || 'Unknown'}] ${lines} - type:${node.type} callers:${metrics.directCallers} transitive:${metrics.transitiveCallers} risk:${metrics.riskCategory}(${metrics.riskScore})`);
      });
    } else if (options.query) {
      out.push(`\nNo symbols matched "${options.query}".`);
      out.push(`💡 Suggestions:`);
      out.push(`- Symbol query matches identifier names with regex (e.g. "drawShip|ShipFactory").`);
      out.push(`- For natural language intent or bug routing, run:`);
      out.push(`    codereview concept "${options.query}"`);
    }
  }

  // Top Cognitive Complexity
  if (section === 'all' || section === 'cognitive' || section === 'cog') {
    out.push(`\n--- Top ${reportData.topCognitive.length} Cognitive Complexity ---`);
    if (reportData.topCognitive.length === 0) {
      out.push('(No symbols found)');
    } else {
      reportData.topCognitive.forEach(({ node, metrics }) => {
        out.push(`${node.id} [${node.layer || 'Unknown'}] - cog:${metrics.cog} cyc:${metrics.cyc} loc:${metrics.loc} depth:${metrics.depth} risk:${metrics.riskCategory}(${metrics.riskScore})`);
      });
    }
  }

  // Top Blast Radius Risk Score
  if (section === 'all' || section === 'risk' || section === 'blast') {
    out.push(`\n--- Top ${reportData.topRisk.length} Blast Radius Risk Score ---`);
    if (reportData.topRisk.length === 0) {
      out.push('(No symbols found)');
    } else {
      reportData.topRisk.forEach(({ node, metrics }) => {
        out.push(`${node.id} [${node.layer || 'Unknown'}] - risk:${metrics.riskScore} (${metrics.riskCategory}) callers:${metrics.directCallers} transitive:${metrics.transitiveCallers} cog:${metrics.cog} loc:${metrics.loc}`);
      });
    }
  }

  // Class Metrics
  if (section === 'all' || section === 'classes' || section === 'class') {
    out.push(`\n--- Class Metrics (WMC / CBO / RFC) ---`);
    if (reportData.topClasses.length === 0) {
      out.push('(No classes defined in analyzed graph)');
    } else {
      reportData.topClasses.forEach(({ node, classMetrics: cm }) => {
        out.push(`${node.id} - WMC:${cm.wmc} CBO:${cm.cbo} RFC:${cm.rfc} methods:${cm.methods} loc:${cm.loc}`);
      });
    }
  }

  // Critical Hotspots & Architectural Warnings
  if ((section === 'all' || section === 'hotspots') && reportData.hotspots.length > 0) {
    out.push(`\n--- Critical & High Risk Hotspots (${reportData.hotspots.length} total) ---`);
    reportData.hotspots.slice(0, topLimit).forEach(({ node, metrics }) => {
      const tags = [];
      if (metrics.inCycle) tags.push('CYCLE');
      if (metrics.layerViolationsCount > 0) tags.push(`LAYER_VIOLATIONS:${metrics.layerViolationsCount}`);
      const tagStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
      out.push(`⚠️  ${node.id} [${node.layer}] - risk:${metrics.riskScore} (${metrics.riskCategory}) loc:${metrics.loc} cog:${metrics.cog} cyc:${metrics.cyc}${tagStr}`);
    });
  }

  return out.join('\n');
}

/**
 * Resolves graph file path or returns graph data.
 */
function resolveGraphData(targetPath = null) {
  const rootDir = process.cwd();

  // If explicit path given
  if (targetPath) {
    const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(rootDir, targetPath);
    if (fs.existsSync(resolved)) {
      const stat = fs.statSync(resolved);
      if (stat.isFile()) {
        return JSON.parse(fs.readFileSync(resolved, 'utf8'));
      }
    }
  }

  // Check common default graph locations
  const candidates = [
    path.resolve(rootDir, 'codereview_graph.json'),
    path.resolve(rootDir, 'graph.json'),
    path.resolve(rootDir, 'ast_graph.json')
  ];

  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      return JSON.parse(fs.readFileSync(cand, 'utf8'));
    }
  }

  throw new Error(
    `No graph file found. Specified target '${targetPath}' does not exist, and no default graph file was found.\n` +
    `Generate one using: node tools/ast-outline.js <targetDir> --export-graph graph.json (or 'codereview sync [targetDir]')`
  );
}

/**
 * CLI command runner for inspect.
 */
function runInspectCommand(graphInput, options = {}) {
  let graphData;

  if (graphInput && typeof graphInput === 'object' && graphInput.nodes) {
    graphData = graphInput;
  } else {
    graphData = resolveGraphData(typeof graphInput === 'string' ? graphInput : null);
  }

  if (options.concept) {
    const { buildConceptMap, queryConcepts } = require('../graph/concept-builder');
    const { formatConceptOutput } = require('./concept');

    const catalog = new Map();
    for (const node of (graphData.nodes || [])) {
      catalog.set(node.id, node);
    }
    const edges = graphData.edges || [];
    const conceptMap = buildConceptMap({ catalog, edges });
    const result = queryConcepts(options.concept, conceptMap, { catalog, edges });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return result;
    }

    const formatted = formatConceptOutput(result);
    console.log(formatted);
    return result;
  }

  const reportData = generateInspectionData(graphData, options);

  if (options.json) {
    console.log(JSON.stringify(reportData, null, 2));
    return reportData;
  }

  const formatted = formatInspectionOutput(reportData, options);
  console.log(formatted);
  return reportData;
}

module.exports = {
  getNodeMetrics,
  getClassMetrics,
  generateInspectionData,
  formatInspectionOutput,
  resolveGraphData,
  runInspectCommand
};
