(function () {
  'use strict';

  window.rawEvents = [];
  window.monitorTickets = [];
  window.monitorMode = 'connecting';
  window.live = true;
  window.filter = 'all';
  let demoTimer = null;
  let demoBusy = false;
  let escalationTimer = null;

  const chipBase = 'padding:7px 14px;border-radius:999px;font-size:12.5px;font-weight:500;border:1px solid #CBD5E1;background:#FFFFFF;color:#334155;cursor:pointer;';
  const chipActive = 'padding:7px 14px;border-radius:999px;font-size:12.5px;font-weight:600;border:1px solid #2563EB;background:#2563EB;color:#FFFFFF;cursor:pointer;';

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function styleForKind(kind) {
    if (kind === 'crit') return { dot: '#C25A44', bg: '#FBEAE6', color: '#B4432F', label: 'Critical' };
    if (kind === 'warn') return { dot: '#E39A3F', bg: '#FDF3E6', color: '#B45309', label: 'Warning' };
    return { dot: '#4FA187', bg: '#E8F5EE', color: '#1E7F4D', label: 'Cleared' };
  }

  function workload() {
    const counts = new Map();
    window.monitorTickets.forEach(ticket => {
      const owner = ticket.closing_agent || 'Unassigned';
      if (!counts.has(owner)) counts.set(owner, 0);
      if (ticket.requires_human_qc && !ticket.review_action) counts.set(owner, counts.get(owner) + 1);
    });
    return Array.from(counts, ([owner, open]) => ({ owner, open })).sort((a, b) => a.open - b.open || a.owner.localeCompare(b.owner));
  }

  function renderWorkload() {
    const root = document.getElementById('monitorWorkload');
    if (!root) return;
    const rows = workload();
    if (!rows.length) {
      root.innerHTML = '<div style="font-size:12px;color:#64748B;">No saved ticket owners are available yet.</div>';
      return;
    }
    const max = Math.max(1, ...rows.map(row => row.open));
    root.innerHTML = rows.map(row => `<div style="display:grid;grid-template-columns:minmax(95px,170px) minmax(50px,1fr) auto;gap:9px;align-items:center;font-size:11px;"><span style="color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(row.owner)}</span><div style="height:9px;background:#E2E8F0;border-radius:999px;overflow:hidden;"><div style="height:100%;width:${Math.max(0,row.open / max * 100)}%;background:${row.open ? '#E39A3F' : '#4FA187'};"></div></div><strong style="color:${row.open ? '#B45309' : '#1E7F4D'};white-space:nowrap;">${row.open} open</strong></div>`).join('');
  }

  function render() {
    const feed = document.getElementById('eventFeed');
    if (!feed) return;
    const toggle = document.getElementById('toggleBtn');
    const dot = document.getElementById('liveDot');
    const status = document.getElementById('statusLabel');
    const streamButton = document.getElementById('demoStreamBtn');
    const connected = window.monitorMode === 'live';
    if (!connected && demoTimer) {
      clearInterval(demoTimer);
      demoTimer = null;
      const streamStatus = document.getElementById('demoStreamStatus');
      if (streamStatus) streamStatus.textContent = 'Sample stream stopped because the live database connection was lost.';
    }
    if (toggle) toggle.textContent = window.live ? 'Pause Live Feed' : 'Resume Live Feed';
    if (dot) dot.style.cssText = `width:9px;height:9px;border-radius:999px;background:${window.live && connected ? '#4FA187' : '#94A3B8'};${window.live && connected ? 'animation:pulse 1.4s infinite;' : ''}`;
    if (status && !window.live) status.textContent = 'Feed updates paused';
    if (streamButton) {
      streamButton.disabled = !connected;
      streamButton.textContent = demoTimer ? 'Stop Random Sample Stream' : 'Start Random Sample Stream';
      streamButton.style.opacity = connected ? '1' : '0.55';
      streamButton.title = connected ? '' : 'Connect to the live database to generate sample traffic.';
    }
    ['all','warn','crit','clear'].forEach(name => {
      const button = document.getElementById('chip-' + name);
      if (button) button.setAttribute('style', window.filter === name ? chipActive : chipBase);
    });

    const visible = window.rawEvents.filter(event => window.filter === 'all' || event.kind === window.filter);
    if (!visible.length) {
      feed.innerHTML = `<div style="padding:22px;color:#64748B;font-size:12px;">${window.rawEvents.length ? 'No audit events match this filter.' : 'No audit records are saved yet. Run an audit or start the random sample stream.'}</div>`;
    } else {
      feed.innerHTML = visible.map(event => {
        const style = styleForKind(event.kind);
        const ticket = event.audit_id
          ? `<a href="ticket-detail.html?id=${encodeURIComponent(event.audit_id)}" class="mono" style="font-size:12.5px;font-weight:600;color:#1E293B;text-decoration:none;">${escapeHtml(event.ticket)}</a>`
          : `<strong class="mono" style="font-size:12.5px;color:#1E293B;">${escapeHtml(event.ticket)}</strong>`;
        return `<div style="display:flex;align-items:flex-start;gap:12px;padding:13px 22px;border-top:1px solid #E2E8F0;"><time class="mono" style="width:70px;flex-shrink:0;font-size:11px;color:#94A3B8;padding-top:2px;">${escapeHtml(event.time)}</time><span aria-hidden="true" style="width:8px;height:8px;border-radius:999px;margin-top:5px;flex-shrink:0;background:${style.dot};"></span><div style="flex:1;min-width:0;">${ticket}<span style="font-size:12px;color:#334155;margin-left:6px;">${escapeHtml(event.text)}</span></div><span style="font-size:10px;font-weight:600;padding:3px 8px;border-radius:999px;background:${style.bg};color:${style.color};">${style.label}</span></div>`;
      }).join('');
    }
    renderWorkload();
  }

  window.render = render;
  window.toggleLive = function () {
    window.live = !window.live;
    render();
    if (window.live && typeof window.updateMonitorConnection === 'function') window.updateMonitorConnection();
  };
  window.setFilter = function (value) {
    if (['all','warn','crit','clear'].includes(value)) window.filter = value;
    render();
  };

  async function addSampleTicket() {
    if (demoBusy || window.monitorMode !== 'live') return;
    demoBusy = true;
    const status = document.getElementById('demoStreamStatus');
    if (status) status.textContent = 'Generating, scoring, and saving a sample ticket to the database…';
    render();
    try {
      const result = await AuditAPI.generateTickets(1);
      if (status) {
        const scoring = result.ai_scored_count ? 'AI scored' : 'Demo fallback scored';
        status.textContent = `Saved ${result.ticket_ids[0]} to the live database (${scoring}). The WebSocket feed will update automatically.`;
      }
    } catch (error) {
      if (status) status.textContent = `Could not generate sample traffic: ${error.message}`;
    } finally {
      demoBusy = false;
      render();
    }
  }

  window.toggleDemoStream = function () {
    const status = document.getElementById('demoStreamStatus');
    if (demoTimer) {
      clearInterval(demoTimer);
      demoTimer = null;
      if (status) status.textContent = 'Random sample stream stopped. Generated tickets remain in the live database.';
      render();
      return;
    }
    if (window.monitorMode !== 'live') {
      if (status) status.textContent = 'Connect to the live database before generating sample traffic.';
      return;
    }
    const seconds = Number(document.getElementById('demoIntervalSelect')?.value) || 8;
    if (status) status.textContent = `Random sample stream running. A scored ticket will be saved every ${seconds} seconds.`;
    demoTimer = window.setInterval(addSampleTicket, seconds * 1000);
    addSampleTicket();
    render();
  };

  function formatHM(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  window.simulateEscalation = function () {
    const button = document.getElementById('escalationBtn');
    const countdown = document.getElementById('escalationCountdown');
    const result = document.getElementById('escalationResult');
    if (!button || !countdown || !result || escalationTimer) return;
    const owners = workload();
    if (!owners.length) {
      result.innerHTML = '<div style="margin-top:10px;color:#64748B;">A live database ticket is needed to preview an escalation.</div>';
      return;
    }
    const target = owners[0];
    let remaining = 239;
    const steps = 20;
    const decrement = Math.ceil(remaining / steps);
    button.disabled = true;
    result.textContent = '';
    countdown.style.color = '#B45309';
    countdown.textContent = formatHM(remaining);
    escalationTimer = window.setInterval(function () {
      remaining = Math.max(0, remaining - decrement);
      countdown.textContent = formatHM(remaining);
      if (remaining === 0) {
        clearInterval(escalationTimer);
        escalationTimer = null;
        countdown.style.color = '#B4432F';
        result.innerHTML = `<div style="margin-top:10px;padding:11px 12px;border:1px solid #F0C9BE;border-radius:8px;background:#FBEAE6;color:#7A3226;font-size:12px;line-height:1.5;"><strong style="color:#B4432F;">Escalation preview:</strong> ${escapeHtml(target.owner)} currently has the lowest recorded open QC count (${target.open}). No ticket assignment was changed.</div>`;
        button.disabled = false;
      }
    }, 180);
  };

  render();
})();
