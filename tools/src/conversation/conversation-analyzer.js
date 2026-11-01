const { discoverSkills } = require('./skills-registry');

/**
 * Categorizes the primary activity of a planner step.
 */
function categorizeActivity(step) {
  if (step.toolCalls && step.toolCalls.length > 0) {
    const primaryTool = step.toolCalls[0];
    const name = primaryTool.name;
    const args = primaryTool.args || {};

    switch (name) {
      case 'run_command': {
        const cmd = args.CommandLine || '';
        if (/npm\s+test|node\s+--test|jest|vitest|mocha/i.test(cmd)) {
          return { type: 'RUN_TESTS', label: 'Executing Tests', summary: `Running test suite: \`${cmd}\`` };
        }
        if (/git\s+/i.test(cmd)) {
          return { type: 'VCS_OPERATION', label: 'Git Operation', summary: `Executing git command: \`${cmd}\`` };
        }
        if (/ast-inspect|ast-outline|npm run inspect|npm run analyze/i.test(cmd)) {
          return { type: 'AST_ANALYSIS', label: 'AST & Architecture Analysis', summary: `Running AST analyzer: \`${cmd}\`` };
        }
        if (/grep|ripgrep|find\s+/i.test(cmd)) {
          return { type: 'SEARCH', label: 'Searching Codebase', summary: `Searching workspace: \`${cmd}\`` };
        }
        return { type: 'RUN_COMMAND', label: 'Shell Command', summary: args.toolAction || `Ran \`${cmd}\`` };
      }
      case 'grep_search': {
        const q = args.Query || '';
        return { type: 'SEARCH', label: 'Regex File Search', summary: args.toolAction || `Searched files for regex \`${q}\`` };
      }
      case 'list_dir': {
        const dir = args.DirectoryPath || '';
        return { type: 'VIEW_FILE', label: 'Listing Directory', summary: args.toolAction || `Listed directory \`${dir}\`` };
      }
      case 'find_by_name': {
        return { type: 'SEARCH', label: 'Finding Files', summary: args.toolAction || 'Searched file paths' };
      }
      case 'view_file':
      case 'read_file': {
        const file = args.AbsolutePath || args.Path || '';
        const lines = (args.StartLine && args.EndLine) ? ` (lines ${args.StartLine}-${args.EndLine})` : '';
        return { type: 'VIEW_FILE', label: 'Inspecting File', summary: args.toolAction || `Viewed \`${file}\`${lines}` };
      }
      case 'replace_file_content':
      case 'edit_file': {
        const file = args.TargetFile || args.Path || '';
        return { type: 'EDIT_CODE', label: 'Editing File Content', summary: args.toolAction || `Modified \`${file}\`` };
      }
      case 'write_to_file':
      case 'write_file': {
        const file = args.TargetFile || args.Path || '';
        return { type: 'WRITE_FILE', label: 'Writing File', summary: args.toolAction || `Created or overwrote \`${file}\`` };
      }
      case 'manage_task': {
        const action = args.Action || '';
        const taskId = args.TaskId || '';
        return { type: 'MANAGE_TASK', label: 'Task Management', summary: `Task ${action}: ${taskId}` };
      }
      case 'ask_question': {
        return { type: 'USER_INTERACTION', label: 'Clarifying with User', summary: 'Asked clarifying questions' };
      }
      case 'call_mcp_tool': {
        const server = args.ServerName || '';
        const tool = args.ToolName || '';
        return { type: 'MCP_CALL', label: 'Calling MCP Tool', summary: `Invoked MCP \`${server}/${tool}\`` };
      }
      case 'invoke_subagent': {
        return { type: 'SUBAGENT', label: 'Invoking Subagent', summary: args.toolAction || 'Launched subagent task' };
      }
      default:
        return { type: 'TOOL_CALL', label: 'Tool Execution', summary: args.toolAction || `Called \`${name}\`` };
    }
  }

  if (step.content) {
    return { type: 'AGENT_RESPONSE', label: 'Agent Response', summary: 'Communicating with user' };
  }

  return { type: 'REASONING', label: 'Internal Reasoning', summary: 'Analyzing next steps' };
}

