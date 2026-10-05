(function () {
  async function request(path, options) {
    const response = await fetch(path, options);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail || `Request failed (${response.status})`);
    }
    return response.json();
  }

  window.AuditAPI = {
    listTickets(filters) {
      const query = new URLSearchParams();
      if (filters && filters.type) query.set('type', filters.type);
      if (filters && typeof filters.requires_qc === 'boolean') {
        query.set('requires_qc', String(filters.requires_qc));
      }
      const suffix = query.toString();
      return request('/api/v1/tickets' + (suffix ? `?${suffix}` : ''));
    },
    getTicket(auditId) {
      return request('/api/v1/tickets/' + encodeURIComponent(auditId));
    },
    reviewTicket(auditId, action, reason) {
      return request('/api/v1/tickets/' + encodeURIComponent(auditId) + '/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: reason || null }),
      });
    },
    getAnalytics() {
      return request('/api/v1/analytics/consistency');
    },
    getRubrics() {
      return request('/api/v1/rubrics');
    },
  };
})();
