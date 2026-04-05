import { Hono } from "hono";
import { gte, desc } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { jobs, sessions } from "../db/schema.js";
import { getWorkspace } from "../registry/workspaces.js";

const app = new Hono();

interface BriefingHighlight {
  kind: "failure" | "success" | "active" | "info";
  workspace: string | null;
  workspaceName: string | null;
  title: string;
  detail: string | null;
  timestamp: number;
  costUsd: number;
  link: { type: "session" | "job"; id: string };
}

interface BriefingSection {
  title: string;
  icon: "alert" | "check" | "activity" | "info";
  items: BriefingHighlight[];
}

interface BriefingResponse {
  periodHours: number;
  generatedAt: number;
  stats: {
    sessionsCount: number;
    activeSessionsCount: number;
    jobsCount: number;
    failedJobsCount: number;
    totalCostUsd: number;
  };
  sections: BriefingSection[];
}

app.get("/", (c) => {
  const hours = Number(c.req.query("hours")) || 12;
  const since = Date.now() - hours * 60 * 60 * 1000;
  const db = getDb();

  const recentSessions = db
    .select()
    .from(sessions)
    .where(gte(sessions.lastActiveAt, since))
    .orderBy(desc(sessions.lastActiveAt))
    .all();

  const recentJobs = db
    .select()
    .from(jobs)
    .where(gte(jobs.createdAt, since))
    .orderBy(desc(jobs.createdAt))
    .all();

  const failedJobs = recentJobs.filter((j) => j.status === "failed");
  const completedJobs = recentJobs.filter((j) => j.status === "completed");
  const runningJobs = recentJobs.filter(
    (j) => j.status === "running" || j.status === "queued"
  );
  const activeSessions = recentSessions.filter((s) => s.status === "active");

  const sessionCost = recentSessions.reduce(
    (sum, s) => sum + s.totalCostUsd,
    0
  );
  const jobCost = recentJobs.reduce((sum, j) => sum + j.totalCostUsd, 0);
  const totalCost = sessionCost + jobCost;

  const workspaceInfo = (workspaceId: string) => {
    const ws = getWorkspace(workspaceId);
    return {
      id: workspaceId,
      name: ws?.name ?? workspaceId,
    };
  };

  const sections: BriefingSection[] = [];

  // Needs attention: failed jobs
  if (failedJobs.length > 0) {
    sections.push({
      title: "Needs attention",
      icon: "alert",
      items: failedJobs.map((j) => ({
        kind: "failure" as const,
        workspace: j.agentId ?? null,
        workspaceName: j.agentId ? workspaceInfo(j.agentId).name : null,
        title: j.agentId ?? "unknown",
        detail: j.objective ?? null,
        timestamp: j.createdAt,
        costUsd: j.totalCostUsd,
        link: { type: "job" as const, id: j.id },
      })),
    });
  }

  // In progress: active sessions + running jobs
  const inProgressItems: BriefingHighlight[] = [
    ...activeSessions.map((s) => {
      const info = workspaceInfo(s.agentId);
      return {
        kind: "active" as const,
        workspace: info.id,
        workspaceName: info.name,
        title: info.name,
        detail: s.title ?? `Session ${s.id.slice(0, 6)}`,
        timestamp: s.lastActiveAt,
        costUsd: s.totalCostUsd,
        link: { type: "session" as const, id: s.id },
      };
    }),
    ...runningJobs.map((j) => ({
      kind: "active" as const,
      workspace: j.agentId ?? null,
      workspaceName: j.agentId ? workspaceInfo(j.agentId).name : null,
      title: j.agentId ?? "unknown",
      detail: j.objective ?? null,
      timestamp: j.createdAt,
      costUsd: j.totalCostUsd,
      link: { type: "job" as const, id: j.id },
    })),
  ];
  if (inProgressItems.length > 0) {
    sections.push({
      title: "In progress",
      icon: "activity",
      items: inProgressItems,
    });
  }

  // Resolved: completed jobs (group by workspace, show top 5)
  if (completedJobs.length > 0) {
    sections.push({
      title: "Resolved",
      icon: "check",
      items: completedJobs.slice(0, 5).map((j) => ({
        kind: "success" as const,
        workspace: j.agentId ?? null,
        workspaceName: j.agentId ? workspaceInfo(j.agentId).name : null,
        title: j.agentId ?? "unknown",
        detail: j.objective ?? null,
        timestamp: j.createdAt,
        costUsd: j.totalCostUsd,
        link: { type: "job" as const, id: j.id },
      })),
    });
  }

  // Recently closed sessions (worth showing)
  const closedSessions = recentSessions.filter((s) => s.status === "closed").slice(0, 3);
  if (closedSessions.length > 0) {
    sections.push({
      title: "Recent conversations",
      icon: "info",
      items: closedSessions.map((s) => {
        const info = workspaceInfo(s.agentId);
        return {
          kind: "info" as const,
          workspace: info.id,
          workspaceName: info.name,
          title: info.name,
          detail: s.title ?? `Session ${s.id.slice(0, 6)}`,
          timestamp: s.lastActiveAt,
          costUsd: s.totalCostUsd,
          link: { type: "session" as const, id: s.id },
        };
      }),
    });
  }

  const response: BriefingResponse = {
    periodHours: hours,
    generatedAt: Date.now(),
    stats: {
      sessionsCount: recentSessions.length,
      activeSessionsCount: activeSessions.length,
      jobsCount: recentJobs.length,
      failedJobsCount: failedJobs.length,
      totalCostUsd: totalCost,
    },
    sections,
  };

  return c.json({ data: response });
});

export default app;
