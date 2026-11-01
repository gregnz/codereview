const path = require('node:path');
const {
  logTelemetryEvent,
  summarizeFeedback,
  applyTaxonomyImprovements
} = require('../telemetry/feedback-logger');
const { findProjectRoot } = require('../config/layers');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

/**
 * Handles explicit feedback logging from agents or developers.
 */
function runFeedbackCommand(message, options = {}, targetDir = '.') {
  if (!message) {
    console.error('Error: Please provide feedback details, e.g.: codereview feedback "Searched for X; found in Y"');
    process.exit(1);
  }

  const rootDir = findProjectRoot(path.resolve(targetDir));
  const success = logTelemetryEvent(rootDir, {
    type: 'AGENT_FEEDBACK',
    command: 'feedback',
    input: options.query || options.symbol || 'manual_feedback',
    query: options.query || null,
    symbol: options.symbol || null,
    message,
    agentId: options.agentId || process.env.CONVERSATION_ID || null
  });

  if (success) {
    console.log(`${COLORS.green}✔ Feedback recorded in .codereview/feedback.jsonl.${COLORS.reset}`);
    console.log(`${COLORS.dim}Run 'codereview improve' to analyze friction events and update domain routing.${COLORS.reset}`);
  } else {
    console.error(`${COLORS.red}Failed to write feedback to .codereview directory.${COLORS.reset}`);
  }

  return { success, message };
}

/**
 * Formats and prints feedback summary report to the console.
 */
function printImprovementReport(summary, rootDir) {
  console.log(`\n${COLORS.bold}${COLORS.cyan}========================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}   Code Review Skill Failure & Improvement Analyzer     ${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}========================================================${COLORS.reset}\n`);

  console.log(`Project Root: ${COLORS.dim}${rootDir}${COLORS.reset}`);
  console.log(`Total Friction Events Logged: ${COLORS.bold}${summary.totalEvents}${COLORS.reset}\n`);

  console.log(`${COLORS.bold}Breakdown by Failure Type:${COLORS.reset}`);
  for (const [type, count] of Object.entries(summary.countsByType)) {
    const color = count > 0 ? COLORS.yellow : COLORS.dim;
    console.log(`  • ${type.padEnd(20)} ${color}${count}${COLORS.reset}`);
  }
  console.log('');

  if (summary.topMissingKeywords.length > 0) {
    console.log(`${COLORS.bold}Top Unresolved / Missing Taxonomy Keywords:${COLORS.reset}`);
    const preview = summary.topMissingKeywords.map(k => `${k.keyword} (${k.count})`).join(', ');
    console.log(`  ${COLORS.cyan}${preview}${COLORS.reset}\n`);
  }

  if (summary.recommendations.length > 0) {
    console.log(`${COLORS.bold}${COLORS.yellow}Actionable Recommendations:${COLORS.reset}`);
    summary.recommendations.forEach((rec, idx) => {
      console.log(`  ${idx + 1}. ${rec}`);
    });
    console.log('');
  }

  console.log(`${COLORS.bold}Tip:${COLORS.reset} Run ${COLORS.cyan}codereview improve --apply${COLORS.reset} to automatically merge missing keywords into codereview.config.json.`);
  console.log('');
}

/**
 * Analyzes telemetry and generates recommendations or applies auto-improvements.
 */
function runImproveCommand(targetDir = '.', options = {}) {
  const rootDir = findProjectRoot(path.resolve(targetDir));
  const summary = summarizeFeedback(rootDir);

  if (options.apply) {
    const patchResult = applyTaxonomyImprovements(rootDir);
    if (patchResult.applied) {
      console.log(`${COLORS.green}✔ Successfully updated codereview.config.json!${COLORS.reset}`);
      console.log(`  Added ${patchResult.addedKeywordsCount} new keywords under '${patchResult.updatedConceptId}':`);
      console.log(`  ${COLORS.dim}${patchResult.newKeywords.join(', ')}${COLORS.reset}\n`);
    } else {
      console.log(`${COLORS.yellow}Notice:${COLORS.reset} ${patchResult.reason}`);
    }
    return patchResult;
  }

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }

  printImprovementReport(summary, rootDir);
  return summary;
}

module.exports = {
  runFeedbackCommand,
  runImproveCommand
};
