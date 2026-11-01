const REPORT_STYLES = `
  <style>
    :root {
      --bg: #090d16;
      --bg-panel: #0f172a;
      --bg-panel-alt: #131d35;
      --border: #1e293b;
      --border-focus: #38bdf8;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --accent-blue: #38bdf8;
      --accent-cyan: #22d3ee;
      --accent-purple: #c084fc;
      --success: #10b981;
      --warn: #f59e0b;
      --danger: #ef4444;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      font-size: 13px;
      line-height: 1.5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    header {
      background: var(--bg-panel);
      border-bottom: 1px solid var(--border);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand h1 {
      font-size: 16px;
      font-weight: 700;
      color: var(--accent-blue);
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-family: var(--font-mono);
    }

    .meta-tag {
      font-family: var(--font-mono);
      font-size: 11px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      color: var(--accent-blue);
      padding: 2px 8px;
      border-radius: 999px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Scorecard & Summary Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .card {
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .card .label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .card .value {
      font-size: 24px;
      font-weight: 700;
      font-family: var(--font-mono);
      color: #fff;
    }

    .score-green { color: var(--success) !important; }
    .score-amber { color: var(--warn) !important; }
    .score-red { color: var(--danger) !important; }

    /* Filter Bar */
    .filter-bar {
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .search-input, .select-input {
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      font-family: var(--font-sans);
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 6px;
      outline: none;
    }

    .search-input { min-width: 260px; }
    .search-input:focus, .select-input:focus { border-color: var(--border-focus); }

    /* Timeline Section */
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .step-card {
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: border-color 0.15s ease;
    }

    .step-card:hover {
      border-color: #334155;
    }

    .step-card.violation {
      border-left: 4px solid var(--danger);
    }

    .step-card.missed {
      border-left: 4px solid var(--warn);
    }

    .step-card.followed {
      border-left: 4px solid var(--success);
    }

    .step-card.user {
      border-left: 4px solid var(--accent-purple);
      background: #0d1222;
    }

    .step-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .step-badge-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge {
      font-family: var(--font-mono);
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-index { background: rgba(255,255,255,0.06); color: var(--text-muted); }
    .badge-user { background: rgba(192, 132, 252, 0.15); color: var(--accent-purple); }
    .badge-run { background: rgba(56, 189, 248, 0.15); color: var(--accent-blue); }
    .badge-view { background: rgba(34, 211, 238, 0.15); color: var(--accent-cyan); }
    .badge-edit { background: rgba(245, 158, 11, 0.15); color: var(--warn); }
    .badge-violation { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
    .badge-missed { background: rgba(245, 158, 11, 0.2); color: var(--warn); }
    .badge-followed { background: rgba(16, 185, 129, 0.2); color: var(--success); }

    .step-time {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-dim);
    }

    .activity-summary {
      font-weight: 600;
      font-size: 14px;
      color: #f1f5f9;
    }

    .thinking-box {
      background: var(--bg-panel-alt);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 12px;
    }

    .thinking-title {
      font-size: 11px;
      color: var(--accent-blue);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      font-weight: 600;
      font-family: var(--font-mono);
    }

    .command-box {
      background: #050811;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 12px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: #38bdf8;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    /* Skills Box */
    .skills-box {
      background: rgba(15, 23, 42, 0.6);
      border: 1px dashed var(--border);
      border-radius: 6px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skill-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .skill-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .skill-top {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .skill-link {
      font-weight: 600;
      color: var(--accent-cyan);
      text-decoration: none;
    }

    .skill-link:hover { text-decoration: underline; }

    .skill-desc {
      font-size: 12px;
      color: var(--text-muted);
    }

    .alert-box {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 11px;
      color: #fde68a;
    }

    .alert-box.violation {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }
  </style>
`;

const REPORT_LAYOUT = `
  <header>
    <div class="brand">
      <h1>Gemini Conversation & Skill Adherence Analyzer</h1>
      <span class="meta-tag" id="headerScore">Score: --%</span>
    </div>
    <div class="meta-tag" id="stepCounter">0 Steps Analyzed</div>
  </header>

  <div class="container">
    <!-- Top Metrics -->
    <div class="metrics-grid">
      <div class="card">
        <span class="label">Skill Adherence Score</span>
        <span class="value" id="cardScore">--%</span>
      </div>
      <div class="card">
        <span class="label">Total Planner Turns</span>
        <span class="value" id="cardPlanner">0</span>
      </div>
      <div class="card">
        <span class="label">Total Tool Calls</span>
        <span class="value" id="cardTools">0</span>
      </div>
      <div class="card">
        <span class="label">Total Tokens</span>
        <span class="value" id="cardTotalTokens">0</span>
      </div>
      <div class="card">
        <span class="label">Cache Read Tokens</span>
        <span class="value" style="color: var(--accent-cyan);" id="cardCacheTokens">0</span>
      </div>
      <div class="card">
        <span class="label">Input / Output Tokens</span>
        <span class="value" style="font-size: 18px; line-height: 1.6;" id="cardInOutTokens">0 / 0</span>
      </div>
      <div class="card">
        <span class="label">Skills Followed</span>
        <span class="value score-green" id="cardFollowed">0</span>
      </div>
      <div class="card">
        <span class="label">Missed Opportunities</span>
        <span class="value score-amber" id="cardMissed">0</span>
      </div>
      <div class="card">
        <span class="label">Rule Violations</span>
        <span class="value score-red" id="cardViolated">0</span>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-group">
        <input type="text" id="searchBox" class="search-input" placeholder="Search steps, commands, or thoughts...">
      </div>
      <div class="filter-group">
        <label class="label">Status:</label>
        <select id="statusFilter" class="select-input">
          <option value="ALL">All Steps</option>
          <option value="VIOLATION">Violations Only</option>
          <option value="MISSED_OPPORTUNITY">Missed Opportunities Only</option>
          <option value="FOLLOWED">Skills Followed</option>
          <option value="USER_INPUT">User Inputs</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="label">Tool:</label>
        <select id="toolFilter" class="select-input">
          <option value="ALL">All Tools</option>
        </select>
      </div>
    </div>

    <!-- Timeline of Steps -->
    <div class="timeline" id="timelineContainer"></div>
  </div>
`;

