const test = require('node:test');
const assert = require('node:assert');
const {
  getNodeMetrics,
  getClassMetrics,
  generateInspectionData,
  formatInspectionOutput
} = require('../tools/src/commands/inspect');

test('getNodeMetrics normalizes both flat and nested node schemas', () => {
  const flatNode = {
    id: 'test#foo',
    layer: 'Domain Logic',
    loc: 45,
    nestingDepth: 3,
    cyclomaticComplexity: 7,
    cognitiveComplexity: 12,
    riskScore: 25,
    riskCategory: 'HIGH',
    afferentCoupling: 4,
    efferentCoupling: 2,
    inCycle: false,
    layerViolationsCount: 1,
    blastRadius: {
      directCallers: 4,
      transitiveCallers: 8
    }
  };

  const m1 = getNodeMetrics(flatNode);
  assert.strictEqual(m1.cog, 12);
  assert.strictEqual(m1.cyc, 7);
  assert.strictEqual(m1.loc, 45);
  assert.strictEqual(m1.depth, 3);
  assert.strictEqual(m1.riskScore, 25);
  assert.strictEqual(m1.riskCategory, 'HIGH');
  assert.strictEqual(m1.directCallers, 4);
  assert.strictEqual(m1.transitiveCallers, 8);
  assert.strictEqual(m1.layerViolationsCount, 1);

  const nestedNode = {
    id: 'test#bar',
    layer: 'Presentation',
    metrics: {
      cognitive: 18,
      cyclomatic: 9,
      loc: 80,
      maxNesting: 4
    },
    blastRadius: {
      riskScore: 40,
      riskLevel: 'CRITICAL HOTSPOT',
      directCallers: 5,
      transitiveCallers: 12
    }
  };

  const m2 = getNodeMetrics(nestedNode);
  assert.strictEqual(m2.cog, 18);
  assert.strictEqual(m2.cyc, 9);
  assert.strictEqual(m2.loc, 80);
  assert.strictEqual(m2.depth, 4);
  assert.strictEqual(m2.riskScore, 40);
  assert.strictEqual(m2.riskCategory, 'CRITICAL HOTSPOT');
  assert.strictEqual(m2.directCallers, 5);
  assert.strictEqual(m2.transitiveCallers, 12);
});

test('getClassMetrics normalizes class metrics accurately', () => {
  const classNode = {
    id: 'Ship.js#Ship',
    type: 'class',
    loc: 500,
    classMetrics: {
      className: 'Ship',
      methodsCount: 15,
      wmcCyclomatic: 30,
      wmcCognitive: 45,
      cbo: 4,
      rfc: 19,
      dit: 1,
      noc: 2,
      wmcLoc: 480
    }
  };

  const cm = getClassMetrics(classNode);
  assert.strictEqual(cm.methods, 15);
  assert.strictEqual(cm.wmc, 75); // 30 + 45
  assert.strictEqual(cm.cbo, 4);
  assert.strictEqual(cm.rfc, 19);
  assert.strictEqual(cm.dit, 1);
  assert.strictEqual(cm.noc, 2);
  assert.strictEqual(cm.loc, 480);
});

test('generateInspectionData sorts and filters correctly', () => {
  const mockGraph = {
    metadata: { totalFiles: 2, totalSymbols: 3 },
    nodes: [
      { id: 'fn1', type: 'function', layer: 'Presentation', cognitiveComplexity: 5, riskScore: 10 },
      { id: 'fn2', type: 'function', layer: 'Domain Services', cognitiveComplexity: 25, riskScore: 50, inCycle: true },
      { id: 'fn3', type: 'function', layer: 'Presentation', cognitiveComplexity: 15, riskScore: 30 }
    ]
  };

  const report = generateInspectionData(mockGraph, { top: 2 });
  assert.strictEqual(report.topCognitive.length, 2);
  assert.strictEqual(report.topCognitive[0].node.id, 'fn2');
  assert.strictEqual(report.topCognitive[1].node.id, 'fn3');

  assert.strictEqual(report.topRisk.length, 2);
  assert.strictEqual(report.topRisk[0].node.id, 'fn2');
  assert.strictEqual(report.topRisk[1].node.id, 'fn3');

  assert.strictEqual(report.hotspots.length, 1);
  assert.strictEqual(report.hotspots[0].node.id, 'fn2'); // inCycle

  const formatted = formatInspectionOutput(report, { top: 2 });
  assert.ok(formatted.includes('Top 2 Cognitive Complexity'));
  assert.ok(formatted.includes('Top 2 Blast Radius Risk Score'));
  assert.ok(formatted.includes('fn2'));
});

