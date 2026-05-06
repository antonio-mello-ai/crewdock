import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type {
  AlignmentClassification,
  CompanyBrainAdoptionDashboard,
  CompanyBrainSourceHealthReport,
  CreateAgentContextRequest,
  CreateArtifactRequest,
  CreateAlignmentFindingRequest,
  CreateDecisionRequest,
  CreateGoalRequest,
  CreateGuidanceItemRequest,
  CreateImprovementProposalRequest,
  CreateMilestoneRequest,
  CreateSignalRequest,
  CreateSourceRequest,
  CreateStrategicPriorityRequest,
  CreateWatcherRequest,
  CreateWorkflowBlueprintRequest,
  CreateWorkflowRunRequest,
  CreateWorkItemRequest,
  GuidanceAudience,
  GenerateAgentContextRequest,
  ImportLocalDocsRequest,
  ImportSlackMessagesRequest,
  SignalSeverity,
  RunWatcherRequest,
  SyncGitHubIssuesRequest,
  UpdateGuidanceItemRequest,
  UpdateImprovementProposalRequest,
  WorkflowBlueprintStage,
} from "@aios/shared";
import { getDb } from "../db/client.js";
import { config } from "../config.js";
import {
  cbAgentContexts,
  cbAlignmentFindings,
  cbArtifactLinks,
  cbArtifacts,
  cbDecisions,
  cbGoals,
  cbGuidanceItems,
  cbImprovementProposals,
  cbMilestones,
  cbSignals,
  cbSources,
  cbStrategicPriorities,
  cbWatcherRuns,
  cbWatchers,
  cbWorkflowBlueprints,
  cbWorkflowRuns,
  cbWorkflowSteps,
  cbWorkItems,
} from "../db/schema.js";

const app = new Hono();

function now() {
  return Date.now();
}

function stableHash(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function allowedLocalDocRoots() {
  const envRoots = process.env.AIOS_LOCAL_DOC_IMPORT_ROOTS?.split(",") ?? [];
  return [
    ...envRoots,
    config.projectsDir,
    process.cwd(),
    resolve(process.cwd(), "../../.."),
  ]
    .map((root) => root.trim())
    .filter(Boolean)
    .map((root) => resolve(root));
}

function resolveImportPath(inputPath: string) {
  const absolutePath = resolve(inputPath);
  const allowedRoot = allowedLocalDocRoots().find((root) => {
    const rel = relative(root, absolutePath);
    return rel === "" || (!!rel && !rel.startsWith("..") && !rel.startsWith("/"));
  });
  if (!allowedRoot) {
    throw new Error(`path is outside allowed import roots: ${inputPath}`);
  }
  if (!existsSync(absolutePath)) {
    throw new Error(`path not found: ${inputPath}`);
  }
  const stat = statSync(absolutePath);
  if (!stat.isFile()) {
    throw new Error(`path is not a file: ${inputPath}`);
  }
  if (!/\.(md|mdx|txt)$/i.test(absolutePath)) {
    throw new Error(`unsupported file type: ${inputPath}`);
  }
  return { absolutePath, allowedRoot, stat };
}

function summarizeDoc(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join(" ")
    .replaceAll(/[#*_`]/g, "")
    .slice(0, 500);
}

function parseSlackTimestamp(ts: string | null | undefined) {
  if (!ts) return null;
  const [seconds, fraction = "0"] = ts.split(".");
  const secondsNumber = Number(seconds);
  if (!Number.isFinite(secondsNumber)) return null;
  const fractionMs = Number(fraction.padEnd(3, "0").slice(0, 3));
  return secondsNumber * 1000 + (Number.isFinite(fractionMs) ? fractionMs : 0);
}

function summarizeSlackText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 500);
}

interface GitHubIssuePayload {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  url: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  labels: Array<{ name: string }>;
  user: { login: string } | null;
  pull_request?: unknown;
}

function parseGitHubRepo(repo: string) {
  const normalized = repo
    .trim()
    .replace(/^https:\/\/github.com\//, "")
    .replace(/\/issues\/?$/, "")
    .replace(/\.git$/, "");
  const [owner, name] = normalized.split("/");
  if (!owner || !name) {
    throw new Error("repo must be owner/name or a github.com repository URL");
  }
  return { owner, name, fullName: `${owner}/${name}` };
}

async function fetchGitHubIssues(repo: string, state: string, limit: number) {
  const parsed = parseGitHubRepo(repo);
  const token = process.env.GITHUB_TOKEN;
  const url = new URL(
    `https://api.github.com/repos/${parsed.owner}/${parsed.name}/issues`
  );
  url.searchParams.set("state", state);
  url.searchParams.set("per_page", String(Math.max(1, Math.min(limit, 100))));
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "aios-runtime-company-brain",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub issues fetch failed ${res.status}: ${text.slice(0, 300)}`);
  }
  const issues = (await res.json()) as GitHubIssuePayload[];
  return {
    repo: parsed,
    issues: issues.filter((issue) => !issue.pull_request),
  };
}

function requireText(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function severityFromRisk(riskClass: string): SignalSeverity {
  if (riskClass === "C") return "critical";
  if (riskClass === "B") return "warn";
  return "info";
}

function classifyAlignment(args: {
  priorityId: string | null;
  goalId: string | null;
  hasWorkItem: boolean;
}): {
  classification: AlignmentClassification;
  rationale: string;
  suggestedAction: string;
  confidence: number;
} {
  if (args.priorityId && args.goalId) {
    return {
      classification: "aligned",
      rationale:
        "Signal evidence is linked to a WorkItem with explicit priority and goal.",
      suggestedAction:
        "Continue execution through the linked workflow and keep attaching evidence to the goal.",
      confidence: 0.9,
    };
  }
  if (args.priorityId || args.goalId) {
    return {
      classification: "weak",
      rationale:
        "Signal evidence has a partial strategy link, but priority and goal are not both present.",
      suggestedAction:
        "Complete the missing priority or goal link before the work advances past triage.",
      confidence: 0.72,
    };
  }
  return {
    classification: "unknown",
    rationale: args.hasWorkItem
      ? "WorkItem exists but is not linked to a priority or goal."
      : "Evidence exists but no WorkItem, priority or goal link is present.",
    suggestedAction:
      "Triage this signal and link it to a priority/goal or explicitly keep it unlinked.",
    confidence: 0.64,
  };
}

function defaultGuidanceAudience(
  classification: AlignmentClassification
): GuidanceAudience {
  return classification === "aligned" ? "agent" : "human";
}

function bullet(title: string, body: string | null | undefined) {
  return `- ${title}${body ? `: ${body}` : ""}`;
}

function buildAgentContextContent(args: {
  title: string;
  targetAgent: string;
  contextType: string;
  priorities: Array<{ title: string; status: string; successCriteria: string | null }>;
  goals: Array<{ title: string; status: string; dueAt: number | null; reviewCadence: string | null }>;
  decisions: Array<{ title: string; status: string; rationale: string | null }>;
  guidanceItems: Array<{ title: string; action: string; status: string; feedbackStatus: string }>;
  workItems: Array<{ title: string; status: string; externalUrl: string | null }>;
  artifacts: Array<{ title: string; rawRef: string; summary: string | null }>;
}) {
  const lines = [
    `# ${args.title}`,
    "",
    `Target agent: ${args.targetAgent}`,
    `Context type: ${args.contextType}`,
    "",
    "## Operating Constraints",
    "- Use the linked Company Brain records as source of truth.",
    "- Do not perform external writeback unless a policy/gate explicitly allows it.",
    "- Preserve provenance in any generated output.",
  ];

  if (args.priorities.length) {
    lines.push("", "## Priorities");
    for (const priority of args.priorities) {
      lines.push(
        bullet(
          `${priority.title} (${priority.status})`,
          priority.successCriteria
        )
      );
    }
  }
  if (args.goals.length) {
    lines.push("", "## Goals");
    for (const goal of args.goals) {
      const due = goal.dueAt ? new Date(goal.dueAt).toISOString().slice(0, 10) : "no due date";
      lines.push(
        bullet(
          `${goal.title} (${goal.status})`,
          `due ${due}; cadence ${goal.reviewCadence ?? "not set"}`
        )
      );
    }
  }
  if (args.decisions.length) {
    lines.push("", "## Decisions");
    for (const decision of args.decisions) {
      lines.push(bullet(`${decision.title} (${decision.status})`, decision.rationale));
    }
  }
  if (args.guidanceItems.length) {
    lines.push("", "## Guidance");
    for (const item of args.guidanceItems) {
      lines.push(
        bullet(
          `${item.title} (${item.status}/${item.feedbackStatus})`,
          item.action
        )
      );
    }
  }
  if (args.workItems.length) {
    lines.push("", "## Work Items");
    for (const item of args.workItems) {
      lines.push(bullet(`${item.title} (${item.status})`, item.externalUrl));
    }
  }
  if (args.artifacts.length) {
    lines.push("", "## Source Evidence");
    for (const artifact of args.artifacts) {
      lines.push(bullet(`${artifact.title} [${artifact.rawRef}]`, artifact.summary));
    }
  }

  return `${lines.join("\n")}\n`;
}

function listAll() {
  const db = getDb();
  const sources = db.select().from(cbSources).orderBy(desc(cbSources.updatedAt)).all();
  const artifacts = db
    .select()
    .from(cbArtifacts)
    .orderBy(desc(cbArtifacts.ingestedAt))
    .limit(100)
    .all();
  const priorities = db
    .select()
    .from(cbStrategicPriorities)
    .orderBy(desc(cbStrategicPriorities.updatedAt))
    .all();
  const goals = db.select().from(cbGoals).orderBy(desc(cbGoals.updatedAt)).all();
  const milestones = db
    .select()
    .from(cbMilestones)
    .orderBy(desc(cbMilestones.updatedAt))
    .all();
  const decisions = db
    .select()
    .from(cbDecisions)
    .orderBy(desc(cbDecisions.updatedAt))
    .limit(100)
    .all();
  const workItems = db
    .select()
    .from(cbWorkItems)
    .orderBy(desc(cbWorkItems.updatedAt))
    .limit(100)
    .all();
  const workflowBlueprints = db
    .select()
    .from(cbWorkflowBlueprints)
    .orderBy(desc(cbWorkflowBlueprints.updatedAt))
    .all();
  const workflowRuns = db
    .select()
    .from(cbWorkflowRuns)
    .orderBy(desc(cbWorkflowRuns.updatedAt))
    .limit(100)
    .all();
  const workflowSteps = db
    .select()
    .from(cbWorkflowSteps)
    .orderBy(desc(cbWorkflowSteps.position))
    .limit(300)
    .all();
  const artifactLinks = db
    .select()
    .from(cbArtifactLinks)
    .orderBy(desc(cbArtifactLinks.createdAt))
    .limit(200)
    .all();
  const watchers = db.select().from(cbWatchers).orderBy(desc(cbWatchers.updatedAt)).all();
  const watcherRuns = db
    .select()
    .from(cbWatcherRuns)
    .orderBy(desc(cbWatcherRuns.startedAt))
    .limit(100)
    .all();
  const signals = db
    .select()
    .from(cbSignals)
    .orderBy(desc(cbSignals.timestamp))
    .limit(100)
    .all();
  const alignmentFindings = db
    .select()
    .from(cbAlignmentFindings)
    .orderBy(desc(cbAlignmentFindings.updatedAt))
    .limit(100)
    .all();
  const guidanceItems = db
    .select()
    .from(cbGuidanceItems)
    .orderBy(desc(cbGuidanceItems.updatedAt))
    .limit(100)
    .all();
  const agentContexts = db
    .select()
    .from(cbAgentContexts)
    .orderBy(desc(cbAgentContexts.updatedAt))
    .limit(100)
    .all();
  const improvementProposals = db
    .select()
    .from(cbImprovementProposals)
    .orderBy(desc(cbImprovementProposals.updatedAt))
    .limit(100)
    .all();

  return {
    sources,
    artifacts,
    priorities,
    goals,
    milestones,
    decisions,
    workItems,
    workflowBlueprints,
    workflowRuns,
    workflowSteps,
    artifactLinks,
    watchers,
    watcherRuns,
    signals,
    alignmentFindings,
    guidanceItems,
    agentContexts,
    improvementProposals,
  };
}

function latestTimestamp(values: Array<number | null | undefined>) {
  const valid = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );
  if (!valid.length) return null;
  return Math.max(...valid);
}

