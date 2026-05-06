import { createHash } from "node:crypto";
import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type {
  CreateArtifactRequest,
  CreateGoalRequest,
  CreateMilestoneRequest,
  CreateSourceRequest,
  CreateStrategicPriorityRequest,
  CreateWorkflowBlueprintRequest,
  CreateWorkflowRunRequest,
  CreateWorkItemRequest,
  WorkflowBlueprintStage,
} from "@aios/shared";
import { getDb } from "../db/client.js";
import {
  cbArtifactLinks,
  cbArtifacts,
  cbGoals,
  cbMilestones,
  cbSources,
  cbStrategicPriorities,
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

export default app;
