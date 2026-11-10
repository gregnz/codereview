const path = require('node:path');
const { parseDocument } = require('htmlparser2');
const ts = require('typescript');
const Parser = require('tree-sitter');
const csharpRoot = path.resolve(path.dirname(require.resolve('tree-sitter-c-sharp')), '../..');
const CSharp = require('node-gyp-build')(csharpRoot);

function normalized(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function elementText(node) {
  if (node.type === 'text') return node.data;
  return (node.children || []).map(elementText).join(' ');
}

function htmlFacts(source) {
  const document = parseDocument(source, { lowerCaseAttributeNames: false, lowerCaseTags: false });
  const facts = [];
  function visit(node, inheritedConditions) {
    if (node.type !== 'tag') {
      for (const child of node.children || []) visit(child, inheritedConditions);
      return;
    }
    const attributes = node.attribs || {};
    const conditions = [...inheritedConditions];
    for (const name of ['*ngIf', '[hidden]', '[disabled]', '[attr.aria-disabled]']) {
      if (attributes[name]) conditions.push(`${name}=${normalized(attributes[name])}`);
    }
    const tag = node.name.toLowerCase();
    const isControl = ['button', 'input', 'select', 'textarea'].includes(tag) ||
      (tag === 'a' && (attributes.role === 'button' || attributes.routerLink));
    const isMessage = ['alert', 'app-message-alert'].includes(tag) || attributes.role === 'alert';
    const isHeading = /^h[1-6]$/.test(tag) || tag === 'app-page-heading';
    if (isControl || isMessage || isHeading) {
      const label = normalized(attributes['aria-label'] || attributes.headingText || attributes.placeholder || elementText(node)).slice(0, 200);
      const bindings = Object.entries(attributes).filter(([name]) => /^\(.*\)$/.test(name))
        .map(([name, value]) => `${name}=${normalized(value)}`).sort();
      facts.push({ category: 'interface', type: isControl ? 'control' : isMessage ? 'message' : 'heading',
        label: label || tag, conditions: conditions.sort(), bindings });
    }
    for (const child of node.children || []) visit(child, conditions);
  }
  visit(document, []);
  return facts;
}

function typeScriptFacts(filePath, source) {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  const facts = [];
  function visit(node, method = null) {
    const currentMethod = ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)
      ? node.name.getText(sourceFile) : method;
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      facts.push({ category: 'architecture', type: 'dependency', module: node.moduleSpecifier.text });
    }
    if (currentMethod && ts.isIfStatement(node)) {
      facts.push({ category: 'behavior', type: 'condition', context: currentMethod, expression: normalized(node.expression.getText(sourceFile)) });
    }
    if (currentMethod && ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(node.left) && node.left.expression.kind === ts.SyntaxKind.ThisKeyword &&
        (ts.isStringLiteralLike(node.right) || ts.isNumericLiteral(node.right) ||
          [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(node.right.kind))) {
      facts.push({ category: 'behavior', type: 'state', context: currentMethod,
        property: node.left.name.text, value: normalized(node.right.getText(sourceFile)) });
    }
    if (ts.isObjectLiteralExpression(node)) {
      const properties = new Map(node.properties.filter(ts.isPropertyAssignment)
        .map(property => [property.name.getText(sourceFile), property.initializer.getText(sourceFile)]));
      if (properties.has('path') && (properties.has('component') || properties.has('redirectTo') || properties.has('loadChildren'))) {
        const route = { category: 'navigation', type: 'route' };
        for (const name of ['path', 'component', 'redirectTo', 'loadChildren', 'canActivate']) {
          if (properties.has(name)) route[name] = normalized(properties.get(name));
        }
        facts.push(route);
      }
    }
    ts.forEachChild(node, child => visit(child, currentMethod));
  }
  visit(sourceFile);
  return facts;
}

function csharpFacts(source) {
  const parser = new Parser();
  parser.setLanguage(CSharp);
  const tree = parser.parse(source);
  const facts = [];
  function visit(node) {
    if (node.type === 'method_declaration' || node.type === 'class_declaration') {
      const name = node.childForFieldName('name')?.text;
      for (const list of node.namedChildren.filter(child => child.type === 'attribute_list')) {
        for (const attribute of list.namedChildren.filter(child => child.type === 'attribute')) {
          const attributeName = attribute.childForFieldName('name')?.text || attribute.namedChildren[0]?.text || '';
          if (/^(HttpGet|HttpPost|HttpPut|HttpDelete|HttpPatch|Route|Authorize|AllowAnonymous)(Attribute)?$/.test(attributeName)) {
            facts.push({ category: 'contract', type: 'endpoint attribute', owner: name, attribute: normalized(attribute.text) });
          }
        }
      }
    }
    for (const child of node.namedChildren) visit(child);
  }
  visit(tree.rootNode);
  return facts;
}

function extractJourneyFacts(filePath, source) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.html') return htmlFacts(source);
  if (['.ts', '.tsx', '.mts', '.cts'].includes(extension)) return typeScriptFacts(filePath, source);
  if (extension === '.cs') return csharpFacts(source);
  return [];
}

function compareJourneyFacts(filePath, before, after) {
  const oldFacts = new Map(extractJourneyFacts(filePath, before || '').map(fact => [JSON.stringify(fact), fact]));
  const newFacts = new Map(extractJourneyFacts(filePath, after || '').map(fact => [JSON.stringify(fact), fact]));
  return [
    ...[...oldFacts].filter(([key]) => !newFacts.has(key)).map(([, fact]) => ({ status: 'removed', ...fact })),
    ...[...newFacts].filter(([key]) => !oldFacts.has(key)).map(([, fact]) => ({ status: 'added', ...fact }))
  ];
}

module.exports = { extractJourneyFacts, compareJourneyFacts };