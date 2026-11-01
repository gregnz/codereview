const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  logTelemetryEvent,
  readFeedbackEvents,
  summarizeFeedback,
  applyTaxonomyImprovements
} = require('../tools/src/telemetry/feedback-logger');
const { runFeedbackCommand, runImproveCommand } = require('../tools/src/commands/improve');

test('Feedback Logger - logs and reads events in non-blocking manner', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codereview-telemetry-'));

  const success = logTelemetryEvent(tempDir, {
    type: 'EMPTY_QUERY',
    command: 'query',
    input: 'testUnknownMethod'
  });

  assert.equal(success, true);

  const events = readFeedbackEvents(tempDir);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'EMPTY_QUERY');
  assert.equal(events[0].input, 'testUnknownMethod');

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('Feedback Logger - summarizes failure clusters and suggests taxonomy keywords', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codereview-telemetry-'));

  logTelemetryEvent(tempDir, { type: 'EMPTY_CONCEPT', input: 'hyperspace drive navigation' });
  logTelemetryEvent(tempDir, { type: 'EMPTY_CONCEPT', input: 'hyperspace travel jump' });
  logTelemetryEvent(tempDir, { type: 'EMPTY_QUERY', input: 'initiateHyperspaceJump' });
  logTelemetryEvent(tempDir, { type: 'UNKNOWN_SYMBOL', input: 'Ship.dock' });
  logTelemetryEvent(tempDir, { type: 'AGENT_FEEDBACK', input: 'hyperspace', message: 'Resolved to WarpDrive.js' });

  const summary = summarizeFeedback(tempDir);
  assert.equal(summary.totalEvents, 5);
  assert.equal(summary.countsByType.EMPTY_CONCEPT, 2);
  assert.equal(summary.countsByType.EMPTY_QUERY, 1);
  assert.equal(summary.countsByType.UNKNOWN_SYMBOL, 1);
  assert.equal(summary.countsByType.AGENT_FEEDBACK, 1);

  const topKeyword = summary.topMissingKeywords.find(k => k.keyword === 'hyperspace');
  assert.ok(topKeyword, 'Should detect hyperspace as a top candidate keyword');
  assert.ok(topKeyword.count >= 3);

  assert.ok(summary.recommendations.length >= 3);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('Feedback Logger - applyTaxonomyImprovements merges discovered keywords into codereview.config.json', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codereview-telemetry-'));
  const configPath = path.join(tempDir, 'codereview.config.json');

  fs.writeFileSync(configPath, JSON.stringify({
    concepts: [
      { id: 'combat', name: 'Combat', keywords: ['laser', 'shield'] }
    ]
  }), 'utf8');

  logTelemetryEvent(tempDir, { type: 'EMPTY_CONCEPT', input: 'torpedo plasma cannon' });

  const patch = applyTaxonomyImprovements(tempDir);
  assert.equal(patch.applied, true);
  assert.ok(patch.addedKeywordsCount >= 2);

  const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const discovered = updatedConfig.concepts.find(c => c.id === 'discovered_vocabulary');
  assert.ok(discovered);
  assert.ok(discovered.keywords.includes('torpedo'));
  assert.ok(discovered.keywords.includes('plasma'));

  fs.rmSync(tempDir, { recursive: true, force: true });
});
