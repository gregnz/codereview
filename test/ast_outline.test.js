const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const {
  parseFileAST,
  buildBlastRadiusIndex,
  computeSymbolBlastSummary,
  exportGraphIR,
  generateMermaidDiagram,
  getLayerForFile,
  resolveCalleeTargets
} = require('../tools/ast-outline');

test('getLayerForFile classifies architectural layers correctly', () => {
  assert.strictEqual(getLayerForFile('poc_ai/js/UI.js'), 'Presentation');
  assert.strictEqual(getLayerForFile('poc_ai/js/Simulation.js'), 'Simulation');
  assert.strictEqual(getLayerForFile('poc_ai/js/Ship.js'), 'Entities & Physics');
  assert.strictEqual(getLayerForFile('poc_ai/js/Math2D.js'), 'Infrastructure');
  assert.strictEqual(getLayerForFile('poc_ai/js/CombatAI.js'), 'AI & Guidance');
  assert.strictEqual(getLayerForFile('poc_ai/js/StoryEngine.js'), 'Story & Narrative');
});

test('parseFileAST extracts classes, methods, this. resolution, nesting depth, and LOC', () => {
  const sampleCode = `
    const STATES = { IDLE: 'IDLE', ACTIVE: 'ACTIVE' };

    class Ship {
      constructor(id) {
        this.id = id;
      }

      takeDamage(amount) {
        if (amount > 0) {
          for (let i = 0; i < 2; i++) {
            if (this.id) {
              while (false) {}
            }
          }
        }
        this.destroy();
      }

      destroy() {
        SignalBus.emit('SHIP_DESTROYED', { id: this.id });
      }
    }

    function globalHelper() {
      const ship = new Ship(1);
      ship.takeDamage(10);
    }
  `;

  const parsed = parseFileAST('Ship.js', sampleCode);
  assert.strictEqual(parsed.symbols.enums.length, 1);
  assert.strictEqual(parsed.symbols.enums[0].name, 'STATES');
  assert.deepStrictEqual(parsed.symbols.enums[0].keys, ['IDLE', 'ACTIVE']);

  assert.strictEqual(parsed.symbols.classes.length, 1);
  const shipClass = parsed.symbols.classes[0];
  assert.strictEqual(shipClass.name, 'Ship');
  assert.strictEqual(shipClass.methods.length, 3);

  const takeDamageMethod = shipClass.methods.find(m => m.name === 'takeDamage');
  assert.ok(takeDamageMethod);
  assert.strictEqual(takeDamageMethod.nestingDepth, 4);

  // Verify complexity metrics on takeDamage
  assert.strictEqual(takeDamageMethod.paramCount, 1);
  assert.strictEqual(takeDamageMethod.returnCount, 0);
  assert.strictEqual(takeDamageMethod.cyclomaticComplexity, 5);
  assert.strictEqual(takeDamageMethod.cognitiveComplexity, 10);

  // Check this.destroy call resolution
  const destroyCall = parsed.rawCalls.find(c => c.calleeName === 'destroy');
  assert.ok(destroyCall);
  assert.strictEqual(destroyCall.isThis, true);
  assert.strictEqual(destroyCall.fullCallee, 'Ship.destroy');

  // Check instantiations
  const inst = parsed.rawInstantiations.find(i => i.className === 'Ship');
  assert.ok(inst);

  // Check signals
  const sig = parsed.rawSignals.find(s => s.type === 'emit');
  assert.ok(sig);
  assert.strictEqual(sig.event, 'SHIP_DESTROYED');
});

test('parseFileAST computes accurate cyclomatic, cognitive, arity, and return metrics across language constructs', () => {
  const code = `
    function evaluateTarget(target, threshold = 50, ...tags) {
      if (!target) return null;
      if (target.active && (target.shields > threshold || target.hull < 20)) {
        for (let i = 0; i < tags.length; i++) {
          if (tags[i] === 'PRIORITY') {
            return { action: 'ENGAGE_NOW', priority: i };
          }
        }
      } else if (target.disabled) {
        return { action: 'IGNORE' };
      } else {
        const mode = target.danger ? 'EVADE' : 'MONITOR';
        switch (mode) {
          case 'EVADE':
            return { action: 'FLEE' };
          default:
            break;
        }
      }
      return { action: 'DEFAULT' };
    }

    const inlineWorker = (x, y) => {
      const helper = () => { return 42; };
      return x + y;
    };
  `;

  const parsed = parseFileAST('test_eval.js', code);
  const evalFn = parsed.symbols.functions.find(f => f.name === 'evaluateTarget');
  assert.ok(evalFn);

  // Arity: target, threshold = 50, ...tags -> 3
  assert.strictEqual(evalFn.paramCount, 3);

  // Return points in evaluateTarget: 5 returns
  assert.strictEqual(evalFn.returnCount, 5);

  // Cyclomatic complexity
  assert.strictEqual(evalFn.cyclomaticComplexity, 10);

  // Cognitive complexity
  assert.strictEqual(evalFn.cognitiveComplexity, 15);

  // Arrow function with nested lambda
  const workerFn = parsed.symbols.functions.find(f => f.name === 'inlineWorker');
  assert.ok(workerFn);
  assert.strictEqual(workerFn.paramCount, 2);
  assert.strictEqual(workerFn.returnCount, 1);
});

