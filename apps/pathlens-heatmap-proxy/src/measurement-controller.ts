export function createMeasurementControllerScript(
  sessionId: string,
  expectedParentOrigin: string | null
): string {
  return `(() => {
  'use strict';
  const VERSION = 1;
  const SCROLL_MESSAGE = 'PATHLENS_SCROLL';
  const REQUEST_MESSAGE = 'PATHLENS_MEASURE_REQUEST';
  const STATE_MESSAGE = 'PATHLENS_MEASURE_STATE';
  const SESSION_ID = ${JSON.stringify(sessionId)};
  const EXPECTED_PARENT_ORIGIN = ${JSON.stringify(expectedParentOrigin)};
  const MAX_DIMENSION = 10000000;
  const MAX_SCROLL_DELTA = 2000;
  const MAX_NONCE_LENGTH = 256;
  const MIN_INTERVAL = 50;
  const DEBUG = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  let nonce = null;
  let requestId = null;
  let sequence = 0;
  let frame = 0;
  let lastSentAt = 0;
  let requestTimes = [];
  let scrollTimes = [];

  function debug(stage, reason) {
    if (DEBUG && typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug('[Pathlens measurement]', stage, reason ? { reason } : {});
    }
  }

  function finite(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function boundedDimension(value) {
    return finite(value) && value >= 0 && value <= MAX_DIMENSION ? value : null;
  }

  function validToken(value) {
    return typeof value === 'string' && value.length >= 16 && value.length <= MAX_NONCE_LENGTH;
  }

  function expectedOrigin(event) {
    return EXPECTED_PARENT_ORIGIN
      ? event.origin === 'null' || event.origin === EXPECTED_PARENT_ORIGIN
      : event.origin === 'null';
  }

  function withinRateLimit(bucket, limit) {
    const now = Date.now();
    while (bucket.length && now - bucket[0] > 1000) bucket.shift();
    if (bucket.length >= limit) return false;
    bucket.push(now);
    return true;
  }

  function dimensions() {
    const root = document.documentElement;
    const body = document.body;
    const viewportWidth = Math.max(0, Math.min(MAX_DIMENSION, window.innerWidth || 0));
    const viewportHeight = Math.max(0, Math.min(MAX_DIMENSION, window.innerHeight || 0));
    const documentWidth = Math.min(MAX_DIMENSION, Math.max(
      viewportWidth,
      root ? root.scrollWidth : 0,
      root ? root.clientWidth : 0,
      body ? body.scrollWidth : 0,
      body ? body.clientWidth : 0
    ));
    const documentHeight = Math.min(MAX_DIMENSION, Math.max(
      viewportHeight,
      root ? root.scrollHeight : 0,
      root ? root.clientHeight : 0,
      body ? body.scrollHeight : 0,
      body ? body.clientHeight : 0
    ));
    const maxScrollX = Math.max(0, documentWidth - viewportWidth);
    const maxScrollY = Math.max(0, documentHeight - viewportHeight);
    return {
      viewportWidth,
      viewportHeight,
      documentWidth,
      documentHeight,
      scrollX: Math.min(maxScrollX, Math.max(0, finite(window.scrollX) ? window.scrollX : 0)),
      scrollY: Math.min(maxScrollY, Math.max(0, finite(window.scrollY) ? window.scrollY : 0)),
      maxScrollX,
      maxScrollY,
    };
  }

  function sendMeasurement() {
    frame = 0;
    if (!nonce || !requestId || !withinRateLimit(scrollTimes, 30)) return;
    const now = performance.now();
    if (now - lastSentAt < MIN_INTERVAL) {
      frame = requestAnimationFrame(sendMeasurement);
      return;
    }
    lastSentAt = now;
    sequence += 1;
    window.parent.postMessage({
      version: VERSION,
      type: STATE_MESSAGE,
      sessionId: SESSION_ID,
      nonce,
      requestId,
      ...dimensions(),
      layoutVersion: sequence,
    }, '*');
    debug('measurement-response-sent');
  }

  function scheduleMeasurement() {
    if (!frame) frame = requestAnimationFrame(sendMeasurement);
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) {
      debug('measurement-request-rejected', 'source-mismatch');
      return;
    }
    if (!expectedOrigin(event)) {
      debug('measurement-request-rejected', 'origin-mismatch');
      return;
    }
    if (!event.data || typeof event.data !== 'object') return;
    const data = event.data;
    if (data.version !== VERSION) {
      debug('measurement-request-rejected', 'version-mismatch');
      return;
    }
    if (data.sessionId !== SESSION_ID) {
      debug('measurement-request-rejected', 'session-mismatch');
      return;
    }
    if (!withinRateLimit(requestTimes, 60)) {
      debug('measurement-request-rejected', 'rate-limited');
      return;
    }

    if (data.type === REQUEST_MESSAGE) {
      if (!validToken(data.nonce)) {
        debug('measurement-request-rejected', 'invalid-nonce');
        return;
      }
      if (typeof data.requestId !== 'string' || data.requestId.length > 256) {
        debug('measurement-request-rejected', 'invalid-request-id');
        return;
      }
      debug('measurement-request-received');
      nonce = data.nonce;
      requestId = data.requestId;
      scheduleMeasurement();
      return;
    }

    if (data.type !== SCROLL_MESSAGE || !nonce || data.nonce !== nonce || !finite(data.delta) || Math.abs(data.delta) > MAX_SCROLL_DELTA) return;
    window.scrollBy(0, data.delta);
    scheduleMeasurement();
  });

  window.addEventListener('scroll', scheduleMeasurement, { passive: true });
  window.addEventListener('resize', scheduleMeasurement, { passive: true });
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(scheduleMeasurement);
    if (document.documentElement) observer.observe(document.documentElement);
    if (document.body) observer.observe(document.body);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleMeasurement).catch(() => {});
})();`
}
