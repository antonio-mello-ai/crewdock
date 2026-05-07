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
export type StrategyTradeoffKind =
  | "tradeoff"
  | "constraint"
  | "non_goal"
  | "risk"
  | "dependency"
  | "principle";
export type StrategyTradeoffStatus =
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
export type ExternalActionDestination =
  | "github"
  | "slack"
  | "internal"
  | "unknown";
export type ExternalActionKind =
  | "comment"
  | "github_comment"
  | "label"
  | "github_label"
  | "github_status"
  | "github_check"
  | "thread_reply"
  | "slack_thread_reply"
  | "draft"
  | "unknown";
export type ExternalActionApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "blocked";
export type ExternalActionExecutionStatus =
  | "not_started"
  | "blocked"
  | "dry_run"
  | "queued"
  | "completed"
  | "executed"
  | "failed"
  | "cancelled";

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

export interface SyncSlackChannelRequest {
  channelId?: string | null;
  channelName?: string | null;
  sourceId?: string | null;
  sourceName?: string | null;
  workspaceName?: string | null;
  area?: CompanyBrainArea;
  owner?: string | null;
  visibility?: Visibility;
  limit?: number;
  oldest?: string | null;
  latest?: string | null;
  incremental?: boolean;
  includeThreads?: boolean;
  threadLimit?: number;
}

export interface SyncSlackChannelResponse {
  source: Source;
  artifactsCreated: Artifact[];
  messagesSeen: number;
  threadsSeen: number;
  repliesSeen: number;
  incremental: boolean;
  includeThreads: boolean;
  oldestUsed: string | null;
  latestTs: string | null;
  channel: {
    id: string;
    name: string | null;
    isPrivate: boolean;
    isMember: boolean;
  };
  workspace: {
    id: string | null;
    name: string | null;
  };
}

export interface RunFelhenDemoRequest {
  owner?: string | null;
  visibility?: Visibility;
}

