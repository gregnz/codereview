const path = require('node:path');
const { getLayerForFile } = require('../config/layers');
const { computeSymbolBlastSummary } = require('../metrics/blast-scoring');

function formatBlastLine(br) {
  if (br.directCount <= 0) return '';
  if (br.directCount <= 3) {
    const callersList = br.directCallers.map(cl => `\`${cl.callerName}\` (${cl.file}:L${cl.line})`).join(', ');
    return `    - 💥 *Blast Radius [${br.directCount} direct, ${br.transitiveCount} transitive callers]*: ${callersList}\n`;
  }
  return `    - 💥 *Blast Radius [Risk: ${br.riskCategory}]*: **${br.impact}**\n`;
}

function formatEnumsMarkdown(enums, blastIndex) {
  if (!enums || enums.length === 0) return '';
  let out = `**State Enums & Data Tables:**\n`;
  for (const e of enums) {
    const br = computeSymbolBlastSummary(e.id, blastIndex);
    const keysSummary = e.keys.length > 8 ? `${e.keys.slice(0, 8).join(', ')}, ... (${e.keys.length} total)` : e.keys.join(', ');
    out += `- \`${e.name}\` [L${e.startLine}-L${e.endLine}]: \`${keysSummary}\`\n`;
    if (br.directCount > 0) {
      out += `  - 💥 *Blast Radius: ${br.impact}*\n`;
    }
  }
  return out + '\n';
}

function formatMethodMarkdown(m, blastIndex) {
  const mDoc = m.comment ? ` — *${m.comment}*` : '';
  const mbr = computeSymbolBlastSummary(m.id, blastIndex);
  const monoBadge = m.isMonolithic ? ' 📏 [MONOLITHIC]' : '';
  const nestBadge = m.nestingDepth > 4 ? ` 🔄 [DEPTH ${m.nestingDepth}]` : '';

  let out = `  - \`${m.static ? 'static ' : ''}${m.name}${m.params}\` [L${m.startLine}-L${m.endLine}]${monoBadge}${nestBadge}${mDoc}\n`;
  out += formatBlastLine(mbr);
  return out;
}

function formatClassesMarkdown(classes, blastIndex) {
  if (!classes || classes.length === 0) return '';
  let out = `**Classes:**\n`;
  for (const c of classes) {
    const extStr = c.extends ? ` extends \`${c.extends}\`` : '';
    const docStr = c.comment ? ` — *${c.comment}*` : '';
    const classBr = computeSymbolBlastSummary(c.id, blastIndex);

    out += `- **\`${c.name}\`**${extStr} [L${c.startLine}-L${c.endLine}]${docStr}\n`;
    if (classBr.directCount > 0) {
      out += `  - 💥 *Class Blast Radius: ${classBr.impact}*\n`;
    }

    if (c.methods && c.methods.length > 0) {
      for (const m of c.methods) {
        out += formatMethodMarkdown(m, blastIndex);
      }
    }
  }
  return out + '\n';
}

function formatFunctionsMarkdown(functions, blastIndex) {
  if (!functions || functions.length === 0) return '';
  let out = `**Functions:**\n`;
  for (const f of functions) {
    const fDoc = f.comment ? ` — *${f.comment}*` : '';
    const fbr = computeSymbolBlastSummary(f.id, blastIndex);
    const monoBadge = f.isMonolithic ? ' 📏 [MONOLITHIC]' : '';
    const nestBadge = f.nestingDepth > 4 ? ` 🔄 [DEPTH ${f.nestingDepth}]` : '';

    out += `- \`${f.name}${f.params}\` [L${f.startLine}-L${f.endLine}]${monoBadge}${nestBadge}${fDoc}\n`;
    if (fbr.directCount > 0 && fbr.directCount <= 3) {
      const callersList = fbr.directCallers.map(cl => `\`${cl.callerName}\` (${cl.file}:L${cl.line})`).join(', ');
      out += `  - 💥 *Blast Radius [${fbr.directCount} direct, ${fbr.transitiveCount} transitive callers]*: ${callersList}\n`;
    } else if (fbr.directCount > 3) {
      out += `  - 💥 *Blast Radius [Risk: ${fbr.riskCategory}]*: **${fbr.impact}**\n`;
    }
  }
  return out + '\n';
}