function buildAdoptionDashboard(
  data: ReturnType<typeof listAll>
): CompanyBrainAdoptionDashboard {
  type AdoptionGap = CompanyBrainAdoptionDashboard["gaps"][number];
  type AdoptionGapKind = AdoptionGap["kind"];
  type AdoptionProject = CompanyBrainAdoptionDashboard["projects"][number];

  const generatedAt = now();
  const staleAfterMs = 7 * 24 * 60 * 60 * 1000;
  const gaps: AdoptionGap[] = [];
  const workItemById = new Map(data.workItems.map((item) => [item.id, item]));

  const addGap = (gap: AdoptionGap) => {
    if (!gaps.some((item) => item.id === gap.id)) gaps.push(gap);
  };

  const projects: AdoptionProject[] = data.sources.map((source) => {
    const artifacts = data.artifacts.filter((artifact) => artifact.sourceId === source.id);
    const artifactIds = new Set(artifacts.map((artifact) => artifact.id));
    const workItems = data.workItems.filter(
      (item) =>
        item.sourceId === source.id ||
        (item.artifactId ? artifactIds.has(item.artifactId) : false)
    );
    const workItemIds = new Set(workItems.map((item) => item.id));
    const workflowRuns = data.workflowRuns.filter(
      (run) => run.workItemId !== null && workItemIds.has(run.workItemId)
    );
    const workflowRunIds = new Set(workflowRuns.map((run) => run.id));
    const signals = data.signals.filter(
      (signal) =>
        signal.sourceId === source.id ||
        (signal.artifactId ? artifactIds.has(signal.artifactId) : false) ||
        (signal.workItemId ? workItemIds.has(signal.workItemId) : false) ||
        (signal.workflowRunId ? workflowRunIds.has(signal.workflowRunId) : false)
    );
    const signalIds = new Set(signals.map((signal) => signal.id));
    const findings = data.alignmentFindings.filter(
      (finding) =>
        finding.signalIds.some((id) => signalIds.has(id)) ||
        finding.artifactIds.some((id) => artifactIds.has(id)) ||
        (finding.workItemId ? workItemIds.has(finding.workItemId) : false) ||
        (finding.workflowRunId ? workflowRunIds.has(finding.workflowRunId) : false)
    );
    const findingIds = new Set(findings.map((finding) => finding.id));
    const guidance = data.guidanceItems.filter(
      (item) =>
        (item.signalId ? signalIds.has(item.signalId) : false) ||
        (item.findingId ? findingIds.has(item.findingId) : false) ||
        (item.workItemId ? workItemIds.has(item.workItemId) : false) ||
        (item.workflowRunId ? workflowRunIds.has(item.workflowRunId) : false)
    );
    const guidanceIds = new Set(guidance.map((item) => item.id));
    const proposals = data.improvementProposals.filter(
      (proposal) =>
        proposal.sourceArtifactIds.some((id) => artifactIds.has(id)) ||
        proposal.workItemIds.some((id) => workItemIds.has(id)) ||
        proposal.signalIds.some((id) => signalIds.has(id)) ||
        proposal.alignmentFindingIds.some((id) => findingIds.has(id)) ||
        proposal.guidanceItemIds.some((id) => guidanceIds.has(id))
    );
    const openGuidance = guidance.filter((item) => ["new", "open"].includes(item.status));
    const activeWorkflowRuns = workflowRuns.filter((run) =>
      ["planned", "running", "blocked", "needs_human"].includes(run.status)
    );
    const gateBlocked = workflowRuns.filter((run) =>
      ["pending", "blocked", "failed"].includes(run.gateStatus)
    );
    const slaAtRisk = workflowRuns.filter((run) =>
      ["at_risk", "breached"].includes(run.slaStatus)
    );
    const unlinkedWorkItems = workItems.filter((item) => !item.priorityId && !item.goalId);
    const sourceIsStale =
      !source.lastSyncAt || generatedAt - source.lastSyncAt > staleAfterMs;
    const sourceHasHealthIssue = source.healthStatus !== "healthy" || sourceIsStale;
    const gapKinds = new Set<AdoptionGapKind>();

    if (sourceHasHealthIssue) {
      gapKinds.add("source_unhealthy");
      addGap({
        id: `source_unhealthy:${source.id}`,
        kind: "source_unhealthy",
        title: `${source.name} source health needs review`,
        severity: source.healthStatus === "error" ? "critical" : "warn",
        area: source.area,
        sourceId: source.id,
        targetType: "source",
        targetId: source.id,
        rationale:
          source.syncError ??
          (source.lastSyncAt ? "Source freshness window exceeded." : "Source never synced."),
      });
    }

    if (!artifacts.length) {
      gapKinds.add("source_without_artifacts");
      addGap({
        id: `source_without_artifacts:${source.id}`,
        kind: "source_without_artifacts",
        title: `${source.name} has no artifacts`,
        severity: "warn",
        area: source.area,
        sourceId: source.id,
        targetType: "source",
        targetId: source.id,
        rationale: "Closed loop adoption needs evidence artifacts for this source.",
      });
    }

    if (workItems.length && !workflowRuns.length) {
      gapKinds.add("missing_workflow");
      addGap({
        id: `missing_workflow:${source.id}`,
        kind: "missing_workflow",
        title: `${source.name} has work without workflow runs`,
        severity: "warn",
        area: source.area,
        sourceId: source.id,
        targetType: "source",
        targetId: source.id,
        rationale: "Closed loop adoption needs workflow runs for linked work.",
      });
    }
    if (workflowRuns.length && !signals.length) {
      gapKinds.add("missing_signal");
      addGap({
        id: `missing_signal:${source.id}`,
        kind: "missing_signal",
        title: `${source.name} has workflows without signals`,
        severity: "warn",
        area: source.area,
        sourceId: source.id,
        targetType: "source",
        targetId: source.id,
        rationale: "Closed loop adoption needs signals from workflow evidence.",
      });
    }
    if (unlinkedWorkItems.length) gapKinds.add("unlinked_work_item");
    if (gateBlocked.length) gapKinds.add("pending_gate");
    if (slaAtRisk.length) gapKinds.add("sla_risk");
    if (openGuidance.length) gapKinds.add("open_guidance");

    let stage: AdoptionProject["stage"] = "source_registered";
    if (artifacts.length) stage = "evidence_only";
    if (workItems.length) stage = "work_linked";
    if (workflowRuns.length) stage = activeWorkflowRuns.length ? "workflow_running" : "workflow_tracked";
    if (signals.length || guidance.length) stage = "closed_loop";
    if (proposals.length) stage = "improving";

    return {
      id: source.id,
      title: source.name,
      area: source.area,
      owner: source.owner,
      sourceType: source.sourceType,
      healthStatus: source.healthStatus,
      stage,
      lastActivityAt: latestTimestamp([
        source.lastSyncAt,
        source.updatedAt,
        ...artifacts.map((artifact) => artifact.ingestedAt),
        ...workItems.map((item) => item.updatedAt),
        ...workflowRuns.map((run) => run.updatedAt),
        ...signals.map((signal) => signal.timestamp),
        ...guidance.map((item) => item.updatedAt),
        ...proposals.map((proposal) => proposal.updatedAt),
      ]),
      sourceIds: [source.id],
      metrics: {
        artifactCount: artifacts.length,
        workItemCount: workItems.length,
        unlinkedWorkItemCount: unlinkedWorkItems.length,
        workflowRunCount: workflowRuns.length,
        activeWorkflowRunCount: activeWorkflowRuns.length,
        signalCount: signals.length,
        openGuidanceCount: openGuidance.length,
        improvementProposalCount: proposals.length,
        gateBlockedCount: gateBlocked.length,
        slaAtRiskCount: slaAtRisk.length,
      },
      gapKinds: [...gapKinds],
    };
  });

  for (const item of data.workItems) {
    if (!item.priorityId && !item.goalId) {
      addGap({
        id: `unlinked_work_item:${item.id}`,
        kind: "unlinked_work_item",
        title: item.title,
        severity: "warn",
        area: item.area,
        sourceId: item.sourceId,
        targetType: "work_item",
        targetId: item.id,
        rationale: "Work item has no priority or goal link.",
      });
    }
  }

  for (const run of data.workflowRuns) {
    if (["pending", "blocked", "failed"].includes(run.gateStatus)) {
      const workItem = run.workItemId ? workItemById.get(run.workItemId) : undefined;
      addGap({
        id: `pending_gate:${run.id}`,
        kind: "pending_gate",
        title: run.title,
        severity: run.gateStatus === "failed" || run.gateStatus === "blocked" ? "critical" : "warn",
        area: run.workflowArea,
        sourceId: workItem?.sourceId ?? null,
        targetType: "workflow_run",
        targetId: run.id,
        rationale: `Workflow gate is ${run.gateStatus}.`,
      });
    }
    if (["at_risk", "breached"].includes(run.slaStatus)) {
      const workItem = run.workItemId ? workItemById.get(run.workItemId) : undefined;
      addGap({
        id: `sla_risk:workflow_run:${run.id}`,
        kind: "sla_risk",
        title: run.title,
        severity: run.slaStatus === "breached" ? "critical" : "warn",
        area: run.workflowArea,
        sourceId: workItem?.sourceId ?? null,
        targetType: "workflow_run",
        targetId: run.id,
        rationale: `Workflow SLA is ${run.slaStatus}.`,
      });
    }
  }

  for (const goal of data.goals) {
    if (["at_risk", "breached"].includes(goal.slaStatus)) {
      addGap({
        id: `sla_risk:goal:${goal.id}`,
        kind: "sla_risk",
        title: goal.title,
        severity: goal.slaStatus === "breached" ? "critical" : "warn",
        area: goal.area,
        sourceId: null,
        targetType: "goal",
        targetId: goal.id,
        rationale: `Goal SLA is ${goal.slaStatus}.`,
      });
    }
  }

  for (const item of data.guidanceItems) {
    if (["new", "open"].includes(item.status)) {
      addGap({
        id: `open_guidance:${item.id}`,
        kind: "open_guidance",
        title: item.title,
        severity: item.severity,
        area: item.area,
        sourceId: null,
        targetType: "guidance_item",
        targetId: item.id,
        rationale: "Guidance is still open and needs feedback or completion.",
      });
    }
  }

  projects.sort((a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0));

  return {
    generatedAt,
    projects,
    gaps,
    stats: {
      projectCount: projects.length,
      closedLoopProjectCount: projects.filter((project) =>
        ["closed_loop", "improving"].includes(project.stage)
      ).length,
      improvingProjectCount: projects.filter((project) => project.stage === "improving")
        .length,
      sourceHealthIssueCount: gaps.filter((gap) => gap.kind === "source_unhealthy")
        .length,
      unlinkedWorkItemCount: gaps.filter((gap) => gap.kind === "unlinked_work_item")
        .length,
      pendingGateCount: gaps.filter((gap) => gap.kind === "pending_gate").length,
      slaRiskCount: gaps.filter((gap) => gap.kind === "sla_risk").length,
      openGuidanceCount: gaps.filter((gap) => gap.kind === "open_guidance").length,
    },
  };
}