const SCRIPT_BODY = `
    function initDashboard() {
      const meta = DATA.metadata || {};
      const tok = meta.tokens || { totalTokens: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheHitRate: 0 };
      const scoreEl = document.getElementById('cardScore');
      const headerScore = document.getElementById('headerScore');
      const score = meta.adherenceScore ?? 100;

      scoreEl.textContent = score + '%';
      headerScore.textContent = 'Adherence: ' + score + '%';
      if (score >= 80) {
        scoreEl.className = 'value score-green';
      } else if (score >= 50) {
        scoreEl.className = 'value score-amber';
      } else {
        scoreEl.className = 'value score-red';
      }

      document.getElementById('stepCounter').textContent = meta.totalSteps + ' Steps (' + (tok.totalTokens ? tok.totalTokens.toLocaleString() : 0) + ' tokens)';
      document.getElementById('cardPlanner').textContent = meta.totalPlannerSteps || 0;
      document.getElementById('cardTools').textContent = meta.totalToolCalls || 0;
      document.getElementById('cardTotalTokens').textContent = (tok.totalTokens || 0).toLocaleString();
      document.getElementById('cardCacheTokens').textContent = (tok.cacheReadTokens || 0).toLocaleString() + ' (' + (tok.cacheHitRate || 0) + '% hit)';
      document.getElementById('cardInOutTokens').textContent = (tok.inputTokens || 0).toLocaleString() + ' in / ' + (tok.outputTokens || 0).toLocaleString() + ' out';
      document.getElementById('cardFollowed').textContent = meta.skillsFollowed || 0;
      document.getElementById('cardMissed').textContent = meta.skillsMissed || 0;
      document.getElementById('cardViolated').textContent = meta.skillsViolated || 0;

      // Populate tool filter dropdown
      const toolSelect = document.getElementById('toolFilter');
      Object.keys(DATA.toolCounts || {}).sort().forEach(tool => {
        const opt = document.createElement('option');
        opt.value = tool;
        opt.textContent = tool + ' (' + DATA.toolCounts[tool] + ')';
        toolSelect.appendChild(opt);
      });

      renderTimeline();

      document.getElementById('searchBox').addEventListener('input', renderTimeline);
      document.getElementById('statusFilter').addEventListener('change', renderTimeline);
      document.getElementById('toolFilter').addEventListener('change', renderTimeline);
    }

    function renderTimeline() {
      const container = document.getElementById('timelineContainer');
      container.innerHTML = '';

      const query = (document.getElementById('searchBox').value || '').toLowerCase();
      const statusFilter = document.getElementById('statusFilter').value;
      const toolFilter = document.getElementById('toolFilter').value;
      const timeline = DATA.timeline || [];

      timeline.forEach(item => {
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'USER_INPUT' && item.type !== 'USER_INPUT') return;
          if (statusFilter !== 'USER_INPUT' && item.auditStatus !== statusFilter) return;
        }

        if (toolFilter !== 'ALL') {
          const hasTool = (item.toolCalls || []).some(t => t.name === toolFilter);
          if (!hasTool) return;
        }

        if (query) {
          const text = JSON.stringify(item).toLowerCase();
          if (!text.includes(query)) return;
        }

        const card = document.createElement('div');
        let cardClass = 'step-card';
        if (item.type === 'USER_INPUT') cardClass += ' user';
        else if (item.auditStatus === 'VIOLATION') cardClass += ' violation';
        else if (item.auditStatus === 'MISSED_OPPORTUNITY') cardClass += ' missed';
        else if (item.auditStatus === 'FOLLOWED') cardClass += ' followed';
        card.className = cardClass;

        if (item.type === 'USER_INPUT') {
          card.innerHTML = \`
            <div class="step-header">
              <div class="step-badge-group">
                <span class="badge badge-index">Step \${item.stepIndex}</span>
                <span class="badge badge-user">User Request</span>
              </div>
              <span class="step-time">\${item.timestamp || ''}</span>
            </div>
            <div class="activity-summary">\${item.summary || 'User Request'}</div>
            <div class="command-box" style="color: #cbd5e1;">\${escapeHtml(item.content)}</div>
          \`;
        } else {
          const primaryTool = (item.toolCalls && item.toolCalls[0]) ? item.toolCalls[0].name : '';
          let toolBadgeClass = 'badge-run';
          if (primaryTool === 'view_file') toolBadgeClass = 'badge-view';
          if (primaryTool === 'replace_file_content' || primaryTool === 'write_to_file') toolBadgeClass = 'badge-edit';

          let auditBadge = '';
          if (item.auditStatus === 'VIOLATION') auditBadge = '<span class="badge badge-violation">Rule Violation</span>';
          else if (item.auditStatus === 'MISSED_OPPORTUNITY') auditBadge = '<span class="badge badge-missed">Missed Skill Opportunity</span>';
          else if (item.auditStatus === 'FOLLOWED') auditBadge = '<span class="badge badge-followed">Skill Followed</span>';

          let skillsHtml = '';
          if (item.matchedSkills && item.matchedSkills.length > 0) {
            skillsHtml = '<div class="skills-box">';
            item.matchedSkills.forEach(ms => {
              const fileLink = ms.path ? ('file://' + ms.path) : '#';
              let badge = '<span class="badge badge-followed">Followed</span>';
              let alert = '';
              if (ms.status === 'VIOLATION') {
                badge = '<span class="badge badge-violation">Violation</span>';
                alert = \`<div class="alert-box violation"><strong>Caution:</strong> \${escapeHtml(ms.explanation)}<br><strong>Recommendation:</strong> \${escapeHtml(ms.recommendation)}</div>\`;
              } else if (ms.status === 'MISSED_OPPORTUNITY') {
                badge = '<span class="badge badge-missed">Missed Opportunity</span>';
                alert = \`<div class="alert-box"><strong>Notice:</strong> \${escapeHtml(ms.explanation)}<br><strong>Recommendation:</strong> \${escapeHtml(ms.recommendation)}</div>\`;
              }

              skillsHtml += \`
                <div class="skill-item">
                  <div class="skill-top">
                    <a href="\${fileLink}" class="skill-link" target="_blank">\${escapeHtml(ms.name)}</a>
                    \${badge}
                  </div>
                  <div class="skill-desc">\${escapeHtml(ms.description)}</div>
                  \${alert}
                </div>
              \`;
            });
            skillsHtml += '</div>';
          }

          let thinkingSnippet = '';
          if (item.thinking) {
            thinkingSnippet = \`
              <div class="thinking-box">
                <div class="thinking-title">Agent Thinking & Tool Consideration (Why)</div>
                <div>\${escapeHtml(item.consideration?.rationale || item.thinking.slice(0, 300))}</div>
              </div>
            \`;
          }

          let toolCallsHtml = '';
          (item.toolCalls || []).forEach(tc => {
            const cmd = tc.args?.CommandLine || tc.args?.AbsolutePath || tc.args?.TargetFile || JSON.stringify(tc.args);
            toolCallsHtml += \`<div class="command-box"><strong>[\${escapeHtml(tc.name)}]</strong> \${escapeHtml(cmd)}</div>\`;
          });

          let tokensBadge = '';
          if (item.tokens && item.tokens.total > 0) {
            tokensBadge = \`<span class="badge" style="background: rgba(148, 163, 184, 0.12); color: #94a3b8;" title="Input: \${item.tokens.input.toLocaleString()} | Output: \${item.tokens.output.toLocaleString()} | Cache Read: \${item.tokens.cacheRead.toLocaleString()}">\${item.tokens.total.toLocaleString()} tokens</span>\`;
          }

          card.innerHTML = \`
            <div class="step-header">
              <div class="step-badge-group">
                <span class="badge badge-index">Step \${item.stepIndex}</span>
                <span class="badge \${toolBadgeClass}">\${escapeHtml(primaryTool || item.activity?.type || 'STEP')}</span>
                \${tokensBadge}
                \${auditBadge}
              </div>
              <span class="step-time">\${item.timestamp || ''}</span>
            </div>
            <div class="activity-summary">\${escapeHtml(item.activity?.summary || 'Executing step')}</div>
            \${thinkingSnippet}
            \${toolCallsHtml}
            \${skillsHtml}
          \`;
        }

        container.appendChild(card);
      });
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    window.addEventListener('DOMContentLoaded', initDashboard);
`;

/**
 * Builds the embedded client script tag.
 */
function buildClientScript(dataJson) {
  return '<script>\nconst DATA = ' + dataJson + ';\n' + SCRIPT_BODY + '\n</script>';
}

/**
 * Generates a self-contained, interactive HTML dashboard for Gemini conversation analysis.
 */
function generateHtmlReport(analysisResult) {
  const dataJson = JSON.stringify(analysisResult);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gemini Conversation & Skill Adherence Analyzer</title>
  ${REPORT_STYLES}
</head>
<body>
  ${REPORT_LAYOUT}
  ${buildClientScript(dataJson)}
</body>
</html>`;
}

module.exports = {
  generateHtmlReport
};
