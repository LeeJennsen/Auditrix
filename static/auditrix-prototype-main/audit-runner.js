(function () {
const API_BASE = window.location.protocol === 'file:'
    ? 'http://localhost:8000'
    : window.location.origin;

  const els = {
    ticket_id: document.getElementById('ticket_id'),
    type: document.getElementById('type'),
    description: document.getElementById('description'),
    resolution_notes: document.getElementById('resolution_notes'),
    closing_agent: document.getElementById('closing_agent'),
    created_at: document.getElementById('created_at'),
    llm_provider: document.getElementById('llm_provider'),
    form: document.getElementById('ticketForm'),
    runBtn: document.getElementById('runBtn'),
    loadSampleBtn: document.getElementById('loadSampleBtn'),
    runSampleBtn: document.getElementById('runSampleBtn'),
    sampleStatus: document.getElementById('sampleStatus'),
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
    generateBtn: document.getElementById('generateTicketsBtn'),
    generatorStatus: document.getElementById('generatorStatus'),
    generatorLiveState: document.getElementById('generatorLiveState'),
    generatedTicketList: document.getElementById('generatedTicketList'),
  };

  function providerLabel(provider, model) {
    return provider === 'mock' ? 'Rule-based evaluator (no AI model)' : `${provider}${model ? ` / ${model}` : ''}`;
  }

  function updateAuditButtonLabel() {
    if (els.runBtn.disabled) return;
    els.runBtn.textContent = els.llm_provider.value === 'mock' ? 'Run rule-based audit' : 'Run AI audit';
  }
  els.llm_provider.addEventListener('change', updateAuditButtonLabel);

  function setDateInput(isoDate) {
    if (!isoDate) {
      els.created_at.value = '';
      return;
    }
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      els.created_at.value = '';
      return;
    }
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    els.created_at.value = local.toISOString().slice(0, 16);
  }

  function auditPayload() {
    const payload = {
      ticket_id: els.ticket_id.value.trim(),
      type: els.type.value,
      description: els.description.value.trim(),
      resolution_notes: els.resolution_notes.value.trim(),
      closing_agent: els.closing_agent.value.trim(),
      llm_provider: els.llm_provider.value,
    };
    if (els.created_at.value) payload.created_at = new Date(els.created_at.value).toISOString();
    return payload;
  }

  async function loadRandomSample(runAfterLoad) {
    clearError();
    els.sampleStatus.textContent = 'Generating a random sample from the live audit service…';
    els.loadSampleBtn.disabled = true;
    els.runSampleBtn.disabled = true;
    try {
      const sample = await AuditAPI.getRandomSample();
      els.ticket_id.value = sample.ticket_id;
      els.type.value = sample.type;
      els.description.value = sample.description;
      els.resolution_notes.value = sample.resolution_notes;
      els.closing_agent.value = sample.closing_agent;
      setDateInput(sample.created_at);
      els.sampleStatus.textContent = `Generated ${sample.ticket_id} from the live service. Run the audit to save it.`;
      if (runAfterLoad) await runAudit(auditPayload());
    } catch (error) {
      els.sampleStatus.textContent = '';
      showError(error.message === 'Failed to fetch'
        ? `Couldn't load a sample from ${API_BASE}. Make sure the FastAPI server and database are running.`
        : error.message);
    } finally {
      els.loadSampleBtn.disabled = false;
      els.runSampleBtn.disabled = false;
    }
  }

  els.loadSampleBtn.addEventListener('click', function () { loadRandomSample(false); });
  els.runSampleBtn.addEventListener('click', function () { loadRandomSample(true); });

  function renderGeneratedTickets(state, mode) {
    els.generateBtn.disabled = mode !== 'live';
    els.generatorLiveState.textContent = mode === 'live'
      ? `${state.tickets.length} saved tickets in the live database snapshot.`
      : 'Waiting for a live database connection.';
    const latestGenerated = state.tickets.find(function (ticket) { return ticket.generation_batch_id; });
    const recent = latestGenerated
      ? state.tickets.filter(function (ticket) { return ticket.generation_batch_id === latestGenerated.generation_batch_id; }).slice(0, 5)
      : [];
    els.generatedTicketList.innerHTML = recent.length ? recent.map(function (ticket) {
      return `<a href="ticket-detail.html?id=${encodeURIComponent(ticket.audit_id)}" style="display:flex;justify-content:space-between;gap:12px;padding:8px 10px;border:1px solid #E2E8F0;border-radius:7px;color:#334155;text-decoration:none;font-size:12px;"><span><strong>${escapeHtml(ticket.ticket_id)}</strong> · ${escapeHtml(ticket.type)}</span><span>${ticket.compliance_score}/100 · ${escapeHtml(ticket.llm_provider)}</span></a>`;
    }).join('') : '<div class="muted" style="font-size:12px;">No generated tickets in the current database snapshot.</div>';
  }

  AuditAPI.onState(renderGeneratedTickets);

  els.generateBtn.addEventListener('click', async function () {
    els.generateBtn.disabled = true;
    els.generatorStatus.textContent = 'Generating and scoring tickets…';
    try {
      const result = await AuditAPI.generateTickets(10);
      els.generatorStatus.textContent = `Saved ${result.generated_count} tickets. AI scored ${result.ai_scored_count}; randomized demo fallback scored ${result.demo_fallback_count}.`;
    } catch (error) {
      els.generatorStatus.textContent = error.message;
    } finally {
      els.generateBtn.disabled = AuditAPI.getMode() !== 'live';
    }
  });

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

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
    const auditFlags = Array.isArray(data.audit_flags) ? data.audit_flags : [];
    document.getElementById('auditFlagsResult').innerHTML = auditFlags.length
      ? `<div style="margin-top:10px;font-size:12px;font-weight:700;color:#92400E;">Audit flags</div><ul style="margin:5px 0;padding-left:20px;color:#92400E;font-size:12px;">${auditFlags.map(flag => `<li>${escapeHtml(flag)}</li>`).join('')}</ul>`
      : '';
    const spread = data.score_spread || {};
    const spreadFields = [
      ['policy_compliance', 'Policy compliance'],
      ['escalation_protocol', 'Escalation protocol'],
      ['tone_and_sentiment', 'Tone and sentiment'],
      ['documentation_accuracy', 'Documentation accuracy']
    ];
    document.getElementById('scoreSpreadResult').innerHTML = spreadFields.map(function (item) {
      const value = spread[item[0]];
      return `<div style="padding:9px 10px;border:1px solid #E2E8F0;border-radius:8px;background:#F8FAFC;"><div style="font-size:10px;color:#64748B;">${item[1]}</div><strong style="display:block;margin-top:4px;color:#1E293B;">${value == null ? 'Not scored' : escapeHtml(value + ' / 100')}</strong></div>`;
    }).join('');
    const breakdown = document.getElementById('criterionBreakdown');
    breakdown.innerHTML = '<h3>Weighted criteria</h3>' + (data.criterion_results || []).map(criterion => {
      const status = criterion.status.replace('_', ' ');
      const weightLabel = Number(criterion.weight) === 0 ? 'dimension metric' : Number(criterion.weight) + '%';
      return `<div class="criterion-result"><div><strong>${escapeHtml(criterion.title)}</strong><span class="criterion-result-status ${escapeHtml(criterion.status)}">${escapeHtml(status)} · ${weightLabel}</span></div><p>${criterion.evidence ? `Evidence: “${escapeHtml(criterion.evidence)}”` : 'No supporting resolution-note evidence.'}</p></div>`;
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

  async function runAudit(payload) {
    clearError();
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
  }

  els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await runAudit(auditPayload());
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
      els.connLabel.textContent = `Backend live · ${data.llm_provider}`;
    } catch {
      els.connStatus.className = 'conn down';
      els.connLabel.textContent = 'Backend unreachable';
    }
  }
  checkBackend();
})();
