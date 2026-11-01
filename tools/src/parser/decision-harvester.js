/**
 * AST Decision Harvester
 *
 * Extracts the 4 high-level Decision Lenses from function/method/class/file AST nodes:
 * 1. Structural & Architectural Lens (external dependencies, exports, extensibility)
 * 2. Contract & Data Lens (signature contracts, return shapes, collections, state & mutation)
 * 3. Behavioral & Heuristic Lens (control archetype, guards, branch conditions, thresholds/weights, scaling cost)
 * 4. Operational & Trust Lens (error policy, I/O side effects, trust/sanitization, determinism)
 */

const BUILTIN_COLLECTIONS = new Set(['Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'RegExp', 'Array']);
const MUTATING_ARRAY_METHODS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill']);
const MUTATING_COLLECTION_METHODS = new Set(['set', 'add', 'delete', 'clear']);
const DECLARATIVE_PIPELINE_METHODS = new Set(['map', 'filter', 'reduce', 'some', 'every', 'find', 'flatMap', 'slice']);
const LOOP_NODE_TYPES = new Set(['for_statement', 'for_in_statement', 'for_of_statement', 'while_statement', 'do_statement']);

function extractObjectPatternKeys(objPatternNode) {
  const keys = [];
  for (const prop of objPatternNode.namedChildren) {
    if (prop.type === 'shorthand_property_identifier_pattern') {
      keys.push(prop.text);
      continue;
    }
    const keyField = prop.type === 'pair_pattern' ? 'key' : (prop.type === 'object_assignment_pattern' ? 'left' : null);
    const k = keyField ? prop.childForFieldName(keyField) : null;
    if (k) keys.push(k.text);
  }
  return keys;
}

function classifySingleParamNode(child) {
  if (child.type === 'identifier') {
    return { name: child.text, kind: 'positional', defaultValue: null, keys: [] };
  }
  if (child.type === 'object_pattern') {
    return { name: child.text, kind: 'options_bag', defaultValue: null, keys: extractObjectPatternKeys(child) };
  }
  if (child.type === 'rest_pattern') {
    return { name: child.text, kind: 'rest', defaultValue: null, keys: [] };
  }
  if (child.type === 'assignment_pattern') {
    const left = child.childForFieldName('left');
    const right = child.childForFieldName('right');
    const defVal = right ? right.text.trim() : null;
    const isOptionsBag = Boolean(left && left.type === 'object_pattern');
    return {
      name: left ? left.text : child.text,
      kind: isOptionsBag ? 'options_bag' : 'default_param',
      defaultValue: defVal,
      keys: isOptionsBag ? extractObjectPatternKeys(left) : []
    };
  }
  return null;
}

/**
 * Extracts structured parameter contracts (defaults, destructured option keys, rest params).
 */
function extractParamContracts(node) {
  const paramsNode = node.childForFieldName('parameters');
  if (!paramsNode) {
    const single = node.childForFieldName('parameter');
    return single ? [{ name: single.text, kind: 'positional', defaultValue: null, keys: [] }] : [];
  }
  return paramsNode.namedChildren.map(classifySingleParamNode).filter(Boolean);
}

function extractObjectLiteralKeys(exprNode) {
  const keys = [];
  for (const prop of exprNode.namedChildren) {
    if (prop.type === 'shorthand_property_identifier') {
      keys.push(prop.text);
    } else if (prop.type === 'pair') {
      const k = prop.childForFieldName('key');
      if (k) keys.push(k.text);
    }
  }
  return keys;
}

function classifyCallReturnShape(exprNode) {
  const fn = exprNode.childForFieldName('function');
  const fnText = fn ? fn.text : '';
  if (fnText === 'Boolean') return 'boolean';
  if (fnText === 'Number' || fnText === 'parseInt' || fnText === 'parseFloat' || fnText.startsWith('Math.')) {
    return 'number';
  }
  if (fnText === 'Array.from' || fnText.endsWith('.map') || fnText.endsWith('.filter') || fnText.endsWith('.slice') || fnText.endsWith('.sort')) {
    return 'Array';
  }
  if (fnText.endsWith('.join') || fnText.endsWith('.trim') || fnText.endsWith('.replace')) {
    return 'string';
  }
  return 'expression';
}

/**
 * Infers the return contract shape of a return_statement value expression.
 */
function classifyReturnExpression(exprNode) {
  if (!exprNode) return { shape: 'void', keys: [] };
  const t = exprNode.type;
  if (t === 'null') return { shape: 'null', keys: [] };
  if (t === 'true' || t === 'false') return { shape: 'boolean', keys: [] };
  if (t === 'number') return { shape: 'number', keys: [] };
  if (t === 'string' || t === 'template_string') return { shape: 'string', keys: [] };
  if (t === 'array') return { shape: 'Array', keys: [] };
  if (t === 'object') return { shape: 'Object', keys: extractObjectLiteralKeys(exprNode) };
  if (t === 'new_expression') {
    const ctor = exprNode.childForFieldName('constructor');
    return { shape: ctor ? ctor.text : 'Instance', keys: [] };
  }
  if (t === 'call_expression') {
    return { shape: classifyCallReturnShape(exprNode), keys: [] };
  }
  return { shape: 'expression', keys: [] };
}

/**
 * Extracts leading guard clauses at the start of a function block.
 */
function extractLeadingGuards(bodyNode) {
  if (!bodyNode || bodyNode.type !== 'statement_block') return [];
  const guards = [];

  for (let i = 0; i < Math.min(3, bodyNode.namedChildCount); i++) {
    const stmt = bodyNode.namedChild(i);
    if (stmt.type !== 'if_statement' || stmt.childForFieldName('alternative')) break;

    const cond = stmt.childForFieldName('condition');
    const cons = stmt.childForFieldName('consequence');
    const text = cons ? cons.text : '';
    if (!text.includes('return') && !text.includes('throw') && !text.includes('process.exit')) break;

    const cleanCond = cond ? cond.text.replace(/^\(|\)$/g, '').trim() : '';
    const action = text.includes('throw') ? 'throw' : (text.includes('process.exit') ? 'exit' : 'return');
    guards.push({ condition: cleanCond, action });
  }
  return guards;
}

function recordBinaryThreshold(curr, ctx) {
  const opNode = curr.children.find(c => ['>', '>=', '<', '<=', '===', '!=='].includes(c.text));
  if (!opNode) return;
  const left = curr.childForFieldName('left');
  const right = curr.childForFieldName('right');
  if (!left || !right || (right.type !== 'number' && left.type !== 'number')) return;

  const numText = right.type === 'number' ? right.text : left.text;
  const varText = right.type === 'number' ? left.text : right.text;
  if (!['0', '1', '-1', '2'].includes(numText) && ctx.thresholds.length < 8) {
    ctx.thresholds.push(`${varText} ${opNode.text} ${numText}`);
  }
}

function recordTryCatchPolicy(curr, ctx) {
  ctx.hasTryCatch = true;
  const handler = curr.childForFieldName('handler');
  if (!handler) return;
  const handlerText = handler.text;
  if (handlerText.includes('throw ')) ctx.errorActions.add('rethrows');
  else if (handlerText.includes('process.exit')) ctx.errorActions.add('exits_on_error');
  else if (handlerText.includes('return ')) ctx.errorActions.add('catches_with_fallback');
  else ctx.errorActions.add('swallows_error');
}

function recordAssignmentMutation(curr, ctx) {
  const left = curr.childForFieldName('left');
  if (!left || left.type !== 'member_expression') return;
  const obj = left.childForFieldName('object');
  const prop = left.childForFieldName('property');
  const objText = obj ? obj.text : '';
  const propText = prop ? prop.text : '';
  if (objText === 'this' && propText) {
    ctx.stateWrites.add(`this.${propText}`);
  } else if (objText && propText) {
    ctx.mutatesStateOrArgs = true;
    ctx.stateWrites.add(`${objText}.${propText}`);
  }
}

function recordMemberReadDecision(curr, ctx) {
  const obj = curr.childForFieldName('object');
  const prop = curr.childForFieldName('property');
  const objText = obj ? obj.text : '';
  const propText = prop ? prop.text : '';
  if (objText === 'this' && propText) {
    ctx.stateReads.add(`this.${propText}`);
  } else if (objText === 'process' && propText === 'env') {
    ctx.nonDeterministicCalls.add('process.env');
  } else if (ctx.paramNames.has(objText) && propText && ['options', 'opts', 'config', 'cli'].includes(objText)) {
    ctx.accessedOptionKeys.add(`${objText}.${propText}`);
  }
}

const FS_READ_PREFIXES = ['fs.read', 'fs.stat', 'fs.exists', 'fs.readdir'];
const FS_WRITE_PREFIXES = ['fs.write', 'fs.append', 'fs.mkdir', 'fs.unlink'];
const EXEC_CALLS = new Set(['execSync', 'spawn', 'exec']);

function classifySideEffectCall(fnText, ctx) {
  if (FS_READ_PREFIXES.some(p => fnText.startsWith(p))) {
    ctx.sideEffects.add('filesystem_read');
    return;
  }
  if (FS_WRITE_PREFIXES.some(p => fnText.startsWith(p))) {
    ctx.sideEffects.add('filesystem_write');
    ctx.mutatesStateOrArgs = true;
    return;
  }
  if (EXEC_CALLS.has(fnText) || fnText.startsWith('child_process.')) {
    ctx.sideEffects.add('process_exec');
    return;
  }
  if (fnText === 'process.exit') {
    ctx.sideEffects.add('process_exit');
    ctx.errorActions.add('exits_process');
    return;
  }
  if (fnText.startsWith('console.')) {
    ctx.sideEffects.add('console_io');
    return;
  }
  if (fnText.includes('Telemetry') || fnText.includes('logTelemetry')) {
    ctx.sideEffects.add('telemetry');
  }
}

function recordCallDecision(curr, ctx) {
  ctx.outboundCallCount++;
  const fn = curr.childForFieldName('function');
  if (!fn) return;
  const fnText = fn.text;

  if (fnText === ctx.symbolName || (ctx.enclosingClass && fnText === `this.${ctx.symbolName}`)) {
    ctx.hasRecursion = true;
  }

  classifySideEffectCall(fnText, ctx);

  if (fnText === 'Date.now' || fnText === 'Math.random' || fnText === 'process.cwd') {
    ctx.nonDeterministicCalls.add(`${fnText}()`);
  }
  if (fnText.includes('sanitize') || fnText.includes('validate') || fnText === 'path.resolve' || fnText === 'JSON.parse') {
    ctx.sanitizationCalls.add(fnText);
  }

  if (fn.type === 'member_expression') {
    const prop = fn.childForFieldName('property');
    const propName = prop ? prop.text : '';
    if (MUTATING_ARRAY_METHODS.has(propName)) {
      if (propName === 'sort') ctx.usesSortForDeterminism = true;
      else ctx.mutatesStateOrArgs = true;
    }
    if (MUTATING_COLLECTION_METHODS.has(propName)) ctx.mutatesStateOrArgs = true;
    if (DECLARATIVE_PIPELINE_METHODS.has(propName)) ctx.declarativeChainCount++;
  }
}

function recordNewExpressionDecision(curr, ctx) {
  const ctor = curr.childForFieldName('constructor');
  const ctorName = ctor ? ctor.text : '';
  if (BUILTIN_COLLECTIONS.has(ctorName)) ctx.collectionsUsed.add(ctorName);
  if (ctorName === 'Date') ctx.nonDeterministicCalls.add('new Date()');
  if (ctorName === 'RegExp') ctx.sanitizationCalls.add('new RegExp()');
}

const NODE_DECISION_HANDLERS = {
  switch_statement(curr, ctx) {
    ctx.hasSwitch = true;
    const val = curr.childForFieldName('value');
    if (val) ctx.branchPredicates.push(`switch(${val.text.trim()})`);
  },
  if_statement(curr, ctx) {
    const cond = curr.childForFieldName('condition');
    const clean = cond ? cond.text.replace(/^\(|\)$/g, '').trim() : '';
    if (clean && clean.length <= 80 && ctx.branchPredicates.length < 8) {
      ctx.branchPredicates.push(clean);
    }
  },
  binary_expression: recordBinaryThreshold,
  try_statement: recordTryCatchPolicy,
  throw_statement(curr, ctx) {
    ctx.hasThrow = true;
    ctx.errorActions.add('throws');
  },
  await_expression(curr, ctx) {
    ctx.hasAwait = true;
  },
  return_statement(curr, ctx) {
    const { shape, keys } = classifyReturnExpression(curr.namedChild(0));
    ctx.returnShapes.add(shape);
    for (const k of keys) ctx.returnObjectKeys.add(k);
  },
  new_expression: recordNewExpressionDecision,
  assignment_expression: recordAssignmentMutation,
  augmented_assignment_expression: recordAssignmentMutation,
  member_expression: recordMemberReadDecision,
  call_expression: recordCallDecision
};

function inspectDecisionNode(curr, ctx) {
  const handler = NODE_DECISION_HANDLERS[curr.type];
  if (handler) handler(curr, ctx);
}

function resolveControlArchetype(ctx, guards) {
  const hasBfsQueue = ctx.collectionsUsed.has('Set') && ctx.loopCount >= 1 && ctx.branchPredicates.some(p => p.includes('queue') || p.includes('visited'));
  if (ctx.hasSwitch || (ctx.branchPredicates.length >= 4 && ctx.outboundCallCount >= 4 && ctx.loopCount === 0)) return 'dispatcher';
  if (ctx.hasRecursion || hasBfsQueue) return 'graph_traversal';
  if (ctx.declarativeChainCount >= 2 && ctx.loopCount === 0) return 'declarative_pipeline';
  if (ctx.outboundCallCount >= 5 && ctx.loopCount <= 1 && ctx.branchPredicates.length <= 2) return 'orchestrator';
  if (ctx.loopCount >= 1 && (ctx.collectionsUsed.has('Map') || ctx.collectionsUsed.has('Set'))) return 'indexer_aggregator';
  if (guards.length >= 1 && ctx.returnShapes.has('boolean')) return 'validator_predicate';
  return 'transform';
}

function resolveScalingProfile(ctx) {
  if (ctx.maxLoopDepth >= 2) return `O(N^${ctx.maxLoopDepth}) nested-loops`;
  if (ctx.loopCount >= 1 && (ctx.collectionsUsed.has('Map') || ctx.collectionsUsed.has('Set'))) return 'O(N) indexed-lookup';
  if (ctx.loopCount >= 1 || ctx.declarativeChainCount >= 1) return 'O(N) single-pass';
  return 'O(1) / linear-pass';
}

function classifyArchetypeAndScaling(ctx, guards) {
  return {
    archetype: resolveControlArchetype(ctx, guards),
    scalingProfile: resolveScalingProfile(ctx)
  };
}

/**
 * Harvests all 4 Decision Lenses for a function or method body.
 */
function harvestFunctionDecisions(node, bodyNode, symbolName, enclosingClass = null) {
  const paramContracts = extractParamContracts(node);
  const guards = extractLeadingGuards(bodyNode);

  const ctx = {
    symbolName,
    enclosingClass,
    paramNames: new Set(paramContracts.map(p => p.name)),
    accessedOptionKeys: new Set(),
    collectionsUsed: new Set(),
    stateReads: new Set(),
    stateWrites: new Set(),
    returnShapes: new Set(),
    returnObjectKeys: new Set(),
    branchPredicates: [],
    thresholds: [],
    sideEffects: new Set(),
    errorActions: new Set(),
    nonDeterministicCalls: new Set(),
    sanitizationCalls: new Set(),
    hasSwitch: false,
    hasTryCatch: false,
    hasThrow: false,
    hasAwait: false,
    hasRecursion: false,
    loopCount: 0,
    maxLoopDepth: 0,
    declarativeChainCount: 0,
    mutatesStateOrArgs: false,
    usesSortForDeterminism: false,
    outboundCallCount: 0
  };

  function walk(curr, loopDepth) {
    if (!curr) return;
    if (curr !== bodyNode && ['function_declaration', 'function_expression', 'arrow_function'].includes(curr.type)) {
      return;
    }

    const isLoop = LOOP_NODE_TYPES.has(curr.type);
    const nextLoopDepth = isLoop ? loopDepth + 1 : loopDepth;
    if (isLoop) {
      ctx.loopCount++;
      if (nextLoopDepth > ctx.maxLoopDepth) ctx.maxLoopDepth = nextLoopDepth;
    }

    inspectDecisionNode(curr, ctx);

    for (const child of curr.namedChildren) {
      walk(child, nextLoopDepth);
    }
  }

  walk(bodyNode, 0);

  const { archetype, scalingProfile } = classifyArchetypeAndScaling(ctx, guards);
  const isPure = ctx.sideEffects.size === 0 && !ctx.mutatesStateOrArgs && ctx.stateWrites.size === 0 && ctx.nonDeterministicCalls.size === 0;

  return {
    contract: {
      params: paramContracts,
      accessedOptions: Array.from(ctx.accessedOptionKeys),
      guards,
      returns: {
        shapes: Array.from(ctx.returnShapes),
        objectKeys: Array.from(ctx.returnObjectKeys)
      }
    },
    data: {
      collections: Array.from(ctx.collectionsUsed),
      stateReads: Array.from(ctx.stateReads),
      stateWrites: Array.from(ctx.stateWrites),
      mutatesState: ctx.mutatesStateOrArgs
    },
    control: {
      archetype,
      executionMode: (node.text.startsWith('async ') || ctx.hasAwait) ? 'async' : 'sync',
      hasRecursion: ctx.hasRecursion,
      loopCount: ctx.loopCount,
      maxLoopDepth: ctx.maxLoopDepth,
      declarativeChainCount: ctx.declarativeChainCount,
      scalingProfile,
      branchPredicates: ctx.branchPredicates,
      thresholds: ctx.thresholds
    },
    operational: {
      isPure,
      deterministicSort: ctx.usesSortForDeterminism,
      nonDeterministicSources: Array.from(ctx.nonDeterministicCalls),
      errorHandling: ctx.errorActions.size > 0 ? Array.from(ctx.errorActions) : ['unhandled'],
      sideEffects: ctx.sideEffects.size > 0 ? Array.from(ctx.sideEffects) : ['pure'],
      trustAndSanitization: Array.from(ctx.sanitizationCalls)
    }
  };
}

function inspectTopLevelDeclarator(decl, isMutableBinding, fileCtx) {
  const nameNode = decl.childForFieldName('name');
  const valNode = decl.childForFieldName('value');
  if (!valNode) return;

  if (valNode.type === 'call_expression') {
    const fn = valNode.childForFieldName('function');
    const args = valNode.childForFieldName('arguments');
    if (fn && fn.text === 'require' && args && args.namedChildCount > 0) {
      const modName = args.namedChild(0).text.replace(/['"`]/g, '');
      if (modName.startsWith('.')) fileCtx.internalImports.add(modName);
      else fileCtx.externalDependencies.add(modName);
      return;
    }
  }

  if (!nameNode || nameNode.type !== 'identifier') return;
  const varName = nameNode.text;
  if (isMutableBinding) {
    fileCtx.moduleState.push({ name: varName, kind: 'mutable_singleton', initial: valNode.text.slice(0, 40) });
  } else if (valNode.type === 'new_expression') {
    const ctor = valNode.childForFieldName('constructor');
    if (ctor && BUILTIN_COLLECTIONS.has(ctor.text)) {
      fileCtx.moduleState.push({ name: varName, kind: `static_${ctor.text}`, initial: ctor.text });
    }
  } else if (valNode.type === 'array' && varName === varName.toUpperCase()) {
    fileCtx.moduleState.push({ name: varName, kind: 'rule_or_constant_list', count: valNode.namedChildCount });
  }
}

function inspectModuleExportsStatement(child, exportedSymbols) {
  const expr = child.namedChild(0);
  if (!expr || expr.type !== 'assignment_expression') return;
  const left = expr.childForFieldName('left');
  const right = expr.childForFieldName('right');
  if (!left || left.text !== 'module.exports' || !right) return;

  if (right.type === 'object') {
    for (const k of extractObjectLiteralKeys(right)) exportedSymbols.add(k);
  } else if (right.type === 'identifier') {
    exportedSymbols.add(right.text);
  }
}

/**
 * Harvests file-level structural decisions: module imports (external vs internal),
 * exported public surface (`module.exports`), and module-scope state/constants.
 */
function harvestFileDecisions(rootNode) {
  const fileCtx = {
    externalDependencies: new Set(),
    internalImports: new Set(),
    exportedSymbols: new Set(),
    moduleState: []
  };

  for (const child of rootNode.namedChildren) {
    if (child.type === 'lexical_declaration' || child.type === 'variable_declaration') {
      const isMutableBinding = child.text.startsWith('let ') || child.text.startsWith('var ');
      for (const decl of child.namedChildren) {
        if (decl.type === 'variable_declarator') {
          inspectTopLevelDeclarator(decl, isMutableBinding, fileCtx);
        }
      }
    } else if (child.type === 'expression_statement') {
      inspectModuleExportsStatement(child, fileCtx.exportedSymbols);
    }
  }

  return {
    externalDependencies: Array.from(fileCtx.externalDependencies),
    internalImports: Array.from(fileCtx.internalImports),
    exportedSymbols: Array.from(fileCtx.exportedSymbols),
    moduleState: fileCtx.moduleState
  };
}

module.exports = {
  harvestFunctionDecisions,
  harvestFileDecisions,
  extractParamContracts,
  extractLeadingGuards,
  classifyReturnExpression
};
