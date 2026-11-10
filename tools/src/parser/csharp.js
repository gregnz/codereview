const path = require('node:path');
const fs = require('node:fs');
const Parser = require('tree-sitter');
const csharpPackageRoot = path.resolve(path.dirname(require.resolve('tree-sitter-c-sharp')), '../..');
const CSharp = require('node-gyp-build')(csharpPackageRoot);

const TYPE_DECLARATIONS = new Set(['class_declaration', 'struct_declaration', 'record_declaration', 'interface_declaration']);
const METHOD_DECLARATIONS = new Set(['method_declaration', 'constructor_declaration', 'destructor_declaration', 'operator_declaration', 'conversion_operator_declaration']);
const COMPLEXITY_NODES = new Set(['if_statement', 'for_statement', 'foreach_statement', 'while_statement', 'do_statement', 'catch_clause', 'conditional_expression', 'switch_section']);
const NESTING_NODES = new Set(['if_statement', 'for_statement', 'foreach_statement', 'while_statement', 'do_statement', 'switch_statement', 'catch_clause']);

function nodeName(node) {
  if (!node) return null;
  const name = node.childForFieldName('name');
  return name ? name.text : null;
}

function analyzeBody(body) {
  let cyclomaticComplexity = 1;
  let cognitiveComplexity = 0;
  let returnCount = 0;
  let nestingDepth = 0;

  function walk(node, nesting) {
    if (node !== body && METHOD_DECLARATIONS.has(node.type)) return;
    if (COMPLEXITY_NODES.has(node.type)) {
      cyclomaticComplexity++;
      cognitiveComplexity += 1 + nesting;
    }
    if (node.type === 'return_statement') returnCount++;
    const childNesting = nesting + (NESTING_NODES.has(node.type) ? 1 : 0);
    nestingDepth = Math.max(nestingDepth, childNesting);
    for (const child of node.namedChildren) walk(child, childNesting);
  }

  if (body) walk(body, 0);
  return { cyclomaticComplexity, cognitiveComplexity, returnCount, nestingDepth };
}

function makeMethod(node, className, filePath) {
  const name = nodeName(node) || node.type.replace('_declaration', '');
  const parameters = node.childForFieldName('parameters');
  const body = node.childForFieldName('body') || node.namedChildren.find(child => child.type === 'arrow_expression_clause') || null;
  const startLine = node.startPosition.row + 1;
  const endLine = node.endPosition.row + 1;
  const metrics = analyzeBody(body);
  return {
    id: `${filePath}#${className}.${name}`,
    name,
    parentClass: className,
    params: parameters ? parameters.text : '()',
    paramCount: parameters ? parameters.namedChildCount : 0,
    returnCount: metrics.returnCount,
    startLine,
    endLine,
    loc: endLine - startLine + 1,
    nestingDepth: metrics.nestingDepth,
    cyclomaticComplexity: metrics.cyclomaticComplexity,
    cognitiveComplexity: metrics.cognitiveComplexity,
    isMonolithic: endLine - startLine + 1 > 100,
    isLifecycleHook: ['constructor', 'Dispose', 'Initialize', 'Execute', 'Run'].includes(name),
    comment: null,
    static: node.text.startsWith('static '),
    decisions: null
  };
}

function parseCSharpSource(filePath, source) {
  const parser = new Parser();
  parser.setLanguage(CSharp);
  const tree = parser.parse(source);
  const result = {
    symbols: { enums: [], classes: [], functions: [] },
    fileDecisions: null,
    rawCalls: [],
    rawInstantiations: [],
    rawSignals: [],
    rawEnumAccesses: [],
    lineCount: source.split('\n').length
  };

  function addCalls(body, callerSymbolId, className) {
    if (!body) return;
    function walk(node) {
      if (node.type === 'invocation_expression') {
        const callee = node.childForFieldName('function') || node.namedChildren[0];
        if (callee) {
          const member = callee.type === 'member_access_expression';
          const memberName = member ? callee.childForFieldName('name') : null;
          const receiverNode = member ? callee.childForFieldName('expression') : null;
          const calleeName = memberName ? memberName.text : callee.text;
          const isThis = receiverNode && receiverNode.text === 'this';
          const isBase = receiverNode && receiverNode.text === 'base';
          const receiver = isThis ? className : (isBase ? null : receiverNode?.text || null);
          result.rawCalls.push({
            callerSymbolId,
            callerLine: node.startPosition.row + 1,
            calleeName,
            fullCallee: isThis ? `${className}.${calleeName}` : (isBase ? calleeName : (receiver ? `${receiver}.${calleeName}` : calleeName)),
            receiver,
            isMember: member,
            isThis: Boolean(isThis),
            isSuper: Boolean(isBase)
          });
        }
      } else if (node.type === 'object_creation_expression') {
        const type = node.childForFieldName('type') || node.namedChildren[0];
        if (type) result.rawInstantiations.push({ callerSymbolId, className: type.text, line: node.startPosition.row + 1 });
      }
      for (const child of node.namedChildren) walk(child);
    }
    walk(body);
  }

  function visit(node) {
    if (node.type === 'enum_declaration') {
      const name = nodeName(node);
      const body = node.childForFieldName('body');
      const keys = body ? body.namedChildren.filter(child => child.type === 'enum_member_declaration').map(child => nodeName(child) || child.namedChildren[0]?.text).filter(Boolean) : [];
      result.symbols.enums.push({ id: `${filePath}#${name}`, name, keys, startLine: node.startPosition.row + 1, endLine: node.endPosition.row + 1, comment: null });
    }

    if (TYPE_DECLARATIONS.has(node.type)) {
      const name = nodeName(node);
      if (name) {
        const baseList = node.namedChildren.find(child => child.type === 'base_list');
        const baseType = baseList?.namedChildren[0]?.text || null;
        const body = node.childForFieldName('body');
        const classNode = {
          id: `${filePath}#${name}`,
          name,
          extends: baseType,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          loc: node.endPosition.row - node.startPosition.row + 1,
          comment: null,
          visibility: node.text.startsWith('public ') ? 'exported' : 'internal',
          fields: [],
          methods: []
        };

        if (body) {
          for (const member of body.namedChildren) {
            if (!METHOD_DECLARATIONS.has(member.type)) continue;
            const method = makeMethod(member, name, filePath);
            classNode.methods.push(method);
            const methodBody = member.childForFieldName('body') || member.namedChildren.find(child => child.type === 'arrow_expression_clause');
            addCalls(methodBody, method.id, name);
          }
        }
        result.symbols.classes.push(classNode);
      }
    }

    for (const child of node.namedChildren) visit(child);
  }

  visit(tree.rootNode);
  return result;
}

function parseCSharpFiles(files, displayPathForFile) {
  return new Map(files.map(file => [
    path.resolve(file),
    parseCSharpSource(displayPathForFile(file), fs.readFileSync(file, 'utf8'))
  ]));
}

module.exports = { parseCSharpFiles, parseCSharpSource };