test('buildBlastRadiusIndex builds multi-hop graph and computes risk scores', () => {
  const file1 = `
    class Engine {
      ignite() {
        this.spark();
      }
      spark() {
        return true;
      }
    }
  `;

  const file2 = `
    class Controller {
      start() {
        Engine.ignite();
      }
    }

    function mainLoop() {
      Controller.start();
    }
  `;

  const res1 = { filePath: '/fake/Engine.js', ...parseFileAST('/fake/Engine.js', file1) };
  const res2 = { filePath: '/fake/Controller.js', ...parseFileAST('/fake/Controller.js', file2) };

  const index = buildBlastRadiusIndex([res1, res2], '/fake');

  // spark is called by ignite (1 hop)
  // Controller.start calls Engine.ignite
  // mainLoop calls Controller.start
  const igniteId = '/fake/Engine.js#Engine.ignite';
  const sparkId = '/fake/Engine.js#Engine.spark';

  const igniteBr = computeSymbolBlastSummary(igniteId, index);
  assert.strictEqual(igniteBr.directCount, 1);
  assert.ok(igniteBr.transitiveCount >= 1);
  assert.strictEqual(igniteBr.cyclomaticComplexity, 1);
  assert.strictEqual(igniteBr.cognitiveComplexity, 0);

  // Export Graph IR verification
  const graph = exportGraphIR([res1, res2], index, '/fake');
  assert.ok(graph.nodes.length >= 4);
  assert.ok(graph.edges.length >= 2);

  const nodeWithComplexity = graph.nodes.find(n => n.id === igniteId);
  assert.ok(nodeWithComplexity);
  assert.strictEqual(typeof nodeWithComplexity.cyclomaticComplexity, 'number');
  assert.strictEqual(typeof nodeWithComplexity.cognitiveComplexity, 'number');
  assert.strictEqual(typeof nodeWithComplexity.paramCount, 'number');
  assert.strictEqual(typeof nodeWithComplexity.returnCount, 'number');

  // Mermaid diagram verification
  const mermaid = generateMermaidDiagram('Engine.ignite', index);
  assert.ok(mermaid.includes('flowchart LR'));
  assert.ok(mermaid.includes('calls'));
});

test('buildBlastRadiusIndex computes class metrics (CBO, WMC, DIT, NOC), cycles, and layer breaches', () => {
  const fileA = `
    class BaseEntity {
      move(dx, dy) {
        if (dx > 0) return dx;
        return dy;
      }
    }
  `;

  const fileB = `
    class Fighter extends BaseEntity {
      attack() {
        const hud = new HeadUpDisplay();
        hud.flash();
      }
    }
  `;

  const fileC = `
    class HeadUpDisplay {
      flash() {
        Fighter.attack();
      }
    }
  `;

  const resA = { filePath: 'poc_ai/js/Ship.js', ...parseFileAST('poc_ai/js/Ship.js', fileA) };
  const resB = { filePath: 'poc_ai/js/CapitalShip.js', ...parseFileAST('poc_ai/js/CapitalShip.js', fileB) };
  const resC = { filePath: 'poc_ai/js/UI.js', ...parseFileAST('poc_ai/js/UI.js', fileC) };

  const index = buildBlastRadiusIndex([resA, resB, resC], 'poc_ai/js');

  const baseSym = index.catalog.get('poc_ai/js/Ship.js#BaseEntity');
  const fighterSym = index.catalog.get('poc_ai/js/CapitalShip.js#Fighter');
  assert.ok(baseSym && baseSym.classMetrics);
  assert.ok(fighterSym && fighterSym.classMetrics);

  // Inheritance: BaseEntity has NOC = 1, DIT = 0; Fighter has DIT = 1, NOC = 0
  assert.strictEqual(baseSym.classMetrics.noc, 1);
  assert.strictEqual(baseSym.classMetrics.dit, 0);
  assert.strictEqual(fighterSym.classMetrics.dit, 1);

  // CBO: Fighter interacts with BaseEntity (extends) and HeadUpDisplay (instantiates + calls)
  assert.ok(fighterSym.classMetrics.cbo >= 2);

  // WMC: BaseEntity has move method (cyclomatic 2)
  assert.strictEqual(baseSym.classMetrics.wmcCyclomatic, 2);

  // Cycle detection: Fighter.attack <-> HeadUpDisplay.flash
  assert.ok(index.cycles.length >= 1);

  // Layer violation: CapitalShip.js (Entities & Physics, Rank 4) -> UI.js (Presentation, Rank 1)
  assert.ok(index.layerViolations.length >= 1);
  const breach = index.layerViolations.find(v => v.sourceFile.includes('CapitalShip.js') && v.targetFile.includes('UI.js'));
  assert.ok(breach);
});

