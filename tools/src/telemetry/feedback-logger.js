const fs = require('node:fs');
const path = require('node:path');

const FEEDBACK_DIR = '.codereview';
const FEEDBACK_FILE = 'feedback.jsonl';

/**
 * Resolves the path to the feedback log file.
 */
function getFeedbackFilePath(rootDir = process.cwd()) {
  return path.join(rootDir, FEEDBACK_DIR, FEEDBACK_FILE);
}

/**
 * Appends a telemetry or feedback event to the feedback log in a non-blocking, fault-tolerant manner.
 */
function logTelemetryEvent(rootDir, event) {
  try {
    const feedbackDir = path.join(rootDir, FEEDBACK_DIR);
    if (!fs.existsSync(feedbackDir)) {
      fs.mkdirSync(feedbackDir, { recursive: true });
    }

    const logPath = path.join(feedbackDir, FEEDBACK_FILE);
    const entry = {
      timestamp: new Date().toISOString(),
      ...event
    };

    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
    return true;
  } catch {
    // Telemetry must never crash or block core execution
    return false;
  }
}

/**
 * Reads and parses all recorded feedback events from the project root.
 */
function readFeedbackEvents(rootDir = process.cwd()) {
  const logPath = getFeedbackFilePath(rootDir);
  if (!fs.existsSync(logPath)) return [];

  try {
    const content = fs.readFileSync(logPath, 'utf8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Tokenizes natural language query strings into stemmed/cleaned candidate taxonomy keywords.
 */
function extractCandidateKeywords(query) {
  if (!query || typeof query !== 'string') return [];
  const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'how', 'what', 'where']);
  return query
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && !STOP_WORDS.has(word));
}

/**
 * Analyzes recorded feedback events to extract patterns, missing taxonomy terms, and failure clusters.
 */
function summarizeFeedback(rootDir = process.cwd()) {
  const events = readFeedbackEvents(rootDir);

  const byType = {
    EMPTY_CONCEPT: [],
    EMPTY_QUERY: [],
    UNKNOWN_SYMBOL: [],
    EXECUTION_ERROR: [],
    AGENT_FEEDBACK: [],
    FALLBACK_TO_GREP: []
  };

  const candidateKeywordsMap = new Map();

  for (const ev of events) {
    if (byType[ev.type]) {
      byType[ev.type].push(ev);
    }

    if (ev.type === 'EMPTY_CONCEPT' || ev.type === 'EMPTY_QUERY' || ev.type === 'AGENT_FEEDBACK') {
      const tokens = extractCandidateKeywords(ev.input || ev.query || '');
      for (const tok of tokens) {
        candidateKeywordsMap.set(tok, (candidateKeywordsMap.get(tok) || 0) + 1);
      }
    }
  }

  const topMissingKeywords = Array.from(candidateKeywordsMap.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const recommendations = [];

  if (byType.EMPTY_CONCEPT.length > 0) {
    recommendations.push(
      `${byType.EMPTY_CONCEPT.length} concept queries returned 0 results. Consider expanding taxonomy keywords in codereview.config.json.`
    );
  }

  if (byType.EMPTY_QUERY.length > 0) {
    recommendations.push(
      `${byType.EMPTY_QUERY.length} symbol queries found 0 matches. Verify case-sensitivity or check if target files are ignored.`
    );
  }

  if (byType.UNKNOWN_SYMBOL.length > 0) {
    recommendations.push(
      `${byType.UNKNOWN_SYMBOL.length} blast radius lookups targeted unknown symbols. Verify method qualified naming format (e.g. Class.method).`
    );
  }

  if (byType.EXECUTION_ERROR.length > 0) {
    recommendations.push(
      `${byType.EXECUTION_ERROR.length} execution errors occurred. Check syntax errors or file permission restrictions.`
    );
  }

  return {
    totalEvents: events.length,
    countsByType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length])),
    topMissingKeywords,
    recentEvents: events.slice(-10).reverse(),
    recommendations
  };
}

/**
 * Applies suggestions derived from feedback directly to codereview.config.json.
 */
function applyTaxonomyImprovements(rootDir = process.cwd()) {
  const summary = summarizeFeedback(rootDir);
  const configPath = path.join(rootDir, 'codereview.config.json');

  if (summary.topMissingKeywords.length === 0) {
    return { applied: false, reason: 'No candidate keywords recorded in feedback.' };
  }

  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      return { applied: false, reason: 'Failed to parse existing codereview.config.json.' };
    }
  }

  if (!config.concepts || !Array.isArray(config.concepts)) {
    config.concepts = [];
  }

  // Find or create a 'discovered_vocabulary' concept group
  let targetConcept = config.concepts.find(c => c.id === 'discovered_vocabulary' || c.id === 'domain_terms');
  if (!targetConcept) {
    targetConcept = {
      id: 'discovered_vocabulary',
      name: 'Discovered Domain Vocabulary',
      category: 'Domain / Discovered',
      description: 'Automatically discovered keywords from developer and agent query feedback.',
      keywords: []
    };
    config.concepts.push(targetConcept);
  }

  const existingKeywords = new Set(targetConcept.keywords || []);
  let addedCount = 0;

  for (const { keyword } of summary.topMissingKeywords) {
    if (!existingKeywords.has(keyword)) {
      existingKeywords.add(keyword);
      addedCount++;
    }
  }

  targetConcept.keywords = Array.from(existingKeywords);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');

  return {
    applied: true,
    addedKeywordsCount: addedCount,
    updatedConceptId: targetConcept.id,
    newKeywords: summary.topMissingKeywords.map(k => k.keyword)
  };
}

module.exports = {
  getFeedbackFilePath,
  logTelemetryEvent,
  readFeedbackEvents,
  summarizeFeedback,
  applyTaxonomyImprovements
};
