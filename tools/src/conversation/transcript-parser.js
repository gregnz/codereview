const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

/**
 * Resolves candidate transcript paths within a directory.
 */
function resolveFromDirectory(dir) {
  const candidate1 = path.join(dir, 'transcript.jsonl');
  if (fs.existsSync(candidate1)) return candidate1;
  const candidate2 = path.join(dir, '.system_generated', 'logs', 'transcript.jsonl');
  if (fs.existsSync(candidate2)) return candidate2;
  return null;
}

/**
 * Discovers the most recently modified conversation transcript in the user's brain directory.
 */
function findLatestBrainConversation() {
  const baseBrainDir = path.join(os.homedir(), '.gemini/antigravity/brain');
  if (!fs.existsSync(baseBrainDir)) return null;

  try {
    const entries = fs.readdirSync(baseBrainDir, { withFileTypes: true });
    let latestPath = null;
    let latestMtime = 0;

    for (const ent of entries) {
      if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
      const cand = path.join(baseBrainDir, ent.name, '.system_generated', 'logs', 'transcript.jsonl');
      if (fs.existsSync(cand)) {
        try {
          const stat = fs.statSync(cand);
          if (stat.mtimeMs > latestMtime) {
            latestMtime = stat.mtimeMs;
            latestPath = cand;
          }
        } catch {
          // ignore unreadable entries
        }
      }
    }
    return latestPath;
  } catch {
    return null;
  }
}

/**
 * Resolves the transcript and full transcript file paths based on inputs.
 */
function resolveTranscriptPath(targetPath, options = {}) {
  let mainPath = null;
  let fullPath = null;

  if (targetPath) {
    const resolved = path.resolve(targetPath);
    if (fs.existsSync(resolved)) {
      const stat = fs.statSync(resolved);
      mainPath = stat.isDirectory() ? resolveFromDirectory(resolved) : resolved;
    } else {
      // Check if targetPath was supplied directly as a conversation ID
      const brainDir = path.join(os.homedir(), '.gemini/antigravity/brain', targetPath, '.system_generated', 'logs');
      const cand = path.join(brainDir, 'transcript.jsonl');
      if (fs.existsSync(cand)) {
        mainPath = cand;
      }
    }
  }

  // Fallback to conversation ID option, environment variable, or latest brain directory
  if (!mainPath) {
    const convId = options.conversationId || process.env.CONVERSATION_ID;
    if (convId) {
      const brainDir = path.join(os.homedir(), '.gemini/antigravity/brain', convId, '.system_generated', 'logs');
      const cand = path.join(brainDir, 'transcript.jsonl');
      if (fs.existsSync(cand)) {
        mainPath = cand;
      }
    } else {
      mainPath = findLatestBrainConversation();
    }
  }

  if (mainPath) {
    const dir = path.dirname(mainPath);
    const candidateFull = path.join(dir, 'transcript_full.jsonl');
    if (fs.existsSync(candidateFull)) {
      fullPath = candidateFull;
    }
  }

  return { mainPath, fullPath };
}

/**
 * Safely parses JSON argument values (handles stringified JSON).
 */
function parseToolArgs(rawArgs) {
  if (!rawArgs) return {};
  if (typeof rawArgs === 'object') {
    const normalized = {};
    for (const [k, v] of Object.entries(rawArgs)) {
      if (typeof v === 'string') {
        try {
          // If string is wrapped in quotes or JSON stringified
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith('{') && v.endsWith('}'))) {
            normalized[k] = JSON.parse(v);
          } else {
            normalized[k] = v;
          }
        } catch (_) {
          normalized[k] = v;
        }
      } else {
        normalized[k] = v;
      }
    }
    return normalized;
  }
  return {};
}

/**
 * Parses a Markdown-formatted conversation transcript (e.g. exported "## User" / "## Assistant" logs).
 */
