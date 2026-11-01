const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { sanitizeQuery, runQueryCommand } = require('../tools/src/commands/query');
const { getLayerDetails } = require('../tools/src/config/layers');
const { resolveTarget } = require('../tools/cli');

test('sanitizeQuery correctly extracts declaration prefixes and types', () => {
  const q1 = sanitizeQuery('class Ship');
  assert.strictEqual(q1.cleanQuery, 'Ship');
  assert.strictEqual(q1.typeFilter, 'class');

  const q2 = sanitizeQuery('function drawShip');
  assert.strictEqual(q2.cleanQuery, 'drawShip');
  assert.deepStrictEqual(q2.typeFilter, ['function', 'method']);

  const q3 = sanitizeQuery('enum SHIP_STATES');
  assert.strictEqual(q3.cleanQuery, 'SHIP_STATES');
  assert.strictEqual(q3.typeFilter, 'enum');

  const q4 = sanitizeQuery('ShipFactory|ShipRenderer');
  assert.strictEqual(q4.cleanQuery, 'ShipFactory|ShipRenderer');
  assert.strictEqual(q4.typeFilter, null);
});

test('getLayerDetails reports accurate source and layer names', () => {
  // Explicit custom config layer
  const customConfig = {
    layers: {
      'Entities & Physics': ['BioShip.js']
    }
  };
  const d1 = getLayerDetails('poc_ai/js/BioShip.js', customConfig);
  assert.strictEqual(d1.layer, 'Entities & Physics');
  assert.strictEqual(d1.source, 'config');

  // Directory heuristic
  const d2 = getLayerDetails('tools/src/commands/lint.js', null);
  assert.strictEqual(d2.layer, 'Application / Controllers');
  assert.strictEqual(d2.source, 'heuristic');

  // Fallback unclassified
  const d3 = getLayerDetails('unknown/path/CustomNewFile.js', { layers: {} });
  assert.strictEqual(d3.layer, 'Domain Logic');
  assert.strictEqual(d3.source, 'fallback_unclassified');
});

test('runQueryCommand formats compact results and supports JSON flag', () => {
  const mockCatalog = new Map([
    ['Ship.js#Ship', { name: 'Ship', type: 'class', file: 'poc_ai/js/Ship.js', startLine: 1, endLine: 50 }],
    ['Ship.js#Ship.draw', { name: 'draw', type: 'method', file: 'poc_ai/js/Ship.js', startLine: 10, endLine: 20 }]
  ]);

  const mockBlastIndex = {
    catalog: mockCatalog,
    inboundDirect: new Map(),
    outboundDirect: new Map(),
    edges: []
  };

  // JSON output
  const jsonMatches = runQueryCommand('Ship', mockBlastIndex, { json: true });
  assert.strictEqual(jsonMatches.length, 2);
  assert.strictEqual(jsonMatches[0].name, 'Ship');

  // Tolerates declaration syntax
  const classMatches = runQueryCommand('class Ship', mockBlastIndex, { json: true });
  assert.strictEqual(classMatches.length, 1);
  assert.strictEqual(classMatches[0].type, 'class');
});