export interface RunFelhenDemoResponse {
  source: Source;
  priority: StrategicPriority;
  goal: Goal;
  artifact: Artifact;
  workItem: WorkItem;
  workflowRun: WorkflowRun;
  signal: Signal;
  alignmentFinding: AlignmentFinding;
  guidanceItem: GuidanceItem;
  improvementProposal: ImprovementProposal;
  adoptionDashboard: CompanyBrainAdoptionDashboard;
  sourceHealthReport: CompanyBrainSourceHealthReport;
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

export interface SyncGitHubPrCiRequest {
  repo: string;
  state?: "open" | "closed" | "all";
  limit?: number;
  sourceId?: string | null;
  sourceName?: string | null;
  area?: CompanyBrainArea;
  owner?: string | null;
  visibility?: Visibility;
  createSignals?: boolean;
}

export interface SyncGitHubPrCiResponse {
  source: Source;
  watcherRun: WatcherRun;
  artifactsCreated: Artifact[];
  signalsCreated: Signal[];
  pullRequestsSeen: number;
  checksSeen: number;
  failingChecksSeen: number;
}

export interface SyncGitHubNotificationsRequest {
  all?: boolean;
  participating?: boolean;
  limit?: number;
  sourceId?: string | null;
  sourceName?: string | null;
  area?: CompanyBrainArea;
  owner?: string | null;
  visibility?: Visibility;
  createSignals?: boolean;
}

export interface SyncGitHubNotificationsResponse {
  source: Source;
  watcherRun: WatcherRun;
  artifactsCreated: Artifact[];
  signalsCreated: Signal[];
  notificationsSeen: number;
  unreadSeen: number;
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

export interface StrategyTradeoff {
  id: string;
  title: string;
  summary: string | null;
  rationale: string | null;
  kind: StrategyTradeoffKind;
  area: CompanyBrainArea;
  owner: string | null;
  ownerType: OwnerType;
  status: StrategyTradeoffStatus;
  priorityId: string | null;
  decisionId: string | null;
  sourceArtifactIds: string[];
  acceptedOption: string | null;
  rejectedOptions: string[];
  constraints: string[];
  riskClass: RiskClass;
  visibility: Visibility;
  provenance: Provenance | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateStrategyTradeoffRequest {
  title: string;
  summary?: string | null;
  rationale?: string | null;
  kind?: StrategyTradeoffKind;
  area?: CompanyBrainArea;
  owner?: string | null;
  ownerType?: OwnerType;
  status?: StrategyTradeoffStatus;
  priorityId?: string | null;
  decisionId?: string | null;
  sourceArtifactIds?: string[];
  acceptedOption?: string | null;
  rejectedOptions?: string[];
  constraints?: string[];
  riskClass?: RiskClass;
  visibility?: Visibility;
  provenance?: Provenance | null;
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

export interface UpdateDecisionRequest {
  title?: string;
  summary?: string | null;
  rationale?: string | null;
  owner?: string | null;
  ownerType?: OwnerType;
  status?: DecisionStatus;
  decidedAt?: number | null;
  priorityIds?: string[];
  goalIds?: string[];
  visibility?: Visibility;
  reviewNote?: string | null;
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

export type ArtifactInsightExtractionMode = "decision" | "signal" | "both";

export interface ExtractArtifactInsightsRequest {
  artifactId: string;
  mode?: ArtifactInsightExtractionMode;
  priorityId?: string | null;
  goalId?: string | null;
  workItemId?: string | null;
  owner?: string | null;
  signalSeverity?: SignalSeverity;
  signalSource?: SignalSource;
}

export interface ExtractArtifactInsightsResponse {
  artifact: Artifact;
  decision: Decision | null;
  signal: Signal | null;
  decisionCreated: boolean;
  signalCreated: boolean;
}

export interface ExtractSignalGuidanceRequest {
  signalId: string;
  priorityId?: string | null;
  goalId?: string | null;
  workItemId?: string | null;
  workflowRunId?: string | null;
  classification?: AlignmentClassification;
  audience?: GuidanceAudience;
}

export interface ExtractSignalGuidanceResponse {
  signal: Signal;
  alignmentFinding: AlignmentFinding;
  guidanceItem: GuidanceItem;
  findingCreated: boolean;
  guidanceCreated: boolean;
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

export interface ExternalActionAuditEvent {
  at: number;
  actor: string | null;
  event: string;
  note: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ExternalActionProposal {
  id: string;
  guidanceItemId: string;
  signalId: string | null;
  findingId: string | null;
  workItemId: string | null;
  workflowRunId: string | null;
  title: string;
  rationale: string | null;
  destinationType: ExternalActionDestination;
  destinationRef: string | null;
  actionType: ExternalActionKind;
  payload: Record<string, unknown>;
  riskClass: RiskClass;
  actionPolicy: ActionPolicy;
  policySummary: string;
  approvalStatus: ExternalActionApprovalStatus;
  approvalRequired: boolean;
  requestedBy: string | null;
  approvedBy: string | null;
  approvedAt: number | null;
  rejectionReason: string | null;
  executionStatus: ExternalActionExecutionStatus;
  externalId: string | null;
  externalUrl: string | null;
  errorSummary: string | null;
  rollbackRef: string | null;
  idempotencyKey: string;
  auditTrail: ExternalActionAuditEvent[];
  visibility: Visibility;
  provenance: Provenance | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateExternalActionProposalRequest {
  guidanceItemId: string;
  title?: string | null;
  rationale?: string | null;
  destinationType?: ExternalActionDestination;
  destinationRef?: string | null;
  actionType?: ExternalActionKind;
  payload?: Record<string, unknown>;
  riskClass?: RiskClass;
  actionPolicy?: ActionPolicy;
  requestedBy?: string | null;
  idempotencyKey?: string | null;
  visibility?: Visibility;
}

export interface UpdateExternalActionProposalRequest {
  approvalStatus: "approved" | "rejected";
  actor: string;
  rejectionReason?: string | null;
  note?: string | null;
}

export interface ExecuteExternalActionProposalRequest {
  actor?: string | null;
  retryRationale?: string | null;
}

export interface GitHubCommentWritebackTarget {
  owner: string;
  repo: string;
  fullName: string;
  number: number;
  kind: "issue" | "pull" | "issue_or_pull";
  url: string;
}

export interface GitHubCommentWritebackResponse {
  proposal: ExternalActionProposal;
  target: GitHubCommentWritebackTarget;
  body: string;
  marker: string;
  idempotencyKey: string;
  dryRun: boolean;
  status: "dry_run" | "completed" | "already_completed" | "failed";
  reusedExisting: boolean;
  externalId: string | null;
  externalUrl: string | null;
}

export type GitHubLabelActionMode = "add" | "remove" | "set";

export interface GitHubLabelProposalPreviewResponse {
  proposal: ExternalActionProposal;
  target: GitHubCommentWritebackTarget;
  labels: string[];
  mode: GitHubLabelActionMode;
  currentLabels?: string[];
  missingLabels?: string[];
  idempotencyKey: string;
  dryRun: boolean;
  status: "dry_run" | "preview_only" | "completed" | "already_completed" | "completed_noop" | "failed";
  executionBlocked: boolean;
  mutationAttempted?: boolean;
  externalId?: string | null;
  externalUrl?: string | null;
  policySummary: string;
}

export type GitHubLabelWritebackResponse = GitHubLabelProposalPreviewResponse;

export interface GitHubStatusCheckTarget {
  repo: string;
  owner: string;
  name: string;
  pullNumber: number | null;
  sha: string | null;
  ref: string;
  url: string | null;
}

export interface GitHubStatusCheckProposalPreviewResponse {
  proposal: ExternalActionProposal;
  target: GitHubStatusCheckTarget;
  actionType: "github_status" | "github_check";
  contextName: string;
  state: string | null;
  conclusion: string | null;
  title: string;
  summary: string;
  description: string;
  targetUrl: string | null;
  rationale: string;
  payloadHash: string;
  idempotencyKey: string;
  riskRationale: string;
  dryRun: boolean;
  status: "dry_run" | "preview_only" | "completed" | "already_completed" | "completed_noop" | "failed";
  executionBlocked: boolean;
  mutationAttempted?: boolean;
  externalId?: string | null;
  externalUrl?: string | null;
  policySummary: string;
}

export type GitHubStatusCheckWritebackResponse =
  GitHubStatusCheckProposalPreviewResponse;

export interface SlackThreadReplyWritebackTarget {
  channelId: string;
  threadTs: string;
  url: string;
}

export interface SlackThreadReplyWritebackResponse {
  proposal: ExternalActionProposal;
  target: SlackThreadReplyWritebackTarget;
  body: string;
  marker: string;
  idempotencyKey: string;
  dryRun: boolean;
  status: "dry_run" | "completed" | "already_completed" | "failed";
  reusedExisting: boolean;
  externalId: string | null;
  externalUrl: string | null;
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
  | "open_guidance"
  | "writeback_needs_review";

export type WritebackMaturityStage =
  | "none"
  | "proposal_created"
  | "pending_review"
  | "preview_ready"
  | "executed_or_noop"
  | "blocked_or_failed";

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
  writebackMaturity: {
    stage: WritebackMaturityStage;
    proposalCount: number;
    pendingApprovalCount: number;
    approvedCount: number;
    completedCount: number;
    completedNoopCount: number;
    failedCount: number;
    blockedCount: number;
    duplicatePreventedCount: number;
    mutationAttemptedCount: number;
    staleApprovalCount: number;
    stalePreviewCount: number;
    latestAuditAt: number | null;
    latestExternalUrl: string | null;
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
    writebackProjectCount: number;
    writebackCompletedProjectCount: number;
    writebackNeedsReviewProjectCount: number;
    duplicatePreventedWritebackCount: number;
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

export interface CompanyBrainBriefingSection {
  key:
    | "decisions"
    | "tradeoffs"
    | "open_guidance"
    | "findings"
    | "source_health"
    | "adoption_dashboard"
    | "unlinked_work"
    | "gates_sla"
    | "writeback_safety"
    | "next_steps";
  title: string;
  items: string[];
}

export interface CompanyBrainBriefingSnapshot {
  artifactId: string;
  watcherId: string | null;
  watcherRunId: string | null;
  generatedAt: number;
  title: string;
  summary: string | null;
  rawRef: string;
  actionPolicy: ActionPolicy;
  sections: CompanyBrainBriefingSection[];
  nextSteps: string[];
  gapSignalIds: string[];
  provenance: Provenance | null;
}

export type CompanyBrainReviewItemKind =
  | "decision_candidate"
  | "signal_needs_finding"
  | "finding_needs_guidance"
  | "guidance_needs_feedback";

export interface CompanyBrainReviewQueueItem {
  id: string;
  kind: CompanyBrainReviewItemKind;
  targetType: "decision" | "signal" | "alignment_finding" | "guidance_item";
  targetId: string;
  title: string;
  rationale: string | null;
  status: string;
  severity: SignalSeverity | null;
  area: CompanyBrainArea;
  sourceId: string | null;
  artifactId: string | null;
  signalId: string | null;
  findingId: string | null;
  guidanceItemId: string | null;
  workItemId: string | null;
  workflowRunId: string | null;
  updatedAt: number;
  nextAction: string;
  provenance: Provenance | null;
}

export interface CompanyBrainReviewCohesion {
  generatedAt: number;
  items: CompanyBrainReviewQueueItem[];
  stats: {
    totalItemCount: number;
    pendingDecisionCount: number;
    signalsWithoutFindingCount: number;
    findingsWithoutGuidanceCount: number;
    guidanceNeedingFeedbackCount: number;
    overdueGuidanceCount: number;
    criticalItemCount: number;
  };
}

export type WritebackSafetyItemKind =
  | "completed_external_writeback"
  | "duplicate_avoided"
  | "failed_execution"
  | "approved_ready"
  | "pending_approval"
  | "rejected_proposal"
  | "blocked_proposal";

export type WritebackExecutionReviewStatus =
  | "ready_to_execute"
  | "needs_preview"
  | "needs_reapproval"
  | "retryable_failed"
  | "unsafe_failed"
  | "payload_mismatch"
  | "destination_mismatch"
  | "duplicate_prevented"
  | "completed"
  | "blocked";

export type WritebackExecutionReviewFlag =
  | WritebackExecutionReviewStatus
  | "idempotency_mismatch"
  | "preview_before_approval"
  | "stale_preview"
  | "missing_approval_snapshot"
  | "missing_preview_snapshot"
  | "retry_rationale_required";

export interface WritebackExecutionReview {
  status: WritebackExecutionReviewStatus;
  flags: WritebackExecutionReviewFlag[];
  payloadHashApproved: string | null;
  payloadHashPreview: string | null;
  payloadHashCurrent: string;
  destinationRefApproved: string | null;
  destinationRefPreview: string | null;
  destinationRefCurrent: string | null;
  idempotencyKeyApproved: string | null;
  idempotencyKeyPreview: string | null;
  idempotencyKeyCurrent: string;
  approvedAt: number | null;
  previewAt: number | null;
  previewEvent: string | null;
  actor: string | null;
  rationale: string | null;
  staleAfterMs: number;
}

export interface WritebackRetryPolicy {
  executionStates: Array<ExternalActionExecutionStatus | "already_completed">;
  readRetryPolicy: "automatic_get_only";
  writeRetryPolicy: "no_automatic_post_retry";
  manualRetryRequires: string[];
  terminalStates: ExternalActionExecutionStatus[];
  blockedStates: ExternalActionExecutionStatus[];
}

export interface WritebackAuditReview {
  eventCount: number;
  latestEvent: string | null;
  latestActor: string | null;
  latestAt: number | null;
  executionEvent: string | null;
  blockReasons: string[];
  approvalEventAt: number | null;
  approvalActor: string | null;
  previewEventAt: number | null;
  executionEventAt: number | null;
  duplicatePrevented: boolean;
  completedNoop: boolean;
  mutationAttempted: boolean;
  hasExternalRef: boolean;
  hasError: boolean;
  payloadHashCurrent: string;
  idempotencyKey: string;
  destinationRef: string | null;
  targetSummary: string | null;
  githubStatus: GitHubStatusWritebackEvidence | null;
}

export interface WritebackSafetyQueueItem {
  id: string;
  kind: WritebackSafetyItemKind;
  reviewStatus: WritebackExecutionReviewStatus;
  reviewFlags: WritebackExecutionReviewFlag[];
  executionReview: WritebackExecutionReview;
  auditReview: WritebackAuditReview;
  proposalId: string;
  title: string;
  destinationType: ExternalActionDestination;
  destinationRef: string | null;
  actionType: ExternalActionKind;
  riskClass: RiskClass;
  actionPolicy: ActionPolicy;
  approvalStatus: ExternalActionApprovalStatus;
  executionStatus: ExternalActionExecutionStatus;
  externalId: string | null;
  externalUrl: string | null;
  idempotencyKey: string;
  errorSummary: string | null;
  auditEvent: string | null;
  auditActor: string | null;
  auditAt: number | null;
  updatedAt: number;
  nextAction: string;
}

export type WritebackAdapterKey =
  | "github_comment"
  | "github_label"
  | "github_status_check"
  | "slack_thread_reply"
  | "other";

export interface WritebackAdapterSummary {
  adapter: WritebackAdapterKey;
  proposalCount: number;
  completedCount: number;
  completedNoopCount: number;
  mutationAttemptedCount: number;
  blockedCount: number;
  readyCount: number;
  failedCount: number;
  latestAt: number | null;
}

export interface WritebackDestinationSummary {
  destinationKey: string;
  destinationType: ExternalActionDestination;
  destinationLabel: string;
  proposalCount: number;
  completedCount: number;
  completedNoopCount: number;
  mutationAttemptedCount: number;
  blockedCount: number;
  failedCount: number;
  latestAt: number | null;
}

export interface WritebackTargetObservabilitySummary {
  targetKey: string;
  targetType: "github_repo" | "slack_channel" | "external_target" | "unknown";
  targetLabel: string;
  destinationType: ExternalActionDestination;
  repoPrivate: boolean | null;
  proposalCount: number;
  completedCount: number;
  completedNoopCount: number;
  failedCount: number;
  blockedCount: number;
  mutationAttemptedCount: number;
  duplicateAvoidedCount: number;
  staleApprovalCount: number;
  stalePreviewCount: number;
  needsReviewCount: number;
  adapters: Partial<Record<WritebackAdapterKey, number>>;
  executionStatuses: Partial<Record<ExternalActionExecutionStatus, number>>;
  reviewStatuses: Partial<Record<WritebackExecutionReviewStatus, number>>;
  latestAt: number | null;
  latestExternalUrl: string | null;
  latestTargetSummary: string | null;
}

export interface WritebackProposalTargetReviewItem {
  proposalId: string;
  title: string;
  destinationType: ExternalActionDestination;
  actionType: ExternalActionKind;
  riskClass: RiskClass;
  actionPolicy: ActionPolicy;
  approvalStatus: ExternalActionApprovalStatus;
  executionStatus: ExternalActionExecutionStatus;
  reviewStatus: WritebackExecutionReviewStatus;
  reviewFlags: WritebackExecutionReviewFlag[];
  blockReasons: string[];
  target: {
    targetKey: string;
    targetType: WritebackTargetObservabilitySummary["targetType"];
    targetLabel: string;
    targetSummary: string | null;
    repoPrivate: boolean | null;
    targetProposalCount: number;
    targetNeedsReviewCount: number;
    targetMutationAttemptedCount: number;
    latestExternalUrl: string | null;
  };
  evidence: {
    integrityGapCount: number;
    integrityGapSeverity: SignalSeverity | null;
    integrityGapKinds: WritebackEvidenceIntegrityGapKind[];
    remediationSuggestionCount: number;
    hasGuidance: boolean;
    hasSignal: boolean;
    hasFinding: boolean;
    hasWorkItem: boolean;
    hasWorkflowRun: boolean;
  };
  hashes: {
    approved: string | null;
    preview: string | null;
    current: string;
    matchesApproval: boolean | null;
    matchesPreview: boolean | null;
  };
  refs: {
    destinationApproved: string | null;
    destinationPreview: string | null;
    destinationCurrent: string | null;
    destinationMatchesApproval: boolean | null;
    destinationMatchesPreview: boolean | null;
    externalId: string | null;
    externalUrl: string | null;
    rollbackRef: string | null;
  };
  events: {
    eventCount: number;
    latestEvent: string | null;
    latestAt: number | null;
    approvalEvent: string | null;
    approvalAt: number | null;
    previewEvent: string | null;
    previewAt: number | null;
    executionEvent: string | null;
    executionAt: number | null;
    actor: string | null;
  };
  idempotencyKey: string;
  githubStatus: GitHubStatusWritebackEvidence | null;
  nextAction: string;
  updatedAt: number;
}

export interface CompanyBrainWritebackProposalTargetReview {
  generatedAt: number;
  filters: {
    proposalId: string | null;
    targetKey: string | null;
    destinationType: ExternalActionDestination | null;
    actionType: ExternalActionKind | null;
    riskClass: RiskClass | null;
    reviewStatus: WritebackExecutionReviewStatus | null;
    limit: number;
  };
  items: WritebackProposalTargetReviewItem[];
  targetSummaries: WritebackTargetObservabilitySummary[];
  total: number;
  stats: {
    proposalCount: number;
    targetCount: number;
    needsReviewCount: number;
    blockedCount: number;
    completedCount: number;
    failedCount: number;
    integrityGapCount: number;
    staleApprovalCount: number;
    stalePreviewCount: number;
    mutationAttemptedCount: number;
    duplicateAvoidedCount: number;
  };
}

export type CompanyBrainEvidenceGraphNodeKind =
  | "source"
  | "artifact"
  | "priority"
  | "goal"
  | "work_item"
  | "workflow_run"
  | "signal"
  | "alignment_finding"
  | "guidance_item"
  | "external_action_proposal"
  | "writeback_target";

export interface CompanyBrainEvidenceGraphNode {
  id: string;
  kind: CompanyBrainEvidenceGraphNodeKind;
  entityId: string;
  label: string;
  status: string | null;
  area: CompanyBrainArea | null;
  visibility: Visibility | null;
  externalUrl: string | null;
  rawRef: string | null;
  provenance: Provenance | null;
  updatedAt: number | null;
}

export interface CompanyBrainEvidenceGraphEdge {
  id: string;
  from: string;
  to: string;
  relationship: string;
  label: string;
  confidence: number | null;
  provenance: Provenance | null;
  createdAt: number | null;
}

export interface CompanyBrainEvidenceGraph {
  generatedAt: number;
  filters: {
    rootKind: CompanyBrainEvidenceGraphNodeKind | null;
    rootId: string | null;
    limit: number;
  };
  nodes: CompanyBrainEvidenceGraphNode[];
  edges: CompanyBrainEvidenceGraphEdge[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    sourceCount: number;
    artifactCount: number;
    proposalCount: number;
    targetCount: number;
    orphanNodeCount: number;
  };
}

export interface WritebackOperatingLoopMetrics {
  generatedAt: number;
  staleThresholdMs: number;
  proposalCount: number;
  counts: {
    pendingApproval: number;
    approved: number;
    blocked: number;
    rejected: number;
    failed: number;
    completed: number;
    completedNoop: number;
    duplicatePrevented: number;
    mutationAttempted: number;
    staleApproval: number;
    stalePreview: number;
    previewOnlyBlocked: number;
  };
  rates: {
    blocked: number;
    rejected: number;
    failed: number;
    completed: number;
    completedNoop: number;
    duplicatePrevented: number;
    mutationAttempted: number;
  };
  averageDurationsMs: {
    guidanceToProposal: number | null;
    proposalToApproval: number | null;
    approvalToPreview: number | null;
    previewToExecution: number | null;
    proposalToExecution: number | null;
  };
}

export interface GitHubStatusWritebackEvidence {
  repo: string | null;
  sha: string | null;
  shortSha: string | null;
  context: string | null;
  state: string | null;
  statusId: string | null;
  statusUrl: string | null;
  externalUrl: string | null;
  repoPrivate: boolean | null;
  allowlistMatched: boolean | null;
  existingStatusesRead: boolean;
  existingStatusesReadCount: number | null;
  duplicateDetected: boolean;
  completedNoop: boolean;
  mutationAttempted: boolean;
  response: Record<string, unknown> | null;
}

export interface WritebackAuditTrailEntry {
  proposalId: string;
  adapter: WritebackAdapterKey;
  title: string;
  destinationType: ExternalActionDestination;
  destinationRef: string | null;
  actionType: ExternalActionKind;
  riskClass: RiskClass;
  actionPolicy: ActionPolicy;
  approvalStatus: ExternalActionApprovalStatus;
  executionStatus: ExternalActionExecutionStatus;
  idempotencyKey: string;
  targetSummary: string | null;
  externalId: string | null;
  externalUrl: string | null;
  githubStatus: GitHubStatusWritebackEvidence | null;
  reviewStatus: WritebackExecutionReviewStatus;
  blockReasons: string[];
  event: string;
  actor: string | null;
  at: number;
  note: string | null;
  metadata: Record<string, unknown> | null;
}

export interface CompanyBrainWritebackAuditTrailResponse {
  generatedAt: number;
  filters: {
    adapter: WritebackAdapterKey | null;
    proposalId: string | null;
    guidanceItemId: string | null;
    destinationType: ExternalActionDestination | null;
    actionType: ExternalActionKind | null;
    riskClass: RiskClass | null;
    executionStatus: ExternalActionExecutionStatus | null;
    event: string | null;
    actor: string | null;
    fromAt: number | null;
    toAt: number | null;
    idempotencyKey: string | null;
    externalUrl: string | null;
    search: string | null;
    limit: number;
  };
  items: WritebackAuditTrailEntry[];
  total: number;
}

export type WritebackEvidenceIntegrityGapKind =
  | "missing_guidance_link"
  | "missing_signal_or_finding_link"
  | "missing_work_item_or_workflow_link"
  | "missing_approval_event"
  | "missing_preview_event"
  | "missing_execution_event"
  | "missing_payload_hash"
  | "missing_idempotency_key"
  | "missing_external_ref_after_completed"
  | "stale_preview"
  | "stale_approval"
  | "insufficient_rationale"
  | "incomplete_provenance";

export interface WritebackEvidenceIntegrityGap {
  id: string;
  proposalId: string;
  title: string;
  adapter: WritebackAdapterKey;
  kind: WritebackEvidenceIntegrityGapKind;
  severity: SignalSeverity;
  rationale: string;
  destinationType: ExternalActionDestination;
  actionType: ExternalActionKind;
  riskClass: RiskClass;
  approvalStatus: ExternalActionApprovalStatus;
  executionStatus: ExternalActionExecutionStatus;
  reviewStatus: WritebackExecutionReviewStatus;
  actor: string | null;
  detectedAt: number;
  latestAuditAt: number | null;
}

export interface WritebackEvidenceIntegritySummary {
  total: number;
  criticalCount: number;
  warnCount: number;
  infoCount: number;
  byKind: Record<WritebackEvidenceIntegrityGapKind, number>;
  byAdapter: Record<WritebackAdapterKey, number>;
}

export interface CompanyBrainWritebackEvidenceIntegrityGapsResponse {
  generatedAt: number;
  filters: {
    severity: SignalSeverity | null;
    kind: WritebackEvidenceIntegrityGapKind | null;
    adapter: WritebackAdapterKey | null;
    proposalId: string | null;
    limit: number;
  };
  items: WritebackEvidenceIntegrityGap[];
  total: number;
  summary: WritebackEvidenceIntegritySummary;
}

export type WritebackEvidenceRemediationActionKind =
  | "relink_guidance"
  | "link_signal_or_finding"
  | "link_work_or_workflow"
  | "rerun_hitl_approval"
  | "rerun_preview"
  | "review_execution_audit"
  | "capture_payload_hash"
  | "create_new_proposal_with_idempotency"
  | "attach_external_ref"
  | "refresh_stale_review"
  | "capture_human_rationale"
  | "repair_provenance";

export interface WritebackEvidenceRemediationSuggestion {
  id: string;
  proposalId: string;
  gapId: string;
  gapKind: WritebackEvidenceIntegrityGapKind;
  adapter: WritebackAdapterKey;
  actionKind: WritebackEvidenceRemediationActionKind;
  severity: SignalSeverity;
  title: string;
  suggestedAction: string;
  rationale: string;
  targetField: string | null;
  requiresHumanReview: boolean;
  requiresNewProposal: boolean;
  actionPolicy: "observe_only";
  executionBlocked: true;
  detectedAt: number;
  latestAuditAt: number | null;
}

export interface WritebackEvidenceRemediationSummary {
  total: number;
  criticalCount: number;
  warnCount: number;
  infoCount: number;
  humanReviewCount: number;
  newProposalCount: number;
  byActionKind: Record<WritebackEvidenceRemediationActionKind, number>;
  byGapKind: Record<WritebackEvidenceIntegrityGapKind, number>;
  byAdapter: Record<WritebackAdapterKey, number>;
}

export interface CompanyBrainWritebackEvidenceRemediationSuggestionsResponse {
  generatedAt: number;
  filters: {
    severity: SignalSeverity | null;
    gapKind: WritebackEvidenceIntegrityGapKind | null;
    actionKind: WritebackEvidenceRemediationActionKind | null;
    adapter: WritebackAdapterKey | null;
    proposalId: string | null;
    limit: number;
  };
  items: WritebackEvidenceRemediationSuggestion[];
  total: number;
  summary: WritebackEvidenceRemediationSummary;
}

export interface WritebackEvidencePacket {
  generatedAt: number;
  proposal: ExternalActionProposal;
  guidanceItem: GuidanceItem | null;
  signal: Signal | null;
  alignmentFinding: AlignmentFinding | null;
  workItem: WorkItem | null;
  workflowRun: WorkflowRun | null;
  executionReview: WritebackExecutionReview;
  auditReview: WritebackAuditReview;
  integrityGaps: WritebackEvidenceIntegrityGap[];
  remediationSuggestions: WritebackEvidenceRemediationSuggestion[];
  auditTrail: WritebackAuditTrailEntry[];
  approvalEvent: ExternalActionAuditEvent | null;
  previewEvent: ExternalActionAuditEvent | null;
  executionEvent: ExternalActionAuditEvent | null;
  payloadHashes: {
    approved: string | null;
    preview: string | null;
    current: string;
  };
  destinationRefs: {
    approved: string | null;
    preview: string | null;
    current: string | null;
  };
  idempotencyKeys: {
    approved: string | null;
    preview: string | null;
    current: string;
  };
  githubStatus: GitHubStatusWritebackEvidence | null;
  externalRefs: {
    externalId: string | null;
    externalUrl: string | null;
    rollbackRef: string | null;
  };
  timeline: {
    createdAt: number;
    approvedAt: number | null;
    previewAt: number | null;
    executionAt: number | null;
    updatedAt: number;
  };
}

export interface WritebackEvidencePacketIndexItem {
  proposalId: string;
  title: string;
  destinationType: ExternalActionDestination;
  actionType: ExternalActionKind;
  riskClass: RiskClass;
  approvalStatus: ExternalActionApprovalStatus;
  executionStatus: ExternalActionExecutionStatus;
  reviewStatus: WritebackExecutionReviewStatus;
  auditEventCount: number;
  latestAuditAt: number | null;
  integrityGapCount: number;
  integrityGapSeverity: SignalSeverity | null;
  integrityGapKinds: WritebackEvidenceIntegrityGapKind[];
  hasGuidance: boolean;
  hasSignal: boolean;
  hasFinding: boolean;
  hasWorkItem: boolean;
  hasWorkflowRun: boolean;
  payloadHashCurrent: string;
  targetSummary: string | null;
  externalUrl: string | null;
  exportPath: string;
  updatedAt: number;
}

export interface CompanyBrainWritebackSafetyDashboard {
  generatedAt: number;
  retryPolicy: WritebackRetryPolicy;
  items: WritebackSafetyQueueItem[];
  adapterSummaries: WritebackAdapterSummary[];
  destinationSummaries: WritebackDestinationSummary[];
  targetObservabilitySummaries: WritebackTargetObservabilitySummary[];
  operatingLoopMetrics: WritebackOperatingLoopMetrics;
  evidencePacketIndex: WritebackEvidencePacketIndexItem[];
  evidenceIntegrityGaps: WritebackEvidenceIntegrityGap[];
  evidenceIntegritySummary: WritebackEvidenceIntegritySummary;
  evidenceRemediationSuggestions: WritebackEvidenceRemediationSuggestion[];
  evidenceRemediationSummary: WritebackEvidenceRemediationSummary;
  latestAuditTrail: WritebackAuditTrailEntry[];
  stats: {
    proposalCount: number;
    pendingApprovalCount: number;
    approvedReadyCount: number;
    completedExternalWriteCount: number;
    failedExecutionCount: number;
    rejectedProposalCount: number;
    blockedProposalCount: number;
    previewOnlyBlockedCount: number;
    githubLabelBlockedCount: number;
    githubStatusCheckBlockedCount: number;
    githubCommentWriteCount: number;
    githubLabelWriteCount: number;
    githubLabelNoopCount: number;
    githubStatusWriteCount: number;
    githubStatusNoopCount: number;
    slackThreadReplyWriteCount: number;
    completedNoopCount: number;
    externalMutationAttemptedCount: number;
    duplicateAvoidedCount: number;
    riskCOrUnknownCount: number;
    completedMissingExternalRefCount: number;
    readyToExecuteCount: number;
    needsPreviewCount: number;
    needsReapprovalCount: number;
    retryableFailedCount: number;
    unsafeFailedCount: number;
    payloadMismatchCount: number;
    destinationMismatchCount: number;
  };
}

export interface CompanyBrainSummary {
  sources: Source[];
  artifacts: Artifact[];
  priorities: StrategicPriority[];
  goals: Goal[];
  milestones: Milestone[];
  decisions: Decision[];
  strategyTradeoffs: StrategyTradeoff[];
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
  externalActionProposals: ExternalActionProposal[];
  adoptionDashboard: CompanyBrainAdoptionDashboard;
  sourceHealthReport: CompanyBrainSourceHealthReport;
  lastBriefing: CompanyBrainBriefingSnapshot | null;
  reviewCohesion: CompanyBrainReviewCohesion;
  writebackSafetyDashboard: CompanyBrainWritebackSafetyDashboard;
  writebackProposalTargetReview: CompanyBrainWritebackProposalTargetReview;
  evidenceGraph: CompanyBrainEvidenceGraph;
  stats: {
    sourceCount: number;
    artifactCount: number;
    priorityCount: number;
    goalCount: number;
    decisionCount: number;
    activeDecisionCount: number;
    strategyTradeoffCount: number;
    activeStrategyTradeoffCount: number;
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
    reviewQueueItemCount: number;
    externalActionProposalCount: number;
    pendingExternalActionCount: number;
    approvedExternalActionCount: number;
    blockedExternalActionCount: number;
    completedExternalActionCount: number;
    failedExternalActionCount: number;
    duplicateAvoidedExternalActionCount: number;
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
