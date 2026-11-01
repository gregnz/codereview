const path = require('node:path');
const { MultiDirectedGraph } = require('graphology');
const { resolveCalleeTargets } = require('./call-resolver');
const { detectCycles } = require('./cycles');
const { checkLayerViolations } = require('./layer-validator');
const { computeClassMetrics } = require('../metrics/class-metrics');
const { buildConceptMap } = require('./concept-builder');

/**
 * Builds the symbol catalog, name indexes, and initializes graphology nodes.
 */
function populateSymbolCatalog(allFileResults, rootDir, graph) {
  const catalog = new Map();
  const nameToIds = new Map();
  const classMethods = new Map();

  for (const res of allFileResults) {
    const relFile = path.relative(rootDir, res.filePath);
    const s = res.symbols;
    const fDecisions = res.fileDecisions || null;

    function register(id, sym, type, parentClass = null) {
      const entry = { ...sym, id, file: relFile, type, parentClass, fileDecisions: fDecisions };
      catalog.set(id, entry);
      if (!graph.hasNode(id)) {
        graph.addNode(id, entry);
      }

      const qualified = parentClass ? `${parentClass}.${sym.name}` : sym.name;
      const baseFile = path.basename(relFile);
      const aliases = new Set([
        sym.name,
        qualified,
        id,
        `${relFile}#${sym.name}`,
        `${relFile}#${qualified}`,
        `${baseFile}#${sym.name}`,
        `${baseFile}#${qualified}`
      ]);
      if (parentClass) {
        aliases.add(`${parentClass}#${sym.name}`);
      }
      for (const alias of aliases) {
        if (!nameToIds.has(alias)) nameToIds.set(alias, new Set());
        nameToIds.get(alias).add(id);
      }
    }

    for (const f of s.functions) register(f.id, f, 'function');
    for (const e of s.enums) register(e.id, e, 'enum');
    for (const c of s.classes) {
      register(c.id, c, 'class');
      if (!classMethods.has(c.name)) classMethods.set(c.name, new Set());
      for (const m of c.methods) {
        register(m.id, m, 'method', c.name);
        classMethods.get(c.name).add(m.name);
      }
    }
  }

  return { catalog, nameToIds, classMethods };
}

/**
 * Connects direct calls, class instantiations, event signals, enums, and inheritance edges.
 */
function connectGraphEdges(allFileResults, catalog, nameToIds, graph) {
  const inboundDirect = new Map();
  const outboundDirect = new Map();
  const edges = [];

  function addEdge(sourceId, targetId, type, line, extra = {}) {
    if (!sourceId || !targetId) return;
    if (!outboundDirect.has(sourceId)) outboundDirect.set(sourceId, new Set());
    outboundDirect.get(sourceId).add(targetId);

    if (!inboundDirect.has(targetId)) inboundDirect.set(targetId, new Map());
    const siteKey = `${sourceId}:${line}:${type}`;
    const callerSym = catalog.get(sourceId);
    inboundDirect.get(targetId).set(siteKey, {
      callerId: sourceId,
      callerName: callerSym ? callerSym.name : sourceId,
      file: callerSym ? callerSym.file : 'unknown',
      line,
      type
    });

    edges.push({
      source: sourceId,
      target: targetId,
      type,
      line,
      ...extra
    });

    if (graph.hasNode(sourceId) && graph.hasNode(targetId)) {
      graph.addEdge(sourceId, targetId, { type, line, ...extra });
    }
  }

  // Pre-index event listeners across all files for O(1) resolution
  const listenersByEvent = new Map();
  for (const r of allFileResults) {
    for (const sig of r.rawSignals) {
      if (sig.type === 'listen') {
        if (!listenersByEvent.has(sig.event)) listenersByEvent.set(sig.event, []);
        listenersByEvent.get(sig.event).push(sig);
      }
    }
  }

  for (const res of allFileResults) {
    // 1. Calls
    for (const call of res.rawCalls) {
      const resolvedTargetIds = resolveCalleeTargets(call, catalog, nameToIds);
      for (const targetId of resolvedTargetIds) {
        addEdge(call.callerSymbolId, targetId, 'calls', call.callerLine, {
          isThis: call.isThis,
          isSuper: call.isSuper
        });
      }
    }

    // 2. Instantiations
    for (const inst of res.rawInstantiations) {
      if (nameToIds.has(inst.className)) {
        for (const targetId of nameToIds.get(inst.className)) {
          addEdge(inst.callerSymbolId, targetId, 'instantiates', inst.line);
        }
      }
    }

    // 3. Event Signals
    for (const sig of res.rawSignals) {
      if (sig.type !== 'emit') continue;
      const listeners = listenersByEvent.get(sig.event) || [];
      for (const otherSig of listeners) {
        addEdge(sig.callerSymbolId, otherSig.callerSymbolId, 'event_signal', sig.line, {
          event: sig.event
        });
      }
    }

    // 4. Enum accesses
    for (const ea of res.rawEnumAccesses) {
      if (nameToIds.has(ea.enumName)) {
        for (const targetId of nameToIds.get(ea.enumName)) {
          addEdge(ea.callerSymbolId, targetId, 'reads_enum', ea.line, {
            key: ea.keyName
          });
        }
      }
    }

    // 5. Class inheritance (extends)
    for (const c of res.symbols.classes) {
      if (c.extends && nameToIds.has(c.extends)) {
        for (const parentId of nameToIds.get(c.extends)) {
          addEdge(c.id, parentId, 'extends', c.startLine);
        }
      }
    }
  }

  return { inboundDirect, outboundDirect, edges };
}

