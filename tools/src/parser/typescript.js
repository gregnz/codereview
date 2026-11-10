const ts = require('typescript');
const { parseAngularTemplate } = require('./angular-template');

const DECISION_KINDS = new Set([
  ts.SyntaxKind.IfStatement, ts.SyntaxKind.ForStatement, ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement, ts.SyntaxKind.WhileStatement, ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.CatchClause, ts.SyntaxKind.ConditionalExpression, ts.SyntaxKind.CaseClause
]);
const NESTING_KINDS = new Set([
  ts.SyntaxKind.IfStatement, ts.SyntaxKind.ForStatement, ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement, ts.SyntaxKind.WhileStatement, ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.SwitchStatement, ts.SyntaxKind.CatchClause
]);

function sourceLine(sourceFile, position) {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

function getMetrics(body) {
  let cyclomaticComplexity = 1;
  let cognitiveComplexity = 0;
  let returnCount = 0;
  let nestingDepth = 0;

  function visit(node, nesting) {
    if (DECISION_KINDS.has(node.kind)) {
      cyclomaticComplexity++;
      cognitiveComplexity += 1 + nesting;
    }
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) {
      cyclomaticComplexity++;
      cognitiveComplexity++;
    }
    if (ts.isReturnStatement(node)) returnCount++;
    const nextNesting = nesting + (NESTING_KINDS.has(node.kind) ? 1 : 0);
    nestingDepth = Math.max(nestingDepth, nextNesting);
    ts.forEachChild(node, child => {
      if (!ts.isFunctionLike(child)) visit(child, nextNesting);
    });
  }

  if (body) visit(body, 0);
  return { cyclomaticComplexity, cognitiveComplexity, returnCount, nestingDepth };
}

function extractCalls(body, callerSymbolId, className, sourceFile, rawCalls, rawInstantiations) {
  if (!body) return;
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const member = ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee);
      const receiverNode = member ? callee.expression : null;
      const calleeName = ts.isPropertyAccessExpression(callee)
        ? callee.name.text
        : (ts.isElementAccessExpression(callee) ? callee.argumentExpression?.getText(sourceFile) : callee.getText(sourceFile));
      const isThis = receiverNode && receiverNode.kind === ts.SyntaxKind.ThisKeyword;
      const isSuper = receiverNode && receiverNode.kind === ts.SyntaxKind.SuperKeyword;
      const receiver = isThis ? className : (isSuper ? null : receiverNode?.getText(sourceFile) || null);
      rawCalls.push({
        callerSymbolId,
        callerLine: sourceLine(sourceFile, node.getStart(sourceFile)),
        calleeName,
        fullCallee: isThis ? `${className}.${calleeName}` : (isSuper ? calleeName : (receiver ? `${receiver}.${calleeName}` : calleeName)),
        receiver,
        isMember: Boolean(member),
        isThis: Boolean(isThis),
        isSuper: Boolean(isSuper)
      });
    } else if (ts.isNewExpression(node)) {
      rawInstantiations.push({ callerSymbolId, className: node.expression.getText(sourceFile), line: sourceLine(sourceFile, node.getStart(sourceFile)) });
    }
    ts.forEachChild(node, child => {
      if (!ts.isFunctionLike(child)) visit(child);
    });
  }
  visit(body);
}

function makeFunction(node, name, filePath, sourceFile, rawCalls, rawInstantiations, parentClass = null) {
  const body = node.body || null;
  const startLine = sourceLine(sourceFile, node.getStart(sourceFile));
  const endLine = sourceLine(sourceFile, node.end);
  const metrics = getMetrics(body);
  const id = parentClass ? `${filePath}#${parentClass}.${name}` : `${filePath}#${name}`;
  extractCalls(body, id, parentClass, sourceFile, rawCalls, rawInstantiations);
  return {
    id,
    name,
    ...(parentClass ? { parentClass } : {}),
    params: node.parameters ? `(${node.parameters.map(param => param.getText(sourceFile)).join(', ')})` : '()',
    paramCount: node.parameters ? node.parameters.length : 0,
    returnCount: metrics.returnCount,
    startLine,
    endLine,
    loc: endLine - startLine + 1,
    nestingDepth: metrics.nestingDepth,
    cyclomaticComplexity: metrics.cyclomaticComplexity,
    cognitiveComplexity: metrics.cognitiveComplexity,
    isMonolithic: endLine - startLine + 1 > (parentClass ? 100 : 150),
    isLifecycleHook: ['constructor', 'ngOnInit', 'ngOnDestroy', 'ngOnChanges', 'ngAfterViewInit'].includes(name),
    comment: null,
    static: node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword) || false,
    decisions: null
  };
}

