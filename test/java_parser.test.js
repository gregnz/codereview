const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { collectFiles, parseFileAST } = require('../tools/src/parser/javascript');
const { parseProjectFiles } = require('../tools/src/parser/project-parser');
const { buildBlastRadiusIndex } = require('../tools/src/graph/graph-builder');

const javaAvailable = spawnSync('java', ['-version'], { stdio: 'ignore' }).status === 0;

test('Java parser extracts class methods, call edges, constructors, and lock fields', { skip: !javaAvailable }, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codereview-java-test-'));
  try {
    const sourcePath = path.join(root, 'src', 'main', 'java', 'example', 'InventoryService.java');
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(sourcePath, [
      'package example;',
      'class InventoryService {',
      '  private final ReentrantLock lock = new ReentrantLock();',
      '  private final Repository repository = new Repository();',
      '  String checkout(String sku) {',
      '    new Repository();',
      '    lock.lock();',
      '    try { return repository.find(sku); }',
      '    finally { lock.unlock(); }',
      '  }',
      '}',
      'class Repository { String find(String sku) { return sku; } }'
    ].join('\n'));
    const vendorSource = path.join(root, 'C_ECRS_Core', 'src', 'eCRS-lib', 'ThirdParty.java');
    fs.mkdirSync(path.dirname(vendorSource), { recursive: true });
    fs.writeFileSync(vendorSource, 'class ThirdParty {}');

    const files = collectFiles(root);
    assert.deepEqual(files, [sourcePath]);
    const parsed = parseProjectFiles(files, root)[0];
    const singleFileParse = parseFileAST(sourcePath, fs.readFileSync(sourcePath, 'utf8'));
    assert.equal(parsed.filePath, sourcePath);
    assert.equal(singleFileParse.symbols.classes[0].name, 'InventoryService');
    const service = parsed.symbols.classes.find(symbol => symbol.name === 'InventoryService');
    const checkout = service.methods.find(method => method.name === 'checkout');

    assert.ok(service);
    assert.equal(service.fields[0].isMutex, true);
    assert.equal(checkout.paramCount, 1);
    assert.equal(parsed.rawCalls.some(call => call.calleeName === 'find' && call.receiver === 'repository'), true);
    assert.equal(parsed.rawInstantiations.some(item => item.className === 'Repository'), true);
    assert.equal(checkout.lockOperations.length, 2);

    const graph = buildBlastRadiusIndex([parsed], root);
    assert.equal(graph.edges.some(edge => edge.source === checkout.id && edge.target.endsWith('#Repository.find')), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});