const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const {
  resolveTranscriptPath,
  parseToolArgs,
  parseTranscript
} = require('../tools/src/conversation/transcript-parser');

const {
  BUILTIN_SKILLS,
  parseSkillMarkdown,
  discoverSkills
} = require('../tools/src/conversation/skills-registry');

const {
  categorizeActivity,
  analyzeToolConsideration,
  evaluateSkillAdherence,
  analyzeConversation
} = require('../tools/src/conversation/conversation-analyzer');

const { generateHtmlReport } = require('../tools/src/conversation/html-reporter');
const { runConversationCommand } = require('../tools/src/commands/conversation');

// Test fixtures directory
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');

test('Transcript Parser - parseToolArgs normalizes various argument shapes', () => {
  const raw1 = {
    CommandLine: '"git status"',
    WaitMs: '2000'
  };
  const parsed1 = parseToolArgs(raw1);
  assert.strictEqual(parsed1.CommandLine, 'git status');
  assert.strictEqual(parsed1.WaitMs, '2000');

  const raw2 = {
    options: '{"json": true}'
  };
  const parsed2 = parseToolArgs(raw2);
  assert.deepStrictEqual(parsed2.options, { json: true });
});

test('Transcript Parser - parses synthetic conversation lines correctly', () => {
  const tmpDir = path.join(FIXTURES_DIR, 'mock_conv');
  fs.mkdirSync(tmpDir, { recursive: true });
  const mainLog = path.join(tmpDir, 'transcript.jsonl');
  const fullLog = path.join(tmpDir, 'transcript_full.jsonl');

  const step0 = {
    step_index: 0,
    source: 'USER_EXPLICIT',
    type: 'USER_INPUT',
    created_at: '2026-10-17T00:00:00Z',
    content: 'Review code complexity hotspots'
  };

  const step1Compact = {
    step_index: 1,
    source: 'MODEL',
    type: 'PLANNER_RESPONSE',
    created_at: '2026-10-17T00:00:01Z',
    truncated_fields: ['thinking'],
    thinking: 'Short thinking...',
    tool_calls: [{
      name: 'run_command',
      args: { CommandLine: 'node tools/ast-inspect.js --section cognitive' }
    }]
  };

  const step1Full = {
    step_index: 1,
    source: 'MODEL',
    type: 'PLANNER_RESPONSE',
    created_at: '2026-10-17T00:00:01Z',
    thinking: 'We need to inspect the top cognitive complexity hotspots using the dedicated inspector tool.',
    tool_calls: [{
      name: 'run_command',
      args: { CommandLine: 'node tools/ast-inspect.js --section cognitive' }
    }]
  };

  fs.writeFileSync(mainLog, JSON.stringify(step0) + '\n' + JSON.stringify(step1Compact) + '\n', 'utf8');
  fs.writeFileSync(fullLog, JSON.stringify(step0) + '\n' + JSON.stringify(step1Full) + '\n', 'utf8');

  try {
    const parsed = parseTranscript(tmpDir);
    assert.strictEqual(parsed.totalSteps, 2);
    assert.strictEqual(parsed.steps[0].type, 'USER_INPUT');
    assert.strictEqual(parsed.steps[1].type, 'PLANNER_RESPONSE');
    // Verify truncation hydration from full log
    assert.strictEqual(parsed.steps[1].thinking, step1Full.thinking);
    assert.strictEqual(parsed.steps[1].toolCalls[0].name, 'run_command');
    assert.strictEqual(parsed.steps[1].toolCalls[0].args.CommandLine, 'node tools/ast-inspect.js --section cognitive');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Skills Registry - discovers built-in and workspace skills', () => {
  const skills = discoverSkills();
  assert(skills.length > 5, 'Should discover multiple skills');
  
  const cr = skills.find(s => s.id === 'codereview-analyzer');
  assert(cr, 'Should contain codereview-analyzer skill');
  assert(cr.triggers.includes('ast-inspect'));
  assert(cr.prescribedTools.includes('tools/ast-inspect.js'));
  assert(cr.antiPatterns.length > 0);

  const tdd = skills.find(s => s.id === 'test-driven-development');
  assert(tdd, 'Should contain test-driven-development skill');
});

test('Conversation Analyzer - categorizes activities and extracts tool rationale', () => {
  const step = {
    stepIndex: 1,
    type: 'PLANNER_RESPONSE',
    thinking: 'We should run the unit test suite to verify no regressions occurred.',
    toolCalls: [{
      name: 'run_command',
      args: { CommandLine: 'npm test', toolAction: 'Running tests' }
    }]
  };

  const activity = categorizeActivity(step);
  assert.strictEqual(activity.type, 'RUN_TESTS');
  assert.strictEqual(activity.label, 'Executing Tests');

  const consideration = analyzeToolConsideration(step);
  assert.strictEqual(consideration.tools[0].name, 'run_command');
  assert.strictEqual(consideration.hasThinking, true);
  assert(consideration.rationale.includes('unit test suite'));
});

test('Conversation Analyzer - detects rule violations and missed opportunities', () => {
  const skills = discoverSkills();

  // Test 1: Violation: running node -e to parse graph
  const violationStep = {
    stepIndex: 5,
    type: 'PLANNER_RESPONSE',
    thinking: 'Let me write an ad-hoc node script to parse graph.json nodes and blastRadius',
    toolCalls: [{
      name: 'run_command',
      args: { CommandLine: 'node -e "const g = require(\'./graph.json\'); console.log(g.nodes);"' }
    }]
  };

  const evalViolation = evaluateSkillAdherence(violationStep, { lastUserPrompt: 'check graph' }, skills);
  assert.strictEqual(evalViolation.auditStatus, 'VIOLATION');
  const matchedCr = evalViolation.matchedSkills.find(s => s.id === 'codereview-analyzer');
  assert(matchedCr, 'codereview-analyzer should be matched');
  assert.strictEqual(matchedCr.status, 'VIOLATION');
  assert(matchedCr.explanation.includes('DO NOT write ad-hoc JavaScript'));

  // Test 2: Anti-pattern Violation: blind grep for domain concepts
  const grepViolationStep = {
    stepIndex: 6,
    type: 'PLANNER_RESPONSE',
    thinking: 'Blind grep for crash occurrences',
    toolCalls: [{
      name: 'run_command',
      args: { CommandLine: 'grep -rn "crash" src/' }
    }]
  };
  const evalGrepViolation = evaluateSkillAdherence(grepViolationStep, { lastUserPrompt: 'where do enemy ships crash into friendly' }, skills);
  assert.strictEqual(evalGrepViolation.auditStatus, 'VIOLATION');

  // Test 3: Missed Opportunity: manual directory traversal instead of concept search
  const missedStep = {
    stepIndex: 7,
    type: 'PLANNER_RESPONSE',
    thinking: 'Searching for where ships crash into friendly entities',
    toolCalls: [{
      name: 'run_command',
      args: { CommandLine: 'find src/ -name "*.js"' }
    }]
  };

  const evalMissed = evaluateSkillAdherence(missedStep, { lastUserPrompt: 'where do enemy ships crash into friendly' }, skills);
  assert.strictEqual(evalMissed.auditStatus, 'MISSED_OPPORTUNITY');

  // Test 4: Followed: agent ran prescribed tool
  const followedStep = {
    stepIndex: 8,
    type: 'PLANNER_RESPONSE',
    thinking: 'Using the concept engine to route the bug',
    toolCalls: [{
      name: 'run_command',
      args: { CommandLine: 'node tools/ast-inspect.js --concept "enemy ships crash into friendly"' }
    }]
  };

  const evalFollowed = evaluateSkillAdherence(followedStep, { lastUserPrompt: 'where do enemy ships crash into friendly' }, skills);
  assert.strictEqual(evalFollowed.auditStatus, 'FOLLOWED');
});

test('Conversation Analyzer - full analysis computes correct scorecard & timeline', () => {
  const mockTranscriptData = {
    transcriptPath: '/mock/path/transcript.jsonl',
    fullTranscriptPath: null,
    steps: [
      {
        stepIndex: 0,
        type: 'USER_INPUT',
        source: 'USER_EXPLICIT',
        content: 'Check for high complexity hotspots'
      },
      {
        stepIndex: 1,
        type: 'PLANNER_RESPONSE',
        source: 'MODEL',
        thinking: 'Running the ast inspector to find hotspots',
        toolCalls: [{
          name: 'run_command',
          args: { CommandLine: 'node tools/ast-inspect.js --section cognitive' }
        }]
      },
      {
        stepIndex: 2,
        type: 'PLANNER_RESPONSE',
        source: 'MODEL',
        thinking: 'Parsing graph json with ad-hoc script',
        toolCalls: [{
          name: 'run_command',
          args: { CommandLine: 'node -e "const g = require(\'./graph.json\');"' }
        }]
      }
    ]
  };

  const result = analyzeConversation(mockTranscriptData);
  assert.strictEqual(result.metadata.totalSteps, 3);
  assert.strictEqual(result.metadata.totalPlannerSteps, 2);
  assert(result.metadata.skillsFollowed >= 1, 'Should have at least 1 followed skill');
  assert(result.metadata.skillsViolated >= 1, 'Should have at least 1 skill violation');
  assert.strictEqual(result.violations.length, 1);
  assert.strictEqual(result.violations[0].skillId, 'codereview-analyzer');
});

test('HTML Reporter - generates valid HTML with interactive dashboard', () => {
  const mockData = {
    metadata: {
      totalSteps: 5,
      totalUserInputs: 1,
      totalPlannerSteps: 2,
      totalToolCalls: 2,
      skillsFollowed: 1,
      skillsMissed: 0,
      skillsViolated: 0,
      adherenceScore: 100
    },
    toolCounts: { run_command: 2 },
    timeline: [
      {
        stepIndex: 0,
        type: 'USER_INPUT',
        content: 'Hello analyzer'
      },
      {
        stepIndex: 1,
        type: 'PLANNER_RESPONSE',
        auditStatus: 'FOLLOWED',
        activity: { summary: 'Ran inspector' },
        toolCalls: [{ name: 'run_command', args: { CommandLine: 'node tools/ast-inspect.js' } }]
      }
    ]
  };

  const html = generateHtmlReport(mockData);
  assert(html.includes('<!DOCTYPE html>'));
  assert(html.includes('Gemini Conversation & Skill Adherence Analyzer'));
  assert(html.includes('timelineContainer'));
  assert(html.includes('initDashboard'));
});

test('Transcript Parser & Conversation Analyzer - parses Markdown transcripts (example1.md format) and detects missed codereview tool usages', () => {
  const tmpDir = path.join(FIXTURES_DIR, 'mock_md_conv');
  fs.mkdirSync(tmpDir, { recursive: true });
  const mdFile = path.join(tmpDir, 'example_transcript.md');

  const sampleMd = [
    '## User (checkpoint)',
    '',
    'Mission controller. I signed up for a Confed Combat Air Patrol. It had 1 nav point, no enemies appeared and the end was the "Tigerss Claw". Analyse and remediate.',
    '',
    '## Assistant',
    '',
    '<thinking>',
    'Let me use the AST analyzer/concept map first. Actually, let me be efficient and grep.',
    '</thinking>',
    '',
    '**Tool Call: Search files for regex `wc1_|STORY_DATA_REGISTRY|contracts|loadContracts|getContracts|availableContracts`**',
    'Status: Completed',
    '',
    'file:///Users/gregday/games/planets-godot/poc_ai/js/MissionContracts.js#L1:10',
    '',
    '## Assistant',
    '',
    '<thinking>',
    'Now let me edit MissionContracts.js and run a quick node one-liner.',
    '</thinking>',
    '',
    '**Tool Call: poc\\_ai/js/MissionContracts.js**',
    'Status: Completed',
    '',
    'Diff: poc_ai/js/MissionContracts.js',
    '```',
    '+ if (contract.campaignOnly) continue;',
    '```',
    '',
    '**Tool Call: node -e "const r = require(\'./poc_ai/js/StoryDataRegistry.js\'); console.log(r);"**',
    'Status: Completed',
    '',
    'Terminal:',
    '```',
    'typeof object',
    '```'
  ].join('\n');

  fs.writeFileSync(mdFile, sampleMd, 'utf8');

  try {
    const parsed = parseTranscript(mdFile);
    assert.strictEqual(parsed.totalSteps, 3);
    assert.strictEqual(parsed.steps[0].type, 'USER_INPUT');
    assert.strictEqual(parsed.steps[1].type, 'PLANNER_RESPONSE');
    assert.strictEqual(parsed.steps[1].toolCalls[0].name, 'grep_search');
    assert.strictEqual(parsed.steps[2].toolCalls[0].name, 'replace_file_content');
    assert.strictEqual(parsed.steps[2].toolCalls[1].name, 'run_command');

    const analysis = analyzeConversation(parsed);
    assert(analysis.metadata.skillsViolated >= 1, 'Should flag violation for blind regex method-guessing search and/or node -e');
    assert(analysis.violations.some(v => v.skillId === 'codereview-analyzer'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
