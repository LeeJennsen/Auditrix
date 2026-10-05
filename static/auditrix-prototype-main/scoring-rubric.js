(function () {
  const main = document.getElementById('content-container');
  const pageInstance = main.dataset.pageInstance;
  let currentRubrics = null;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  const livePanel = document.createElement('section');
  livePanel.style.cssText = 'background:#fff;border:1px solid #CBD5E1;border-radius:12px;padding:22px 24px;display:flex;flex-direction:column;gap:14px;';
  livePanel.innerHTML = '<div><h2 style="margin:0;color:#1E293B;font-size:18px;">Live SOP Library Used by AI Audits</h2><p style="margin:5px 0 0;color:#64748B;font-size:13px;">The complete server-side clauses below are passed into the selected model for every ticket audit.</p></div><div id="liveRubrics" style="display:grid;gap:12px;"><div style="color:#64748B;">Loading current SOP text…</div></div><div id="rubricExportStatus" role="status" style="font-size:12px;color:#64748B;"></div>';
  main.appendChild(livePanel);

  AuditAPI.getRubrics().then(function (rubrics) {
    if (main.dataset.page !== 'scoring-rubric' || main.dataset.pageInstance !== pageInstance) return;
    currentRubrics = rubrics;
    document.getElementById('liveRubrics').innerHTML = Object.entries(rubrics).map(function (entry) {
      return `<details style="border:1px solid #E2E8F0;border-radius:8px;padding:12px 14px;">
        <summary style="cursor:pointer;font-weight:600;color:#1E293B;">${escapeHtml(entry[0])} SOP · ${entry[1].trim().split(/\r?\n/).filter(Boolean).length} clauses</summary>
        <pre style="white-space:pre-wrap;line-height:1.65;font:13px/1.65 inherit;color:#334155;margin:12px 0 2px;">${escapeHtml(entry[1].trim())}</pre>
      </details>`;
    }).join('');
  }).catch(function (error) {
    if (main.dataset.page !== 'scoring-rubric' || main.dataset.pageInstance !== pageInstance) return;
    document.getElementById('liveRubrics').textContent = 'Could not load live SOPs: ' + error.message;
  });

  document.getElementById('exportRubricBtn').addEventListener('click', async function () {
    const status = document.getElementById('rubricExportStatus');
    const button = this;
    button.disabled = true;
    try {
      if (!currentRubrics) currentRubrics = await AuditAPI.getRubrics();
      const snapshot = {
        exported_at: new Date().toISOString(),
        source: '/api/v1/rubrics',
        rubrics: currentRubrics
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-rubrics-${new Date().toISOString().slice(0,10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      status.textContent = 'Downloaded a timestamped snapshot of the live server rubric.';
    } catch (error) {
      status.textContent = 'Could not export rubric: ' + error.message;
    } finally {
      button.disabled = false;
    }
  });
})();
