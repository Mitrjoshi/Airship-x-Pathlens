# Dynamic Runtime Compatibility

The `isolated-script-runtime` policy keeps the preview in an opaque-origin,
`allow-scripts` iframe. It is an extension of the live HTML proxy, not a second
rendering system.

## Implemented And Browser-Tested

- Classic scripts loaded from the selected registered domain.
- ES module imports, export-from references, nested modules, query strings, and dynamic imports with literal URLs.
- `modulepreload` references.
- JavaScript-created `src` and `setAttribute('src'|'href', ...)` references when the URL is a statically known string.
- `fetch()` GET and `XMLHttpRequest` HEAD through session-bound proxy resources.
- JSON responses, response limits, DNS/IP validation, redirect validation, and selected-domain authorization.
- Same-document `history.pushState`, `history.replaceState`, `history.back`, and `popstate` behavior.
- Client DOM mounting and hydration-like updates, real iframe scrolling, IntersectionObserver reveals, sticky elements, fixed elements, and CSS transitions.
- Production React/Vite mounting, React state/event updates, React.lazy/Suspense, Vite CSS/assets, and authorized JSON GETs.
- Production Next.js static-export SSR HTML and static chunk/resource loading.
- Production GSAP ScrollTrigger, Motion `inView` animation, IntersectionObserver, and native scrolling in the controlled fixture.
- Opaque-origin restrictions for parent DOM, cookies, storage, WebSockets, workers, popups, top navigation, mutation methods, and unauthorized domains.

## Implemented But Limited

- `fetch()` and XHR URLs are rewritten only when their URL argument is a string literal. The proxy still rejects all methods except GET and HEAD.
- Unauthorized dynamic imports are replaced with rejected promises. Unauthorized static imports fail closed while serving the module.
- JavaScript syntax that cannot be parsed by the production AST parser fails closed with `SCRIPT_SYNTAX_UNSUPPORTED`.
- Same-domain API access is limited to the selected session host and the existing resource authorization path. No Pathlens API origin, cookies, authorization headers, or credentials are forwarded.
- SPA history changes remain in-document. Full-document navigation to another pathname is not broadened beyond the session's authorized pathname.

## Unsupported By Design Or Not Yet Verified

- `import.meta.url` transformations that require preserving the original upstream module URL.
- Non-literal dynamic imports and runtime-generated URLs whose source cannot be safely identified.
- CSS-in-JS URLs that are generated after the source rewriter runs, unless the application assigns a statically known URL to a rewritten DOM resource property.
- Service workers, Web Workers, WebSockets, unrestricted forms, downloads, and popup navigation.
- Next.js client hydration is blocked by design because the current secure rewriter removes inline bootstrap/RSC scripts. SSR and static chunks still render.
- CSS scroll-driven animation and third-party animation runtimes other than the tested GSAP and Motion fixtures have not been verified.

The static-only policy remains the default and is covered by the existing browser regression suite.