/**
 * Extracts tool consideration and rationale from thinking and tool calls.
 */
function analyzeToolConsideration(step) {
  const tools = (step.toolCalls || []).map(tc => {
    const args = tc.args || {};
    return {
      name: tc.name,
      action: args.toolAction || '',
      summary: args.toolSummary || '',
      details: args.CommandLine || args.TargetFile || args.AbsolutePath || args.ToolName || ''
    };
  });

  const thinking = step.thinking || '';
  let rationale = '';

  if (thinking) {
    // Extract first 1-2 meaningful sentences or lines
    const cleaned = thinking.trim().replace(/\n+/g, ' ');
    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    rationale = sentences.slice(0, 3).join(' ');
    if (rationale.length > 300) {
      rationale = rationale.slice(0, 297) + '...';
    }
  }

  return {
    tools,
    rationale,
    hasThinking: Boolean(thinking)
  };
}

/**
 * Matches trigger as a distinct word or token rather than arbitrary substring.
 */
function matchTrigger(text, trigger) {
  if (!text || !trigger) return false;
  const escaped = trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|[^a-zA-Z0-9_])${escaped}([^a-zA-Z0-9_]|$)`, 'i');
  return pattern.test(text);
}

/**
 * Evaluates fallback adherence rules when a prescribed tool was not directly invoked in this step.
 */
function evaluateFallbackSkillRules(skill, step, currentContext, flags) {
  const { commandsRun, grepHitSourceFiles, editedSourceFiles, thinking, toolCalls } = flags;

  if (skill.id === 'codereview-analyzer') {
    if (grepHitSourceFiles || commandsRun.some(c => /grep|find/i.test(c))) {
      return {
        status: 'MISSED_OPPORTUNITY',
        explanation: 'Agent performed manual regex/grep search across source files instead of using `ast-outline.js --concept` / `--query` or `ast-inspect.js`.',
        recommendation: 'Use `node tools/ast-inspect.js [graph.json] --concept "<query>"` or `node tools/ast-outline.js <dir> --query "<symbol1|symbol2>"` instead of blind regex searches.'
      };
    }
    if (editedSourceFiles.length > 0 && !currentContext.astToolsUsed) {
      return {
        status: 'MISSED_OPPORTUNITY',
        explanation: `Modified source file(s) (${editedSourceFiles.join(', ')}) without checking AST \`--blast-radius\` first or verifying with \`--diff\` / \`--lint\`.`,
        recommendation: 'Run `node tools/ast-outline.js <dir> --blast-radius "<symbol>"` before editing and `--diff` / `--lint` after editing.'
      };
    }
    if ((thinking.includes('concept') || thinking.includes('complexity') || thinking.includes('ast-outline')) && toolCalls.length > 0 && !currentContext.astToolsUsed) {
      return {
        status: 'MISSED_OPPORTUNITY',
        explanation: 'Agent acknowledged AST analyzer/concept map in thinking but bypassed it in favor of manual file/directory exploration.',
        recommendation: 'Execute `node tools/ast-outline.js <dir> --concept "<intent>"` or `node tools/ast-inspect.js <graph.json> --query "<pattern>"` as the first step.'
      };
    }
    return { status: 'FOLLOWED', explanation: 'Context matched analyzer concepts.', recommendation: '' };
  }

  if (skill.id === 'test-driven-development') {
    const isCodeEdit = toolCalls.some(tc => ['replace_file_content', 'edit_file', 'write_to_file', 'write_file'].includes(tc.name));
    if (isCodeEdit && !currentContext.recentTestsRun) {
      return {
        status: 'MISSED_OPPORTUNITY',
        explanation: 'Code modified without running or updating the test suite.',
        recommendation: 'Execute `npm test` before and after modifying code to verify behavior.'
      };
    }
    return { status: 'FOLLOWED', explanation: 'Tests were executed in the development cycle.', recommendation: '' };
  }

  if (skill.id === 'debugging-and-error-recovery' && currentContext.lastCommandFailed) {
    return {
      status: 'MISSED_OPPORTUNITY',
      explanation: 'Previous command exited with error; ensure systematic root-cause investigation before retrying.',
      recommendation: 'Inspect the error details and logs systematically before re-running.'
    };
  }

  return { status: 'FOLLOWED', explanation: `Active skill engagement for ${skill.name}.`, recommendation: '' };
}
function evaluateSkillAdherence(step, currentContext, skills) {
  const matchedSkills = [];
  const toolCalls = step.toolCalls || [];
  const thinking = step.thinking || '';
  const userPrompt = currentContext.lastUserPrompt || '';
  const commandsRun = toolCalls
    .filter(tc => (tc.name === 'run_command' || tc.name === 'grep_search') && tc.args?.CommandLine)
    .map(tc => tc.args.CommandLine);
  const editedSourceFiles = toolCalls
    .filter(tc => ['replace_file_content', 'edit_file', 'write_to_file', 'write_file'].includes(tc.name))
    .map(tc => tc.args?.TargetFile || tc.args?.Path || '')
    .filter(f => /\.(js|ts|mjs|cjs)$/i.test(f) && !/\.test\.js$/i.test(f));
  const grepHitSourceFiles = toolCalls
    .filter(tc => tc.name === 'grep_search')
    .some(tc => (tc.args?.MatchedFiles || []).some(f => /\.(js|ts|cs)$/i.test(f)) || /\|/.test(tc.args?.Query || ''));

  for (const skill of skills) {
    let triggered = false;
    let triggerReasons = [];

    // Check triggers in user prompt or agent thinking
    for (const trig of (skill.triggers || [])) {
      if (matchTrigger(userPrompt, trig)) {
        triggered = true;
        triggerReasons.push(`User request mentions "${trig}"`);
      } else if (matchTrigger(thinking, trig)) {
        triggered = true;
        triggerReasons.push(`Agent thinking considered "${trig}"`);
      }
    }

    // Check triggers in commands run
    for (const cmd of commandsRun) {
      for (const trig of (skill.triggers || [])) {
        if (matchTrigger(cmd, trig)) {
          triggered = true;
          triggerReasons.push(`Command includes "${trig}"`);
        }
      }
    }

    if (!triggered) continue;

    // Now determine adherence: VIOLATION, FOLLOWED, or MISSED_OPPORTUNITY
    let status = 'MISSED_OPPORTUNITY';
    let explanation = '';
    let recommendation = '';

    // 1. Check Anti-patterns (Violations)
    for (const ap of (skill.antiPatterns || [])) {
      for (const cmd of commandsRun) {
        if (ap.pattern.test(cmd)) {
          status = 'VIOLATION';
          explanation = ap.reason;
          recommendation = `Avoid \`${cmd}\`. Follow ${skill.name} best practices.`;
          break;
        }
      }
      if (status === 'VIOLATION') break;
    }

    // 2. Check Prescribed Tools (Followed)
    if (status !== 'VIOLATION') {
      const followedPrescribed = (skill.prescribedTools || []).some(prescribed => {
        const lower = prescribed.toLowerCase();
        return commandsRun.some(cmd => cmd.toLowerCase().includes(lower)) ||
               toolCalls.some(tc => tc.name.toLowerCase().includes(lower));
      });

      if (followedPrescribed) {
        status = 'FOLLOWED';
        explanation = `Agent properly leveraged prescribed tools for ${skill.name}.`;
      } else {
        const fb = evaluateFallbackSkillRules(skill, step, currentContext, {
          commandsRun,
          grepHitSourceFiles,
          editedSourceFiles,
          thinking,
          toolCalls
        });
        status = fb.status;
        explanation = fb.explanation;
        recommendation = fb.recommendation;
      }
    }

    matchedSkills.push({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      path: skill.path,
      status,
      triggerReasons: Array.from(new Set(triggerReasons)),
      explanation,
      recommendation
    });
  }

  // Determine overall audit badge for this step
  let auditStatus = 'GENERAL';
  if (matchedSkills.some(s => s.status === 'VIOLATION')) {
    auditStatus = 'VIOLATION';
  } else if (matchedSkills.some(s => s.status === 'MISSED_OPPORTUNITY')) {
    auditStatus = 'MISSED_OPPORTUNITY';
  } else if (matchedSkills.some(s => s.status === 'FOLLOWED')) {
    auditStatus = 'FOLLOWED';
  }

  return {
    matchedSkills,
    auditStatus
  };
}

