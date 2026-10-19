(function () {
  'use strict';

  const main = document.getElementById('content-container');
  const pageInstance = main.dataset.pageInstance;
  main.innerHTML = `
    <header style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
      <div><a href="index.html" style="font-size:12.5px;color:#2563EB;text-decoration:none;">&larr; Back to Dashboard</a>
        <h1 style="font-size:26px;color:#1E293B;margin:10px 0 0;">Consistency Analytics</h1>
        <p style="font-size:13px;color:#64748B;margin:5px 0 0;">Live comparisons, audit volumes, and score trends from saved database records.</p>
      </div>
      <div style="display:flex;align-items:center;gap:12px;"><span id="analyticsConnection" role="status" style="font-size:12px;color:#64748B;">Connecting to database&hellip;</span><button id="refreshLiveMetrics" type="button" style="padding:8px 12px;border:1px solid #CBD5E1;border-radius:8px;background:#fff;cursor:pointer;">Refresh now</button></div>
    </header>
    <section style="margin-top:18px;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:18px;">
      <h2 style="font-size:16px;margin:0 0 12px;color:#1E293B;">Consistency and projected impact</h2>
      <div id="consistencyMetrics"></div>
      <h2 style="font-size:16px;margin:24px 0 12px;color:#1E293B;">Live audit performance</h2>
      <div id="auditMetrics"></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:22px;margin-top:24px;">
        <section><h2 style="font-size:15px;margin:0 0 11px;color:#1E293B;">Flag rate by week &middot; last 6 weeks</h2><div id="weeklyFlagChart"></div></section>
        <section><h2 style="font-size:15px;margin:0 0 11px;color:#1E293B;">Manual vs. AI scores for human-reviewed tickets</h2><div id="manualAiChart"></div></section>
        <section><h2 style="font-size:15px;margin:0 0 11px;color:#1E293B;">Score distribution</h2><div id="scoreDistribution"></div></section>
        <section><h2 style="font-size:15px;margin:0 0 11px;color:#1E293B;">Audits by ticket type</h2><div id="typeBreakdown"></div></section>
        <section><h2 style="font-size:15px;margin:0 0 11px;color:#1E293B;">Score spread dimensions</h2><div id="scoreSpread"></div></section>
        <section><h2 style="font-size:15px;margin:0 0 11px;color:#1E293B;">Provider usage</h2><div id="providerBreakdown"></div></section>
      </div>
      <section style="overflow:auto;margin-top:24px;"><h2 style="font-size:15px;margin:0 0 10px;color:#1E293B;">Latest audit activity</h2><div id="latestActivity"></div></section>
      <div id="analyticsUpdated" style="font-size:11px;color:#94A3B8;margin-top:16px;"></div>
    </section>`;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function metricCard(label, value, detail, tone) {
    const colors = tone === 'green' ? ['#E8F5EE', '#1E7F4D'] : tone === 'amber' ? ['#FDF3E6', '#B45309'] : ['#F8FAFC', '#1E293B'];
    return `<div style="padding:14px;background:${colors[0]};border:1px solid #E2E8F0;border-radius:9px;min-width:0;"><div style="font-size:11px;color:#64748B;">${escapeHtml(label)}</div><strong style="display:block;font-size:24px;color:${colors[1]};margin-top:5px;">${escapeHtml(value)}</strong><div style="font-size:11px;color:#64748B;margin-top:4px;">${escapeHtml(detail || '')}</div></div>`;
  }

  function emptyMessage(message) {
    return `<div style="font-size:12px;color:#64748B;padding:10px 0;">${escapeHtml(message)}</div>`;
  }

  function renderBars(rows, labelKey, valueKey, color, format) {
    if (!rows.length) return emptyMessage('No database records are available yet.');
    const max = Math.max(1, ...rows.map(row => Number(row[valueKey]) || 0));
    return `<div style="display:grid;gap:9px;">${rows.map(row => {
      const count = Number(row[valueKey]) || 0;
      const width = Math.max(0, Math.min(100, count / max * 100));
      return `<div style="display:grid;grid-template-columns:minmax(64px,auto) minmax(70px,1fr) auto;gap:9px;align-items:center;font-size:11px;"><span style="color:#475569;">${escapeHtml(row[labelKey])}</span><div style="height:12px;background:#E2E8F0;border-radius:8px;overflow:hidden;"><div style="height:100%;width:${width}%;background:${color};"></div></div><strong style="color:#334155;">${escapeHtml(format ? format(count, row) : count)}</strong></div>`;
    }).join('')}</div>`;
  }

  function renderWeeklyChart(rows) {
    if (!rows.length) return emptyMessage('No weekly metrics are available from the database.');
    return `<div style="display:grid;gap:10px;">${rows.map(week => {
      const hasTickets = Number(week.total_tickets) > 0 && week.flag_rate != null;
      const rate = hasTickets ? Math.max(0, Math.min(100, Number(week.flag_rate) || 0)) : 0;
      const label = new Date(week.week_start + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return `<div style="display:grid;grid-template-columns:60px minmax(80px,1fr) 108px;gap:9px;align-items:center;font-size:11px;"><span style="color:#475569;">${escapeHtml(label)}</span><div style="height:14px;background:#E2E8F0;border-radius:8px;overflow:hidden;"><div style="height:100%;width:${hasTickets ? rate : 0}%;background:#2563EB;"></div></div><strong style="text-align:right;color:#334155;">${hasTickets ? escapeHtml(rate + '%') : 'No data'}${hasTickets ? ` <span style="font-weight:400;color:#64748B;">(${Number(week.flagged_tickets)}/${Number(week.total_tickets)})</span>` : ''}</strong></div>`;
    }).join('')}</div>`;
  }

  function renderManualAiChart(rows) {
    if (!rows.length) return emptyMessage('No human-reviewed tickets have a recorded manual score yet.');
    return `<div style="display:grid;gap:9px;max-height:360px;overflow:auto;padding-right:4px;">${rows.map(row => {
      const ai = Math.max(0, Math.min(100, Number(row.ai_score) || 0));
      const manual = Math.max(0, Math.min(100, Number(row.manual_score) || 0));
      return `<div style="padding:9px 10px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;"><div style="font-size:11px;font-weight:600;color:#334155;margin-bottom:6px;">${escapeHtml(row.ticket_id)} <span style="font-weight:400;color:#64748B;">&middot; spread ${Number(row.absolute_spread)}</span></div><div style="display:grid;grid-template-columns:48px minmax(50px,1fr) 32px;gap:7px;align-items:center;font-size:10px;color:#64748B;"><span>AI</span><div style="height:9px;background:#E2E8F0;border-radius:6px;overflow:hidden;"><div style="height:100%;width:${ai}%;background:#2563EB;"></div></div><strong>${ai}</strong><span>Manual</span><div style="height:9px;background:#E2E8F0;border-radius:6px;overflow:hidden;"><div style="height:100%;width:${manual}%;background:#0F766E;"></div></div><strong>${manual}</strong></div></div>`;
    }).join('')}</div>`;
  }

  function renderLatestActivity(tickets) {
    const rows = tickets.slice().sort((a, b) => new Date(b.audited_at) - new Date(a.audited_at)).slice(0, 8);
    if (!rows.length) return emptyMessage('No audits have been saved yet.');
    return `<table style="width:100%;border-collapse:collapse;text-align:left;font-size:12px;"><thead><tr style="color:#64748B;"><th style="padding:8px;">Time</th><th style="padding:8px;">Ticket</th><th style="padding:8px;">Score</th><th style="padding:8px;">Status</th><th style="padding:8px;">Provider / model</th></tr></thead><tbody>${rows.map(ticket => `<tr><td style="padding:8px;border-top:1px solid #E2E8F0;white-space:nowrap;">${escapeHtml(new Date(ticket.audited_at).toLocaleString())}</td><td style="padding:8px;border-top:1px solid #E2E8F0;"><a href="ticket-detail.html?id=${encodeURIComponent(ticket.audit_id)}">${escapeHtml(ticket.ticket_id)}</a></td><td style="padding:8px;border-top:1px solid #E2E8F0;">${Number(ticket.compliance_score)}</td><td style="padding:8px;border-top:1px solid #E2E8F0;">${ticket.requires_human_qc ? 'Requires QC' : 'Cleared'}</td><td style="padding:8px;border-top:1px solid #E2E8F0;">${escapeHtml(ticket.llm_provider)} / ${escapeHtml(ticket.llm_model)}</td></tr>`).join('')}</tbody></table>`;
  }

  function render(state, mode) {
    if (main.dataset.page !== 'consistency-analytics' || main.dataset.pageInstance !== pageInstance) return;
    const connection = document.getElementById('analyticsConnection');
    const consistencyRoot = document.getElementById('consistencyMetrics');
    const auditRoot = document.getElementById('auditMetrics');
    if (!state || mode !== 'live') {
      connection.textContent = mode === 'connecting' ? 'Connecting to database…' : 'Live database unavailable';
      consistencyRoot.innerHTML = emptyMessage('Analytics will appear when the live database connection is available.');
      auditRoot.innerHTML = '';
      ['weeklyFlagChart','manualAiChart','scoreDistribution','typeBreakdown','scoreSpread','providerBreakdown','latestActivity'].forEach(id => { document.getElementById(id).innerHTML = ''; });
      return;
    }

    const live = state.live_analytics || {};
    const analytics = state.analytics || {};
    const tickets = state.tickets || [];
    connection.textContent = 'Live database WebSocket';
    consistencyRoot.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
      ${metricCard('Average manual vs. AI spread', live.average_manual_ai_spread == null ? '—' : `${Number(live.average_manual_ai_spread).toFixed(1)} points`, `${Number(live.manual_ai_comparison_count) || 0} human-reviewed tickets with manual scores`)}
      ${metricCard('Human / AI agreement', live.agreement_rate == null ? '—' : `${Number(live.agreement_rate).toFixed(1)}%`, `${Number(live.agreement_count) || 0} of ${Number(live.reviewed_count) || 0} recorded decisions`, 'green')}
      ${metricCard('Estimated manual hours saved today', `${Number(live.estimated_manual_hours_saved || 0).toFixed(1)} hours`, `${Number(live.unaudited_today) || 0} unreviewed tickets × 45 min`, 'green')}
      ${metricCard('Tickets processed today', Number(live.tickets_processed_today) || 0, `${Number(live.manually_reviewed_today) || 0} manually reviewed; ${Number(live.unaudited_today) || 0} unreviewed`)}</div>`;
    auditRoot.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;">
      ${metricCard('Total audits', Number(analytics.total_count) || 0, 'Saved audit records')}
      ${metricCard('Passed', `${Number(analytics.pass_rate) || 0}%`, `${Number(analytics.passed_count) || 0} cleared audits`, 'green')}
      ${metricCard('QC flagged', `${Number(analytics.flag_rate) || 0}%`, `${Number(analytics.flagged_count) || 0} flagged audits`, 'amber')}
      ${metricCard('Mean latency', `${Number(analytics.average_latency_ms) || 0} ms`, 'Across saved audits')}</div>`;

    document.getElementById('weeklyFlagChart').innerHTML = renderWeeklyChart(live.weekly_flag_rate || []);
    document.getElementById('manualAiChart').innerHTML = renderManualAiChart(live.manual_ai_comparisons || []);
    document.getElementById('scoreDistribution').innerHTML = renderBars(analytics.score_distribution || [], 'range', 'count', '#2563EB');

    const typeRows = ['INC','SR','CR','PRB'].map(type => {
      const rows = tickets.filter(ticket => ticket.type === type);
      return {
        type,
        count: rows.length,
        cleared: rows.filter(ticket => !ticket.requires_human_qc).length,
        mean_score: rows.length ? Math.round(rows.reduce((sum, ticket) => sum + Number(ticket.compliance_score || 0), 0) / rows.length) : 0
      };
    }).filter(row => row.count > 0);
    document.getElementById('typeBreakdown').innerHTML = typeRows.length
      ? renderBars(typeRows, 'type', 'count', '#0F766E', (count, row) => `${count} · ${row.cleared} clear · avg ${row.mean_score}`)
      : emptyMessage('No ticket types have been recorded yet.');

    const dimensionLabels = {
      policy_compliance: 'Policy compliance', escalation_protocol: 'Escalation protocol',
      tone_and_sentiment: 'Tone and sentiment', documentation_accuracy: 'Documentation accuracy'
    };
    const dimensions = Object.keys(dimensionLabels).map(key => ({ label: dimensionLabels[key], score: analytics.score_spread && analytics.score_spread[key] })).filter(row => row.score != null);
    document.getElementById('scoreSpread').innerHTML = dimensions.length
      ? renderBars(dimensions, 'label', 'score', '#7C3AED', score => `${score}/100`)
      : emptyMessage('No score spread values have been saved yet.');

    const providerCounts = Object.entries(tickets.reduce((counts, ticket) => {
      const key = `${ticket.llm_provider || 'unknown'} / ${ticket.llm_model || 'unknown'}`;
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {})).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    document.getElementById('providerBreakdown').innerHTML = renderBars(providerCounts, 'label', 'count', '#F59E0B');
    document.getElementById('latestActivity').innerHTML = renderLatestActivity(tickets);
    document.getElementById('analyticsUpdated').textContent = live.generated_at
      ? `Database aggregation updated ${new Date(live.generated_at).toLocaleString()} · live updates arrive automatically`
      : 'Live database state received.';
  }

  AuditAPI.onState(render);
  document.getElementById('refreshLiveMetrics').addEventListener('click', async function () {
    const button = this;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Refreshing…';
    try {
      await AuditAPI.refreshState();
    } catch (error) {
      document.getElementById('analyticsConnection').textContent = `Refresh failed: ${error.message}`;
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  });
})();
