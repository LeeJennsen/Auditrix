  var allTickets = [];

  var currentFilter = 'all';
  var searchTerm = '';
  var dashboardInstance = document.getElementById('content-container').dataset.pageInstance;
  function isDashboardPage() {
    var content = document.getElementById('content-container');
    return content.dataset.page === 'dashboard' && content.dataset.pageInstance === dashboardInstance;
  }

  function tabStyle(active) {
    var base = 'padding: 10px 14px; border: none; background: transparent; font-size: 13px; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px;';
    if (active) return base + ' color: #2563EB; border-bottom-color: #2563EB; font-weight: 600;';
    return base + ' color: #64748B;';
  }

  function badgeStyle(status) {
    if (status === 'Cleared' || status === 'AI Passed · Review available' || status.indexOf('Human reviewed') === 0) return 'display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #E8F5EE; color: #1E7F4D;';
    if (status === 'Flagged') return 'display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #FDF3E6; color: #B45309;';
    return 'display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #FBEAE6; color: #B4432F;';
  }

  function alertFor(status, ageDays) {
    if (status === 'Flagged') {
      return { text: '🔴 Critical ping · ' + ageDays + 'd ago', style: 'color: #B4432F; font-weight: 600;' };
    }
    if (status === 'In Review') {
      var overdue = ageDays >= 3;
      return {
        text: overdue ? ('🟠 Reminder sent · ' + ageDays + 'd, overdue') : ('🟠 Digest · ' + ageDays + 'd ago'),
        style: overdue ? 'color: #B45309; font-weight: 600;' : 'color: #8A6A3D;'
      };
    }
    return { text: 'No alert needed', style: 'color: #94A3B8;' };
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function severityBorderColor(sev) {
    if (sev === 'critical') return '#C25A44';
    if (sev === 'minor') return '#E39A3F';
    return 'transparent';
  }

  function severityBadge(sev) {
    if (sev === 'critical') return '<span style="display: inline-block; margin-top: 4px; padding: 2px 7px; border-radius: 999px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.03em; background: #FBEAE6; color: #B4432F;">CRITICAL</span>';
    if (sev === 'minor') return '<span style="display: inline-block; margin-top: 4px; padding: 2px 7px; border-radius: 999px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.03em; background: #FDF3E6; color: #B45309;">MINOR</span>';
    return '';
  }

  function render() {
    document.getElementById('tab-all').setAttribute('style', tabStyle(currentFilter === 'all'));
    document.getElementById('tab-flagged').setAttribute('style', tabStyle(currentFilter === 'flagged'));
    document.getElementById('tab-cleared').setAttribute('style', tabStyle(currentFilter === 'cleared'));
    document.getElementById('tab-review').setAttribute('style', tabStyle(currentFilter === 'review'));

    var filtered = allTickets;
    if (currentFilter === 'flagged' || currentFilter === 'review') filtered = allTickets.filter(function (t) { return t.requires_human_qc; });
    if (currentFilter === 'cleared') filtered = allTickets.filter(function (t) { return !t.requires_human_qc; });

    if (searchTerm) {
      filtered = filtered.filter(function (t) { return t.id.toLowerCase().indexOf(searchTerm) !== -1; });
    }

    var html;
    if (filtered.length === 0) {
      html = '<div style="padding: 30px 22px; text-align: center; font-size: 13px; color: #94A3B8;">No tickets match your search.</div>';
    } else {
      html = filtered.map(function (t) {
        var alert = alertFor(t.status, t.age);
        return '' +
          '<div style="display: grid; grid-template-columns: 90px 60px 1fr 95px 130px 70px 100px 150px 80px; padding: 14px 22px; font-size: 13px; align-items: center; border-bottom: 1px solid #E2E8F0; border-left: 4px solid ' + severityBorderColor(t.severity) + '; box-sizing: border-box;">' +
          '<div class="mono" style="font-weight: 600; color: #1E293B;">' + escapeHtml(t.id) + '</div>' +
          '<div style="color: #64748B;">' + escapeHtml(t.type) + '</div>' +
          '<div style="color: #334155;">' + escapeHtml(t.summary) + '</div>' +
          '<div class="mono" style="color: #64748B; font-size: 11.5px;">' + escapeHtml(t.requested) + '</div>' +
          '<div style="color: #64748B; font-size: 12px;">' + escapeHtml(t.auditor) + '</div>' +
          '<div class="mono" style="font-weight: 600; color: #1E293B;">' + escapeHtml(t.score) + '</div>' +
          '<div><span style="' + badgeStyle(t.status) + '">' + escapeHtml(t.status) + '</span>' + (t.severity ? '<div>' + severityBadge(t.severity) + '</div>' : '') + '</div>' +
          '<div style="font-size: 11.5px; ' + alert.style + '">' + alert.text + '</div>' +
          '<div><a href="ticket-detail.html?id=' + encodeURIComponent(t.audit_id) + '" style="display: inline-flex; align-items: center; gap: 4px; padding: 7px 12px; border-radius: 7px; background: #2563EB; color: #FFFFFF; font-weight: 600; font-size: 12.5px; text-decoration: none; white-space: nowrap;">' + (t.review_action ? 'Update review' : 'Review') + ' &rarr;</a></div>' +
          '</div>';
      }).join('');
    }

    document.getElementById('ticketRows').innerHTML = html;
  }

  function selectFilter(f) {
    currentFilter = f;
    render();
  }

  function onSearchInput() {
    searchTerm = document.getElementById('ticketSearch').value.trim().toLowerCase();
    render();
  }

  function setTickets(records) {
    allTickets = records.map(function (ticket) {
      var closed = new Date(ticket.closed_at);
      var age = Math.max(0, Math.floor((Date.now() - closed.getTime()) / 86400000));
      return Object.assign({}, ticket, {
        id: ticket.ticket_id,
        summary: ticket.description,
        requested: closed.toLocaleDateString(),
        auditor: ticket.closing_agent,
        score: String(ticket.compliance_score),
        status: ticket.requires_human_qc ? 'Flagged' : ticket.review_action ? 'Human reviewed · ' + (ticket.review_action === 'approve' ? 'agrees' : 'disagrees') : 'AI Passed · Review available',
        age: age,
        severity: ticket.requires_human_qc ? (ticket.compliance_score < 70 ? 'critical' : 'minor') : '',
      });
    });
    render();
    updateQueueCounts();
  }

  function updateScoreSpread(records) {
    var fields = ['policy_compliance', 'escalation_protocol', 'tone_and_sentiment', 'documentation_accuracy'];
    fields.forEach(function (field) {
      var values = records.map(function (ticket) {
        return ticket.score_spread && ticket.score_spread[field];
      }).filter(function (value) { return value !== null && value !== undefined && Number.isFinite(Number(value)); });
      var node = document.getElementById('spread-' + field.replace(/_/g, '-'));
      if (node) node.textContent = values.length
        ? Math.round(values.reduce(function (sum, value) { return sum + Number(value); }, 0) / values.length) + ' / 100'
        : 'N/A';
    });
  }

  function updateQueueCounts() {
    var flagged = allTickets.filter(function (ticket) { return ticket.requires_human_qc; }).length;
    var cleared = allTickets.length - flagged;
    document.getElementById('tab-all').textContent = 'All (' + allTickets.length + ')';
    document.getElementById('tab-flagged').textContent = 'Flagged (' + flagged + ')';
    document.getElementById('tab-cleared').textContent = 'Cleared (' + cleared + ')';
    document.getElementById('tab-review').textContent = 'In Review (' + flagged + ')';
  }

  function showApiError(error) {
    if (!isDashboardPage()) return;
    document.getElementById('ticketRows').innerHTML = '<div style="padding:20px;color:#B4432F;">' + escapeHtml(error.message) + '</div>';
  }

  function updateAnalytics(metrics) {
    document.getElementById('dashboard-total').textContent = metrics.total_count;
    document.getElementById('dashboard-passed').textContent = metrics.passed_count;
    document.getElementById('dashboard-flagged').textContent = metrics.flagged_count;
    document.getElementById('dashboard-pass-rate').textContent = metrics.pass_rate + '%';
  }

  function refreshDashboard() {
    return AuditAPI.getState().then(function (state) {
      if (!isDashboardPage()) return [state.tickets, state.analytics];
      setTickets(state.tickets);
      updateScoreSpread(state.tickets);
      updateAnalytics(state.analytics);
      return [state.tickets, state.analytics];
    });
  }

  AuditAPI.onState(function (state) {
    if (!isDashboardPage()) return;
    setTickets(state.tickets);
    updateScoreSpread(state.tickets);
    updateAnalytics(state.analytics);
  });

  document.getElementById('runBatchBtn').addEventListener('click', function () {
    window.AuditApp.navigate('audit-runner');
  });

  document.getElementById('exportReportBtn').addEventListener('click', async function () {
    var button = this;
    button.disabled = true;
    try {
      var tickets = await AuditAPI.listTickets();
      var columns = ['ticket_id','type','description','closing_agent','compliance_score','policy_compliance','escalation_protocol','tone_and_sentiment','documentation_accuracy','requires_human_qc','llm_provider','llm_model','audited_at'];
      var csv = [columns.join(','), ...tickets.map(function (ticket) {
        return columns.map(function (key) {
          var value = key in ticket ? ticket[key] : ticket.score_spread && ticket.score_spread[key];
          value = value == null ? '' : String(value);
          return '"' + value.replace(/"/g, '""') + '"';
        }).join(',');
      })].join('\\r\\n');
      var url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      var link = document.createElement('a');
      link.href = url;
      link.download = 'audit-report.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      showApiError(error);
    } finally {
      button.disabled = false;
    }
  });

  function pipeStageStyle(state) {
    var base = 'flex: 1; text-align: center; padding: 12px 8px; border-radius: 8px; font-size: 12.5px; font-weight: 600; transition: background-color .3s ease, color .3s ease, border-color .3s ease;';
    if (state === 'active') return base + ' background: #DBEAFE; color: #2563EB; border: 1px solid #2563EB;';
    if (state === 'done') return base + ' background: #DBEAFE; color: #1D4ED8; border: 1px solid #93C5FD;';
    if (state === 'flagged') return base + ' background: #FDF3E6; color: #B45309; border: 1px solid #F3D9B8;';
    return base + ' background: #F1F5F9; color: #64748B; border: 1px solid #E2E8F0;';
  }

  function resetPipeline() {
    for (var i = 1; i <= 4; i++) {
      document.getElementById('pipe-' + i).setAttribute('style', pipeStageStyle('idle'));
    }
    document.getElementById('simResult').innerHTML = '';
  }

  function refreshAuditData() {
    var btn = document.getElementById('simulateBtn');
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = 'Refreshing…';
    refreshDashboard().then(function (results) {
      if (!isDashboardPage()) return;
      document.getElementById('simResult').textContent = AuditAPI.getMode() === 'live'
        ? 'Loaded ' + results[1].total_count + ' audit records from the database.'
        : 'Database connection unavailable. No local demo records are being displayed.';
    }).catch(showApiError).finally(function () {
      btn.disabled = false;
      btn.textContent = 'Refresh Audit Data';
    });
  }
