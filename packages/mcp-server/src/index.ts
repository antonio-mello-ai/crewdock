#!/usr/bin/env node
/**
 * AIOS Runtime MCP Server
 *
 * Exposes the AIOS daemon API as an MCP server so Claude Code can interact
 * with the runtime programmatically.
 *
 * Usage:
 *   AIOS_DAEMON_URL=https://api.crewdock.ai aios-mcp
 *
 * Register with Claude Code:
 *   claude mcp add aios -s user -- aios-mcp
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const DAEMON_URL = process.env.AIOS_DAEMON_URL ?? "http://localhost:3101";
const CF_CLIENT_ID = process.env.CF_ACCESS_CLIENT_ID ?? "";
const CF_CLIENT_SECRET = process.env.CF_ACCESS_CLIENT_SECRET ?? "";

// When talking to api.crewdock.ai (CF Access protected), inject the service
// token headers so the CF edge authorizes the call via the service-token
// policy and forwards a valid JWT to the daemon. For localhost/dev, no
// headers are needed — the daemon's loopback bypass handles it.
function buildAuthHeaders(): Record<string, string> {
  const needsAuth = /^https?:\/\/(?!localhost|127\.|0\.0\.0\.0)/.test(DAEMON_URL);
  if (!needsAuth) return {};
  if (!CF_CLIENT_ID || !CF_CLIENT_SECRET) {
    console.error(
      "[aios-mcp] WARNING: remote daemon URL without CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET — requests will fail with 401"
    );
    return {};
  }
  return {
    "CF-Access-Client-Id": CF_CLIENT_ID,
    "CF-Access-Client-Secret": CF_CLIENT_SECRET,
  };
}

async function daemonFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${DAEMON_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
    };
    throw new Error(
      body.message ?? body.error ?? `API error ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

function formatJsonResult(data: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

const server = new McpServer({
  name: "aios-runtime",
  version: "0.1.0",
});

// ---------------------------------------------------------------------------
// Briefing
// ---------------------------------------------------------------------------

server.registerTool(
  "get_briefing",
  {
    title: "Get AIOS activity briefing",
    description:
      "Get a structured summary of AIOS activity in the last N hours: needs attention, in progress, resolved, and recent conversations.",
    inputSchema: {
      hours: z
        .number()
        .int()
        .positive()
        .default(12)
        .describe("Time window in hours (default: 12)"),
    },
  },
  async ({ hours }) => {
    const result = await daemonFetch<{ data: unknown }>(
      `/api/briefing?hours=${hours}`
    );
    return formatJsonResult(result.data);
  }
);

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

server.registerTool(
  "list_workspaces",
  {
    title: "List AIOS workspaces",
    description:
      "List all workspaces available in the AIOS runtime. Each workspace is a directory with a CLAUDE.md file where Claude can run with local context.",
    inputSchema: {},
  },
  async () => {
    const result = await daemonFetch<{ data: unknown[] }>("/api/workspaces");
    return formatJsonResult(result.data);
  }
);

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

server.registerTool(
  "list_sessions",
  {
    title: "List recent AIOS sessions",
    description:
      "List recent Claude sessions in the AIOS runtime, optionally filtered by workspace. Returns session metadata including status, cost, and last activity.",
    inputSchema: {
      workspaceId: z
        .string()
        .optional()
        .describe("Filter by workspace ID (e.g. 'carreira', 'corp')"),
      limit: z.number().int().positive().default(20),
    },
  },
  async ({ workspaceId, limit }) => {
    const params = new URLSearchParams();
    if (workspaceId) params.set("workspaceId", workspaceId);
    params.set("limit", String(limit));
    const result = await daemonFetch<{ data: unknown[] }>(
      `/api/sessions?${params.toString()}`
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "get_session_messages",
  {
    title: "Get conversation history of a session",
    description:
      "Retrieve all messages from a specific AIOS session, showing the full conversation between user and assistant.",
    inputSchema: {
      sessionId: z.string().describe("The session ID (e.g. 'xyz123abc')"),
    },
  },
  async ({ sessionId }) => {
    const result = await daemonFetch<{ data: unknown[] }>(
      `/api/sessions/${sessionId}/messages`
    );
    return formatJsonResult(result.data);
  }
);

// ---------------------------------------------------------------------------
// Schedules (systemd timers)
// ---------------------------------------------------------------------------

server.registerTool(
  "list_schedules",
  {
    title: "List AIOS scheduled tasks",
    description:
      "List all AIOS-owned systemd timers with their next/last run times, enabled state, and schedule. Only timers with User=claude or ExecStart in /home/claude/ are included.",
    inputSchema: {},
  },
  async () => {
    const result = await daemonFetch<{ data: unknown[] }>("/api/schedules");
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "run_schedule",
  {
    title: "Trigger a scheduled task manually",
    description:
      "Run a scheduled AIOS task immediately (bypassing its timer). The task runs in the background — this call returns immediately.",
    inputSchema: {
      name: z
        .string()
        .describe(
          "The timer unit name (e.g. 'data-quality-check.timer')"
        ),
    },
  },
  async ({ name }) => {
    const result = await daemonFetch<{ data: unknown }>(
      `/api/schedules/${encodeURIComponent(name)}/run`,
      { method: "POST" }
    );
    return formatJsonResult(result.data);
  }
);

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

server.registerTool(
  "list_jobs",
  {
    title: "List background jobs",
    description:
      "List recent background jobs (cron-triggered agent runs) with their status, duration, cost, and exit code.",
    inputSchema: {
      status: z
        .enum(["queued", "running", "completed", "failed", "cancelled"])
        .optional()
        .describe("Filter by status"),
      limit: z.number().int().positive().default(20),
    },
  },
  async ({ status, limit }) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("limit", String(limit));
    const result = await daemonFetch<{ data: unknown[] }>(
      `/api/jobs?${params.toString()}`
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "get_job_logs",
  {
    title: "Get logs of a completed job",
    description:
      "Retrieve the log output of a finished job from disk. Useful to inspect what an agent did.",
    inputSchema: {
      jobId: z.string().describe("The job ID"),
    },
  },
  async ({ jobId }) => {
    const result = await daemonFetch<{ data: { lines: string[] } }>(
      `/api/jobs/${jobId}/logs`
    );
    return {
      content: [
        {
          type: "text" as const,
          text: result.data.lines.join("\n") || "(empty log)",
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Company Brain
// ---------------------------------------------------------------------------

server.registerTool(
  "get_company_brain_summary",
  {
    title: "Get Company Brain summary",
    description:
      "List the current AIOS Company Brain kernel: sources, artifacts, priorities, goals, work items, workflow blueprints/runs, gates and unlinked work.",
    inputSchema: {},
  },
  async () => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/summary"
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "create_company_brain_source",
  {
    title: "Register Company Brain source",
    description:
      "Register a real source with area, source type, owner, visibility and external reference.",
    inputSchema: {
      name: z.string().min(1),
      sourceType: z
        .enum([
          "local_doc",
          "github_issue",
          "github_repo",
          "git",
          "slack",
          "meeting",
          "manual",
          "runtime",
          "other",
        ])
        .default("manual"),
      area: z
        .enum([
          "strategy",
          "development",
          "operations",
          "product",
          "marketing",
          "sales",
          "finance",
          "people",
          "customer",
          "platform",
          "unknown",
        ])
        .default("unknown"),
      externalRef: z.string().optional(),
      owner: z.string().optional(),
      visibility: z.enum(["internal", "restricted", "public"]).default("internal"),
    },
  },
  async ({ name, sourceType, area, externalRef, owner, visibility }) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/sources",
      {
        method: "POST",
        body: JSON.stringify({
          name,
          sourceType,
          area,
          externalRef,
          owner,
          ownerType: owner ? "human" : "unknown",
          visibility,
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "create_company_brain_artifact",
  {
    title: "Register Company Brain artifact",
    description:
      "Register normalized evidence with source, raw reference, title, summary, visibility and provenance.",
    inputSchema: {
      sourceId: z.string().min(1),
      title: z.string().min(1),
      rawRef: z.string().min(1),
      summary: z.string().optional(),
      artifactType: z.string().default("manual"),
      area: z
        .enum([
          "strategy",
          "development",
          "operations",
          "product",
          "marketing",
          "sales",
          "finance",
          "people",
          "customer",
          "platform",
          "unknown",
        ])
        .default("unknown"),
      author: z.string().optional(),
      visibility: z.enum(["internal", "restricted", "public"]).default("internal"),
    },
  },
  async ({ sourceId, title, rawRef, summary, artifactType, area, author, visibility }) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/artifacts",
      {
        method: "POST",
        body: JSON.stringify({
          sourceId,
          title,
          rawRef,
          summary,
          artifactType,
          area,
          author,
          visibility,
          humanReviewStatus: "approved",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "create_company_brain_work_item",
  {
    title: "Register Company Brain work item",
    description:
      "Register a canonical AIOS work item, optionally linked to priority/goal and an external ticket URL. Missing priority/goal remains visible as unlinked.",
    inputSchema: {
      title: z.string().min(1),
      area: z
        .enum([
          "strategy",
          "development",
          "operations",
          "product",
          "marketing",
          "sales",
          "finance",
          "people",
          "customer",
          "platform",
          "unknown",
        ])
        .default("unknown"),
      owner: z.string().optional(),
      status: z
        .enum([
          "new",
          "triage",
          "planned",
          "in_progress",
          "review",
          "qa",
          "security_review",
          "ready_to_deploy",
          "deployed",
          "monitoring",
          "done",
          "blocked",
          "needs_human",
          "reopened",
          "cancelled",
          "rolled_back",
        ])
        .default("new"),
      priorityId: z.string().optional(),
      goalId: z.string().optional(),
      externalProvider: z.string().optional(),
      externalId: z.string().optional(),
      externalUrl: z.string().optional(),
      riskClass: z.enum(["A", "B", "C", "unknown"]).default("unknown"),
      sourceId: z.string().optional(),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/work-items",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          ownerType: input.owner ? "human" : "unknown",
          visibility: "internal",
          labels: ["mcp"],
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "create_company_brain_workflow_run",
  {
    title: "Register Company Brain workflow run",
    description:
      "Create a workflow run from a blueprint. For Development Blueprint v0 this materializes all steps and initial gate state.",
    inputSchema: {
      blueprintId: z.string().default("development-blueprint-v0"),
      title: z.string().min(1),
      workItemId: z.string().optional(),
      owner: z.string().optional(),
      status: z
        .enum([
          "planned",
          "running",
          "blocked",
          "needs_human",
          "completed",
          "cancelled",
          "rolled_back",
        ])
        .default("running"),
      gateStatus: z
        .enum(["not_started", "pending", "passed", "failed", "waived", "blocked"])
        .default("pending"),
      slaStatus: z.enum(["on_track", "at_risk", "breached", "not_set"]).default("on_track"),
    },
  },
  async ({ blueprintId, title, workItemId, owner, status, gateStatus, slaStatus }) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/workflow-runs",
      {
        method: "POST",
        body: JSON.stringify({
          blueprintId,
          title,
          workItemId,
          owner,
          ownerType: owner ? "human" : "unknown",
          status,
          gateStatus,
          slaStatus,
          visibility: "internal",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[aios-mcp] Connected to daemon at ${DAEMON_URL}`);
}

main().catch((err) => {
  console.error("[aios-mcp] Fatal error:", err);
  process.exit(1);
});
