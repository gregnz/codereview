/**
 * Semantic Decision Diff Engine
 *
 * Compares two AST/Graph snapshots (or two parsed file sets) above the line-of-code level,
 * emitting structured Decision Deltas grouped across the 4 Reviewer Lenses:
 *   1. Architecture & Structure (layers, exports, dependencies, call coupling)
 *   2. Contracts & Data (signatures, defaults, options, return shapes, collections, state & mutation)
 *   3. Behavior & Heuristics (control archetype, guards, branch conditions, thresholds, scaling cost)
 *   4. Operations & Trust (error policy, I/O side effects, sanitization, determinism/purity)
 *
 * Also classifies symbols whose lines changed without any decision delta as "Pure Refactorings".
 */

const { execSync } = require('node:child_process');
const path = require('node:path');
const { parseFileAST } = require('../parser/javascript');
const { getLayerForFile } = require('../config/layers');

function arrayDiff(beforeArr = [], afterArr = []) {
  const bSet = new Set(beforeArr);
  const aSet = new Set(afterArr);
  const added = afterArr.filter(x => !bSet.has(x));
  const removed = beforeArr.filter(x => !aSet.has(x));
  return { added, removed, changed: added.length > 0 || removed.length > 0 };
}

function formatParamContract(p) {
  if (!p) return '';
  if (p.kind === 'options_bag') {
    const keys = (p.keys && p.keys.length > 0) ? `{ ${p.keys.join(', ')} }` : p.name;
    return p.defaultValue ? `${keys} = ${p.defaultValue}` : keys;
  }
  if (p.kind === 'default_param') {
    return `${p.name} = ${p.defaultValue}`;
  }
  return p.name;
}

function normalizeThresholdExpr(expr) {
  if (!expr) return '';
  // Normalize local loop iterator prefix (e.g. `x.price > 100` and `product.price > 100` -> `.price > 100`)
  return expr.replace(/^[a-zA-Z0-9_$]+\.([a-zA-Z0-9_$.]+\s*(?:>=|<=|===|!==|>|<)\s*.+)$/, '.$1');
}

function diffContractAndDataLens(bDec, tDec, changes) {
  const bParams = (bDec.contract?.params || []).map(formatParamContract).join(', ');
  const tParams = (tDec.contract?.params || []).map(formatParamContract).join(', ');
  if (bParams !== tParams) {
    changes.push({
      lens: 'Contract & Data',
      category: 'Signature Contract',
      before: `(${bParams})`,
      after: `(${tParams})`,
      summary: `Parameter contract changed: (${bParams}) ➔ (${tParams})`
    });
  }

  const optDiff = arrayDiff(bDec.contract?.accessedOptions || [], tDec.contract?.accessedOptions || []);
  if (optDiff.changed) {
    changes.push({
      lens: 'Contract & Data',
      category: 'Options Contract',
      before: (bDec.contract?.accessedOptions || []).join(', ') || 'none',
      after: (tDec.contract?.accessedOptions || []).join(', ') || 'none',
      summary: `Option keys read changed (+[${optDiff.added.join(', ')}] -[${optDiff.removed.join(', ')}])`
    });
  }

  const bRetShapes = (bDec.contract?.returns?.shapes || []).join(' | ') || 'void';
  const tRetShapes = (tDec.contract?.returns?.shapes || []).join(' | ') || 'void';
  const bRetKeys = (bDec.contract?.returns?.objectKeys || []).join(', ');
  const tRetKeys = (tDec.contract?.returns?.objectKeys || []).join(', ');
  if (bRetShapes !== tRetShapes || bRetKeys !== tRetKeys) {
    const bDesc = bRetKeys ? `${bRetShapes} { ${bRetKeys} }` : bRetShapes;
    const tDesc = tRetKeys ? `${tRetShapes} { ${tRetKeys} }` : tRetShapes;
    changes.push({
      lens: 'Contract & Data',
      category: 'Return Contract',
      before: bDesc,
      after: tDesc,
      summary: `Return shape changed: ${bDesc} ➔ ${tDesc}`
    });
  }

  const collDiff = arrayDiff(bDec.data?.collections || [], tDec.data?.collections || []);
  if (collDiff.changed) {
    changes.push({
      lens: 'Contract & Data',
      category: 'Data Structures',
      before: (bDec.data?.collections || []).join(', ') || 'primitives/arrays',
      after: (tDec.data?.collections || []).join(', ') || 'primitives/arrays',
      summary: `Data structures changed: ${bDec.data?.collections?.join(', ') || 'none'} ➔ ${tDec.data?.collections?.join(', ') || 'none'}`
    });
  }

  const stateWriteDiff = arrayDiff(bDec.data?.stateWrites || [], tDec.data?.stateWrites || []);
  if (stateWriteDiff.changed || Boolean(bDec.data?.mutatesState) !== Boolean(tDec.data?.mutatesState)) {
    changes.push({
      lens: 'Contract & Data',
      category: 'State Mutation',
      before: bDec.data?.mutatesState ? `mutates (${(bDec.data?.stateWrites || []).join(', ') || 'collections'})` : 'immutable/read-only',
      after: tDec.data?.mutatesState ? `mutates (${(tDec.data?.stateWrites || []).join(', ') || 'collections'})` : 'immutable/read-only',
      summary: `Mutation profile shifted`
    });
  }
}

