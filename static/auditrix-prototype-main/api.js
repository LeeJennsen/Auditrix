(function () {
  'use strict';

  const pageListeners = new Set();
  const persistentListeners = new Set();
  const EMPTY_ANALYTICS = {
    total_count: 0,
    passed_count: 0,
    flagged_count: 0,
    pass_rate: 0,
    flag_rate: 0,
    score_distribution: [],
    average_latency_ms: 0,
    score_spread: {
      policy_compliance: null,
      escalation_protocol: null,
      tone_and_sentiment: null,
      documentation_accuracy: null
    }
  };
  let state = emptyState('connecting');
  let mode = 'connecting';
  let socket = null;
  let reconnectTimer = null;
  let reconnectDelay = 1000;

  function emptyState(status) {
    return {
      type: 'state',
      tickets: [],
      alerts: [],
      live_analytics: null,
      analytics: Object.assign({}, EMPTY_ANALYTICS),
      score_spreads: [],
      rubrics: {},
      rubric_criteria: {},
      settings: {
        compliance_threshold: null,
        minimum_threshold: 0,
        maximum_threshold: 100,
        routing_rule: 'Scores below the threshold need QC; scores at or above it are cleared.'
      },
      system_status: status
    };
  }

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function notify() {
    Array.from(pageListeners).concat(Array.from(persistentListeners)).forEach(function (listener) {
      try { listener(state, mode); } catch (error) { console.error('Audit state listener failed', error); }
    });
  }

  function setState(nextState, nextMode) {
    state = nextState;
    mode = nextMode;
    notify();
  }

  function showUnavailable(status) {
    setState(emptyState(status || 'database_unavailable'), 'unavailable');
  }

  function scheduleReconnect() {
    if (reconnectTimer || location.protocol === 'file:' || !('WebSocket' in window)) return;
    reconnectTimer = window.setTimeout(function () {
      reconnectTimer = null;
      connect();
    }, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 15000);
  }

  function connect() {
    if (location.protocol === 'file:' || !('WebSocket' in window)) {
      showUnavailable('database_unavailable');
      return;
    }
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) return;

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(protocol + '//' + location.host + '/api/v1/ws');
    socket.onmessage = function (event) {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'state' && Array.isArray(payload.tickets)) {
          reconnectDelay = 1000;
          setState(payload, 'live');
        } else if (payload.type === 'database_unavailable') {
          showUnavailable('database_unavailable');
          if (socket) socket.close();
        }
      } catch (error) {
        console.error('Invalid audit update received', error);
      }
    };
    socket.onerror = function () {
      showUnavailable('database_unavailable');
    };
    socket.onclose = function () {
      socket = null;
      showUnavailable('database_unavailable');
      scheduleReconnect();
    };
  }

  function getState() {
    return Promise.resolve(state);
  }

  async function refreshState() {
    const response = await fetch('/api/v1/state', { cache: 'no-store' });
    if (!response.ok) {
      const body = await response.json().catch(function () { return {}; });
      throw new Error(body.detail || 'Could not refresh the live database state.');
    }
    const nextState = await response.json();
    setState(nextState, 'live');
    return copy(state);
  }

  function onState(listener, persistent) {
    const listeners = persistent ? persistentListeners : pageListeners;
    listeners.add(listener);
    listener(state, mode);
    return function () { listeners.delete(listener); };
  }

  async function request(path, options) {
    if (mode !== 'live') throw new Error('The database connection is unavailable. Reconnect before making changes.');
    const response = await fetch(path, options);
    if (!response.ok) {
      const body = await response.json().catch(function () { return {}; });
      throw new Error(body.detail || 'Request failed (' + response.status + ')');
    }
    return response.json();
  }

  async function listTickets(filters) {
    return state.tickets.filter(function (ticket) {
      if (filters && filters.type && ticket.type !== filters.type) return false;
      if (filters && typeof filters.requires_qc === 'boolean' && ticket.requires_human_qc !== filters.requires_qc) return false;
      return true;
    }).map(copy);
  }

  async function getTicket(auditId) {
    const ticket = state.tickets.find(function (record) {
      return record.audit_id === auditId || record.ticket_id === auditId;
    });
    if (!ticket) throw new Error('Audit ticket is not present in the current database snapshot.');
    return copy(ticket);
  }

  async function reviewTicket(auditId, action, reason, manualScore) {
    return request('/api/v1/tickets/' + encodeURIComponent(auditId) + '/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action, reason: reason || null, manual_score: manualScore })
    });
  }

  async function updateSettings(complianceThreshold) {
    return request('/api/v1/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compliance_threshold: complianceThreshold })
    });
  }

  async function acknowledgeAlert(auditId) {
    return request('/api/v1/alerts/' + encodeURIComponent(auditId) + '/acknowledge', { method: 'POST' });
  }

  async function acknowledgeAllAlerts() {
    return request('/api/v1/alerts/acknowledge-all', { method: 'POST' });
  }

  async function generateTickets(count) {
    return request('/api/v1/generate-tickets?count=' + encodeURIComponent(count), { method: 'POST' });
  }

  async function getRandomSample() {
    const apiBase = location.protocol === 'file:' ? 'http://localhost:8000' : location.origin;
    const response = await fetch(apiBase + '/api/v1/sample-ticket', { cache: 'no-store' });
    if (!response.ok) {
      const body = await response.json().catch(function () { return {}; });
      throw new Error(body.detail || 'Could not load a sample ticket (' + response.status + ').');
    }
    return response.json();
  }

  window.AuditAPI = {
    onState: onState,
    getState: getState,
    refreshState: refreshState,
    clearPageListeners: function () { pageListeners.clear(); },
    getMode: function () { return mode; },
    listTickets: listTickets,
    getTicket: getTicket,
    reviewTicket: reviewTicket,
    getAnalytics: async function () { return copy(state.analytics); },
    getLiveAnalytics: async function () { return copy(state.live_analytics); },
    getScoreSpreads: async function () { return copy(state.score_spreads); },
    getRubrics: async function () { return copy(state.rubrics); },
    getRubricCriteria: async function () { return copy(state.rubric_criteria); },
    getSettings: async function () { return copy(state.settings); },
    updateSettings: updateSettings,
    acknowledgeAlert: acknowledgeAlert,
    acknowledgeAllAlerts: acknowledgeAllAlerts,
    generateTickets: generateTickets,
    getRandomSample: getRandomSample
  };

  connect();
})();
