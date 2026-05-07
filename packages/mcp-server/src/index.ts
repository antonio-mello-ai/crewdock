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
      "List the current AIOS Company Brain kernel: latest briefing, review cohesion queue, sources, source health, artifacts, extractors, decisions, strategy tradeoffs, signals, alignment findings, guidance, agent contexts, improvement proposals, adoption dashboard, priorities, goals, work items, workflow runs, gates and unlinked work.",
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
  "get_company_brain_review_cohesion",
  {
    title: "Get Company Brain review cohesion queue",
    description:
      "Return the unified observe-only review queue for Decision, Signal, AlignmentFinding and Guidance candidates, including next actions and provenance.",
    inputSchema: {},
  },
  async () => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/review-cohesion"
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "get_company_brain_briefing",
  {
    title: "Get latest Company Brain briefing",
    description:
      "Return the latest AIOS Briefing watcher artifact snapshot, including structured sections, next steps, provenance and gap signal ids.",
    inputSchema: {},
  },
  async () => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/briefing"
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "get_company_brain_adoption_dashboard",
  {
    title: "Get Company Brain adoption dashboard",
    description:
      "Show AIOS adoption by source/project, including closed-loop stage, unlinked work, pending gates, SLA risk, source health gaps and open guidance.",
    inputSchema: {},
  },
  async () => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/adoption-dashboard"
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "get_company_brain_source_health",
  {
    title: "Get Company Brain source health",
    description:
      "Show per-source freshness, last sync, sync errors, artifact/work/signal volume, watcher activity and source health issue kinds.",
    inputSchema: {},
  },
  async () => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/source-health"
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "get_company_brain_writeback_safety_dashboard",
  {
    title: "Get Company Brain writeback safety dashboard",
    description:
      "Show read-only writeback audit review: completed GitHub/Slack writes, approved-ready proposals, failures, rejections, blocks and duplicate avoidance.",
    inputSchema: {},
  },
  async () => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/writeback-safety-dashboard"
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "get_company_brain_evidence_graph",
  {
    title: "Get Company Brain evidence graph",
    description:
      "Read-only provenance graph linking sources, artifacts, signals, findings, guidance, work items, workflow runs, writeback proposals and targets. Does not execute or mutate external systems.",
    inputSchema: {
      rootKind: z
        .enum([
          "source",
          "artifact",
          "priority",
          "goal",
          "work_item",
          "workflow_run",
          "signal",
          "alignment_finding",
          "guidance_item",
          "external_action_proposal",
          "writeback_target",
        ])
        .optional(),
      rootId: z.string().optional(),
      limit: z.number().int().min(1).max(500).optional(),
    },
  },
  async ({ rootKind, rootId, limit }) => {
    const params = new URLSearchParams();
    if (rootKind) params.set("rootKind", rootKind);
    if (rootId) params.set("rootId", rootId);
    if (limit) params.set("limit", String(limit));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/evidence-graph${suffix}`
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "get_company_brain_timeline",
  {
    title: "Get Company Brain timeline",
    description:
      "Read-only timeline for Company Brain events by all activity, proposal, writeback target or source. Includes proposal audit, preview, execution, evidence and provenance events without mutating external systems.",
    inputSchema: {
      scope: z.enum(["all", "proposal", "target", "source"]).optional(),
      id: z.string().optional(),
      limit: z.number().int().min(1).max(500).optional(),
    },
  },
  async ({ scope, id, limit }) => {
    const params = new URLSearchParams();
    if (scope) params.set("scope", scope);
    if (id) params.set("id", id);
    if (limit) params.set("limit", String(limit));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/timeline${suffix}`
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "get_company_brain_saved_audit_views",
  {
    title: "Get Company Brain saved audit views",
    description:
      "Read-only derived saved views for audit trail, proposal/target review, evidence graph and timeline filters. Does not persist filters or mutate external systems.",
    inputSchema: {},
  },
  async () => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/saved-audit-views"
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "run_felhen_demo_v0_1",
  {
    title: "Run Felhen Demo v0.1",
    description:
      "Create or refresh the internal Felhen Demo v0.1 closed-loop dataset: strategy, goal, evidence, work item, workflow run, signal, finding, guidance and improvement proposal. No external writeback.",
    inputSchema: {
      owner: z.string().optional(),
      visibility: z.enum(["internal", "restricted", "public"]).default("internal"),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/demo/felhen-v0-1",
      {
        method: "POST",
        body: JSON.stringify(input),
      }
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
  "import_company_brain_local_docs",
  {
    title: "Import local docs into Company Brain",
    description:
      "Read local markdown/text files and import them as Company Brain artifacts with hash, raw_ref, provenance and a local_doc source. Read-only importer; no external writeback.",
    inputSchema: {
      paths: z.array(z.string().min(1)).min(1),
      sourceId: z.string().optional(),
      sourceName: z.string().optional(),
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
        .default("platform"),
      owner: z.string().optional(),
      artifactType: z.string().default("local_doc"),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/importers/local-docs",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          visibility: "internal",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "import_company_brain_slack_messages",
  {
    title: "Import Slack messages into Company Brain",
    description:
      "Manually import Slack message excerpts as read-only Company Brain artifacts with Slack metadata, raw_ref, hash and provenance. Does not post or mutate Slack.",
    inputSchema: {
      messages: z.array(
        z.object({
          text: z.string().min(1),
          permalink: z.string().optional(),
          channelId: z.string().optional(),
          channelName: z.string().optional(),
          user: z.string().optional(),
          ts: z.string().optional(),
          threadTs: z.string().optional(),
          occurredAt: z.number().int().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        })
      ).min(1),
      sourceId: z.string().optional(),
      sourceName: z.string().optional(),
      workspaceName: z.string().optional(),
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
        .default("operations"),
      owner: z.string().optional(),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/importers/slack-messages",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          visibility: "internal",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "sync_company_brain_slack_channel",
  {
    title: "Sync Slack channel into Company Brain",
    description:
      "Read recent and incremental Slack channel messages, optionally including thread replies, using SLACK_BOT_TOKEN and import them as read-only Company Brain artifacts with provenance. Does not post or mutate Slack.",
    inputSchema: {
      channelId: z.string().optional(),
      channelName: z.string().optional(),
      sourceId: z.string().optional(),
      sourceName: z.string().optional(),
      workspaceName: z.string().optional(),
      limit: z.number().int().positive().max(200).default(25),
      oldest: z.string().optional(),
      latest: z.string().optional(),
      incremental: z.boolean().default(true),
      includeThreads: z.boolean().default(true),
      threadLimit: z.number().int().min(0).max(50).default(10),
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
        .default("operations"),
      owner: z.string().optional(),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/adapters/slack/channel/sync",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          visibility: "internal",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "sync_company_brain_github_issues",
  {
    title: "Sync GitHub Issues into Company Brain",
    description:
      "Read GitHub Issues from a repository and normalize them into a Company Brain Source, Artifacts and optional internal WorkItems with provenance. Read-only adapter; no GitHub writeback.",
    inputSchema: {
      repo: z.string().min(1).describe("GitHub repository as owner/name or github.com URL"),
      state: z.enum(["open", "closed", "all"]).default("open"),
      limit: z.number().int().positive().max(100).default(25),
      sourceId: z.string().optional(),
      sourceName: z.string().optional(),
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
        .default("development"),
      owner: z.string().optional(),
      createWorkItems: z.boolean().default(true),
      priorityId: z.string().optional(),
      goalId: z.string().optional(),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/adapters/github/issues/sync",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          visibility: "internal",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "sync_company_brain_github_pr_ci",
  {
    title: "Sync GitHub PR/CI into Company Brain",
    description:
      "Read GitHub pull requests plus commit statuses/check-runs into Company Brain as observe-only watcher artifacts and optional AutoImprove signals. Does not write back to GitHub.",
    inputSchema: {
      repo: z.string().min(1).describe("GitHub repository as owner/name or github.com URL"),
      state: z.enum(["open", "closed", "all"]).default("open"),
      limit: z.number().int().positive().max(100).default(25),
      sourceId: z.string().optional(),
      sourceName: z.string().optional(),
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
        .default("development"),
      owner: z.string().optional(),
      createSignals: z.boolean().default(true),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/adapters/github/pr-ci/sync",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          visibility: "internal",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "sync_company_brain_github_notifications",
  {
    title: "Sync GitHub notifications into Company Brain",
    description:
      "Read authenticated GitHub notifications into Company Brain as observe-only watcher artifacts and optional unread signals. Does not mark notifications read or write back to GitHub.",
    inputSchema: {
      all: z.boolean().default(false),
      participating: z.boolean().default(false),
      limit: z.number().int().positive().max(100).default(25),
      sourceId: z.string().optional(),
      sourceName: z.string().optional(),
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
        .default("development"),
      owner: z.string().optional(),
      createSignals: z.boolean().default(true),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/adapters/github/notifications/sync",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          visibility: "internal",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "create_company_brain_decision",
  {
    title: "Register Company Brain decision",
    description:
      "Register a decision with rationale, owner, source artifacts, priorities, status, visibility and provenance.",
    inputSchema: {
      title: z.string().min(1),
      summary: z.string().optional(),
      rationale: z.string().optional(),
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
        .default("strategy"),
      owner: z.string().optional(),
      status: z
        .enum(["proposed", "accepted", "superseded", "rejected", "archived"])
        .default("proposed"),
      sourceArtifactIds: z.array(z.string()).default([]),
      priorityIds: z.array(z.string()).default([]),
      goalIds: z.array(z.string()).default([]),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/decisions",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          ownerType: input.owner ? "human" : "unknown",
          decidedAt: Date.now(),
          visibility: "internal",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "update_company_brain_decision",
  {
    title: "Update Company Brain decision",
    description:
      "Review or update a Company Brain decision candidate by changing status, rationale, links and review provenance. Does not write externally.",
    inputSchema: {
      id: z.string().min(1),
      status: z
        .enum(["proposed", "accepted", "superseded", "rejected", "archived"])
        .optional(),
      title: z.string().optional(),
      summary: z.string().optional(),
      rationale: z.string().optional(),
      owner: z.string().optional(),
      decidedAt: z.number().int().optional(),
      priorityIds: z.array(z.string()).optional(),
      goalIds: z.array(z.string()).optional(),
      reviewNote: z.string().optional(),
    },
  },
  async (input) => {
    const { id, ...body } = input;
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/decisions/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "extract_company_brain_artifact_insights",
  {
    title: "Extract Company Brain artifact insights",
    description:
      "Create internal Decision and/or Signal candidates from an existing artifact with pending human review and provenance. Does not approve decisions or write externally.",
    inputSchema: {
      artifactId: z.string().min(1),
      mode: z.enum(["decision", "signal", "both"]).default("both"),
      priorityId: z.string().optional(),
      goalId: z.string().optional(),
      workItemId: z.string().optional(),
      owner: z.string().optional(),
      signalSeverity: z.enum(["info", "warn", "critical"]).default("info"),
      signalSource: z
        .enum(["feedback", "telemetry", "transcript", "error", "support", "qa"])
        .optional(),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/extractors/artifact-insights",
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "create_company_brain_strategy_tradeoff",
  {
    title: "Register Company Brain strategy tradeoff",
    description:
      "Register a strategic tradeoff, constraint, non-goal, risk, dependency or principle linked to priority, decision and source artifacts with provenance.",
    inputSchema: {
      title: z.string().min(1),
      summary: z.string().optional(),
      rationale: z.string().optional(),
      kind: z
        .enum(["tradeoff", "constraint", "non_goal", "risk", "dependency", "principle"])
        .default("tradeoff"),
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
        .default("strategy"),
      owner: z.string().optional(),
      status: z
        .enum(["proposed", "accepted", "superseded", "rejected", "archived"])
        .default("proposed"),
      priorityId: z.string().optional(),
      decisionId: z.string().optional(),
      sourceArtifactIds: z.array(z.string()).default([]),
      acceptedOption: z.string().optional(),
      rejectedOptions: z.array(z.string()).default([]),
      constraints: z.array(z.string()).default([]),
      riskClass: z.enum(["A", "B", "C", "unknown"]).default("unknown"),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/strategy-tradeoffs",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          ownerType: input.owner ? "human" : "unknown",
          visibility: "internal",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "create_company_brain_signal",
  {
    title: "Register Company Brain signal",
    description:
      "Register a normalized AutoImprove Signal envelope linked to source/artifact/work item provenance.",
    inputSchema: {
      source: z
        .enum(["feedback", "telemetry", "transcript", "error", "support", "qa"])
        .default("qa"),
      scope: z.enum(["tenant", "vertical", "core"]).default("core"),
      entityType: z
        .enum(["user", "school", "teacher", "flow", "screen", "job"])
        .default("job"),
      entityId: z.string().min(1),
      summary: z.string().min(1),
      rawRef: z.string().min(1),
      severity: z.enum(["info", "warn", "critical"]).default("info"),
      confidence: z.number().min(0).max(1).default(1),
      tags: z.array(z.string()).default([]),
      sourceId: z.string().optional(),
      artifactId: z.string().optional(),
      workItemId: z.string().optional(),
      workflowRunId: z.string().optional(),
      watcherId: z.string().optional(),
      watcherRunId: z.string().optional(),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/signals",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          visibility: "internal",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "extract_company_brain_signal_guidance",
  {
    title: "Extract Company Brain signal guidance",
    description:
      "Create an AlignmentFinding and GuidanceItem candidate from an existing Signal with provenance and pending review. Does not write externally.",
    inputSchema: {
      signalId: z.string().min(1),
      priorityId: z.string().optional(),
      goalId: z.string().optional(),
      workItemId: z.string().optional(),
      workflowRunId: z.string().optional(),
      classification: z
        .enum(["aligned", "weak", "drift", "contradiction", "unknown"])
        .optional(),
      audience: z.enum(["human", "team", "agent", "system"]).default("human"),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/extractors/signal-guidance",
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "create_company_brain_alignment_finding",
  {
    title: "Register Company Brain alignment finding",
    description:
      "Classify evidence or a work item against a priority/goal as aligned, weak, drift, contradiction, or unknown.",
    inputSchema: {
      classification: z
        .enum(["aligned", "weak", "drift", "contradiction", "unknown"])
        .default("unknown"),
      rationale: z.string().min(1),
      priorityId: z.string().optional(),
      goalId: z.string().optional(),
      artifactIds: z.array(z.string()).default([]),
      signalIds: z.array(z.string()).default([]),
      workItemId: z.string().optional(),
      workflowRunId: z.string().optional(),
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
      confidence: z.number().min(0).max(1).default(1),
      suggestedAction: z.string().optional(),
      severity: z.enum(["info", "warn", "critical"]).default("info"),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/alignment-findings",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          visibility: "internal",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "create_company_brain_guidance_item",
  {
    title: "Register Company Brain guidance item",
    description:
      "Create a recommended next action generated from a signal/finding with status and feedback status.",
    inputSchema: {
      title: z.string().min(1),
      action: z.string().min(1),
      audience: z.enum(["human", "team", "agent", "system"]).default("human"),
      priorityId: z.string().optional(),
      goalId: z.string().optional(),
      findingId: z.string().optional(),
      signalId: z.string().optional(),
      workItemId: z.string().optional(),
      workflowRunId: z.string().optional(),
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
      severity: z.enum(["info", "warn", "critical"]).default("info"),
      status: z
        .enum(["new", "open", "accepted", "rejected", "done", "ignored"])
        .default("open"),
      feedbackStatus: z
        .enum(["pending", "accepted", "rejected", "ignored", "completed"])
        .default("pending"),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/guidance-items",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          visibility: "internal",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "create_company_brain_agent_context",
  {
    title: "Register Company Brain agent context",
    description:
      "Register executable context for an agent, including source knowledge IDs, content, status, validation status and provenance.",
    inputSchema: {
      title: z.string().min(1),
      targetAgent: z.string().min(1),
      contextType: z
        .enum(["spec", "prompt", "playbook", "constraints", "briefing"])
        .default("briefing"),
      content: z.string().min(1),
      sourceKnowledgeIds: z.array(z.string()).default([]),
      sourceArtifactIds: z.array(z.string()).default([]),
      decisionIds: z.array(z.string()).default([]),
      guidanceItemIds: z.array(z.string()).default([]),
      workItemIds: z.array(z.string()).default([]),
      priorityIds: z.array(z.string()).default([]),
      goalIds: z.array(z.string()).default([]),
      status: z.enum(["draft", "ready", "active", "archived"]).default("draft"),
      validationStatus: z
        .enum(["unvalidated", "validated", "rejected", "needs_review"])
        .default("unvalidated"),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/agent-contexts",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          contentFormat: "markdown",
          visibility: "internal",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "generate_company_brain_agent_context",
  {
    title: "Generate Company Brain agent context",
    description:
      "Generate a markdown AgentContext from selected Company Brain priorities, goals, decisions, guidance, work items and artifacts without running the agent.",
    inputSchema: {
      title: z.string().optional(),
      targetAgent: z.string().min(1),
      contextType: z
        .enum(["spec", "prompt", "playbook", "constraints", "briefing"])
        .default("briefing"),
      sourceArtifactIds: z.array(z.string()).default([]),
      decisionIds: z.array(z.string()).default([]),
      guidanceItemIds: z.array(z.string()).default([]),
      workItemIds: z.array(z.string()).default([]),
      priorityIds: z.array(z.string()).default([]),
      goalIds: z.array(z.string()).default([]),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/agent-contexts/generate",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          visibility: "internal",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "update_company_brain_guidance_item",
  {
    title: "Update Company Brain guidance feedback",
    description:
      "Update GuidanceItem status, feedback status, feedback note, action, due date, severity, or audience without external writeback.",
    inputSchema: {
      id: z.string().min(1),
      status: z
        .enum(["new", "open", "accepted", "rejected", "done", "ignored"])
        .optional(),
      feedbackStatus: z
        .enum(["pending", "accepted", "rejected", "ignored", "completed"])
        .optional(),
      feedbackNote: z.string().optional(),
      action: z.string().optional(),
      dueAt: z.number().int().optional(),
      severity: z.enum(["info", "warn", "critical"]).optional(),
      audience: z.enum(["human", "team", "agent", "system"]).optional(),
    },
  },
  async ({ id, ...body }) => {
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/guidance-items/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "list_company_brain_external_action_proposals",
  {
    title: "List Company Brain writeback proposals",
    description:
      "List the internal writeback governance queue. This is read-only and does not execute Slack or GitHub writeback.",
    inputSchema: {
      approvalStatus: z
        .enum(["pending", "approved", "rejected", "blocked"])
        .optional(),
    },
  },
  async ({ approvalStatus }) => {
    const params = new URLSearchParams();
    if (approvalStatus) params.set("approvalStatus", approvalStatus);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const result = await daemonFetch<{ data: unknown[] }>(
      `/api/company-brain/external-action-proposals${suffix}`
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "create_company_brain_external_action_proposal",
  {
    title: "Create Company Brain writeback proposal",
    description:
      "Create an internal ExternalActionProposal from accepted GuidanceItem. This queues policy/audit state only and does not mutate Slack, GitHub, or any external system.",
    inputSchema: {
      guidanceItemId: z.string().min(1),
      title: z.string().optional(),
      rationale: z.string().optional(),
      destinationType: z
        .enum(["github", "slack", "internal", "unknown"])
        .default("github"),
      destinationRef: z.string().optional(),
      actionType: z
        .enum([
          "comment",
          "github_comment",
          "label",
          "github_label",
          "github_status",
          "github_check",
          "thread_reply",
          "slack_thread_reply",
          "draft",
          "unknown",
        ])
        .default("comment"),
      payload: z.record(z.string(), z.unknown()).optional(),
      riskClass: z.enum(["A", "B", "C", "unknown"]).default("B"),
      actionPolicy: z
        .enum([
          "observe_only",
          "create_artifacts",
          "create_work_items",
          "request_human",
          "writeback_allowed",
        ])
        .default("request_human"),
      requestedBy: z.string().optional(),
      idempotencyKey: z.string().optional(),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/external-action-proposals/from-guidance",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          visibility: "internal",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "review_company_brain_external_action_proposal",
  {
    title: "Review Company Brain writeback proposal",
    description:
      "Approve or reject an internal writeback proposal with an actor and rationale. Approval records HITL state; adapter-specific execute tools still enforce preview, risk, policy and idempotency gates.",
    inputSchema: {
      id: z.string().min(1),
      approvalStatus: z.enum(["approved", "rejected"]),
      actor: z.string().min(1),
      rejectionReason: z.string().optional(),
      note: z.string().optional(),
    },
  },
  async ({ id, ...body }) => {
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/external-action-proposals/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "preview_company_brain_github_comment_writeback",
  {
    title: "Preview GitHub comment writeback",
    description:
      "Dry-run an approved Company Brain GitHub comment proposal. Returns the exact issue/PR comment body and target without calling GitHub.",
    inputSchema: {
      id: z.string().min(1),
      actor: z.string().optional(),
    },
  },
  async ({ id, actor }) => {
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/external-action-proposals/${id}/github-comment/preview`,
      {
        method: "POST",
        body: JSON.stringify({ actor }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "list_company_brain_writeback_audit_trail",
  {
    title: "List Company Brain writeback audit trail",
    description:
      "Read-only export of ExternalActionProposal audit events, optionally filtered by adapter, proposal, guidance, destination, action, risk, execution status, event, actor, date range or search text. Does not execute or mutate external systems.",
    inputSchema: {
      adapter: z
        .enum([
          "github_comment",
          "github_label",
          "github_status_check",
          "slack_thread_reply",
          "other",
        ])
        .optional(),
      proposalId: z.string().optional(),
      guidanceItemId: z.string().optional(),
      destinationType: z.enum(["github", "slack", "internal", "unknown"]).optional(),
      actionType: z
        .enum([
          "comment",
          "github_comment",
          "label",
          "github_label",
          "github_status",
          "github_check",
          "thread_reply",
          "slack_thread_reply",
          "draft",
          "unknown",
        ])
        .optional(),
      riskClass: z.enum(["A", "B", "C", "unknown"]).optional(),
      executionStatus: z
        .enum([
          "not_started",
          "blocked",
          "dry_run",
          "queued",
          "completed",
          "executed",
          "failed",
          "cancelled",
        ])
        .optional(),
      event: z.string().optional(),
      actor: z.string().optional(),
      fromAt: z.number().optional(),
      toAt: z.number().optional(),
      idempotencyKey: z.string().optional(),
      externalUrl: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().int().min(1).max(250).optional(),
    },
  },
  async ({
    adapter,
    proposalId,
    guidanceItemId,
    destinationType,
    actionType,
    riskClass,
    executionStatus,
    event,
    actor,
    fromAt,
    toAt,
    idempotencyKey,
    externalUrl,
    search,
    limit,
  }) => {
    const params = new URLSearchParams();
    if (adapter) params.set("adapter", adapter);
    if (proposalId) params.set("proposalId", proposalId);
    if (guidanceItemId) params.set("guidanceItemId", guidanceItemId);
    if (destinationType) params.set("destinationType", destinationType);
    if (actionType) params.set("actionType", actionType);
    if (riskClass) params.set("riskClass", riskClass);
    if (executionStatus) params.set("executionStatus", executionStatus);
    if (event) params.set("event", event);
    if (actor) params.set("actor", actor);
    if (fromAt) params.set("fromAt", String(fromAt));
    if (toAt) params.set("toAt", String(toAt));
    if (idempotencyKey) params.set("idempotencyKey", idempotencyKey);
    if (externalUrl) params.set("externalUrl", externalUrl);
    if (search) params.set("search", search);
    if (limit) params.set("limit", String(limit));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/external-action-proposals/audit-trail${suffix}`
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "get_company_brain_writeback_evidence_packet",
  {
    title: "Get Company Brain writeback evidence packet",
    description:
      "Read-only packet for one ExternalActionProposal, including guidance, signal/finding/work/workflow links, approval, preview, execution review, audit trail, payload hashes and external refs. Does not execute or mutate external systems.",
    inputSchema: {
      id: z.string().min(1),
    },
  },
  async ({ id }) => {
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/external-action-proposals/${id}/evidence-packet`
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "list_company_brain_writeback_proposal_target_review",
  {
    title: "List Company Brain writeback proposal target review",
    description:
      "Read-only proposal/target review for ExternalActionProposal items, including target rollup, safety review, hash/ref comparisons, audit events and evidence completeness. Does not execute or mutate external systems.",
    inputSchema: {
      proposalId: z.string().optional(),
      targetKey: z.string().optional(),
      destinationType: z.enum(["github", "slack", "internal", "unknown"]).optional(),
      actionType: z
        .enum([
          "comment",
          "github_comment",
          "label",
          "github_label",
          "github_status",
          "github_check",
          "thread_reply",
          "slack_thread_reply",
          "draft",
          "unknown",
        ])
        .optional(),
      riskClass: z.enum(["A", "B", "C", "unknown"]).optional(),
      reviewStatus: z
        .enum([
          "ready_to_execute",
          "needs_preview",
          "needs_reapproval",
          "retryable_failed",
          "unsafe_failed",
          "payload_mismatch",
          "destination_mismatch",
          "duplicate_prevented",
          "completed",
          "blocked",
        ])
        .optional(),
      limit: z.number().int().min(1).max(250).optional(),
    },
  },
  async ({
    proposalId,
    targetKey,
    destinationType,
    actionType,
    riskClass,
    reviewStatus,
    limit,
  }) => {
    const params = new URLSearchParams();
    if (proposalId) params.set("proposalId", proposalId);
    if (targetKey) params.set("targetKey", targetKey);
    if (destinationType) params.set("destinationType", destinationType);
    if (actionType) params.set("actionType", actionType);
    if (riskClass) params.set("riskClass", riskClass);
    if (reviewStatus) params.set("reviewStatus", reviewStatus);
    if (limit) params.set("limit", String(limit));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/external-action-proposals/proposal-target-review${suffix}`
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "list_company_brain_writeback_evidence_integrity_gaps",
  {
    title: "List Company Brain writeback evidence integrity gaps",
    description:
      "Read-only list of ExternalActionProposal evidence integrity gaps, filterable by severity, gap type, adapter or proposal. Does not execute or mutate external systems.",
    inputSchema: {
      severity: z.enum(["info", "warn", "critical"]).optional(),
      kind: z
        .enum([
          "missing_guidance_link",
          "missing_signal_or_finding_link",
          "missing_work_item_or_workflow_link",
          "missing_approval_event",
          "missing_preview_event",
          "missing_execution_event",
          "missing_payload_hash",
          "missing_idempotency_key",
          "missing_external_ref_after_completed",
          "stale_preview",
          "stale_approval",
          "insufficient_rationale",
          "incomplete_provenance",
        ])
        .optional(),
      adapter: z
        .enum([
          "github_comment",
          "github_label",
          "github_status_check",
          "slack_thread_reply",
          "other",
        ])
        .optional(),
      proposalId: z.string().optional(),
      limit: z.number().int().min(1).max(250).optional(),
    },
  },
  async ({ severity, kind, adapter, proposalId, limit }) => {
    const params = new URLSearchParams();
    if (severity) params.set("severity", severity);
    if (kind) params.set("kind", kind);
    if (adapter) params.set("adapter", adapter);
    if (proposalId) params.set("proposalId", proposalId);
    if (limit) params.set("limit", String(limit));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/external-action-proposals/evidence-integrity-gaps${suffix}`
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "list_company_brain_writeback_evidence_remediation_suggestions",
  {
    title: "List Company Brain writeback evidence remediation suggestions",
    description:
      "Read-only suggestions for repairing ExternalActionProposal evidence integrity gaps. Shows what should be relinked, reapproved, repreviewed, or recreated without executing or mutating external systems.",
    inputSchema: {
      severity: z.enum(["info", "warn", "critical"]).optional(),
      gapKind: z
        .enum([
          "missing_guidance_link",
          "missing_signal_or_finding_link",
          "missing_work_item_or_workflow_link",
          "missing_approval_event",
          "missing_preview_event",
          "missing_execution_event",
          "missing_payload_hash",
          "missing_idempotency_key",
          "missing_external_ref_after_completed",
          "stale_preview",
          "stale_approval",
          "insufficient_rationale",
          "incomplete_provenance",
        ])
        .optional(),
      actionKind: z
        .enum([
          "relink_guidance",
          "link_signal_or_finding",
          "link_work_or_workflow",
          "rerun_hitl_approval",
          "rerun_preview",
          "review_execution_audit",
          "capture_payload_hash",
          "create_new_proposal_with_idempotency",
          "attach_external_ref",
          "refresh_stale_review",
          "capture_human_rationale",
          "repair_provenance",
        ])
        .optional(),
      adapter: z
        .enum([
          "github_comment",
          "github_label",
          "github_status_check",
          "slack_thread_reply",
          "other",
        ])
        .optional(),
      proposalId: z.string().optional(),
      limit: z.number().int().min(1).max(250).optional(),
    },
  },
  async ({ severity, gapKind, actionKind, adapter, proposalId, limit }) => {
    const params = new URLSearchParams();
    if (severity) params.set("severity", severity);
    if (gapKind) params.set("gapKind", gapKind);
    if (actionKind) params.set("actionKind", actionKind);
    if (adapter) params.set("adapter", adapter);
    if (proposalId) params.set("proposalId", proposalId);
    if (limit) params.set("limit", String(limit));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/external-action-proposals/evidence-remediation-suggestions${suffix}`
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "execute_company_brain_github_comment_writeback",
  {
    title: "Execute GitHub comment writeback",
    description:
      "Post a GitHub issue/PR comment for an approved Risk B Company Brain proposal with action_policy=writeback_allowed, matching payload/destination/idempotency review, and a prior preview after approval. Failed retries require retryRationale. This does not label, assign, close, merge, deploy, or mark notifications read.",
    inputSchema: {
      id: z.string().min(1),
      actor: z.string().optional(),
      retryRationale: z.string().optional(),
    },
  },
  async ({ id, actor, retryRationale }) => {
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/external-action-proposals/${id}/github-comment/execute`,
      {
        method: "POST",
        body: JSON.stringify({ actor, retryRationale }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "preview_company_brain_github_label_proposal",
  {
    title: "Preview GitHub label proposal",
    description:
      "Dry-run a GitHub label ExternalActionProposal. Returns target, label mode, labels and execution-blocked state without calling GitHub write APIs.",
    inputSchema: {
      id: z.string().min(1),
      actor: z.string().optional(),
    },
  },
  async ({ id, actor }) => {
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/external-action-proposals/${id}/github-label/preview`,
      {
        method: "POST",
        body: JSON.stringify({ actor }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "execute_company_brain_github_label_writeback",
  {
    title: "Execute GitHub label writeback",
    description:
      "Apply one approved allowlisted GitHub label add for a Risk B Company Brain proposal with action_policy=writeback_allowed, prior preview after approval, HITL actor/rationale, idempotency and Retry Safety review. The executor reads current labels first and completes as noop when the approved label already exists. It does not remove/set/create labels, assign, close, merge, deploy, status/check, or mark notifications read.",
    inputSchema: {
      id: z.string().min(1),
      actor: z.string().min(1),
      retryRationale: z.string().optional(),
    },
  },
  async ({ id, actor, retryRationale }) => {
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/external-action-proposals/${id}/github-label/execute`,
      {
        method: "POST",
        body: JSON.stringify({ actor, retryRationale }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "preview_company_brain_github_status_check_proposal",
  {
    title: "Preview GitHub status/check proposal",
    description:
      "Dry-run a GitHub status or check ExternalActionProposal. Commit status proposals can become executable only for approved allowlisted private repo targets; check-run proposals remain preview-only.",
    inputSchema: {
      id: z.string().min(1),
      actor: z.string().optional(),
    },
  },
  async ({ id, actor }) => {
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/external-action-proposals/${id}/github-status-check/preview`,
      {
        method: "POST",
        body: JSON.stringify({ actor }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "execute_company_brain_github_status_writeback",
  {
    title: "Execute GitHub status writeback",
    description:
      "Execute an approved Company Brain GitHub commit status proposal after preview, Retry Safety, explicit SHA, private repo allowlist and idempotency gates. Does not create check-runs.",
    inputSchema: {
      id: z.string().min(1),
      actor: z.string().min(1),
      retryRationale: z.string().optional(),
    },
  },
  async ({ id, actor, retryRationale }) => {
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/external-action-proposals/${id}/github-status-check/execute`,
      {
        method: "POST",
        body: JSON.stringify({ actor, retryRationale }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "preview_company_brain_slack_thread_reply_writeback",
  {
    title: "Preview Slack thread reply writeback",
    description:
      "Dry-run an approved Company Brain Slack thread reply proposal. Returns the exact reply body and channel/thread target without calling Slack write APIs.",
    inputSchema: {
      id: z.string().min(1),
      actor: z.string().optional(),
    },
  },
  async ({ id, actor }) => {
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/external-action-proposals/${id}/slack-thread-reply/preview`,
      {
        method: "POST",
        body: JSON.stringify({ actor }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "execute_company_brain_slack_thread_reply_writeback",
  {
    title: "Execute Slack thread reply writeback",
    description:
      "Post a Slack reply only inside an existing thread for an approved Risk B Company Brain proposal with action_policy=writeback_allowed, matching payload/destination/idempotency review, and a prior preview after approval. Failed retries require retryRationale. This does not post top-level messages, DMs, edits, deletes, reactions, pins, invites, topic changes, renames, or GitHub actions.",
    inputSchema: {
      id: z.string().min(1),
      actor: z.string().optional(),
      retryRationale: z.string().optional(),
    },
  },
  async ({ id, actor, retryRationale }) => {
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/external-action-proposals/${id}/slack-thread-reply/execute`,
      {
        method: "POST",
        body: JSON.stringify({ actor, retryRationale }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "create_improvement_proposal",
  {
    title: "Create Company Brain improvement proposal",
    description:
      "Create an AutoImprove proposal from signals, findings, guidance, agent context or artifacts. This records a proposal only; it does not apply or promote changes externally.",
    inputSchema: {
      title: z.string().min(1),
      hypothesis: z.string().min(1),
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
      signalIds: z.array(z.string()).default([]),
      alignmentFindingIds: z.array(z.string()).default([]),
      guidanceItemIds: z.array(z.string()).default([]),
      agentContextIds: z.array(z.string()).default([]),
      sourceArtifactIds: z.array(z.string()).default([]),
      workItemIds: z.array(z.string()).default([]),
      priorityIds: z.array(z.string()).default([]),
      goalIds: z.array(z.string()).default([]),
      changeClass: z.enum(["A", "B", "C", "unknown"]).default("unknown"),
      patchRef: z.string().optional(),
      validationPlan: z.string().optional(),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/improvement-proposals",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          ownerType: input.owner ? "human" : "unknown",
          status: "proposed",
          promotionStatus: "not_ready",
          visibility: "internal",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "review_improvement_proposal",
  {
    title: "Review Company Brain improvement proposal",
    description:
      "Update proposal validation, impact review and promotion status internally. This does not perform external promotion or apply patches.",
    inputSchema: {
      id: z.string().min(1),
      patchRef: z.string().optional(),
      validationPlan: z.string().optional(),
      impactReview: z.string().optional(),
      status: z
        .enum([
          "proposed",
          "in_validation",
          "validated",
          "rejected",
          "promoted",
          "archived",
        ])
        .optional(),
      promotionStatus: z
        .enum(["not_ready", "candidate", "approved", "rejected", "promoted"])
        .optional(),
    },
  },
  async ({ id, ...body }) => {
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/improvement-proposals/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
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

server.registerTool(
  "create_company_brain_watcher",
  {
    title: "Register Company Brain watcher",
    description:
      "Register a watcher/operating loop with source scope, risk class and action policy. Watchers observe sources and produce Company Brain evidence without requiring an interactive session.",
    inputSchema: {
      title: z.string().min(1),
      description: z.string().optional(),
      sourceIds: z.array(z.string()).default([]),
      triggerType: z
        .enum(["manual", "schedule", "webhook", "polling", "event"])
        .default("manual"),
      schedule: z.string().optional(),
      eventFilter: z.string().optional(),
      scopeQuery: z.string().optional(),
      owner: z.string().optional(),
      targetWorkflowBlueprintId: z.string().optional(),
      riskClass: z.enum(["A", "B", "C", "unknown"]).default("unknown"),
      actionPolicy: z
        .enum([
          "observe_only",
          "create_artifacts",
          "create_work_items",
          "request_human",
          "writeback_allowed",
        ])
        .default("observe_only"),
    },
  },
  async (input) => {
    const result = await daemonFetch<{ data: unknown }>(
      "/api/company-brain/watchers",
      {
        method: "POST",
        body: JSON.stringify({
          ...input,
          ownerType: input.owner ? "human" : "unknown",
          status: "active",
          failurePolicy: "record_error_no_writeback",
          outputPolicy: "artifact_and_internal_work_item",
          visibility: "internal",
        }),
      }
    );
    return formatJsonResult(result.data);
  }
);

server.registerTool(
  "run_company_brain_watcher",
  {
    title: "Run Company Brain watcher manually",
    description:
      "Run a watcher manually/simulated. The run creates Artifact -> Signal -> AlignmentFinding -> GuidanceItem and can link or create an internal WorkItem under the watcher's action policy.",
    inputSchema: {
      watcherId: z.string().default("watcher-github-issues-manual-v0"),
      sourceId: z.string().optional(),
      rawRef: z.string().optional(),
      title: z.string().optional(),
      summary: z.string().optional(),
      workItemId: z.string().optional(),
      workflowRunId: z.string().optional(),
      createWorkItem: z.boolean().default(false),
      workItemTitle: z.string().optional(),
      externalUrl: z.string().optional(),
      priorityId: z.string().optional(),
      goalId: z.string().optional(),
      signalSource: z
        .enum(["feedback", "telemetry", "transcript", "error", "support", "qa"])
        .default("qa"),
      signalScope: z.enum(["tenant", "vertical", "core"]).default("core"),
      signalEntityType: z
        .enum(["user", "school", "teacher", "flow", "screen", "job"])
        .default("job"),
      signalEntityId: z.string().optional(),
      signalSeverity: z.enum(["info", "warn", "critical"]).default("warn"),
      signalTags: z.array(z.string()).default([]),
      guidanceAudience: z.enum(["human", "team", "agent", "system"]).optional(),
      guidanceAction: z.string().optional(),
      guidanceDueAt: z.number().int().optional(),
    },
  },
  async ({ watcherId, ...body }) => {
    const result = await daemonFetch<{ data: unknown }>(
      `/api/company-brain/watchers/${watcherId}/run`,
      {
        method: "POST",
        body: JSON.stringify(body),
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
