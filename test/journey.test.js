const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { compareJourneySnapshots } = require('../tools/src/graph/journey');
const { repositoryChanges, readManifest } = require('../tools/src/commands/journey');
const { compareJourneyFacts } = require('../tools/src/parser/journey-facts');

test('journey comparison groups evidence changes without claiming behavior changed', () => {
  const manifest = {
    journeys: [{ id: 'calculate', title: 'Run calculation', goal: 'Calculate risk', steps: [
      { id: 'run', title: 'Run', action: 'Start calculation', expected: 'Progress is shown', evidence: [{ repo: 'web', path: 'screen.html' }] }
    ] }],
    components: [{ id: 'api', title: 'Calculation API', responsibility: 'Accept requests', evidence: [{ repo: 'api', path: 'controller.cs' }] }]
  };
  const before = { manifest, files: [
    { repo: 'web', path: 'screen.html', hash: 'old' },
    { repo: 'api', path: 'controller.cs', hash: 'same' },
    { repo: 'web', path: 'other.ts', hash: 'old' }
  ] };
  const after = { manifest, files: [
    { repo: 'web', path: 'screen.html', hash: 'new' },
    { repo: 'api', path: 'controller.cs', hash: 'new' },
    { repo: 'web', path: 'other.ts', hash: 'new' }
  ] };
  const result = compareJourneySnapshots(before, after);
  assert.deepEqual(result.journeys[0].steps[0].changes, [
    { kind: 'implementation', repo: 'web', path: 'screen.html', status: 'modified', effect: 'unknown' }
  ]);
  assert.equal(result.architecture[0].changes[0].effect, 'unknown');
  assert.deepEqual(result.unmapped, [{ repo: 'web', path: 'other.ts', status: 'modified' }]);
  assert.equal(result.rationale, null);
});

test('journey comparison reports described changes, additions, removals and order', () => {
  const before = { manifest: { journeys: [{ id: 'flow', title: 'Flow', steps: [
    { id: 'first', title: 'First', expected: 'Old' }, { id: 'second', title: 'Second' }
  ] }] }, files: [{ repo: 'web', path: 'deleted.ts', hash: 'old' }] };
  const after = { manifest: { journeys: [{ id: 'flow', title: 'Flow', steps: [
    { id: 'second', title: 'Second' }, { id: 'first', title: 'First', expected: 'New' }, { id: 'third', title: 'Third' }
  ] }] }, files: [] };
  const result = compareJourneySnapshots(before, after, 'Author supplied reason');
  assert.equal(result.journeys[0].changes[0].kind, 'step-order');
  assert.deepEqual(result.journeys[0].steps.find(step => step.id === 'first').changes[0],
    { kind: 'description', field: 'expected', before: 'Old', after: 'New' });
  assert.equal(result.journeys[0].steps.find(step => step.id === 'third').changes[0].kind, 'added');
  assert.equal(result.unmapped[0].status, 'removed');
  assert.equal(result.rationale, 'Author supplied reason');
});

