var rawEvents = [
    { time: '09:41', ticket: 'CR-0359', text: 'opened, monitoring started', kind: 'info' },
    { time: '09:38', ticket: 'SR-1201', text: 'flagged: missing approver hierarchy check', kind: 'warn' },
    { time: '09:35', ticket: 'INC-2061', text: 'closure notes matched SLA, cleared', kind: 'clear' },
    { time: '09:30', ticket: 'CR-0345', text: 'rollback plan field still empty (2nd reminder)', kind: 'crit' },
    { time: '09:22', ticket: 'INC-2059', text: 'auto-cleared, AI score 97/100', kind: 'clear' },
    { time: '09:15', ticket: 'SR-1198', text: 'requester response overdue by 4h', kind: 'warn' },
    { time: '09:07', ticket: 'CR-0351', text: 'post-implementation review attached, score recalculated to 88', kind: 'clear' },
    { time: '08:58', ticket: 'INC-2057', text: 'duplicate incident detected, linking to INC-2049', kind: 'warn' },
    { time: '08:44', ticket: 'CR-0348', text: 'change window closed with no rollback test logged', kind: 'crit' },
    { time: '08:31', ticket: 'SR-1193', text: 'auto-cleared, AI score 94/100', kind: 'clear' }
  ];

  var live = true;
  var filter = 'all';

  var chipBase = 'padding: 7px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 500; border: 1px solid #CBD5E1; background: #FFFFFF; color: #334155; cursor: pointer;';
  var chipActive = 'padding: 7px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 600; border: 1px solid #2563EB; background: #2563EB; color: #FFFFFF; cursor: pointer;';

  function dotStyleFor(kind) {
    var base = 'width: 8px; height: 8px; border-radius: 999px; margin-top: 5px; flex-shrink: 0;';
    if (kind === 'crit') return base + ' background: #C25A44;';
    if (kind === 'warn') return base + ' background: #E39A3F;';
    return base + ' background: #4FA187;';
  }

  function tagStyleFor(kind) {
    var base = 'font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; flex-shrink: 0;';
    if (kind === 'crit') return base + ' background: #FBEAE6; color: #B4432F;';
    if (kind === 'warn') return base + ' background: #FDF3E6; color: #B45309;';
    return base + ' background: #E8F5EE; color: #1E7F4D;';
  }

  function tagLabelFor(kind) {
    if (kind === 'crit') return 'Critical';
    if (kind === 'warn') return 'Warning';
    return 'Cleared';
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render() {
    var toggleBtn = document.getElementById('toggleBtn');
    if (live) {
      toggleBtn.textContent = 'Pause Live Feed';
      toggleBtn.setAttribute('style', 'padding: 10px 16px; border-radius: 8px; border: 1px solid #CBD5E1; background: #FFFFFF; color: #334155; font-size: 13px; font-weight: 500; cursor: pointer;');
      document.getElementById('liveDot').setAttribute('style', 'width: 9px; height: 9px; border-radius: 999px; background: #4FA187; animation: pulse 1.4s infinite;');
      document.getElementById('statusLabel').textContent = 'Live (streaming)';
    } else {
      toggleBtn.textContent = 'Resume Live Feed';
      toggleBtn.setAttribute('style', 'padding: 10px 16px; border-radius: 8px; border: none; background: #1E7F4D; color: #FFFFFF; font-size: 13px; font-weight: 500; cursor: pointer;');
      document.getElementById('liveDot').setAttribute('style', 'width: 9px; height: 9px; border-radius: 999px; background: #94A3B8;');
      document.getElementById('statusLabel').textContent = 'Paused';
    }

    document.getElementById('chip-all').setAttribute('style', filter === 'all' ? chipActive : chipBase);
    document.getElementById('chip-warn').setAttribute('style', filter === 'warn' ? chipActive : chipBase);
    document.getElementById('chip-crit').setAttribute('style', filter === 'crit' ? chipActive : chipBase);
    document.getElementById('chip-clear').setAttribute('style', filter === 'clear' ? chipActive : chipBase);

    var visibleEvents = rawEvents.filter(function (ev) {
      if (filter === 'warn') return ev.kind === 'warn';
      if (filter === 'crit') return ev.kind === 'crit';
      if (filter === 'clear') return ev.kind === 'clear';
      return true;
    });

    var html = visibleEvents.map(function (ev) {
      return '' +
        '<div style="display: flex; align-items: flex-start; gap: 12px; padding: 13px 22px; border-bottom: 1px solid #E2E8F0;">' +
        '<div class="mono" style="width: 58px; flex-shrink: 0; font-size: 12px; color: #94A3B8; padding-top: 1px;">' + escapeHtml(ev.time) + '</div>' +
        '<div style="' + dotStyleFor(ev.kind) + '"></div>' +
        '<div style="flex-grow: 1;">' +
        '<span class="mono" style="font-size: 12.5px; font-weight: 600; color: #1E293B;">' + escapeHtml(ev.ticket) + '</span>' +
        '<span style="font-size: 13px; color: #334155; margin-left: 6px;">' + escapeHtml(ev.text) + '</span>' +
        '</div>' +
        '<div style="' + tagStyleFor(ev.kind) + '">' + tagLabelFor(ev.kind) + '</div>' +
        '</div>';
    }).join('');

    document.getElementById('eventFeed').innerHTML = html;
  }

  function toggleLive() {
    live = !live;
    render();
  }

  function setFilter(f) {
    filter = f;
    render();
  }

  render();

  function formatHM(totalMinutes) {
    var h = Math.floor(totalMinutes / 60);
    var m = totalMinutes % 60;
    return h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
  }

  function simulateEscalation() {
    var btn = document.getElementById('escalationBtn');
    if (btn.disabled) return;
    btn.disabled = true;
    btn.style.opacity = '0.6';
    document.getElementById('escalationResult').innerHTML = '';

    var countdownEl = document.getElementById('escalationCountdown');
    var remaining = 239; // 3h 59m, in minutes
    countdownEl.style.color = '#B45309';
    countdownEl.textContent = formatHM(remaining);

    var totalSteps = 20;
    var decrementPer = Math.ceil(remaining / totalSteps);

    var timer = setInterval(function () {
      remaining -= decrementPer;
      if (remaining <= 0) {
        remaining = 0;
        countdownEl.textContent = formatHM(0);
        countdownEl.style.color = '#B4432F';
        clearInterval(timer);
        document.getElementById('escalationResult').innerHTML =
          '<div style="margin-top: 12px; display: flex; align-items: flex-start; gap: 10px; background: #FBEAE6; border: 1px solid #F0C9BE; border-radius: 8px; padding: 12px 14px;">' +
          '<span style="font-size: 14px;">&#128308;</span>' +
          '<div style="font-size: 13px; color: #7A3226; line-height: 1.5;"><strong style="color: #B4432F;">Reassigned:</strong> no response from Ahmad Rahman bin Yusof after 4h. Routed to Ong Wei Jian (fewest open flags).</div>' +
          '</div>';
        btn.disabled = false;
        btn.style.opacity = '1';
        return;
      }
      countdownEl.textContent = formatHM(remaining);
    }, 180);
  }
