const fs = require('node:fs');
const path = require('node:path');
const { parseTranscript } = require('../conversation/transcript-parser');
const { analyzeConversation } = require('../conversation/conversation-analyzer');
const { generateHtmlReport } = require('../conversation/html-reporter');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  bgRed: '\x1b[41m\x1b[37m',
  bgYellow: '\x1b[43m\x1b[30m',
  bgGreen: '\x1b[42m\x1b[30m'
};

function formatScoreBadge(score) {
  if (score >= 80) return `${COLORS.bgGreen} ${score}% ADHERENCE ${COLORS.reset}`;
  if (score >= 50) return `${COLORS.bgYellow} ${score}% ADHERENCE ${COLORS.reset}`;
  return `${COLORS.bgRed} ${score}% ADHERENCE ${COLORS.reset}`;
}

function formatAuditBadge(status) {
  if (status === 'VIOLATION') return `${COLORS.red}[RULE VIOLATION]${COLORS.reset}`;
  if (status === 'MISSED_OPPORTUNITY') return `${COLORS.yellow}[MISSED SKILL]${COLORS.reset}`;
  if (status === 'FOLLOWED') return `${COLORS.green}[SKILL FOLLOWED]${COLORS.reset}`;
  return `${COLORS.dim}[GENERAL]${COLORS.reset}`;
}

function printCliHeader(analysis) {
  const m = analysis.metadata;
  const tok = m.tokens || { totalTokens: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheHitRate: 0 };
  console.log(`\n${COLORS.bold}${COLORS.cyan}======================================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}  Gemini Conversation & Agent Skill Adherence Analyzer${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}======================================================================${COLORS.reset}`);
  console.log(`Transcript Source:   ${COLORS.dim}${m.transcriptPath}${COLORS.reset}`);
  console.log(`Total Steps:         ${m.totalSteps} (Planner: ${m.totalPlannerSteps}, User Inputs: ${m.totalUserInputs})`);
  console.log(`Total Tool Calls:    ${m.totalToolCalls}`);
  console.log(`Total Tokens:        ${COLORS.bold}${tok.totalTokens.toLocaleString()}${COLORS.reset} (Input: ${tok.inputTokens.toLocaleString()}, Output: ${tok.outputTokens.toLocaleString()}, Cache Read: ${tok.cacheReadTokens.toLocaleString()} [${tok.cacheHitRate}% cached])`);
  console.log(`Skill Adherence:     ${formatScoreBadge(m.adherenceScore)} (Followed: ${m.skillsFollowed}, Missed: ${m.skillsMissed}, Violations: ${m.skillsViolated})\n`);

  console.log(`${COLORS.bold}Tool Usage Breakdown:${COLORS.reset}`);
  const toolEntries = Object.entries(analysis.toolCounts).sort((a, b) => b[1] - a[1]);
  if (toolEntries.length > 0) {
    console.log(toolEntries.map(([t, c]) => `  • ${t.padEnd(22)} ${c.toString().padStart(4)} calls`).join('\n'));
  } else {
    console.log(`  (No tool calls recorded)`);
  }
  console.log('');
}

function printTokenRanking(analysis) {
  console.log(`${COLORS.bold}Token Consumption per Step (Highest to Lowest):${COLORS.reset}`);
  const tokenSteps = [...analysis.timeline]
    .filter(t => t.tokens && t.tokens.total > 0)
    .sort((a, b) => b.tokens.total - a.tokens.total);

  console.log(`  ${'Step'.padEnd(8)} ${'Type / Action'.padEnd(32)} ${'Input'.padStart(10)} ${'Cache Read'.padStart(12)} ${'Output'.padStart(10)} ${'Total'.padStart(12)}`);
  console.log(`  ${'----'.padEnd(8)} ${'-------------'.padEnd(32)} ${'-----'.padStart(10)} ${'----------'.padStart(12)} ${'------'.padStart(10)} ${'-----'.padStart(12)}`);
  tokenSteps.slice(0, 20).forEach(s => {
    const label = s.activity?.summary || s.summary || s.type;
    const truncatedLabel = label.length > 30 ? label.slice(0, 27) + '...' : label;
    console.log(`  Step ${s.stepIndex.toString().padEnd(3)} ${truncatedLabel.padEnd(32)} ${s.tokens.input.toLocaleString().padStart(10)} ${s.tokens.cacheRead.toLocaleString().padStart(12)} ${s.tokens.output.toLocaleString().padStart(10)} ${s.tokens.total.toLocaleString().padStart(12)}`);
  });
  console.log('');
}