function diffBehaviorAndHeuristicsLens(bDec, tDec, changes) {
  const bGuards = (bDec.contract?.guards || []).map(g => `${g.condition} -> ${g.action}`);
  const tGuards = (tDec.contract?.guards || []).map(g => `${g.condition} -> ${g.action}`);
  if (arrayDiff(bGuards, tGuards).changed) {
    changes.push({
      lens: 'Behavior & Heuristics',
      category: 'Precondition Guards',
      before: bGuards.join('; ') || 'none',
      after: tGuards.join('; ') || 'none',
      summary: `Entry guard clauses updated`
    });
  }

  if (bDec.control?.archetype !== tDec.control?.archetype) {
    changes.push({
      lens: 'Behavior & Heuristics',
      category: 'Control Archetype',
      before: bDec.control?.archetype,
      after: tDec.control?.archetype,
      summary: `Control archetype shifted: ${bDec.control?.archetype} ➔ ${tDec.control?.archetype}`
    });
  }

  if (bDec.control?.executionMode !== tDec.control?.executionMode) {
    changes.push({
      lens: 'Behavior & Heuristics',
      category: 'Execution Mode',
      before: bDec.control?.executionMode,
      after: tDec.control?.executionMode,
      summary: `Execution mode changed: ${bDec.control?.executionMode} ➔ ${tDec.control?.executionMode}`
    });
  }

  if (bDec.control?.scalingProfile !== tDec.control?.scalingProfile) {
    changes.push({
      lens: 'Behavior & Heuristics',
      category: 'Scaling & Algorithmic Cost',
      before: bDec.control?.scalingProfile,
      after: tDec.control?.scalingProfile,
      summary: `Scaling cost profile changed: ${bDec.control?.scalingProfile} ➔ ${tDec.control?.scalingProfile}`
    });
  }

  const bNormThresh = (bDec.control?.thresholds || []).map(normalizeThresholdExpr);
  const tNormThresh = (tDec.control?.thresholds || []).map(normalizeThresholdExpr);
  const threshDiff = arrayDiff(bNormThresh, tNormThresh);
  if (threshDiff.changed) {
    changes.push({
      lens: 'Behavior & Heuristics',
      category: 'Domain Heuristics & Thresholds',
      before: (bDec.control?.thresholds || []).join(', ') || 'none',
      after: (tDec.control?.thresholds || []).join(', ') || 'none',
      summary: `Domain thresholds/heuristics modified: (${(bDec.control?.thresholds || []).join(', ') || 'none'}) ➔ (${(tDec.control?.thresholds || []).join(', ') || 'none'})`
    });
  }

  const bNormPred = (bDec.control?.branchPredicates || []).map(normalizeThresholdExpr);
  const tNormPred = (tDec.control?.branchPredicates || []).map(normalizeThresholdExpr);
  const predDiff = arrayDiff(bNormPred, tNormPred);
  if (predDiff.changed && !threshDiff.changed) {
    changes.push({
      lens: 'Behavior & Heuristics',
      category: 'Branching Conditions',
      before: (bDec.control?.branchPredicates || []).join(' | ') || 'linear',
      after: (tDec.control?.branchPredicates || []).join(' | ') || 'linear',
      summary: `Control branch conditions changed (+${predDiff.added.length} / -${predDiff.removed.length})`
    });
  }
}

