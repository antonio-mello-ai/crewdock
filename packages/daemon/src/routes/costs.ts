import { Hono } from "hono";
import { getDb } from "../db/client.js";
import { jobs, sessionMessages } from "../db/schema.js";
import { sql, gte, and } from "drizzle-orm";

const app = new Hono();

function periodToMs(period: string): number {
  switch (period) {
    case "today": return Date.now() - new Date().setHours(0, 0, 0, 0);
    case "24h": return 24 * 60 * 60 * 1000;
    case "7d": return 7 * 24 * 60 * 60 * 1000;
    case "30d": return 30 * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

// Cost summary
app.get("/summary", (c) => {
  const period = c.req.query("period") ?? "7d";
  const since = Date.now() - periodToMs(period);
  const db = getDb();

  const jobCosts = db
    .select({
      totalCost: sql<number>`COALESCE(SUM(total_cost_usd), 0)`,
      totalIn: sql<number>`COALESCE(SUM(total_tokens_in), 0)`,
      totalOut: sql<number>`COALESCE(SUM(total_tokens_out), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(jobs)
    .where(gte(jobs.createdAt, since))
    .get()!;

  const sessionCosts = db
    .select({
      totalCost: sql<number>`COALESCE(SUM(cost_usd), 0)`,
      totalIn: sql<number>`COALESCE(SUM(tokens_in), 0)`,
      totalOut: sql<number>`COALESCE(SUM(tokens_out), 0)`,
    })
    .from(sessionMessages)
    .where(and(gte(sessionMessages.createdAt, since), sql`role = 'assistant'`))
    .get()!;

  return c.json({
    data: {
      totalCostUsd: jobCosts.totalCost + sessionCosts.totalCost,
      totalTokensIn: jobCosts.totalIn + sessionCosts.totalIn,
      totalTokensOut: jobCosts.totalOut + sessionCosts.totalOut,
      totalJobs: jobCosts.count,
      period: { start: since, end: Date.now() },
    },
  });
});

// Cost by agent
app.get("/by-agent", (c) => {
  const period = c.req.query("period") ?? "7d";
  const since = Date.now() - periodToMs(period);
  const db = getDb();

  const rows = db
    .select({
      agentId: jobs.agentId,
      totalCost: sql<number>`COALESCE(SUM(total_cost_usd), 0)`,
      totalJobs: sql<number>`COUNT(*)`,
      avgDuration: sql<number>`AVG(finished_at - started_at)`,
    })
    .from(jobs)
    .where(gte(jobs.createdAt, since))
    .groupBy(jobs.agentId)
    .all();

  return c.json({ data: rows });
});

// Cost by day (time series)
app.get("/by-day", (c) => {
  const period = c.req.query("period") ?? "30d";
  const since = Date.now() - periodToMs(period);
  const db = getDb();

  const rows = db
    .select({
      date: sql<string>`DATE(created_at / 1000, 'unixepoch')`,
      costUsd: sql<number>`COALESCE(SUM(total_cost_usd), 0)`,
      jobs: sql<number>`COUNT(*)`,
    })
    .from(jobs)
    .where(gte(jobs.createdAt, since))
    .groupBy(sql`DATE(created_at / 1000, 'unixepoch')`)
    .orderBy(sql`DATE(created_at / 1000, 'unixepoch')`)
    .all();

  return c.json({ data: rows });
});

// Agent health metrics
app.get("/health", (c) => {
  const db = getDb();
  const since7d = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const since30d = Date.now() - 30 * 24 * 60 * 60 * 1000;

  // Per-agent stats for 7d and 30d
  const recent = db
    .select({
      agentId: jobs.agentId,
      totalCost: sql<number>`COALESCE(SUM(total_cost_usd), 0)`,
      totalJobs: sql<number>`COUNT(*)`,
      failedJobs: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
      avgDuration: sql<number>`AVG(CASE WHEN finished_at IS NOT NULL THEN finished_at - started_at END)`,
    })
    .from(jobs)
    .where(gte(jobs.createdAt, since7d))
    .groupBy(jobs.agentId)
    .all();

  const older = db
    .select({
      agentId: jobs.agentId,
      totalCost: sql<number>`COALESCE(SUM(total_cost_usd), 0)`,
      totalJobs: sql<number>`COUNT(*)`,
      avgDuration: sql<number>`AVG(CASE WHEN finished_at IS NOT NULL THEN finished_at - started_at END)`,
    })
    .from(jobs)
    .where(and(gte(jobs.createdAt, since30d), sql`created_at < ${since7d}`))
    .groupBy(jobs.agentId)
    .all();

  // Compute trends
  const health = recent.map((r) => {
    const prev = older.find((o) => o.agentId === r.agentId);
    const costTrend = prev && prev.totalCost > 0
      ? ((r.totalCost - prev.totalCost) / prev.totalCost) * 100
      : 0;
    const durationTrend = prev && prev.avgDuration > 0
      ? ((r.avgDuration - prev.avgDuration) / prev.avgDuration) * 100
      : 0;
    const failRate = r.totalJobs > 0 ? (r.failedJobs / r.totalJobs) * 100 : 0;

    return {
      agentId: r.agentId,
      totalCost7d: r.totalCost,
      totalJobs7d: r.totalJobs,
      failRate,
      avgDurationMs: r.avgDuration,
      costTrendPct: Math.round(costTrend),
      durationTrendPct: Math.round(durationTrend),
    };
  });

  return c.json({ data: health });
});

export default app;
