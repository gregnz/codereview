const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createBlueprint() {
  const handlers = {};
  const root = {
    innerHTML: '',
    addEventListener: (type, handler) => { handlers[type] = handler; },
    querySelector: () => null
  };
  const script = fs.readFileSync(path.resolve(__dirname, '../journey-blueprint.js'), 'utf8');
  vm.runInNewContext(script, { document: { getElementById: () => root }, window: {}, URL, CSS: { escape: value => value } });
  async function load(id, name, data) {
    handlers.change({ target: { id, files: [{ name, text: async () => JSON.stringify(data) }] } });
    await new Promise(resolve => setImmediate(resolve));
  }
  function click(action, id) {
    const button = { dataset: { action, id } };
    handlers.click({ target: { closest: () => button } });
  }
  return { root, load, click };
}

test('Blueprint renders journey details as escaped text', async () => {
  const blueprint = createBlueprint();
  await blueprint.load('bp-manifest-file', 'journey.json', {
    journeys: [{ id: 'example', title: '<script>bad()</script>', steps: [{ id: 'step', title: 'Review', action: 'Submit', evidence: [] }] }]
  });
  assert.match(blueprint.root.innerHTML, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(blueprint.root.innerHTML, /<script>bad/);
  assert.match(blueprint.root.innerHTML, /Expected outcome/);
});

test('Blueprint rejects invalid input while retaining the loaded journey', async () => {
  const blueprint = createBlueprint();
  await blueprint.load('bp-manifest-file', 'good.json', {
    journeys: [{ id: 'example', title: 'Example journey', steps: [{ id: 'step', title: 'Review' }] }]
  });
  await blueprint.load('bp-manifest-file', 'bad.json', {
    journeys: [{ id: 'invalid', title: 'Broken', steps: [{ id: 'step', title: 'Review', evidence: 'invalid' }] }]
  });
  assert.match(blueprint.root.innerHTML, /Invalid journey manifest/);
  assert.match(blueprint.root.innerHTML, /Example journey/);
});

test('Blueprint renders comparison facts, missing repositories and unmapped changes', async () => {
  const blueprint = createBlueprint();
  await blueprint.load('bp-manifest-file', 'journey.json', {
    journeys: [{ id: 'example', title: 'Example journey', steps: [{ id: 'step', title: 'Review' }] }]
  });
  await blueprint.load('bp-comparison-file', 'comparison.json', {
    journeys: [{ id: 'example', title: 'Example journey', changes: [], steps: [{ id: 'step', title: 'Review', changes: [
      { kind: 'implementation', repo: 'web', path: 'screen.html', status: 'modified', facts: [
        { status: 'removed', category: 'interface', type: 'control', label: 'Run' },
        { status: 'added', category: 'interface', type: 'control', label: 'Start' }
      ] }
    ] }] }],
    architecture: [], unmapped: [{ repo: 'api', path: 'unknown.cs', status: 'added' }], uncomparedRepositories: ['worker']
  });
  assert.match(blueprint.root.innerHTML, /control: Run/);
  assert.match(blueprint.root.innerHTML, /control: Start/);
  assert.match(blueprint.root.innerHTML, /Repositories not compared: worker/);
  assert.match(blueprint.root.innerHTML, /api:unknown.cs/);
  assert.match(blueprint.root.innerHTML, /User impact unknown/);
});

test('Blueprint keeps keyboard focus when navigation reaches a boundary', async () => {
  const blueprint = createBlueprint();
  await blueprint.load('bp-manifest-file', 'journey.json', {
    journeys: [{ id: 'example', title: 'Journey', steps: [{ id: 'first', title: 'First' }, { id: 'last', title: 'Last' }] }]
  });
  let focused = '';
  blueprint.root.querySelector = selector => {
    if (selector === '[data-action="next"]') return { disabled: true };
    if (selector === '[data-action="previous"]:not(:disabled)') return { focus: () => { focused = 'previous'; } };
    return null;
  };
  blueprint.click('next');
  assert.equal(focused, 'previous');
  assert.match(blueprint.root.innerHTML, /Step 2 of 2/);
});

test('Blueprint shows comparison coverage even when the manifest has no journeys', async () => {
  const blueprint = createBlueprint();
  await blueprint.load('bp-manifest-file', 'empty.json', { journeys: [] });
  await blueprint.load('bp-comparison-file', 'comparison.json', {
    journeys: [{ id: 'removed', title: 'Removed journey', changes: [{ kind: 'removed' }], steps: [] }],
    architecture: [], unmapped: [{ repo: 'api', path: 'unknown.cs', status: 'modified' }], uncomparedRepositories: ['worker']
  });
  assert.match(blueprint.root.innerHTML, /Unmapped changes \(1\)/);
  assert.match(blueprint.root.innerHTML, /api:unknown.cs/);
  assert.match(blueprint.root.innerHTML, /Repositories not compared: worker/);
  assert.match(blueprint.root.innerHTML, /Removed journey/);
});