function formatFileMarkdown(r, rootDir, blastIndex) {
  const relPath = path.relative(rootDir, r.filePath);
  let out = `### \`${relPath}\` (${r.lineCount} lines)\n\n`;
  out += formatEnumsMarkdown(r.symbols.enums, blastIndex);
  out += formatClassesMarkdown(r.symbols.classes, blastIndex);
  out += formatFunctionsMarkdown(r.symbols.functions, blastIndex);
  return out;
}

function formatConceptMapMarkdown(conceptMap) {
  if (!conceptMap || !conceptMap.catalog || conceptMap.catalog.size === 0) return '';
  
  const activeConcepts = Array.from(conceptMap.catalog.values())
    .filter(c => c.symbols.length > 0 || c.governingEnums.length > 0 || c.files.size > 0);

  if (activeConcepts.length === 0) return '';

  let out = `## Domain Concept & Intent Routing Index\n\n`;
  out += `*High-level semantic map bridging human developer terminology to underlying subsystems and code symbols.*\n\n`;
  out += `| Human Concept Domain | Subsystem Category | Governing Files | Key Enums & Canonical Symbols |\n`;
  out += `| :--- | :--- | :--- | :--- |\n`;

  for (const c of activeConcepts) {
    const filesList = Array.from(c.files).map(f => `\`${f}\``).slice(0, 3).join(', ');
    const enumsList = c.governingEnums.map(e => `\`${e.name}\``).slice(0, 2);
    const symsList = c.symbols.map(s => `\`${s.name}\``).slice(0, 3);
    const combined = [...enumsList, ...symsList].join(', ');

    out += `| **${c.name}** | ${c.category} | ${filesList || '-'} | ${combined || '-'} |\n`;
  }
  out += '\n';

  if (conceptMap.intersections && conceptMap.intersections.length > 0) {
    out += `> ⚡ **Key Cross-Concept Intersections (Common Bug Hotspots):**\n`;
    for (const inter of conceptMap.intersections.slice(0, 5)) {
      out += `> - \`${inter.source.id}\` (${inter.source.file}:L${inter.source.line}) ──[${inter.type}]──► \`${inter.target.id}\` (${inter.target.file}:L${inter.target.line})\n`;
      out += `>   *(${inter.conceptNames[0]} ──► ${inter.conceptNames[1]})*\n`;
    }
    out += '\n';
  }

  return out;
}

function formatSymbolsMarkdown(allFileResults, blastIndex, rootDir) {
  let md = `# Tree-Sitter AST Symbol Map & Multi-Hop Blast Radius Index\n\n`;
  md += `*Generated automatically by \`tools/ast-outline.js\` using Tree-Sitter GLR parsers.*\n`;
  md += `*Includes disambiguated caller resolution, multi-hop reachability, and architectural complexity hotspot ratings.*\n\n`;

  if (blastIndex && blastIndex.conceptMap) {
    md += formatConceptMapMarkdown(blastIndex.conceptMap);
  }

  // Group files by layer
  const layerGroups = new Map();
  for (const r of allFileResults) {
    const layer = getLayerForFile(r.filePath);
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer).push(r);
  }

  for (const [layerName, files] of layerGroups.entries()) {
    md += `## Subsystem Layer: ${layerName}\n\n`;
    for (const r of files) {
      md += formatFileMarkdown(r, rootDir, blastIndex);
    }
  }

  return md;
}

module.exports = {
  formatSymbolsMarkdown,
  formatFileMarkdown,
  formatClassesMarkdown,
  formatFunctionsMarkdown,
  formatEnumsMarkdown
};
