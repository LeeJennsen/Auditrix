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
    saveButton.disabled = saved || unchanged;
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
    document.getElementById('rubricSummary').innerHTML = '<strong>' + escapeHtml(typeLabels[type]) + ' audit rubric ' + escapeHtml(rubric.version) + '</strong><span class="muted"> Pass earns full weight; partial earns half; fail earns zero. Explicitly not applicable criteria are excluded from the total. Results require resolution-note evidence.</span>';
    document.getElementById('rubricCriteria').innerHTML = criteria.map(function (criterion) {
      const conditional = criterion.conditional ? '<p class="muted">' + escapeHtml(criterion.conditional) + '</p>' : '';
      return '<li><div class="rubric-criterion-text"><strong>' + escapeHtml(criterion.title) + '</strong><p class="muted">' + escapeHtml(criterion.guidance) + '</p>' + conditional + '</div><span class="rubric-weight">' + Number(criterion.weight) + '%</span></li>';
    }).join('');
    document.getElementById('rubricClauseCount').textContent = criteria.length + (criteria.length === 1 ? ' criterion' : ' criteria');
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
      saveStatus.textContent = 'Saved. New audits now use this threshold.';
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

  Promise.all([AuditAPI.getRubricCriteria(), AuditAPI.getSettings()]).then(function (results) {
    if (!isCurrentPage()) return;
    rubrics = results[0];
    renderRubric(selectedType);
    savedThreshold = results[1].compliance_threshold;
    slider.value = String(savedThreshold);
    renderThreshold(savedThreshold, true);
    saveStatus.textContent = 'Saved setting loaded from the audit service.';
  }).catch(function (error) {
    if (!isCurrentPage()) return;
    document.getElementById('rubricSummary').textContent = 'Could not load audit criteria: ' + error.message;
    document.getElementById('rubricClauseCount').textContent = 'Unavailable';
    rule.textContent = 'Could not load the saved threshold: ' + error.message;
    saveStatus.textContent = 'Check the service connection and reload this page.';
  });
})();