test('repository comparison includes committed, deleted and untracked worktree files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codereview-journey-'));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  try {
    git('init');
    git('config', 'user.email', 'test@example.invalid');
    git('config', 'user.name', 'Test');
    fs.writeFileSync(path.join(root, 'screen.html'), 'before');
    fs.writeFileSync(path.join(root, 'deleted.cs'), 'before');
    git('add', '.');
    git('commit', '-m', 'base');
    fs.writeFileSync(path.join(root, 'screen.html'), 'committed change');
    git('add', '.');
    git('commit', '-m', 'target');
    assert.deepEqual(repositoryChanges('web', root, 'HEAD~1', 'HEAD'), [
      { repo: 'web', path: 'screen.html', status: 'M' }
    ]);
    fs.unlinkSync(path.join(root, 'deleted.cs'));
    fs.writeFileSync(path.join(root, 'new file.ts'), 'untracked');
    assert.deepEqual(repositoryChanges('web', root, 'HEAD', 'WORKTREE'), [
      { repo: 'web', path: 'deleted.cs', status: 'D' },
      { repo: 'web', path: 'new file.ts', status: 'A' }
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('interface facts capture control labels, conditions and actions', () => {
  const before = '<div *ngIf="ready"><button (click)="run()">Run</button></div>';
  const after = '<div *ngIf="approved"><button (click)="run()">Start</button></div>';
  const changes = compareJourneyFacts('screen.html', before, after);
  assert.deepEqual(changes.map(change => [change.status, change.label, change.conditions[0]]), [
    ['removed', 'Run', '*ngIf=ready'], ['added', 'Start', '*ngIf=approved']
  ]);
});

test('structural facts capture Angular routes and C# endpoint attributes', () => {
  const routes = compareJourneyFacts('routes.ts', "const routes = [{path: 'old', component: Home}];", "const routes = [{path: 'new', component: Home}];");
  assert.deepEqual(routes.map(route => route.path), ["'old'", "'new'"]);
  const endpoints = compareJourneyFacts('Controller.cs', '[Route("old")] class Controller { [HttpGet("{id}")] public void Get() {} }',
    '[Route("new")] class Controller { [HttpPost("{id}")] public void Get() {} }');
  assert.ok(endpoints.some(fact => fact.status === 'removed' && fact.attribute === 'HttpGet("{id}")'));
  assert.ok(endpoints.some(fact => fact.status === 'added' && fact.attribute === 'HttpPost("{id}")'));
});

test('TypeScript condition and state changes are observed rather than inferred', () => {
  const before = 'class Screen { update() { if (this.ready) { this.isComplete = false; } } }';
  const after = 'class Screen { update() { if (this.approved) { this.isComplete = true; } } }';
  const changes = compareJourneyFacts('screen.ts', before, after);
  assert.ok(changes.some(fact => fact.status === 'removed' && fact.type === 'condition' && fact.expression === 'this.ready'));
  assert.ok(changes.some(fact => fact.status === 'added' && fact.type === 'condition' && fact.expression === 'this.approved'));
  assert.ok(changes.some(fact => fact.status === 'added' && fact.type === 'state' && fact.property === 'isComplete' && fact.value === 'true'));
});

test('journey CLI maps interface changes and reports repositories not compared', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codereview-journey-cli-'));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  try {
    git('init');
    git('config', 'user.email', 'test@example.invalid');
    git('config', 'user.name', 'Test');
    fs.writeFileSync(path.join(root, 'screen.html'), '<button>Run</button>');
    git('add', '.');
    git('commit', '-m', 'base');
    fs.writeFileSync(path.join(root, 'screen.html'), '<button>Start</button>');
    fs.writeFileSync(path.join(root, 'extra.html'), '<button>New action</button>');
    const manifest = { journeys: [{ id: 'run', title: 'Run calculation', steps: [
      { id: 'start', title: 'Start', evidence: [{ repo: 'web', path: 'screen.html' }, { repo: 'api', path: 'controller.cs' }] }
    ] }] };
    const manifestPath = path.join(root, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    const cli = path.resolve(__dirname, '../tools/cli.js');
    const output = execFileSync(process.execPath, [cli, 'journey', 'diff', manifestPath, '--repo', `web=${root}`, '--json'], { encoding: 'utf8' });
    const result = JSON.parse(output);
    const changes = result.journeys[0].steps[0].changes[0];
    assert.deepEqual(changes.facts.map(fact => [fact.status, fact.label]), [['removed', 'Run'], ['added', 'Start']]);
    assert.deepEqual(result.uncomparedRepositories, ['api']);
    const text = execFileSync(process.execPath, [cli, 'journey', 'diff', manifestPath, '--repo', `web=${root}`], { encoding: 'utf8' });
    assert.match(text, /added interface: control "New action"/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('CRWA pilot is a valid, evidence-linked journey manifest', () => {
  const manifest = readManifest(path.resolve(__dirname, '../examples/crwa-journeys.json'));
  assert.ok(manifest.journeys.some(journey => journey.id === 'calculate'));
  assert.ok(manifest.journeys.every(journey => journey.steps.every(step => step.evidence.length && step.sources.length)));
  assert.deepEqual(new Set(manifest.components.flatMap(component => component.evidence.map(entry => entry.repo))), new Set(['website', 'api']));
});

test('journey CLI selects one numbered step', () => {
  const cli = path.resolve(__dirname, '../tools/cli.js');
  const manifest = path.resolve(__dirname, '../examples/crwa-journeys.json');
  const result = JSON.parse(execFileSync(process.execPath,
    [cli, 'journey', 'show', manifest, 'calculate', '--step', '2', '--json'], { encoding: 'utf8' }));
  assert.deepEqual(result.journeys[0].steps.map(step => step.id), ['start-calculation']);
  assert.throws(() => execFileSync(process.execPath,
    [cli, 'journey', 'show', manifest, 'calculate', '--step', '0'], { encoding: 'utf8', stdio: 'pipe' }));
});

test('adding a step does not falsely report a reorder', () => {
  const before = { manifest: { journeys: [{ id: 'flow', title: 'Flow', steps: [{ id: 'one', title: 'One' }] }] }, files: [] };
  const after = { manifest: { journeys: [{ id: 'flow', title: 'Flow', steps: [{ id: 'one', title: 'One' }, { id: 'two', title: 'Two' }] }] }, files: [] };
  const result = compareJourneySnapshots(before, after);
  assert.deepEqual(result.journeys[0].changes, []);
  assert.equal(result.journeys[0].steps[0].changes[0].kind, 'added');
});