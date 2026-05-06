// --- Agent ---

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  model: string | null;
  filePath: string;
  project: string | null;
  frente: string | null;
  modes: string[];
  updatedAt: number;
}

// --- Job ---

export type JobType = "agent" | "orchestrator" | "skill";
export type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface Job {
  id: string;
  agentId: string | null;
  type: JobType;
  objective: string;
  mode: string | null;
  status: JobStatus;
  exitCode: number | null;
  logPath: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  createdAt: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
}

export interface CreateJobRequest {
  type: JobType;
  agentId?: string;
  mode?: string;
  projectPath?: string;
  objective: string;
}

// --- Cost ---

export interface CostEntry {
  id: string;
  jobId: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  createdAt: number;
}

export interface CostSummary {
  totalCostUsd: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalJobs: number;
  period: { start: number; end: number };
}

export interface CostByAgent {
  agentId: string;
  agentName: string;
  totalCostUsd: number;
  totalJobs: number;
}

export interface CostByDay {
  date: string;
  costUsd: number;
  jobs: number;
}

// --- Schedule ---

export interface Schedule {
  name: string;
  service: string;
  description: string;
  enabled: boolean;
  active: boolean;
  nextRun: number | null;
  lastRun: number | null;
  onCalendar: string | null;
  execStart: string | null;
}

// --- HITL ---

export type HitlStatus = "pending" | "responded" | "expired";

export interface HitlRequest {
  id: string;
  jobId: string | null;
  agentId: string | null;
  question: string;
  context: Record<string, unknown> | null;
  status: HitlStatus;
  response: string | null;
  createdAt: number;
  respondedAt: number | null;
}

// --- Workspace ---

export interface Workspace {
  id: string;
  name: string;
  path: string;
  description: string | null;
  icon: string | null;
  group: string | null;
}

// --- Session ---

export type SessionStatus = "active" | "closed";

export interface Session {
  id: string;
  workspaceId: string;
  agentId: string;
  title: string | null;
  status: SessionStatus;
  totalCostUsd: number;
  totalTokensIn: number;
  totalTokensOut: number;
  messageCount: number;
  createdAt: number;
  lastActiveAt: number;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
  createdAt: number;
}

export interface CreateSessionRequest {
  workspaceId: string;
  title?: string;
  permissionMode?: PermissionMode;
}

export interface SendMessageRequest {
  content: string;
}

// --- Agent Health ---

export interface AgentHealth {
  agentId: string;
  totalCost7d: number;
  totalJobs7d: number;
  failRate: number;
  avgDurationMs: number;
  costTrendPct: number;
  durationTrendPct: number;
}

// --- WebSocket messages ---

export type WsMessage =
  | { type: "log"; line: string; stream: "stdout" | "stderr" }
  | { type: "job_complete"; status: JobStatus; exitCode: number | null; costUsd: number }
  | { type: "hitl_request"; hitlId: string; question: string }
  | { type: "error"; message: string };

export type SessionWsMessage =
  | { type: "chunk"; content: string }
  | { type: "done"; messageId: string; costUsd: number; durationMs: number }
  | { type: "error"; message: string }
  | { type: "status"; isProcessing: boolean };

// --- Briefing ---

export interface BriefingHighlight {
  kind: "failure" | "success" | "active" | "info";
  workspace: string | null;
  workspaceName: string | null;
  title: string;
  detail: string | null;
  timestamp: number;
  costUsd: number;
  link: { type: "session" | "job"; id: string };
}

export interface BriefingSection {
  title: string;
  icon: "alert" | "check" | "activity" | "info";
  items: BriefingHighlight[];
}

