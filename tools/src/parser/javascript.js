const fs = require('node:fs');
const path = require('node:path');
const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');

const {
  JS_BUILTINS,
  CANVAS_BUILTINS,
  DOM_BUILTINS,
  AUDIO_BUILTINS,
  LIFECYCLE_NAMES,
  getProjectConfig
} = require('../config/layers');

const {
  getLeadingComment,
  getMaxBlockDepth,
  getParamCount,
  getReturnCount
} = require('./ast-helpers');

const { getCyclomaticComplexity } = require('../metrics/cyclomatic');
const { getCognitiveComplexity } = require('../metrics/cognitive');
const { harvestFunctionDecisions, harvestFileDecisions } = require('./decision-harvester');

/**
 * Handles member and identifier call expressions, resolving receiver and bus signals.
 */
function handleCallExpression(node, callerSymbolId, enclosingClass, state) {
  const fnNode = node.childForFieldName('function');
  const argsNode = node.childForFieldName('arguments');
  const callLine = node.startPosition.row + 1;
  if (!fnNode) return;

  if (fnNode.type === 'identifier') {
    const name = fnNode.text;
    if (!JS_BUILTINS.has(name) && !CANVAS_BUILTINS.has(name)) {
      state.rawCalls.push({
        callerSymbolId,
        callerLine: callLine,
        calleeName: name,
        fullCallee: name,
        receiver: null,
        isMember: false,
        isThis: false
      });
    }
    return;
  }

  if (fnNode.type === 'member_expression') {
    const propNode = fnNode.childForFieldName('property');
    const objNode = fnNode.childForFieldName('object');
    const propName = propNode ? propNode.text : null;
    const objName = objNode ? objNode.text : '';

    if (
      !propName ||
      JS_BUILTINS.has(propName) ||
      CANVAS_BUILTINS.has(propName) ||
      DOM_BUILTINS.has(propName) ||
      AUDIO_BUILTINS.has(propName) ||
      ['Math', 'console', 'JSON', 'document', 'window', 'c', 'ctx'].includes(objName)
    ) {
      return;
    }

    const isThis = objName === 'this';
    const isSuper = objName === 'super';
    let resolvedFull = `${objName}.${propName}`;
    let resolvedReceiver = objName;

    if (isThis && enclosingClass) {
      resolvedFull = `${enclosingClass.name}.${propName}`;
      resolvedReceiver = enclosingClass.name;
    } else if (isSuper && enclosingClass && enclosingClass.extends) {
      resolvedFull = `${enclosingClass.extends}.${propName}`;
      resolvedReceiver = enclosingClass.extends;
    }

    // Event signal inspection: SignalBus.emit / on / connect
    if (objName.toLowerCase() === 'signalbus' && argsNode && argsNode.namedChildCount > 0) {
      const evName = argsNode.namedChild(0).text.replace(/['"`]/g, '');
      if (['emit', 'emitSignal'].includes(propName)) {
        state.rawSignals.push({
          type: 'emit',
          event: evName,
          callerSymbolId,
          line: callLine
        });
      } else if (['on', 'connect', 'once'].includes(propName)) {
        const handlerNode = argsNode.namedChildCount > 1 ? argsNode.namedChild(1) : null;
        state.rawSignals.push({
          type: 'listen',
          event: evName,
          handlerName: handlerNode ? handlerNode.text : '<inline>',
          callerSymbolId,
          line: callLine
        });
      }
    }

    state.rawCalls.push({
      callerSymbolId,
      callerLine: callLine,
      calleeName: propName,
      fullCallee: resolvedFull,
      receiver: resolvedReceiver,
      isMember: true,
      isThis,
      isSuper
    });
  }
}

/**
 * Handles class instantiation (new expression).
 */
function handleNewExpression(node, callerSymbolId, state) {
  const ctorNode = node.childForFieldName('constructor');
  if (!ctorNode) return;

  const className = ctorNode.text;
  const line = node.startPosition.row + 1;
  const ignored = ['Date', 'Set', 'Map', 'WeakMap', 'WeakSet', 'Promise', 'RegExp', 'Array', 'Object', 'Error'];
  if (!ignored.includes(className)) {
    state.rawInstantiations.push({
      callerSymbolId,
      className,
      line
    });
  }
}

/**
 * Handles enum or constant dictionary member reads.
 */
function handleEnumMemberExpression(node, callerSymbolId, state) {
  const objNode = node.childForFieldName('object');
  const propNode = node.childForFieldName('property');
  if (objNode && propNode && objNode.type === 'identifier') {
    const objText = objNode.text;
    const isEnumName = objText.endsWith('_STATES') ||
      objText.endsWith('_CONFIG') ||
      objText.endsWith('_TYPES') ||
      objText.endsWith('_STATUS') ||
      objText.endsWith('_ENUM') ||
      objText.endsWith('_OPTIONS') ||
      objText.endsWith('_RANKS') ||
      objText === 'CONFIG' ||
      objText === 'GALAXY_CONFIG' ||
      (/^[A-Z][A-Z0-9_]{2,}$/.test(objText) && !['MATH', 'JSON', 'CONSOLE', 'OBJECT', 'ARRAY', 'PROMISE', 'PROCESS', 'REFLECT', 'INTL'].includes(objText));

    if (isEnumName) {
      state.rawEnumAccesses.push({
        callerSymbolId,
        enumName: objText,
        keyName: propNode.text,
        line: node.startPosition.row + 1
      });
    }
  }
}

/**
 * Traverses a block body to collect outbound calls, instantiations, signals, and enum reads.
 */
function harvestNodeDetails(bodyNode, callerSymbolId, enclosingClass, state) {
  if (!bodyNode) return;

  function walk(node) {
    if (node.type === 'call_expression') {
      handleCallExpression(node, callerSymbolId, enclosingClass, state);
    } else if (node.type === 'new_expression') {
      handleNewExpression(node, callerSymbolId, state);
    } else if (node.type === 'member_expression') {
      handleEnumMemberExpression(node, callerSymbolId, state);
    }

    for (const child of node.namedChildren) {
      walk(child);
    }
  }

  walk(bodyNode);
}

/**
 * Parses a function declaration node.
 */
function parseFunctionDeclaration(node, filePath, sourceLines, harvestDetails) {
  const nameNode = node.childForFieldName('name');
  const paramsNode = node.childForFieldName('parameters');
  const name = nameNode ? nameNode.text : '<anonymous>';
  const params = paramsNode ? paramsNode.text : '()';
  const comment = getLeadingComment(node, sourceLines);
  const startLine = node.startPosition.row + 1;
  const endLine = node.endPosition.row + 1;
  const loc = endLine - startLine + 1;
  const body = node.childForFieldName('body');
  const nestingDepth = body ? getMaxBlockDepth(body) : 0;
  const paramCount = getParamCount(node);
  const returnCount = getReturnCount(body);
  const cyclomaticComplexity = getCyclomaticComplexity(body);
  const cognitiveComplexity = getCognitiveComplexity(body);
  const decisions = harvestFunctionDecisions(node, body, name, null);
  const fnId = `${filePath}#${name}`;

  const fnObj = {
    id: fnId,
    name,
    params,
    paramCount,
    returnCount,
    startLine,
    endLine,
    loc,
    nestingDepth,
    cyclomaticComplexity,
    cognitiveComplexity,
    isMonolithic: loc > 150,
    comment,
    async: node.text.startsWith('async '),
    decisions
  };

  harvestDetails(body, fnId);
  return fnObj;
}

/**
 * Parses a class declaration node and its methods.
 */
function parseClassDeclaration(node, filePath, sourceLines, harvestDetails) {
  const nameNode = node.childForFieldName('name');
  const heritageNode = node.children.find(c => c.type === 'class_heritage');
  const className = nameNode ? nameNode.text : '<anonymous>';
  const extendsName = heritageNode ? heritageNode.text.replace(/^extends\s+/, '') : null;
  const comment = getLeadingComment(node, sourceLines);
  const startLine = node.startPosition.row + 1;
  const endLine = node.endPosition.row + 1;

  const classObj = {
    id: `${filePath}#${className}`,
    name: className,
    extends: extendsName,
    startLine,
    endLine,
    loc: endLine - startLine + 1,
    comment,
    methods: []
  };

  const body = node.childForFieldName('body');
  if (body) {
    for (const child of body.namedChildren) {
      if (child.type === 'method_definition') {
        const mNameNode = child.childForFieldName('name');
        const mParamsNode = child.childForFieldName('parameters');
        const mName = mNameNode ? mNameNode.text : '<method>';
        const mParams = mParamsNode ? mParamsNode.text : '()';
        const mComment = getLeadingComment(child, sourceLines);
        const mStart = child.startPosition.row + 1;
        const mEnd = child.endPosition.row + 1;
        const mLoc = mEnd - mStart + 1;
        const mBody = child.childForFieldName('body');
        const mNesting = mBody ? getMaxBlockDepth(mBody) : 0;
        const mParamCount = getParamCount(child);
        const mReturnCount = getReturnCount(mBody);
        const mCyclomatic = getCyclomaticComplexity(mBody);
        const mCognitive = getCognitiveComplexity(mBody);
        const mDecisions = harvestFunctionDecisions(child, mBody, mName, classObj);
        const methodId = `${filePath}#${className}.${mName}`;

        const methodObj = {
          id: methodId,
          name: mName,
          parentClass: className,
          params: mParams,
          paramCount: mParamCount,
          returnCount: mReturnCount,
          startLine: mStart,
          endLine: mEnd,
          loc: mLoc,
          nestingDepth: mNesting,
          cyclomaticComplexity: mCyclomatic,
          cognitiveComplexity: mCognitive,
          isMonolithic: mLoc > 100,
          isLifecycleHook: LIFECYCLE_NAMES.has(mName),
          comment: mComment,
          static: child.text.startsWith('static '),
          decisions: mDecisions
        };

        classObj.methods.push(methodObj);
        harvestDetails(mBody, methodId, classObj);
      }
    }
  }

  return classObj;
}

/**
 * Parses variable declarations containing arrow functions, function expressions, or state enums.
 */
/**
 * Parses an arrow function or function expression assigned to a variable.
 */
function parseArrowOrFunctionExpression(node, varName, valueNode, filePath, sourceLines, harvestDetails) {
  const paramsNode = valueNode.childForFieldName('parameters');
  const params = paramsNode ? paramsNode.text : '()';
  const comment = getLeadingComment(node, sourceLines);
  const startLine = node.startPosition.row + 1;
  const endLine = node.endPosition.row + 1;
  const loc = endLine - startLine + 1;
  const body = valueNode.childForFieldName('body') || valueNode;
  const nestingDepth = body ? getMaxBlockDepth(body) : 0;
  const fnParamCount = getParamCount(valueNode);
  const fnReturnCount = getReturnCount(body);
  const fnCyclomatic = getCyclomaticComplexity(body);
  const fnCognitive = getCognitiveComplexity(body);
  const decisions = harvestFunctionDecisions(valueNode, body, varName, null);
  const fnId = `${filePath}#${varName}`;

  harvestDetails(body, fnId);

  return {
    id: fnId,
    name: varName,
    params,
    paramCount: fnParamCount,
    returnCount: fnReturnCount,
    startLine,
    endLine,
    loc,
    nestingDepth,
    cyclomaticComplexity: fnCyclomatic,
    cognitiveComplexity: fnCognitive,
    isMonolithic: loc > 150,
    comment,
    isExpression: true,
    decisions
  };
}

/**
 * Parses a constant object definition as a state enum or data table.
 */
function parseObjectEnum(node, varName, valueNode, filePath, sourceLines) {
  const keys = [];
  for (const prop of valueNode.namedChildren) {
    if (prop.type === 'pair' || prop.type === 'shorthand_property_identifier') {
      const keyNode = prop.childForFieldName('key') || prop;
      if (keyNode) keys.push(keyNode.text);
    }
  }

  if (keys.length === 0) return null;

  return {
    id: `${filePath}#${varName}`,
    name: varName,
    keys,
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
    comment: getLeadingComment(node, sourceLines)
  };
}

/**
 * Parses variable declarations containing arrow functions, function expressions, or state enums.
 */
function parseVariableDeclaration(node, filePath, sourceLines, harvestDetails, symbols) {
  for (const declarator of node.namedChildren) {
    if (declarator.type !== 'variable_declarator') continue;

    const nameNode = declarator.childForFieldName('name');
    const valueNode = declarator.childForFieldName('value');
    const varName = nameNode ? nameNode.text : null;
    if (!varName || !valueNode) continue;

    if (valueNode.type === 'arrow_function' || valueNode.type === 'function_expression') {
      const fn = parseArrowOrFunctionExpression(node, varName, valueNode, filePath, sourceLines, harvestDetails);
      symbols.functions.push(fn);
    } else if (valueNode.type === 'object') {
      const enumObj = parseObjectEnum(node, varName, valueNode, filePath, sourceLines);
      if (enumObj) symbols.enums.push(enumObj);
    }
  }
}

function extractScriptFromSvelte(sourceCode) {
  const match = sourceCode.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return sourceCode;

  // Replace lines before <script> with blank lines to preserve exact line numbering
  const prefix = sourceCode.slice(0, match.index);
  const leadingNewlines = prefix.split('\n').length - 1;
  const blanks = '\n'.repeat(leadingNewlines);
  return blanks + match[1];
}

/**
 * Parses JavaScript/TypeScript source code using Tree-Sitter to extract structured symbols,
 * complexity metrics, and direct interaction references.
 */
function parseFileAST(filePath, sourceCode) {
  const codeToParse = filePath.endsWith('.svelte') ? extractScriptFromSvelte(sourceCode) : sourceCode;
  const parser = new Parser();
  parser.setLanguage(JavaScript);
  const tree = parser.parse(codeToParse);
  const root = tree.rootNode;
  const sourceLines = codeToParse.split('\n');

  const symbols = {
    enums: [],
    classes: [],
    functions: []
  };

  const state = {
    rawCalls: [],
    rawInstantiations: [],
    rawSignals: [],
    rawEnumAccesses: []
  };

  const harvestDetails = (body, id, encClass = null) => harvestNodeDetails(body, id, encClass, state);

  function traverse(node) {
    if (node.type === 'function_declaration') {
      symbols.functions.push(parseFunctionDeclaration(node, filePath, sourceLines, harvestDetails));
      return;
    }

    if (node.type === 'class_declaration') {
      symbols.classes.push(parseClassDeclaration(node, filePath, sourceLines, harvestDetails));
      return;
    }

    if (node.type === 'lexical_declaration' || node.type === 'variable_declaration') {
      parseVariableDeclaration(node, filePath, sourceLines, harvestDetails, symbols);
      return;
    }

    for (const child of node.namedChildren) {
      traverse(child);
    }
  }

  traverse(root);
  const fileDecisions = harvestFileDecisions(root);
  const exportedSet = new Set(fileDecisions.exportedSymbols);
  for (const fn of symbols.functions) {
    if (fn.decisions && fn.decisions.contract) {
      fn.decisions.contract.visibility = exportedSet.has(fn.name) ? 'exported' : 'internal';
    }
  }
  for (const cls of symbols.classes) {
    cls.visibility = exportedSet.has(cls.name) ? 'exported' : 'internal';
    for (const m of cls.methods) {
      if (m.decisions && m.decisions.contract) {
        m.decisions.contract.visibility = exportedSet.has(cls.name) ? 'public_method' : 'internal_method';
      }
    }
  }

  return {
    symbols,
    fileDecisions,
    rawCalls: state.rawCalls,
    rawInstantiations: state.rawInstantiations,
    rawSignals: state.rawSignals,
    rawEnumAccesses: state.rawEnumAccesses,
    lineCount: sourceLines.length
  };
}

const DEFAULT_IGNORED_DIRS = new Set([
  'node_modules', '.git', '.codereview', 'dist', 'build', 'coverage', '.next', 'out', '.claude', 'vendor'
]);

const SUPPORTED_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx', '.svelte']);

function isIgnoredEntry(entryName, customIgnore) {
  if (entryName.startsWith('.')) return true;
  if (DEFAULT_IGNORED_DIRS.has(entryName)) return true;
  if (Array.isArray(customIgnore) && customIgnore.includes(entryName)) return true;
  return false;
}

/**
 * Recursively collects JavaScript source files from target directory.
 */
function collectFiles(targetPath) {
  try {
    const stat = fs.statSync(targetPath);
    if (stat.isFile()) return [targetPath];
  } catch (err) {
    return [];
  }

  const cfg = getProjectConfig();
  const customIgnore = cfg && Array.isArray(cfg.ignore) ? cfg.ignore : null;
  const results = [];
  let entries = [];
  try {
    entries = fs.readdirSync(targetPath, { withFileTypes: true });
  } catch (err) {
    return [];
  }

  for (const entry of entries) {
    if (isIgnoredEntry(entry.name, customIgnore)) continue;
    const fullPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath));
    } else if (entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }

  return results.sort();
}

module.exports = {
  parseFileAST,
  collectFiles,
  harvestNodeDetails,
  parseFunctionDeclaration,
  parseClassDeclaration,
  parseVariableDeclaration
};
