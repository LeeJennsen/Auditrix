(function () {
  let lastUpdate = null;
  let auditCount = 0;
  let feedMode = 'connecting';
  const content = document.getElementById('content-container');
  const monitorInstance = content.dataset.pageInstance;
  const isMonitorPage = () => content.dataset.page === 'monitor' && content.dataset.pageInstance === monitorInstance;

  function asEvent(ticket) {
    const kind = ticket.requires_human_qc
      ? (ticket.compliance_score < 70 ? 'crit' : 'warn')
      : 'clear';
    const date = new Date(ticket.audited_at);
    const spread = ticket.score_spread || {};
    const spreadText = ['policy_compliance', 'escalation_protocol', 'tone_and_sentiment', 'documentation_accuracy']
      .map(function (field) { return spread[field] == null ? null : field.replace(/_/g, ' ') + ' ' + spread[field]; })
      .filter(Boolean).join(' · ');
    return {
      audit_id: ticket.audit_id,
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: date.getTime(),
      ticket: ticket.ticket_id,
      text: `${ticket.type} audited ${ticket.compliance_score}/100 · ${spreadText || 'score spread not available'} · ${ticket.llm_provider}/${ticket.llm_model}`,
      kind: kind
    };
  }

  function applyState(state, source) {
    if (!isMonitorPage()) return;
    const tickets = state.tickets || [];
    feedMode = source;
    window.monitorMode = source;
    window.monitorTickets = tickets;
    window.rawEvents = tickets.map(asEvent).sort((a, b) => b.timestamp - a.timestamp);
    auditCount = tickets.length;
    lastUpdate = Date.now();
    const auditLabel = document.getElementById('monitorAuditCount');
    const qcLabel = document.getElementById('monitorQcCount');
    if (auditLabel) auditLabel.textContent = tickets.length + (tickets.length === 1 ? ' audited record in feed' : ' audited records in feed');
    if (qcLabel) {
      const pendingQc = tickets.filter(ticket => ticket.requires_human_qc).length;
      qcLabel.textContent = pendingQc + (pendingQc === 1 ? ' needs QC' : ' need QC');
    }
    if (window.live !== false && typeof window.render === 'function') window.render();
    updateConnectionLabel();
  }

  function updateConnectionLabel() {
    if (!isMonitorPage() || window.live === false) return;
    const label = document.getElementById('statusLabel');
    if (!label) return;
    const age = lastUpdate === null ? '' : ` · updated ${Math.floor((Date.now() - lastUpdate) / 1000)}s ago`;
    label.textContent = `${feedMode === 'live' ? 'Live database WebSocket' : 'Database unavailable'} · ${auditCount} audits${age}`;
  }
  window.updateMonitorConnection = updateConnectionLabel;

  function updateMonitorClock() {
    if (!isMonitorPage()) return;
    const now = new Date();
    const clock = document.getElementById('monitorClock');
    if (clock) {
      clock.dateTime = now.toISOString();
      clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    updateConnectionLabel();
  }

  AuditAPI.onState(applyState);
  updateMonitorClock();
  setInterval(updateMonitorClock, 1000);
})();
