(function () {
const API_BASE = window.location.origin.startsWith('file')
    ? 'http://localhost:8000'
    : window.location.origin;

  const SAMPLES = {
    compliant: [
      {
        ticket_id: "INC0012345",
        type: "INC",
        description: "Users in the Kuala Lumpur office report VPN disconnects every 10 minutes on managed laptops, interrupting access to the finance application.",
        resolution_notes: "Root cause: VPN client 4.2 conflicted with the new firewall policy. Remediation: upgraded affected laptops to client 4.5.1, cleared cached credentials, and reconnected each device. Validation: monitored VPN-Gateway-02 for 30 minutes; sessions stayed active and finance application access succeeded. Business impact: 18 finance users could not work during the 25-minute interruption. The requester confirmed recovery at 14:32. This was an isolated event with no earlier related incidents; a problem record was not applicable.",
        closing_agent: "agent.rivera"
      },
      {
        ticket_id: "SR0042187",
        type: "SR",
        description: "Finance analyst requests read-only access to the monthly revenue dashboard.",
        resolution_notes: "Fulfilled: granted read-only access to the Revenue-Monthly dashboard for the analyst's finance account; no other systems or write permissions were added. Approval: manager Lina Tan approved on 2026-09-21, recorded in approval AC-8821. Completed within the 2-business-day SLA (requested 2026-09-21 09:10, granted 2026-09-21 11:42). The requester signed in and confirmed the dashboard opened successfully at 12:05.",
        closing_agent: "agent.nadia"
      },
      {
        ticket_id: "CR0073041",
        type: "CR",
        description: "Approved maintenance to upgrade the customer portal database from version 14 to 15.",
        resolution_notes: "Implemented the approved database upgrade plan during the 01:00-01:30 UTC window on 2026-09-20. CAB approval CAB-2026-441 was recorded on 2026-09-18. No plan deviations occurred. Post-change validation passed: application health endpoint returned 200, read/write smoke tests passed, and replication lag returned to baseline. The rollback plan was ready but not invoked. Actual customer impact was 4 minutes of read-only mode, within the approved 5-minute impact allowance. Service owner Maya Lim confirmed normal portal operation at 01:24 UTC.",
        closing_agent: "agent.owen"
      }
    ],
    nonCompliant: [
      {
        ticket_id: "INC0065312",
        type: "INC",
        description: "Several users cannot print invoices from the shared finance printer.",
        resolution_notes: "Restarted the printer. Seems fine now.",
        closing_agent: "agent.farah"
      },
      {
        ticket_id: "SR0042188",
        type: "SR",
        description: "Employee requests access to the finance reporting dashboard.",
        resolution_notes: "Access granted. Request completed.",
        closing_agent: "agent.nadia"
      },
      {
        ticket_id: "CR0098765",
        type: "CR",
        description: "Scheduled change to upgrade the production database cluster to a new major version.",
        resolution_notes: "Upgrade completed. Looks good.",
        closing_agent: "agent.chen"
      }
    ]
  };

  let backendSamples = [];

  const els = {
    ticket_id: document.getElementById('ticket_id'),
    type: document.getElementById('type'),
    description: document.getElementById('description'),
    resolution_notes: document.getElementById('resolution_notes'),
    closing_agent: document.getElementById('closing_agent'),
    llm_provider: document.getElementById('llm_provider'),
    form: document.getElementById('ticketForm'),
    runBtn: document.getElementById('runBtn'),
    errorMsg: document.getElementById('errorMsg'),
    emptyState: document.getElementById('emptyState'),
    resultBody: document.getElementById('resultBody'),
    scoreNum: document.getElementById('scoreNum'),
    statusPill: document.getElementById('statusPill'),
    statusText: document.getElementById('statusText'),
    reasoningText: document.getElementById('reasoningText'),
    metaTicketId: document.getElementById('metaTicketId'),
    metaProvider: document.getElementById('metaProvider'),
    metaLatency: document.getElementById('metaLatency'),
    connStatus: document.getElementById('connStatus'),
    connLabel: document.getElementById('connLabel'),
  };

  function fillForm(sample){
    els.ticket_id.value = sample.ticket_id;
    els.type.value = sample.type;
    els.description.value = sample.description;
    els.resolution_notes.value = sample.resolution_notes;
    els.closing_agent.value = sample.closing_agent;
  }

  function providerLabel(provider, model) {
    return provider === 'mock' ? 'Offline demo rules (no AI model)' : `${provider}${model ? ` / ${model}` : ''}`;
  }

  function updateAuditButtonLabel() {
    if (els.runBtn.disabled) return;
    els.runBtn.textContent = els.llm_provider.value === 'mock' ? 'Run offline demo evaluation' : 'Run AI audit';
  }
  els.llm_provider.addEventListener('change', updateAuditButtonLabel);

  function loadRandomSample(samples){
    const sample = samples[Math.floor(Math.random() * samples.length)];
    fillForm(sample);
  }

  document.getElementById('loadCompliant').addEventListener('click', () => loadRandomSample(backendSamples.filter(sample => sample.expected === 'compliant')));
  document.getElementById('loadNonCompliant').addEventListener('click', () => loadRandomSample(backendSamples.filter(sample => sample.expected === 'non_compliant')));

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  async function loadSamples() {
    const response = await fetch(`${API_BASE}/api/v1/samples`);
    if (!response.ok) throw new Error('Could not load sample tickets.');
    backendSamples = await response.json();
    document.getElementById('sampleSelect').innerHTML = backendSamples.map(sample =>
      `<option value="${escapeHtml(sample.sample_id)}">${escapeHtml(sample.label)} · ${sample.expected.replace('_', ' ')}</option>`
    ).join('');
  }

  document.getElementById('loadSelected').addEventListener('click', () => {
    const id = document.getElementById('sampleSelect').value;
    const sample = backendSamples.find(item => item.sample_id === id);
    if (sample) fillForm(sample);
    else showError('Select at least one sample first.');
  });

  document.getElementById('runBatch').addEventListener('click', async () => {
    clearError();
    const sample_ids = Array.from(document.getElementById('sampleSelect').selectedOptions).map(option => option.value);
    if (!sample_ids.length) return showError('Select one or more sample tickets first.');
    const button = document.getElementById('runBatch');
    const status = document.getElementById('batchStatus');
    const results = document.getElementById('batchResults');
    button.disabled = true;
    status.textContent = `Running ${sample_ids.length} audit(s) with ${providerLabel(els.llm_provider.value)}…`;
    results.textContent = '';
    try {
      const response = await fetch(`${API_BASE}/api/v1/audits/batch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample_ids, llm_provider: els.llm_provider.value })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
      status.textContent = `Finished: ${data.succeeded} succeeded, ${data.failed} failed. Successful audits are saved in Audit History.`;
      results.innerHTML = data.results.map(item => {
        const audit = item.audit;
        const text = audit
          ? `${audit.ticket_id}: score ${audit.compliance_score}, ${audit.requires_human_qc ? 'flagged for QC' : 'cleared'} · ${providerLabel(audit.llm_provider, audit.llm_model)}`
          : `${item.ticket_id}: ${item.error}`;
        const href = audit ? `/auditrix-prototype-main/ticket-detail.html?id=${encodeURIComponent(audit.audit_id)}` : '';
        return `<div style="padding:8px 0;border-top:1px solid #E2E8F0;font-size:12.5px;">${escapeHtml(text)} ${href ? `<a href="${href}">View</a>` : ''}</div>`;
      }).join('');
    } catch (error) {
      status.textContent = '';
      showError(error.message);
    } finally {
      button.disabled = false;
    }
  });

  function showError(msg){
    els.errorMsg.textContent = msg;
    els.errorMsg.classList.add('show');
  }
  function clearError(){
    els.errorMsg.classList.remove('show');
    els.errorMsg.textContent = '';
  }

  function renderResult(data){
    els.emptyState.style.display = 'none';
    els.resultBody.classList.add('show');

    els.scoreNum.textContent = data.compliance_score;
    els.reasoningText.textContent = data.audit_reasoning;
    const breakdown = document.getElementById('criterionBreakdown');
    breakdown.innerHTML = '<h3>Weighted criteria</h3>' + (data.criterion_results || []).map(criterion => {
      const status = criterion.status.replace('_', ' ');
      return `<div class="criterion-result"><div><strong>${escapeHtml(criterion.title)}</strong><span class="criterion-result-status ${escapeHtml(criterion.status)}">${escapeHtml(status)} · ${Number(criterion.weight)}%</span></div><p>${criterion.evidence ? `Evidence: “${escapeHtml(criterion.evidence)}”` : 'No supporting resolution-note evidence.'}</p></div>`;
    }).join('');
    els.metaTicketId.textContent = data.ticket_id;
    els.metaProvider.textContent = providerLabel(data.llm_provider, data.llm_model);
    els.metaLatency.textContent = data.processing_time_ms + ' ms';

    els.statusPill.classList.remove('ok', 'warn');
    if (data.requires_human_qc) {
      els.statusPill.classList.add('warn');
      els.statusText.textContent = 'Flagged for human QC review';
    } else {
      els.statusPill.classList.add('ok');
      els.statusText.textContent = 'Approved — no review needed';
    }
  }

  els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const payload = {
      ticket_id: els.ticket_id.value.trim(),
      type: els.type.value,
      description: els.description.value.trim(),
      resolution_notes: els.resolution_notes.value.trim(),
      closing_agent: els.closing_agent.value.trim(),
      llm_provider: els.llm_provider.value,
    };

    els.runBtn.disabled = true;
    els.runBtn.textContent = 'Auditing…';

    try {
      const res = await fetch(`${API_BASE}/api/v1/tickets/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      renderResult(data);
    } catch (err) {
      showError(
        err.message === 'Failed to fetch'
          ? `Couldn't reach the audit API at ${API_BASE}. Make sure the FastAPI server is running.`
          : err.message
      );
    } finally {
      els.runBtn.disabled = false;
      updateAuditButtonLabel();
    }
  });

  // Lightweight backend health check on load, purely informational.
  async function checkBackend(){
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const available = data.providers || {};
      for (const [provider, label] of Object.entries({
        gemini: 'Gemini', anthropic: 'Claude', openai: 'ChatGPT'
      })) {
        const option = els.llm_provider.querySelector(`option[value="${provider}"]`);
        option.disabled = !available[provider];
        option.textContent = available[provider] ? label : `${label} (API key missing)`;
      }
      const defaultProvider = data.default_llm_provider;
      if (defaultProvider === 'mock' || available[defaultProvider]) {
        els.llm_provider.value = defaultProvider;
      } else {
        const firstAvailable = Object.keys(available).find((provider) => available[provider]);
        els.llm_provider.value = firstAvailable || 'mock';
      }
      updateAuditButtonLabel();
      els.connStatus.className = 'conn live';
      await loadSamples();
      els.connLabel.textContent = `Backend live · ${data.llm_provider}`;
    } catch {
      els.connStatus.className = 'conn down';
      els.connLabel.textContent = 'Backend unreachable';
    }
  }
  checkBackend();
})();
