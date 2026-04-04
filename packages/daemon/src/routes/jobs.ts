import { Hono } from "hono";
import { readFileSync, existsSync } from "node:fs";
import { createJob, getJob, listJobs, cancelJob } from "../jobs/job-manager.js";
import type { CreateJobRequest, JobStatus } from "@aios/shared";

const app = new Hono();

app.post("/", async (c) => {
  try {
    const body = await c.req.json<CreateJobRequest>();

    if (!body.type || !body.objective) {
      return c.json(
        { error: "bad_request", message: "type and objective are required" },
        400
      );
    }

    const job = await createJob(body);
    return c.json({ data: job }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/", (c) => {
  const status = c.req.query("status") as JobStatus | undefined;
  const agentId = c.req.query("agentId");
  const limit = Number(c.req.query("limit")) || 50;
  const offset = Number(c.req.query("offset")) || 0;

  const result = listJobs({ status, agentId: agentId ?? undefined, limit, offset });
  return c.json(result);
});

app.get("/:id", (c) => {
  const job = getJob(c.req.param("id"));
  if (!job) return c.json({ error: "not_found", message: "Job not found" }, 404);
  return c.json({ data: job });
});

app.get("/:id/logs", (c) => {
  const job = getJob(c.req.param("id"));
  if (!job) return c.json({ error: "not_found", message: "Job not found" }, 404);
  if (!job.logPath || !existsSync(job.logPath)) {
    return c.json({ data: { lines: [] } });
  }
  try {
    const content = readFileSync(job.logPath, "utf-8");
    const lines = content.split("\n");
    return c.json({ data: { lines } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "read_failed", message }, 500);
  }
});

app.post("/:id/cancel", (c) => {
  const cancelled = cancelJob(c.req.param("id"));
  if (!cancelled) {
    return c.json(
      { error: "not_found", message: "Job not found or not running" },
      404
    );
  }
  return c.json({ data: { cancelled: true } });
});

export default app;
