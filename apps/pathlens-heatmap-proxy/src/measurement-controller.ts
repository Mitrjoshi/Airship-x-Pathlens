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
   const MAX_ANCHOR_IDS = 256;
   const MAX_ANCHOR_ID_LENGTH = 64;
   const MAX_ANCHOR_DEPTH = 8;
   const MAX_ANCHOR_DIMENSION = 10000000;
   const MAX_ANCHOR_RESPONSE_BYTES = 262144;
   const MAX_DOM_CANDIDATES = 10000;
   const ANCHOR_ID_PATTERN = /^fnv1a32-[0-9a-f]{8}$/;
   const EXPLICIT_ANCHOR_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
   const SENSITIVE_SELECTOR = '[data-pathlens-mask], [data-pathlens-block], input, textarea, select';
   const SCROLL_VALUES = new Set(['auto', 'scroll', 'overlay']);
  const MIN_INTERVAL = 50;
  const DEBUG = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  let nonce = null;
  let requestId = null;
  let sequence = 0;
  let frame = 0;
  let lastSentAt = 0;
  let requestTimes = [];
   let scrollTimes = [];
   let activeAnchorIds = null;

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

   function hashFingerprint(value) {
     let hash = 2166136261;
     for (let index = 0; index < value.length; index += 1) {
       hash ^= value.charCodeAt(index);
       hash = Math.imul(hash, 16777619);
     }
     return 'fnv1a32-' + (hash >>> 0).toString(16).padStart(8, '0');
   }

   function getElementPath(element) {
     const segments = [];
     let current = element;
     while (current) {
       if (segments.length >= MAX_ANCHOR_DEPTH) return null;
       const parent = current.parentElement;
       const tagName = current.tagName.toLowerCase();
       const siblings = parent
         ? Array.from(parent.children).filter((candidate) => candidate.tagName.toLowerCase() === tagName)
         : [];
       const siblingIndex = Math.max(0, siblings.indexOf(current));
       segments.unshift(tagName + ':' + siblingIndex);
       current = parent;
     }
     return segments.join('/');
   }

   function getAnchorId(element) {
     const explicit = element.getAttribute('data-pathlens-anchor');
     const fingerprint = explicit && EXPLICIT_ANCHOR_PATTERN.test(explicit)
       ? 'explicit:' + explicit
       : getElementPath(element);
     if (!fingerprint) return null;
     const anchorId = hashFingerprint(fingerprint);
     return anchorId.length <= MAX_ANCHOR_ID_LENGTH ? anchorId : null;
   }

   function isSensitiveElement(element) {
     return Boolean(element.closest(SENSITIVE_SELECTOR));
   }

   function getPositionMode(element) {
     const position = window.getComputedStyle(element).position;
     return position === 'absolute' || position === 'fixed' || position === 'sticky'
       ? position
       : 'static';
   }

   function getPositioningAncestor(element) {
     let current = element.parentElement;
     let depth = 1;
     while (current && depth <= MAX_ANCHOR_DEPTH) {
       const mode = getPositionMode(current);
       if (mode === 'fixed' || mode === 'sticky') {
         const anchorId = getAnchorId(current);
         return anchorId ? { mode, depth, anchorId } : null;
       }
       current = current.parentElement;
       depth += 1;
     }
     return null;
   }

   function getCandidates() {
     const all = document.getElementsByTagName('*');
     const candidates = [];
     for (let index = 0; index < all.length && candidates.length < MAX_DOM_CANDIDATES; index += 1) {
       const element = all[index];
       if (element instanceof HTMLElement && !isSensitiveElement(element)) candidates.push(element);
     }
     return candidates;
   }

   function resolveAnchors() {
     if (!activeAnchorIds) return undefined;
     const wanted = new Set(activeAnchorIds);
     const matches = new Map();
     for (const element of getCandidates()) {
       const anchorId = getAnchorId(element);
       if (!anchorId || !wanted.has(anchorId)) continue;
       const list = matches.get(anchorId) || [];
       if (list.length < 2) list.push(element);
       matches.set(anchorId, list);
     }

     return activeAnchorIds.map((anchorId) => {
       const matching = matches.get(anchorId) || [];
       if (matching.length === 0) return { anchorId, status: 'missing' };
       if (matching.length !== 1) return { anchorId, status: 'ambiguous' };
       const element = matching[0];
       const rect = element.getBoundingClientRect();
       if (!Number.isFinite(rect.left) || !Number.isFinite(rect.top) ||
           !Number.isFinite(rect.width) || !Number.isFinite(rect.height) ||
           rect.width <= 0 || rect.height <= 0 ||
           rect.width > MAX_ANCHOR_DIMENSION || rect.height > MAX_ANCHOR_DIMENSION) {
         return { anchorId, status: 'missing' };
       }
       const positioningAncestor = getPositioningAncestor(element);
       const result = {
         anchorId,
         status: 'matched',
         rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
         positionMode: getPositionMode(element),
       };
       if (positioningAncestor) {
         result.effectivePositionMode = positioningAncestor.mode;
         result.positioningAncestorDepth = positioningAncestor.depth;
         result.positioningAncestorAnchorId = positioningAncestor.anchorId;
       }
       return result;
     });
   }

   function boundedAnchorResolutions() {
     const resolutions = resolveAnchors();
     if (!resolutions) return undefined;
     try {
       if (JSON.stringify(resolutions).length <= MAX_ANCHOR_RESPONSE_BYTES) {
         return resolutions;
       }
     } catch {}
     return resolutions.map((resolution) => ({
       anchorId: resolution.anchorId,
       status: 'missing',
     }));
   }

   function validAnchorRequest(anchorIds) {
     if (anchorIds === undefined) return true;
     if (!Array.isArray(anchorIds) || anchorIds.length > MAX_ANCHOR_IDS) return false;
     const seen = new Set();
     for (const anchorId of anchorIds) {
       if (typeof anchorId !== 'string' || anchorId.length === 0 ||
           anchorId.length > MAX_ANCHOR_ID_LENGTH || !ANCHOR_ID_PATTERN.test(anchorId) ||
           seen.has(anchorId)) return false;
       seen.add(anchorId);
     }
     return JSON.stringify(anchorIds).length <= 16384;
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
       anchorResolutions: boundedAnchorResolutions(),
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
       if (!validAnchorRequest(data.anchorIds)) {
         debug('measurement-request-rejected', 'invalid-anchor-request');
         return;
       }
       debug('measurement-request-received');
       nonce = data.nonce;
       requestId = data.requestId;
       activeAnchorIds = data.anchorIds === undefined ? null : data.anchorIds.slice();
       scheduleMeasurement();
      return;
    }

    if (data.type !== SCROLL_MESSAGE || !nonce || data.nonce !== nonce || !finite(data.delta) || Math.abs(data.delta) > MAX_SCROLL_DELTA) return;
    window.scrollBy(0, data.delta);
    scheduleMeasurement();
  });

   window.addEventListener('scroll', scheduleMeasurement, { passive: true, capture: true });
   window.addEventListener('resize', scheduleMeasurement, { passive: true });
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(scheduleMeasurement);
    if (document.documentElement) observer.observe(document.documentElement);
    if (document.body) observer.observe(document.body);
  }
   if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleMeasurement).catch(() => {});
   if (typeof MutationObserver === 'function' && document.documentElement) {
     const observer = new MutationObserver(scheduleMeasurement);
     observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
   }
 })();`
}
