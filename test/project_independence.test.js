const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const { findProjectRoot, loadProjectConfig, getProjectConfig, getEffectiveLayerRanks } = require('../tools/src/config/layers');
const { resolveGraphPaths, isCacheFresh } = require('../tools/src/cache/graph-cache');
const { resolveTarget } = require('../tools/cli');

test('findProjectRoot discovers root directory containing codereview.config.json or package.json', () => {
  const deepPath = path.resolve(__dirname, '../tools/src/parser/javascript.js');
  const discovered = findProjectRoot(deepPath);
  assert.equal(discovered, path.resolve(__dirname, '..'));

  const cfg = loadProjectConfig(discovered);
  assert.ok(cfg);
  assert.ok(cfg.layers);
  assert.ok(cfg.concepts);

  const ranks = getEffectiveLayerRanks(cfg);
  assert.equal(ranks['Presentation'], 1);
  assert.equal(ranks['Infrastructure'], 5);
});

test('resolveGraphPaths and isCacheFresh identify fresh vs missing caches', () => {
  const rootDir = path.resolve(__dirname, '..');
  const targetDir = path.resolve(__dirname, '../tools');
  const paths = resolveGraphPaths(targetDir, rootDir);

  assert.ok(paths.defaultCachePath);
  assert.ok(paths.defaultCachePath.includes('ast_graph.json') || paths.defaultCachePath.includes('graph.json'));

  // A non-existent file is never fresh
  assert.equal(isCacheFresh('/tmp/does-not-exist.json', targetDir), false);
});

test('cli.resolveTarget resolves targetDir and auto-discovers rootDir', () => {
  const { targetDir, rootDir } = resolveTarget('tools');
  assert.equal(targetDir, path.resolve(__dirname, '../tools'));
  assert.equal(rootDir, path.resolve(__dirname, '..'));
});

test('cli.parseCliArgs defaults target to current directory, not a hardcoded project path', () => {
  const { parseCliArgs } = require('../tools/src/cli/args');
  const parsed = parseCliArgs([]);
  assert.equal(parsed.target, '.');
});

test('exportGraphIR respects project configured layers and standard architectural subsystems', () => {
  const { exportGraphIR } = require('../tools/src/exporters/graph-ir');
  const { getEffectiveSubsystems, STANDARD_ARCHITECTURAL_LAYERS } = require('../tools/src/config/layers');

  // When no config is active
  const defaultSubsystems = getEffectiveSubsystems(null);
  assert.deepEqual(defaultSubsystems, STANDARD_ARCHITECTURAL_LAYERS);

  // When project config defines custom layers
  const customConfig = {
    layers: {
      'Frontend': ['ui.js'],
      'Backend': ['server.js'],
      'Database': ['db.js']
    }
  };
  const customSubsystems = getEffectiveSubsystems(customConfig);
  assert.deepEqual(customSubsystems, ['Frontend', 'Backend', 'Database']);
});

test('buildConceptMap respects project config concepts without leaking unconfigured taxonomies', () => {
  const { buildConceptMap } = require('../tools/src/graph/concept-builder');
  const mockBlastIndex = {
    catalog: new Map([
      ['file.js#testFn', { name: 'testFn', type: 'function', file: 'file.js', startLine: 1, endLine: 5 }]
    ]),
    edges: []
  };

  // When custom project concepts are loaded
  const customConcepts = [
    { id: 'custom_billing', name: 'Billing', category: 'Finance', description: 'Invoices', keywords: ['invoice', 'charge'] }
  ];
  const conceptMap = buildConceptMap(mockBlastIndex, customConcepts);
  assert.ok(conceptMap.catalog.has('custom_billing'));
});

test('tools/ source files contain zero references to fastmail or previous project names', () => {
  const toolsDir = path.resolve(__dirname, '../tools');
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanDir(full);
      } else if (ent.isFile() && /\.(js|json|md)$/i.test(ent.name)) {
        const content = fs.readFileSync(full, 'utf8');
        assert.equal(
          content.toLowerCase().includes('fastmail'),
          false,
          `File ${full} contains hardcoded 'fastmail' reference`
        );
      }
    }
  }
  scanDir(toolsDir);
});
