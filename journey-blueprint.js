(function () {
  'use strict';

  const root = document.getElementById('journey-view');
  const state = { manifest: null, comparison: null, manifestName: '', comparisonName: '', journeyId: null, stepId: null, componentId: null, mode: 'journey', error: '' };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function displayValue(value) {
    if (value === null || value === undefined) return 'Not documented';
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  function selectedJourney() {
    return state.manifest?.journeys.find(journey => journey.id === state.journeyId) || null;
  }

  function selectedStep() {
    return selectedJourney()?.steps.find(step => step.id === state.stepId) || null;
  }

  function journeyChanges(id) {
    return state.comparison?.journeys.find(journey => journey.id === id) || null;
  }

  function stepChanges(journeyId, stepId) {
    return journeyChanges(journeyId)?.steps?.find(step => step.id === stepId)?.changes || [];
  }

  function sharedEvidence(step, component) {
    const files = new Set((step?.evidence || []).map(entry => `${entry.repo}:${entry.path}`));
    return (component.evidence || []).some(entry => files.has(`${entry.repo}:${entry.path}`));
  }

  function safeLink(source) {
    try {
      const url = new URL(source.url);
      if (!['https:', 'http:'].includes(url.protocol)) return escapeHtml(source.title || 'Source');
      return `<a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title || 'Source')}${source.section ? `, ${escapeHtml(source.section)}` : ''}</a>`;
    } catch {
      return `${escapeHtml(source.title || 'Source')}${source.section ? `, ${escapeHtml(source.section)}` : ''}`;
    }
  }

  function evidenceList(entries) {
    if (!entries?.length) return '<p>Not documented</p>';
    return `<ul class="bp-list">${entries.map(entry => `<li><code>${escapeHtml(entry.repo)}:${escapeHtml(entry.path)}</code>${entry.note ? ` <span>${escapeHtml(entry.note)}</span>` : ''}<br><button type="button" class="bp-evidence-button" data-action="inspect-file" data-path="${escapeHtml(entry.path)}">Find in current graph</button></li>`).join('')}</ul>`;
  }

  function list(items, fallback = 'Not documented') {
    return items?.length ? `<ul class="bp-list">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : `<p>${escapeHtml(fallback)}</p>`;
  }

  function factText(fact) {
    if (fact.category === 'interface') {
      const conditions = fact.conditions?.length ? `; conditions: ${fact.conditions.join(', ')}` : '';
      const bindings = fact.bindings?.length ? `; actions: ${fact.bindings.join(', ')}` : '';
      return `${fact.type}: ${fact.label}${conditions}${bindings}`;
    }
    if (fact.type === 'dependency') return `Dependency: ${fact.module}`;
    if (fact.type === 'route') return `Route: ${fact.path || ''} ${fact.component || fact.redirectTo || fact.loadChildren || ''}${fact.canActivate ? `; guard: ${fact.canActivate}` : ''}`;
    if (fact.type === 'condition') return `Condition in ${fact.context}: ${fact.expression}`;
    if (fact.type === 'state') return `State in ${fact.context}: ${fact.property} = ${fact.value}`;
    return `${fact.owner || fact.category || 'Fact'}: ${fact.attribute || fact.type || ''}`;
  }

  function factComparison(facts) {
    if (!facts?.length) return '';
    const before = facts.filter(fact => fact.status === 'removed');
    const after = facts.filter(fact => fact.status === 'added');
    const renderFacts = items => items.length ? `<ul>${items.map(fact => `<li>${escapeHtml(factText(fact))}</li>`).join('')}</ul>` : '<p>No extracted facts</p>';
    return `<div class="bp-before-after"><div><strong>Before</strong>${renderFacts(before)}</div><div><strong>After</strong>${renderFacts(after)}</div></div>`;
  }

  function changeDetail(change) {
    if (change.kind === 'implementation') {
      return `<div class="bp-change"><div class="bp-change-head"><span class="bp-change-label">${escapeHtml(change.status)}</span><code>${escapeHtml(change.repo)}:${escapeHtml(change.path)}</code></div><p>User impact unknown</p>${change.extractionError ? `<p>Analysis unavailable: ${escapeHtml(change.extractionError)}</p>` : ''}${factComparison(change.facts)}</div>`;
    }
    if (change.kind === 'description') {
      return `<div class="bp-change"><div class="bp-change-head">${escapeHtml(change.field)} <span class="bp-change-label">Description changed</span></div><div class="bp-before-after"><div><strong>Before</strong><p>${escapeHtml(displayValue(change.before))}</p></div><div><strong>After</strong><p>${escapeHtml(displayValue(change.after))}</p></div></div></div>`;
    }
    if (change.kind === 'step-order') {
      return `<div class="bp-change"><div class="bp-change-head">Step order <span class="bp-change-label">Changed</span></div><div class="bp-before-after"><div><strong>Before</strong><p>${escapeHtml((change.before || []).join(' / '))}</p></div><div><strong>After</strong><p>${escapeHtml((change.after || []).join(' / '))}</p></div></div></div>`;
    }
    return `<div class="bp-change"><span class="bp-change-label">${escapeHtml(change.kind || 'Changed')}</span></div>`;
  }

  function toolbar() {
    return `<div class="bp-toolbar"><span class="bp-toolbar-title">Journey Blueprint</span><div class="bp-mode" role="tablist" aria-label="Blueprint mode"><button type="button" role="tab" data-action="mode" data-id="journey" aria-selected="${state.mode === 'journey'}">Journey</button><button type="button" role="tab" data-action="mode" data-id="changes" aria-selected="${state.mode === 'changes'}">Changes</button></div><button type="button" class="bp-button" data-action="load-manifest">Load journey</button><button type="button" class="bp-button" data-action="load-comparison">Load comparison</button>${state.comparison ? '<button type="button" class="bp-button" data-action="clear-comparison">Clear comparison</button>' : ''}<input class="bp-file" id="bp-manifest-file" type="file" accept=".json,application/json" aria-label="Journey JSON"><input class="bp-file" id="bp-comparison-file" type="file" accept=".json,application/json" aria-label="Comparison JSON"></div>${state.error ? `<p class="bp-alert" role="alert">${escapeHtml(state.error)}</p>` : ''}`;
  }

  function sidebar() {
    const journeys = state.manifest.journeys;
    return `<nav class="bp-sidebar" aria-label="Use cases"><div class="bp-sidebar-head"><p class="bp-kicker">Use cases</p><span class="bp-count">${journeys.length}</span></div>${journeys.map(journey => `<button type="button" class="bp-journey" data-action="journey" data-id="${escapeHtml(journey.id)}" aria-current="${journey.id === state.journeyId}">${escapeHtml(journey.title)}<span class="bp-journey-meta">${journey.steps.length} ${journey.steps.length === 1 ? 'step' : 'steps'}${journeyChanges(journey.id) ? ' / Changes' : ''}</span></button>`).join('')}</nav>`;
  }

  function stepInspector(journey, step) {
    if (!step) return '<aside class="bp-inspector"><h2 class="bp-inspector-title">No step selected</h2></aside>';
    const index = journey.steps.findIndex(item => item.id === step.id);
    const changes = stepChanges(journey.id, step.id);
    return `<aside class="bp-inspector" aria-label="Step details"><p class="bp-kicker">Step ${index + 1} of ${journey.steps.length}</p><h2 class="bp-inspector-title">${escapeHtml(step.title)}</h2><div class="bp-inspector-sub">${escapeHtml(step.screen || 'Screen not documented')}</div><div class="bp-detail"><h3>Action</h3><p>${escapeHtml(step.action || 'Not documented')}</p></div><div class="bp-detail"><h3>Expected outcome</h3><p>${escapeHtml(step.expected || 'Not documented')}</p></div><div class="bp-detail"><h3>Alternatives and exceptions</h3>${list(step.alternatives, 'None documented')}</div><details class="bp-detail"><summary>Evidence (${(step.evidence || []).length})</summary>${evidenceList(step.evidence)}${step.sources?.length ? `<ul class="bp-list">${step.sources.map(source => `<li>${safeLink(source)}</li>`).join('')}</ul>` : ''}</details>${state.comparison ? `<details class="bp-detail" ${state.mode === 'changes' && changes.length ? 'open' : ''}><summary>Related changes (${changes.length})</summary>${changes.length ? changes.map(changeDetail).join('') : '<p>No mapped changes for this step.</p>'}</details>` : ''}<div class="bp-detail-nav"><button type="button" class="bp-icon-button" data-action="previous" aria-label="Previous step" title="Previous step" ${index <= 0 ? 'disabled' : ''}>&larr;</button><span>${index + 1} / ${journey.steps.length}</span><button type="button" class="bp-icon-button" data-action="next" aria-label="Next step" title="Next step" ${index >= journey.steps.length - 1 ? 'disabled' : ''}>&rarr;</button></div></aside>`;
  }

  function componentInspector(component) {
    const changes = state.comparison?.architecture?.find(item => item.id === component.id)?.changes || [];
    return `<aside class="bp-inspector" aria-label="Component details"><p class="bp-kicker">Architecture</p><h2 class="bp-inspector-title">${escapeHtml(component.title)}</h2><div class="bp-detail"><h3>Responsibility</h3><p>${escapeHtml(component.responsibility || 'Not documented')}</p></div><div class="bp-detail"><h3>Relationships</h3>${list(component.relationships)}</div><details class="bp-detail"><summary>Evidence (${(component.evidence || []).length})</summary>${evidenceList(component.evidence)}</details>${state.comparison ? `<details class="bp-detail" ${state.mode === 'changes' && changes.length ? 'open' : ''}><summary>Related changes (${changes.length})</summary>${changes.length ? changes.map(changeDetail).join('') : '<p>No mapped changes for this component.</p>'}</details>` : ''}</aside>`;
  }

  function journeyCanvas(journey, step) {
    const components = state.manifest.components || [];
    return `<main class="bp-canvas"><p class="bp-kicker">Use case</p><h2 class="bp-title">${escapeHtml(journey.title)}</h2><p class="bp-goal">${escapeHtml(journey.goal || 'Goal not documented')}</p>${state.manifest.description ? `<p class="bp-section-note">${escapeHtml(state.manifest.description)}</p>` : ''}<div class="bp-prerequisites"><p class="bp-kicker">Prerequisites</p>${list(journey.prerequisites, 'Not documented')}</div><div class="bp-section-head"><h3>Journey steps</h3><span class="bp-section-note">${journey.steps.length} ${journey.steps.length === 1 ? 'step' : 'steps'}</span></div><div class="bp-steps" aria-label="Journey steps">${journey.steps.map((item, index) => `<button type="button" class="bp-step" data-action="step" data-id="${escapeHtml(item.id)}" ${item.id === step?.id ? 'aria-current="step"' : ''}><span class="bp-step-number">${String(index + 1).padStart(2, '0')} / ${escapeHtml(item.screen || 'Screen not documented')}</span><span class="bp-step-title">${escapeHtml(item.title)}</span><span class="bp-step-screen">${escapeHtml(item.action || 'Action not documented')}</span>${stepChanges(journey.id, item.id).length ? '<span class="bp-tag">Related changes</span>' : ''}</button>`).join('')}</div><div class="bp-section-head"><div><h3>Supporting architecture</h3><span class="bp-section-note">Shared evidence suggests a relationship; execution is not verified.</span></div></div><div class="bp-flow">${components.length ? components.map(component => `<button type="button" class="bp-component" data-action="component" data-id="${escapeHtml(component.id)}" aria-pressed="${component.id === state.componentId}"><span>${escapeHtml(component.title)}</span><span>${sharedEvidence(step, component) ? 'Shared file evidence' : 'No shared evidence'}${state.comparison?.architecture?.some(item => item.id === component.id) ? ' / Changes' : ''}</span></button>`).join('') : '<p class="bp-section-note">No components documented.</p>'}</div></main>`;
  }

  function changesCanvas(journey) {
    const comparison = state.comparison;
    if (!comparison) return '<main class="bp-canvas"><p class="bp-kicker">Change review</p><h2 class="bp-title">No comparison loaded</h2></main>';
    const current = journey ? journeyChanges(journey.id) : null;
    const revisions = Object.entries(comparison.revisions || {}).map(([repo, revision]) => `<span>${escapeHtml(repo)}: ${escapeHtml(revision.base)} &rarr; ${escapeHtml(revision.target)}</span>`).join('');
    const missing = comparison.journeys.filter(item => !state.manifest.journeys.some(existing => existing.id === item.id));
    const unmatchedSteps = (current?.steps || []).filter(item => !journey?.steps.some(step => step.id === item.id));
    const steps = (current?.steps || []).map(step => `<div class="bp-change"><div class="bp-change-head">${journey?.steps.some(item => item.id === step.id) ? `<button type="button" class="bp-change-step" data-action="review-step" data-id="${escapeHtml(step.id)}">${escapeHtml(step.title)}</button>` : escapeHtml(step.title)} <span class="bp-change-label">Related changes</span></div>${(step.changes || []).map(changeDetail).join('')}</div>`).join('');
    const architecture = (comparison.architecture || []).map(component => `<div class="bp-change"><div class="bp-change-head">${escapeHtml(component.title)}</div>${(component.changes || []).map(changeDetail).join('')}</div>`).join('');
    const unmapped = (comparison.unmapped || []).map(file => changeDetail({ kind: 'implementation', ...file })).join('');
    return `<main class="bp-canvas"><p class="bp-kicker">Change review</p><h2 class="bp-title">${escapeHtml(journey?.title || 'All changes')}</h2><div class="bp-revisions">${revisions || '<span>Revisions not supplied</span>'}</div><p class="bp-section-note">${escapeHtml(state.manifestName)} / ${escapeHtml(state.comparisonName)}: manifest revision not verified.</p><div class="bp-detail"><h3>Rationale</h3><p>${escapeHtml(comparison.rationale || 'Not supplied')}</p></div>${comparison.uncomparedRepositories?.length ? `<p class="bp-alert">Repositories not compared: ${escapeHtml(comparison.uncomparedRepositories.join(', '))}</p>` : ''}<div class="bp-section-head"><h3>Use case changes</h3><span class="bp-section-note">Related code is not proof of user impact.</span></div>${current ? (current.changes || []).map(changeDetail).join('') + (steps || '<p class="bp-section-note">No step changes reported.</p>') : '<p class="bp-section-note">No mapped changes reported for this use case.</p>'}${unmatchedSteps.length ? '<p class="bp-section-note">Some changed steps are absent from the loaded manifest.</p>' : ''}<details class="bp-review-section"><summary>Architecture changes (${(comparison.architecture || []).length})</summary>${architecture || '<p class="bp-section-note">No architecture changes reported.</p>'}</details><details class="bp-review-section"><summary>Unmapped changes (${(comparison.unmapped || []).length})</summary>${unmapped || '<p class="bp-section-note">No unmapped changes reported.</p>'}</details>${missing.length ? `<details class="bp-review-section"><summary>Journeys absent from this manifest (${missing.length})</summary>${missing.map(item => `<div class="bp-change"><div class="bp-change-head">${escapeHtml(item.title)}</div>${(item.changes || []).map(changeDetail).join('')}${(item.steps || []).map(step => `<div class="bp-change"><div class="bp-change-head">${escapeHtml(step.title)}</div>${(step.changes || []).map(changeDetail).join('')}</div>`).join('')}</div>`).join('')}</details>` : ''}</main>`;
  }

  function render() {
    const scrollPositions = ['.bp-workspace', '.bp-sidebar', '.bp-canvas', '.bp-inspector', '.bp-steps'].map(selector => {
      const element = root.querySelector(selector);
      return { selector, top: element?.scrollTop || 0, left: element?.scrollLeft || 0 };
    });
    if (!state.manifest) {
      root.innerHTML = `${toolbar()}<div class="bp-empty">No journey loaded.</div>`;
      return;
    }
    const journey = selectedJourney();
    if (!journey && state.mode !== 'changes') {
      root.innerHTML = `${toolbar()}<div class="bp-empty">No use cases documented.</div>`;
      return;
    }
    const step = selectedStep();
    const component = (state.manifest.components || []).find(item => item.id === state.componentId);
    root.innerHTML = `${toolbar()}<div class="bp-workspace">${sidebar()}${state.mode === 'changes' ? changesCanvas(journey) : journeyCanvas(journey, step)}${component ? componentInspector(component) : stepInspector(journey, step)}</div>`;
    for (const position of scrollPositions) {
      const element = root.querySelector(position.selector);
      if (element) { element.scrollTop = position.top; element.scrollLeft = position.left; }
    }
  }

  function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function optionalString(value) {
    return value === undefined || value === null || typeof value === 'string';
  }

  function stringList(value) {
    return value === undefined || (Array.isArray(value) && value.every(item => typeof item === 'string'));
  }

  function validEvidence(value) {
    return value === undefined || (Array.isArray(value) && value.every(entry => isRecord(entry) && typeof entry.repo === 'string' && typeof entry.path === 'string' && optionalString(entry.note)));
  }

  function uniqueIds(items) {
    return new Set(items.map(item => item.id)).size === items.length;
  }

  function validStep(step) {
    return isRecord(step) && typeof step.id === 'string' && step.id.length > 0 && typeof step.title === 'string' &&
      ['screen', 'action', 'expected'].every(field => optionalString(step[field])) && stringList(step.alternatives) &&
      validEvidence(step.evidence) && (step.sources === undefined || (Array.isArray(step.sources) &&
        step.sources.every(source => isRecord(source) && optionalString(source.title) && optionalString(source.section) && optionalString(source.url))));
  }

  function validManifest(data) {
    if (!isRecord(data) || !optionalString(data.description) || !Array.isArray(data.journeys)) return false;
    if (!data.journeys.every(journey => isRecord(journey) && typeof journey.id === 'string' && journey.id.length > 0 &&
      typeof journey.title === 'string' && optionalString(journey.goal) && stringList(journey.prerequisites) &&
      Array.isArray(journey.steps) && journey.steps.every(validStep) && uniqueIds(journey.steps))) return false;
    if (!uniqueIds(data.journeys)) return false;
    return data.components === undefined || (Array.isArray(data.components) && uniqueIds(data.components) &&
      data.components.every(component => isRecord(component) && typeof component.id === 'string' && component.id.length > 0 &&
        typeof component.title === 'string' && optionalString(component.responsibility) && stringList(component.relationships) && validEvidence(component.evidence)));
  }

  function validFacts(facts) {
    return facts === undefined || (Array.isArray(facts) && facts.every(fact => isRecord(fact) &&
      stringList(fact.conditions) && stringList(fact.bindings)));
  }

  function validChanges(changes) {
    return Array.isArray(changes) && changes.every(change => isRecord(change) && typeof change.kind === 'string' &&
      validFacts(change.facts) && (change.kind !== 'step-order' || (stringList(change.before) && stringList(change.after))));
  }

  function validComparison(data) {
    if (!isRecord(data) || !Array.isArray(data.journeys) || !Array.isArray(data.architecture) || !Array.isArray(data.unmapped)) return false;
    if (!data.journeys.every(journey => isRecord(journey) && typeof journey.id === 'string' && optionalString(journey.title) &&
      validChanges(journey.changes) && Array.isArray(journey.steps) && journey.steps.every(step => isRecord(step) &&
        typeof step.id === 'string' && optionalString(step.title) && validChanges(step.changes)))) return false;
    if (!data.architecture.every(component => isRecord(component) && typeof component.id === 'string' && optionalString(component.title) && validChanges(component.changes))) return false;
    if (!data.unmapped.every(file => isRecord(file) && typeof file.repo === 'string' && typeof file.path === 'string' && validFacts(file.facts))) return false;
    return optionalString(data.rationale) && stringList(data.uncomparedRepositories) &&
      (data.revisions === undefined || (isRecord(data.revisions) && Object.values(data.revisions).every(revision => isRecord(revision) && optionalString(revision.base) && optionalString(revision.target))));
  }

  async function loadFile(input, kind) {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (kind === 'manifest') {
        if (!validManifest(data)) throw new Error('Invalid journey manifest.');
        if (state.manifest) { state.comparison = null; state.comparisonName = ''; state.mode = 'journey'; }
        state.manifest = data;
        state.manifestName = file.name;
        state.journeyId = data.journeys[0]?.id || null;
        state.stepId = data.journeys[0]?.steps[0]?.id || null;
        state.componentId = null;
      } else {
        if (!validComparison(data)) throw new Error('Invalid journey comparison.');
        state.comparison = data;
        state.comparisonName = file.name;
        state.mode = 'changes';
      }
      state.error = '';
    } catch (error) {
      state.error = `Unable to load ${file.name}: ${error.message}`;
    }
    render();
  }

  root.addEventListener('change', event => {
    if (event.target.id === 'bp-manifest-file') loadFile(event.target, 'manifest');
    if (event.target.id === 'bp-comparison-file') loadFile(event.target, 'comparison');
  });

  root.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'load-manifest') return root.querySelector('#bp-manifest-file').click();
    if (action === 'load-comparison') return root.querySelector('#bp-comparison-file').click();
    if (action === 'inspect-file') {
      if (window.inspectJourneyFile?.(button.dataset.path)) return;
      state.error = `No matching file in the current graph: ${button.dataset.path}`;
      const alert = document.createElement('p');
      alert.className = 'bp-alert';
      alert.setAttribute('role', 'alert');
      alert.textContent = state.error;
      root.querySelector('[role="alert"]')?.remove();
      root.querySelector('.bp-toolbar').after(alert);
      return;
    }
    if (action === 'clear-comparison') { state.comparison = null; state.comparisonName = ''; state.mode = 'journey'; }
    if (action === 'mode') state.mode = button.dataset.id;
    if (action === 'journey') {
      state.journeyId = button.dataset.id;
      state.stepId = selectedJourney()?.steps[0]?.id || null;
      state.componentId = null;
    }
    if (action === 'step' || action === 'review-step') { state.stepId = button.dataset.id; state.componentId = null; }
    if (action === 'component') state.componentId = button.dataset.id;
    if (action === 'previous' || action === 'next') {
      const journey = selectedJourney();
      const index = journey.steps.findIndex(step => step.id === state.stepId);
      state.stepId = journey.steps[index + (action === 'next' ? 1 : -1)]?.id || state.stepId;
      state.componentId = null;
    }
    render();
    const next = root.querySelector(`[data-action="${action}"]${button.dataset.id ? `[data-id="${CSS.escape(button.dataset.id)}"]` : ''}`);
    if (next && !next.disabled) next.focus({ preventScroll: true });
    else if (action === 'next' || action === 'previous') {
      const fallback = action === 'next' ? 'previous' : 'next';
      root.querySelector(`[data-action="${fallback}"]:not(:disabled)`)?.focus({ preventScroll: true });
    }
  });

  render();
}());