#!/usr/bin/env node

/**
 * Gemini Conversation & Agent Skill Adherence Analyzer
 *
 * Reconstructs conversation history, extracts agent thinking and tool consideration,
 * links steps to available agent skills, and flags where skills are underutilized, missed,
 * or violated.
 */

const { parseArgs } = require('node:util');
const { runConversationCommand } = require('./src/commands/conversation');

const CLI_OPTIONS = {
  conversation: { type: 'string' },
  step: { type: 'string' },
  missed: { type: 'boolean', default: false },
  summary: { type: 'boolean', default: false },
  tokens: { type: 'boolean', default: false },
  json: { type: 'boolean', default: false },
  html: { type: 'string' },
  help: { type: 'boolean', short: 'h', default: false }
};

function printHelp() {
  console.log(`
Gemini Conversation & Agent Skill Adherence Analyzer

Usage:
  node tools/conversation-analyzer.js [transcriptPath] [options]
  npm run analyze:conversation -- [transcriptPath] [options]

Arguments:
  transcriptPath           Path to transcript.jsonl or conversation directory
                           (defaults to current active conversation)

Options:
  --conversation <id>      Specify Antigravity conversation ID
  --tokens                 Display breakdown and ranking of token consumption per step
  --step <number>          Deep-dive inspection of a specific step (thinking, tools, skills, tokens)
  --missed                 Filter timeline to only steps with missed skill opportunities or violations
  --summary                Display overview metrics and skill scorecard
  --json                   Output diagnostic data as structured JSON
  --html [path]            Export interactive self-contained HTML dashboard (default: conversation_report.html)
  -h, --help               Show this help message

Examples:
  # Analyze current active conversation (shows total tokens in header)
  node tools/conversation-analyzer.js

  # View breakdown of token usage across steps (sorted by highest)
  node tools/conversation-analyzer.js --tokens

  # Export interactive visual HTML dashboard
  node tools/conversation-analyzer.js --html

  # Deep dive into Step 7 thinking, tool consideration, and token usage
  node tools/conversation-analyzer.js --step 7

  # Show only missed skill opportunities and rule violations
  node tools/conversation-analyzer.js --missed

  # Output machine-readable JSON for CI/CD checks
  node tools/conversation-analyzer.js --json
`);
}

function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: CLI_OPTIONS,
    allowPositionals: true
  });

  if (values.help) {
    printHelp();
    return;
  }

  const targetPath = positionals[0] || null;

  try {
    runConversationCommand(targetPath, {
      conversationId: values.conversation,
      step: values.step,
      missed: values.missed,
      summary: values.summary,
      tokens: values.tokens,
      json: values.json,
      html: values.html
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  main
};