function diffOperationsAndTrustLens(bDec, tDec, changes) {
  if (arrayDiff(bDec.operational?.errorHandling || [], tDec.operational?.errorHandling || []).changed) {
    changes.push({
      lens: 'Operations & Trust',
      category: 'Error Policy',
      before: (bDec.operational?.errorHandling || []).join(', '),
      after: (tDec.operational?.errorHandling || []).join(', '),
      summary: `Error handling policy changed: ${(bDec.operational?.errorHandling || []).join(', ')} ➔ ${(tDec.operational?.errorHandling || []).join(', ')}`
    });
  }

  if (arrayDiff(bDec.operational?.sideEffects || [], tDec.operational?.sideEffects || []).changed) {
    changes.push({
      lens: 'Operations & Trust',
      category: 'I/O & Side Effects',
      before: (bDec.operational?.sideEffects || []).join(', '),
      after: (tDec.operational?.sideEffects || []).join(', '),
      summary: `Side-effect boundary changed: ${(bDec.operational?.sideEffects || []).join(', ')} ➔ ${(tDec.operational?.sideEffects || []).join(', ')}`
    });
  }

  if (arrayDiff(bDec.operational?.trustAndSanitization || [], tDec.operational?.trustAndSanitization || []).changed) {
    changes.push({
      lens: 'Operations & Trust',
      category: 'Trust & Sanitization',
      before: (bDec.operational?.trustAndSanitization || []).join(', ') || 'none',
      after: (tDec.operational?.trustAndSanitization || []).join(', ') || 'none',
      summary: `Input sanitization/validation calls changed`
    });
  }

  if (
    Boolean(bDec.operational?.isPure) !== Boolean(tDec.operational?.isPure) ||
    Boolean(bDec.operational?.deterministicSort) !== Boolean(tDec.operational?.deterministicSort)
  ) {
    changes.push({
      lens: 'Operations & Trust',
      category: 'Purity & Determinism',
      before: `pure:${Boolean(bDec.operational?.isPure)}, sorted:${Boolean(bDec.operational?.deterministicSort)}`,
      after: `pure:${Boolean(tDec.operational?.isPure)}, sorted:${Boolean(tDec.operational?.deterministicSort)}`,
      summary: `Determinism / purity guarantee changed`
    });
  }
}

/**
 * Compares two symbol records (baseSym vs targetSym) and returns a list of high-level decision changes.
 */
function diffSymbolDecisions(baseSym, targetSym) {
  const changes = [];
  const bDec = baseSym.decisions;
  const tDec = targetSym.decisions;

  if (baseSym.type === 'enum' && targetSym.type === 'enum') {
    const keyDiff = arrayDiff(baseSym.keys || [], targetSym.keys || []);
    if (keyDiff.changed) {
      changes.push({
        lens: 'Contract & Data',
        category: 'Enum / Schema Keys',
        before: (baseSym.keys || []).join(', '),
        after: (targetSym.keys || []).join(', '),
        summary: `State/Config keys changed (+[${keyDiff.added.join(', ')}] -[${keyDiff.removed.join(', ')}])`
      });
    }
    return changes;
  }

  if (baseSym.type === 'class' && targetSym.type === 'class') {
    if ((baseSym.extends || null) !== (targetSym.extends || null)) {
      changes.push({
        lens: 'Architecture & Structure',
        category: 'Class Hierarchy',
        before: baseSym.extends || 'none',
        after: targetSym.extends || 'none',
        summary: `Inheritance changed from '${baseSym.extends || 'none'}' to '${targetSym.extends || 'none'}'`
      });
    }
    return changes;
  }

  if (!bDec || !tDec) return changes;

  const bVis = bDec.contract?.visibility || 'internal';
  const tVis = tDec.contract?.visibility || 'internal';
  if (bVis !== tVis) {
    changes.push({
      lens: 'Architecture & Structure',
      category: 'Module Export Visibility',
      before: bVis,
      after: tVis,
      summary: `Visibility changed from '${bVis}' to '${tVis}'`
    });
  }

  diffContractAndDataLens(bDec, tDec, changes);
  diffBehaviorAndHeuristicsLens(bDec, tDec, changes);
  diffOperationsAndTrustLens(bDec, tDec, changes);

  return changes;
}