function printStepDeepDive(item) {
  console.log(`${COLORS.bold}${COLORS.cyan}--- Step ${item.stepIndex} Deep Dive ---${COLORS.reset}`);
  console.log(`Type:       ${item.type} (${item.source})`);
  console.log(`Timestamp:  ${item.timestamp || 'N/A'}`);
  console.log(`Status:     ${formatAuditBadge(item.auditStatus)}`);
  if (item.tokens) {
    console.log(`Tokens:     Input: ${item.tokens.input.toLocaleString()} | Output: ${item.tokens.output.toLocaleString()} | Cache Read: ${item.tokens.cacheRead.toLocaleString()} | Total: ${item.tokens.total.toLocaleString()}`);
  }
  if (item.activity) {
    console.log(`Activity:   ${item.activity.label} - ${item.activity.summary}`);
  }

  if (item.thinking) {
    console.log(`\n${COLORS.bold}Agent Thinking & Tool Consideration (Why):${COLORS.reset}`);
    console.log(`${COLORS.dim}${item.thinking}${COLORS.reset}`);
  }

  if (item.toolCalls && item.toolCalls.length > 0) {
    console.log(`\n${COLORS.bold}Tool Invocations & Arguments:${COLORS.reset}`);
    item.toolCalls.forEach(tc => {
      console.log(`  • Tool: ${COLORS.cyan}${tc.name}${COLORS.reset}`);
      console.log(`    Args: ${JSON.stringify(tc.args, null, 2)}`);
    });
  }

  if (item.matchedSkills && item.matchedSkills.length > 0) {
    console.log(`\n${COLORS.bold}Linked Agent Skills:${COLORS.reset}`);
    item.matchedSkills.forEach(ms => {
      console.log(`  • ${COLORS.bold}${ms.name}${COLORS.reset} (${ms.id}) - ${formatAuditBadge(ms.status)}`);
      console.log(`    Path: ${ms.path ? 'file://' + ms.path : 'Builtin'}`);
      if (ms.explanation) console.log(`    Rationale: ${ms.explanation}`);
      if (ms.recommendation) console.log(`    ${COLORS.yellow}Recommendation: ${ms.recommendation}${COLORS.reset}`);
    });
  }

  console.log('\n');
}

function printTimeline(analysis, options) {
  console.log(`${COLORS.bold}Conversation Timeline & Skill Linkages:${COLORS.reset}`);
  let displayedSteps = analysis.timeline;
  if (options.missed) {
    displayedSteps = displayedSteps.filter(t => t.auditStatus === 'MISSED_OPPORTUNITY' || t.auditStatus === 'VIOLATION');
    console.log(`${COLORS.dim}(Filtering to steps with missed skills or rule violations)${COLORS.reset}\n`);
  }

  displayedSteps.forEach(step => {
    if (step.type === 'USER_INPUT') {
      const preview = (step.content || '').replace(/\n+/g, ' ').slice(0, 100);
      console.log(`  ${COLORS.magenta}Step ${step.stepIndex.toString().padStart(2)} [USER]${COLORS.reset} ${preview}...`);
      return;
    }

    const primaryTool = (step.toolCalls && step.toolCalls[0]) ? step.toolCalls[0].name : 'step';
    const toolBadge = `[${primaryTool}]`.padEnd(16);
    const auditBadge = formatAuditBadge(step.auditStatus);
    const summary = step.activity?.summary || 'Executing step';

    console.log(`  ${COLORS.cyan}Step ${step.stepIndex.toString().padStart(2)}${COLORS.reset} ${COLORS.blue}${toolBadge}${COLORS.reset} ${auditBadge} ${summary}`);

    if (step.consideration?.rationale) {
      console.log(`    ${COLORS.dim}Why: ${step.consideration.rationale.slice(0, 110)}...${COLORS.reset}`);
    }

    if (step.matchedSkills && step.matchedSkills.length > 0) {
      step.matchedSkills.forEach(ms => {
        const badge = ms.status === 'VIOLATION'
          ? `${COLORS.red}VIOLATION${COLORS.reset}`
          : (ms.status === 'MISSED_OPPORTUNITY' ? `${COLORS.yellow}MISSED${COLORS.reset}` : `${COLORS.green}FOLLOWED${COLORS.reset}`);
        console.log(`    ↳ Skill: ${COLORS.bold}${ms.name}${COLORS.reset} [${badge}]`);
        if (ms.status === 'VIOLATION' || ms.status === 'MISSED_OPPORTUNITY') {
          console.log(`      ${COLORS.yellow}Fix:${COLORS.reset} ${ms.recommendation}`);
        }
      });
    }
  });
}

