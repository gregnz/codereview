const path = require('node:path');
const { getLayerDetails } = require('../config/layers');

/**
 * Runs the static code complexity and architectural hotspot linter.
 */
function runLintCommand(allFileResults, blastIndex, rootDir) {
  const projName = path.basename(rootDir);
  console.log('========================================================');
  console.log(`   ${projName} Architecture & Complexity Scorecard    `);
  console.log('========================================================\n');

  let hotspotCount = 0;
  for (const r of allFileResults) {
    const rel = path.relative(rootDir, r.filePath);
    const warnings = [];

    for (const f of r.symbols.functions) {
      if (f.isMonolithic) warnings.push({ type: 'MONOLITHIC', name: f.name, loc: f.loc, line: f.startLine });
      if (f.nestingDepth > 4) warnings.push({ type: 'NESTING', name: f.name, depth: f.nestingDepth, line: f.startLine });
    }

    for (const c of r.symbols.classes) {
      for (const m of c.methods) {
        if (m.isMonolithic) warnings.push({ type: 'MONOLITHIC', name: `${c.name}.${m.name}`, loc: m.loc, line: m.startLine });
        if (m.nestingDepth > 4) warnings.push({ type: 'NESTING', name: `${c.name}.${m.name}`, depth: m.nestingDepth, line: m.startLine });
      }
    }

    if (warnings.length > 0) {
      console.log(`📁 ${rel} (${r.lineCount} lines):`);
      for (const w of warnings) {
        hotspotCount++;
        if (w.type === 'MONOLITHIC') {
          console.log(`   📏 [MONOLITHIC] '${w.name}' is ${w.loc} lines long [L${w.line}]`);
        } else {
          console.log(`   🔄 [NESTING] '${w.name}' has deep block nesting (${w.depth} levels) [L${w.line}]`);
        }
      }
      console.log('');
    }
  }

  console.log(`Total code-level complexity warnings: ${hotspotCount}\n`);

  if (blastIndex.layerViolations && blastIndex.layerViolations.length > 0) {
    console.log('--------------------------------------------------------');
    console.log('   🚨 Architectural Layer Boundary Violations           ');
    console.log('--------------------------------------------------------\n');
    const unclassifiedFiles = new Map();

    for (const v of blastIndex.layerViolations) {
      console.log(`   ⚠️  ${v.sourceFile}:L${v.line} '${v.sourceName}' (${v.sourceLayer}) calls '${v.targetName}' (${v.targetLayer}) [${v.type}]`);
      const sDetails = getLayerDetails(v.sourceFile);
      const tDetails = getLayerDetails(v.targetFile);
      if (sDetails.source === 'fallback_unclassified') {
        unclassifiedFiles.set(v.sourceFile, v.sourceLayer);
      }
      if (tDetails.source === 'fallback_unclassified') {
        unclassifiedFiles.set(v.targetFile, v.targetLayer);
      }
    }
    console.log(`\nTotal architectural layer breaches: ${blastIndex.layerViolations.length}\n`);

    console.log('💡 Architectural Layer Remediation Guide:');
    console.log('   Layer definitions are configured in codereview.config.json (or codereview.config.js).');
    if (unclassifiedFiles.size > 0) {
      console.log('\n   The following files are UNCLASSIFIED and defaulted to "Domain Logic":');
      for (const [file, defLayer] of unclassifiedFiles.entries()) {
        console.log(`   - ${file} (defaulted to '${defLayer}')`);
      }
      console.log('\n   To classify them:');
      console.log('   1. Run CLI command:');
      const firstFile = Array.from(unclassifiedFiles.keys())[0];
      console.log(`      codereview classify ${firstFile} "Entities & Physics"`);
      console.log('   2. Or add filename directly to layers in codereview.config.json.\n');
    } else {
      console.log('   If this layer inversion is intentional:');
      console.log('   1. Adjust layer ranking in codereview.config.json under "layerRanks"');
      console.log('   2. Or decouple using event messages (SignalBus, EventTarget, or callback).\n');
    }
  }

  if (blastIndex.cycles && blastIndex.cycles.length > 0) {
    console.log('--------------------------------------------------------');
    console.log('   🔄 Circular Dependency Cycles                        ');
    console.log('--------------------------------------------------------\n');
    blastIndex.cycles.forEach((cycle, i) => {
      const names = cycle.map(id => blastIndex.catalog.get(id)?.name || id).join(' ➔ ');
      console.log(`   Cycle #${i + 1}: ${names} ➔ (loops back)`);
    });
    console.log(`\nTotal cycles detected: ${blastIndex.cycles.length}\n`);
  }
}

module.exports = {
  runLintCommand
};
