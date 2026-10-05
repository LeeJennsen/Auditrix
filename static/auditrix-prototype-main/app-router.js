(function () {
  'use strict';

  const appRoot = new URL('.', document.currentScript.src);
  const pages = {
    dashboard: { file: 'dashboard.html', title: 'Dashboard', active: 'dashboard', scripts: ['dashboard.js'] },
    queue: { file: 'queue.html', title: 'Audit Queue', active: 'audit-queue', scripts: ['queue.js'] },
    'ticket-detail': { file: 'ticket-detail.html', title: 'Ticket Details', active: 'ticket-details', scripts: ['ticket-detail-page.js', 'ticket-detail.js'] },
    'consistency-analytics': { file: 'consistency-analytics.html', title: 'Consistency Analytics', active: 'consistency-analytics', scripts: ['consistency-analytics.js'] },
    monitor: { file: 'monitor.html', title: 'Real-Time Monitor', active: 'real-time-monitor', scripts: ['monitor-page.js', 'monitor.js'] },
    history: { file: 'history.html', title: 'Audit History', active: 'audit-history', scripts: ['history.js'] },
    'scoring-rubric': { file: 'scoring-rubric.html', title: 'Scoring Rubric', active: 'scoring-rubric', scripts: ['scoring-rubric.js'] },
    'legacy-operations': { file: 'legacy-operations.html', title: 'Legacy Process', active: '', scripts: [] },
    'audit-runner': { file: 'audit-runner.html', title: 'Run AI Audit', active: 'run-ai-audit', scripts: ['audit-runner.js'] }
  };

  const content = document.getElementById('content-container');
  let navigationVersion = 0;
  let lastHandledLocation = location.href;
  let pageTimers = new Set();
  const nativeSetInterval = window.setInterval.bind(window);
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeClearInterval = window.clearInterval.bind(window);
  const nativeClearTimeout = window.clearTimeout.bind(window);

  window.setInterval = function () {
    const timer = nativeSetInterval.apply(window, arguments);
    pageTimers.add(timer);
    return timer;
  };
  window.setTimeout = function () {
    const timer = nativeSetTimeout.apply(window, arguments);
    pageTimers.add(timer);
    return timer;
  };

  function clearPageResources() {
    pageTimers.forEach(function (timer) {
      nativeClearInterval(timer);
      nativeClearTimeout(timer);
    });
    pageTimers.clear();
    document.querySelectorAll('script[data-page-script]').forEach(function (script) { script.remove(); });
  }

  function routeFromPath(pathname) {
    if (pathname === appRoot.pathname || pathname === appRoot.pathname + 'index.html') return 'dashboard';
    for (const [route, page] of Object.entries(pages)) {
      if (new URL(page.file, appRoot).pathname === pathname) return route;
    }
    return null;
  }

  function routeFromLocation() {
    if (location.hash.startsWith('#/')) {
      const routePath = location.hash.slice(2).split('?')[0].replace(/\.html$/, '');
      const route = routePath || 'dashboard';
      return pages[route] ? route : 'dashboard';
    }
    return routeFromPath(location.pathname) || 'dashboard';
  }

  function queryFromLocation() {
    if (location.hash.startsWith('#/')) {
      const queryIndex = location.hash.indexOf('?');
      return queryIndex >= 0 ? location.hash.slice(queryIndex) : '';
    }
    return location.search || '';
  }

  function setSidebarActive(page) {
    const sidebar = document.querySelector('audit-sidebar');
    if (sidebar && typeof sidebar.setActive === 'function') sidebar.setActive(page.active);
  }

  function loadScript(source) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = new URL(source, appRoot).href;
      script.dataset.pageScript = 'true';
      script.onload = resolve;
      script.onerror = function () { reject(new Error('Could not load ' + source)); };
      document.body.appendChild(script);
    });
  }

  async function navigate(route, search, options) {
    const page = pages[route] || pages.dashboard;
    const version = ++navigationVersion;
    const shouldPush = options && options.push;
    if (shouldPush) {
      history.pushState({}, '', '#/' + route + (search || ''));
      lastHandledLocation = location.href;
    }

    content.classList.add('is-loading');
    content.setAttribute('aria-busy', 'true');
    if (!content.firstElementChild) {
      content.innerHTML = '<section class="app-loading" role="status"><span class="app-loading-spinner" aria-hidden="true"></span><span>Loading your workspace…</span></section>';
    }
    try {
      const controller = new AbortController();
      const timeoutId = nativeSetTimeout(function () { controller.abort(); }, 15000);
      let response;
      let markup;
      try {
        response = await fetch(new URL(page.file, appRoot), {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          signal: controller.signal
        });
        if (!response.ok) throw new Error('The requested page could not be loaded (' + response.status + ').');
        markup = await response.text();
      } finally {
        nativeClearTimeout(timeoutId);
      }
      if (version !== navigationVersion) return;

      clearPageResources();
      content.innerHTML = markup;
      content.dataset.page = route;
      content.dataset.pageInstance = String(version);
      window.scrollTo(0, 0);
      document.title = page.title + ' · Audit Intelligence';
      setSidebarActive(page);
      content.classList.remove('is-loading');
      content.classList.add('is-entering');

      try {
        for (const script of page.scripts) {
          if (version !== navigationVersion) return;
          await loadScript(script);
        }
      } catch (error) {
        const notice = document.createElement('div');
        notice.className = 'app-error';
        notice.setAttribute('role', 'alert');
        notice.textContent = error.message;
        content.prepend(notice);
      }
      if (version === navigationVersion) {
        content.classList.remove('is-entering');
        content.setAttribute('aria-busy', 'false');
      }
    } catch (error) {
      if (version !== navigationVersion) return;
      clearPageResources();
      content.dataset.page = 'error';
      content.dataset.pageInstance = String(version);
      content.classList.remove('is-loading', 'is-entering');
      content.setAttribute('aria-busy', 'false');
      const message = error.name === 'AbortError'
        ? 'Loading took too long. Check that the app server is running, then try again.'
        : error.message;
      content.innerHTML = '<section class="app-error" role="alert"><h1>Page unavailable</h1><p>' + message.replace(/[&<>"']/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]; }) + '</p><button type="button" data-retry>Try again</button></section>';
    }
  }

  window.AuditApp = {
    navigate: function (route, search) { return navigate(route, search || '', { push: true }); }
  };

  function routeForAnchor(anchor) {
    const href = anchor.getAttribute('href') || '';
    if (href.startsWith('#/')) {
      const routeAndQuery = href.slice(2);
      const queryIndex = routeAndQuery.indexOf('?');
      const route = (queryIndex < 0 ? routeAndQuery : routeAndQuery.slice(0, queryIndex)).replace(/\.html$/, '') || 'dashboard';
      return pages[route] ? { route: route, search: queryIndex < 0 ? '' : routeAndQuery.slice(queryIndex) } : null;
    }
    if (anchor.target && anchor.target !== '_self' || anchor.hasAttribute('download')) return null;
    const target = new URL(anchor.href, location.href);
    if (target.origin !== location.origin) return null;
    const route = routeFromPath(target.pathname);
    return route ? { route: route, search: target.search } : null;
  }

  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [event.target];
    if (event.target instanceof Element && event.target.closest('[data-retry]')) {
      event.preventDefault();
      navigate(routeFromLocation(), queryFromLocation(), {});
      return;
    }
    const anchor = path.find(function (node) { return node instanceof HTMLAnchorElement; });
    if (!anchor) return;
    const destination = routeForAnchor(anchor);
    if (!destination) return;
    event.preventDefault();
    navigate(destination.route, destination.search, { push: true });
  });

  function syncLocation() {
    if (location.href === lastHandledLocation) return;
    lastHandledLocation = location.href;
    navigate(routeFromLocation(), queryFromLocation(), {});
  }
  window.addEventListener('popstate', syncLocation);
  window.addEventListener('hashchange', syncLocation);
  navigate(routeFromLocation(), queryFromLocation(), {});
})();
