const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const EXTRACTOR_PATH = path.join(__dirname, 'JavaAstExtractor.java');

function decode(value) {
  return Buffer.from(value, 'base64').toString('utf8');
}

function parseInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createFileResult(filePath, source) {
  return {
    filePath,
    symbols: { enums: [], classes: [], functions: [] },
    fileDecisions: null,
    rawCalls: [],
    rawInstantiations: [],
    rawSignals: [],
    rawEnumAccesses: [],
    lineCount: source.split('\n').length
  };
}

function parseJavaFiles(files, displayPathForFile) {
  if (files.length === 0) return new Map();

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codereview-java-'));
  const manifestPath = path.join(tempDir, 'sources.tsv');
  const results = new Map();
  const resultsByDisplayPath = new Map();
  const classes = new Map();
  const classMeta = new Map();

  try {
    const manifest = files.map(file => {
      const absolutePath = path.resolve(file);
      const displayPath = displayPathForFile(file).split(path.sep).join('/');
      const source = fs.readFileSync(absolutePath, 'utf8');
      const result = createFileResult(displayPath, source);
      results.set(absolutePath, result);
      resultsByDisplayPath.set(displayPath, result);
      return `${Buffer.from(absolutePath).toString('base64')}\t${Buffer.from(displayPath).toString('base64')}`;
    });
    fs.writeFileSync(manifestPath, manifest.join('\n'), 'utf8');

    const run = spawnSync('java', [EXTRACTOR_PATH, manifestPath], {
      encoding: 'utf8',
      maxBuffer: 128 * 1024 * 1024
    });
    if (run.error) {
      throw new Error(`Java analysis requires a Java 11+ JDK: ${run.error.message}`);
    }
    if (run.status !== 0) {
      throw new Error((run.stderr || `Java syntax-tree extractor exited ${run.status}`).trim());
    }

    for (const line of run.stdout.split(/\r?\n/)) {
      if (!line) continue;
      const parts = line.split('\t');
      const text = index => decode(parts[index] || '');
      const file = text(1);
      const result = resultsByDisplayPath.get(file);
      if (!result) continue;

      if (parts[0] === 'C' && parts.length === 9) {
        const name = text(3);
        const className = text(2);
        const id = `${file}#${className}`;
        const classNode = {
          id,
          name,
          extends: text(7) || null,
          startLine: parseInteger(parts[5]),
          endLine: parseInteger(parts[6]),
          loc: parseInteger(parts[6]) - parseInteger(parts[5]) + 1,
          comment: null,
          visibility: text(8).includes('PUBLIC') ? 'exported' : 'internal',
          fields: [],
          methods: []
        };
        result.symbols.classes.push(classNode);
        const key = `${file}\0${className}`;
        classes.set(key, classNode);
        classMeta.set(key, { className, extends: classNode.extends });
      } else if (parts[0] === 'F' && parts.length === 8) {
        const classNode = classes.get(`${file}\0${text(2)}`);
        if (classNode) {
          classNode.fields.push({
            name: text(3),
            type: text(4),
            isMutex: parts[6] === 'true',
            isMap: parts[7] === 'true',
            line: parseInteger(parts[5])
          });
        }
      } else if (parts[0] === 'M' && parts.length === 14) {
        const className = text(2);
        const key = `${file}\0${className}`;
        const classNode = classes.get(key);
        if (!classNode) continue;

        const name = text(3);
        const startLine = parseInteger(parts[4]);
        const endLine = parseInteger(parts[5]);
        const callerSymbolId = `${file}#${className}.${name}`;
        const calls = decode(parts[11]).split('\u001f').filter(Boolean);
        const instantiations = decode(parts[12]).split('\u001f').filter(Boolean);
        const lockOps = decode(parts[13]).split('\u001f').filter(Boolean);
        const method = {
          id: callerSymbolId,
          name,
          parentClass: className,
          params: text(6),
          paramCount: parseInteger(parts[7]),
          returnCount: parseInteger(parts[8]),
          startLine,
          endLine,
          loc: endLine - startLine + 1,
          nestingDepth: 0,
          cyclomaticComplexity: parseInteger(parts[9]),
          cognitiveComplexity: 0,
          isMonolithic: endLine - startLine + 1 > 100,
          isLifecycleHook: ['constructor', 'update', 'draw', 'render', 'destroy', 'init'].includes(name),
          comment: null,
          static: text(6).includes('STATIC'),
          synchronized: parts[10] === 'true',
          decisions: null
        };
        classNode.methods.push(method);

        for (const item of calls) {
          const [selector, lineNumber] = item.split('\u001e');
          const separator = selector.lastIndexOf('.');
          const receiver = separator < 0 ? null : selector.slice(0, separator);
          const calleeName = separator < 0 ? selector : selector.slice(separator + 1);
          const isThis = receiver === 'this';
          const isSuper = receiver === 'super';
          let fullCallee = selector;
          let resolvedReceiver = receiver;
          if (isThis) {
            fullCallee = `${className}.${calleeName}`;
            resolvedReceiver = className;
          } else if (isSuper && classMeta.get(key)?.extends) {
            fullCallee = `${classMeta.get(key).extends}.${calleeName}`;
            resolvedReceiver = classMeta.get(key).extends;
          }
          result.rawCalls.push({
            callerSymbolId,
            callerLine: parseInteger(lineNumber),
            calleeName,
            fullCallee,
            receiver: resolvedReceiver,
            isMember: separator >= 0,
            isThis,
            isSuper
          });
        }

        for (const item of instantiations) {
          const [className, lineNumber] = item.split('\u001e');
          result.rawInstantiations.push({ callerSymbolId, className, line: parseInteger(lineNumber) });
        }

        for (const item of lockOps) {
          const [receiver, operation, lineNumber] = item.split('\u001e');
          method.lockOperations ||= [];
          method.lockOperations.push({ receiver, operation, line: parseInteger(lineNumber) });
        }
      }
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  return results;
}

function parseJavaSource(filePath, source) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codereview-java-source-'));
  try {
    const sourcePath = path.join(tempDir, path.basename(filePath) || 'Source.java');
    fs.writeFileSync(sourcePath, source, 'utf8');
    return parseJavaFiles([sourcePath], () => path.basename(filePath) || 'Source.java').get(sourcePath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

module.exports = { parseJavaFiles, parseJavaSource };