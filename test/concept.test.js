const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  stemWord,
  tokenizeIdentifier,
  tokenizeText,
  buildConceptMap,
  queryConcepts
} = require('../tools/src/graph/concept-builder');

const { parseFileAST } = require('../tools/src/parser/javascript');
const { buildBlastRadiusIndex } = require('../tools/src/graph/graph-builder');
const { runConceptCommand } = require('../tools/src/commands/concept');
const { runInspectCommand } = require('../tools/src/commands/inspect');

test('Concept Builder - Tokenization & Stemming', () => {
  assert.equal(stemWord('enemies'), 'enemy');
  assert.equal(stemWord('allies'), 'ally');
  assert.equal(stemWord('crashing'), 'crash');
  assert.equal(stemWord('avoidance'), 'avoid');
  assert.equal(stemWord('collisions'), 'collide');

  const tokens = tokenizeIdentifier('avoidFriendlyFire');
  assert.ok(tokens.includes('avoid'));
  assert.ok(tokens.includes('friendly'));
  assert.ok(tokens.includes('fire'));

  const constTokens = tokenizeIdentifier('SHIP_STATES');
  assert.ok(constTokens.includes('ship'));
  assert.ok(constTokens.includes('states') || constTokens.includes('state'));

  const textTokens = tokenizeText('The enemy ships often crash into friendly ships');
  assert.ok(textTokens.includes('enemy'));
  assert.ok(textTokens.includes('ship'));
  assert.ok(textTokens.includes('crash'));
  assert.ok(textTokens.includes('friendly'));
  assert.ok(!textTokens.includes('the'));
  assert.ok(!textTokens.includes('into'));
  assert.ok(!textTokens.includes('often'));
});

test('Concept Builder - Extracts concepts and detects cross-concept intersections', () => {
  const rootDir = path.resolve(__dirname, '..');
  const fixtureFiles = [
    path.resolve(__dirname, 'fixtures/Ship.js'),
    path.resolve(__dirname, 'fixtures/Simulation.js'),
    path.resolve(__dirname, 'fixtures/Weapons.js')
  ];

  const allFileResults = fixtureFiles.map(f => {
    const fs = require('node:fs');
    const code = fs.readFileSync(f, 'utf8');
    return { filePath: f, ...parseFileAST(f, code) };
  });

  const blastIndex = buildBlastRadiusIndex(allFileResults, rootDir);
  assert.ok(blastIndex.conceptMap);
  assert.ok(blastIndex.conceptMap.catalog.has('actor_entity'));
  assert.ok(blastIndex.conceptMap.catalog.has('weapons_combat'));

  const actorConcept = blastIndex.conceptMap.catalog.get('actor_entity');
  assert.ok(actorConcept.symbols.length > 0);
  assert.ok(actorConcept.governingEnums.length > 0);

  // Cross-concept call check: updateLasers (Weapons & Combat) -> takeDamage (Actors & Entities)
  assert.ok(blastIndex.conceptMap.intersections.length > 0);
});

test('Concept Builder - Resolves "enemy ships crash into friendly" with actionable diagnostics', () => {
  const rootDir = path.resolve(__dirname, '..');
  const fixtureFiles = [
    path.resolve(__dirname, 'fixtures/Ship.js'),
    path.resolve(__dirname, 'fixtures/Simulation.js'),
    path.resolve(__dirname, 'fixtures/Weapons.js')
  ];

  const allFileResults = fixtureFiles.map(f => {
    const fs = require('node:fs');
    const code = fs.readFileSync(f, 'utf8');
    return { filePath: f, ...parseFileAST(f, code) };
  });

  const blastIndex = buildBlastRadiusIndex(allFileResults, rootDir);
  const result = queryConcepts('The enemy ships often crash into friendly ships', blastIndex.conceptMap, blastIndex);

  assert.ok(result.matchedConcepts.some(c => c.conceptId === 'affiliation'));
  assert.ok(result.matchedConcepts.some(c => c.conceptId === 'collision_avoidance'));
  assert.ok(result.matchedConcepts.some(c => c.conceptId === 'actor_entity'));

  // Prioritized files must include Ship.js and Simulation.js
  assert.ok(result.prioritizedFiles.some(f => f.file.includes('Ship.js')));

  // Test runConceptCommand JSON output
  const cmdResult = runConceptCommand('enemy ships crash into friendly', blastIndex, { json: true });
  assert.equal(cmdResult.query, 'enemy ships crash into friendly');
  assert.ok(cmdResult.matchedConcepts.length >= 2);
});

