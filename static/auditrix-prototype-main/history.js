var records = [];

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var currentMonth = 'all';
  var historySearchTerm = '';
  var historyInstance = document.getElementById('content-container').dataset.pageInstance;
  function isHistoryPage() {
    var content = document.getElementById('content-container');
    return content.dataset.page === 'history' && content.dataset.pageInstance === historyInstance;
  }

  function render() {
    var visible = records.filter(function (r) {
      if (currentMonth !== 'all' && r.month !== currentMonth) return false;
      if (historySearchTerm && r.id.toLowerCase().indexOf(historySearchTerm) === -1) return false;
      return true;
    });

    var html;
    if (visible.length === 0) {
      html = '<div style="padding: 30px 22px; text-align: center; font-size: 13px; color: #94A3B8;">No tickets match your search.</div>';
    } else {
      html = visible.map(function (r) {
        return '' +
          '<div style="display: grid; grid-template-columns: 110px 90px 60px 1fr 150px 80px 80px; padding: 14px 22px; font-size: 13px; align-items: center; border-bottom: 1px solid #E2E8F0;">' +
          '<div class="mono" style="color: #64748B;">' + escapeHtml(r.date) + '</div>' +
          '<div class="mono" style="font-weight: 600; color: #1E293B;">' + escapeHtml(r.id) + '</div>' +
          '<div style="color: #64748B;">' + escapeHtml(r.type) + '</div>' +
          '<div style="color: #334155;">' + escapeHtml(r.summary) + '</div>' +
          '<div style="color: #64748B; font-size: 12px;">' + escapeHtml(r.auditor) + '</div>' +
          '<div class="mono" style="font-weight: 600; color: #1E7F4D;">' + escapeHtml(r.score) + '</div>' +
          '<a href="ticket-detail.html?id=' + encodeURIComponent(r.audit_id) + '">View</a>' +
          '</div>';
      }).join('');
    }
    document.getElementById('historyRows').innerHTML = html;
  }

  function updateMonthOptions() {
    var select = document.getElementById('monthFilter');
    var months = Array.from(new Set(records.map(function (record) { return record.month; }))).sort().reverse();
    select.innerHTML = '<option value="all">All Months</option>' + months.map(function (month) {
      var date = new Date(month + '-01T00:00:00');
      var label = date.toLocaleString(undefined, { month: 'long', year: 'numeric' });
      return '<option value="' + escapeHtml(month) + '">' + escapeHtml(label) + '</option>';
    }).join('');
    if (currentMonth !== 'all' && !months.includes(currentMonth)) currentMonth = 'all';
  }

  function setMonth(month) {
    currentMonth = month;
    render();
  }

  function onHistorySearchInput() {
    historySearchTerm = document.getElementById('historySearch').value.trim().toLowerCase();
    render();
  }

  render();
  AuditAPI.listTickets().then(function (tickets) {
    if (!isHistoryPage()) return;
    records = tickets.map(function (ticket) {
      var closedAt = new Date(ticket.closed_at);
      return {
        audit_id: ticket.audit_id,
        date: closedAt.toLocaleDateString(),
        id: ticket.ticket_id,
        type: ticket.type,
        summary: ticket.description,
        auditor: ticket.closing_agent,
        score: String(ticket.compliance_score),
        month: closedAt.getFullYear() + '-' + String(closedAt.getMonth() + 1).padStart(2, '0'),
      };
    });
    updateMonthOptions();
    render();
  }).catch(function (error) {
    if (!isHistoryPage()) return;
    document.getElementById('historyRows').textContent = error.message;
  });