function parseMarkdownToolCall(headerRaw, bodyRaw) {
  const header = headerRaw.trim().replace(/\\_/g, '_');
  const body = (bodyRaw || '').trim();

  // 1. Regex search across files
  const searchMatch = header.match(/^Search files for regex\s+`?([^`]+)`?$/i);
  if (searchMatch) {
    const query = searchMatch[1];
    const matchedFiles = Array.from(body.matchAll(/file:\/\/([^\s#]+)/g)).map(m => m[1]);
    return {
      name: 'grep_search',
      args: {
        Query: query,
        CommandLine: `grep_search "${query}"`,
        MatchedFiles: matchedFiles,
        toolAction: `Search files for regex \`${query}\``,
        toolSummary: `Search files for regex ${query}`
      },
      toolAction: `Search files for regex \`${query}\``,
      toolSummary: `Search files for regex ${query}`
    };
  }

  // 2. Read file
  const readMatch = header.match(/^Read file\s+`?([^`]+)`?(?:\s+\(([^)]+)\))?$/i);
  if (readMatch) {
    const filePath = readMatch[1].trim();
    return {
      name: 'view_file',
      args: {
        AbsolutePath: filePath,
        toolAction: `Read file \`${filePath}\``,
        toolSummary: `Read file ${filePath}`
      },
      toolAction: `Read file \`${filePath}\``,
      toolSummary: `Read file ${filePath}`
    };
  }

  // 3. List directory
  const listMatch = header.match(/^List the\s+`?([^`]+)`?\s+directory/i);
  if (listMatch) {
    const dirPath = listMatch[1].trim();
    return {
      name: 'list_dir',
      args: {
        DirectoryPath: dirPath,
        toolAction: `List directory \`${dirPath}\``,
        toolSummary: `List directory ${dirPath}`
      },
      toolAction: `List directory \`${dirPath}\``,
      toolSummary: `List directory ${dirPath}`
    };
  }

  // 4. Diff / file edit block
  const diffMatch = body.match(/Diff:\s*([^\n]+)/);
  if (diffMatch) {
    const targetFile = diffMatch[1].trim();
    return {
      name: 'replace_file_content',
      args: {
        TargetFile: targetFile,
        toolAction: `Edited \`${targetFile}\``,
        toolSummary: `Edited ${targetFile}`
      },
      toolAction: `Edited \`${targetFile}\``,
      toolSummary: `Edited ${targetFile}`
    };
  }

  // 5. Path / glob matches
  if (/^\d+\s+matches$/i.test(header)) {
    return {
      name: 'find_by_name',
      args: {
        toolAction: `Find files (${header})`,
        toolSummary: `Find files (${header})`
      },
      toolAction: `Find files (${header})`,
      toolSummary: `Find files (${header})`
    };
  }

  // 6. Shell command execution (Terminal block or command header)
  if (body.includes('Terminal:') || /^(git|node|npm|npx|sh|bash|python|cargo|go)\b/i.test(header)) {
    return {
      name: 'run_command',
      args: {
        CommandLine: header,
        toolAction: `Ran \`${header}\``,
        toolSummary: header
      },
      toolAction: `Ran \`${header}\``,
      toolSummary: header
    };
  }

  return {
    name: 'tool_call',
    args: {
      CommandLine: header,
      toolAction: header,
      toolSummary: header
    },
    toolAction: header,
    toolSummary: header
  };
}

function parseMarkdownTranscript(rawText, mainPath) {
  const steps = [];
  const sectionRegex = /^##\s+(User|Assistant)\b[^\n]*$/gm;
  const matches = Array.from(rawText.matchAll(sectionRegex));

  let stepIdx = 0;
  for (let i = 0; i < matches.length; i++) {
    const role = matches[i][1];
    const startIdx = matches[i].index + matches[i][0].length;
    const endIdx = (i + 1 < matches.length) ? matches[i + 1].index : rawText.length;
    const sectionBody = rawText.slice(startIdx, endIdx).trim();

    if (role === 'User') {
      steps.push({
        stepIndex: stepIdx++,
        source: 'USER_EXPLICIT',
        type: 'USER_INPUT',
        status: 'DONE',
        createdAt: null,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        thinking: '',
        content: sectionBody,
        toolCalls: [],
        raw: { role: 'User', content: sectionBody }
      });
      continue;
    }

    // Assistant section
    let thinking = '';
    const thinkMatch = sectionBody.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    if (thinkMatch) {
      thinking = thinkMatch[1].trim();
    }

    const withoutThinking = sectionBody.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
    const toolHeaderRegex = /\*\*Tool Call:\s*([^\n*]+)\*\*/g;
    const toolMatches = Array.from(withoutThinking.matchAll(toolHeaderRegex));

    const toolCalls = [];
    const toolResults = [];
    let proseContent = withoutThinking;

    if (toolMatches.length > 0) {
      proseContent = withoutThinking.slice(0, toolMatches[0].index).trim();
      for (let t = 0; t < toolMatches.length; t++) {
        const headerRaw = toolMatches[t][1];
        const tStart = toolMatches[t].index + toolMatches[t][0].length;
        const tEnd = (t + 1 < toolMatches.length) ? toolMatches[t + 1].index : withoutThinking.length;
        const tBody = withoutThinking.slice(tStart, tEnd).trim();

        const tc = parseMarkdownToolCall(headerRaw, tBody);
        toolCalls.push(tc);
        if (tBody) {
          toolResults.push({
            stepIndex: stepIdx,
            source: 'TOOL',
            content: tBody.slice(0, 2000)
          });
        }
      }
    }

    steps.push({
      stepIndex: stepIdx++,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      status: 'DONE',
      createdAt: null,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      thinking,
      content: proseContent,
      toolCalls,
      toolResults,
      raw: { role: 'Assistant', thinking, toolCallsCount: toolCalls.length }
    });
  }

  return {
    transcriptPath: mainPath,
    fullTranscriptPath: null,
    totalSteps: steps.length,
    steps
  };
}