/**
 * Creates multi-hop blast reachability, root entry-point identification, and pathing helpers.
 */
function createMultiHopReachability(catalog, inboundDirect) {
  function getMultiHopBlast(symbolId, maxHops = 3) {
    const visited = new Set([symbolId]);
    const hopMap = new Map();
    const queue = [{ id: symbolId, dist: 0 }];

    while (queue.length > 0) {
      const { id, dist } = queue.shift();
      if (dist >= maxHops) continue;

      const callers = inboundDirect.get(id);
      if (callers) {
        for (const site of callers.values()) {
          if (!visited.has(site.callerId)) {
            visited.add(site.callerId);
            hopMap.set(site.callerId, dist + 1);
            queue.push({ id: site.callerId, dist: dist + 1 });
          }
        }
      }
    }

    return hopMap;
  }

  const rootEntryPoints = new Set();
  for (const id of catalog.keys()) {
    const callers = inboundDirect.get(id);
    if (!callers || callers.size === 0) {
      rootEntryPoints.add(id);
    }
  }

  function getEntryPointType(id) {
    const sym = catalog.get(id);
    if (!sym) return null;
    const callers = inboundDirect.get(id);
    if (callers && callers.size > 0) return null;

    const name = sym.name;
    if (['loop', 'render', 'updateSimulation', 'main'].includes(name)) return 'game_loop';
    if (sym.file.includes('UI.js') || (sym.parentClass && sym.parentClass.includes('Control'))) return 'ui_control';
    if (name.startsWith('init') || name.startsWith('setup') || name.startsWith('start')) return 'bootstrap';
    return 'root';
  }

  function getPathsFromEntryPoints(symbolId, maxPaths = 3, maxDepth = 6) {
    const paths = [];
    const queue = [[symbolId]];

    while (queue.length > 0 && paths.length < maxPaths) {
      const currentPath = queue.shift();
      const head = currentPath[0];

      const callers = inboundDirect.get(head);
      if (!callers || callers.size === 0) {
        if (currentPath.length > 1) {
          paths.push([...currentPath].reverse());
        }
        continue;
      }

      if (currentPath.length >= maxDepth) {
        paths.push([...currentPath].reverse());
        continue;
      }

      for (const site of callers.values()) {
        if (!currentPath.includes(site.callerId)) {
          queue.push([site.callerId, ...currentPath]);
        }
      }
    }

    return paths;
  }

  return {
    getMultiHopBlast,
    rootEntryPoints,
    getEntryPointType,
    getPathsFromEntryPoints
  };
}

/**
 * Builds the comprehensive Blast Radius & Multi-Hop Call Graph index.
 */
function buildBlastRadiusIndex(allFileResults, rootDir) {
  const graph = new MultiDirectedGraph();

  // 1. Symbol catalog and node creation
  const { catalog, nameToIds, classMethods } = populateSymbolCatalog(allFileResults, rootDir, graph);

  // 2. Direct edge connections
  const { inboundDirect, outboundDirect, edges } = connectGraphEdges(allFileResults, catalog, nameToIds, graph);

  // 3. Multi-hop reachability and entry points
  const reachability = createMultiHopReachability(catalog, inboundDirect);

  // 4. Class-Level Metrics (CBO, WMC, DIT, NOC)
  const classMetricsList = computeClassMetrics(catalog, outboundDirect);

  // 5. Circular Dependency Detection
  const { cycles, recursiveFunctions } = detectCycles(graph, catalog, edges);

  // 6. Architectural Layer Inversion Detection
  const layerViolations = checkLayerViolations(edges, catalog);

  // 7. Human Concept Map & Cross-Concept Intersections
  const conceptMap = buildConceptMap({ catalog, edges });

  return {
    catalog,
    graph,
    inboundDirect,
    outboundDirect,
    edges,
    conceptMap,
    getMultiHopBlast: reachability.getMultiHopBlast,
    rootEntryPoints: reachability.rootEntryPoints,
    getEntryPointType: reachability.getEntryPointType,
    getPathsFromEntryPoints: reachability.getPathsFromEntryPoints,
    nameToIds,
    classMethods,
    cycles,
    recursiveFunctions,
    layerViolations,
    classes: classMetricsList
  };
}

/**
 * Resolves a symbol query (bare name, Class.method, Class#method, file#symbol, or full ID) to matching catalog IDs.
 */
function resolveSymbolIds(target, blastIndex) {
  if (!target || !blastIndex) return [];
  if (blastIndex.nameToIds && blastIndex.nameToIds.has(target)) {
    return Array.from(blastIndex.nameToIds.get(target));
  }
  if (blastIndex.catalog && blastIndex.catalog.has(target)) {
    return [target];
  }
  const lower = target.toLowerCase();
  const suffixMatches = [];
  if (blastIndex.catalog) {
    for (const [id, sym] of blastIndex.catalog.entries()) {
      const qual = sym.parentClass ? `${sym.parentClass}.${sym.name}` : sym.name;
      const relId = `${sym.file}#${sym.name}`;
      const relQual = `${sym.file}#${qual}`;
      if (
        id.toLowerCase().endsWith(lower) ||
        relId.toLowerCase().endsWith(lower) ||
        relQual.toLowerCase().endsWith(lower) ||
        qual.toLowerCase() === lower ||
        sym.name.toLowerCase() === lower
      ) {
        suffixMatches.push(id);
      }
    }
  }
  return suffixMatches;
}

module.exports = {
  buildBlastRadiusIndex,
  populateSymbolCatalog,
  connectGraphEdges,
  createMultiHopReachability,
  resolveSymbolIds
};
