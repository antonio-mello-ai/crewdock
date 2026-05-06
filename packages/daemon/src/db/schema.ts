import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import type {
  CompanyBrainArea,
  ActionPolicy,
  AlignmentClassification,
  GateStatus,
  GoalStatus,
  GuidanceAudience,
  GuidanceFeedbackStatus,
  GuidanceStatus,
  HealthStatus,
  OwnerType,
  Provenance,
  ReviewStatus,
  RiskClass,
  SignalEntityType,
  SignalScope,
  SignalSeverity,
  SignalSource,
  SlaStatus,
  SourceStatus,
  SourceType,
  Visibility,
  WatcherRunStatus,
  WatcherStatus,
  WatcherTriggerType,
  WorkItemStatus,
  WorkflowBlueprintStage,
  WorkflowRunStatus,
  WorkflowStatus,
  WorkflowStepStatus,
} from "@aios/shared";

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  model: text("model"),
  filePath: text("file_path").notNull(),
  project: text("project"),
  frente: text("frente"),
  modes: text("modes", { mode: "json" }).$type<string[]>().default([]),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  agentId: text("agent_id"),
  type: text("type", { enum: ["agent", "orchestrator", "skill"] }).notNull(),
  objective: text("objective").notNull(),
  mode: text("mode"),
  status: text("status", {
    enum: ["queued", "running", "completed", "failed", "cancelled"],
  }).notNull().default("queued"),
  exitCode: integer("exit_code"),
  logPath: text("log_path"),
  startedAt: integer("started_at", { mode: "number" }),
  finishedAt: integer("finished_at", { mode: "number" }),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  totalTokensIn: integer("total_tokens_in").notNull().default(0),
  totalTokensOut: integer("total_tokens_out").notNull().default(0),
  totalCostUsd: real("total_cost_usd").notNull().default(0),
});

