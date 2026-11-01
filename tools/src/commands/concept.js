const { queryConcepts } = require('../graph/concept-builder');

/**
 * Formats concept resolution diagnostics for CLI stdout.
 */
function formatConceptOutput(result) {
  let out = `\n================================================================================\n`;
  out += `  🧠 Human Concept Map & Domain Diagnostics\n`;
  out += `================================================================================\n\n`;
  out += `Query: "${result.query}"\n`;
  out += `Tokens Analyzed: [${result.queryTokens.join(', ')}]\n\n`;

  if ((!result.matchedConcepts || result.matchedConcepts.length === 0) &&
      (!result.directSymbolMatches || result.directSymbolMatches.length === 0)) {
    out += `⚠️  No high-confidence domain concepts or symbols matched the query tokens.\n`;
    out += `   Try query terms like: mission, contract, waypoint, enemy, friendly, crash, weapon, ship, ai.\n`;
    out += `================================================================================\n`;
    return out;
  }

  if (result.matchedConcepts && result.matchedConcepts.length > 0) {
    out += `📍 Matched Domain Concepts:\n`;
    for (const c of result.matchedConcepts) {
      out += `  • ${c.name} (Matched: ${c.matchedTokens.join(', ')})\n`;
      out += `    - Category: ${c.category}\n`;
      out += `    - Description: ${c.description}\n`;
      if (c.governingEnums && c.governingEnums.length > 0) {
        const enumNames = c.governingEnums.slice(0, 4).map(e => `${e.name} (${e.file})`).join(', ');
        out += `    - Governing Enums / State Tables: ${enumNames}\n`;
      }
      if (c.governingFiles && c.governingFiles.length > 0) {
        out += `    - Key Files: ${c.governingFiles.slice(0, 3).join(', ')}${c.governingFiles.length > 3 ? '...' : ''}\n`;
      }
    }
  }

  if (result.directSymbolMatches && result.directSymbolMatches.length > 0) {
    out += `\n🔎 Top Matching Symbols (Direct AST Lookup — Slice These Line Ranges):\n`;
    result.directSymbolMatches.slice(0, 8).forEach((sm, idx) => {
      out += `  ${idx + 1}. \`${sm.name}\` [${sm.type}] — \`${sm.file}:L${sm.startLine}-L${sm.endLine}\` (Matched: ${sm.matchedTerms.join(', ')})\n`;
    });
  }

  out += `\n🎯 Likely Code Locations (Ranked by Subsystem & Token Relevance):\n`;
  result.prioritizedFiles.slice(0, 6).forEach((pf, idx) => {
    out += `  ${idx + 1}. \`${pf.file}\` [Layer: ${pf.layer}] (Relevance Score: ${pf.score})\n`;
  });

  if (result.relevantIntersections && result.relevantIntersections.length > 0) {
    out += `\n⚡ Cross-Concept Intersections (Key Bridging Call Sites to Inspect):\n`;
    for (const inter of result.relevantIntersections.slice(0, 5)) {
      out += `  • \`${inter.source.id}\` (${inter.source.file}:L${inter.source.line})\n`;
      out += `    ──[${inter.type}]──► \`${inter.target.id}\` (${inter.target.file}:L${inter.target.line})\n`;
      out += `    [${inter.conceptNames[0]} ──► ${inter.conceptNames[1]}]\n`;
    }
  }

  // Actionable Primary Hypothesis for the Agent
  out += `\n💡 Primary Diagnostic Hypothesis for AI Agent:\n`;
  const conceptNames = result.matchedConcepts.map(c => c.name);
  if (conceptNames.some(n => n.includes('Affiliation')) && conceptNames.some(n => n.includes('Collision'))) {
    out += `  This issue involves collision/avoidance steering failing to correctly\n`;
    out += `  distinguish or query entity affiliation (friendly vs enemy).\n`;
    out += `  Inspect steering separation forces and hostile/friendly predicate checks.\n`;
  } else {
    out += `  Inspect the prioritized files and cross-concept call sites listed above.\n`;
  }

  out += `================================================================================\n`;
  return out;
}

/**
 * Executes the concept query command, supporting human-readable output and JSON.
 */
function runConceptCommand(conceptQuery, blastIndex, options = {}) {
  if (!blastIndex || !blastIndex.conceptMap) {
    throw new Error('Concept Map has not been built in blastIndex.');
  }

  const result = queryConcepts(conceptQuery, blastIndex.conceptMap, blastIndex);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  const formatted = formatConceptOutput(result);
  console.log(formatted);
  return result;
}

module.exports = {
  runConceptCommand,
  formatConceptOutput
};
