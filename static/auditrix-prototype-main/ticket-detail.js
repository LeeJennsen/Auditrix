(function () {
  const main = document.getElementById('content-container');
  const routeQuery = window.location.hash.startsWith('#/') && window.location.hash.includes('?')
    ? window.location.hash.slice(window.location.hash.indexOf('?') + 1)
    : window.location.search.slice(1);
  const auditId = new URLSearchParams(routeQuery).get('id');
  const pageInstance = main.dataset.pageInstance;
  const isTicketDetailPage = () => main.dataset.page === 'ticket-detail' && main.dataset.pageInstance === pageInstance;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function panel(title, body, subtitle) {
    return `<section style="background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:20px 22px;">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:baseline;flex-wrap:wrap;"><h2 style="font-size:15px;margin:0;color:#1E293B;">${title}</h2>${subtitle ? `<span style="font-size:11px;color:#64748B;">${subtitle}</span>` : ''}</div>
      <div style="margin-top:12px;">${body}</div></section>`;
  }

  function valueCard(label, value) {
    return `<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:9px;padding:13px 14px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748B;">${label}</div><div style="font-size:13px;font-weight:600;color:#1E293B;margin-top:6px;overflow-wrap:anywhere;">${value}</div></div>`;
  }

  function timelineItem(title, date, detail, state) {
    const color = state === 'warn' ? '#B45309' : state === 'done' ? '#1E7F4D' : '#2563EB';
    return `<div style="display:grid;grid-template-columns:18px 1fr;gap:12px;padding:10px 0;"><div style="width:10px;height:10px;border-radius:50%;background:${color};margin:4px auto 0;"></div><div><div style="font-size:13px;font-weight:600;color:#1E293B;">${title}</div><div style="font-size:11px;color:#64748B;margin-top:2px;">${escapeHtml(date)}</div><div style="font-size:12px;color:#475569;margin-top:4px;">${detail}</div></div></div>`;
  }

  function renderTicketIndex(tickets) {
    const sorted = tickets.slice().sort((a, b) => new Date(b.audited_at) - new Date(a.audited_at));
    main.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
        <div><h1 style="font-size:26px;color:#1E293B;margin:0;">Ticket Details</h1><p style="font-size:13px;color:#64748B;margin:7px 0 0;">Browse every saved audit record. Open any ticket to see evidence, AI reasoning, rubric, timeline, and review controls.</p></div>
        <a href="queue.html" style="padding:9px 13px;border:1px solid #CBD5E1;border-radius:8px;color:#1D4ED8;text-decoration:none;font-size:13px;">Open Audit Queue</a>
      </div>
      <section style="background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:16px;">
        <div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center;">
          <input id="detailSearch" type="search" placeholder="Search ticket ID, description, agent, provider..." aria-label="Search ticket details" style="flex:1;min-width:230px;padding:10px 12px;border:1px solid #CBD5E1;border-radius:8px;font:13px 'Times New Roman',serif;">
          <select id="detailType" aria-label="Filter by type" style="padding:10px;border:1px solid #CBD5E1;border-radius:8px;background:#fff;font:13px 'Times New Roman',serif;"><option value="all">All types</option><option value="INC">Incidents</option><option value="SR">Service Requests</option><option value="CR">Change Requests</option></select>
          <select id="detailStatus" aria-label="Filter by audit status" style="padding:10px;border:1px solid #CBD5E1;border-radius:8px;background:#fff;font:13px 'Times New Roman',serif;"><option value="all">All statuses</option><option value="flagged">Needs QC</option><option value="cleared">Cleared</option><option value="reviewed">Reviewed</option></select>
        </div>
        <div id="detailCount" style="font-size:12px;color:#64748B;margin:12px 0 8px;"></div>
        <div style="overflow:auto;"><table style="width:100%;min-width:790px;border-collapse:collapse;text-align:left;"><thead><tr style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748B;background:#F8FAFC;"><th style="padding:11px;border-bottom:1px solid #E2E8F0;">Ticket</th><th style="padding:11px;border-bottom:1px solid #E2E8F0;">Type / Summary</th><th style="padding:11px;border-bottom:1px solid #E2E8F0;">Score</th><th style="padding:11px;border-bottom:1px solid #E2E8F0;">Audit status</th><th style="padding:11px;border-bottom:1px solid #E2E8F0;">Audited</th><th style="padding:11px;border-bottom:1px solid #E2E8F0;"></th></tr></thead><tbody id="detailRows"></tbody></table></div>
      </section>
      <div id="detailEmpty" style="display:none;padding:30px;text-align:center;background:#fff;border:1px solid #E2E8F0;border-radius:12px;color:#64748B;">No tickets match those filters. <a href="/audit-runner.html">Run an AI audit</a> to add another record.</div>`;

    function paint() {
      const query = document.getElementById('detailSearch').value.trim().toLowerCase();
      const type = document.getElementById('detailType').value;
      const status = document.getElementById('detailStatus').value;
      const visible = sorted.filter(ticket => {
        const ticketStatus = ticket.requires_human_qc ? 'flagged' : ticket.review_action ? 'reviewed' : 'cleared';
        const text = [ticket.ticket_id, ticket.type, ticket.description, ticket.closing_agent, ticket.llm_provider, ticket.llm_model].join(' ').toLowerCase();
        return (type === 'all' || ticket.type === type) && (status === 'all' || ticketStatus === status) && (!query || text.includes(query));
      });
      document.getElementById('detailCount').textContent = `Showing ${visible.length} of ${sorted.length} saved audit records`;
      document.getElementById('detailEmpty').style.display = visible.length ? 'none' : 'block';
      document.getElementById('detailRows').innerHTML = visible.map(ticket => {
        const flagged = ticket.requires_human_qc;
        const state = flagged ? 'Needs QC' : ticket.review_action ? 'Reviewed' : 'Cleared';
        const color = flagged ? '#B45309' : '#1E7F4D';
        return `<tr style="font-size:13px;color:#334155;"><td style="padding:12px;border-bottom:1px solid #E2E8F0;"><strong>${escapeHtml(ticket.ticket_id)}</strong><div class="mono" style="font-size:10px;color:#64748B;margin-top:3px;">${escapeHtml(ticket.audit_id)}</div></td><td style="padding:12px;border-bottom:1px solid #E2E8F0;"><strong>${escapeHtml(ticket.type)}</strong><div style="max-width:380px;color:#64748B;margin-top:3px;">${escapeHtml(ticket.description)}</div></td><td style="padding:12px;border-bottom:1px solid #E2E8F0;font-weight:700;color:${ticket.compliance_score < ticket.compliance_threshold ? '#B45309' : '#1E7F4D'};">${ticket.compliance_score}<span style="font-weight:400;color:#94A3B8;"> / 100</span></td><td style="padding:12px;border-bottom:1px solid #E2E8F0;"><span style="padding:4px 8px;border-radius:999px;background:${flagged ? '#FDF3E6' : '#E8F5EE'};color:${color};font-size:11px;font-weight:700;">${state}</span></td><td style="padding:12px;border-bottom:1px solid #E2E8F0;white-space:nowrap;">${escapeHtml(new Date(ticket.audited_at).toLocaleString())}</td><td style="padding:12px;border-bottom:1px solid #E2E8F0;"><a href="ticket-detail.html?id=${encodeURIComponent(ticket.audit_id)}" style="white-space:nowrap;color:#2563EB;text-decoration:none;font-weight:600;">View details →</a></td></tr>`;
      }).join('');
    }
    ['detailSearch', 'detailType', 'detailStatus'].forEach(id => document.getElementById(id).addEventListener(id === 'detailSearch' ? 'input' : 'change', paint));
    paint();
  }

  function render(ticket, rubrics) {
    const flagged = ticket.requires_human_qc;
    const statusText = flagged ? 'Flagged for human QC' : 'Cleared by audit';
    const badgeStyle = flagged ? 'background:#FDF3E6;color:#B45309;' : 'background:#E8F5EE;color:#1E7F4D;';
    const rubric = rubrics[ticket.type] || 'No SOP is currently configured for this ticket type.';
    const decision = ticket.reviewed_at
      ? `${escapeHtml(ticket.review_action)}${ticket.review_reason ? ' · ' + escapeHtml(ticket.review_reason) : ''} · ${escapeHtml(new Date(ticket.reviewed_at).toLocaleString())}`
      : flagged ? 'Awaiting human review.' : 'No human review was required.';
    const scoreColor = ticket.compliance_score < ticket.compliance_threshold ? '#B45309' : '#1E7F4D';

    const timeline = timelineItem('Ticket closed', new Date(ticket.closed_at).toLocaleString(), `Closed by ${escapeHtml(ticket.closing_agent)}.`, 'done') +
      timelineItem('AI evaluation completed', new Date(ticket.audited_at).toLocaleString(), `${escapeHtml(ticket.llm_provider)} / ${escapeHtml(ticket.llm_model)} returned a score in ${ticket.processing_time_ms} ms.`, 'done') +
      timelineItem(flagged ? 'Routed to QC queue' : 'Auto-cleared', new Date(ticket.audited_at).toLocaleString(), `Score ${ticket.compliance_score}; threshold ${ticket.compliance_threshold}.`, flagged ? 'warn' : 'done') +
      (ticket.reviewed_at ? timelineItem('Human review recorded', new Date(ticket.reviewed_at).toLocaleString(), decision, 'done') : '');

    main.innerHTML = `
        <div><a href="ticket-detail.html" style="font-size:12.5px;color:#2563EB;text-decoration:none;">&larr; All Ticket Details</a>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px;"><h1 style="font-size:25px;margin:0;color:#1E293B;">${escapeHtml(ticket.ticket_id)}</h1><span style="padding:5px 11px;border-radius:999px;font-size:12px;font-weight:700;${badgeStyle}">${statusText}</span></div>
          <div style="margin-top:7px;color:#64748B;font-size:13px;">${escapeHtml(ticket.type)} · Audit ID <span class="mono">${escapeHtml(ticket.audit_id)}</span></div>
        </div>
        <div style="background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:16px 22px;text-align:center;min-width:125px;"><div style="font-size:36px;font-weight:700;line-height:1;color:${scoreColor};">${ticket.compliance_score}</div><div style="font-size:12px;color:#64748B;margin-top:5px;">/ 100 score</div><div style="font-size:10px;color:#64748B;margin-top:3px;">threshold ${ticket.compliance_threshold}</div></div>
      </div>

      ${panel('Audit record', `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:10px;">
        ${valueCard('Ticket type', escapeHtml(ticket.type))}${valueCard('Closing agent', escapeHtml(ticket.closing_agent))}${valueCard('Closed at', escapeHtml(new Date(ticket.closed_at).toLocaleString()))}${valueCard('Audited at', escapeHtml(new Date(ticket.audited_at).toLocaleString()))}${valueCard('AI provider / model', escapeHtml(ticket.llm_provider + ' / ' + ticket.llm_model))}${valueCard('Processing time', escapeHtml(ticket.processing_time_ms + ' ms'))}
      </div>`, 'Values received from the stored audit record')}

      ${panel('AI assessment and flag reason', `<div style="font-size:14px;line-height:1.7;color:#334155;white-space:pre-wrap;">${escapeHtml(ticket.audit_reasoning)}</div><div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-top:14px;padding-top:13px;border-top:1px solid #E2E8F0;"><span style="font-size:12px;color:#64748B;">Routing:</span><strong style="font-size:12px;color:${scoreColor};">${flagged ? 'Human review required' : 'Auto-cleared'}</strong><span style="font-size:12px;color:#64748B;">${ticket.compliance_score} ${ticket.compliance_score < ticket.compliance_threshold ? '&lt;' : '&ge;'} ${ticket.compliance_threshold} threshold</span></div>`)}

      ${panel('Source ticket evidence', `<div style="display:grid;gap:12px;"><div><div style="font-size:11px;text-transform:uppercase;color:#64748B;margin-bottom:5px;">Description</div><div style="font-size:13px;line-height:1.65;white-space:pre-wrap;color:#334155;">${escapeHtml(ticket.description)}</div></div><div><div style="font-size:11px;text-transform:uppercase;color:#64748B;margin-bottom:5px;">Resolution notes evaluated by the model</div><div style="font-size:13px;line-height:1.65;white-space:pre-wrap;color:#334155;background:#F8FAFC;border-radius:8px;padding:12px;">${escapeHtml(ticket.resolution_notes)}</div></div></div>`)}

      ${panel('Audit lifecycle and QC decision', `<div style="display:grid;grid-template-columns:minmax(240px,1fr) minmax(280px,1.2fr);gap:24px;align-items:start;"><div>${timeline}</div><div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px;"><div style="font-size:11px;text-transform:uppercase;color:#64748B;">Review state</div><div id="reviewDecision" style="font-size:13px;line-height:1.6;color:#1E293B;margin-top:7px;">${decision}</div>${flagged ? `<label for="reviewReason" style="display:block;font-size:12px;color:#64748B;margin:14px 0 6px;">Reviewer note (required for override)</label><textarea id="reviewReason" rows="3" placeholder="Record evidence or rationale" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #CBD5E1;border-radius:8px;font:inherit;resize:vertical;"></textarea><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;"><button id="approveAuditBtn" type="button" style="padding:9px 13px;border:1px solid #CBD5E1;border-radius:8px;background:#fff;cursor:pointer;">Agree with AI flag</button><button id="overrideAuditBtn" type="button" style="padding:9px 13px;border:0;border-radius:8px;background:#2563EB;color:white;cursor:pointer;">Override and clear flag</button></div><div id="reviewMessage" role="status" style="font-size:12px;margin-top:9px;color:#64748B;"></div>` : ''}</div></div>`, 'Decision is saved to the server')}

      ${panel(`Full ${escapeHtml(ticket.type)} SOP used for this audit`, `<pre style="white-space:pre-wrap;font:13px/1.7 inherit;color:#334155;margin:0;">${escapeHtml(rubric.trim())}</pre>`, 'Same server-side text supplied to the AI evaluator')}

      <div style="display:flex;gap:8px;flex-wrap:wrap;"><button id="exportTicketBtn" type="button" style="padding:9px 13px;border:1px solid #CBD5E1;border-radius:8px;background:#fff;cursor:pointer;">Export audit details (JSON)</button><a href="/audit-runner.html" style="padding:9px 13px;border:1px solid #CBD5E1;border-radius:8px;background:#fff;color:#1D4ED8;text-decoration:none;font-size:13px;">Run another audit</a><span id="exportMessage" role="status" style="align-self:center;font-size:12px;color:#64748B;"></span></div>`;

    const approve = document.getElementById('approveAuditBtn');
    const override = document.getElementById('overrideAuditBtn');
    if (approve) approve.addEventListener('click', function () { submitReview('approve'); });
    if (override) override.addEventListener('click', function () { submitReview('override'); });
    document.getElementById('exportTicketBtn').addEventListener('click', function () {
      const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(ticket, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${ticket.ticket_id}-audit.json`;
      link.click();
      URL.revokeObjectURL(blobUrl);
      document.getElementById('exportMessage').textContent = 'Audit details downloaded.';
    });
  }

  async function submitReview(action) {
    const message = document.getElementById('reviewMessage');
    const reason = document.getElementById('reviewReason').value.trim();
    if (action === 'override' && !reason) {
      message.textContent = 'Enter the reason for overriding this AI decision.';
      return;
    }
    message.textContent = 'Saving review…';
    try {
      const ticket = await AuditAPI.reviewTicket(auditId, action, reason);
      const rubrics = await AuditAPI.getRubrics();
      if (!isTicketDetailPage()) return;
      render(ticket, rubrics);
    } catch (error) {
      if (!isTicketDetailPage()) return;
      message.textContent = error.message;
    }
  }

  if (!auditId) {
    main.innerHTML = '<p style="color:#64748B;">Loading all ticket records…</p>';
    AuditAPI.listTickets().then(function (tickets) {
      if (!isTicketDetailPage()) return;
      renderTicketIndex(tickets);
    }).catch(function (error) {
      if (!isTicketDetailPage()) return;
      main.innerHTML = `<a href="queue.html">Open Audit Queue</a><p style="color:#B4432F;">Could not load ticket records: ${escapeHtml(error.message)}</p>`;
    });
  } else {
    Promise.all([AuditAPI.getTicket(auditId), AuditAPI.getRubrics()]).then(function (result) {
      if (!isTicketDetailPage()) return;
      render(result[0], result[1]);
    }).catch(function (error) {
      if (!isTicketDetailPage()) return;
      main.innerHTML = `<a href="queue.html">Back to Audit Queue</a><p style="color:#B4432F;">Could not load this audit: ${escapeHtml(error.message)}</p>`;
    });
  }
})();
