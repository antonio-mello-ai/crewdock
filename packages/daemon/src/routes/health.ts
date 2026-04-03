import { Hono } from "hono";
import { getActiveJobCount } from "../jobs/job-manager.js";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    status: "ok",
    uptime: process.uptime(),
    activeJobs: getActiveJobCount(),
    timestamp: Date.now(),
  });
});

export default app;
