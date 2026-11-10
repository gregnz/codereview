const test = require('node:test');
const assert = require('node:assert/strict');
const { exportGraphIR } = require('../tools/src/exporters/graph-ir');

test('graph export avoids duplicate relationship arrays and bounds concept intersections', () => {
  const intersections = Array.from({ length: 10005 }, (_, index) => ({ id: index }));
  const symbol = {
    id: 'src/Example.java#Example.run',
    name: 'run',
    file: 'src/Example.java',
    type: 'method',
    parentClass: 'Example',
    cycleId: 2,
    cycleMembers: Array.from({ length: 50000 }, (_, index) => `member-${index}`)
  };
  const blastIndex = {
    catalog: new Map([[symbol.id, symbol]]),
    edges: [],
    inboundDirect: new Map([[symbol.id, new Map()]]),
    outboundDirect: new Map([[symbol.id, new Set()]]),
    getMultiHopBlast: () => new Map(),
    getPathsFromEntryPoints: () => [],
    getEntryPointType: () => null,
    cycles: [],
    layerViolations: [],
    classes: [],
    conceptMap: { catalog: new Map(), intersections }
  };

  const graph = exportGraphIR([], blastIndex, '/repo');
  const node = graph.nodes[0];

  assert.equal(node.cycleId, 2);
  assert.equal(node.cycleSize, 50000);
  assert.equal('cycleMembers' in node, false);
  assert.equal('callers' in node.blastRadius, false);
  assert.equal('outboundTargets' in node.blastRadius, false);
  assert.equal(graph.conceptIntersections.length, 10000);
  assert.equal(graph.metadata.totalConceptIntersections, 10005);
  assert.equal(graph.metadata.conceptIntersectionsTruncated, true);
});