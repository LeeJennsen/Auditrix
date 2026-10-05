(function () {
  const sidebar = document.querySelector('audit-sidebar');
  const uiRoot = sidebar && sidebar.shadowRoot ? sidebar.shadowRoot : document;
  const button = uiRoot.getElementById('globalAlertsButton');
  if (!button) return;
  const sidebarHost = button.getRootNode().host || null;

  const panel = document.createElement('section');
  panel.id = 'auditAlertsPanel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Pending audit alerts');
  panel.style.cssText = 'position:fixed;z-index:1000;top:76px;left:24px;width:min(440px,calc(100vw - 32px));max-height:70vh;overflow:auto;background:#fff;border:1px solid #CBD5E1;border-radius:12px;box-shadow:0 18px 50px #0f172a26;padding:16px;color:#1E293B;font:14px/1.5 Arial,sans-serif';
  document.body.appendChild(panel);

  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let alerts = [];
  let loading = false;

  async function loadAlerts() {
    if (loading) return;
    loading = true;
    try {
      const response = await fetch('/api/v1/alerts');
      if (!response.ok) throw new Error('Could not load alerts');
      alerts = await response.json();
      const pending = alerts.filter(alert => !alert.alert_acknowledged).length;
      const count = uiRoot.getElementById('pendingAlertCount');
      if (count) count.textContent = pending ? `${pending} pending alert${pending === 1 ? '' : 's'}` : 'No pending alerts';
      button.setAttribute('aria-label', pending ? `${pending} pending audit alerts` : 'No pending audit alerts');
      if (!panel.hidden) renderPanel();
    } catch (error) {
      const count = uiRoot.getElementById('pendingAlertCount');
      if (count) count.textContent = 'Alerts unavailable';
      if (!panel.hidden) panel.innerHTML = `<div>${escapeHtml(error.message)}</div>`;
    } finally { loading = false; }
  }

  function renderPanel() {
    const pending = alerts.filter(alert => !alert.alert_acknowledged);
    panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><strong style="font-size:16px">Audit alerts</strong><button type="button" data-close style="border:0;background:transparent;font-size:21px;cursor:pointer" aria-label="Close alerts">×</button></div>
      <div style="font-size:12px;color:#64748B;margin:4px 0 12px">${pending.length} need checking · ${alerts.length} flagged in total</div>
      ${pending.length ? '<button type="button" data-ack-all style="padding:7px 10px;border:0;border-radius:7px;background:#2563EB;color:white;cursor:pointer;margin-bottom:10px">Mark all checked</button>' : ''}
      ${alerts.length ? alerts.map(alert => `<article style="padding:11px 0;border-top:1px solid #E2E8F0"><div style="display:flex;justify-content:space-between;gap:8px"><strong>${escapeHtml(alert.ticket_id)}</strong><span style="font-size:11px;color:${alert.alert_acknowledged ? '#1E7F4D' : '#B45309'}">${alert.alert_acknowledged ? 'Checked' : 'Pending'}</span></div><div style="font-size:12px;color:#475569;margin:3px 0 8px">${escapeHtml(alert.type)} · score ${alert.compliance_score}</div><div style="font-size:12px;color:#64748B;margin-bottom:8px">${escapeHtml(alert.audit_reasoning)}</div><div style="display:flex;gap:8px;align-items:center"><a href="ticket-detail.html?id=${encodeURIComponent(alert.audit_id)}" style="color:#2563EB;font-size:12px">Open ticket details</a>${alert.alert_acknowledged ? '' : `<button type="button" data-ack="${escapeHtml(alert.audit_id)}" style="margin-left:auto;padding:6px 9px;border:1px solid #CBD5E1;border-radius:7px;background:white;cursor:pointer">Mark checked</button>`}</div></article>`).join('') : '<p style="color:#64748B">No flagged audit alerts yet.</p>'}`;
  }

  button.addEventListener('click', async () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) { await loadAlerts(); renderPanel(); }
  });
  panel.addEventListener('click', async event => {
    if (event.target.closest('[data-close]')) { panel.hidden = true; return; }
    try {
      if (event.target.closest('[data-ack-all]')) {
        await fetch('/api/v1/alerts/acknowledge-all', { method: 'POST' });
      } else {
        const ack = event.target.closest('[data-ack]');
        if (!ack) return;
        ack.disabled = true;
        const response = await fetch(`/api/v1/alerts/${encodeURIComponent(ack.dataset.ack)}/acknowledge`, { method: 'POST' });
        if (!response.ok) throw new Error('Could not mark this alert checked');
      }
      await loadAlerts();
    } catch (error) { panel.insertAdjacentHTML('afterbegin', `<p role="alert" style="color:#B4432F">${escapeHtml(error.message)}</p>`); }
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') panel.hidden = true; });
  document.addEventListener('click', event => { if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target) && !(sidebarHost && sidebarHost.contains(event.target))) panel.hidden = true; });
  loadAlerts();
  setInterval(loadAlerts, 8000);
})();
