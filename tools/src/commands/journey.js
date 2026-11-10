const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { compareJourneySnapshots } = require('../graph/journey');
const { compareJourneyFacts } = require('../parser/journey-facts');

function validateItems(items, kind) {
  const seen = new Set();
  for (const item of items) {
    if (!item.id || !item.title || seen.has(item.id)) throw new Error(`Invalid or duplicate ${kind} id: ${item.id}`);
    seen.add(item.id);
    validateEvidence(item.evidence);
  }
}

function readManifest(filePath) {
  const manifest = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(manifest.journeys) || (manifest.components && !Array.isArray(manifest.components))) {
    throw new Error('Journey manifest must contain a journeys array and an optional components array');
  }
  validateItems(manifest.journeys, 'journey');
  validateItems(manifest.components || [], 'component');
  for (const journey of manifest.journeys) {
    if (!Array.isArray(journey.steps)) throw new Error(`Journey ${journey.id} must contain a steps array`);
    validateItems(journey.steps, `step in ${journey.id}`);
  }
  return manifest;
}

function validateEvidence(evidence = []) {
  if (!Array.isArray(evidence)) throw new Error('Evidence must be an array');
  for (const entry of evidence) {
    if (!entry.repo || !entry.path || path.posix.isAbsolute(entry.path) || entry.path.split('/').includes('..')) {
      throw new Error('Evidence requires a repository name and a repository-relative path');
    }
  }
}

function parseOptions(args) {
  const options = { repos: {}, base: {}, target: {} };
  for (let index = 0; index < args.length; index++) {
    const option = args[index];
    if (!['--repo', '--base', '--target', '--base-manifest', '--reason'].includes(option) || !args[index + 1]) {
      throw new Error(`Unknown option or missing value: ${option}`);
    }
    const value = args[++index];
    if (option === '--repo') {
      const separator = value.indexOf('=');
      if (separator <= 0 || separator === value.length - 1) throw new Error('--repo requires name=path');
      options.repos[value.slice(0, separator)] = path.resolve(value.slice(separator + 1));
    } else if (option === '--base' || option === '--target') {
      const separator = value.indexOf('=');
      const key = option.slice(2);
      if (separator > 0) options[key][value.slice(0, separator)] = value.slice(separator + 1);
      else options[key].default = value;
    } else if (option === '--base-manifest') options.baseManifest = value;
    else options.reason = value;
  }
  return options;
}

