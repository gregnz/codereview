const fs = require('node:fs');
const path = require('node:path');
const { parseFileAST } = require('./javascript');
const { parseJavaFiles } = require('./java');
const { parseCSharpFiles } = require('./csharp');
const { parseTypeScriptFile } = require('./typescript');
const { parseAngularTemplate } = require('./angular-template');

function parseProjectFiles(files, rootDir) {
  const javaFiles = files.filter(file => path.extname(file).toLowerCase() === '.java');
  const javaResults = parseJavaFiles(javaFiles, file => path.relative(rootDir, file));
  const csharpFiles = files.filter(file => path.extname(file).toLowerCase() === '.cs');
  const csharpResults = parseCSharpFiles(csharpFiles, file => path.relative(rootDir, file));
  const angularComponents = new Map();

  const results = files.map(file => {
    const extension = path.extname(file).toLowerCase();
    if (extension === '.java') return { ...javaResults.get(path.resolve(file)), filePath: file };
    if (extension === '.cs') return { ...csharpResults.get(path.resolve(file)), filePath: file };
    const source = fs.readFileSync(file, 'utf8');
    if (['.ts', '.mts', '.cts', '.tsx'].includes(extension)) {
      const result = parseTypeScriptFile(file, source);
      if (result.angularComponent) {
        const templatePath = result.angularComponent.templateUrl
          ? path.resolve(path.dirname(file), result.angularComponent.templateUrl)
          : null;
        if (templatePath) angularComponents.set(templatePath, result.angularComponent.className);
      }
      return { filePath: file, ...result };
    }
    if (extension === '.html') return { filePath: file, ...parseAngularTemplate(file, source) };
    return { filePath: file, ...parseFileAST(file, source) };
  });

  for (const result of results) {
    const componentName = angularComponents.get(path.resolve(result.filePath));
    if (!componentName || path.extname(result.filePath).toLowerCase() !== '.html') continue;
    for (const call of result.rawCalls) {
      call.receiver = componentName;
      call.fullCallee = `${componentName}.${call.calleeName}`;
      call.isMember = true;
    }
  }

  return results;
}

module.exports = { parseProjectFiles };