/**
 * Records tool calls, updates context flags, and tallies tool frequencies.
 */
function recordToolUsage(step, context, trackers) {
  for (const tc of (step.toolCalls || [])) {
    trackers.totalToolCalls++;
    trackers.toolCounts[tc.name] = (trackers.toolCounts[tc.name] || 0) + 1;
    if (tc.name === 'run_command') {
      const cmd = tc.args?.CommandLine || '';
      if (/npm\s+test|node\s+--test/i.test(cmd)) {
        context.recentTestsRun = true;
      }
      if (/ast-outline|ast-inspect|run-analyzer|npm run (analyze|inspect|ast|lint)/i.test(cmd)) {
        context.astToolsUsed = true;
      }
    }
  }
}

/**
 * Evaluates skill adherence for a planner step and accumulates violations and missed opportunities.
 */
function recordSkillAdherence(step, consideration, skillEval, trackers) {
  for (const ms of skillEval.matchedSkills) {
    const details = consideration.tools.map(t => t.details).join('; ');
    if (ms.status === 'VIOLATION') {
      trackers.totalViolations++;
      trackers.violationsList.push({
        stepIndex: step.stepIndex,
        skillId: ms.id,
        skillName: ms.name,
        reason: ms.explanation,
        recommendation: ms.recommendation,
        details
      });
    } else if (ms.status === 'MISSED_OPPORTUNITY') {
      trackers.totalMissedOpportunities++;
      trackers.missedOpportunitiesList.push({
        stepIndex: step.stepIndex,
        skillId: ms.id,
        skillName: ms.name,
        reason: ms.explanation,
        recommendation: ms.recommendation,
        details
      });
    } else if (ms.status === 'FOLLOWED') {
      trackers.totalFollowedSkills++;
    }
  }
}

