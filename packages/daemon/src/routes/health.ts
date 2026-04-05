import { Hono } from "hono";
import { getActiveJobCount } from "../jobs/job-manager.js";
import { getCfAccessIdentity } from "../middleware/cf-access.js";

const app = new Hono();

// Public probe: returns only `{ status: "ok" }` without auth (monitoring,
// Cloudflare Tunnel health, uptime checks). With valid CF Access identity,
// returns operational detail. This avoids leaking uptime/activeJobs as
// reconnaissance signal to unauthenticated callers.
app.get("/", (c) => {
  const identity = getCfAccessIdentity(c);
  if (!identity) {
    return c.json({ status: "ok" });
  }
  return c.json({
    status: "ok",
    uptime: process.uptime(),
    activeJobs: getActiveJobCount(),
    timestamp: Date.now(),
    identity: {
      email: identity.email,
      serviceToken: identity.serviceToken,
    },
  });
});

export default app;
