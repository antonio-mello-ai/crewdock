import { createHash } from "node:crypto";
import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type {
  AlignmentClassification,
  CreateArtifactRequest,
  CreateAlignmentFindingRequest,
  CreateGoalRequest,
  CreateGuidanceItemRequest,
  CreateMilestoneRequest,
  CreateSignalRequest,
  CreateSourceRequest,
  CreateStrategicPriorityRequest,
  CreateWatcherRequest,
  CreateWorkflowBlueprintRequest,
  CreateWorkflowRunRequest,
  CreateWorkItemRequest,
  GuidanceAudience,
  SignalSeverity,
  RunWatcherRequest,
  WorkflowBlueprintStage,
} from "@aios/shared";
import { getDb } from "../db/client.js";
import {
  cbAlignmentFindings,
  cbArtifactLinks,
  cbArtifacts,
  cbGoals,
  cbGuidanceItems,
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

  return {
    sources,
    artifacts,
    priorities,
    goals,
    milestones,
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
  };
}

app.get("/summary", (c) => {
  const data = listAll();
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
      stats: {
        sourceCount: data.sources.length,
        artifactCount: data.artifacts.length,
        priorityCount: data.priorities.length,
        goalCount: data.goals.length,
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
      },
    },
  });
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