export const costEntries = sqliteTable("cost_entries", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull(),
  model: text("model").notNull(),
  tokensIn: integer("tokens_in").notNull(),
  tokensOut: integer("tokens_out").notNull(),
  costUsd: real("cost_usd").notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const schedules = sqliteTable("schedules", {
  id: text("id").primaryKey(),
  description: text("description"),
  onCalendar: text("on_calendar").notNull(),
  command: text("command").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  lastRun: integer("last_run", { mode: "number" }),
  nextRun: integer("next_run", { mode: "number" }),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  title: text("title"),
  workDir: text("work_dir").notNull(),
  status: text("status", {
    enum: ["active", "closed"],
  }).notNull().default("active"),
  permissionMode: text("permission_mode", {
    enum: ["plan", "acceptEdits", "full"],
  }).notNull().default("plan"),
  claudeSessionId: text("claude_session_id"),
  totalCostUsd: real("total_cost_usd").notNull().default(0),
  totalTokensIn: integer("total_tokens_in").notNull().default(0),
  totalTokensOut: integer("total_tokens_out").notNull().default(0),
  messageCount: integer("message_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  lastActiveAt: integer("last_active_at", { mode: "number" }).notNull(),
});

export const sessionMessages = sqliteTable("session_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  costUsd: real("cost_usd").notNull().default(0),
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const hitlRequests = sqliteTable("hitl_requests", {
  id: text("id").primaryKey(),
  jobId: text("job_id"),
  agentId: text("agent_id"),
  question: text("question").notNull(),
  context: text("context", { mode: "json" }).$type<Record<string, unknown>>(),
  status: text("status", {
    enum: ["pending", "responded", "expired"],
  }).notNull().default("pending"),
  response: text("response"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  respondedAt: integer("responded_at", { mode: "number" }),
});

export const cbSources = sqliteTable("cb_sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sourceType: text("source_type").$type<SourceType>().notNull(),
  area: text("area").$type<CompanyBrainArea>().notNull().default("unknown"),
  externalRef: text("external_ref"),
  status: text("status").$type<SourceStatus>().notNull().default("active"),
  healthStatus: text("health_status").$type<HealthStatus>().notNull().default("unknown"),
  owner: text("owner"),
  ownerType: text("owner_type").$type<OwnerType>().notNull().default("unknown"),
  visibility: text("visibility").$type<Visibility>().notNull().default("internal"),
  lastSyncAt: integer("last_sync_at", { mode: "number" }),
  syncError: text("sync_error"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown> | null>(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const cbArtifacts = sqliteTable("cb_artifacts", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  artifactType: text("artifact_type").notNull().default("manual"),
  area: text("area").$type<CompanyBrainArea>().notNull().default("unknown"),
  title: text("title").notNull(),
  summary: text("summary"),
  contentRef: text("content_ref"),
  rawRef: text("raw_ref").notNull(),
  author: text("author"),
  occurredAt: integer("occurred_at", { mode: "number" }).notNull(),
  ingestedAt: integer("ingested_at", { mode: "number" }).notNull(),
  hash: text("hash").notNull(),
  visibility: text("visibility").$type<Visibility>().notNull().default("internal"),
  provenance: text("provenance", { mode: "json" }).$type<Provenance | null>(),
  humanReviewStatus: text("human_review_status")
    .$type<ReviewStatus>()
    .notNull()
    .default("pending"),
  confidence: real("confidence").notNull().default(1),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown> | null>(),
});

export const cbStrategicPriorities = sqliteTable("cb_strategic_priorities", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  area: text("area").$type<CompanyBrainArea>().notNull().default("strategy"),
  owner: text("owner"),
  ownerType: text("owner_type").$type<OwnerType>().notNull().default("human"),
  status: text("status").notNull().default("active"),
  timeHorizon: text("time_horizon"),
  reviewCadence: text("review_cadence"),
  successCriteria: text("success_criteria"),
  visibility: text("visibility").$type<Visibility>().notNull().default("internal"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const cbGoals = sqliteTable("cb_goals", {
  id: text("id").primaryKey(),
  priorityId: text("priority_id"),
  title: text("title").notNull(),
  description: text("description"),
  area: text("area").$type<CompanyBrainArea>().notNull().default("strategy"),
  owner: text("owner"),
  ownerType: text("owner_type").$type<OwnerType>().notNull().default("human"),
  targetMetric: text("target_metric"),
  targetValue: text("target_value"),
  currentValue: text("current_value"),
  dueAt: integer("due_at", { mode: "number" }),
  reviewCadence: text("review_cadence"),
  status: text("status").$type<GoalStatus>().notNull().default("not_started"),
  confidence: real("confidence").notNull().default(1),
  slaStatus: text("sla_status").$type<SlaStatus>().notNull().default("not_set"),
  visibility: text("visibility").$type<Visibility>().notNull().default("internal"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const cbMilestones = sqliteTable("cb_milestones", {
  id: text("id").primaryKey(),
  goalId: text("goal_id"),
  priorityId: text("priority_id"),
  title: text("title").notNull(),
  area: text("area").$type<CompanyBrainArea>().notNull().default("strategy"),
  owner: text("owner"),
  ownerType: text("owner_type").$type<OwnerType>().notNull().default("human"),
  dueAt: integer("due_at", { mode: "number" }),
  status: text("status").$type<GoalStatus>().notNull().default("not_started"),
  readyCriteria: text("ready_criteria"),
  evidenceRequired: text("evidence_required"),
  slaStatus: text("sla_status").$type<SlaStatus>().notNull().default("not_set"),
  visibility: text("visibility").$type<Visibility>().notNull().default("internal"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const cbWorkItems = sqliteTable("cb_work_items", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  area: text("area").$type<CompanyBrainArea>().notNull().default("unknown"),
  owner: text("owner"),
  ownerType: text("owner_type").$type<OwnerType>().notNull().default("unknown"),
  status: text("status").$type<WorkItemStatus>().notNull().default("new"),
  priorityId: text("priority_id"),
  goalId: text("goal_id"),
  milestoneId: text("milestone_id"),
  externalProvider: text("external_provider"),
  externalId: text("external_id"),
  externalUrl: text("external_url"),
  riskClass: text("risk_class").$type<RiskClass>().notNull().default("unknown"),
  dueAt: integer("due_at", { mode: "number" }),
  blockedReason: text("blocked_reason"),
  labels: text("labels", { mode: "json" }).$type<string[]>().notNull().default([]),
  sourceId: text("source_id"),
  artifactId: text("artifact_id"),
  visibility: text("visibility").$type<Visibility>().notNull().default("internal"),
  provenance: text("provenance", { mode: "json" }).$type<Provenance | null>(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const cbSignals = sqliteTable("cb_signals", {
  id: text("id").primaryKey(),
  source: text("source").$type<SignalSource>().notNull(),
  scope: text("scope").$type<SignalScope>().notNull().default("core"),
  entityType: text("entity_type").$type<SignalEntityType>().notNull(),
  entityId: text("entity_id").notNull(),
  timestamp: integer("timestamp", { mode: "number" }).notNull(),
  summary: text("summary").notNull(),
  rawRef: text("raw_ref").notNull(),
  severity: text("severity").$type<SignalSeverity>().notNull().default("info"),
  confidence: real("confidence").notNull().default(1),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
  area: text("area").$type<CompanyBrainArea>().notNull().default("unknown"),
  sourceId: text("source_id"),
  artifactId: text("artifact_id"),
  workItemId: text("work_item_id"),
  workflowRunId: text("workflow_run_id"),
  watcherId: text("watcher_id"),
  watcherRunId: text("watcher_run_id"),
  visibility: text("visibility").$type<Visibility>().notNull().default("internal"),
  provenance: text("provenance", { mode: "json" }).$type<Provenance | null>(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown> | null>(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const cbAlignmentFindings = sqliteTable("cb_alignment_findings", {
  id: text("id").primaryKey(),
  priorityId: text("priority_id"),
  goalId: text("goal_id"),
  artifactIds: text("artifact_ids", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  signalIds: text("signal_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
  workItemId: text("work_item_id"),
  workflowRunId: text("workflow_run_id"),
  area: text("area").$type<CompanyBrainArea>().notNull().default("unknown"),
  classification: text("classification")
    .$type<AlignmentClassification>()
    .notNull()
    .default("unknown"),
  rationale: text("rationale").notNull(),
  confidence: real("confidence").notNull().default(1),
  suggestedAction: text("suggested_action"),
  severity: text("severity").$type<SignalSeverity>().notNull().default("info"),
  visibility: text("visibility").$type<Visibility>().notNull().default("internal"),
  provenance: text("provenance", { mode: "json" }).$type<Provenance | null>(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const cbGuidanceItems = sqliteTable("cb_guidance_items", {
  id: text("id").primaryKey(),
  audience: text("audience").$type<GuidanceAudience>().notNull().default("human"),
  priorityId: text("priority_id"),
  goalId: text("goal_id"),
  findingId: text("finding_id"),
  signalId: text("signal_id"),
  workItemId: text("work_item_id"),
  workflowRunId: text("workflow_run_id"),
  area: text("area").$type<CompanyBrainArea>().notNull().default("unknown"),
  title: text("title").notNull(),
  action: text("action").notNull(),
  dueAt: integer("due_at", { mode: "number" }),
  severity: text("severity").$type<SignalSeverity>().notNull().default("info"),
  status: text("status").$type<GuidanceStatus>().notNull().default("open"),
  feedbackStatus: text("feedback_status")
    .$type<GuidanceFeedbackStatus>()
    .notNull()
    .default("pending"),
  generatedFrom: text("generated_from", { mode: "json" }).$type<Record<string, unknown> | null>(),
  visibility: text("visibility").$type<Visibility>().notNull().default("internal"),
  provenance: text("provenance", { mode: "json" }).$type<Provenance | null>(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const cbWorkflowBlueprints = sqliteTable("cb_workflow_blueprints", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  workflowArea: text("workflow_area")
    .$type<CompanyBrainArea>()
    .notNull()
    .default("unknown"),
  version: text("version").notNull().default("v0"),
  status: text("status").$type<WorkflowStatus>().notNull().default("draft"),
  owner: text("owner"),
  ownerType: text("owner_type").$type<OwnerType>().notNull().default("unknown"),
  reviewCadence: text("review_cadence"),
  riskClass: text("risk_class").$type<RiskClass>().notNull().default("unknown"),
  stages: text("stages", { mode: "json" })
    .$type<WorkflowBlueprintStage[]>()
    .notNull()
    .default([]),
  gates: text("gates", { mode: "json" }).$type<string[]>().notNull().default([]),
  requiredArtifacts: text("required_artifacts", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  visibility: text("visibility").$type<Visibility>().notNull().default("internal"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const cbWorkflowRuns = sqliteTable("cb_workflow_runs", {
  id: text("id").primaryKey(),
  blueprintId: text("blueprint_id").notNull(),
  workItemId: text("work_item_id"),
  title: text("title").notNull(),
  workflowArea: text("workflow_area")
    .$type<CompanyBrainArea>()
    .notNull()
    .default("unknown"),
  status: text("status").$type<WorkflowRunStatus>().notNull().default("planned"),
  currentStep: text("current_step"),
  gateStatus: text("gate_status").$type<GateStatus>().notNull().default("not_started"),
  slaStatus: text("sla_status").$type<SlaStatus>().notNull().default("not_set"),
  owner: text("owner"),
  ownerType: text("owner_type").$type<OwnerType>().notNull().default("unknown"),
  dueAt: integer("due_at", { mode: "number" }),
  startedAt: integer("started_at", { mode: "number" }),
  finishedAt: integer("finished_at", { mode: "number" }),
  sourceArtifactIds: text("source_artifact_ids", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  visibility: text("visibility").$type<Visibility>().notNull().default("internal"),
  provenance: text("provenance", { mode: "json" }).$type<Provenance | null>(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const cbWorkflowSteps = sqliteTable("cb_workflow_steps", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  blueprintId: text("blueprint_id").notNull(),
  stepKey: text("step_key").notNull(),
  title: text("title").notNull(),
  position: integer("position").notNull(),
  owner: text("owner"),
  ownerType: text("owner_type").$type<OwnerType>().notNull().default("unknown"),
  status: text("status")
    .$type<WorkflowStepStatus>()
    .notNull()
    .default("not_started"),
  gateStatus: text("gate_status").$type<GateStatus>().notNull().default("not_started"),
  slaStatus: text("sla_status").$type<SlaStatus>().notNull().default("not_set"),
  dueAt: integer("due_at", { mode: "number" }),
  evidenceArtifactIds: text("evidence_artifact_ids", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  requiredArtifact: text("required_artifact"),
  completedAt: integer("completed_at", { mode: "number" }),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const cbArtifactLinks = sqliteTable("cb_artifact_links", {
  id: text("id").primaryKey(),
  artifactId: text("artifact_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  relationship: text("relationship").notNull(),
  confidence: real("confidence").notNull().default(1),
  rationale: text("rationale"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const cbWatchers = sqliteTable("cb_watchers", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  sourceIds: text("source_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
  triggerType: text("trigger_type").$type<WatcherTriggerType>().notNull().default("manual"),
  schedule: text("schedule"),
  eventFilter: text("event_filter"),
  scopeQuery: text("scope_query"),
  owner: text("owner"),
  ownerType: text("owner_type").$type<OwnerType>().notNull().default("unknown"),
  targetWorkflowBlueprintId: text("target_workflow_blueprint_id"),
  riskClass: text("risk_class").$type<RiskClass>().notNull().default("unknown"),
  actionPolicy: text("action_policy")
    .$type<ActionPolicy>()
    .notNull()
    .default("observe_only"),
  status: text("status").$type<WatcherStatus>().notNull().default("active"),
  lastRunAt: integer("last_run_at", { mode: "number" }),
  nextRunAt: integer("next_run_at", { mode: "number" }),
  failurePolicy: text("failure_policy"),
  outputPolicy: text("output_policy"),
  visibility: text("visibility").$type<Visibility>().notNull().default("internal"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const cbWatcherRuns = sqliteTable("cb_watcher_runs", {
  id: text("id").primaryKey(),
  watcherId: text("watcher_id").notNull(),
  startedAt: integer("started_at", { mode: "number" }).notNull(),
  finishedAt: integer("finished_at", { mode: "number" }),
  status: text("status").$type<WatcherRunStatus>().notNull().default("running"),
  triggerRef: text("trigger_ref"),
  sourceIds: text("source_ids", { mode: "json" }).$type<string[]>().notNull().default([]),
  artifactsCreated: text("artifacts_created", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  signalsCreated: text("signals_created", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  alignmentFindingsCreated: text("alignment_findings_created", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  workItemsCreated: text("work_items_created", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  guidanceCreated: text("guidance_created", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  workflowRunsLinked: text("workflow_runs_linked", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  errorSummary: text("error_summary"),
  actionPolicy: text("action_policy")
    .$type<ActionPolicy>()
    .notNull()
    .default("observe_only"),
  riskClass: text("risk_class").$type<RiskClass>().notNull().default("unknown"),
  provenance: text("provenance", { mode: "json" }).$type<Provenance | null>(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});
