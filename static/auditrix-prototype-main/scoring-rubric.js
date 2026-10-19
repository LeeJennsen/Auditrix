(function () {
  'use strict';

  const main = document.getElementById('content-container');
  const pageInstance = main.dataset.pageInstance;
  const typeLabels = {
    INC: 'Incidents',
    SR: 'Service Requests',
    CR: 'Change Requests',
    PRB: 'Problem Records'
  };
  let rubrics = null;
  let selectedType = 'INC';
  let savedThreshold = 80;
  let databaseLive = false;

  const slider = document.getElementById('thresholdSlider');
  const output = document.getElementById('thresholdOutput');
  const rule = document.getElementById('thresholdRule');
  const saveStatus = document.getElementById('thresholdSaveStatus');
  const saveButton = document.getElementById('saveThresholdBtn');

  function isCurrentPage() {
    return main.dataset.page === 'scoring-rubric' && main.dataset.pageInstance === pageInstance;
  }

  function renderThreshold(value, saved) {
    const threshold = Number(value);
    output.value = threshold + '%';
    output.textContent = threshold + '%';
    slider.style.setProperty('--threshold-position', threshold + '%');
    rule.innerHTML = '<strong>Scores below ' + threshold + '%</strong> need QC. Scores <strong>' + threshold + '% or higher</strong> are cleared.';
    const unchanged = threshold === savedThreshold;
    saveButton.disabled = !databaseLive || saved || unchanged;
    if (!saved) saveStatus.textContent = unchanged ? 'Matches the saved setting.' : 'Unsaved change.';
  }

  function renderRubric(type) {
    if (!rubrics || !isCurrentPage()) return;
    selectedType = type;
    document.querySelectorAll('[data-rubric]').forEach(function (button) {
      const selected = button.dataset.rubric === type;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });

    const rubric = rubrics[type];
    if (!rubric) {
      document.getElementById('rubricSummary').textContent = 'No audit SOP is configured for this record type.';
      document.getElementById('rubricCriteria').replaceChildren();
      document.getElementById('rubricClauseCount').textContent = 'No criteria';
      return;
    }

    const criteria = rubric.criteria || [];
    const escapeHtml = function (value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); };
    document.getElementById('rubricSummary').innerHTML = '<strong>' + escapeHtml(typeLabels[type]) + ' audit rubric ' + escapeHtml(rubric.version) + '</strong><span class="muted"> Pass earns full weight; partial earns half; fail earns zero. Not-applicable criteria are excluded. Dimension-only metrics update score spread without changing the overall score. Results require resolution-note evidence.</span>';
    document.getElementById('rubricCriteria').innerHTML = criteria.map(function (criterion) {
      const conditional = criterion.conditional ? '<p class="muted">' + escapeHtml(criterion.conditional) + '</p>' : '';
      const weightLabel = Number(criterion.weight) === 0 ? 'Dimension metric' : Number(criterion.weight) + '%';
      return '<li><div class="rubric-criterion-text"><strong>' + escapeHtml(criterion.title) + '</strong><p class="muted">' + escapeHtml(criterion.guidance) + '</p>' + conditional + '</div><span class="rubric-weight">' + weightLabel + '</span></li>';
    }).join('');
    document.getElementById('rubricClauseCount').textContent = criteria.length + (criteria.length === 1 ? ' criterion' : ' criteria');
  }

  function renderScoreSpread(tickets) {
    const fields = [
      ['policy_compliance', 'Policy compliance'],
      ['escalation_protocol', 'Escalation protocol'],
      ['tone_and_sentiment', 'Tone and sentiment'],
      ['documentation_accuracy', 'Documentation accuracy']
    ];
    document.getElementById('rubricScoreSpread').innerHTML = fields.map(function (item) {
      const values = tickets.map(function (ticket) {
        return ticket.score_spread && ticket.score_spread[item[0]];
      }).filter(function (value) { return value !== null && value !== undefined && Number.isFinite(Number(value)); });
      const average = values.length
        ? Math.round(values.reduce(function (sum, value) { return sum + Number(value); }, 0) / values.length) + ' / 100'
        : 'N/A';
      return '<div style="padding:13px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:9px;"><div style="font-size:11px;color:#64748B;">' + item[1] + '</div><strong style="display:block;margin-top:6px;font-size:21px;color:#1E293B;">' + average + '</strong></div>';
    }).join('');
  }

  document.getElementById('rubricTabs').addEventListener('click', function (event) {
    const button = event.target.closest('[data-rubric]');
    if (button) renderRubric(button.dataset.rubric);
  });
  document.getElementById('rubricTabs').addEventListener('keydown', function (event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = Array.from(this.querySelectorAll('[data-rubric]'));
    let index = buttons.findIndex(function (button) { return button.dataset.rubric === selectedType; });
    if (event.key === 'ArrowLeft') index = (index + buttons.length - 1) % buttons.length;
    else if (event.key === 'ArrowRight') index = (index + 1) % buttons.length;
    else if (event.key === 'Home') index = 0;
    else index = buttons.length - 1;
    event.preventDefault();
    buttons[index].focus();
    renderRubric(buttons[index].dataset.rubric);
  });

  slider.addEventListener('input', function () { renderThreshold(slider.value, false); });
  saveButton.addEventListener('click', async function () {
    saveButton.disabled = true;
    saveStatus.textContent = 'Saving threshold…';
    try {
      const settings = await AuditAPI.updateSettings(Number(slider.value));
      if (!isCurrentPage()) return;
      savedThreshold = settings.compliance_threshold;
      slider.value = String(savedThreshold);
      renderThreshold(savedThreshold, true);
      saveStatus.textContent = AuditAPI.getMode() === 'live'
        ? 'Saved. New audits now use this threshold.'
        : 'Saved for this browser session; the demo rubric uses this threshold.';
    } catch (error) {
      if (!isCurrentPage()) return;
      saveButton.disabled = false;
      saveStatus.textContent = 'Could not save: ' + error.message;
    }
  });

  document.getElementById('exportRubricBtn').addEventListener('click', async function () {
    const button = this;
    button.disabled = true;
    try {
      const data = await Promise.all([AuditAPI.getRubricCriteria(), AuditAPI.getSettings()]);
      const snapshot = {
        exported_at: new Date().toISOString(),
        rubrics: data[0],
        compliance_threshold: data[1].compliance_threshold
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'audit-rubrics-' + new Date().toISOString().slice(0, 10) + '.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      saveStatus.textContent = 'Could not export configuration: ' + error.message;
    } finally {
      button.disabled = false;
    }
  });

  AuditAPI.onState(function (state, source) {
    if (!isCurrentPage()) return;
    databaseLive = source === 'live';
    rubrics = state.rubric_criteria;
    renderRubric(selectedType);
    renderScoreSpread(state.tickets);
    if (databaseLive) {
      savedThreshold = Number(state.settings.compliance_threshold);
      slider.disabled = false;
      slider.value = String(savedThreshold);
      renderThreshold(savedThreshold, true);
      saveStatus.textContent = 'Saved setting loaded from the database-backed audit service.';
    } else {
      savedThreshold = null;
      slider.disabled = true;
      output.value = '—%';
      output.textContent = '—%';
      rule.textContent = 'Database unavailable. The saved threshold is not loaded.';
      saveButton.disabled = true;
      saveStatus.textContent = 'Database unavailable. Ticket scores and saved settings are not being loaded.';
    }
  });
})();
