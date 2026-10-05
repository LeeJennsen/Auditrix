(function () {
  let demoTimer = null;
  let refreshTimer = null;
  let demoBusy = false;
  let lastSuccessfulRefresh = null;
  let liveAuditCount = 0;
  const monitorInstance = document.getElementById('content-container').dataset.pageInstance;
  const isMonitorPage = () => {
    const content = document.getElementById('content-container');
    return content.dataset.page === 'monitor' && content.dataset.pageInstance === monitorInstance;
  };

  function asEvent(ticket) {
    const kind = ticket.requires_human_qc
      ? (ticket.compliance_score < 70 ? 'crit' : 'warn')
      : 'clear';
    const date = new Date(ticket.audited_at);
    return {
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: date.getTime(),
      ticket: ticket.ticket_id,
      text: `${ticket.type} audited ${ticket.compliance_score}/100 · ${ticket.llm_provider}/${ticket.llm_model}`,
      kind: kind
    };
  }

  async function loadLiveEvents() {
    if (window.live === false) return;
    try {
      const tickets = await AuditAPI.listTickets();
      if (!isMonitorPage()) return;
      window.rawEvents = tickets.map(asEvent).sort((a, b) => b.timestamp - a.timestamp);
      const auditCount = document.getElementById('monitorAuditCount');
      const qcCount = document.getElementById('monitorQcCount');
      if (auditCount) auditCount.textContent = tickets.length + (tickets.length === 1 ? ' audited record in feed' : ' audited records in feed');
      if (qcCount) {
        const pendingQc = tickets.filter(ticket => ticket.requires_human_qc).length;
        qcCount.textContent = pendingQc + (pendingQc === 1 ? ' needs QC' : ' need QC');
      }
      if (typeof window.render === 'function') window.render();
      lastSuccessfulRefresh = Date.now();
      liveAuditCount = tickets.length;
      const label = document.getElementById('statusLabel');
      if (label) label.textContent = `Live · ${tickets.length} audits · updated ${new Date().toLocaleTimeString()}`;
    } catch (error) {
      if (!isMonitorPage()) return;
      const label = document.getElementById('statusLabel');
      if (label) label.textContent = `Feed error: ${error.message}`;
      lastSuccessfulRefresh = null;
      const auditCount = document.getElementById('monitorAuditCount');
      const qcCount = document.getElementById('monitorQcCount');
      if (auditCount) auditCount.textContent = 'Audit count unavailable';
      if (qcCount) qcCount.textContent = 'QC count unavailable';
    }
  }

  function updateMonitorClock() {
    if (!isMonitorPage()) return;
    const now = new Date();
    const clock = document.getElementById('monitorClock');
    if (clock) {
      clock.dateTime = now.toISOString();
      clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    const label = document.getElementById('statusLabel');
    if (label && window.live !== false && lastSuccessfulRefresh !== null) {
      const age = Math.floor((Date.now() - lastSuccessfulRefresh) / 1000);
      label.textContent = `Live · ${liveAuditCount} audits · refreshed ${age}s ago`;
    }
  }

  async function injectDemoTicket() {
    if (demoBusy) return;
    demoBusy = true;
    const button = document.getElementById('demoStreamBtn');
    if (button) button.textContent = 'Adding sample…';
    try {
      const response = await fetch('/api/v1/simulator/tick', { method: 'POST' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || `Request failed (${response.status})`);
      await loadLiveEvents();
      const status = document.getElementById('demoStreamStatus');
      if (status) status.textContent = `Randomized sample ${body.ticket_id} audited with the Demo evaluator (${body.compliance_score}/100). It is now saved in the audit queue.`;
    } catch (error) {
      const status = document.getElementById('demoStreamStatus');
      if (status) status.textContent = `Could not add sample: ${error.message}`;
    } finally {
      demoBusy = false;
      const button = document.getElementById('demoStreamBtn');
      if (button) button.textContent = demoTimer ? 'Stop Random Sample Stream' : 'Start Random Sample Stream';
    }
  }

  window.toggleDemoStream = function () {
    const status = document.getElementById('demoStreamStatus');
    const button = document.getElementById('demoStreamBtn');
    if (demoTimer) {
      clearInterval(demoTimer);
      demoTimer = null;
      if (status) status.textContent = 'Demo stream stopped. Generated tickets remain in the audit queue.';
      if (button) button.textContent = 'Start Random Sample Stream';
      return;
    }
    const intervalSelect = document.getElementById('demoIntervalSelect');
    const seconds = intervalSelect ? Number(intervalSelect.value) : 8;
    if (status) status.textContent = `Starting demo stream. One random ticket will be mock-audited every ${seconds} seconds.`;
    if (button) button.textContent = 'Stop Random Sample Stream';
    injectDemoTicket();
    demoTimer = setInterval(injectDemoTicket, seconds * 1000);
  };

  loadLiveEvents();
  refreshTimer = setInterval(loadLiveEvents, 4000);
  updateMonitorClock();
  setInterval(updateMonitorClock, 1000);
})();
