import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { config } from "../config.js";
import * as schema from "./schema.js";

const MIGRATIONS_SQL = `
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  model TEXT,
  file_path TEXT NOT NULL,
  project TEXT,
  frente TEXT,
  modes TEXT DEFAULT '[]',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('agent', 'orchestrator', 'skill')),
  objective TEXT NOT NULL,
  mode TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  exit_code INTEGER,
  log_path TEXT,
  started_at INTEGER,
  finished_at INTEGER,
  created_at INTEGER NOT NULL,
  total_tokens_in INTEGER NOT NULL DEFAULT 0,
  total_tokens_out INTEGER NOT NULL DEFAULT 0,
  total_cost_usd REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cost_entries (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_in INTEGER NOT NULL,
  tokens_out INTEGER NOT NULL,
  cost_usd REAL NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  description TEXT,
  on_calendar TEXT NOT NULL,
  command TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_run INTEGER,
  next_run INTEGER
);

CREATE TABLE IF NOT EXISTS hitl_requests (
  id TEXT PRIMARY KEY,
  job_id TEXT,
  agent_id TEXT,
  question TEXT NOT NULL,
  context TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'expired')),
  response TEXT,
  created_at INTEGER NOT NULL,
  responded_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  title TEXT,
  work_dir TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  total_cost_usd REAL NOT NULL DEFAULT 0,
  total_tokens_in INTEGER NOT NULL DEFAULT 0,
  total_tokens_out INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS session_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  cost_usd REAL NOT NULL DEFAULT 0,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_agent_id ON jobs(agent_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_cost_entries_job_id ON cost_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_hitl_status ON hitl_requests(status);
CREATE INDEX IF NOT EXISTS idx_sessions_agent_id ON sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_messages_session_id ON session_messages(session_id);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

CREATE TABLE IF NOT EXISTS cb_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'unknown',
  external_ref TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  health_status TEXT NOT NULL DEFAULT 'unknown',
  owner TEXT,
  owner_type TEXT NOT NULL DEFAULT 'unknown',
  visibility TEXT NOT NULL DEFAULT 'internal',
  last_sync_at INTEGER,
  sync_error TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cb_artifacts (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL DEFAULT 'manual',
  area TEXT NOT NULL DEFAULT 'unknown',
  title TEXT NOT NULL,
  summary TEXT,
  content_ref TEXT,
  raw_ref TEXT NOT NULL,
  author TEXT,
  occurred_at INTEGER NOT NULL,
  ingested_at INTEGER NOT NULL,
  hash TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'internal',
  provenance TEXT,
  human_review_status TEXT NOT NULL DEFAULT 'pending',
  confidence REAL NOT NULL DEFAULT 1,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS cb_strategic_priorities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  area TEXT NOT NULL DEFAULT 'strategy',
  owner TEXT,
  owner_type TEXT NOT NULL DEFAULT 'human',
  status TEXT NOT NULL DEFAULT 'active',
  time_horizon TEXT,
  review_cadence TEXT,
  success_criteria TEXT,
  visibility TEXT NOT NULL DEFAULT 'internal',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cb_goals (
  id TEXT PRIMARY KEY,
  priority_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  area TEXT NOT NULL DEFAULT 'strategy',
  owner TEXT,
  owner_type TEXT NOT NULL DEFAULT 'human',
  target_metric TEXT,
  target_value TEXT,
  current_value TEXT,
  due_at INTEGER,
  review_cadence TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  confidence REAL NOT NULL DEFAULT 1,
  sla_status TEXT NOT NULL DEFAULT 'not_set',
  visibility TEXT NOT NULL DEFAULT 'internal',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cb_milestones (
  id TEXT PRIMARY KEY,
  goal_id TEXT,
  priority_id TEXT,
  title TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'strategy',
  owner TEXT,
  owner_type TEXT NOT NULL DEFAULT 'human',
  due_at INTEGER,
  status TEXT NOT NULL DEFAULT 'not_started',
  ready_criteria TEXT,
  evidence_required TEXT,
  sla_status TEXT NOT NULL DEFAULT 'not_set',
  visibility TEXT NOT NULL DEFAULT 'internal',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cb_work_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  area TEXT NOT NULL DEFAULT 'unknown',
  owner TEXT,
  owner_type TEXT NOT NULL DEFAULT 'unknown',
  status TEXT NOT NULL DEFAULT 'new',
  priority_id TEXT,
  goal_id TEXT,
  milestone_id TEXT,
  external_provider TEXT,
  external_id TEXT,
  external_url TEXT,
  risk_class TEXT NOT NULL DEFAULT 'unknown',
  due_at INTEGER,
  blocked_reason TEXT,
  labels TEXT NOT NULL DEFAULT '[]',
  source_id TEXT,
  artifact_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'internal',
  provenance TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cb_signals (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'core',
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  summary TEXT NOT NULL,
  raw_ref TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  confidence REAL NOT NULL DEFAULT 1,
  tags TEXT NOT NULL DEFAULT '[]',
  area TEXT NOT NULL DEFAULT 'unknown',
  source_id TEXT,
  artifact_id TEXT,
  work_item_id TEXT,
  workflow_run_id TEXT,
  watcher_id TEXT,
  watcher_run_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'internal',
  provenance TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cb_alignment_findings (
  id TEXT PRIMARY KEY,
  priority_id TEXT,
  goal_id TEXT,
  artifact_ids TEXT NOT NULL DEFAULT '[]',
  signal_ids TEXT NOT NULL DEFAULT '[]',
  work_item_id TEXT,
  workflow_run_id TEXT,
  area TEXT NOT NULL DEFAULT 'unknown',
  classification TEXT NOT NULL DEFAULT 'unknown',
  rationale TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1,
  suggested_action TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  visibility TEXT NOT NULL DEFAULT 'internal',
  provenance TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cb_guidance_items (
  id TEXT PRIMARY KEY,
  audience TEXT NOT NULL DEFAULT 'human',
  priority_id TEXT,
  goal_id TEXT,
  finding_id TEXT,
  signal_id TEXT,
  work_item_id TEXT,
  workflow_run_id TEXT,
  area TEXT NOT NULL DEFAULT 'unknown',
  title TEXT NOT NULL,
  action TEXT NOT NULL,
  due_at INTEGER,
  severity TEXT NOT NULL DEFAULT 'info',
  status TEXT NOT NULL DEFAULT 'open',
  feedback_status TEXT NOT NULL DEFAULT 'pending',
  feedback_note TEXT,
  feedback_at INTEGER,
  generated_from TEXT,
  visibility TEXT NOT NULL DEFAULT 'internal',
  provenance TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cb_workflow_blueprints (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  workflow_area TEXT NOT NULL DEFAULT 'unknown',
  version TEXT NOT NULL DEFAULT 'v0',
  status TEXT NOT NULL DEFAULT 'draft',
  owner TEXT,
  owner_type TEXT NOT NULL DEFAULT 'unknown',
  review_cadence TEXT,
  risk_class TEXT NOT NULL DEFAULT 'unknown',
  stages TEXT NOT NULL DEFAULT '[]',
  gates TEXT NOT NULL DEFAULT '[]',
  required_artifacts TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL DEFAULT 'internal',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cb_workflow_runs (
  id TEXT PRIMARY KEY,
  blueprint_id TEXT NOT NULL,
  work_item_id TEXT,
  title TEXT NOT NULL,
  workflow_area TEXT NOT NULL DEFAULT 'unknown',
  status TEXT NOT NULL DEFAULT 'planned',
  current_step TEXT,
  gate_status TEXT NOT NULL DEFAULT 'not_started',
  sla_status TEXT NOT NULL DEFAULT 'not_set',
  owner TEXT,
  owner_type TEXT NOT NULL DEFAULT 'unknown',
  due_at INTEGER,
  started_at INTEGER,
  finished_at INTEGER,
  source_artifact_ids TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL DEFAULT 'internal',
  provenance TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cb_workflow_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  blueprint_id TEXT NOT NULL,
  step_key TEXT NOT NULL,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  owner TEXT,
  owner_type TEXT NOT NULL DEFAULT 'unknown',
  status TEXT NOT NULL DEFAULT 'not_started',
  gate_status TEXT NOT NULL DEFAULT 'not_started',
  sla_status TEXT NOT NULL DEFAULT 'not_set',
  due_at INTEGER,
  evidence_artifact_ids TEXT NOT NULL DEFAULT '[]',
  required_artifact TEXT,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cb_artifact_links (
  id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relationship TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1,
  rationale TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cb_watchers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  source_ids TEXT NOT NULL DEFAULT '[]',
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  schedule TEXT,
  event_filter TEXT,
  scope_query TEXT,
  owner TEXT,
  owner_type TEXT NOT NULL DEFAULT 'unknown',
  target_workflow_blueprint_id TEXT,
  risk_class TEXT NOT NULL DEFAULT 'unknown',
  action_policy TEXT NOT NULL DEFAULT 'observe_only',
  status TEXT NOT NULL DEFAULT 'active',
  last_run_at INTEGER,
  next_run_at INTEGER,
  failure_policy TEXT,
  output_policy TEXT,
  visibility TEXT NOT NULL DEFAULT 'internal',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cb_watcher_runs (
  id TEXT PRIMARY KEY,
  watcher_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  status TEXT NOT NULL DEFAULT 'running',
  trigger_ref TEXT,
  source_ids TEXT NOT NULL DEFAULT '[]',
  artifacts_created TEXT NOT NULL DEFAULT '[]',
  signals_created TEXT NOT NULL DEFAULT '[]',
  alignment_findings_created TEXT NOT NULL DEFAULT '[]',
  work_items_created TEXT NOT NULL DEFAULT '[]',
  guidance_created TEXT NOT NULL DEFAULT '[]',
  workflow_runs_linked TEXT NOT NULL DEFAULT '[]',
  error_summary TEXT,
  action_policy TEXT NOT NULL DEFAULT 'observe_only',
  risk_class TEXT NOT NULL DEFAULT 'unknown',
  provenance TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cb_sources_type_area ON cb_sources(source_type, area);
CREATE INDEX IF NOT EXISTS idx_cb_artifacts_source_id ON cb_artifacts(source_id);
CREATE INDEX IF NOT EXISTS idx_cb_artifacts_review ON cb_artifacts(human_review_status);
CREATE INDEX IF NOT EXISTS idx_cb_priorities_area_status ON cb_strategic_priorities(area, status);
CREATE INDEX IF NOT EXISTS idx_cb_goals_priority_id ON cb_goals(priority_id);
CREATE INDEX IF NOT EXISTS idx_cb_milestones_goal_id ON cb_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_cb_work_items_status ON cb_work_items(status);
CREATE INDEX IF NOT EXISTS idx_cb_work_items_external ON cb_work_items(external_provider, external_id);
CREATE INDEX IF NOT EXISTS idx_cb_work_items_links ON cb_work_items(priority_id, goal_id);
CREATE INDEX IF NOT EXISTS idx_cb_signals_artifact_id ON cb_signals(artifact_id);
CREATE INDEX IF NOT EXISTS idx_cb_signals_watcher_run_id ON cb_signals(watcher_run_id);
CREATE INDEX IF NOT EXISTS idx_cb_signals_severity ON cb_signals(severity);
CREATE INDEX IF NOT EXISTS idx_cb_alignment_findings_priority_id ON cb_alignment_findings(priority_id);
CREATE INDEX IF NOT EXISTS idx_cb_alignment_findings_classification ON cb_alignment_findings(classification);
CREATE INDEX IF NOT EXISTS idx_cb_guidance_items_status ON cb_guidance_items(status);
CREATE INDEX IF NOT EXISTS idx_cb_guidance_items_finding_id ON cb_guidance_items(finding_id);
CREATE INDEX IF NOT EXISTS idx_cb_workflow_blueprints_area ON cb_workflow_blueprints(workflow_area);
CREATE INDEX IF NOT EXISTS idx_cb_workflow_runs_status ON cb_workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_cb_workflow_runs_work_item_id ON cb_workflow_runs(work_item_id);
CREATE INDEX IF NOT EXISTS idx_cb_workflow_steps_run_id ON cb_workflow_steps(run_id);
CREATE INDEX IF NOT EXISTS idx_cb_artifact_links_target ON cb_artifact_links(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_cb_watchers_status ON cb_watchers(status);
CREATE INDEX IF NOT EXISTS idx_cb_watchers_trigger ON cb_watchers(trigger_type);
CREATE INDEX IF NOT EXISTS idx_cb_watcher_runs_watcher_id ON cb_watcher_runs(watcher_id);
CREATE INDEX IF NOT EXISTS idx_cb_watcher_runs_status ON cb_watcher_runs(status);
`;