test('generateInspectionData supports regex alternation in --query and outputs matchedSymbols with line ranges', () => {
  const mockGraph = {
    metadata: { totalFiles: 2, totalSymbols: 3 },
    nodes: [
      { id: 'MissionContracts.js#generateBoardForPort', name: 'generateBoardForPort', file: 'poc_ai/js/MissionContracts.js', type: 'method', layer: 'Simulation', startLine: 59, endLine: 93, cognitiveComplexity: 12, riskScore: 35, riskCategory: 'HIGH' },
      { id: 'WaypointSystem.js#resolveWaypointTarget', name: 'resolveWaypointTarget', file: 'poc_ai/js/WaypointSystem.js', type: 'method', layer: 'AI & Guidance', startLine: 236, endLine: 290, cognitiveComplexity: 18, riskScore: 42, riskCategory: 'HIGH' },
      { id: 'Asteroid.js#draw', name: 'draw', file: 'poc_ai/js/Asteroid.js', type: 'method', layer: 'Entities & Physics', startLine: 101, endLine: 164, cognitiveComplexity: 4, riskScore: 5, riskCategory: 'LOW' }
    ]
  };

  const report = generateInspectionData(mockGraph, { query: 'generateBoardForPort|resolveWaypointTarget' });
  assert.strictEqual(report.matchedSymbols.length, 2);
  const formatted = formatInspectionOutput(report, {});
  assert.ok(formatted.includes('Matched Symbols (2 found'));
  assert.ok(formatted.includes('L59-L93'));
  assert.ok(formatted.includes('L236-L290'));
});

test('generateInspectionData and formatInspectionOutput tolerate declaration keywords and provide suggestions', () => {
  const mockGraph = {
    metadata: { totalFiles: 2, totalSymbols: 2 },
    nodes: [
      { id: 'Ship.js#Ship', name: 'Ship', file: 'poc_ai/js/Ship.js', type: 'class', layer: 'Entities & Physics', startLine: 10, endLine: 50 },
      { id: 'Ship.js#Ship.draw', name: 'draw', file: 'poc_ai/js/Ship.js', type: 'method', layer: 'Entities & Physics', startLine: 20, endLine: 30 }
    ]
  };

  // Tolerates "class Ship"
  const report1 = generateInspectionData(mockGraph, { query: 'class Ship' });
  assert.strictEqual(report1.matchedSymbols.length, 1);
  assert.strictEqual(report1.matchedSymbols[0].node.name, 'Ship');
  assert.strictEqual(report1.matchedSymbols[0].node.type, 'class');

  // Tolerates "method draw"
  const report2 = generateInspectionData(mockGraph, { query: 'method draw' });
  assert.strictEqual(report2.matchedSymbols.length, 1);
  assert.strictEqual(report2.matchedSymbols[0].node.name, 'draw');

  // Friendly suggestions on 0 matches
  const reportZero = generateInspectionData(mockGraph, { query: 'MissingItem' });
  assert.strictEqual(reportZero.matchedSymbols.length, 0);
  const formattedZero = formatInspectionOutput(reportZero, { query: 'MissingItem' });
  assert.ok(formattedZero.includes('No symbols matched "MissingItem"'));
  assert.ok(formattedZero.includes('codereview concept "MissingItem"'));
});