function buildSourceHealthReport(
  data: ReturnType<typeof listAll>
): CompanyBrainSourceHealthReport {
  type SourceHealthIssueKind =
    CompanyBrainSourceHealthReport["sources"][number]["issueKinds"][number];
  type SourceFreshnessStatus =
    CompanyBrainSourceHealthReport["sources"][number]["freshnessStatus"];

  const generatedAt = now();
  const staleAfterMs = 7 * 24 * 60 * 60 * 1000;

  const sources = data.sources.map((source) => {
    const artifacts = data.artifacts.filter((artifact) => artifact.sourceId === source.id);
    const artifactIds = new Set(artifacts.map((artifact) => artifact.id));
    const workItems = data.workItems.filter(
      (item) =>
        item.sourceId === source.id ||
        (item.artifactId ? artifactIds.has(item.artifactId) : false)
    );
    const workItemIds = new Set(workItems.map((item) => item.id));
    const workflowRuns = data.workflowRuns.filter(
      (run) => run.workItemId !== null && workItemIds.has(run.workItemId)
    );
    const workflowRunIds = new Set(workflowRuns.map((run) => run.id));
    const watchers = data.watchers.filter((watcher) =>
      watcher.sourceIds.includes(source.id)
    );
    const watcherIds = new Set(watchers.map((watcher) => watcher.id));
    const watcherRuns = data.watcherRuns.filter((run) =>
      watcherIds.has(run.watcherId)
    );
    const signals = data.signals.filter(
      (signal) =>
        signal.sourceId === source.id ||
        (signal.artifactId ? artifactIds.has(signal.artifactId) : false) ||
        (signal.workItemId ? workItemIds.has(signal.workItemId) : false) ||
        (signal.workflowRunId ? workflowRunIds.has(signal.workflowRunId) : false) ||
        (signal.watcherId ? watcherIds.has(signal.watcherId) : false)
    );
    const signalIds = new Set(signals.map((signal) => signal.id));
    const guidance = data.guidanceItems.filter(
      (item) =>
        (item.signalId ? signalIds.has(item.signalId) : false) ||
        (item.workItemId ? workItemIds.has(item.workItemId) : false) ||
        (item.workflowRunId ? workflowRunIds.has(item.workflowRunId) : false)
    );
    const openGuidance = guidance.filter((item) => ["new", "open"].includes(item.status));
    const issueKinds = new Set<SourceHealthIssueKind>();

    let freshnessStatus: SourceFreshnessStatus = "fresh";
    if (source.syncError || source.healthStatus === "error") {
      freshnessStatus = "error";
      issueKinds.add("sync_error");
    } else if (!source.lastSyncAt) {
      freshnessStatus = "never_synced";
      issueKinds.add("never_synced");
    } else if (generatedAt - source.lastSyncAt > staleAfterMs) {
      freshnessStatus = "stale";
      issueKinds.add("stale");
    } else if (source.healthStatus === "unknown") {
      freshnessStatus = "unknown";
      issueKinds.add("unknown_health");
    }

    if (!artifacts.length) issueKinds.add("no_artifacts");
    if (!workItems.length) issueKinds.add("no_work_items");
    if (!signals.length) issueKinds.add("no_signals");

    return {
      sourceId: source.id,
      title: source.name,
      sourceType: source.sourceType,
      area: source.area,
      owner: source.owner,
      externalRef: source.externalRef,
      healthStatus: source.healthStatus,
      freshnessStatus,
      lastSyncAt: source.lastSyncAt,
      lastArtifactAt: latestTimestamp(artifacts.map((artifact) => artifact.ingestedAt)),
      lastSignalAt: latestTimestamp(signals.map((signal) => signal.timestamp)),
      lastWatcherRunAt: latestTimestamp(
        watcherRuns.map((run) => run.finishedAt ?? run.startedAt)
      ),
      lastActivityAt: latestTimestamp([
        source.lastSyncAt,
        source.updatedAt,
        ...artifacts.map((artifact) => artifact.ingestedAt),
        ...workItems.map((item) => item.updatedAt),
        ...workflowRuns.map((run) => run.updatedAt),
        ...signals.map((signal) => signal.timestamp),
        ...watcherRuns.map((run) => run.finishedAt ?? run.startedAt),
      ]),
      syncError: source.syncError,
      artifactCount: artifacts.length,
      workItemCount: workItems.length,
      workflowRunCount: workflowRuns.length,
      signalCount: signals.length,
      watcherCount: watchers.length,
      watcherRunCount: watcherRuns.length,
      openGuidanceCount: openGuidance.length,
      issueKinds: [...issueKinds],
    };
  });

  sources.sort((a, b) => {
    const issueDelta = b.issueKinds.length - a.issueKinds.length;
    if (issueDelta !== 0) return issueDelta;
    return (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0);
  });

  return {
    generatedAt,
    staleAfterMs,
    sources,
    stats: {
      sourceCount: sources.length,
      healthyCount: sources.filter(
        (source) => source.healthStatus === "healthy" && source.freshnessStatus === "fresh"
      ).length,
      staleCount: sources.filter((source) => source.freshnessStatus === "stale").length,
      errorCount: sources.filter((source) => source.freshnessStatus === "error").length,
      unknownCount: sources.filter((source) => source.freshnessStatus === "unknown").length,
      neverSyncedCount: sources.filter((source) => source.freshnessStatus === "never_synced")
        .length,
      sourceWithoutArtifactsCount: sources.filter((source) =>
        source.issueKinds.includes("no_artifacts")
      ).length,
      sourceWithoutWorkItemsCount: sources.filter((source) =>
        source.issueKinds.includes("no_work_items")
      ).length,
      sourceWithoutSignalsCount: sources.filter((source) =>
        source.issueKinds.includes("no_signals")
      ).length,
    },
  };
}

app.get("/summary", (c) => {
  const data = listAll();
  const adoptionDashboard = buildAdoptionDashboard(data);
  const sourceHealthReport = buildSourceHealthReport(data);
  const unlinkedWorkItemCount = data.workItems.filter(
    (item) => !item.priorityId && !item.goalId
  ).length;
  const activeWorkflowRunCount = data.workflowRuns.filter((run) =>
    ["planned", "running", "blocked", "needs_human"].includes(run.status)
  ).length;
  const gateBlockedCount = data.workflowRuns.filter(
    (run) => run.gateStatus === "blocked" || run.gateStatus === "failed"
  ).length;
  const slaAtRiskCount =
    data.goals.filter((goal) => goal.slaStatus === "at_risk" || goal.slaStatus === "breached")
      .length +
    data.workflowRuns.filter(
      (run) => run.slaStatus === "at_risk" || run.slaStatus === "breached"
    ).length;
  const watcherErrorCount =
    data.watchers.filter((watcher) => watcher.status === "error").length +
    data.watcherRuns.filter((run) => run.status === "failed").length;
  const driftFindingCount = data.alignmentFindings.filter((finding) =>
    ["drift", "contradiction"].includes(finding.classification)
  ).length;
  const openGuidanceCount = data.guidanceItems.filter((item) =>
    ["new", "open"].includes(item.status)
  ).length;

  return c.json({
    data: {
      ...data,
      adoptionDashboard,
      sourceHealthReport,
      stats: {
        sourceCount: data.sources.length,
        artifactCount: data.artifacts.length,
        priorityCount: data.priorities.length,
        goalCount: data.goals.length,
        decisionCount: data.decisions.length,
        activeDecisionCount: data.decisions.filter((decision) =>
          ["proposed", "accepted"].includes(decision.status)
        ).length,
        workItemCount: data.workItems.length,
        unlinkedWorkItemCount,
        activeWorkflowRunCount,
        gateBlockedCount,
        slaAtRiskCount,
        watcherCount: data.watchers.length,
        activeWatcherCount: data.watchers.filter((watcher) => watcher.status === "active")
          .length,
        watcherRunCount: data.watcherRuns.length,
        watcherErrorCount,
        signalCount: data.signals.length,
        alignmentFindingCount: data.alignmentFindings.length,
        driftFindingCount,
        guidanceItemCount: data.guidanceItems.length,
        openGuidanceCount,
        agentContextCount: data.agentContexts.length,
        readyAgentContextCount: data.agentContexts.filter((context) =>
          ["ready", "active"].includes(context.status)
        ).length,
        improvementProposalCount: data.improvementProposals.length,
        promotionCandidateCount: data.improvementProposals.filter((proposal) =>
          ["candidate", "approved"].includes(proposal.promotionStatus)
        ).length,
      },
    },
  });
});

app.get("/adoption-dashboard", (c) => {
  const data = buildAdoptionDashboard(listAll());
  return c.json({ data });
});

app.get("/source-health", (c) => {
  const data = buildSourceHealthReport(listAll());
  return c.json({ data });
});

app.get("/sources", (c) => {
  const data = getDb().select().from(cbSources).orderBy(desc(cbSources.updatedAt)).all();
  return c.json({ data, total: data.length });
});

app.post("/sources", async (c) => {
  try {
    const body = await c.req.json<CreateSourceRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      name: requireText(body.name, "name"),
      sourceType: body.sourceType,
      area: body.area ?? "unknown",
      externalRef: body.externalRef ?? null,
      status: body.status ?? "active",
      healthStatus: body.healthStatus ?? "unknown",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "unknown",
      visibility: body.visibility ?? "internal",
      lastSyncAt: null,
      syncError: null,
      metadata: body.metadata ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbSources).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/artifacts", (c) => {
  const sourceId = c.req.query("sourceId");
  let data = getDb()
    .select()
    .from(cbArtifacts)
    .orderBy(desc(cbArtifacts.ingestedAt))
    .limit(100)
    .all();
  if (sourceId) data = data.filter((artifact) => artifact.sourceId === sourceId);
  return c.json({ data, total: data.length });
});