let dbInstance: ReturnType<typeof drizzle> | null = null;

const DEVELOPMENT_BLUEPRINT_STAGES = [
  {
    key: "intake",
    title: "Intake / ticket",
    ownerType: "human",
    gate: "problem clear, source registered, priority or unlinked status explicit",
    artifactExpected: "ticket or intake artifact",
    riskClass: "A",
  },
  {
    key: "triage",
    title: "Triagem",
    ownerType: "agent",
    gate: "type, scope, risk class and blast radius classified",
    artifactExpected: "triage note",
    riskClass: "A",
  },
  {
    key: "execution_plan",
    title: "Plano de execucao",
    ownerType: "agent",
    gate: "plan approved or safe-to-run, success and failure criteria defined",
    artifactExpected: "execution plan",
    riskClass: "B",
  },
  {
    key: "implementation",
    title: "Execucao",
    ownerType: "agent",
    gate: "patch produced and touched files registered",
    artifactExpected: "diff or commit candidate",
    riskClass: "B",
  },
  {
    key: "technical_review",
    title: "Revisao tecnica",
    ownerType: "agent",
    gate: "critical blockers absent and warnings classified",
    artifactExpected: "review report",
    riskClass: "B",
  },
  {
    key: "test_plan",
    title: "Plano de testes",
    ownerType: "agent",
    gate: "risk-scaled tests defined",
    artifactExpected: "test plan",
    riskClass: "B",
  },
  {
    key: "automated_tests",
    title: "Testes automatizados",
    ownerType: "agent",
    gate: "relevant suite passes or failure is registered",
    artifactExpected: "test output",
    riskClass: "B",
  },
  {
    key: "visual_qa",
    title: "QA visual / browser",
    ownerType: "agent",
    gate: "expected browser flow validated with evidence",
    artifactExpected: "QA report",
    riskClass: "B",
  },
  {
    key: "security_qa",
    title: "Security QA",
    ownerType: "agent",
    gate: "security findings become tickets or blockers",
    artifactExpected: "security report",
    riskClass: "C",
  },
  {
    key: "deploy_gate",
    title: "Deploy gate",
    ownerType: "human",
    gate: "final tests, rollback and target defined",
    artifactExpected: "deploy checklist",
    riskClass: "C",
  },
  {
    key: "deploy_monitoring",
    title: "Deploy + monitoramento",
    ownerType: "agent",
    gate: "deploy completed and monitored, failures become rollback or tickets",
    artifactExpected: "deploy log / health evidence",
    riskClass: "C",
  },
  {
    key: "closeout",
    title: "Fechamento",
    ownerType: "agent",
    gate: "tickets closed or residual tickets opened",
    artifactExpected: "status updates",
    riskClass: "B",
  },
  {
    key: "official_docs",
    title: "Documentacao oficial",
    ownerType: "agent",
    gate: "docs, changelog or roadmap updated with final state",
    artifactExpected: "official doc update",
    riskClass: "B",
  },
] as const;

