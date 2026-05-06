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
      "List the current AIOS Company Brain kernel: sources, artifacts, decisions, signals, alignment findings, guidance, agent contexts, priorities, goals, work items, workflow runs, gates and unlinked work.",
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