export interface Briefing {
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

// --- Company Brain ---

export type CompanyBrainArea =
  | "strategy"
  | "development"
  | "operations"
  | "product"
  | "marketing"
  | "sales"
  | "finance"
  | "people"
  | "customer"
  | "platform"
  | "unknown";

export type OwnerType = "human" | "team" | "agent" | "system" | "unknown";
export type Visibility = "internal" | "restricted" | "public";
export type SourceType =
  | "local_doc"
  | "github_issue"
  | "github_repo"
  | "git"
  | "slack"
  | "meeting"
  | "manual"
  | "runtime"
  | "other";
export type SourceStatus = "active" | "paused" | "error" | "archived";
export type HealthStatus = "healthy" | "stale" | "error" | "unknown";
export type ReviewStatus = "pending" | "approved" | "rejected" | "needs_review";
export type PriorityStatus = "active" | "paused" | "done" | "archived";
export type GoalStatus =
  | "not_started"
  | "on_track"
  | "at_risk"
  | "blocked"
  | "done"
  | "cancelled";
export type WorkItemStatus =
  | "new"
  | "triage"
  | "planned"
  | "in_progress"
  | "review"
  | "qa"
  | "security_review"
  | "ready_to_deploy"
  | "deployed"
  | "monitoring"
  | "done"
  | "blocked"
  | "needs_human"
  | "reopened"
  | "cancelled"
  | "rolled_back";
export type RiskClass = "A" | "B" | "C" | "unknown";
export type WorkflowStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "archived";
export type WorkflowRunStatus =
  | "planned"
  | "running"
  | "blocked"
  | "needs_human"
  | "completed"
  | "cancelled"
  | "rolled_back";
export type GateStatus =
  | "not_started"
  | "pending"
  | "passed"
  | "failed"
  | "waived"
  | "blocked";
export type SlaStatus = "on_track" | "at_risk" | "breached" | "not_set";
export type WorkflowStepStatus =
  | "not_started"
  | "running"
  | "blocked"
  | "completed"
  | "skipped";
export type WatcherTriggerType =
  | "manual"
  | "schedule"
  | "webhook"
  | "polling"
  | "event";
export type WatcherStatus = "active" | "paused" | "error" | "archived";
export type WatcherRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";
export type ActionPolicy =
  | "observe_only"
  | "create_artifacts"
  | "create_work_items"
  | "request_human"
  | "writeback_allowed";
export type SignalSource =
  | "feedback"
  | "telemetry"
  | "transcript"
  | "error"
  | "support"
  | "qa";
export type SignalScope = "tenant" | "vertical" | "core";
export type SignalEntityType =
  | "user"
  | "school"
  | "teacher"
  | "flow"
  | "screen"
  | "job";
export type SignalSeverity = "info" | "warn" | "critical";
export type DecisionStatus =
  | "proposed"
  | "accepted"
  | "superseded"
  | "rejected"
  | "archived";
export type AlignmentClassification =
  | "aligned"
  | "weak"
  | "drift"
  | "contradiction"
  | "unknown";
export type GuidanceAudience = "human" | "team" | "agent" | "system";
export type GuidanceStatus =
  | "new"
  | "open"
  | "accepted"
  | "rejected"
  | "done"
  | "ignored";
export type GuidanceFeedbackStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "ignored"
  | "completed";
export type AgentContextType =
  | "spec"
  | "prompt"
  | "playbook"
  | "constraints"
  | "briefing";
export type AgentContextStatus = "draft" | "ready" | "active" | "archived";
export type AgentContextValidationStatus =
  | "unvalidated"
  | "validated"
  | "rejected"
  | "needs_review";
export type ImprovementChangeClass = "A" | "B" | "C" | "unknown";
export type ImprovementProposalStatus =
  | "proposed"
  | "in_validation"
  | "validated"
  | "rejected"
  | "promoted"
  | "archived";
export type PromotionStatus =
  | "not_ready"
  | "candidate"
  | "approved"
  | "rejected"
  | "promoted";

export interface Provenance {
  sourceId?: string;
  rawRef?: string;
  artifactId?: string;
  createdFrom?: string;
  confidence?: number;
  extractedAt?: number;
  humanReviewStatus?: ReviewStatus;
  visibility?: Visibility;
  retentionPolicy?: string;
  notes?: string;
}

export interface Source {
  id: string;
  name: string;
  sourceType: SourceType;
  area: CompanyBrainArea;
  externalRef: string | null;
  status: SourceStatus;
  healthStatus: HealthStatus;
  owner: string | null;
  ownerType: OwnerType;
  visibility: Visibility;
  lastSyncAt: number | null;
  syncError: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateSourceRequest {
  name: string;
  sourceType: SourceType;
  area?: CompanyBrainArea;
  externalRef?: string | null;
  status?: SourceStatus;
  healthStatus?: HealthStatus;
  owner?: string | null;
  ownerType?: OwnerType;
  visibility?: Visibility;
  metadata?: Record<string, unknown> | null;
}

export interface Artifact {
  id: string;
  sourceId: string;
  artifactType: string;
  area: CompanyBrainArea;
  title: string;
  summary: string | null;
  contentRef: string | null;
  rawRef: string;
  author: string | null;
  occurredAt: number;
  ingestedAt: number;
  hash: string;
  visibility: Visibility;
  provenance: Provenance | null;
  humanReviewStatus: ReviewStatus;
  confidence: number;
  metadata: Record<string, unknown> | null;
}

export interface CreateArtifactRequest {
  sourceId: string;
  artifactType?: string;
  area?: CompanyBrainArea;
  title: string;
  summary?: string | null;
  contentRef?: string | null;
  rawRef: string;
  author?: string | null;
  occurredAt?: number;
  hash?: string;
  visibility?: Visibility;
  provenance?: Provenance | null;
  humanReviewStatus?: ReviewStatus;
  confidence?: number;
  metadata?: Record<string, unknown> | null;
}

export interface ImportLocalDocsRequest {
  paths: string[];
  sourceId?: string | null;
  sourceName?: string | null;
  area?: CompanyBrainArea;
  owner?: string | null;
  visibility?: Visibility;
  artifactType?: string;
}

export interface ImportLocalDocsResponse {
  source: Source;
  artifactsCreated: Artifact[];
}

export interface SlackMessageImportItem {
  text: string;
  permalink?: string | null;
  channelId?: string | null;
  channelName?: string | null;
  user?: string | null;
  ts?: string | null;
  threadTs?: string | null;
  occurredAt?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface ImportSlackMessagesRequest {
  messages: SlackMessageImportItem[];
  sourceId?: string | null;
  sourceName?: string | null;
  workspaceName?: string | null;
  area?: CompanyBrainArea;
  owner?: string | null;
  visibility?: Visibility;
}

export interface ImportSlackMessagesResponse {
  source: Source;
  artifactsCreated: Artifact[];
  messagesSeen: number;
}

export interface SyncGitHubIssuesRequest {
  repo: string;
  state?: "open" | "closed" | "all";
  limit?: number;
  sourceId?: string | null;
  sourceName?: string | null;
  area?: CompanyBrainArea;
  owner?: string | null;
  visibility?: Visibility;
  createWorkItems?: boolean;
  priorityId?: string | null;
  goalId?: string | null;
}

export interface SyncGitHubIssuesResponse {
  source: Source;
  artifactsCreated: Artifact[];
  workItemsCreated: WorkItem[];
  issuesSeen: number;
}

export interface StrategicPriority {
  id: string;
  title: string;
  description: string | null;
  area: CompanyBrainArea;
  owner: string | null;
  ownerType: OwnerType;
  status: PriorityStatus;
  timeHorizon: string | null;
  reviewCadence: string | null;
  successCriteria: string | null;
  visibility: Visibility;
  createdAt: number;
  updatedAt: number;
}

export interface CreateStrategicPriorityRequest {
  title: string;
  description?: string | null;
  area?: CompanyBrainArea;
  owner?: string | null;
  ownerType?: OwnerType;
  status?: PriorityStatus;
  timeHorizon?: string | null;
  reviewCadence?: string | null;
  successCriteria?: string | null;
  visibility?: Visibility;
}

export interface Goal {
  id: string;
  priorityId: string | null;
  title: string;
  description: string | null;
  area: CompanyBrainArea;
  owner: string | null;
  ownerType: OwnerType;
  targetMetric: string | null;
  targetValue: string | null;
  currentValue: string | null;
  dueAt: number | null;
  reviewCadence: string | null;
  status: GoalStatus;
  confidence: number;
  slaStatus: SlaStatus;
  visibility: Visibility;
  createdAt: number;
  updatedAt: number;
}

export interface CreateGoalRequest {
  priorityId?: string | null;
  title: string;
  description?: string | null;
  area?: CompanyBrainArea;
  owner?: string | null;
  ownerType?: OwnerType;
  targetMetric?: string | null;
  targetValue?: string | null;
  currentValue?: string | null;
  dueAt?: number | null;
  reviewCadence?: string | null;
  status?: GoalStatus;
  confidence?: number;
  slaStatus?: SlaStatus;
  visibility?: Visibility;
}

export interface Milestone {
  id: string;
  goalId: string | null;
  priorityId: string | null;
  title: string;
  area: CompanyBrainArea;
  owner: string | null;
  ownerType: OwnerType;
  dueAt: number | null;
  status: GoalStatus;
  readyCriteria: string | null;
  evidenceRequired: string | null;
  slaStatus: SlaStatus;
  visibility: Visibility;
  createdAt: number;
  updatedAt: number;
}

export interface CreateMilestoneRequest {
  goalId?: string | null;
  priorityId?: string | null;
  title: string;
  area?: CompanyBrainArea;
  owner?: string | null;
  ownerType?: OwnerType;
  dueAt?: number | null;
  status?: GoalStatus;
  readyCriteria?: string | null;
  evidenceRequired?: string | null;
  slaStatus?: SlaStatus;
  visibility?: Visibility;
}

export interface WorkItem {
  id: string;
  title: string;
  description: string | null;
  area: CompanyBrainArea;
  owner: string | null;
  ownerType: OwnerType;
  status: WorkItemStatus;
  priorityId: string | null;
  goalId: string | null;
  milestoneId: string | null;
  externalProvider: string | null;
  externalId: string | null;
  externalUrl: string | null;
  riskClass: RiskClass;
  dueAt: number | null;
  blockedReason: string | null;
  labels: string[];
  sourceId: string | null;
  artifactId: string | null;
  visibility: Visibility;
  provenance: Provenance | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateWorkItemRequest {
  title: string;
  description?: string | null;
  area?: CompanyBrainArea;
  owner?: string | null;
  ownerType?: OwnerType;
  status?: WorkItemStatus;
  priorityId?: string | null;
  goalId?: string | null;
  milestoneId?: string | null;
  externalProvider?: string | null;
  externalId?: string | null;
  externalUrl?: string | null;
  riskClass?: RiskClass;
  dueAt?: number | null;
  blockedReason?: string | null;
  labels?: string[];
  sourceId?: string | null;
  artifactId?: string | null;
  visibility?: Visibility;
  provenance?: Provenance | null;
}

export interface Decision {
  id: string;
  title: string;
  summary: string | null;
  rationale: string | null;
  area: CompanyBrainArea;
  owner: string | null;
  ownerType: OwnerType;
  status: DecisionStatus;
  decidedAt: number | null;
  sourceArtifactIds: string[];
  priorityIds: string[];
  goalIds: string[];
  visibility: Visibility;
  provenance: Provenance | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateDecisionRequest {
  title: string;
  summary?: string | null;
  rationale?: string | null;
  area?: CompanyBrainArea;
  owner?: string | null;
  ownerType?: OwnerType;
  status?: DecisionStatus;
  decidedAt?: number | null;
  sourceArtifactIds?: string[];
  priorityIds?: string[];
  goalIds?: string[];
  visibility?: Visibility;
  provenance?: Provenance | null;
}

export interface Signal {
  id: string;
  source: SignalSource;
  scope: SignalScope;
  entityType: SignalEntityType;
  entityId: string;
  timestamp: number;
  summary: string;
  rawRef: string;
  severity: SignalSeverity;
  confidence: number;
  tags: string[];
  area: CompanyBrainArea;
  sourceId: string | null;
  artifactId: string | null;
  workItemId: string | null;
  workflowRunId: string | null;
  watcherId: string | null;
  watcherRunId: string | null;
  visibility: Visibility;
  provenance: Provenance | null;
  metadata: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateSignalRequest {
  source: SignalSource;
  scope: SignalScope;
  entityType: SignalEntityType;
  entityId: string;
  timestamp?: number;
  summary: string;
  rawRef: string;
  severity?: SignalSeverity;
  confidence?: number;
  tags?: string[];
  area?: CompanyBrainArea;
  sourceId?: string | null;
  artifactId?: string | null;
  workItemId?: string | null;
  workflowRunId?: string | null;
  watcherId?: string | null;
  watcherRunId?: string | null;
  visibility?: Visibility;
  provenance?: Provenance | null;
  metadata?: Record<string, unknown> | null;
}

export interface AlignmentFinding {
  id: string;
  priorityId: string | null;
  goalId: string | null;
  artifactIds: string[];
  signalIds: string[];
  workItemId: string | null;
  workflowRunId: string | null;
  area: CompanyBrainArea;
  classification: AlignmentClassification;
  rationale: string;
  confidence: number;
  suggestedAction: string | null;
  severity: SignalSeverity;
  visibility: Visibility;
  provenance: Provenance | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateAlignmentFindingRequest {
  priorityId?: string | null;
  goalId?: string | null;
  artifactIds?: string[];
  signalIds?: string[];
  workItemId?: string | null;
  workflowRunId?: string | null;
  area?: CompanyBrainArea;
  classification: AlignmentClassification;
  rationale: string;
  confidence?: number;
  suggestedAction?: string | null;
  severity?: SignalSeverity;
  visibility?: Visibility;
  provenance?: Provenance | null;
}

export interface GuidanceItem {
  id: string;
  audience: GuidanceAudience;
  priorityId: string | null;
  goalId: string | null;
  findingId: string | null;
  signalId: string | null;
  workItemId: string | null;
  workflowRunId: string | null;
  area: CompanyBrainArea;
  title: string;
  action: string;
  dueAt: number | null;
  severity: SignalSeverity;
  status: GuidanceStatus;
  feedbackStatus: GuidanceFeedbackStatus;
  feedbackNote: string | null;
  feedbackAt: number | null;
  generatedFrom: Record<string, unknown> | null;
  visibility: Visibility;
  provenance: Provenance | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateGuidanceItemRequest {
  audience?: GuidanceAudience;
  priorityId?: string | null;
  goalId?: string | null;
  findingId?: string | null;
  signalId?: string | null;
  workItemId?: string | null;
  workflowRunId?: string | null;
  area?: CompanyBrainArea;
  title: string;
  action: string;
  dueAt?: number | null;
  severity?: SignalSeverity;
  status?: GuidanceStatus;
  feedbackStatus?: GuidanceFeedbackStatus;
  feedbackNote?: string | null;
  generatedFrom?: Record<string, unknown> | null;
  visibility?: Visibility;
  provenance?: Provenance | null;
}

export interface UpdateGuidanceItemRequest {
  audience?: GuidanceAudience;
  action?: string;
  dueAt?: number | null;
  severity?: SignalSeverity;
  status?: GuidanceStatus;
  feedbackStatus?: GuidanceFeedbackStatus;
  feedbackNote?: string | null;
}

export interface AgentContext {
  id: string;
  title: string;
  targetAgent: string;
  contextType: AgentContextType;
  sourceKnowledgeIds: string[];
  sourceArtifactIds: string[];
  decisionIds: string[];
  guidanceItemIds: string[];
  workItemIds: string[];
  priorityIds: string[];
  goalIds: string[];
  content: string;
  contentFormat: string;
  status: AgentContextStatus;
  validationStatus: AgentContextValidationStatus;
  visibility: Visibility;
  provenance: Provenance | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateAgentContextRequest {
  title: string;
  targetAgent: string;
  contextType?: AgentContextType;
  sourceKnowledgeIds?: string[];
  sourceArtifactIds?: string[];
  decisionIds?: string[];
  guidanceItemIds?: string[];
  workItemIds?: string[];
  priorityIds?: string[];
  goalIds?: string[];
  content: string;
  contentFormat?: string;
  status?: AgentContextStatus;
  validationStatus?: AgentContextValidationStatus;
  visibility?: Visibility;
  provenance?: Provenance | null;
}

export interface GenerateAgentContextRequest {
  title?: string;
  targetAgent: string;
  contextType?: AgentContextType;
  sourceArtifactIds?: string[];
  decisionIds?: string[];
  guidanceItemIds?: string[];
  workItemIds?: string[];
  priorityIds?: string[];
  goalIds?: string[];
  visibility?: Visibility;
}

export interface ImprovementProposal {
  id: string;
  title: string;
  hypothesis: string;
  area: CompanyBrainArea;
  owner: string | null;
  ownerType: OwnerType;
  signalIds: string[];
  alignmentFindingIds: string[];
  guidanceItemIds: string[];
  agentContextIds: string[];
  sourceArtifactIds: string[];
  workItemIds: string[];
  priorityIds: string[];
  goalIds: string[];
  changeClass: ImprovementChangeClass;
  patchRef: string | null;
  validationPlan: string | null;
  impactReview: string | null;
  status: ImprovementProposalStatus;
  promotionStatus: PromotionStatus;
  visibility: Visibility;
  provenance: Provenance | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateImprovementProposalRequest {
  title: string;
  hypothesis: string;
  area?: CompanyBrainArea;
  owner?: string | null;
  ownerType?: OwnerType;
  signalIds?: string[];
  alignmentFindingIds?: string[];
  guidanceItemIds?: string[];
  agentContextIds?: string[];
  sourceArtifactIds?: string[];
  workItemIds?: string[];
  priorityIds?: string[];
  goalIds?: string[];
  changeClass?: ImprovementChangeClass;
  patchRef?: string | null;
  validationPlan?: string | null;
  impactReview?: string | null;
  status?: ImprovementProposalStatus;
  promotionStatus?: PromotionStatus;
  visibility?: Visibility;
  provenance?: Provenance | null;
}

export interface UpdateImprovementProposalRequest {
  patchRef?: string | null;
  validationPlan?: string | null;
  impactReview?: string | null;
  status?: ImprovementProposalStatus;
  promotionStatus?: PromotionStatus;
}

export interface WorkflowBlueprintStage {
  key: string;
  title: string;
  ownerType: OwnerType;
  gate: string;
  artifactExpected: string;
  riskClass: RiskClass;
}

export interface WorkflowBlueprint {
  id: string;
  title: string;
  description: string | null;
  workflowArea: CompanyBrainArea;
  version: string;
  status: WorkflowStatus;
  owner: string | null;
  ownerType: OwnerType;
  reviewCadence: string | null;
  riskClass: RiskClass;
  stages: WorkflowBlueprintStage[];
  gates: string[];
  requiredArtifacts: string[];
  visibility: Visibility;
  createdAt: number;
  updatedAt: number;
}

export interface CreateWorkflowBlueprintRequest {
  title: string;
  description?: string | null;
  workflowArea?: CompanyBrainArea;
  version?: string;
  status?: WorkflowStatus;
  owner?: string | null;
  ownerType?: OwnerType;
  reviewCadence?: string | null;
  riskClass?: RiskClass;
  stages?: WorkflowBlueprintStage[];
  gates?: string[];
  requiredArtifacts?: string[];
  visibility?: Visibility;
}

export interface WorkflowRun {
  id: string;
  blueprintId: string;
  workItemId: string | null;
  title: string;
  workflowArea: CompanyBrainArea;
  status: WorkflowRunStatus;
  currentStep: string | null;
  gateStatus: GateStatus;
  slaStatus: SlaStatus;
  owner: string | null;
  ownerType: OwnerType;
  dueAt: number | null;
  startedAt: number | null;
  finishedAt: number | null;
  sourceArtifactIds: string[];
  visibility: Visibility;
  provenance: Provenance | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateWorkflowRunRequest {
  blueprintId: string;
  workItemId?: string | null;
  title: string;
  workflowArea?: CompanyBrainArea;
  status?: WorkflowRunStatus;
  currentStep?: string | null;
  gateStatus?: GateStatus;
  slaStatus?: SlaStatus;
  owner?: string | null;
  ownerType?: OwnerType;
  dueAt?: number | null;
  startedAt?: number | null;
  sourceArtifactIds?: string[];
  visibility?: Visibility;
  provenance?: Provenance | null;
}

export interface WorkflowStep {
  id: string;
  runId: string;
  blueprintId: string;
  stepKey: string;
  title: string;
  position: number;
  owner: string | null;
  ownerType: OwnerType;
  status: WorkflowStepStatus;
  gateStatus: GateStatus;
  slaStatus: SlaStatus;
  dueAt: number | null;
  evidenceArtifactIds: string[];
  requiredArtifact: string | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface ArtifactLink {
  id: string;
  artifactId: string;
  targetType: string;
  targetId: string;
  relationship: string;
  confidence: number;
  rationale: string | null;
  createdAt: number;
}

export interface Watcher {
  id: string;
  title: string;
  description: string | null;
  sourceIds: string[];
  triggerType: WatcherTriggerType;
  schedule: string | null;
  eventFilter: string | null;
  scopeQuery: string | null;
  owner: string | null;
  ownerType: OwnerType;
  targetWorkflowBlueprintId: string | null;
  riskClass: RiskClass;
  actionPolicy: ActionPolicy;
  status: WatcherStatus;
  lastRunAt: number | null;
  nextRunAt: number | null;
  failurePolicy: string | null;
  outputPolicy: string | null;
  visibility: Visibility;
  createdAt: number;
  updatedAt: number;
}

export interface CreateWatcherRequest {
  title: string;
  description?: string | null;
  sourceIds?: string[];
  triggerType?: WatcherTriggerType;
  schedule?: string | null;
  eventFilter?: string | null;
  scopeQuery?: string | null;
  owner?: string | null;
  ownerType?: OwnerType;
  targetWorkflowBlueprintId?: string | null;
  riskClass?: RiskClass;
  actionPolicy?: ActionPolicy;
  status?: WatcherStatus;
  nextRunAt?: number | null;
  failurePolicy?: string | null;
  outputPolicy?: string | null;
  visibility?: Visibility;
}

export interface WatcherRun {
  id: string;
  watcherId: string;
  startedAt: number;
  finishedAt: number | null;
  status: WatcherRunStatus;
  triggerRef: string | null;
  sourceIds: string[];
  artifactsCreated: string[];
  signalsCreated: string[];
  alignmentFindingsCreated: string[];
  workItemsCreated: string[];
  guidanceCreated: string[];
  workflowRunsLinked: string[];
  errorSummary: string | null;
  actionPolicy: ActionPolicy;
  riskClass: RiskClass;
  provenance: Provenance | null;
  createdAt: number;
  updatedAt: number;
}

export interface RunWatcherRequest {
  sourceId?: string;
  rawRef?: string;
  title?: string;
  summary?: string;
  workItemId?: string | null;
  workflowRunId?: string | null;
  createWorkItem?: boolean;
  workItemTitle?: string | null;
  externalUrl?: string | null;
  priorityId?: string | null;
  goalId?: string | null;
  signalSource?: SignalSource;
  signalScope?: SignalScope;
  signalEntityType?: SignalEntityType;
  signalEntityId?: string | null;
  signalSeverity?: SignalSeverity;
  signalTags?: string[];
  guidanceAudience?: GuidanceAudience;
  guidanceAction?: string | null;
  guidanceDueAt?: number | null;
}

export interface RunWatcherResponse {
  run: WatcherRun;
  artifact: Artifact;
  signalsCreated: Signal[];
  alignmentFindingsCreated: AlignmentFinding[];
  workItemsCreated: WorkItem[];
  guidanceItemsCreated: GuidanceItem[];
  workflowRunsLinked: string[];
}

export type AdoptionStage =
  | "source_registered"
  | "evidence_only"
  | "work_linked"
  | "workflow_tracked"
  | "workflow_running"
  | "closed_loop"
  | "improving";

export type AdoptionGapKind =
  | "source_unhealthy"
  | "source_without_artifacts"
  | "unlinked_work_item"
  | "pending_gate"
  | "sla_risk"
  | "missing_workflow"
  | "missing_signal"
  | "open_guidance";

export interface AdoptionGap {
  id: string;
  kind: AdoptionGapKind;
  title: string;
  severity: SignalSeverity;
  area: CompanyBrainArea;
  sourceId: string | null;
  targetType: "source" | "work_item" | "workflow_run" | "goal" | "guidance_item";
  targetId: string;
  rationale: string;
}

export interface AdoptionProjectStatus {
  id: string;
  title: string;
  area: CompanyBrainArea;
  owner: string | null;
  sourceType: SourceType;
  healthStatus: HealthStatus;
  stage: AdoptionStage;
  lastActivityAt: number | null;
  sourceIds: string[];
  metrics: {
    artifactCount: number;
    workItemCount: number;
    unlinkedWorkItemCount: number;
    workflowRunCount: number;
    activeWorkflowRunCount: number;
    signalCount: number;
    openGuidanceCount: number;
    improvementProposalCount: number;
    gateBlockedCount: number;
    slaAtRiskCount: number;
  };
  gapKinds: AdoptionGapKind[];
}

export interface CompanyBrainAdoptionDashboard {
  generatedAt: number;
  projects: AdoptionProjectStatus[];
  gaps: AdoptionGap[];
  stats: {
    projectCount: number;
    closedLoopProjectCount: number;
    improvingProjectCount: number;
    sourceHealthIssueCount: number;
    unlinkedWorkItemCount: number;
    pendingGateCount: number;
    slaRiskCount: number;
    openGuidanceCount: number;
  };
}

export type SourceFreshnessStatus =
  | "fresh"
  | "stale"
  | "never_synced"
  | "error"
  | "unknown";

export type SourceHealthIssueKind =
  | "sync_error"
  | "stale"
  | "never_synced"
  | "unknown_health"
  | "no_artifacts"
  | "no_work_items"
  | "no_signals";

export interface SourceHealthSnapshot {
  sourceId: string;
  title: string;
  sourceType: SourceType;
  area: CompanyBrainArea;
  owner: string | null;
  externalRef: string | null;
  healthStatus: HealthStatus;
  freshnessStatus: SourceFreshnessStatus;
  lastSyncAt: number | null;
  lastArtifactAt: number | null;
  lastSignalAt: number | null;
  lastWatcherRunAt: number | null;
  lastActivityAt: number | null;
  syncError: string | null;
  artifactCount: number;
  workItemCount: number;
  workflowRunCount: number;
  signalCount: number;
  watcherCount: number;
  watcherRunCount: number;
  openGuidanceCount: number;
  issueKinds: SourceHealthIssueKind[];
}

export interface CompanyBrainSourceHealthReport {
  generatedAt: number;
  staleAfterMs: number;
  sources: SourceHealthSnapshot[];
  stats: {
    sourceCount: number;
    healthyCount: number;
    staleCount: number;
    errorCount: number;
    unknownCount: number;
    neverSyncedCount: number;
    sourceWithoutArtifactsCount: number;
    sourceWithoutWorkItemsCount: number;
    sourceWithoutSignalsCount: number;
  };
}

export interface CompanyBrainSummary {
  sources: Source[];
  artifacts: Artifact[];
  priorities: StrategicPriority[];
  goals: Goal[];
  milestones: Milestone[];
  decisions: Decision[];
  workItems: WorkItem[];
  workflowBlueprints: WorkflowBlueprint[];
  workflowRuns: WorkflowRun[];
  workflowSteps: WorkflowStep[];
  artifactLinks: ArtifactLink[];
  watchers: Watcher[];
  watcherRuns: WatcherRun[];
  signals: Signal[];
  alignmentFindings: AlignmentFinding[];
  guidanceItems: GuidanceItem[];
  agentContexts: AgentContext[];
  improvementProposals: ImprovementProposal[];
  adoptionDashboard: CompanyBrainAdoptionDashboard;
  sourceHealthReport: CompanyBrainSourceHealthReport;
  stats: {
    sourceCount: number;
    artifactCount: number;
    priorityCount: number;
    goalCount: number;
    decisionCount: number;
    activeDecisionCount: number;
    workItemCount: number;
    unlinkedWorkItemCount: number;
    activeWorkflowRunCount: number;
    gateBlockedCount: number;
    slaAtRiskCount: number;
    watcherCount: number;
    activeWatcherCount: number;
    watcherRunCount: number;
    watcherErrorCount: number;
    signalCount: number;
    alignmentFindingCount: number;
    driftFindingCount: number;
    guidanceItemCount: number;
    openGuidanceCount: number;
    agentContextCount: number;
    readyAgentContextCount: number;
    improvementProposalCount: number;
    promotionCandidateCount: number;
  };
}

// --- Terminal WebSocket messages ---

export type TerminalWsMessage =
  | { type: "output"; data: string }
  | { type: "input"; data: string }
  | { type: "resize"; cols: number; rows: number }
  | { type: "error"; message: string };

// --- Permission Mode ---

export type PermissionMode = "plan" | "acceptEdits" | "full";

// --- API responses ---

export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  total: number;
}

export interface ApiError {
  error: string;
  message: string;
}