function seedCompanyBrain(sqlite: Database.Database) {
  const now = Date.now();
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO cb_workflow_blueprints (
        id, title, description, workflow_area, version, status, owner, owner_type,
        review_cadence, risk_class, stages, gates, required_artifacts,
        visibility, created_at, updated_at
      ) VALUES (
        @id, @title, @description, @workflowArea, @version, @status, @owner, @ownerType,
        @reviewCadence, @riskClass, @stages, @gates, @requiredArtifacts,
        @visibility, @createdAt, @updatedAt
      )`
    )
    .run({
      id: "development-blueprint-v0",
      title: "Development Blueprint v0",
      description:
        "Ticket-to-production workflow with triage, planning, implementation, review, tests, QA, security, deploy, monitoring and official documentation gates.",
      workflowArea: "development",
      version: "v0",
      status: "active",
      owner: "Felhen",
      ownerType: "team",
      reviewCadence: "weekly",
      riskClass: "B",
      stages: JSON.stringify(DEVELOPMENT_BLUEPRINT_STAGES),
      gates: JSON.stringify(DEVELOPMENT_BLUEPRINT_STAGES.map((stage) => stage.gate)),
      requiredArtifacts: JSON.stringify(
        DEVELOPMENT_BLUEPRINT_STAGES.map((stage) => stage.artifactExpected)
      ),
      visibility: "internal",
      createdAt: now,
      updatedAt: now,
    });

  sqlite
    .prepare(
      `INSERT OR IGNORE INTO cb_watchers (
        id, title, description, source_ids, trigger_type, schedule, event_filter,
        scope_query, owner, owner_type, target_workflow_blueprint_id, risk_class,
        action_policy, status, last_run_at, next_run_at, failure_policy,
        output_policy, visibility, created_at, updated_at
      ) VALUES (
        @id, @title, @description, @sourceIds, @triggerType, @schedule, @eventFilter,
        @scopeQuery, @owner, @ownerType, @targetWorkflowBlueprintId, @riskClass,
        @actionPolicy, @status, @lastRunAt, @nextRunAt, @failurePolicy,
        @outputPolicy, @visibility, @createdAt, @updatedAt
      )`
    )
    .run({
      id: "watcher-github-issues-manual-v0",
      title: "GitHub Issues manual watcher v0",
      description:
        "Manual/simulated watcher for GitHub Issues and PR/CI evidence. It observes, records artifacts, and can create internal WorkItems without external writeback.",
      sourceIds: JSON.stringify([]),
      triggerType: "manual",
      schedule: null,
      eventFilter: "github.issue|github.pull_request|github.check_run",
      scopeQuery: "repo:* state:open",
      owner: "Felhen",
      ownerType: "team",
      targetWorkflowBlueprintId: "development-blueprint-v0",
      riskClass: "B",
      actionPolicy: "create_work_items",
      status: "active",
      lastRunAt: null,
      nextRunAt: null,
      failurePolicy: "record_error_no_writeback",
      outputPolicy: "artifact_and_internal_work_item",
      visibility: "internal",
      createdAt: now,
      updatedAt: now,
    });
}

export function getDb() {
  if (!dbInstance) {
    const sqlite = new Database(config.dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    sqlite.exec(MIGRATIONS_SQL);

    // Incremental migrations (safe to re-run)
    const cols = sqlite.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
    const colNames = new Set(cols.map((c) => c.name));
    if (!colNames.has("permission_mode")) {
      sqlite.exec("ALTER TABLE sessions ADD COLUMN permission_mode TEXT NOT NULL DEFAULT 'plan'");
    }
    if (!colNames.has("claude_session_id")) {
      sqlite.exec("ALTER TABLE sessions ADD COLUMN claude_session_id TEXT");
    }

    const watcherRunCols = sqlite.prepare("PRAGMA table_info(cb_watcher_runs)").all() as Array<{
      name: string;
    }>;
    const watcherRunColNames = new Set(watcherRunCols.map((c) => c.name));
    if (!watcherRunColNames.has("alignment_findings_created")) {
      sqlite.exec(
        "ALTER TABLE cb_watcher_runs ADD COLUMN alignment_findings_created TEXT NOT NULL DEFAULT '[]'"
      );
    }

    const guidanceCols = sqlite.prepare("PRAGMA table_info(cb_guidance_items)").all() as Array<{
      name: string;
    }>;
    const guidanceColNames = new Set(guidanceCols.map((c) => c.name));
    if (!guidanceColNames.has("feedback_note")) {
      sqlite.exec("ALTER TABLE cb_guidance_items ADD COLUMN feedback_note TEXT");
    }
    if (!guidanceColNames.has("feedback_at")) {
      sqlite.exec("ALTER TABLE cb_guidance_items ADD COLUMN feedback_at INTEGER");
    }

    seedCompanyBrain(sqlite);

    dbInstance = drizzle(sqlite, { schema });
  }
  return dbInstance;
}
