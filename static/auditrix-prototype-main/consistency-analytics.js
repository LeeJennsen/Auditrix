(function () {
  const main = document.getElementById('content-container');
  const pageInstance = main.dataset.pageInstance;
  const panel = document.createElement('section');
  panel.style.cssText = 'background:#fff;border:1px solid #93C5FD;border-radius:12px;padding:22px;display:flex;flex-direction:column;gap:16px;';
  panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;"><div><h2 style="margin:0;color:#1E293B;font-size:18px;">Live Audit Metrics</h2><div id="liveMetricsUpdated" style="margin-top:4px;color:#64748B;font-size:12px;">Loading current records…</div></div><button id="refreshLiveMetrics" type="button" style="padding:8px 12px;border:1px solid #CBD5E1;border-radius:8px;background:#fff;cursor:pointer;">Refresh now</button></div><div id="liveMetricsBody"></div>';
  main.insertBefore(panel, main.children[1] || null);

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function render(metrics, tickets) {
    const maxBucket = Math.max(1, ...metrics.score_distribution.map(function (bucket) { return bucket.count; }));
    const bars = metrics.score_distribution.map(function (bucket) {
      const width = Math.round(bucket.count / maxBucket * 100);
      return `<div style="display:grid;grid-template-columns:72px 1fr 34px;gap:10px;align-items:center;margin:8px 0;font-size:12px;"><span>${escapeHtml(bucket.range)}</span><div style="height:12px;background:#E2E8F0;border-radius:8px;overflow:hidden;"><div style="width:${width}%;height:100%;background:#2563EB;"></div></div><strong>${bucket.count}</strong></div>`;
    }).join('');

    const types = ['INC','SR','CR'].map(function (type) {
      const rows = tickets.filter(function (ticket) { return ticket.type === type; });
      const passed = rows.filter(function (ticket) { return !ticket.requires_human_qc; }).length;
      const avg = rows.length ? Math.round(rows.reduce(function (sum, t) { return sum + t.compliance_score; }, 0) / rows.length) : 0;
      return `<div style="padding:12px;background:#F8FAFC;border-radius:8px;"><strong>${type}</strong><div style="font-size:12px;color:#64748B;margin-top:5px;">${rows.length} audits · ${passed} clear · mean score ${avg}</div></div>`;
    }).join('');

    const providers = Object.entries(tickets.reduce(function (counts, ticket) {
      const key = `${ticket.llm_provider} / ${ticket.llm_model}`;
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {})).sort(function (a, b) { return b[1] - a[1]; });
    const recent = tickets.slice().sort(function (a, b) { return new Date(b.audited_at) - new Date(a.audited_at); }).slice(0, 8);
    const rows = recent.map(function (ticket) {
      return `<tr><td style="padding:8px;border-top:1px solid #E2E8F0;">${escapeHtml(new Date(ticket.audited_at).toLocaleString())}</td><td style="padding:8px;border-top:1px solid #E2E8F0;"><a href="ticket-detail.html?id=${encodeURIComponent(ticket.audit_id)}">${escapeHtml(ticket.ticket_id)}</a></td><td style="padding:8px;border-top:1px solid #E2E8F0;">${ticket.compliance_score}</td><td style="padding:8px;border-top:1px solid #E2E8F0;">${ticket.requires_human_qc ? 'Requires QC' : 'Cleared'}</td><td style="padding:8px;border-top:1px solid #E2E8F0;">${escapeHtml(ticket.llm_provider)} / ${escapeHtml(ticket.llm_model)}</td></tr>`;
    }).join('');

    document.getElementById('liveMetricsBody').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">
        <div style="padding:14px;background:#F8FAFC;border-radius:8px;">Total audits<strong style="display:block;font-size:25px;margin-top:4px;">${metrics.total_count}</strong></div>
        <div style="padding:14px;background:#E8F5EE;border-radius:8px;">Passed · ${metrics.pass_rate}%<strong style="display:block;font-size:25px;margin-top:4px;">${metrics.passed_count}</strong></div>
        <div style="padding:14px;background:#FDF3E6;border-radius:8px;">QC flagged · ${metrics.flag_rate}%<strong style="display:block;font-size:25px;margin-top:4px;">${metrics.flagged_count}</strong></div>
        <div style="padding:14px;background:#F8FAFC;border-radius:8px;">Mean latency<strong style="display:block;font-size:25px;margin-top:4px;">${metrics.average_latency_ms} ms</strong></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px;margin-top:14px;">
        <div><h3 style="font-size:14px;margin:0 0 8px;">Live score distribution</h3>${bars || 'No score data yet.'}</div>
        <div><h3 style="font-size:14px;margin:0 0 8px;">By ticket type</h3><div style="display:grid;gap:8px;">${types}</div></div>
        <div><h3 style="font-size:14px;margin:0 0 8px;">Provider usage</h3>${providers.length ? providers.map(function (p) { return `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #E2E8F0;font-size:12px;"><span>${escapeHtml(p[0])}</span><strong>${p[1]}</strong></div>`; }).join('') : '<div>No provider data yet.</div>'}</div>
      </div>
      <div style="overflow:auto;margin-top:6px;"><h3 style="font-size:14px;margin:0 0 8px;">Latest audit activity</h3><table style="width:100%;border-collapse:collapse;text-align:left;font-size:12px;"><thead><tr><th style="padding:8px;">Time</th><th style="padding:8px;">Ticket</th><th style="padding:8px;">Score</th><th style="padding:8px;">Status</th><th style="padding:8px;">Provider / model</th></tr></thead><tbody>${rows || '<tr><td colspan="5" style="padding:8px;">No audits recorded.</td></tr>'}</tbody></table></div>`;
    document.getElementById('liveMetricsUpdated').textContent = `Updated ${new Date().toLocaleTimeString()} · refreshes every 5 seconds`;
  }

  async function refresh() {
    try {
      const results = await Promise.all([AuditAPI.getAnalytics(), AuditAPI.listTickets()]);
      if (main.dataset.page !== 'consistency-analytics' || main.dataset.pageInstance !== pageInstance) return;
      render(results[0], results[1]);
    } catch (error) {
      if (main.dataset.page !== 'consistency-analytics' || main.dataset.pageInstance !== pageInstance) return;
      document.getElementById('liveMetricsUpdated').textContent = 'Could not refresh live analytics: ' + error.message;
    }
  }

  document.getElementById('refreshLiveMetrics').addEventListener('click', refresh);
  refresh();
  window.setInterval(refresh, 5000);
})();