test('Concept Builder - Integrates with runInspectCommand', () => {
  const graphData = {
    nodes: [
      { id: 'SteeringAI.separate', name: 'separate', type: 'method', file: 'src/ai/steering.js', startLine: 10, endLine: 30 },
      { id: 'FactionManager.isHostile', name: 'isHostile', type: 'method', file: 'src/sim/factions.js', startLine: 5, endLine: 15 }
    ],
    edges: [
      { source: 'SteeringAI.separate', target: 'FactionManager.isHostile', type: 'calls', line: 18 }
    ]
  };

  const inspectResult = runInspectCommand(graphData, {
    concept: 'enemy crash into friendly',
    json: true
  });

  assert.ok(inspectResult);
  assert.ok(inspectResult.matchedConcepts.some(c => c.conceptId === 'affiliation'));
  assert.ok(inspectResult.matchedConcepts.some(c => c.conceptId === 'collision_avoidance'));

  // Should detect the intersection: SteeringAI.separate -> FactionManager.isHostile
  assert.ok(inspectResult.relevantIntersections.length > 0);
  assert.equal(inspectResult.relevantIntersections[0].source.id, 'SteeringAI.separate');
  assert.equal(inspectResult.relevantIntersections[0].target.id, 'FactionManager.isHostile');
});

test('Concept Builder - Resolves mission controller, contract board, waypoint, and reward bugs with direct symbol matches and ranked files', () => {
  const graphData = {
    nodes: [
      { id: 'Asteroid.js#Asteroid.destroy', name: 'destroy', parentClass: 'Asteroid', type: 'method', file: 'poc_ai/js/Asteroid.js', startLine: 59, endLine: 84 },
      { id: 'MissionContracts.js#MissionContracts.generateBoardForPort', name: 'generateBoardForPort', parentClass: 'MissionContracts', type: 'method', file: 'poc_ai/js/MissionContracts.js', startLine: 59, endLine: 93 },
      { id: 'MissionContracts.js#MissionContracts.acceptContract', name: 'acceptContract', parentClass: 'MissionContracts', type: 'method', file: 'poc_ai/js/MissionContracts.js', startLine: 95, endLine: 160 },
      { id: 'MissionContracts.js#MissionContracts.completeContract', name: 'completeContract', parentClass: 'MissionContracts', type: 'method', file: 'poc_ai/js/MissionContracts.js', startLine: 350, endLine: 392 },
      { id: 'WaypointSystem.js#WaypointSystem.resolveWaypointTarget', name: 'resolveWaypointTarget', parentClass: 'WaypointSystem', type: 'method', file: 'poc_ai/js/WaypointSystem.js', startLine: 236, endLine: 290 },
      { id: 'CampaignManager.js#CampaignManager._spawnSortieObjectives', name: '_spawnSortieObjectives', parentClass: 'CampaignManager', type: 'method', file: 'poc_ai/js/CampaignManager.js', startLine: 318, endLine: 360 }
    ],
    edges: [
      { source: 'MissionContracts.js#MissionContracts.acceptContract', target: 'WaypointSystem.js#WaypointSystem.resolveWaypointTarget', type: 'calls', line: 116 }
    ]
  };

  const inspectResult = runInspectCommand(graphData, {
    concept: 'Mission controller Confed Combat Air Patrol 1 nav point no enemies carrier kills reward contract board',
    json: true
  });

  assert.ok(inspectResult.matchedConcepts.some(c => c.conceptId === 'workflow_missions'), 'Should match workflow_missions taxonomy');
  assert.ok(inspectResult.matchedConcepts.some(c => c.conceptId === 'navigation_routing'), 'Should match navigation_routing taxonomy');
  assert.ok(inspectResult.matchedConcepts.some(c => c.conceptId === 'economy_resources'), 'Should match economy_resources taxonomy');
  assert.ok(inspectResult.directSymbolMatches.length > 0, 'Should return direct symbol lexical matches');
  assert.equal(inspectResult.prioritizedFiles[0].file, 'poc_ai/js/MissionContracts.js', 'MissionContracts.js should rank #1 over alphabetical Asteroid.js');
});
