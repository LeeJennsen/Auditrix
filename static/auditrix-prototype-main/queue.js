(function () {
  let tickets = [];
  let filter = 'qc';
  let search = '';
  let type = 'all';
  let loading = false;

  const queueRows = document.getElementById('queueRows');
  const queueTabs = document.getElementById('queueTabs');
  const updated = document.getElementById('queueUpdated');
  const errorBox = document.getElementById('queueError');

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function filteredTickets() {
    return tickets.filter(function (ticket) {
      if (filter === 'qc' && !ticket.requires_human_qc) return false;
      if (filter === 'cleared' && ticket.requires_human_qc) return false;
      if (filter === 'reviewed' && !ticket.review_action) return false;
      if (type !== 'all' && ticket.type !== type) return false;
      const query = search.trim().toLowerCase();
      if (query && !(ticket.ticket_id + ' ' + ticket.description + ' ' + ticket.closing_agent).toLowerCase().includes(query)) return false;
      return true;
    }).sort(function (a, b) { return new Date(b.audited_at) - new Date(a.audited_at); });
  }

  function render() {
    const counts = {
      all: tickets.length,
      qc: tickets.filter(t => t.requires_human_qc).length,
      cleared: tickets.filter(t => !t.requires_human_qc).length,
      reviewed: tickets.filter(t => !!t.review_action).length
    };
    const names = [['qc','Needs QC'],['all','All audits'],['cleared','Cleared'],['reviewed','Reviewed']];
    queueTabs.innerHTML = names.map(function (entry) {
      return `<button type="button" class="tab${filter === entry[0] ? ' active' : ''}" data-filter="${entry[0]}">${entry[1]} <span style="opacity:.7">${counts[entry[0]]}</span></button>`;
    }).join('');

    const rows = filteredTickets();
    if (!rows.length) {
      const message = !tickets.length ? 'No audit records yet. Run an audit or add samples to populate the queue.' : 'No records match these filters.';
      queueRows.innerHTML = `<tr><td colspan="8" class="empty">${message}</td></tr>`;
    } else {
      queueRows.innerHTML = rows.map(function (ticket) {
        const state = ticket.requires_human_qc ? 'Needs QC' : ticket.review_action ? 'Reviewed' : 'Cleared';
        const statusClass = ticket.requires_human_qc ? 'qc' : 'clear';
        return `<tr>
          <td><strong>${escapeHtml(ticket.ticket_id)}</strong><div class="muted" style="font-size:11px;margin-top:3px">${escapeHtml(new Date(ticket.audited_at).toLocaleString())}</div></td>
          <td>${escapeHtml(ticket.type)}</td><td style="min-width:220px">${escapeHtml(ticket.description)}</td>
          <td>${escapeHtml(ticket.closing_agent)}</td><td><strong>${ticket.compliance_score}</strong><span class="muted"> / 100</span></td>
          <td><span class="status ${statusClass}">${state}</span>${ticket.review_action ? `<div class="muted" style="font-size:11px;margin-top:4px">${escapeHtml(ticket.review_action)}</div>` : ''}</td>
          <td>${escapeHtml(ticket.llm_provider)}<div class="muted" style="font-size:11px">${escapeHtml(ticket.llm_model)}</div></td>
          <td><a class="button${ticket.requires_human_qc ? '' : ' secondary'}" href="ticket-detail.html?id=${encodeURIComponent(ticket.audit_id)}">${ticket.requires_human_qc ? 'Review' : 'Details'}</a></td>
        </tr>`;
      }).join('');
    }
    updated.textContent = `${tickets.length} stored audits · refreshed ${new Date().toLocaleTimeString()}`;
    queueTabs.querySelectorAll('[data-filter]').forEach(function (button) {
      button.addEventListener('click', function () { filter = button.dataset.filter; render(); });
    });
  }

  async function refresh() {
    if (loading) return;
    loading = true;
    try {
      tickets = await AuditAPI.listTickets();
      errorBox.hidden = true;
      render();
    } catch (error) {
      errorBox.hidden = false;
      errorBox.textContent = `Could not load the queue: ${error.message}`;
    } finally {
      loading = false;
    }
  }

  document.getElementById('queueRefresh').addEventListener('click', refresh);
  document.getElementById('queueSearch').addEventListener('input', function (event) { search = event.target.value; render(); });
  document.getElementById('queueType').addEventListener('change', function (event) { type = event.target.value; render(); });
  refresh();
  window.setInterval(refresh, 5000);
})();
