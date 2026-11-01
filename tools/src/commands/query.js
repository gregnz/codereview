const { computeSymbolBlastSummary } = require('../metrics/blast-scoring');

/**
 * Sanitizes search queries and extracts declaration keywords.
 * Tolerates queries like "class Ship", "function drawShip", "const FOO".
 *
 * @param {string} rawQuery - Input query string
 * @returns {{ cleanQuery: string, typeFilter: string|Array<string>|null }}
 */
function sanitizeQuery(rawQuery) {
  let target = (rawQuery || '').trim();
  let typeFilter = null;

  const declMatch = target.match(/^(?:class|function|method|enum|interface|type|const|let|var)\s+([A-Za-z0-9_$.*+?|()[\]{}^-]+)$/i);
  if (declMatch) {
    const keyword = target.split(/\s+/)[0].toLowerCase();
    target = declMatch[1];
    if (keyword === 'class') typeFilter = 'class';
    else if (keyword === 'function' || keyword === 'method') typeFilter = ['function', 'method'];
    else if (keyword === 'enum') typeFilter = 'enum';
  }

  return { cleanQuery: target, typeFilter };
}

/**
 * Searches the symbol catalog for items matching a query string.
 *
 * @param {string} rawQuery - Search pattern
 * @param {Object} blastIndex - Graph & catalog index
 * @param {Object} [options] - Output formatting options { json, limit }
 * @returns {Array<Object>} Matched symbols
 */
function runQueryCommand(rawQuery, blastIndex, options = {}) {
  const { cleanQuery, typeFilter } = sanitizeQuery(rawQuery);
  const asJson = Boolean(options.json);
  const limit = parseInt(options.limit || '35', 10);

  let matcher;
  try {
    matcher = new RegExp(cleanQuery, 'i');
  } catch {
    const qLower = cleanQuery.toLowerCase();
    matcher = { test: s => (s && s.toLowerCase().includes(qLower)) };
  }

  const matched = [];

  for (const [id, sym] of blastIndex.catalog.entries()) {
    if (typeFilter) {
      const allowedTypes = Array.isArray(typeFilter) ? typeFilter : [typeFilter];
      if (!allowedTypes.includes(sym.type)) continue;
    }

    if (matcher.test(sym.name) || matcher.test(id)) {
      const br = computeSymbolBlastSummary(id, blastIndex);
      matched.push({
        id,
        name: sym.name,
        type: sym.type,
        file: sym.file,
        lines: `L${sym.startLine}-L${sym.endLine}`,
        blastImpact: br.impact,
        risk: br.riskCategory,
        directCallers: br.directCallersCount || 0,
        transitiveReachability: br.transitiveReachability || 0
      });
    }
  }

  if (asJson) {
    console.log(JSON.stringify(matched, null, 2));
    return matched;
  }

  if (matched.length === 0) {
    console.log(`\nNo symbols matched "${rawQuery}".`);
    console.log(`💡 Suggestions:`);
    console.log(`- Symbol query matches identifier names with regex (e.g. "drawShip|ShipFactory").`);
    console.log(`- For natural language intent or bug routing, run:`);
    console.log(`    codereview concept "${rawQuery}"\n`);
    return matched;
  }

  console.log(`\nMatched ${matched.length} symbol(s) for "${rawQuery}":\n`);
  const displayed = matched.slice(0, limit);
  for (const m of displayed) {
    const loc = `${m.file}:${m.lines}`;
    console.log(`  ${loc.padEnd(52)} ${m.type.padEnd(9)} ${m.name.padEnd(28)} [${m.risk}, ${m.directCallers} callers]`);
  }

  if (matched.length > limit) {
    console.log(`\n  ... and ${matched.length - limit} more symbols (narrow query regex or pass --limit ${matched.length})`);
  }
  console.log('');

  return matched;
}

module.exports = {
  sanitizeQuery,
  runQueryCommand
};
