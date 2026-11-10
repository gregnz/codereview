const ts = require('typescript');

function getTemplateExpressions(source) {
  const expressions = [];
  const angularBinding = /(?:\[\([^\]]+\)\]|\([^)]+\)|\[[^\]]+\]|\*[\w-]+|bind-[\w-]+|on-[\w-]+)\s*=\s*(["'])(.*?)\1/g;
  const interpolation = /\{\{([\s\S]*?)\}\}/g;
  for (const match of source.matchAll(angularBinding)) expressions.push({ text: match[2], offset: match.index });
  for (const match of source.matchAll(interpolation)) expressions.push({ text: match[1], offset: match.index });
  return expressions;
}

function parseAngularTemplate(filePath, source, componentName = null) {
  const templateId = `${filePath}#<angular-template>`;
  const calls = [];
  for (const expression of getTemplateExpressions(source)) {
    const wrapped = `function __template__() { ${expression.text}; }`;
    const parsed = ts.createSourceFile('template.ts', wrapped, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const line = source.slice(0, expression.offset).split('\n').length;

    function visit(node) {
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        const member = ts.isPropertyAccessExpression(callee);
        const calleeName = member ? callee.name.text : callee.getText(parsed);
        calls.push({
          callerSymbolId: templateId,
          callerLine: line,
          calleeName,
          fullCallee: componentName ? `${componentName}.${calleeName}` : calleeName,
          receiver: componentName,
          isMember: Boolean(member || componentName),
          isThis: false,
          isSuper: false
        });
      }
      ts.forEachChild(node, visit);
    }
    visit(parsed);
  }

  const lineCount = source.split('\n').length;
  const functions = calls.length > 0 ? [{
    id: templateId,
    name: '<angular-template>',
    params: '()',
    paramCount: 0,
    returnCount: 0,
    startLine: 1,
    endLine: lineCount,
    loc: lineCount,
    nestingDepth: 0,
    cyclomaticComplexity: 1,
    cognitiveComplexity: 0,
    isMonolithic: false,
    comment: null,
    decisions: null
  }] : [];

  return {
    symbols: { enums: [], classes: [], functions },
    fileDecisions: null,
    rawCalls: calls,
    rawInstantiations: [],
    rawSignals: [],
    rawEnumAccesses: [],
    lineCount
  };
}

module.exports = { parseAngularTemplate };