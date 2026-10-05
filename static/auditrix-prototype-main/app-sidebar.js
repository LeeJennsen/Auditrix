class AuditSidebar extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    const active = this.getAttribute('active') || 'dashboard';
    let savedQueueState = null;
    try { savedQueueState = localStorage.getItem('auditQueueNavOpen'); } catch (_) {}
    const queueOpen = active === 'audit-queue' || active === 'run-ai-audit' || savedQueueState !== 'false';
    const icons = {
      dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
      queue: '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>',
      details: '<path d="M8 3h7l4 4v14H5V3z"/><path d="M14 3v5h5M8 12h8M8 16h8"/>',
      analytics: '<path d="M3 3v18h18"/><path d="M7 15l4-6 4 3 5-8"/>',
      monitor: '<path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/>',
      history: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
      rubric: '<path d="M9 3h6l1 3.5 3 1.7 3.5-1L23 10l-2.5 2.5v3L23 18l-1.5 2.8-3.5-1-3 1.7L14 24H9l-1-3.5-3-1.7-3.5 1L0 17l2.5-2.5v-3L0 9l1.5-2.8 3.5 1 3-1.7z" transform="scale(.75) translate(2,2)"/><circle cx="12" cy="12" r="3"/>'
    };
    const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
    const isActive = key => active === key || (key === 'audit-queue' && active === 'run-ai-audit');
    const navItem = (key, label, href, iconName) => `<a class="nav-item ${isActive(key) ? 'active' : ''}" data-nav="${key}" href="${href}" ${isActive(key) ? 'aria-current="page"' : ''}>${icon(iconName)}<span>${label}</span></a>`;
    root.innerHTML = `
      <style>
        :host{display:block;width:240px;min-width:240px;flex:0 0 240px;align-self:stretch;box-sizing:border-box;color:#1E293B;font-family:Inter,'Segoe UI',Arial,sans-serif}
        *{box-sizing:border-box}.sidebar{position:sticky;top:0;min-height:100vh;height:100%;max-height:100vh;overflow-y:auto;background:#fff;border-right:1px solid #E2E8F0;padding:26px 18px 20px;display:flex;flex-direction:column;gap:22px}
        .brand{display:flex;align-items:center;gap:10px;padding:2px 2px 4px}.brand-mark{width:35px;height:35px;flex:0 0 35px;border-radius:10px;background:linear-gradient(145deg,#2563EB,#174EA6);display:grid;place-items:center;color:#fff;box-shadow:0 4px 10px #2563eb30}.brand-mark svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}.brand-name{font-size:15px;line-height:1.2;font-weight:700}.brand-sub{margin-top:3px;color:#64748B;font-size:11px}.alert-button{width:100%;display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid #F0C9BE;border-radius:9px;background:#FFF6F3;text-align:left;cursor:pointer;transition:background .16s,border-color .16s}.alert-button:hover{background:#FDECE7;border-color:#E8B5A7}.alert-icon{width:15px;height:15px;fill:none;stroke:#B4432F;stroke-width:2}.alert-label{font:600 12px/1.35 Arial,sans-serif;color:#A53D2D}.alert-dot{margin-left:auto;width:8px;height:8px;border-radius:50%;background:#E5484D;box-shadow:0 0 0 3px #E5484D1c}.group-label{padding:0 10px 7px;color:#94A3B8;font:600 10px/1 Arial,sans-serif;letter-spacing:.09em;text-transform:uppercase}.nav-group{display:grid;gap:3px}.nav-item{min-height:39px;display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid transparent;border-radius:8px;color:#475569;text-decoration:none;font-size:13.5px;transition:background .15s,color .15s,border-color .15s}.nav-item svg{width:16px;height:16px;flex:0 0 16px;fill:none;stroke:#64748B;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.nav-item:hover{background:#F1F6FD;color:#1D4ED8}.nav-item:hover svg{stroke:#2563EB}.nav-item.active{background:#EAF2FE;border-color:#D7E6FC;color:#174EA6;font-weight:700}.nav-item.active svg{stroke:#2563EB}.queue-row{display:grid;grid-template-columns:minmax(0,1fr) 30px;gap:3px;align-items:center}.queue-row>.nav-item{min-width:0}.expand{width:30px;height:30px;display:grid;place-items:center;border:0;border-radius:7px;background:transparent;color:#64748B;cursor:pointer;transition:background .15s,color .15s}.expand:hover{background:#F1F5F9;color:#1D4ED8}.chevron{width:14px;height:14px;transition:transform .18s}.queue-row[aria-expanded="true"] .chevron{transform:rotate(90deg)}.subnav{display:grid;gap:3px;margin:2px 0 5px 20px;padding-left:11px;border-left:1px solid #DCE5F1}.subnav[hidden]{display:none}.subnav a{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:7px;text-decoration:none;color:#64748B;font-size:12.5px}.subnav a:before{content:'';width:6px;height:6px;border:1.5px solid #94A3B8;border-radius:2px;transform:rotate(45deg)}.subnav a:hover{background:#F1F6FD;color:#1D4ED8}.subnav a.active{background:#EAF2FE;color:#174EA6;font-weight:700}.footer{margin-top:auto;padding:11px 12px;border:1px solid #E8EDF4;border-radius:9px;background:#F8FAFC;color:#64748B;font:11px/1.5 Arial,sans-serif}
        @media(max-width:800px){:host{width:100%;min-width:0;flex:initial}.sidebar{position:relative;min-height:auto;height:auto;max-height:none;padding:12px 14px;border-right:0;border-bottom:1px solid #E2E8F0;gap:10px}.brand{display:none}.alert-button{max-width:320px}.nav-group{display:flex;overflow-x:auto;gap:5px;padding-bottom:2px}.group-label{display:none}.nav-item{flex:0 0 auto;white-space:nowrap;padding:8px 9px}.queue-wrap{flex:0 0 auto}.queue-row{display:flex;gap:2px}.queue-row>.nav-item{flex:0 0 auto}.expand{height:36px}.subnav{position:absolute;z-index:20;margin:42px 0 0 2px;padding:5px;background:#fff;border:1px solid #E2E8F0;border-radius:9px;box-shadow:0 8px 20px #0f172a1c}.footer{display:none}}
      </style>
      <aside class="sidebar">
        <div class="brand"><div class="brand-mark"><svg viewBox="0 0 24 24"><path d="M5 12l4 4L19 6"/><path d="M20 12v7H4V5h11"/></svg></div><div><div class="brand-name">Audit Intelligence</div><div class="brand-sub">Continuous Audit Platform</div></div></div>
        <button id="globalAlertsButton" class="alert-button" type="button" aria-label="Loading audit alerts"><svg class="alert-icon" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span id="pendingAlertCount" class="alert-label">Loading alerts...</span><span class="alert-dot"></span></button>
        <div><div class="group-label">Workspace</div><nav class="nav-group" aria-label="Workspace navigation">
          ${navItem('dashboard','Dashboard','#/dashboard','dashboard')}
          <div class="queue-wrap"><div class="queue-row" aria-expanded="${queueOpen}">${navItem('audit-queue','Audit Queue','#/queue','queue')}<button class="expand" id="queueExpand" type="button" aria-label="Toggle Audit Queue submenu" aria-expanded="${queueOpen}"><svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button></div><div class="subnav" id="queueSubnav" ${queueOpen ? '' : 'hidden'}><a href="#/audit-runner" data-nav="run-ai-audit" class="${active === 'run-ai-audit' ? 'active' : ''}" ${active === 'run-ai-audit' ? 'aria-current="page"' : ''}>Run AI Audit</a></div></div>
          ${navItem('ticket-details','Ticket Details','#/ticket-detail','details')}
          ${navItem('consistency-analytics','Consistency Analytics','#/consistency-analytics','analytics')}
          ${navItem('real-time-monitor','Real-Time Monitor','#/monitor','monitor')}
          ${navItem('audit-history','Audit History','#/history','history')}
        </nav></div>
        <div><div class="group-label">Configuration</div><nav class="nav-group" aria-label="Configuration navigation">${navItem('scoring-rubric','Scoring Rubric','#/scoring-rubric','rubric')}</nav></div>
        <div class="footer">Ops Governance Audit team<br>Continuous review and quality control</div>
      </aside>`;

    const toggle = root.getElementById('queueExpand');
    const row = root.querySelector('.queue-row');
    const subnav = root.getElementById('queueSubnav');
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      row.setAttribute('aria-expanded', String(open));
      subnav.hidden = !open;
      try { localStorage.setItem('auditQueueNavOpen', String(open)); } catch (_) {}
    });
  }

  setActive(route) {
    this.setAttribute('active', route || '');
    if (!this.shadowRoot) return;
    this.shadowRoot.querySelectorAll('[data-nav]').forEach(link => {
      const key = link.getAttribute('data-nav');
      const active = key === route || (route === 'run-ai-audit' && key === 'audit-queue');
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    const toggle = this.shadowRoot.getElementById('queueExpand');
    const row = this.shadowRoot.querySelector('.queue-row');
    const subnav = this.shadowRoot.getElementById('queueSubnav');
    if (route === 'run-ai-audit' && toggle && row && subnav) {
      toggle.setAttribute('aria-expanded', 'true');
      row.setAttribute('aria-expanded', 'true');
      subnav.hidden = false;
    }
  }
}

customElements.define('audit-sidebar', AuditSidebar);