app.post("/artifacts", async (c) => {
  try {
    const body = await c.req.json<CreateArtifactRequest>();
    const timestamp = now();
    const title = requireText(body.title, "title");
    const rawRef = requireText(body.rawRef, "rawRef");
    const sourceId = requireText(body.sourceId, "sourceId");
    const source = getDb().select().from(cbSources).where(eq(cbSources.id, sourceId)).get();
    if (!source) throw new Error("sourceId not found");

    const row = {
      id: nanoid(12),
      sourceId,
      artifactType: body.artifactType ?? "manual",
      area: body.area ?? source.area,
      title,
      summary: body.summary ?? null,
      contentRef: body.contentRef ?? null,
      rawRef,
      author: body.author ?? null,
      occurredAt: body.occurredAt ?? timestamp,
      ingestedAt: timestamp,
      hash:
        body.hash ??
        stableHash(`${sourceId}:${rawRef}:${title}:${body.summary ?? ""}`),
      visibility: body.visibility ?? source.visibility,
      provenance: body.provenance ?? {
        sourceId,
        rawRef,
        createdFrom: "api",
        confidence: body.confidence ?? 1,
        extractedAt: timestamp,
        humanReviewStatus: body.humanReviewStatus ?? "pending",
        visibility: body.visibility ?? source.visibility,
      },
      humanReviewStatus: body.humanReviewStatus ?? "pending",
      confidence: body.confidence ?? 1,
      metadata: body.metadata ?? null,
    };
    getDb().insert(cbArtifacts).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.post("/importers/local-docs", async (c) => {
  try {
    const body = await c.req.json<ImportLocalDocsRequest>();
    if (!Array.isArray(body.paths) || body.paths.length === 0) {
      throw new Error("paths is required");
    }
    const db = getDb();
    const timestamp = now();
    let source = body.sourceId
      ? db.select().from(cbSources).where(eq(cbSources.id, body.sourceId)).get()
      : null;
    if (body.sourceId && !source) throw new Error("sourceId not found");
    if (!source) {
      source = {
        id: nanoid(12),
        name: body.sourceName ?? "Local docs import",
        sourceType: "local_doc" as const,
        area: body.area ?? "platform",
        externalRef: "local_docs",
        status: "active" as const,
        healthStatus: "unknown" as const,
        owner: body.owner ?? null,
        ownerType: body.owner ? ("human" as const) : ("unknown" as const),
        visibility: body.visibility ?? "internal",
        lastSyncAt: null,
        syncError: null,
        metadata: {
          importer: "local_docs",
          allowedRoots: allowedLocalDocRoots(),
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbSources).values(source).run();
    }

    const artifactsCreated = [];
    for (const inputPath of body.paths) {
      const { absolutePath, allowedRoot, stat } = resolveImportPath(inputPath);
      const content = readFileSync(absolutePath, "utf-8");
      const rawRef = absolutePath;
      const title = basename(absolutePath).replace(/\.(md|mdx|txt)$/i, "");
      const artifact = {
        id: nanoid(12),
        sourceId: source.id,
        artifactType: body.artifactType ?? "local_doc",
        area: body.area ?? source.area,
        title,
        summary: summarizeDoc(content),
        contentRef: absolutePath,
        rawRef,
        author: body.owner ?? source.owner ?? "local_docs_importer",
        occurredAt: stat.mtimeMs,
        ingestedAt: timestamp,
        hash: stableHash(content),
        visibility: body.visibility ?? source.visibility,
        provenance: {
          sourceId: source.id,
          rawRef,
          createdFrom: "importer:local_docs",
          confidence: 1,
          extractedAt: timestamp,
          humanReviewStatus: "pending" as const,
          visibility: body.visibility ?? source.visibility,
          notes: `allowed_root=${allowedRoot}`,
        },
        humanReviewStatus: "pending" as const,
        confidence: 1,
        metadata: {
          importer: "local_docs",
          importPath: absolutePath,
          allowedRoot,
          sizeBytes: stat.size,
          mtimeMs: stat.mtimeMs,
          relativePath: relative(allowedRoot, absolutePath),
        },
      };
      db.insert(cbArtifacts).values(artifact).run();
      artifactsCreated.push(artifact);
    }

    db.update(cbSources)
      .set({
        lastSyncAt: timestamp,
        healthStatus: "healthy",
        syncError: null,
        updatedAt: timestamp,
      })
      .where(eq(cbSources.id, source.id))
      .run();

    return c.json(
      {
        data: {
          source,
          artifactsCreated,
        },
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "import_failed", message }, 400);
  }
});

app.post("/importers/slack-messages", async (c) => {
  try {
    const body = await c.req.json<ImportSlackMessagesRequest>();
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      throw new Error("messages is required");
    }
    const db = getDb();
    const timestamp = now();
    const workspaceName = body.workspaceName?.trim() || "manual_slack_import";
    const externalRef = `slack://${workspaceName}`;
    let source = body.sourceId
      ? db.select().from(cbSources).where(eq(cbSources.id, body.sourceId)).get()
      : null;
    if (body.sourceId && !source) throw new Error("sourceId not found");
    if (!source) {
      source =
        db
          .select()
          .from(cbSources)
          .all()
          .find(
            (item) =>
              item.sourceType === "slack" &&
              (item.externalRef === externalRef || item.name === body.sourceName)
          ) ?? null;
    }
    if (!source) {
      source = {
        id: nanoid(12),
        name: body.sourceName ?? `${workspaceName} Slack import`,
        sourceType: "slack" as const,
        area: body.area ?? "operations",
        externalRef,
        status: "active" as const,
        healthStatus: "unknown" as const,
        owner: body.owner ?? null,
        ownerType: body.owner ? ("human" as const) : ("unknown" as const),
        visibility: body.visibility ?? "internal",
        lastSyncAt: null,
        syncError: null,
        metadata: {
          importer: "slack_messages",
          workspaceName,
          readOnly: true,
          mode: "manual",
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbSources).values(source).run();
    }

    const existingArtifacts = db.select().from(cbArtifacts).all();
    const artifactsCreated = [];
    for (const message of body.messages) {
      const text = requireText(message.text, "message.text");
      const channel = message.channelName ?? message.channelId ?? "unknown_channel";
      const occurredAt = message.occurredAt ?? parseSlackTimestamp(message.ts) ?? timestamp;
      const rawRef =
        message.permalink ??
        `slack://${workspaceName}/${channel}/${message.ts ?? stableHash(text).slice(0, 12)}`;
      if (existingArtifacts.some((artifact) => artifact.rawRef === rawRef)) continue;
      const payload = JSON.stringify({
        workspaceName,
        channelId: message.channelId ?? null,
        channelName: message.channelName ?? null,
        user: message.user ?? null,
        ts: message.ts ?? null,
        threadTs: message.threadTs ?? null,
        text,
      });
      const artifact = {
        id: nanoid(12),
        sourceId: source.id,
        artifactType: "slack_message",
        area: body.area ?? source.area,
        title: `Slack ${channel}: ${summarizeSlackText(text).slice(0, 80)}`,
        summary: summarizeSlackText(text),
        contentRef: message.permalink ?? rawRef,
        rawRef,
        author: message.user ?? source.owner ?? "slack_importer",
        occurredAt,
        ingestedAt: timestamp,
        hash: stableHash(payload),
        visibility: body.visibility ?? source.visibility,
        provenance: {
          sourceId: source.id,
          rawRef,
          createdFrom: "importer:slack_messages",
          confidence: 0.9,
          extractedAt: timestamp,
          humanReviewStatus: "pending" as const,
          visibility: body.visibility ?? source.visibility,
          notes: "read_only=true; mode=manual",
        },
        humanReviewStatus: "pending" as const,
        confidence: 0.9,
        metadata: {
          importer: "slack_messages",
          readOnly: true,
          workspaceName,
          channelId: message.channelId ?? null,
          channelName: message.channelName ?? null,
          user: message.user ?? null,
          ts: message.ts ?? null,
          threadTs: message.threadTs ?? null,
          permalink: message.permalink ?? null,
          ...(message.metadata ?? {}),
        },
      };
      db.insert(cbArtifacts).values(artifact).run();
      existingArtifacts.push(artifact);
      artifactsCreated.push(artifact);
    }

    const updatedSource = {
      ...source,
      lastSyncAt: timestamp,
      healthStatus: "healthy" as const,
      syncError: null,
      updatedAt: timestamp,
    };
    db.update(cbSources)
      .set({
        lastSyncAt: updatedSource.lastSyncAt,
        healthStatus: updatedSource.healthStatus,
        syncError: updatedSource.syncError,
        updatedAt: updatedSource.updatedAt,
      })
      .where(eq(cbSources.id, source.id))
      .run();

    return c.json(
      {
        data: {
          source: updatedSource,
          artifactsCreated,
          messagesSeen: body.messages.length,
        },
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "import_failed", message }, 400);
  }
});

app.post("/adapters/github/issues/sync", async (c) => {
  try {
    const body = await c.req.json<SyncGitHubIssuesRequest>();
    const db = getDb();
    const timestamp = now();
    const { repo, issues } = await fetchGitHubIssues(
      requireText(body.repo, "repo"),
      body.state ?? "open",
      body.limit ?? 25
    );
    let source = body.sourceId
      ? db.select().from(cbSources).where(eq(cbSources.id, body.sourceId)).get()
      : null;
    if (body.sourceId && !source) throw new Error("sourceId not found");
    if (!source) {
      source = {
        id: nanoid(12),
        name: body.sourceName ?? `${repo.fullName} GitHub Issues`,
        sourceType: "github_issue" as const,
        area: body.area ?? "development",
        externalRef: `https://github.com/${repo.fullName}/issues`,
        status: "active" as const,
        healthStatus: "unknown" as const,
        owner: body.owner ?? null,
        ownerType: body.owner ? ("human" as const) : ("unknown" as const),
        visibility: body.visibility ?? "internal",
        lastSyncAt: null,
        syncError: null,
        metadata: {
          adapter: "github_issues",
          repo: repo.fullName,
          readOnly: true,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbSources).values(source).run();
    }

    const existingArtifacts = db.select().from(cbArtifacts).all();
    const existingWorkItems = db.select().from(cbWorkItems).all();
    const artifactsCreated = [];
    const workItemsCreated = [];

    for (const issue of issues) {
      const rawRef = issue.html_url;
      let artifact = existingArtifacts.find((item) => item.rawRef === rawRef);
      if (!artifact) {
        const issuePayload = JSON.stringify({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          body: issue.body,
          labels: issue.labels.map((label) => label.name),
          updated_at: issue.updated_at,
        });
        artifact = {
          id: nanoid(12),
          sourceId: source.id,
          artifactType: "github_issue",
          area: body.area ?? source.area,
          title: `#${issue.number} ${issue.title}`,
          summary: issue.body?.trim().slice(0, 500) ?? null,
          contentRef: issue.url,
          rawRef,
          author: issue.user?.login ?? null,
          occurredAt: Date.parse(issue.updated_at || issue.created_at),
          ingestedAt: timestamp,
          hash: stableHash(issuePayload),
          visibility: body.visibility ?? source.visibility,
          provenance: {
            sourceId: source.id,
            rawRef,
            createdFrom: "adapter:github_issues",
            confidence: 1,
            extractedAt: timestamp,
            humanReviewStatus: "pending" as const,
            visibility: body.visibility ?? source.visibility,
            notes: "read_only=true",
          },
          humanReviewStatus: "pending" as const,
          confidence: 1,
          metadata: {
            adapter: "github_issues",
            readOnly: true,
            repo: repo.fullName,
            githubIssueId: issue.id,
            number: issue.number,
            state: issue.state,
            labels: issue.labels.map((label) => label.name),
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            closedAt: issue.closed_at,
          },
        };
        db.insert(cbArtifacts).values(artifact).run();
        existingArtifacts.push(artifact);
        artifactsCreated.push(artifact);
      }

      if (body.createWorkItems ?? true) {
        const externalId = `${repo.fullName}#${issue.number}`;
        const existing = existingWorkItems.find(
          (item) =>
            item.externalProvider === "github" && item.externalId === externalId
        );
        if (!existing) {
          const workItem = {
            id: nanoid(12),
            title: `#${issue.number} ${issue.title}`,
            description: issue.body?.trim().slice(0, 1000) ?? null,
            area: body.area ?? source.area,
            owner: body.owner ?? null,
            ownerType: body.owner ? ("human" as const) : ("unknown" as const),
            status: issue.state === "closed" ? ("done" as const) : ("triage" as const),
            priorityId: body.priorityId ?? null,
            goalId: body.goalId ?? null,
            milestoneId: null,
            externalProvider: "github",
            externalId,
            externalUrl: rawRef,
            riskClass: "unknown" as const,
            dueAt: null,
            blockedReason: null,
            labels: ["github_issue", ...issue.labels.map((label) => label.name)],
            sourceId: source.id,
            artifactId: artifact.id,
            visibility: body.visibility ?? source.visibility,
            provenance: {
              sourceId: source.id,
              rawRef,
              artifactId: artifact.id,
              createdFrom: "adapter:github_issues:work_item",
              confidence: 1,
              extractedAt: timestamp,
              humanReviewStatus: "pending" as const,
              visibility: body.visibility ?? source.visibility,
              notes: "read_only=true",
            },
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          db.insert(cbWorkItems).values(workItem).run();
          existingWorkItems.push(workItem);
          workItemsCreated.push(workItem);
          db.insert(cbArtifactLinks)
            .values({
              id: nanoid(12),
              artifactId: artifact.id,
              targetType: "work_item",
              targetId: workItem.id,
              relationship: "synced_from_github_issue",
              confidence: 1,
              rationale: "Read-only GitHub Issues adapter created canonical WorkItem.",
              createdAt: timestamp,
            })
            .run();
        }
      }
    }

    const updatedSource = {
      ...source,
      lastSyncAt: timestamp,
      healthStatus: "healthy" as const,
      syncError: null,
      updatedAt: timestamp,
    };
    db.update(cbSources)
      .set({
        lastSyncAt: updatedSource.lastSyncAt,
        healthStatus: updatedSource.healthStatus,
        syncError: updatedSource.syncError,
        updatedAt: updatedSource.updatedAt,
      })
      .where(eq(cbSources.id, source.id))
      .run();

    return c.json(
      {
        data: {
          source: updatedSource,
          artifactsCreated,
          workItemsCreated,
          issuesSeen: issues.length,
        },
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "sync_failed", message }, 400);
  }
});

app.get("/priorities", (c) => {
  const data = getDb()
    .select()
    .from(cbStrategicPriorities)
    .orderBy(desc(cbStrategicPriorities.updatedAt))
    .all();
  return c.json({ data, total: data.length });
});

app.post("/priorities", async (c) => {
  try {
    const body = await c.req.json<CreateStrategicPriorityRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      title: requireText(body.title, "title"),
      description: body.description ?? null,
      area: body.area ?? "strategy",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "human",
      status: body.status ?? "active",
      timeHorizon: body.timeHorizon ?? null,
      reviewCadence: body.reviewCadence ?? null,
      successCriteria: body.successCriteria ?? null,
      visibility: body.visibility ?? "internal",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbStrategicPriorities).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/goals", (c) => {
  const data = getDb().select().from(cbGoals).orderBy(desc(cbGoals.updatedAt)).all();
  return c.json({ data, total: data.length });
});

app.post("/goals", async (c) => {
  try {
    const body = await c.req.json<CreateGoalRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      priorityId: body.priorityId ?? null,
      title: requireText(body.title, "title"),
      description: body.description ?? null,
      area: body.area ?? "strategy",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "human",
      targetMetric: body.targetMetric ?? null,
      targetValue: body.targetValue ?? null,
      currentValue: body.currentValue ?? null,
      dueAt: body.dueAt ?? null,
      reviewCadence: body.reviewCadence ?? null,
      status: body.status ?? "not_started",
      confidence: body.confidence ?? 1,
      slaStatus: body.slaStatus ?? "not_set",
      visibility: body.visibility ?? "internal",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbGoals).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/milestones", (c) => {
  const data = getDb()
    .select()
    .from(cbMilestones)
    .orderBy(desc(cbMilestones.updatedAt))
    .all();
  return c.json({ data, total: data.length });
});

app.post("/milestones", async (c) => {
  try {
    const body = await c.req.json<CreateMilestoneRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      goalId: body.goalId ?? null,
      priorityId: body.priorityId ?? null,
      title: requireText(body.title, "title"),
      area: body.area ?? "strategy",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "human",
      dueAt: body.dueAt ?? null,
      status: body.status ?? "not_started",
      readyCriteria: body.readyCriteria ?? null,
      evidenceRequired: body.evidenceRequired ?? null,
      slaStatus: body.slaStatus ?? "not_set",
      visibility: body.visibility ?? "internal",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbMilestones).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/decisions", (c) => {
  const data = getDb()
    .select()
    .from(cbDecisions)
    .orderBy(desc(cbDecisions.updatedAt))
    .limit(100)
    .all();
  return c.json({ data, total: data.length });
});

app.post("/decisions", async (c) => {
  try {
    const body = await c.req.json<CreateDecisionRequest>();
    const db = getDb();
    const timestamp = now();
    const sourceArtifactIds = body.sourceArtifactIds ?? [];
    for (const artifactId of sourceArtifactIds) {
      const artifact = db
        .select()
        .from(cbArtifacts)
        .where(eq(cbArtifacts.id, artifactId))
        .get();
      if (!artifact) throw new Error(`sourceArtifactIds contains unknown artifact ${artifactId}`);
    }
    const priorityIds = body.priorityIds ?? [];
    for (const priorityId of priorityIds) {
      const priority = db
        .select()
        .from(cbStrategicPriorities)
        .where(eq(cbStrategicPriorities.id, priorityId))
        .get();
      if (!priority) throw new Error(`priorityIds contains unknown priority ${priorityId}`);
    }
    const goalIds = body.goalIds ?? [];
    for (const goalId of goalIds) {
      const goal = db.select().from(cbGoals).where(eq(cbGoals.id, goalId)).get();
      if (!goal) throw new Error(`goalIds contains unknown goal ${goalId}`);
    }
    const row = {
      id: nanoid(12),
      title: requireText(body.title, "title"),
      summary: body.summary ?? null,
      rationale: body.rationale ?? null,
      area: body.area ?? "strategy",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "unknown",
      status: body.status ?? "proposed",
      decidedAt: body.decidedAt ?? null,
      sourceArtifactIds,
      priorityIds,
      goalIds,
      visibility: body.visibility ?? "internal",
      provenance: body.provenance ?? {
        rawRef: sourceArtifactIds[0] ?? priorityIds[0] ?? undefined,
        artifactId: sourceArtifactIds[0],
        createdFrom: "api:decision",
        confidence: 1,
        extractedAt: timestamp,
        humanReviewStatus: "approved",
        visibility: body.visibility ?? "internal",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.insert(cbDecisions).values(row).run();
    for (const artifactId of sourceArtifactIds) {
      db.insert(cbArtifactLinks)
        .values({
          id: nanoid(12),
          artifactId,
          targetType: "decision",
          targetId: row.id,
          relationship: "source_for_decision",
          confidence: 1,
          rationale: "Decision created with this artifact as source evidence.",
          createdAt: timestamp,
        })
        .run();
    }
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/work-items", (c) => {
  const status = c.req.query("status");
  let data = getDb()
    .select()
    .from(cbWorkItems)
    .orderBy(desc(cbWorkItems.updatedAt))
    .limit(100)
    .all();
  if (status === "unlinked") {
    data = data.filter((item) => !item.priorityId && !item.goalId);
  } else if (status) {
    data = data.filter((item) => item.status === status);
  }
  return c.json({ data, total: data.length });
});

app.post("/work-items", async (c) => {
  try {
    const body = await c.req.json<CreateWorkItemRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      title: requireText(body.title, "title"),
      description: body.description ?? null,
      area: body.area ?? "unknown",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "unknown",
      status: body.status ?? "new",
      priorityId: body.priorityId ?? null,
      goalId: body.goalId ?? null,
      milestoneId: body.milestoneId ?? null,
      externalProvider: body.externalProvider ?? null,
      externalId: body.externalId ?? null,
      externalUrl: body.externalUrl ?? null,
      riskClass: body.riskClass ?? "unknown",
      dueAt: body.dueAt ?? null,
      blockedReason: body.blockedReason ?? null,
      labels: body.labels ?? [],
      sourceId: body.sourceId ?? null,
      artifactId: body.artifactId ?? null,
      visibility: body.visibility ?? "internal",
      provenance: body.provenance ?? {
        sourceId: body.sourceId ?? undefined,
        artifactId: body.artifactId ?? undefined,
        rawRef: body.externalUrl ?? body.externalId ?? undefined,
        createdFrom: "api",
        confidence: 1,
        extractedAt: timestamp,
        humanReviewStatus: "approved",
        visibility: body.visibility ?? "internal",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbWorkItems).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/signals", (c) => {
  const watcherRunId = c.req.query("watcherRunId");
  let data = getDb()
    .select()
    .from(cbSignals)
    .orderBy(desc(cbSignals.timestamp))
    .limit(100)
    .all();
  if (watcherRunId) data = data.filter((signal) => signal.watcherRunId === watcherRunId);
  return c.json({ data, total: data.length });
});

app.post("/signals", async (c) => {
  try {
    const body = await c.req.json<CreateSignalRequest>();
    const timestamp = now();
    const db = getDb();
    const artifact = body.artifactId
      ? db.select().from(cbArtifacts).where(eq(cbArtifacts.id, body.artifactId)).get()
      : null;
    const sourceId = body.sourceId ?? artifact?.sourceId ?? null;
    const source = sourceId
      ? db.select().from(cbSources).where(eq(cbSources.id, sourceId)).get()
      : null;
    const row = {
      id: nanoid(12),
      source: body.source,
      scope: body.scope,
      entityType: body.entityType,
      entityId: requireText(body.entityId, "entityId"),
      timestamp: body.timestamp ?? timestamp,
      summary: requireText(body.summary, "summary"),
      rawRef: requireText(body.rawRef, "rawRef"),
      severity: body.severity ?? "info",
      confidence: body.confidence ?? 1,
      tags: body.tags ?? [],
      area: body.area ?? artifact?.area ?? source?.area ?? "unknown",
      sourceId,
      artifactId: body.artifactId ?? null,
      workItemId: body.workItemId ?? null,
      workflowRunId: body.workflowRunId ?? null,
      watcherId: body.watcherId ?? null,
      watcherRunId: body.watcherRunId ?? null,
      visibility: body.visibility ?? artifact?.visibility ?? source?.visibility ?? "internal",
      provenance: body.provenance ?? {
        sourceId: sourceId ?? undefined,
        rawRef: body.rawRef,
        artifactId: body.artifactId ?? undefined,
        createdFrom: "api:signal",
        confidence: body.confidence ?? 1,
        extractedAt: timestamp,
        humanReviewStatus: "approved",
        visibility: body.visibility ?? artifact?.visibility ?? source?.visibility ?? "internal",
      },
      metadata: body.metadata ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.insert(cbSignals).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/alignment-findings", (c) => {
  const data = getDb()
    .select()
    .from(cbAlignmentFindings)
    .orderBy(desc(cbAlignmentFindings.updatedAt))
    .limit(100)
    .all();
  return c.json({ data, total: data.length });
});

app.post("/alignment-findings", async (c) => {
  try {
    const body = await c.req.json<CreateAlignmentFindingRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      priorityId: body.priorityId ?? null,
      goalId: body.goalId ?? null,
      artifactIds: body.artifactIds ?? [],
      signalIds: body.signalIds ?? [],
      workItemId: body.workItemId ?? null,
      workflowRunId: body.workflowRunId ?? null,
      area: body.area ?? "unknown",
      classification: body.classification,
      rationale: requireText(body.rationale, "rationale"),
      confidence: body.confidence ?? 1,
      suggestedAction: body.suggestedAction ?? null,
      severity: body.severity ?? "info",
      visibility: body.visibility ?? "internal",
      provenance: body.provenance ?? {
        rawRef: body.signalIds?.[0] ?? body.artifactIds?.[0],
        artifactId: body.artifactIds?.[0],
        createdFrom: "api:alignment_finding",
        confidence: body.confidence ?? 1,
        extractedAt: timestamp,
        humanReviewStatus: "approved",
        visibility: body.visibility ?? "internal",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbAlignmentFindings).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/guidance-items", (c) => {
  const status = c.req.query("status");
  let data = getDb()
    .select()
    .from(cbGuidanceItems)
    .orderBy(desc(cbGuidanceItems.updatedAt))
    .limit(100)
    .all();
  if (status) data = data.filter((item) => item.status === status);
  return c.json({ data, total: data.length });
});

app.post("/guidance-items", async (c) => {
  try {
    const body = await c.req.json<CreateGuidanceItemRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      audience: body.audience ?? "human",
      priorityId: body.priorityId ?? null,
      goalId: body.goalId ?? null,
      findingId: body.findingId ?? null,
      signalId: body.signalId ?? null,
      workItemId: body.workItemId ?? null,
      workflowRunId: body.workflowRunId ?? null,
      area: body.area ?? "unknown",
      title: requireText(body.title, "title"),
      action: requireText(body.action, "action"),
      dueAt: body.dueAt ?? null,
      severity: body.severity ?? "info",
      status: body.status ?? "open",
      feedbackStatus: body.feedbackStatus ?? "pending",
      feedbackNote: body.feedbackNote ?? null,
      feedbackAt: body.feedbackNote || body.feedbackStatus ? timestamp : null,
      generatedFrom: body.generatedFrom ?? null,
      visibility: body.visibility ?? "internal",
      provenance: body.provenance ?? {
        rawRef: body.findingId ?? body.signalId ?? undefined,
        artifactId: undefined,
        createdFrom: "api:guidance_item",
        confidence: 1,
        extractedAt: timestamp,
        humanReviewStatus: "approved",
        visibility: body.visibility ?? "internal",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbGuidanceItems).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.put("/guidance-items/:id", async (c) => {
  try {
    const db = getDb();
    const id = c.req.param("id");
    const body = await c.req.json<UpdateGuidanceItemRequest>();
    const existing = db
      .select()
      .from(cbGuidanceItems)
      .where(eq(cbGuidanceItems.id, id))
      .get();
    if (!existing) throw new Error("guidance item not found");

    const timestamp = now();
    const hasFeedback =
      body.feedbackStatus !== undefined || body.feedbackNote !== undefined;
    const update = {
      audience: body.audience ?? existing.audience,
      action: body.action ?? existing.action,
      dueAt: body.dueAt !== undefined ? body.dueAt : existing.dueAt,
      severity: body.severity ?? existing.severity,
      status: body.status ?? existing.status,
      feedbackStatus: body.feedbackStatus ?? existing.feedbackStatus,
      feedbackNote:
        body.feedbackNote !== undefined ? body.feedbackNote : existing.feedbackNote,
      feedbackAt: hasFeedback ? timestamp : existing.feedbackAt,
      updatedAt: timestamp,
    };

    db.update(cbGuidanceItems)
      .set(update)
      .where(eq(cbGuidanceItems.id, id))
      .run();

    return c.json({
      data: {
        ...existing,
        ...update,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "update_failed", message }, 400);
  }
});

app.get("/agent-contexts", (c) => {
  const data = getDb()
    .select()
    .from(cbAgentContexts)
    .orderBy(desc(cbAgentContexts.updatedAt))
    .limit(100)
    .all();
  return c.json({ data, total: data.length });
});

app.post("/agent-contexts", async (c) => {
  try {
    const body = await c.req.json<CreateAgentContextRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      title: requireText(body.title, "title"),
      targetAgent: requireText(body.targetAgent, "targetAgent"),
      contextType: body.contextType ?? "briefing",
      sourceKnowledgeIds: body.sourceKnowledgeIds ?? [],
      sourceArtifactIds: body.sourceArtifactIds ?? [],
      decisionIds: body.decisionIds ?? [],
      guidanceItemIds: body.guidanceItemIds ?? [],
      workItemIds: body.workItemIds ?? [],
      priorityIds: body.priorityIds ?? [],
      goalIds: body.goalIds ?? [],
      content: requireText(body.content, "content"),
      contentFormat: body.contentFormat ?? "markdown",
      status: body.status ?? "draft",
      validationStatus: body.validationStatus ?? "unvalidated",
      visibility: body.visibility ?? "internal",
      provenance: body.provenance ?? {
        rawRef: body.sourceKnowledgeIds?.[0],
        artifactId: body.sourceArtifactIds?.[0],
        createdFrom: "api:agent_context",
        confidence: 1,
        extractedAt: timestamp,
        humanReviewStatus: "approved",
        visibility: body.visibility ?? "internal",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbAgentContexts).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.post("/agent-contexts/generate", async (c) => {
  try {
    const body = await c.req.json<GenerateAgentContextRequest>();
    const db = getDb();
    const timestamp = now();
    const sourceArtifactIds = body.sourceArtifactIds ?? [];
    const decisionIds = body.decisionIds ?? [];
    const guidanceItemIds = body.guidanceItemIds ?? [];
    const workItemIds = body.workItemIds ?? [];
    const priorityIds = body.priorityIds ?? [];
    const goalIds = body.goalIds ?? [];

    const artifacts = sourceArtifactIds.map((id) => {
      const row = db.select().from(cbArtifacts).where(eq(cbArtifacts.id, id)).get();
      if (!row) throw new Error(`sourceArtifactIds contains unknown artifact ${id}`);
      return row;
    });
    const decisions = decisionIds.map((id) => {
      const row = db.select().from(cbDecisions).where(eq(cbDecisions.id, id)).get();
      if (!row) throw new Error(`decisionIds contains unknown decision ${id}`);
      return row;
    });
    const guidanceItems = guidanceItemIds.map((id) => {
      const row = db.select().from(cbGuidanceItems).where(eq(cbGuidanceItems.id, id)).get();
      if (!row) throw new Error(`guidanceItemIds contains unknown guidance item ${id}`);
      return row;
    });
    const workItems = workItemIds.map((id) => {
      const row = db.select().from(cbWorkItems).where(eq(cbWorkItems.id, id)).get();
      if (!row) throw new Error(`workItemIds contains unknown work item ${id}`);
      return row;
    });
    const priorities = priorityIds.map((id) => {
      const row = db
        .select()
        .from(cbStrategicPriorities)
        .where(eq(cbStrategicPriorities.id, id))
        .get();
      if (!row) throw new Error(`priorityIds contains unknown priority ${id}`);
      return row;
    });
    const goals = goalIds.map((id) => {
      const row = db.select().from(cbGoals).where(eq(cbGoals.id, id)).get();
      if (!row) throw new Error(`goalIds contains unknown goal ${id}`);
      return row;
    });

    const title =
      body.title ??
      `${body.targetAgent} ${body.contextType ?? "briefing"} context`;
    const contextType = body.contextType ?? "briefing";
    const sourceKnowledgeIds = [
      ...sourceArtifactIds.map((id) => `artifact:${id}`),
      ...decisionIds.map((id) => `decision:${id}`),
      ...guidanceItemIds.map((id) => `guidance:${id}`),
      ...workItemIds.map((id) => `work_item:${id}`),
      ...priorityIds.map((id) => `priority:${id}`),
      ...goalIds.map((id) => `goal:${id}`),
    ];
    const content = buildAgentContextContent({
      title,
      targetAgent: body.targetAgent,
      contextType,
      priorities,
      goals,
      decisions,
      guidanceItems,
      workItems,
      artifacts,
    });

    const row = {
      id: nanoid(12),
      title,
      targetAgent: requireText(body.targetAgent, "targetAgent"),
      contextType,
      sourceKnowledgeIds,
      sourceArtifactIds,
      decisionIds,
      guidanceItemIds,
      workItemIds,
      priorityIds,
      goalIds,
      content,
      contentFormat: "markdown",
      status: "ready" as const,
      validationStatus: "needs_review" as const,
      visibility: body.visibility ?? "internal",
      provenance: {
        rawRef: sourceKnowledgeIds[0],
        artifactId: sourceArtifactIds[0],
        createdFrom: "api:agent_context_generator",
        confidence: 0.9,
        extractedAt: timestamp,
        humanReviewStatus: "needs_review" as const,
        visibility: body.visibility ?? "internal",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.insert(cbAgentContexts).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "generate_failed", message }, 400);
  }
});

app.get("/improvement-proposals", (c) => {
  const data = getDb()
    .select()
    .from(cbImprovementProposals)
    .orderBy(desc(cbImprovementProposals.updatedAt))
    .limit(100)
    .all();
  return c.json({ data, total: data.length });
});

app.post("/improvement-proposals", async (c) => {
  try {
    const body = await c.req.json<CreateImprovementProposalRequest>();
    const db = getDb();
    const timestamp = now();
    const signalIds = body.signalIds ?? [];
    for (const id of signalIds) {
      const row = db.select().from(cbSignals).where(eq(cbSignals.id, id)).get();
      if (!row) throw new Error(`signalIds contains unknown signal ${id}`);
    }
    const alignmentFindingIds = body.alignmentFindingIds ?? [];
    for (const id of alignmentFindingIds) {
      const row = db
        .select()
        .from(cbAlignmentFindings)
        .where(eq(cbAlignmentFindings.id, id))
        .get();
      if (!row) throw new Error(`alignmentFindingIds contains unknown finding ${id}`);
    }
    const guidanceItemIds = body.guidanceItemIds ?? [];
    for (const id of guidanceItemIds) {
      const row = db.select().from(cbGuidanceItems).where(eq(cbGuidanceItems.id, id)).get();
      if (!row) throw new Error(`guidanceItemIds contains unknown guidance item ${id}`);
    }
    const agentContextIds = body.agentContextIds ?? [];
    for (const id of agentContextIds) {
      const row = db.select().from(cbAgentContexts).where(eq(cbAgentContexts.id, id)).get();
      if (!row) throw new Error(`agentContextIds contains unknown agent context ${id}`);
    }

    const row = {
      id: nanoid(12),
      title: requireText(body.title, "title"),
      hypothesis: requireText(body.hypothesis, "hypothesis"),
      area: body.area ?? "unknown",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "unknown",
      signalIds,
      alignmentFindingIds,
      guidanceItemIds,
      agentContextIds,
      sourceArtifactIds: body.sourceArtifactIds ?? [],
      workItemIds: body.workItemIds ?? [],
      priorityIds: body.priorityIds ?? [],
      goalIds: body.goalIds ?? [],
      changeClass: body.changeClass ?? "unknown",
      patchRef: body.patchRef ?? null,
      validationPlan: body.validationPlan ?? null,
      impactReview: body.impactReview ?? null,
      status: body.status ?? "proposed",
      promotionStatus: body.promotionStatus ?? "not_ready",
      visibility: body.visibility ?? "internal",
      provenance: body.provenance ?? {
        rawRef:
          signalIds[0] ??
          guidanceItemIds[0] ??
          agentContextIds[0] ??
          body.sourceArtifactIds?.[0],
        artifactId: body.sourceArtifactIds?.[0],
        createdFrom: "api:improvement_proposal",
        confidence: 1,
        extractedAt: timestamp,
        humanReviewStatus: "needs_review",
        visibility: body.visibility ?? "internal",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.insert(cbImprovementProposals).values(row).run();
    for (const artifactId of row.sourceArtifactIds) {
      db.insert(cbArtifactLinks)
        .values({
          id: nanoid(12),
          artifactId,
          targetType: "improvement_proposal",
          targetId: row.id,
          relationship: "source_for_improvement",
          confidence: 1,
          rationale: "ImprovementProposal created with this artifact as evidence.",
          createdAt: timestamp,
        })
        .run();
    }
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.put("/improvement-proposals/:id", async (c) => {
  try {
    const db = getDb();
    const id = c.req.param("id");
    const body = await c.req.json<UpdateImprovementProposalRequest>();
    const existing = db
      .select()
      .from(cbImprovementProposals)
      .where(eq(cbImprovementProposals.id, id))
      .get();
    if (!existing) throw new Error("improvement proposal not found");
    const timestamp = now();
    const update = {
      patchRef: body.patchRef !== undefined ? body.patchRef : existing.patchRef,
      validationPlan:
        body.validationPlan !== undefined
          ? body.validationPlan
          : existing.validationPlan,
      impactReview:
        body.impactReview !== undefined ? body.impactReview : existing.impactReview,
      status: body.status ?? existing.status,
      promotionStatus: body.promotionStatus ?? existing.promotionStatus,
      updatedAt: timestamp,
    };
    db.update(cbImprovementProposals)
      .set(update)
      .where(eq(cbImprovementProposals.id, id))
      .run();
    return c.json({
      data: {
        ...existing,
        ...update,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "update_failed", message }, 400);
  }
});

app.get("/workflow-blueprints", (c) => {
  const data = getDb()
    .select()
    .from(cbWorkflowBlueprints)
    .orderBy(desc(cbWorkflowBlueprints.updatedAt))
    .all();
  return c.json({ data, total: data.length });
});

app.post("/workflow-blueprints", async (c) => {
  try {
    const body = await c.req.json<CreateWorkflowBlueprintRequest>();
    const timestamp = now();
    const stages = body.stages ?? [];
    const row = {
      id: nanoid(12),
      title: requireText(body.title, "title"),
      description: body.description ?? null,
      workflowArea: body.workflowArea ?? "unknown",
      version: body.version ?? "v0",
      status: body.status ?? "draft",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "unknown",
      reviewCadence: body.reviewCadence ?? null,
      riskClass: body.riskClass ?? "unknown",
      stages,
      gates: body.gates ?? stages.map((stage) => stage.gate),
      requiredArtifacts:
        body.requiredArtifacts ?? stages.map((stage) => stage.artifactExpected),
      visibility: body.visibility ?? "internal",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbWorkflowBlueprints).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/workflow-runs", (c) => {
  const data = getDb()
    .select()
    .from(cbWorkflowRuns)
    .orderBy(desc(cbWorkflowRuns.updatedAt))
    .limit(100)
    .all();
  return c.json({ data, total: data.length });
});

app.post("/workflow-runs", async (c) => {
  try {
    const body = await c.req.json<CreateWorkflowRunRequest>();
    const timestamp = now();
    const blueprint = getDb()
      .select()
      .from(cbWorkflowBlueprints)
      .where(eq(cbWorkflowBlueprints.id, requireText(body.blueprintId, "blueprintId")))
      .get();
    if (!blueprint) throw new Error("blueprintId not found");

    const stages = blueprint.stages as WorkflowBlueprintStage[];
    const currentStep = body.currentStep ?? stages[0]?.key ?? null;
    const run = {
      id: nanoid(12),
      blueprintId: blueprint.id,
      workItemId: body.workItemId ?? null,
      title: requireText(body.title, "title"),
      workflowArea: body.workflowArea ?? blueprint.workflowArea,
      status: body.status ?? "planned",
      currentStep,
      gateStatus: body.gateStatus ?? "pending",
      slaStatus: body.slaStatus ?? "not_set",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "unknown",
      dueAt: body.dueAt ?? null,
      startedAt: body.startedAt ?? null,
      finishedAt: null,
      sourceArtifactIds: body.sourceArtifactIds ?? [],
      visibility: body.visibility ?? blueprint.visibility,
      provenance: body.provenance ?? {
        rawRef: body.workItemId ?? blueprint.id,
        createdFrom: "api",
        confidence: 1,
        extractedAt: timestamp,
        humanReviewStatus: "approved",
        visibility: body.visibility ?? blueprint.visibility,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const db = getDb();
    db.insert(cbWorkflowRuns).values(run).run();
    for (const [index, stage] of stages.entries()) {
      db.insert(cbWorkflowSteps)
        .values({
          id: `${run.id}-${stage.key}`,
          runId: run.id,
          blueprintId: blueprint.id,
          stepKey: stage.key,
          title: stage.title,
          position: index + 1,
          owner: null,
          ownerType: stage.ownerType,
          status: index === 0 ? "running" : "not_started",
          gateStatus: index === 0 ? "pending" : "not_started",
          slaStatus: "not_set",
          dueAt: null,
          evidenceArtifactIds: [],
          requiredArtifact: stage.artifactExpected,
          completedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .run();
    }

    return c.json({ data: run }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/workflow-runs/:id/steps", (c) => {
  const runId = c.req.param("id");
  const data = getDb()
    .select()
    .from(cbWorkflowSteps)
    .where(eq(cbWorkflowSteps.runId, runId))
    .orderBy(cbWorkflowSteps.position)
    .all();
  return c.json({ data, total: data.length });
});

app.get("/artifact-links", (c) => {
  const data = getDb()
    .select()
    .from(cbArtifactLinks)
    .orderBy(desc(cbArtifactLinks.createdAt))
    .limit(200)
    .all();
  return c.json({ data, total: data.length });
});

app.post("/artifact-links", async (c) => {
  try {
    const body = await c.req.json<{
      artifactId: string;
      targetType: string;
      targetId: string;
      relationship?: string;
      confidence?: number;
      rationale?: string | null;
    }>();
    const row = {
      id: nanoid(12),
      artifactId: requireText(body.artifactId, "artifactId"),
      targetType: requireText(body.targetType, "targetType"),
      targetId: requireText(body.targetId, "targetId"),
      relationship: body.relationship ?? "evidence_for",
      confidence: body.confidence ?? 1,
      rationale: body.rationale ?? null,
      createdAt: now(),
    };
    getDb().insert(cbArtifactLinks).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/watchers", (c) => {
  const data = getDb().select().from(cbWatchers).orderBy(desc(cbWatchers.updatedAt)).all();
  return c.json({ data, total: data.length });
});

app.post("/watchers", async (c) => {
  try {
    const body = await c.req.json<CreateWatcherRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      title: requireText(body.title, "title"),
      description: body.description ?? null,
      sourceIds: body.sourceIds ?? [],
      triggerType: body.triggerType ?? "manual",
      schedule: body.schedule ?? null,
      eventFilter: body.eventFilter ?? null,
      scopeQuery: body.scopeQuery ?? null,
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "unknown",
      targetWorkflowBlueprintId: body.targetWorkflowBlueprintId ?? null,
      riskClass: body.riskClass ?? "unknown",
      actionPolicy: body.actionPolicy ?? "observe_only",
      status: body.status ?? "active",
      lastRunAt: null,
      nextRunAt: body.nextRunAt ?? null,
      failurePolicy: body.failurePolicy ?? null,
      outputPolicy: body.outputPolicy ?? null,
      visibility: body.visibility ?? "internal",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbWatchers).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/watcher-runs", (c) => {
  const watcherId = c.req.query("watcherId");
  let data = getDb()
    .select()
    .from(cbWatcherRuns)
    .orderBy(desc(cbWatcherRuns.startedAt))
    .limit(100)
    .all();
  if (watcherId) data = data.filter((run) => run.watcherId === watcherId);
  return c.json({ data, total: data.length });
});

app.get("/watchers/:id/runs", (c) => {
  const watcherId = c.req.param("id");
  const data = getDb()
    .select()
    .from(cbWatcherRuns)
    .where(eq(cbWatcherRuns.watcherId, watcherId))
    .orderBy(desc(cbWatcherRuns.startedAt))
    .limit(100)
    .all();
  return c.json({ data, total: data.length });
});

app.post("/watchers/:id/run", async (c) => {
  const db = getDb();
  const watcherId = c.req.param("id");
  const startedAt = now();
  const runId = nanoid(12);

  try {
    const body = await c.req.json<RunWatcherRequest>();
    const watcher = db.select().from(cbWatchers).where(eq(cbWatchers.id, watcherId)).get();
    if (!watcher) throw new Error("watcher not found");
    if (watcher.status !== "active") throw new Error("watcher is not active");

    const sourceIds = Array.from(
      new Set([body.sourceId, ...watcher.sourceIds].filter((id): id is string => !!id))
    );
    const sourceId = sourceIds[0];
    if (!sourceId) {
      throw new Error("watcher run requires a sourceId or watcher sourceIds");
    }
    const source = db.select().from(cbSources).where(eq(cbSources.id, sourceId)).get();
    if (!source) throw new Error("sourceId not found");

    const rawRef =
      body.rawRef ??
      body.externalUrl ??
      watcher.scopeQuery ??
      source.externalRef ??
      `${watcher.id}:${runId}`;
    const title = body.title ?? `${watcher.title}: ${source.name}`;
    const summary =
      body.summary ??
      `Manual watcher run for ${watcher.title}. Policy: ${watcher.actionPolicy}.`;
    const artifactId = nanoid(12);
    const provenance = {
      sourceId,
      rawRef,
      createdFrom: `watcher:${watcher.id}`,
      confidence: 1,
      extractedAt: startedAt,
      humanReviewStatus: "approved" as const,
      visibility: watcher.visibility,
      notes: `action_policy=${watcher.actionPolicy}; risk_class=${watcher.riskClass}`,
    };

    const artifact = {
      id: artifactId,
      sourceId,
      artifactType: "watcher_observation",
      area: source.area,
      title,
      summary,
      contentRef: null,
      rawRef,
      author: watcher.owner ?? "AIOS watcher",
      occurredAt: startedAt,
      ingestedAt: startedAt,
      hash: stableHash(`${watcher.id}:${runId}:${sourceId}:${rawRef}:${title}`),
      visibility: watcher.visibility,
      provenance,
      humanReviewStatus: "approved" as const,
      confidence: 1,
      metadata: {
        watcherId: watcher.id,
        watcherRunId: runId,
        triggerType: watcher.triggerType,
        scopeQuery: watcher.scopeQuery,
        actionPolicy: watcher.actionPolicy,
        riskClass: watcher.riskClass,
      },
    };
    db.insert(cbArtifacts).values(artifact).run();

    const requestedGoal = body.goalId
      ? db.select().from(cbGoals).where(eq(cbGoals.id, body.goalId)).get()
      : null;
    if (body.goalId && !requestedGoal) throw new Error("goalId not found");
    const requestedPriorityId = body.priorityId ?? requestedGoal?.priorityId ?? null;
    if (
      requestedPriorityId &&
      !db
        .select()
        .from(cbStrategicPriorities)
        .where(eq(cbStrategicPriorities.id, requestedPriorityId))
        .get()
    ) {
      throw new Error("priorityId not found");
    }

    const createdWorkItems = [];
    const linkedWorkItemIds: string[] = [];
    const linkedWorkItem = body.workItemId
      ? db.select().from(cbWorkItems).where(eq(cbWorkItems.id, body.workItemId)).get()
      : null;
    if (body.workItemId && !linkedWorkItem) throw new Error("workItemId not found");
    if (body.workItemId) {
      linkedWorkItemIds.push(body.workItemId);
      db.insert(cbArtifactLinks)
        .values({
          id: nanoid(12),
          artifactId,
          targetType: "work_item",
          targetId: body.workItemId,
          relationship: "watcher_evidence",
          confidence: 1,
          rationale: `Watcher ${watcher.id} linked evidence to existing WorkItem.`,
          createdAt: startedAt,
        })
        .run();
    }

    if (body.createWorkItem) {
      const workItem = {
        id: nanoid(12),
        title: body.workItemTitle ?? title,
        description: summary,
        area: source.area,
        owner: watcher.owner,
        ownerType: watcher.ownerType,
        status: "triage" as const,
        priorityId: requestedPriorityId,
        goalId: body.goalId ?? null,
        milestoneId: null,
        externalProvider: source.sourceType.startsWith("github") ? "github" : null,
        externalId: body.rawRef ?? null,
        externalUrl:
          body.externalUrl ?? (rawRef.startsWith("http://") || rawRef.startsWith("https://") ? rawRef : null),
        riskClass: watcher.riskClass,
        dueAt: null,
        blockedReason: null,
        labels: ["watcher", watcher.id],
        sourceId,
        artifactId,
        visibility: watcher.visibility,
        provenance: {
          ...provenance,
          artifactId,
          createdFrom: `watcher:${watcher.id}:work_item`,
        },
        createdAt: startedAt,
        updatedAt: startedAt,
      };
      db.insert(cbWorkItems).values(workItem).run();
      createdWorkItems.push(workItem);
      linkedWorkItemIds.push(workItem.id);
      db.insert(cbArtifactLinks)
        .values({
          id: nanoid(12),
          artifactId,
          targetType: "work_item",
          targetId: workItem.id,
          relationship: "created_from_watcher",
          confidence: 1,
          rationale: `Watcher ${watcher.id} created internal WorkItem under ${watcher.actionPolicy}.`,
          createdAt: startedAt,
        })
        .run();
    }

    const workflowRunsLinked = [];
    if (body.workflowRunId) {
      workflowRunsLinked.push(body.workflowRunId);
      db.insert(cbArtifactLinks)
        .values({
          id: nanoid(12),
          artifactId,
          targetType: "workflow_run",
          targetId: body.workflowRunId,
          relationship: "watcher_evidence",
          confidence: 1,
          rationale: `Watcher ${watcher.id} linked evidence to WorkflowRun.`,
          createdAt: startedAt,
        })
        .run();
    }

    const alignmentWorkItem = createdWorkItems[0] ?? linkedWorkItem ?? null;
    const alignmentPriorityId =
      requestedPriorityId ?? alignmentWorkItem?.priorityId ?? requestedGoal?.priorityId ?? null;
    const alignmentGoalId = body.goalId ?? alignmentWorkItem?.goalId ?? null;
    const signalSeverity = body.signalSeverity ?? severityFromRisk(watcher.riskClass);
    const signalId = nanoid(12);
    const signal = {
      id: signalId,
      source: body.signalSource ?? "qa",
      scope: body.signalScope ?? "core",
      entityType: body.signalEntityType ?? "job",
      entityId:
        body.signalEntityId ??
        alignmentWorkItem?.id ??
        body.workflowRunId ??
        artifactId,
      timestamp: startedAt,
      summary: body.summary ?? summary,
      rawRef,
      severity: signalSeverity,
      confidence: 1,
      tags: body.signalTags ?? [
        "watcher",
        watcher.id,
        source.sourceType,
        source.area,
      ],
      area: source.area,
      sourceId,
      artifactId,
      workItemId: alignmentWorkItem?.id ?? null,
      workflowRunId: body.workflowRunId ?? null,
      watcherId: watcher.id,
      watcherRunId: runId,
      visibility: watcher.visibility,
      provenance: {
        ...provenance,
        artifactId,
        createdFrom: `watcher:${watcher.id}:signal`,
      },
      metadata: {
        autoImproveEnvelope: {
          source: body.signalSource ?? "qa",
          scope: body.signalScope ?? "core",
          entity_type: body.signalEntityType ?? "job",
          entity_id:
            body.signalEntityId ??
            alignmentWorkItem?.id ??
            body.workflowRunId ??
            artifactId,
          timestamp: startedAt,
          summary: body.summary ?? summary,
          raw_ref: rawRef,
          severity: signalSeverity,
          confidence: 1,
          tags: body.signalTags ?? [
            "watcher",
            watcher.id,
            source.sourceType,
            source.area,
          ],
        },
      },
      createdAt: startedAt,
      updatedAt: startedAt,
    };
    db.insert(cbSignals).values(signal).run();
    db.insert(cbArtifactLinks)
      .values({
        id: nanoid(12),
        artifactId,
        targetType: "signal",
        targetId: signalId,
        relationship: "generated_signal",
        confidence: 1,
        rationale: `Watcher ${watcher.id} normalized the artifact into an AutoImprove Signal envelope.`,
        createdAt: startedAt,
      })
      .run();

    const alignment = classifyAlignment({
      priorityId: alignmentPriorityId,
      goalId: alignmentGoalId,
      hasWorkItem: !!alignmentWorkItem,
    });
    const findingId = nanoid(12);
    const finding = {
      id: findingId,
      priorityId: alignmentPriorityId,
      goalId: alignmentGoalId,
      artifactIds: [artifactId],
      signalIds: [signalId],
      workItemId: alignmentWorkItem?.id ?? null,
      workflowRunId: body.workflowRunId ?? null,
      area: source.area,
      classification: alignment.classification,
      rationale: alignment.rationale,
      confidence: alignment.confidence,
      suggestedAction: alignment.suggestedAction,
      severity: signalSeverity,
      visibility: watcher.visibility,
      provenance: {
        ...provenance,
        artifactId,
        createdFrom: `watcher:${watcher.id}:alignment_finding`,
      },
      createdAt: startedAt,
      updatedAt: startedAt,
    };
    db.insert(cbAlignmentFindings).values(finding).run();
    db.insert(cbArtifactLinks)
      .values({
        id: nanoid(12),
        artifactId,
        targetType: "alignment_finding",
        targetId: findingId,
        relationship: "classified_against_strategy",
        confidence: alignment.confidence,
        rationale: alignment.rationale,
        createdAt: startedAt,
      })
      .run();

    const guidanceItemId = nanoid(12);
    const guidanceItem = {
      id: guidanceItemId,
      audience: body.guidanceAudience ?? defaultGuidanceAudience(alignment.classification),
      priorityId: alignmentPriorityId,
      goalId: alignmentGoalId,
      findingId,
      signalId,
      workItemId: alignmentWorkItem?.id ?? null,
      workflowRunId: body.workflowRunId ?? null,
      area: source.area,
      title: `Guidance: ${title}`,
      action: body.guidanceAction ?? alignment.suggestedAction,
      dueAt: body.guidanceDueAt ?? null,
      severity: signalSeverity,
      status: "open" as const,
      feedbackStatus: "pending" as const,
      feedbackNote: null,
      feedbackAt: null,
      generatedFrom: {
        watcherId: watcher.id,
        watcherRunId: runId,
        artifactId,
        signalId,
        findingId,
        classification: alignment.classification,
      },
      visibility: watcher.visibility,
      provenance: {
        ...provenance,
        artifactId,
        createdFrom: `watcher:${watcher.id}:guidance_item`,
      },
      createdAt: startedAt,
      updatedAt: startedAt,
    };
    db.insert(cbGuidanceItems).values(guidanceItem).run();
    db.insert(cbArtifactLinks)
      .values({
        id: nanoid(12),
        artifactId,
        targetType: "guidance_item",
        targetId: guidanceItemId,
        relationship: "generated_guidance",
        confidence: alignment.confidence,
        rationale: `Guidance created from finding ${findingId}.`,
        createdAt: startedAt,
      })
      .run();

    const finishedAt = now();
    const run = {
      id: runId,
      watcherId: watcher.id,
      startedAt,
      finishedAt,
      status: "completed" as const,
      triggerRef: rawRef,
      sourceIds,
      artifactsCreated: [artifactId],
      signalsCreated: [signalId],
      alignmentFindingsCreated: [findingId],
      workItemsCreated: createdWorkItems.map((item) => item.id),
      guidanceCreated: [guidanceItemId],
      workflowRunsLinked,
      errorSummary: null,
      actionPolicy: watcher.actionPolicy,
      riskClass: watcher.riskClass,
      provenance: {
        ...provenance,
        artifactId,
        createdFrom: `watcher:${watcher.id}:run`,
      },
      createdAt: startedAt,
      updatedAt: finishedAt,
    };
    db.insert(cbWatcherRuns).values(run).run();
    db.update(cbWatchers)
      .set({
        lastRunAt: finishedAt,
        status: "active",
        updatedAt: finishedAt,
      })
      .where(eq(cbWatchers.id, watcher.id))
      .run();
    db.update(cbSources)
      .set({
        lastSyncAt: finishedAt,
        healthStatus: "healthy",
        syncError: null,
        updatedAt: finishedAt,
      })
      .where(eq(cbSources.id, sourceId))
      .run();

    return c.json(
      {
        data: {
          run,
          artifact,
          signalsCreated: [signal],
          alignmentFindingsCreated: [finding],
          workItemsCreated: createdWorkItems,
          guidanceItemsCreated: [guidanceItem],
          workflowRunsLinked,
        },
      },
      201
    );
  } catch (err) {
    const finishedAt = now();
    const message = err instanceof Error ? err.message : "Unknown error";
    db.insert(cbWatcherRuns)
      .values({
        id: runId,
        watcherId,
        startedAt,
        finishedAt,
        status: "failed",
        triggerRef: null,
        sourceIds: [],
        artifactsCreated: [],
        signalsCreated: [],
        alignmentFindingsCreated: [],
        workItemsCreated: [],
        guidanceCreated: [],
        workflowRunsLinked: [],
        errorSummary: message,
        actionPolicy: "observe_only",
        riskClass: "unknown",
        provenance: {
          createdFrom: `watcher:${watcherId}:run`,
          confidence: 1,
          extractedAt: startedAt,
          humanReviewStatus: "approved",
          visibility: "internal",
        },
        createdAt: startedAt,
        updatedAt: finishedAt,
      })
      .run();
    db.update(cbWatchers)
      .set({
        lastRunAt: finishedAt,
        status: "error",
        updatedAt: finishedAt,
      })
      .where(eq(cbWatchers.id, watcherId))
      .run();
    return c.json({ error: "run_failed", message }, 400);
  }
});

export default app;