/**
 * Processes a single PLANNER_RESPONSE step, updating trackers and returning timeline item.
 */
function processPlannerStep(step, context, skills, trackers) {
  trackers.totalPlannerSteps++;
  const activity = categorizeActivity(step);
  const consideration = analyzeToolConsideration(step);

  recordToolUsage(step, context, trackers);

  const skillEval = evaluateSkillAdherence(step, context, skills);
  recordSkillAdherence(step, consideration, skillEval, trackers);

  return {
    stepIndex: step.stepIndex,
    type: 'PLANNER_RESPONSE',
    source: step.source,
    timestamp: step.createdAt,
    activity,
    consideration,
    thinking: step.thinking,
    toolCalls: step.toolCalls,
    toolResults: step.toolResults || [],
    matchedSkills: skillEval.matchedSkills,
    auditStatus: skillEval.auditStatus,
    tokens: {
      input: step.inputTokens || 0,
      output: step.outputTokens || 0,
      cacheRead: step.cacheReadTokens || 0,
      total: (step.inputTokens || 0) + (step.outputTokens || 0) + (step.cacheReadTokens || 0)
    }
  };
}

/**
 * Main conversation analysis function.
 */
function analyzeConversation(transcriptData, options = {}) {
  const skills = options.skills || discoverSkills(options);
  const steps = transcriptData.steps || [];

  const timeline = [];
  const trackers = {
    toolCounts: {},
    totalUserInputs: 0,
    totalPlannerSteps: 0,
    totalToolCalls: 0,
    totalViolations: 0,
    totalMissedOpportunities: 0,
    totalFollowedSkills: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheReadTokens: 0,
    missedOpportunitiesList: [],
    violationsList: []
  };

  const context = {
    lastUserPrompt: '',
    recentTestsRun: false,
    lastCommandFailed: false,
    astToolsUsed: false
  };

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];

    trackers.totalInputTokens += s.inputTokens || 0;
    trackers.totalOutputTokens += s.outputTokens || 0;
    trackers.totalCacheReadTokens += s.cacheReadTokens || 0;

    if (s.type === 'USER_INPUT') {
      trackers.totalUserInputs++;
      context.lastUserPrompt = s.content || '';
      timeline.push({
        stepIndex: s.stepIndex,
        type: 'USER_INPUT',
        source: s.source,
        timestamp: s.createdAt,
        content: s.content,
        summary: 'User Request / Input',
        tokens: {
          input: s.inputTokens || 0,
          output: s.outputTokens || 0,
          cacheRead: s.cacheReadTokens || 0,
          total: (s.inputTokens || 0) + (s.outputTokens || 0) + (s.cacheReadTokens || 0)
        }
      });
      continue;
    }

    if (s.type === 'GENERIC' || s.type === 'SYSTEM_MESSAGE') {
      context.lastCommandFailed = Boolean(
        s.content && (s.content.includes('exited with code 1') || s.content.includes('Operation not permitted') || s.content.includes('Error:'))
      );
    }

    if (s.type === 'PLANNER_RESPONSE') {
      timeline.push(processPlannerStep(s, context, skills, trackers));
    }
  }

  const totalSkillEvaluations = trackers.totalFollowedSkills + trackers.totalMissedOpportunities + trackers.totalViolations;
  const adherenceScore = totalSkillEvaluations > 0
    ? Math.round((trackers.totalFollowedSkills / totalSkillEvaluations) * 100)
    : 100;

  const totalTokens = trackers.totalInputTokens + trackers.totalOutputTokens + trackers.totalCacheReadTokens;
  const cacheHitRate = (trackers.totalInputTokens + trackers.totalCacheReadTokens) > 0
    ? Math.round((trackers.totalCacheReadTokens / (trackers.totalInputTokens + trackers.totalCacheReadTokens)) * 1000) / 10
    : 0;

  return {
    metadata: {
      transcriptPath: transcriptData.transcriptPath,
      fullTranscriptPath: transcriptData.fullTranscriptPath,
      totalSteps: steps.length,
      totalUserInputs: trackers.totalUserInputs,
      totalPlannerSteps: trackers.totalPlannerSteps,
      totalToolCalls: trackers.totalToolCalls,
      totalSkillsEvaluated: totalSkillEvaluations,
      skillsFollowed: trackers.totalFollowedSkills,
      skillsMissed: trackers.totalMissedOpportunities,
      skillsViolated: trackers.totalViolations,
      adherenceScore,
      tokens: {
        inputTokens: trackers.totalInputTokens,
        outputTokens: trackers.totalOutputTokens,
        cacheReadTokens: trackers.totalCacheReadTokens,
        totalTokens,
        cacheHitRate
      }
    },
    toolCounts: trackers.toolCounts,
    availableSkillsCount: skills.length,
    availableSkills: skills.map(s => ({ id: s.id, name: s.name, description: s.description, path: s.path })),
    missedOpportunities: trackers.missedOpportunitiesList,
    violations: trackers.violationsList,
    timeline
  };
}

module.exports = {
  categorizeActivity,
  analyzeToolConsideration,
  evaluateSkillAdherence,
  analyzeConversation
};
