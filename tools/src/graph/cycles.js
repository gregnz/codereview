const { stronglyConnectedComponents } = require('graphology-components');

/**
 * Propagates cycle membership to parent class symbol if applicable.
 */
function tagParentClassCycle(sym, cycleIdx, scc, catalog) {
  if (!sym.parentClass) return;
  const pId = `${sym.file}#${sym.parentClass}`;
  const pSym = catalog.get(pId);
  if (!pSym) return;

  pSym.inCycle = true;
  pSym.cycleId = cycleIdx;
  pSym.cycleMembers = Array.from(new Set([...(pSym.cycleMembers || []), ...scc]));
}

/**
 * Tags symbols participating in a multi-node circular dependency cycle.
 */
function tagCycleSymbols(scc, cycleIdx, catalog) {
  for (const nodeId of scc) {
    const sym = catalog.get(nodeId);
    if (!sym) continue;

    sym.inCycle = true;
    sym.cycleId = cycleIdx;
    sym.cycleMembers = scc;
    tagParentClassCycle(sym, cycleIdx, scc, catalog);
  }
}

/**
 * Tags edges that bridge between nodes in the same cycle.
 */
function tagCycleEdges(edges, nodeCycleMap) {
  for (const e of edges) {
    const srcCycle = nodeCycleMap.get(e.source);
    const tgtCycle = nodeCycleMap.get(e.target);
    if (srcCycle !== undefined && srcCycle === tgtCycle) {
      e.isCycle = true;
    }
  }
}

/**
 * Detects circular dependencies (cycles) using strongly connected components (SCC).
 * Distinguishes true multi-node architectural circular dependencies (N >= 2)
 * from intentional algorithmic self-recursion (N = 1).
 *
 * @param {Object} graph - Graphology MultiDirectedGraph instance
 * @param {Map} catalog - Symbol catalog
 * @param {Array} edges - Direct edge records
 * @returns {Object} Detected architectural cycles, recursive functions, and node-to-cycle map
 */
function detectCycles(graph, catalog, edges) {
  const sccs = stronglyConnectedComponents(graph);
  const cycles = [];
  const recursiveFunctions = [];
  const nodeCycleMap = new Map();

  for (const scc of sccs) {
    // 1. True architectural cycle involving 2 or more distinct symbols
    if (scc.length > 1) {
      const cycleIdx = cycles.length;
      cycles.push(scc);
      for (const nodeId of scc) {
        nodeCycleMap.set(nodeId, cycleIdx);
      }
      tagCycleSymbols(scc, cycleIdx, catalog);
    }
    // 2. Direct algorithmic self-recursion (A -> A)
    else if (scc.length === 1 && graph.hasEdge(scc[0], scc[0])) {
      const nodeId = scc[0];
      const sym = catalog.get(nodeId);
      if (sym) {
        sym.isRecursive = true;
        recursiveFunctions.push(nodeId);
      }
    }
  }

  // Tag edges participating in cycles
  tagCycleEdges(edges, nodeCycleMap);

  return {
    cycles,
    recursiveFunctions,
    nodeCycleMap
  };
}

module.exports = {
  detectCycles,
  tagParentClassCycle,
  tagCycleSymbols,
  tagCycleEdges
};