test('computeSymbolBlastSummary computes multi-factor complexity multiplier and detailed breakdown', () => {
  const codeWorker = `
    function complexWorker(a, b, c, d, e) {
      if (!a) return 0;
      let total = 0;
      for (let i = 0; i < b; i++) {
        if (c > 10) {
          while (total < 50) {
            total += d;
          }
        } else {
          total += e;
        }
      }
      if (total > 100) return 100;
      if (total < 0) return -1;
      return total;
    }
  `;

  const codeCaller = `
    function execute() {
      complexWorker(1, 2, 3, 4, 5);
    }
  `;

  const res1 = { filePath: '/fake/worker.js', ...parseFileAST('/fake/worker.js', codeWorker) };
  const res2 = { filePath: '/fake/caller.js', ...parseFileAST('/fake/caller.js', codeCaller) };
  const index = buildBlastRadiusIndex([res1, res2], '/fake');

  const workerId = '/fake/worker.js#complexWorker';
  const br = computeSymbolBlastSummary(workerId, index);

  assert.strictEqual(br.directCount, 1);
  assert.strictEqual(br.paramCount, 5);
  assert.strictEqual(br.returnCount, 4);
  assert.ok(br.cyclomaticComplexity >= 5);
  assert.ok(br.cognitiveComplexity >= 6);

  // Breakdown inspection
  assert.ok(br.breakdown);
  assert.ok(br.breakdown.baseBlast > 0);
  assert.ok(br.breakdown.complexityMultiplier > 1.0);
  assert.strictEqual(br.breakdown.paramWeight, 0.2); // (5 - 3) * 0.10
  assert.strictEqual(br.breakdown.returnWeight, 0.05); // (4 - 3) * 0.05
  assert.ok(br.breakdown.cyclomaticWeight > 0);
  assert.ok(br.breakdown.cognitiveWeight > 0);
  assert.ok(br.breakdown.nestingWeight > 0);
  assert.strictEqual(br.breakdown.architecturalPenalty, 0);

  // Mathematical consistency
  const expectedScore = Math.round((br.breakdown.baseBlast * br.breakdown.complexityMultiplier) + br.breakdown.architecturalPenalty);
  assert.strictEqual(br.riskScore, expectedScore);
  assert.ok(['MEDIUM', 'HIGH', 'CRITICAL HOTSPOT'].includes(br.riskCategory));
});

test('computeSymbolBlastSummary classifies extreme cyclomatic complexity as CRITICAL HOTSPOT even with 0 callers', () => {
  // Construct a branch-dense function with 16 branches (v(G) >= 15) and 0 callers
  const complexCode = `
    function denseBranching(x) {
      if (x === 1) return 1;
      if (x === 2) return 2;
      if (x === 3) return 3;
      if (x === 4) return 4;
      if (x === 5) return 5;
      if (x === 6) return 6;
      if (x === 7) return 7;
      if (x === 8) return 8;
      if (x === 9) return 9;
      if (x === 10) return 10;
      if (x === 11) return 11;
      if (x === 12) return 12;
      if (x === 13) return 13;
      if (x === 14) return 14;
      if (x === 15) return 15;
      if (x === 16) return 16;
      return 0;
    }
  `;

  const res = { filePath: '/fake/dense.js', ...parseFileAST('/fake/dense.js', complexCode) };
  const index = buildBlastRadiusIndex([res], '/fake');

  const id = '/fake/dense.js#denseBranching';
  const br = computeSymbolBlastSummary(id, index);

  assert.strictEqual(br.directCount, 0);
  assert.ok(br.cyclomaticComplexity >= 15);
  assert.strictEqual(br.riskCategory, 'CRITICAL HOTSPOT');
  assert.ok(br.breakdown.cyclomaticWeight >= 0.7);
});

