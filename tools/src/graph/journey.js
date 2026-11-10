function fileKey(file) {
  return `${file.repo}:${file.path}`;
}

function indexById(items = []) {
  return new Map(items.map(item => [item.id, item]));
}

function sameValue(before, after) {
  return JSON.stringify(before ?? null) === JSON.stringify(after ?? null);
}

function changedFields(before, after, fields) {
  return fields.filter(field => !sameValue(before[field], after[field])).map(field => ({
    kind: 'description',
    field,
    before: before[field] ?? null,
    after: after[field] ?? null
  }));
}

function changedFiles(beforeFiles = [], afterFiles = []) {
  const before = new Map(beforeFiles.map(file => [fileKey(file), file]));
  const after = new Map(afterFiles.map(file => [fileKey(file), file]));
  const changes = new Map();
  for (const key of new Set([...before.keys(), ...after.keys()])) {
    const oldFile = before.get(key);
    const newFile = after.get(key);
    if (!oldFile || !newFile || oldFile.hash !== newFile.hash) {
      const file = newFile || oldFile;
      changes.set(key, {
        repo: file.repo,
        path: file.path,
        status: !oldFile ? 'added' : !newFile ? 'removed' : 'modified',
        ...((newFile || oldFile)?.facts?.length ? { facts: (newFile || oldFile).facts } : {}),
        ...((newFile || oldFile)?.extractionError ? { extractionError: (newFile || oldFile).extractionError } : {})
      });
    }
  }
  return changes;
}

function evidenceChanges(before, after, files, mapped) {
  const evidence = [...(before?.evidence || []), ...(after?.evidence || [])];
  const result = [];
  for (const entry of evidence) {
    const key = fileKey(entry);
    if (files.has(key) && !result.some(change => fileKey(change) === key)) {
      mapped.add(key);
      result.push({ kind: 'implementation', ...files.get(key), effect: 'unknown' });
    }
  }
  return result;
}

function compareItems(beforeItems, afterItems, files, mapped, fields) {
  const before = indexById(beforeItems);
  const after = indexById(afterItems);
  const results = [];
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const oldItem = before.get(id);
    const newItem = after.get(id);
    const item = newItem || oldItem;
    const changes = !oldItem || !newItem
      ? [{ kind: oldItem ? 'removed' : 'added' }]
      : changedFields(oldItem, newItem, fields);
    changes.push(...evidenceChanges(oldItem, newItem, files, mapped));
    if (changes.length) results.push({ id, title: item.title, changes });
  }
  return results;
}

function compareJourneySnapshots(before, after, rationale = null) {
  const files = changedFiles(before.files, after.files);
  const mapped = new Set();
  const oldJourneys = indexById(before.manifest.journeys);
  const newJourneys = indexById(after.manifest.journeys);
  const journeys = [];
  for (const id of new Set([...oldJourneys.keys(), ...newJourneys.keys()])) {
    const oldJourney = oldJourneys.get(id);
    const newJourney = newJourneys.get(id);
    const journey = newJourney || oldJourney;
    const changes = !oldJourney || !newJourney
      ? [{ kind: oldJourney ? 'removed' : 'added' }]
      : changedFields(oldJourney, newJourney, ['title', 'goal', 'prerequisites']);
    const oldOrder = oldJourney?.steps.map(step => step.id) || [];
    const newOrder = newJourney?.steps.map(step => step.id) || [];
    const commonOld = oldOrder.filter(step => newOrder.includes(step));
    const commonNew = newOrder.filter(step => oldOrder.includes(step));
    if (oldJourney && newJourney && !sameValue(commonOld, commonNew)) {
      changes.push({ kind: 'step-order', before: commonOld, after: commonNew });
    }
    const steps = compareItems(oldJourney?.steps || [], newJourney?.steps || [], files, mapped,
      ['title', 'screen', 'action', 'expected', 'alternatives', 'evidence']);
    if (changes.length || steps.length) journeys.push({ id, title: journey.title, changes, steps });
  }
  const architecture = compareItems(before.manifest.components || [], after.manifest.components || [], files, mapped,
    ['title', 'responsibility', 'relationships', 'evidence']);
  return {
    journeys,
    architecture,
    unmapped: [...files].filter(([key]) => !mapped.has(key)).map(([, file]) => file),
    rationale: rationale || null
  };
}

module.exports = { compareJourneySnapshots };