/**
 * Compares two parsed file AST results (before vs after) and returns file-level and symbol-level decision diffs.
 */
function diffFileASTDecisions(relFile, baseParsed, targetParsed) {
  const layer = getLayerForFile(relFile);
  const fileLevelDeltas = [];

  if (baseParsed && targetParsed) {
    const bFileDec = baseParsed.fileDecisions || {};
    const tFileDec = targetParsed.fileDecisions || {};

    const extDiff = arrayDiff(bFileDec.externalDependencies || [], tFileDec.externalDependencies || []);
    if (extDiff.changed) {
      fileLevelDeltas.push({
        lens: 'Architecture & Structure',
        category: 'External Supply Chain',
        before: (bFileDec.externalDependencies || []).join(', ') || 'none',
        after: (tFileDec.externalDependencies || []).join(', ') || 'none',
        summary: `External package dependencies changed (+[${extDiff.added.join(', ')}] -[${extDiff.removed.join(', ')}])`
      });
    }

    const expDiff = arrayDiff(bFileDec.exportedSymbols || [], tFileDec.exportedSymbols || []);
    if (expDiff.changed) {
      fileLevelDeltas.push({
        lens: 'Architecture & Structure',
        category: 'Exported Module Surface',
        before: (bFileDec.exportedSymbols || []).join(', ') || 'none',
        after: (tFileDec.exportedSymbols || []).join(', ') || 'none',
        summary: `Module exports changed (+[${expDiff.added.join(', ')}] -[${expDiff.removed.join(', ')}])`
      });
    }

    const bStateNames = (bFileDec.moduleState || []).map(s => `${s.name}(${s.kind})`);
    const tStateNames = (tFileDec.moduleState || []).map(s => `${s.name}(${s.kind})`);
    const stateDiff = arrayDiff(bStateNames, tStateNames);
    if (stateDiff.changed) {
      fileLevelDeltas.push({
        lens: 'Contract & Data',
        category: 'Module-Scope State / Singletons',
        before: bStateNames.join(', ') || 'stateless',
        after: tStateNames.join(', ') || 'stateless',
        summary: `Module-level state containers changed`
      });
    }
  }

  function flattenSymbols(parsed) {
    const map = new Map();
    if (!parsed || !parsed.symbols) return map;
    for (const f of parsed.symbols.functions || []) {
      map.set(f.name, { ...f, type: 'function', qualifiedName: f.name });
    }
    for (const e of parsed.symbols.enums || []) {
      map.set(e.name, { ...e, type: 'enum', qualifiedName: e.name });
    }
    for (const c of parsed.symbols.classes || []) {
      map.set(c.name, { ...c, type: 'class', qualifiedName: c.name });
      for (const m of c.methods || []) {
        const q = `${c.name}.${m.name}`;
        map.set(q, { ...m, type: 'method', qualifiedName: q });
      }
    }
    return map;
  }

  function buildCallsByCaller(parsed) {
    const map = new Map();
    if (!parsed || !parsed.rawCalls) return map;
    for (const c of parsed.rawCalls) {
      const shortCaller = c.callerSymbolId ? c.callerSymbolId.split('#').pop() : '';
      if (!map.has(shortCaller)) map.set(shortCaller, new Set());
      map.get(shortCaller).add(c.fullCallee || c.calleeName);
    }
    return map;
  }

  const baseMap = flattenSymbols(baseParsed);
  const targetMap = flattenSymbols(targetParsed);
  const baseCalls = buildCallsByCaller(baseParsed);
  const targetCalls = buildCallsByCaller(targetParsed);

  const addedSymbols = [];
  const removedSymbols = [];
  const modifiedSymbolDecisions = [];

  for (const [qName, tSym] of targetMap.entries()) {
    if (!baseMap.has(qName)) {
      addedSymbols.push({
        name: qName,
        type: tSym.type,
        file: relFile,
        layer,
        lines: `L${tSym.startLine}-L${tSym.endLine}`,
        archetype: tSym.decisions?.control?.archetype || tSym.type,
        decisions: tSym.decisions || null
      });
    } else {
      const bSym = baseMap.get(qName);
      const deltas = diffSymbolDecisions(bSym, tSym);

      // Check outbound call coupling changes for this symbol
      const bCalleeList = Array.from(baseCalls.get(qName) || []);
      const tCalleeList = Array.from(targetCalls.get(qName) || []);
      const callDiff = arrayDiff(bCalleeList, tCalleeList);
      if (callDiff.changed) {
        deltas.push({
          lens: 'Architecture & Structure',
          category: 'Outbound Call Coupling',
          before: bCalleeList.join(', ') || 'none',
          after: tCalleeList.join(', ') || 'none',
          summary: `Outbound calls changed (+[${callDiff.added.join(', ')}] -[${callDiff.removed.join(', ')}])`
        });
      }

      if (deltas.length > 0) {
        modifiedSymbolDecisions.push({
          name: qName,
          type: tSym.type,
          file: relFile,
          layer,
          lines: `L${tSym.startLine}-L${tSym.endLine}`,
          deltas
        });
      }
    }
  }

  for (const [qName, bSym] of baseMap.entries()) {
    if (!targetMap.has(qName)) {
      removedSymbols.push({
        name: qName,
        type: bSym.type,
        file: relFile,
        layer,
        lines: `L${bSym.startLine}-L${bSym.endLine}`
      });
    }
  }

  return {
    file: relFile,
    layer,
    fileLevelDeltas,
    addedSymbols,
    removedSymbols,
    modifiedSymbolDecisions
  };
}