function git(repoPath, args) {
  return execFileSync('git', args, { cwd: repoPath, encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
}

function repositoryChanges(repo, repoPath, base, target) {
  if (base === 'WORKTREE') throw new Error('WORKTREE is supported only as the target');
  for (const ref of [base, ...(target === 'WORKTREE' ? [] : [target])]) {
    if (ref.startsWith('-')) throw new Error(`Invalid revision: ${ref}`);
    git(repoPath, ['rev-parse', '--verify', `${ref}^{commit}`]);
  }
  const args = ['diff', '--name-status', '-z', '--no-renames', '--no-ext-diff', base];
  if (target !== 'WORKTREE') args.push(target);
  args.push('--');
  const parts = git(repoPath, args).split('\0');
  const changes = [];
  for (let index = 0; index + 1 < parts.length && parts[index]; index += 2) {
    const status = parts[index][0];
    changes.push({ repo, path: parts[index + 1], status });
  }
  if (target === 'WORKTREE') {
    const untracked = git(repoPath, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
    for (const file of untracked) changes.push({ repo, path: file, status: 'A' });
  }
  return changes;
}

function referencedFiles(manifest) {
  return [
    ...manifest.journeys.flatMap(journey => journey.steps.flatMap(step => step.evidence || [])),
    ...(manifest.components || []).flatMap(component => component.evidence || [])
  ];
}

function sourceAtRevision(repoPath, file, revision) {
  if (revision === 'WORKTREE') return fs.readFileSync(path.join(repoPath, file), 'utf8');
  return git(repoPath, ['show', `${revision}:${file}`]);
}

function snapshotsFromChanges(beforeManifest, afterManifest, changes, settings) {
  const before = { manifest: beforeManifest, files: [] };
  const after = { manifest: afterManifest, files: [] };
  for (const change of changes) {
    const file = { repo: change.repo, path: change.path };
    if (change.status !== 'A') before.files.push({ ...file, hash: 'before' });
    const targetFile = { ...file, hash: 'after' };
    if (/\.(html|ts|tsx|mts|cts|cs)$/i.test(change.path)) {
      try {
        const base = settings.base[change.repo] || settings.base.default || 'HEAD';
        const target = settings.target[change.repo] || settings.target.default || 'WORKTREE';
        const oldSource = change.status === 'A' ? '' : sourceAtRevision(settings.repos[change.repo], change.path, base);
        const newSource = change.status === 'D' ? '' : sourceAtRevision(settings.repos[change.repo], change.path, target);
        targetFile.facts = compareJourneyFacts(change.path, oldSource, newSource);
      } catch (error) {
        targetFile.extractionError = error.message;
      }
    }
    if (change.status !== 'D') after.files.push(targetFile);
    else if (targetFile.facts?.length || targetFile.extractionError) {
      const oldFile = before.files[before.files.length - 1];
      oldFile.facts = targetFile.facts;
      oldFile.extractionError = targetFile.extractionError;
    }
  }
  return { before, after };
}

function formatWalkthrough(manifest, selectedId, selectedStep) {
  const journeys = selectedId ? manifest.journeys.filter(journey => journey.id === selectedId) : manifest.journeys;
  if (!journeys.length) throw new Error(`Journey not found: ${selectedId}`);
  const lines = [];
  for (const journey of journeys) {
    lines.push(`${journey.title} [${journey.id}]`, `Goal: ${journey.goal || 'Not documented'}`);
    if (journey.prerequisites?.length) lines.push(`Prerequisites: ${journey.prerequisites.join('; ')}`);
    journey.steps.forEach((step, index) => {
      if (selectedStep && index + 1 !== selectedStep) return;
      lines.push(`\n${index + 1}. ${step.title}`);
      for (const [label, value] of [['Screen', step.screen], ['Action', step.action], ['Expected', step.expected]]) {
        if (value) lines.push(`   ${label}: ${value}`);
      }
      for (const alternative of step.alternatives || []) lines.push(`   Alternative: ${alternative}`);
      for (const entry of step.evidence || []) lines.push(`   Evidence: ${entry.repo}:${entry.path}${entry.note ? ` (${entry.note})` : ''}`);
      for (const source of step.sources || []) lines.push(`   Source: ${source.title}${source.section ? `, ${source.section}` : ''} ${source.url || ''}`.trimEnd());
    });
    lines.push('');
  }
  if (manifest.components?.length) {
    lines.push('Architecture:');
    for (const component of manifest.components) {
      lines.push(`  ${component.title}: ${component.responsibility || 'Not documented'}`);
      for (const relationship of component.relationships || []) lines.push(`    ${relationship}`);
      for (const entry of component.evidence || []) lines.push(`    Evidence: ${entry.repo}:${entry.path}`);
    }
  }
  return lines.join('\n');
}

function formatDiff(result) {
  const lines = ['Journey and architecture change review', `Rationale: ${result.rationale || 'Not supplied'}`];
  function printFacts(facts, indent) {
    for (const fact of facts || []) {
      const description = fact.category === 'interface'
        ? `${fact.type} "${fact.label}"${fact.conditions.length ? ` (${fact.conditions.join(', ')})` : ''}${fact.bindings.length ? ` [${fact.bindings.join(', ')}]` : ''}`
        : fact.type === 'dependency' ? `dependency ${fact.module}`
          : fact.type === 'route' ? `route ${fact.path} ${fact.component || fact.redirectTo || fact.loadChildren || ''}${fact.canActivate ? `; guard ${fact.canActivate}` : ''}`
            : fact.type === 'condition' ? `condition in ${fact.context}: ${fact.expression}`
              : fact.type === 'state' ? `state in ${fact.context}: ${fact.property} = ${fact.value}`
                : `${fact.owner}: ${fact.attribute}`;
      lines.push(`${indent}${fact.status} ${fact.category}: ${description}`);
    }
  }
  function printChanges(changes, indent) {
    for (const change of changes) {
      if (change.kind === 'implementation') {
        lines.push(`${indent}Implementation evidence ${change.status}: ${change.repo}:${change.path}; user impact unknown`);
        printFacts(change.facts, `${indent}  `);
        if (change.extractionError) lines.push(`${indent}  Evidence could not be analyzed: ${change.extractionError}`);
      }
      else if (change.kind === 'description') lines.push(`${indent}${change.field}: ${JSON.stringify(change.before)} -> ${JSON.stringify(change.after)}`);
      else if (change.kind === 'step-order') lines.push(`${indent}Step order: ${change.before.join(' -> ')} -> ${change.after.join(' -> ')}`);
      else lines.push(`${indent}${change.kind}`);
    }
  }
  for (const journey of result.journeys) {
    lines.push(`\nUse case: ${journey.title} [${journey.id}]`);
    printChanges(journey.changes, '  ');
    for (const step of journey.steps) {
      lines.push(`  Step: ${step.title} [${step.id}]`);
      printChanges(step.changes, '    ');
    }
  }
  for (const component of result.architecture) {
    lines.push(`\nArchitecture: ${component.title} [${component.id}]`);
    printChanges(component.changes, '  ');
  }
  if (result.unmapped.length) {
    lines.push('\nChanges without journey or architecture evidence:');
    for (const file of result.unmapped) {
      lines.push(`  ${file.status}: ${file.repo}:${file.path}`);
      printFacts(file.facts, '    ');
      if (file.extractionError) lines.push(`    Evidence could not be analyzed: ${file.extractionError}`);
    }
  }
  if (result.uncomparedRepositories?.length) lines.push(`\nRepositories not compared: ${result.uncomparedRepositories.join(', ')}`);
  if (!result.journeys.length && !result.architecture.length && !result.unmapped.length) lines.push('\nNo changes detected in the supplied repositories or manifests.');
  return lines.join('\n');
}

function runJourneyCommand(args, options = {}) {
  const [action, manifestPath, ...remaining] = args;
  if (!['show', 'diff'].includes(action) || !manifestPath) {
    throw new Error('Usage: codereview journey show <manifest> [journey-id] | journey diff <manifest> --repo name=path [--base ref] [--target ref]');
  }
  const manifest = readManifest(manifestPath);
  if (action === 'show') {
    const selectedId = remaining[0] && !remaining[0].startsWith('--') ? remaining.shift() : null;
    let selectedStep = null;
    if (remaining.length) {
      if (remaining.length !== 2 || remaining[0] !== '--step' || !selectedId || !/^[1-9]\d*$/.test(remaining[1])) {
        throw new Error('Usage: codereview journey show <manifest> [journey-id] [--step number]');
      }
      selectedStep = Number(remaining[1]);
    }
    const journey = manifest.journeys.find(item => item.id === selectedId);
    if (selectedStep && (!journey || selectedStep > journey.steps.length)) throw new Error(`Step not found: ${selectedStep}`);
    const output = formatWalkthrough(manifest, selectedId, selectedStep);
    const selected = selectedId ? { ...manifest, journeys: manifest.journeys.filter(item => item.id === selectedId)
      .map(item => selectedStep ? { ...item, steps: [item.steps[selectedStep - 1]] } : item) } : manifest;
    console.log(options.json ? JSON.stringify(selected, null, 2) : output);
    return selected;
  }
  const settings = parseOptions(remaining);
  const repoEntries = Object.entries(settings.repos);
  if (!repoEntries.length) throw new Error('At least one --repo name=path is required');
  const changes = repoEntries.flatMap(([name, repoPath]) => repositoryChanges(name, repoPath,
    settings.base[name] || settings.base.default || 'HEAD', settings.target[name] || settings.target.default || 'WORKTREE'));
  const baseManifest = settings.baseManifest ? readManifest(settings.baseManifest) : manifest;
  const { before, after } = snapshotsFromChanges(baseManifest, manifest, changes, settings);
  const result = compareJourneySnapshots(before, after, settings.reason);
  result.uncomparedRepositories = [...new Set([...referencedFiles(baseManifest), ...referencedFiles(manifest)]
    .map(entry => entry.repo).filter(name => !settings.repos[name]))];
  result.revisions = Object.fromEntries(repoEntries.map(([name]) => [name, {
    base: settings.base[name] || settings.base.default || 'HEAD', target: settings.target[name] || settings.target.default || 'WORKTREE'
  }]));
  console.log(options.json ? JSON.stringify(result, null, 2) : formatDiff(result));
  return result;
}

module.exports = { runJourneyCommand, repositoryChanges, readManifest };