function getAngularMetadata(classNode, sourceFile) {
  const decorators = ts.canHaveDecorators(classNode) ? ts.getDecorators(classNode) || [] : [];
  for (const decorator of decorators) {
    const expression = decorator.expression;
    if (!ts.isCallExpression(expression) || expression.expression.getText(sourceFile) !== 'Component') continue;
    const metadata = expression.arguments[0];
    if (!metadata || !ts.isObjectLiteralExpression(metadata)) continue;
    let templateUrl = null;
    let inlineTemplate = null;
    for (const property of metadata.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const key = property.name.getText(sourceFile).replace(/["']/g, '');
      if (key === 'templateUrl' && ts.isStringLiteralLike(property.initializer)) templateUrl = property.initializer.text;
      if (key === 'template' && (ts.isStringLiteralLike(property.initializer) || ts.isNoSubstitutionTemplateLiteral(property.initializer))) inlineTemplate = property.initializer.text;
    }
    return { templateUrl, inlineTemplate };
  }
  return null;
}

function parseTypeScriptFile(filePath, source) {
  const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);
  const result = {
    symbols: { enums: [], classes: [], functions: [] },
    fileDecisions: null,
    rawCalls: [],
    rawInstantiations: [],
    rawSignals: [],
    rawEnumAccesses: [],
    lineCount: source.split('\n').length
  };

  function visit(node) {
    if (ts.isEnumDeclaration(node)) {
      result.symbols.enums.push({ id: `${filePath}#${node.name.text}`, name: node.name.text, keys: node.members.map(member => member.name.getText(sourceFile)), startLine: sourceLine(sourceFile, node.getStart(sourceFile)), endLine: sourceLine(sourceFile, node.end), comment: null });
    } else if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      const base = node.heritageClauses?.find(clause => clause.token === ts.SyntaxKind.ExtendsKeyword)?.types[0]?.expression.getText(sourceFile) || null;
      const classNode = {
        id: `${filePath}#${className}`,
        name: className,
        extends: base,
        startLine: sourceLine(sourceFile, node.getStart(sourceFile)),
        endLine: sourceLine(sourceFile, node.end),
        loc: sourceLine(sourceFile, node.end) - sourceLine(sourceFile, node.getStart(sourceFile)) + 1,
        comment: null,
        visibility: node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) ? 'exported' : 'internal',
        fields: [],
        methods: []
      };
      for (const member of node.members) {
        if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) {
          const name = ts.isConstructorDeclaration(member) ? 'constructor' : member.name.getText(sourceFile);
          classNode.methods.push(makeFunction(member, name, filePath, sourceFile, result.rawCalls, result.rawInstantiations, className));
        }
      }
      result.symbols.classes.push(classNode);

      const angular = getAngularMetadata(node, sourceFile);
      if (angular) {
        result.angularComponent = { className, templateUrl: angular.templateUrl };
        if (angular.inlineTemplate) {
          const templateResult = parseAngularTemplate(filePath, angular.inlineTemplate, className);
          const template = templateResult.symbols.functions[0];
          if (template) {
            template.id = `${filePath}#${className}.<template>`;
            result.symbols.functions.push(template);
            for (const call of templateResult.rawCalls) {
              call.callerSymbolId = template.id;
              result.rawCalls.push(call);
            }
          }
        }
      }
    } else if (ts.isFunctionDeclaration(node) && node.name) {
      result.symbols.functions.push(makeFunction(node, node.name.text, filePath, sourceFile, result.rawCalls, result.rawInstantiations));
    } else if (ts.isVariableDeclaration(node) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) && ts.isIdentifier(node.name)) {
      result.symbols.functions.push(makeFunction(node.initializer, node.name.text, filePath, sourceFile, result.rawCalls, result.rawInstantiations));
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return result;
}

module.exports = { parseTypeScriptFile };