/**
 * Loads a file's source code at a given git reference (e.g. 'HEAD'), returning null if the file is new.
 */
function getGitFileContent(gitRef, relFile, rootDir) {
  try {
    return execSync(`git show ${gitRef}:${relFile}`, {
      encoding: 'utf8',
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'ignore'],
      maxBuffer: 20 * 1024 * 1024
    });
  } catch {
    return null;
  }
}

/**
 * Computes a complete repository Decision Diff against a git reference for all modified files.
 */
function computeGitDecisionDiff(gitRef = 'HEAD', allFileResults = [], blastIndex = null, rootDir = process.cwd(), diffMap = new Map()) {
  const fileResultsByRel = new Map();
  for (const r of allFileResults) {
    const rel = path.relative(rootDir, r.filePath);
    fileResultsByRel.set(rel, r);
  }

  const touchedFiles = Array.from(diffMap.keys());
  const fileDiffs = [];
  const pureRefactorings = [];

  for (const relFile of touchedFiles) {
    const targetParsed = fileResultsByRel.get(relFile);
    if (!targetParsed) continue;

    const baseCode = getGitFileContent(gitRef, relFile, rootDir);
    const baseParsed = baseCode !== null ? parseFileAST(targetParsed.filePath, baseCode) : null;

    const fileDiff = diffFileASTDecisions(relFile, baseParsed, targetParsed);
    fileDiffs.push(fileDiff);

    // Identify symbols touched by line diff that had ZERO decision changes (Pure Refactoring)
    const decisionChangedNames = new Set([
      ...fileDiff.addedSymbols.map(s => s.name),
      ...fileDiff.modifiedSymbolDecisions.map(s => s.name)
    ]);

    const ranges = diffMap.get(relFile) || [];
    if (blastIndex && blastIndex.catalog) {
      for (const [, sym] of blastIndex.catalog.entries()) {
        if (sym.file !== relFile) continue;
        const qName = sym.parentClass ? `${sym.parentClass}.${sym.name}` : sym.name;
        const isLineTouched = ranges.some(([dStart, dEnd]) => Math.max(sym.startLine, dStart) <= Math.min(sym.endLine, dEnd));
        if (isLineTouched && !decisionChangedNames.has(qName)) {
          pureRefactorings.push({
            name: qName,
            type: sym.type,
            file: relFile,
            lines: `L${sym.startLine}-L${sym.endLine}`
          });
        }
      }
    }
  }

  return {
    gitRef,
    touchedFilesCount: touchedFiles.length,
    fileDiffs,
    pureRefactorings
  };
}