test('computeSymbolBlastSummary applies architectural penalties for cycles and layer breaches', () => {
  // poc_ai/js/Ship.js is Entities & Physics (Rank 4)
  // poc_ai/js/UI.js is Presentation (Rank 1)
  const codeShip = `
    class SpaceVessel {
      updateHealth() {
        UIBridge.showAlert();
      }
    }
  `;

  const codeUI = `
    class UIBridge {
      showAlert() {
        SpaceVessel.updateHealth();
      }
    }
  `;

  const resShip = { filePath: 'poc_ai/js/Ship.js', ...parseFileAST('poc_ai/js/Ship.js', codeShip) };
  const resUI = { filePath: 'poc_ai/js/UI.js', ...parseFileAST('poc_ai/js/UI.js', codeUI) };
  const index = buildBlastRadiusIndex([resShip, resUI], 'poc_ai/js');

  const shipUpdateId = 'poc_ai/js/Ship.js#SpaceVessel.updateHealth';
  const br = computeSymbolBlastSummary(shipUpdateId, index);

  assert.strictEqual(br.inCycle, true);
  assert.ok(br.layerViolationsCount >= 1);
  assert.strictEqual(br.breakdown.cyclePenalty, 15);
  assert.ok(br.breakdown.layerPenalty >= 10);
  assert.ok(br.breakdown.architecturalPenalty >= 25);

  // Both inCycle and layerViolationsCount > 0 triggers CRITICAL HOTSPOT
  assert.strictEqual(br.riskCategory, 'CRITICAL HOTSPOT');

  // Verify Graph IR export includes breakdown and risk fields
  const graph = exportGraphIR([resShip, resUI], index, 'poc_ai/js');
  const node = graph.nodes.find(n => n.id === shipUpdateId);
  assert.ok(node);
  assert.strictEqual(node.riskScore, br.riskScore);
  assert.strictEqual(node.riskCategory, 'CRITICAL HOTSPOT');
  assert.ok(node.blastRadius.breakdown);
  assert.strictEqual(node.blastRadius.breakdown.cyclePenalty, 15);
});

test('resolveCalleeTargets resolves direct and normalized class receivers without ambiguous fan-out', () => {
  const codeShip = `
    class Ship {
      takeDamage(amount) {
        return amount;
      }
    }
  `;
  const codeAsteroid = `
    class Asteroid {
      takeDamage(amount) {
        return amount;
      }
    }
  `;
  const codeMine = `
    class Mine {
      takeDamage(amount) {
        return amount;
      }
    }
  `;
  const codeSim = `
    function _resolveCollisions() {
      // 1. Normalized / prefix receiver matches: ship -> Ship, ast -> Asteroid
      ship.takeDamage(20);
      ast.takeDamage(30);

      // 2. Untyped / ambiguous variables on overloaded method: must NOT fan out
      sA.takeDamage(50);
      unknownObj.takeDamage(10);
    }
  `;

  const resShip = { filePath: 'poc_ai/js/Ship.js', ...parseFileAST('poc_ai/js/Ship.js', codeShip) };
  const resAsteroid = { filePath: 'poc_ai/js/Asteroid.js', ...parseFileAST('poc_ai/js/Asteroid.js', codeAsteroid) };
  const resMine = { filePath: 'poc_ai/js/Mine.js', ...parseFileAST('poc_ai/js/Mine.js', codeMine) };
  const resSim = { filePath: 'poc_ai/js/Simulation.js', ...parseFileAST('poc_ai/js/Simulation.js', codeSim) };

  const index = buildBlastRadiusIndex([resShip, resAsteroid, resMine, resSim], 'poc_ai/js');

  const shipDmgId = 'poc_ai/js/Ship.js#Ship.takeDamage';
  const astDmgId = 'poc_ai/js/Asteroid.js#Asteroid.takeDamage';
  const mineDmgId = 'poc_ai/js/Mine.js#Mine.takeDamage';
  const collId = 'poc_ai/js/Simulation.js#_resolveCollisions';

  const graph = exportGraphIR([resShip, resAsteroid, resMine, resSim], index, 'poc_ai/js');
  const calls = graph.edges.filter(e => e.source === collId && e.type === 'calls');

  // ship.takeDamage resolves to Ship.takeDamage
  assert.ok(calls.some(e => e.target === shipDmgId));

  // ast.takeDamage resolves to Asteroid.takeDamage via prefix match
  assert.ok(calls.some(e => e.target === astDmgId));

  // Mine.takeDamage was never referenced
  assert.ok(!calls.some(e => e.target === mineDmgId));

  // sA and unknownObj did NOT fan out to any candidate (total calls is exactly 2: ship and ast)
  assert.strictEqual(calls.length, 2);
});