/**
 * Parses transcript lines into normalized step objects.
 */
function parseTranscript(targetPath, options = {}) {
  const { mainPath, fullPath } = resolveTranscriptPath(targetPath, options);

  if (!mainPath || !fs.existsSync(mainPath)) {
    throw new Error(`Transcript file not found: ${targetPath || '(no path provided)'}`);
  }

  const rawContent = fs.readFileSync(mainPath, 'utf8');
  if (mainPath.endsWith('.md') || /^##\s+(User|Assistant)\b/m.test(rawContent)) {
    return parseMarkdownTranscript(rawContent, mainPath);
  }

  const rawLines = rawContent.trim().split('\n').filter(Boolean);
  let fullLines = null;
  if (fullPath && fs.existsSync(fullPath)) {
    try {
      fullLines = fs.readFileSync(fullPath, 'utf8').trim().split('\n').filter(Boolean);
    } catch (_) {
      fullLines = null;
    }
  }

  const steps = [];

  for (let i = 0; i < rawLines.length; i++) {
    try {
      let entry = JSON.parse(rawLines[i]);

      // Check if entry has truncated fields and we have full lines
      if (entry.truncated_fields && Array.isArray(entry.truncated_fields) && fullLines && fullLines[i]) {
        try {
          const fullEntry = JSON.parse(fullLines[i]);
          for (const field of entry.truncated_fields) {
            if (fullEntry[field] !== undefined) {
              entry[field] = fullEntry[field];
            }
          }
        } catch (_) {
          // keep compact entry
        }
      }

      const toolCalls = (entry.tool_calls || []).map(tc => {
        const parsedArgs = parseToolArgs(tc.args);
        return {
          name: tc.name,
          args: parsedArgs,
          toolAction: parsedArgs.toolAction || '',
          toolSummary: parsedArgs.toolSummary || ''
        };
      });

      steps.push({
        stepIndex: entry.step_index !== undefined ? entry.step_index : i,
        source: entry.source || 'UNKNOWN',
        type: entry.type || 'UNKNOWN',
        status: entry.status || 'DONE',
        createdAt: entry.created_at || null,
        inputTokens: entry.input_tokens || 0,
        outputTokens: entry.output_tokens || 0,
        cacheReadTokens: entry.cache_read_tokens || 0,
        thinking: entry.thinking || '',
        content: entry.content || '',
        toolCalls,
        raw: entry
      });
    } catch (err) {
      // skip unparseable lines
    }
  }

  // Correlate tool calls with subsequent result outputs
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s.type === 'PLANNER_RESPONSE' && s.toolCalls.length > 0) {
      // Look ahead for tool output in subsequent steps
      const results = [];
      let j = i + 1;
      while (j < steps.length && steps[j].type !== 'PLANNER_RESPONSE' && steps[j].type !== 'USER_INPUT') {
        if (steps[j].content) {
          results.push({
            stepIndex: steps[j].stepIndex,
            source: steps[j].source,
            content: steps[j].content
          });
        }
        j++;
      }
      s.toolResults = results;
    }
  }

  return {
    transcriptPath: mainPath,
    fullTranscriptPath: fullPath,
    totalSteps: steps.length,
    steps
  };
}

module.exports = {
  resolveTranscriptPath,
  parseToolArgs,
  parseTranscript
};