/**
 * Compares two full Graph IR objects (e.g. a saved baseline ast_graph.json vs current Graph IR)
 * and emits a Decision Diff report without requiring Git commits.
 */
function diffGraphSnapshots(baseGraph, targetGraph, label = 'Baseline Snapshot') {
  const baseNodes = new Map();
  for (const n of baseGraph?.nodes || []) {
    baseNodes.set(n.id, n);
  }
  const targetNodes = new Map();
  for (const n of targetGraph?.nodes || []) {
    targetNodes.set(n.id, n);
  }

  const baseEdgesBySource = new Map();
  for (const e of baseGraph?.edges || []) {
    if (!baseEdgesBySource.has(e.source)) baseEdgesBySource.set(e.source, new Set());
    baseEdgesBySource.get(e.source).add(e.target.split('#').pop());
  }
  const targetEdgesBySource = new Map();
  for (const e of targetGraph?.edges || []) {
    if (!targetEdgesBySource.has(e.source)) targetEdgesBySource.set(e.source, new Set());
    targetEdgesBySource.get(e.source).add(e.target.split('#').pop());
  }

  const byFile = new Map();
  function ensureFile(file, layer) {
    if (!byFile.has(file)) {
      byFile.set(file, {
        file,
        layer: layer || getLayerForFile(file),
        fileLevelDeltas: [],
        addedSymbols: [],
        removedSymbols: [],
        modifiedSymbolDecisions: []
      });
    }
    return byFile.get(file);
  }

  for (const [id, tNode] of targetNodes.entries()) {
    const fEntry = ensureFile(tNode.file, tNode.layer);
    if (!baseNodes.has(id)) {
      fEntry.addedSymbols.push({
        name: tNode.name,
        type: tNode.type,
        file: tNode.file,
        layer: tNode.layer,
        lines: `L${tNode.startLine}-L${tNode.endLine}`,
        archetype: tNode.decisions?.control?.archetype || tNode.type,
        decisions: tNode.decisions || null
      });
    } else {
      const bNode = baseNodes.get(id);
      const deltas = diffSymbolDecisions(bNode, tNode);

      // Compare outbound call edges
      const bCalls = Array.from(baseEdgesBySource.get(id) || []);
      const tCalls = Array.from(targetEdgesBySource.get(id) || []);
      const callDiff = arrayDiff(bCalls, tCalls);
      if (callDiff.changed) {
        deltas.push({
          lens: 'Architecture & Structure',
          category: 'Outbound Call Coupling',
          before: bCalls.join(', ') || 'none',
          after: tCalls.join(', ') || 'none',
          summary: `Outbound calls changed (+[${callDiff.added.join(', ')}] -[${callDiff.removed.join(', ')}])`
        });
      }

      if (deltas.length > 0) {
        fEntry.modifiedSymbolDecisions.push({
          name: tNode.name,
          type: tNode.type,
          file: tNode.file,
          layer: tNode.layer,
          lines: `L${tNode.startLine}-L${tNode.endLine}`,
          deltas
        });
      }
    }
  }

  for (const [id, bNode] of baseNodes.entries()) {
    if (!targetNodes.has(id)) {
      const fEntry = ensureFile(bNode.file, bNode.layer);
      fEntry.removedSymbols.push({
        name: bNode.name,
        type: bNode.type,
        file: bNode.file,
        layer: bNode.layer,
        lines: `L${bNode.startLine}-L${bNode.endLine}`
      });
    }
  }

  const fileDiffs = Array.from(byFile.values()).filter(
    f => f.fileLevelDeltas.length > 0 || f.addedSymbols.length > 0 || f.removedSymbols.length > 0 || f.modifiedSymbolDecisions.length > 0
  );

  return {
    gitRef: label,
    touchedFilesCount: fileDiffs.length,
    fileDiffs,
    pureRefactorings: []
  };
}

module.exports = {
  diffSymbolDecisions,
  diffFileASTDecisions,
  computeGitDecisionDiff,
  diffGraphSnapshots
};
