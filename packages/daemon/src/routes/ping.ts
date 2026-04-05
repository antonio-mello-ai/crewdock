import { Hono } from "hono";

/**
 * Auth warmup endpoint.
 *
 * Problem: when the frontend at ai.felhen.ai makes a `fetch(api.crewdock.ai,
 * {credentials: "include"})`, the browser has no CF Access app cookie for
 * api.crewdock.ai on first visit. CF Access returns 302 → team login →
 * 302 → app cookie set → 302 back. Fetch cannot follow cross-origin
 * redirects with credentials, so the first call always fails with CORS.
 *
 * Solution: frontend loads this endpoint inside an invisible iframe. Iframes
 * follow cross-origin redirects freely, so the full CF Access SSO chain
 * completes and the app cookie lands in the browser. After that, real
 * fetches/WS upgrades carry the cookie and succeed.
 *
 * This route is intentionally framable (no X-Frame-Options) and returns
 * minimal HTML so no visual artifacts show.
 */
const app = new Hono();

app.get("/", (c) => {
  // Explicitly allow framing from the whitelisted origins. Modern browsers
  // prefer CSP frame-ancestors over X-Frame-Options when both are present.
  c.header(
    "Content-Security-Policy",
    "frame-ancestors 'self' https://ai.felhen.ai https://crewdock.ai"
  );
  return c.html("<!doctype html><title>ok</title>ok");
});

export default app;
