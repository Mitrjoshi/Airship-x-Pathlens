export function createRoutingCompatibilityScript(pathname: string): string {
  return `
(() => {
  const allowedPath = ${JSON.stringify(pathname)};
  const currentUrl = new URL(window.location.href);
  const pageOrigin = currentUrl.origin;

  function allowedUrl(value) {
    if (value === undefined || value === null) return null;
    let next;
    try {
      next = new URL(String(value), window.location.href);
    } catch {
      return null;
    }
    if (next.origin !== pageOrigin || next.pathname !== allowedPath) return null;
    return next.pathname + next.search + next.hash;
  }

  function visibleUrl() {
    return allowedPath + window.location.search + window.location.hash;
  }

  try {
    window.history.replaceState(window.history.state, '', visibleUrl());
  } catch {
    return;
  }

  for (const method of ['pushState', 'replaceState']) {
    const original = window.history[method];
    window.history[method] = function(state, title, value) {
      const next = value === undefined ? visibleUrl() : allowedUrl(value);
      if (next === null) return;
      return original.call(window.history, state, title, next);
    };
  }

  window.addEventListener('popstate', () => {
    if (window.location.pathname !== allowedPath) {
      window.history.replaceState(window.history.state, '', visibleUrl());
    }
  });
})();
`
}
