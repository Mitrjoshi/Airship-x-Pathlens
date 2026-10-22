# Manual Preview

Build the real production fixtures and open a visible Chromium preview:

```powershell
pnpm --filter @pathlens/heatmap-proxy preview:manual
```

Open `http://127.0.0.1:8093`. Override the port with
`$env:PATHLENS_MANUAL_PREVIEW_PORT = '8094'` if needed.

## Controls

- Choose `react` for the production React/Vite fixture.
- Choose `next` for the production Next.js static export fixture.
- Choose `animation` for the GSAP, Motion, IntersectionObserver, sticky, and CSS scroll-animation fixture.
- Use `Desktop` and `Mobile` to change the iframe viewport.
- Scroll and interact directly inside the iframe.
- The header shows the selected proxied hostname and `/contact` pathname.
- Terminal output labels runtime errors, security blocks, and failed requests separately. Session handles and resource tokens are redacted.

## Real Site

The manual viewer intentionally has no arbitrary URL input. To test
`https://mitrjoshi.vercel.app/contact`:

1. Register the exact domain in an existing Pathlens project through the normal authenticated project-domain flow.
2. Ensure the preview API and database are running with the existing API `.env` configuration.
3. Set the proxy and dashboard origins from `apps/pathlens-heatmap-proxy/.env.example` and `apps/pathlens-web/.env.example`.
4. Create a preview session through the authenticated dashboard flow for the registered domain and `/contact`.
5. Open the returned iframe URL in the existing Pathlens dashboard, not as an arbitrary manual URL.
6. Review Chromium terminal diagnostics for scripts, modules, fonts, images, API requests, CSP blocks, and hydration failures.

Do not register domains, bypass ownership validation, add external allowlist entries,
or forward cookies and credentials solely for this test.