function printRemediationGuide(analysis) {
  if (analysis.violations.length === 0 && analysis.missedOpportunities.length === 0) return;

  console.log(`\n${COLORS.bold}${COLORS.yellow}======================================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.yellow}  Actionable Skill Adherence Remediation Guide${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.yellow}======================================================================${COLORS.reset}`);

  if (analysis.violations.length > 0) {
    console.log(`\n${COLORS.bold}${COLORS.red}Critical Rule Violations (${analysis.violations.length}):${COLORS.reset}`);
    analysis.violations.forEach((v, idx) => {
      console.log(`  ${idx + 1}. [Step ${v.stepIndex}] ${COLORS.bold}${v.skillName}${COLORS.reset}`);
      console.log(`     Issue:  ${v.reason}`);
      console.log(`     Action: ${v.recommendation}`);
    });
  }

  if (analysis.missedOpportunities.length > 0) {
    console.log(`\n${COLORS.bold}${COLORS.yellow}Missed Skill Opportunities (${analysis.missedOpportunities.length}):${COLORS.reset}`);
    analysis.missedOpportunities.forEach((mo, idx) => {
      console.log(`  ${idx + 1}. [Step ${mo.stepIndex}] ${COLORS.bold}${mo.skillName}${COLORS.reset}`);
      console.log(`     Notice: ${mo.reason}`);
      console.log(`     Action: ${mo.recommendation}`);
    });
  }
}

function runConversationCommand(targetPath, options = {}) {
  const transcriptData = parseTranscript(targetPath, options);
  const analysis = analyzeConversation(transcriptData, options);

  if (options.json) {
    console.log(JSON.stringify(analysis, null, 2));
    return analysis;
  }

  if (options.html) {
    const htmlPath = typeof options.html === 'string' && options.html !== 'true'
      ? path.resolve(options.html)
      : path.resolve(process.cwd(), 'conversation_report.html');
    const html = generateHtmlReport(analysis);
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`${COLORS.green}✔ Interactive HTML conversation report generated:${COLORS.reset} ${htmlPath}`);
  }

  printCliHeader(analysis);

  if (options.tokens) {
    printTokenRanking(analysis);
  }

  if (options.step !== undefined) {
    const targetIndex = parseInt(options.step, 10);
    const item = analysis.timeline.find(t => t.stepIndex === targetIndex);
    if (!item) {
      console.log(`${COLORS.yellow}Step index ${targetIndex} not found in conversation.${COLORS.reset}`);
      return analysis;
    }
    printStepDeepDive(item);
    return analysis;
  }

  printTimeline(analysis, options);
  printRemediationGuide(analysis);

  console.log(`\n${COLORS.bold}Tip:${COLORS.reset} To export an interactive HTML dashboard, run:`);
  console.log(`  ${COLORS.cyan}node tools/conversation-analyzer.js --html${COLORS.reset}\n`);

  return analysis;
}

module.exports = {
  runConversationCommand,
  formatScoreBadge,
  formatAuditBadge
};
