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
  | "github_issue_create"
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
  externalActionProposals: ExternalActionProposal[];
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
  triggerSource?: WatcherRunTriggerSource;
  scheduleId?: string | null;
  scheduledAt?: number | null;
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
  triggerSource?: WatcherRunTriggerSource;
  scheduleId?: string | null;
  scheduledAt?: number | null;
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

export type AgentRunDryRunPhaseStatus = "passed" | "failed" | "skipped";

export interface AgentRunDryRunPhase {
  name: string;
  status: AgentRunDryRunPhaseStatus;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  detail: string;
  blockReasons?: string[];
}

export interface AgentRunDryRunRetryPlan {
  attempt: number;
  delayMs: number;
  scheduledAt: number;
  rationale: string;
}

export interface AgentRunDryRunExecutionResult {
  generatedAt: number;
  agentRunId: string;
  startedFromStatus: AgentRunStatus;
  finalStatus: AgentRunStatus;
  finalClaimState: AgentRunClaimState;
  attempt: number;
  totalDurationMs: number;
  phases: AgentRunDryRunPhase[];
  workflow: {
    isValid: boolean;
    errorCount: number;
    warningCount: number;
    repo: string | null;
  };
  workspace: {
    status: WorkspacePreparationStatus;
    workspacePath: string;
    branchName: string;
    blockReasons: string[];
  };
  policy: {
    riskClass: RiskClass;
    actionPolicy: ActionPolicy;
    realExecutionAllowed: boolean;
    blockReasons: string[];
  };
  retryPlan: AgentRunDryRunRetryPlan | null;
  rationale: string[];
  realExecutionPerformed: false;
}

export interface DryRunExecuteAgentRunRequest {
  forceFailure?: boolean;
  forceBlocker?: string;
  treatWorkspaceBlockAsFailure?: boolean;
  actor?: string | null;
  rationale?: string | null;
}

export type WorkspacePreparationStatus =
  | "ready_to_create"
  | "created"
  | "reused"
  | "blocked_dirty"
  | "blocked_invalid_path"
  | "blocked_not_allowlisted"
  | "blocked_safety"
  | "failed";

export interface WorkspaceLocation {
  workspaceRoot: string;
  workspacePath: string;
  workspaceKey: string;
  repoSlug: string;
  branchName: string;
  baseBranch: string;
  vcs: "git_worktree" | "git_clone" | "none";
}

export interface WorkspacePreparationResult {
  generatedAt: number;
  agentRunId: string | null;
  workItemId: string | null;
  status: WorkspacePreparationStatus;
  dryRun: boolean;
  location: WorkspaceLocation;
  exists: boolean;
  isDirty: boolean;
  blockReasons: string[];
  hookSteps: Array<{ phase: "after_create" | "before_run"; command: string | null; willRun: boolean }>;
  rationale: string[];
}

export interface PrepareAgentWorkspaceRequest {
  agentRunId?: string;
  workItemId?: string;
  repo?: string;
  branchOverride?: string;
  workspaceRootOverride?: string;
  baseBranch?: string;
  dryRun?: boolean;
  actor?: string | null;
  rationale?: string | null;
}

export interface AgentWorkspaceStatusResponse {
  generatedAt: number;
  agentRunId: string;
  workItemId: string | null;
  exists: boolean;
  isDirty: boolean;
  branchName: string | null;
  workspacePath: string | null;
  worktreeListed: boolean;
  rationale: string[];
}

export type WorkflowTrackerKind = "github" | "linear" | "jira" | "manual";

export interface WorkflowTrackerConfig {
  kind: WorkflowTrackerKind;
  repo: string | null;
  activeMilestone: string | null;
  activeStates: string[];
  terminalStates: string[];
  apiKeyEnvRef: string | null;
}

export interface WorkflowPollingConfig {
  intervalMs: number;
}

export interface WorkflowWorkspaceConfig {
  root: string;
  vcs: "git_worktree" | "git_clone" | "none";
  baseBranch: string;
}

export interface WorkflowAgentConfig {
  command: string;
  args: string[];
  maxConcurrentAgents: number;
  maxTurns: number;
  maxRetryBackoffMs: number;
}

export interface WorkflowCodexConfig {
  approvalPolicy: string;
  stallTimeoutMs: number;
  turnTimeoutMs: number;
  readTimeoutMs: number;
}

export interface WorkflowHooksConfig {
  afterCreate: string | null;
  beforeRun: string | null;
  afterRun: string | null;
  beforeRemove: string | null;
  timeoutMs: number;
}

export interface WorkflowDefinitionConfig {
  tracker: WorkflowTrackerConfig;
  polling: WorkflowPollingConfig;
  workspace: WorkflowWorkspaceConfig;
  agent: WorkflowAgentConfig;
  codex: WorkflowCodexConfig;
  hooks: WorkflowHooksConfig;
}

export interface WorkflowDefinition {
  generatedAt: number;
  source: "repo_workflow_md" | "default" | "inline";
  filePath: string | null;
  raw: string;
  config: WorkflowDefinitionConfig;
  promptTemplate: string;
  errors: string[];
  warnings: string[];
  isValid: boolean;
  branchSuggestionPattern: string;
  workspacePathPattern: string;
}

export interface PreviewWorkflowLoaderRequest {
  filePath?: string;
  rawContent?: string;
  workItemId?: string | null;
}

export type AgentRunStatus =
  | "queued"
  | "claimed"
  | "running"
  | "retrying"
  | "blocked"
  | "pr_opened"
  | "needs_review"
  | "completed"
  | "failed"
  | "cancelled";

export type AgentRunClaimState =
  | "unclaimed"
  | "claimed"
  | "running"
  | "retry_queued"
  | "released";

export type AgentRunRunnerType =
  | "claude_code"
  | "codex"
  | "symphony"
  | "manual"
  | "other";

export interface AgentRun {
  id: string;
  workItemId: string | null;
  workflowRunId: string | null;
  agentContextId: string | null;
  sourceId: string | null;
  repo: string | null;
  branch: string | null;
  workspaceRef: string | null;
  runnerType: AgentRunRunnerType;
  status: AgentRunStatus;
  claimState: AgentRunClaimState;
  attempt: number;
  startedAt: number | null;
  finishedAt: number | null;
  errorSummary: string | null;
  prUrl: string | null;
  externalRunRef: string | null;
  tokensInput: number | null;
  tokensOutput: number | null;
  tokensTotal: number | null;
  costUsd: number | null;
  agentSessionId: string | null;
  agentThreadId: string | null;
  area: CompanyBrainArea;
  riskClass: RiskClass;
  actionPolicy: ActionPolicy;
  visibility: Visibility;
  metadata: Record<string, unknown> | null;
  auditTrail: Array<{
    at: number;
    actor: string | null;
    event: string;
    note: string | null;
    metadata?: Record<string, unknown> | null;
  }>;
  provenance: Provenance | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateAgentRunRequest {
  workItemId?: string | null;
  workflowRunId?: string | null;
  agentContextId?: string | null;
  sourceId?: string | null;
  repo?: string | null;
  branch?: string | null;
  workspaceRef?: string | null;
  runnerType?: AgentRunRunnerType;
  status?: AgentRunStatus;
  claimState?: AgentRunClaimState;
  attempt?: number;
  prUrl?: string | null;
  externalRunRef?: string | null;
  agentSessionId?: string | null;
  agentThreadId?: string | null;
  area?: CompanyBrainArea;
  riskClass?: RiskClass;
  actionPolicy?: ActionPolicy;
  visibility?: Visibility;
  metadata?: Record<string, unknown> | null;
  actor?: string | null;
  rationale?: string | null;
}

export interface UpdateAgentRunRequest {
  status?: AgentRunStatus;
  claimState?: AgentRunClaimState;
  attempt?: number;
  startedAt?: number | null;
  finishedAt?: number | null;
  errorSummary?: string | null;
  prUrl?: string | null;
  externalRunRef?: string | null;
  branch?: string | null;
  workspaceRef?: string | null;
  tokensInput?: number | null;
  tokensOutput?: number | null;
  tokensTotal?: number | null;
  costUsd?: number | null;
  agentSessionId?: string | null;
  agentThreadId?: string | null;
  metadata?: Record<string, unknown> | null;
  actor?: string | null;
  rationale?: string | null;
  event?: string;
}

export interface AgentRunListResponse {
  generatedAt: number;
  total: number;
  filters: {
    status?: AgentRunStatus | null;
    workItemId?: string | null;
    runnerType?: AgentRunRunnerType | null;
    repo?: string | null;
    limit: number;
  };
  items: AgentRun[];
}

export interface AgentRunSummary {
  generatedAt: number;
  totalCount: number;
  byStatus: Record<AgentRunStatus, number>;
  byClaimState: Record<AgentRunClaimState, number>;
  byRunnerType: Record<string, number>;
  blockedCount: number;
  failedCount: number;
  prOpenedCount: number;
  needsReviewCount: number;
  retryingCount: number;
  recentCompletedCount: number;
  staleCount: number;
  recentRuns: AgentRun[];
}

export type SessionResultRunnerType =
  | "claude_code"
  | "codex"
  | "symphony"
  | "manual"
  | "other";

export type SessionResultValidationStatus =
  | "passed"
  | "failed"
  | "skipped"
  | "partial"
  | "unknown";

export type SessionResultOutcome =
  | "completed"
  | "pr_opened"
  | "awaiting_review"
  | "blocked"
  | "failed"
  | "cancelled";

export interface SessionResultValidation {
  kind: string;
  status: SessionResultValidationStatus;
  notes?: string | null;
}

export interface SessionResultBlocker {
  kind: string;
  description: string;
  severity?: SignalSeverity;
}

export interface SessionResultNextStep {
  action: string;
  audience?: GuidanceAudience;
  severity?: SignalSeverity;
}

export interface SubmitSessionResultRequest {
  workItemId?: string | null;
  workflowRunId?: string | null;
  externalIssueRef?: string | null;
  runnerType: SessionResultRunnerType;
  outcome: SessionResultOutcome;
  summary: string;
  detail?: string | null;
  branch?: string | null;
  prUrl?: string | null;
  workspaceRef?: string | null;
  commits?: Array<{ sha: string; message?: string | null }>;
  changedFiles?: string[];
  validations?: SessionResultValidation[];
  blockers?: SessionResultBlocker[];
  nextSteps?: SessionResultNextStep[];
  startedAt?: number | null;
  finishedAt?: number | null;
  tokensInput?: number | null;
  tokensOutput?: number | null;
  tokensTotal?: number | null;
  costUsd?: number | null;
  agentSessionId?: string | null;
  agentThreadId?: string | null;
  area?: CompanyBrainArea;
  visibility?: Visibility;
  actor?: string | null;
}

export interface SubmitSessionResultResponse {
  artifact: Artifact;
  workItem: WorkItem | null;
  signalsCreated: Signal[];
  guidanceItemsCreated: GuidanceItem[];
  workItemUpdated: boolean;
  prLinkRecorded: boolean;
  metadataMerged: Record<string, unknown>;
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

export interface GitHubIssueCreateTarget {
  repo: string;
  owner: string;
  name: string;
  milestoneNumber: number | null;
  milestoneTitle: string | null;
  url: string;
}

export interface GitHubIssueCreateProposalPreviewResponse {
  proposal: ExternalActionProposal;
  target: GitHubIssueCreateTarget;
  title: string;
  body: string;
  labels: string[];
  marker: string;
  idempotencyKey: string;
  payloadHash: string;
  riskRationale: string;
  sourceWorkItemId: string | null;
  sourceGuidanceItemId: string | null;
  dryRun: boolean;
  status:
    | "preview_only"
    | "dry_run"
    | "completed"
    | "already_completed"
    | "completed_noop"
    | "failed";
  executionBlocked: boolean;
  executionBlockReason: string | null;
  mutationAttempted?: boolean;
  externalId?: string | null;
  externalUrl?: string | null;
  policySummary: string;
}

export type GitHubIssueCreateWritebackResponse =
  GitHubIssueCreateProposalPreviewResponse;

export interface GenerateGitHubIssueCreateProposalRequest {
  workItemId?: string | null;
  guidanceItemId?: string | null;
  repo?: string;
  title?: string;
  body?: string;
  labels?: string[];
  milestoneTitle?: string | null;
  milestoneNumber?: number | null;
  riskClass?: RiskClass;
  actionPolicy?: ActionPolicy;
  visibility?: Visibility;
  rationale?: string;
}

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

export interface GenerateDailyAgentHandoffRequest {
  title?: string;
  targetAgent?: string;
  visibility?: Visibility;
}

export interface GenerateDailyAgentHandoffResponse {
  agentContext: AgentContext;
  briefing: CompanyBrainBriefingSnapshot | null;
  gateClosureRitual: CompanyBrainGateClosureRitual;
  operatingCadence: CompanyBrainOperatingCadence;
  sourceHealthReport: CompanyBrainSourceHealthReport;
  openGuidanceCount: number;
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

export type WatcherRunTriggerSource = "manual" | "schedule";

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
  triggerSource?: WatcherRunTriggerSource;
  scheduleId?: string | null;
  scheduledAt?: number | null;
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
  | "writeback_needs_review"
  | "audit_readiness_gap"
  | "watcher_cadence_gap";

export type WritebackMaturityStage =
  | "none"
  | "proposal_created"
  | "pending_review"
  | "preview_ready"
  | "executed_or_noop"
  | "blocked_or_failed";

export type AdoptionAuditReadinessStage =
  | "not_started"
  | "evidence_ready"
  | "review_ready"
  | "execution_ready"
  | "needs_attention";

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
  auditReadiness: {
    stage: AdoptionAuditReadinessStage;
    score: number;
    targetCount: number;
    proposalReviewNeedsActionCount: number;
    evidenceIntegrityGapCount: number;
    remediationSuggestionCount: number;
    evidenceGraphNodeCount: number;
    evidenceGraphOrphanCount: number;
    timelineEventCount: number;
    externalWriteEventCount: number;
    previewBlockedCount: number;
    replayTerminalCount: number;
    retryNeedsRationaleCount: number;
    latestAuditAt: number | null;
    nextAction: string;
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
    auditReadyProjectCount: number;
    auditNeedsAttentionProjectCount: number;
    auditReadinessGapCount: number;
    auditTargetCount: number;
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
  | "no_signals"
  | "watcher_cadence_stale"
  | "watcher_cadence_missing";

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
  lastScheduledWatcherRunAt: number | null;
  nextWatcherRunAt: number | null;
  lastActivityAt: number | null;
  syncError: string | null;
  artifactCount: number;
  workItemCount: number;
  workflowRunCount: number;
  signalCount: number;
  watcherCount: number;
  automatedWatcherCount: number;
  staleWatcherCount: number;
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
    watcherCadenceStaleCount: number;
    sourceWithoutCadenceCount: number;
  };
}

export type CompanyBrainOperatingCadenceStatus =
  | "active"
  | "due"
  | "stale"
  | "not_scheduled"
  | "disabled"
  | "error";

export interface CompanyBrainOperatingCadenceWatcher {
  watcherId: string;
  title: string;
  status: WatcherStatus;
  actionPolicy: ActionPolicy;
  riskClass: RiskClass;
  triggerType: WatcherTriggerType;
  schedule: string | null;
  scheduleId: string | null;
  sourceIds: string[];
  runCount: number;
  scheduledRunCount: number;
  lastRunAt: number | null;
  lastScheduledRunAt: number | null;
  nextRunAt: number | null;
  expectedNextRunAt: number | null;
  staleAfterMs: number | null;
  cadenceStatus: CompanyBrainOperatingCadenceStatus;
  lastRunStatus: WatcherRunStatus | null;
  lastTriggerSource: WatcherRunTriggerSource | null;
  lastTriggerRef: string | null;
  nextAction: string;
}

export type CompanyBrainOperatingLoopStatus =
  | "disabled"
  | "idle"
  | "running"
  | "error";

export interface CompanyBrainOperatingLoopState {
  enabled: boolean;
  status: CompanyBrainOperatingLoopStatus;
  startedAt: number | null;
  lastTickAt: number | null;
  nextTickAt: number | null;
  lastRunAt: number | null;
  lastErrorAt: number | null;
  lastErrorSummary: string | null;
  checkIntervalMs: number;
  initialDelayMs: number;
  scheduleId: string;
  allowedWatcherIds: string[];
  allowedActionPolicy: "observe_only";
  defaultRepo: string;
  lockActive: boolean;
  tickCount: number;
  runCount: number;
  skippedTickCount: number;
  lastDueWatcherIds: string[];
  lastRun: {
    scheduleId: string;
    scheduledAt: number;
    watcherRunsCreated: number;
    artifactsCreated: number;
    signalsCreated: number;
    runs: RunOperatingCadenceResponse["runs"];
  } | null;
}

export interface CompanyBrainOperatingCadence {
  generatedAt: number;
  operatingLoop: CompanyBrainOperatingLoopState;
  watchers: CompanyBrainOperatingCadenceWatcher[];
  stats: {
    watcherCount: number;
    scheduledWatcherCount: number;
    activeScheduledWatcherCount: number;
    staleCadenceCount: number;
    dueCadenceCount: number;
    disabledCadenceCount: number;
    errorCadenceCount: number;
    scheduledRunCount: number;
    manualRunCount: number;
    lastScheduledRunAt: number | null;
    nextScheduledRunAt: number | null;
  };
}

export type GateClosureRitualItemKind =
  | "workflow_gate"
  | "workflow_sla"
  | "goal_sla";

export type GateClosureRitualItemStatus =
  | "ready_for_review"
  | "blocked"
  | "failed"
  | "at_risk"
  | "breached";

export interface GateClosureRitualItem {
  id: string;
  kind: GateClosureRitualItemKind;
  status: GateClosureRitualItemStatus;
  severity: SignalSeverity;
  area: CompanyBrainArea;
  title: string;
  targetType: "workflow_run" | "goal";
  targetId: string;
  workItemId: string | null;
  priorityId: string | null;
  goalId: string | null;
  owner: string | null;
  gateStatus: GateStatus | null;
  slaStatus: SlaStatus | null;
  dueAt: number | null;
  lastActivityAt: number | null;
  rationale: string;
  recommendedAction: string;
}

export interface CompanyBrainGateClosureRitual {
  generatedAt: number;
  overallStatus: "clear" | "attention" | "critical";
  summary: string;
  totals: {
    itemCount: number;
    criticalCount: number;
    warnCount: number;
    pendingGateCount: number;
    slaRiskCount: number;
    dailyClosureReadyCount: number;
  };
  items: GateClosureRitualItem[];
  stats: {
    itemCount: number;
    criticalCount: number;
    warnCount: number;
    workflowGateCount: number;
    workflowSlaCount: number;
    goalSlaCount: number;
    pendingGateCount: number;
    blockedGateCount: number;
    failedGateCount: number;
    slaAtRiskCount: number;
    slaBreachedCount: number;
    dailyClosureReadyCount: number;
  };
}

export interface RunOperatingCadenceRequest {
  mode?: "due" | "all";
  watcherIds?: string[];
  scheduleId?: string | null;
  scheduledAt?: number | null;
  githubPrCi?: Omit<
    SyncGitHubPrCiRequest,
    "triggerSource" | "scheduleId" | "scheduledAt"
  >;
}

export interface RunOperatingCadenceResponse {
  scheduleId: string;
  scheduledAt: number;
  runs: Array<{
    watcherId: string;
    status: WatcherRunStatus | "skipped";
    watcherRunId: string | null;
    artifactId: string | null;
    triggerRef: string | null;
    artifactsCreated: number;
    signalsCreated: number;
    errorSummary: string | null;
  }>;
  artifactsCreated: number;
  signalsCreated: number;
  watcherRunsCreated: number;
  operatingCadence: CompanyBrainOperatingCadence;
}

export interface CompanyBrainBriefingSection {
  key:
    | "decisions"
    | "tradeoffs"
    | "open_guidance"
    | "findings"
    | "source_health"
    | "operating_cadence"
    | "gate_closure"
    | "adoption_dashboard"
    | "unlinked_work"
    | "gates_sla"
    | "writeback_safety"
    | "audit_readiness"
    | "execution_readiness"
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
  | "github_issue_create"
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

export type CompanyBrainTimelineScope = "all" | "proposal" | "target" | "source";

export interface CompanyBrainTimelineEvent {
  id: string;
  at: number;
  scope: CompanyBrainTimelineScope;
  eventType: string;
  entityKind: CompanyBrainEvidenceGraphNodeKind | "watcher_run";
  entityId: string;
  title: string;
  status: string | null;
  detail: string | null;
  actor: string | null;
  sourceId: string | null;
  proposalId: string | null;
  targetKey: string | null;
  externalUrl: string | null;
  rawRef: string | null;
  provenance: Provenance | null;
}

export interface CompanyBrainTimeline {
  generatedAt: number;
  filters: {
    scope: CompanyBrainTimelineScope;
    id: string | null;
    limit: number;
  };
  events: CompanyBrainTimelineEvent[];
  total: number;
  stats: {
    eventCount: number;
    proposalEventCount: number;
    targetEventCount: number;
    sourceEventCount: number;
    externalWriteEventCount: number;
    latestAt: number | null;
    earliestAt: number | null;
  };
}

export type CompanyBrainOperatingSnapshotCardKey =
  | "aios_briefing"
  | "operating_cadence"
  | "gate_closure_ritual"
  | "source_health"
  | "daily_agent_handoff";

export interface CompanyBrainOperatingSnapshotCard {
  key: CompanyBrainOperatingSnapshotCardKey;
  title: string;
  state: string;
  lastUpdatedAt: number | null;
  mainAlert: string;
  primaryActionLabel: string;
  primaryActionKind:
    | "run_briefing"
    | "run_operating_cadence"
    | "review_gate_closure"
    | "review_source_health"
    | "generate_daily_handoff";
}

export interface CompanyBrainNextWorkRecommendation {
  workItem: {
    id: string;
    title: string;
    description: string | null;
    status: WorkItemStatus;
    area: CompanyBrainArea;
    owner: string | null;
    riskClass: RiskClass;
    dueAt: number | null;
    labels: string[];
    externalProvider: string | null;
    externalId: string | null;
    externalUrl: string | null;
    sourceId: string | null;
    artifactId: string | null;
    updatedAt: number;
  };
  rationale: string[];
  priority: { id: string; title: string; status: string } | null;
  goal: { id: string; title: string; status: string; dueAt: number | null } | null;
  acceptanceCriteria: string[];
  linkedEvidence: {
    sourceIds: string[];
    artifactIds: string[];
    signalIds: string[];
    guidanceIds: string[];
  };
  agentPromptMarkdown: string;
  branchSuggestion: string;
}

export interface CompanyBrainNextWork {
  generatedAt: number;
  recommended: CompanyBrainNextWorkRecommendation | null;
  emptyState: { reason: string; nextSteps: string[] } | null;
  candidatesConsidered: number;
  totals: {
    activeWorkItemCount: number;
    blockedWorkItemCount: number;
    doneWorkItemCount: number;
  };
}

export type CommandRouterIntentKind =
  | "create_work_item"
  | "create_guidance"
  | "create_external_action_proposal"
  | "submit_session_result"
  | "route_to_goal_decomposition"
  | "create_github_issue_proposal"
  | "ask_clarification"
  | "noop";

export type CommandRouterTargetKind =
  | "work_item"
  | "guidance_item"
  | "external_action_proposal"
  | "session_result"
  | "goal_decomposition"
  | "github_issue_proposal"
  | "clarification"
  | "none";

export type CommandRouterDecision =
  | "preview_only"
  | "created"
  | "blocked"
  | "needs_clarification"
  | "deferred_to_goal_decomposition";

export interface CommandRouterClassification {
  area: CompanyBrainArea;
  intentKind: CommandRouterIntentKind;
  targetKind: CommandRouterTargetKind;
  riskClass: RiskClass;
  confidence: number;
  primaryAreaSlug: CompanyOperatingMapAreaSlug;
}

export interface CommandRouterClarification {
  question: string;
  options?: string[];
}

export interface CommandRouterRouting {
  decision: CommandRouterDecision;
  rationale: string[];
  nextActionLabel: string;
  nextActionDetail: string;
  createdWorkItemId?: string | null;
  createdGuidanceItemId?: string | null;
  suggestedRoute?: string | null;
  policySummary?: string | null;
  clarifications?: CommandRouterClarification[];
}

export interface RouteCompanyBrainCommandRequest {
  text: string;
  intentHint?: CommandRouterIntentKind;
  area?: CompanyBrainArea;
  preferredTargetKind?: CommandRouterTargetKind;
  riskClassHint?: RiskClass;
  dryRun?: boolean;
  actor?: string | null;
  visibility?: Visibility;
  workItemTitle?: string;
  workItemDescription?: string;
  guidanceTitle?: string;
  guidanceAction?: string;
  guidanceAudience?: GuidanceAudience;
  goalSummary?: string;
}

export interface CompanyBrainCommandRouterResult {
  generatedAt: number;
  request: RouteCompanyBrainCommandRequest;
  classification: CommandRouterClassification;
  routing: CommandRouterRouting;
}

export type CompanyOperatingMapAreaSlug =
  | "strategy"
  | "development"
  | "marketing"
  | "sales"
  | "operations"
  | "finance"
  | "support"
  | "legal_compliance";

export type CompanyOperatingMapAreaStatus =
  | "healthy"
  | "attention"
  | "critical"
  | "empty"
  | "policy_blocked";

export interface CompanyOperatingMapWorkItemSlice {
  workItemId: string;
  title: string;
  status: WorkItemStatus;
  externalProvider: string | null;
  externalId: string | null;
  externalUrl: string | null;
  area: CompanyBrainArea;
  riskClass: RiskClass;
  blockedReason: string | null;
  prUrl: string | null;
  branch: string | null;
  lastSessionResultArtifactId: string | null;
  lastSessionResultOutcome: SessionResultOutcome | null;
}

export interface CompanyOperatingMapSourceSlice {
  sourceId: string;
  name: string;
  sourceType: string;
  healthStatus: string;
  lastSyncAt: number | null;
  externalRef: string | null;
}

export interface CompanyOperatingMapEvidenceSlice {
  artifactId: string;
  title: string;
  artifactType: string;
  occurredAt: number;
  rawRef: string;
  summary: string | null;
}

export interface CompanyOperatingMapGuidanceSlice {
  guidanceId: string;
  title: string;
  action: string;
  audience: GuidanceAudience;
  severity: SignalSeverity;
  status: GuidanceStatus;
  feedbackStatus: GuidanceFeedbackStatus;
  workItemId: string | null;
}

export interface CompanyOperatingMapProposalSlice {
  proposalId: string;
  title: string;
  destinationType: ExternalActionDestination;
  actionType: ExternalActionKind;
  riskClass: RiskClass;
  approvalStatus: ExternalActionApprovalStatus;
  executionStatus: ExternalActionExecutionStatus;
  destinationRef: string | null;
}

export interface CompanyOperatingMapTotals {
  workItemCount: number;
  workItemOpenCount: number;
  workItemReviewCount: number;
  workItemBlockedCount: number;
  workItemDoneCount: number;
  sourceCount: number;
  sourceHealthyCount: number;
  sourceStaleCount: number;
  artifactCount: number;
  recentSessionResultCount: number;
  openGuidanceCount: number;
  pendingProposalCount: number;
  blockedProposalCount: number;
  agentRunCount: number;
  blockedWorkItemCount: number;
  signalsAttentionCount: number;
}

export interface CompanyOperatingMapArea {
  slug: CompanyOperatingMapAreaSlug;
  displayName: string;
  description: string;
  primaryArea: CompanyBrainArea;
  isPrimary: boolean;
  status: CompanyOperatingMapAreaStatus;
  emptyStateReason: string | null;
  totals: CompanyOperatingMapTotals;
  topWorkItems: CompanyOperatingMapWorkItemSlice[];
  sources: CompanyOperatingMapSourceSlice[];
  recentEvidence: CompanyOperatingMapEvidenceSlice[];
  openGuidance: CompanyOperatingMapGuidanceSlice[];
  pendingProposals: CompanyOperatingMapProposalSlice[];
  agentRunsSummary: {
    runningCount: number;
    queuedCount: number;
    failedCount: number;
    completedCount: number;
    note: string;
  };
}

export interface CompanyOperatingMap {
  generatedAt: number;
  primaryAreaSlug: CompanyOperatingMapAreaSlug;
  totals: {
    areaCount: number;
    primaryAreaCount: number;
    healthyAreaCount: number;
    attentionAreaCount: number;
    criticalAreaCount: number;
    emptyAreaCount: number;
    policyBlockedAreaCount: number;
  };
  areas: CompanyOperatingMapArea[];
}

export type AreaBlueprintReadinessStatus =
  | "operational"
  | "dogfooded"
  | "seeded"
  | "stub"
  | "not_started";

export interface AreaBlueprintEntry {
  slug: CompanyOperatingMapAreaSlug;
  displayName: string;
  description: string;
  primaryArea: CompanyBrainArea;
  alternateAreas: CompanyBrainArea[];
  ownerRole: string;
  ownerName: string | null;
  isPrimary: boolean;
  readiness: AreaBlueprintReadinessStatus;
  defaultSourceTypes: string[];
  defaultSourcePatterns: string[];
  activeWorkflowBlueprintRefs: string[];
  expectedAgentRoles: string[];
  defaultGates: string[];
  cadence: string;
  highLevelGoals: string[];
  eligibleForCommandRouter: boolean;
  eligibleForGoalDecomposition: boolean;
  eligibleForAgentRunEvaluation: boolean;
  notes: string;
}

export type OperatingGoalDirection =
  | "increase"
  | "decrease"
  | "maintain"
  | "achieve"
  | "unknown";

export interface OperatingGoalMetric {
  raw: string;
  direction: OperatingGoalDirection;
  metricName: string;
  target: string | null;
}

export interface OperatingGoalAreaPlan {
  slug: CompanyOperatingMapAreaSlug;
  displayName: string;
  ownerRole: string;
  reasonIncluded: string;
  contributionWeight: number;
  defaultSourcePatterns: string[];
  expectedAgentRoles: string[];
  defaultGates: string[];
  cadence: string;
  candidateWorkItems: Array<{
    workItemId: string;
    title: string;
    status: WorkItemStatus;
    externalUrl: string | null;
    relevance: number;
  }>;
  candidateWatchers: string[];
  candidateGuidanceQuestions: string[];
}

export interface OperatingGoalEvaluationCriterion {
  metric: string;
  target: string | null;
  cadence: string;
  evidenceSource: string;
}

export interface OperatingGoalDecomposition {
  generatedAt: number;
  goalText: string;
  metric: OperatingGoalMetric;
  primaryAreaSlug: CompanyOperatingMapAreaSlug;
  areas: OperatingGoalAreaPlan[];
  reviewCadence: string;
  evaluationCriteria: OperatingGoalEvaluationCriterion[];
  recommendedNextActions: string[];
  clarifications: Array<{ question: string; options?: string[] }>;
  policySummary: string;
}

export interface DecomposeOperatingGoalRequest {
  goalText: string;
  primaryAreaSlug?: CompanyOperatingMapAreaSlug;
  targetMetric?: string;
  cadenceHint?: string;
  visibility?: Visibility;
  actor?: string | null;
}

export type AgentRunEvaluationKind =
  | "success"
  | "partial"
  | "failed_context"
  | "failed_tool"
  | "failed_policy"
  | "failed_execution"
  | "failed_validation"
  | "needs_human";

export interface AgentRunEvaluationFinding {
  kind: AgentRunEvaluationKind;
  severity: SignalSeverity;
  rationale: string;
  evidenceArtifactIds: string[];
}

export interface AgentRunEvaluation {
  generatedAt: number;
  evaluationArtifactId: string;
  sessionResultArtifactId: string | null;
  workItemId: string | null;
  workflowRunId: string | null;
  primaryKind: AgentRunEvaluationKind;
  confidence: number;
  rationale: string[];
  signalsCreated: Signal[];
  guidanceItemsCreated: GuidanceItem[];
  improvementProposalSuggested: boolean;
  improvementProposalRationale: string | null;
  reviewedReviewer: string | null;
  evidenceSummary: {
    runnerType: SessionResultRunnerType | null;
    outcome: SessionResultOutcome | null;
    branch: string | null;
    prUrl: string | null;
    validationsFailed: number;
    blockerCount: number;
    nextStepCount: number;
    tokensTotal: number | null;
  };
}

export interface EvaluateAgentRunRequest {
  sessionResultArtifactId?: string;
  workItemId?: string;
  reviewer?: string | null;
  visibility?: Visibility;
  inlineSessionResult?: SubmitSessionResultRequest;
  treatPartialAsFailure?: boolean;
}

export interface AreaBlueprintRegistry {
  generatedAt: number;
  primaryAreaSlug: CompanyOperatingMapAreaSlug;
  entries: AreaBlueprintEntry[];
  totals: {
    entryCount: number;
    operationalCount: number;
    dogfoodedCount: number;
    seededCount: number;
    stubCount: number;
    notStartedCount: number;
    eligibleForCommandRouterCount: number;
    eligibleForGoalDecompositionCount: number;
    eligibleForAgentRunEvaluationCount: number;
  };
}

export interface CompanyBrainOperatingSnapshot {
  generatedAt: number;
  overallStatus: "healthy" | "attention" | "critical" | "error";
  summary: string;
  totals: {
    cardCount: number;
    readyCount: number;
    attentionCount: number;
    criticalCount: number;
    errorCount: number;
    missingCount: number;
  };
  cards: CompanyBrainOperatingSnapshotCard[];
  nextWork: CompanyBrainNextWork;
  lastBriefing: CompanyBrainBriefingSnapshot | null;
  latestAgentContext: AgentContext | null;
  operatingCadence: CompanyBrainOperatingCadence;
  gateClosureRitual: CompanyBrainGateClosureRitual;
  sourceHealthReport: CompanyBrainSourceHealthReport;
  timeline: CompanyBrainTimeline;
  recentEvents: CompanyBrainTimelineEvent[];
}

export type CompanyBrainSavedAuditViewSurface =
  | "audit_trail"
  | "proposal_target_review"
  | "evidence_graph"
  | "timeline";

export interface CompanyBrainSavedAuditView {
  id: string;
  title: string;
  surface: CompanyBrainSavedAuditViewSurface;
  description: string;
  filters: Record<string, string | number | null>;
  itemCount: number;
  exportUrl: string;
  reviewPriority: SignalSeverity;
  updatedAt: number | null;
}

export interface CompanyBrainSavedAuditViews {
  generatedAt: number;
  views: CompanyBrainSavedAuditView[];
  stats: {
    viewCount: number;
    criticalCount: number;
    warnCount: number;
    auditTrailViewCount: number;
    proposalReviewViewCount: number;
    graphViewCount: number;
    timelineViewCount: number;
  };
}

export interface CompanyBrainWritebackPolicySimulationCase {
  id: string;
  title: string;
  input: {
    destinationType: ExternalActionDestination;
    actionType: ExternalActionKind;
    riskClass: RiskClass;
    actionPolicy: ActionPolicy;
  };
  result: {
    approvalStatus: ExternalActionApprovalStatus;
    approvalRequired: boolean;
    executionStatus: ExternalActionExecutionStatus;
    policySummary: string;
  };
  executionBlocked: boolean;
  previewOnly: boolean;
  realExecutorAvailable: boolean;
  requiredGates: string[];
  blockedActions: string[];
  rationale: string;
}

export interface CompanyBrainWritebackPolicySimulator {
  generatedAt: number;
  cases: CompanyBrainWritebackPolicySimulationCase[];
  stats: {
    caseCount: number;
    executableCaseCount: number;
    previewOnlyCaseCount: number;
    blockedCaseCount: number;
    humanApprovalRequiredCount: number;
  };
}

export interface WritebackPreviewReplaySimulationItem {
  proposalId: string;
  title: string;
  destinationType: ExternalActionDestination;
  actionType: ExternalActionKind;
  approvalStatus: ExternalActionApprovalStatus;
  executionStatus: ExternalActionExecutionStatus;
  reviewStatus: WritebackExecutionReviewStatus;
  targetSummary: string | null;
  preview: {
    available: boolean;
    status: string | null;
    executionBlocked: boolean | null;
    mutationAttempted: boolean;
    payloadHash: string | null;
    idempotencyKey: string;
    error: string | null;
  };
  replay: {
    terminalState: boolean;
    safeToPreview: boolean;
    safeToExecuteWithoutNewApproval: boolean;
    duplicatePrevented: boolean;
    completedNoop: boolean;
    automaticWriteRetryAllowed: boolean;
    manualRetryRequiresRationale: boolean;
    reason: string;
  };
  refs: {
    externalId: string | null;
    externalUrl: string | null;
    rollbackRef: string | null;
  };
  latestEvent: string | null;
  updatedAt: number;
}

export interface WritebackPreviewReplaySimulator {
  generatedAt: number;
  items: WritebackPreviewReplaySimulationItem[];
  stats: {
    proposalCount: number;
    previewAvailableCount: number;
    previewBlockedCount: number;
    terminalStateCount: number;
    safeToExecuteWithoutNewApprovalCount: number;
    duplicatePreventedCount: number;
    failedRetryNeedsRationaleCount: number;
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

export type CoreReadinessModuleStatus =
  | "operational"
  | "dogfooded"
  | "read_only_only"
  | "preview_only"
  | "needs_real_adapter"
  | "blocked_by_policy"
  | "missing";

export type CoreReadinessGapImpact =
  | "daily_use"
  | "demo"
  | "design_partner"
  | "polish"
  | "requires_external_mutation";

export interface CoreReadinessModule {
  key: string;
  title: string;
  statuses: CoreReadinessModuleStatus[];
  summary: string;
  evidence: string[];
  gaps: string[];
  nextAction: string;
}

export interface CoreReadinessGap {
  id: string;
  impact: CoreReadinessGapImpact;
  severity: SignalSeverity;
  title: string;
  rationale: string;
  nextAction: string;
  requiresExternalMutation: boolean;
}

export interface CompanyBrainCoreReadiness {
  generatedAt: number;
  overallStatus:
    | "internal_closed_loop_ready"
    | "demo_ready"
    | "daily_use_blocked"
    | "demo_not_ready"
    | "design_partner_not_ready"
    | "needs_foundation_work";
  modules: CoreReadinessModule[];
  gaps: CoreReadinessGap[];
  operatingLoop: CompanyBrainOperatingLoopState;
  stats: {
    moduleCount: number;
    operationalCount: number;
    dogfoodedCount: number;
    readOnlyOnlyCount: number;
    previewOnlyCount: number;
    needsRealAdapterCount: number;
    blockedByPolicyCount: number;
    missingCount: number;
    dailyUseBlockingGapCount: number;
    demoGapCount: number;
    designPartnerGapCount: number;
    polishGapCount: number;
    externalMutationGapCount: number;
    automatedWatcherCount: number;
    staleCadenceCount: number;
    dueCadenceCount: number;
    lastScheduledRunAt: number | null;
    nextScheduledRunAt: number | null;
    operatingLoopEnabled: boolean;
    operatingLoopStatus: CompanyBrainOperatingLoopStatus;
    operatingLoopLastTickAt: number | null;
    operatingLoopLastRunAt: number | null;
    operatingLoopNextTickAt: number | null;
    operatingLoopLastErrorAt: number | null;
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
  operatingCadence: CompanyBrainOperatingCadence;
  gateClosureRitual: CompanyBrainGateClosureRitual;
  lastBriefing: CompanyBrainBriefingSnapshot | null;
  reviewCohesion: CompanyBrainReviewCohesion;
  writebackSafetyDashboard: CompanyBrainWritebackSafetyDashboard;
  writebackProposalTargetReview: CompanyBrainWritebackProposalTargetReview;
  evidenceGraph: CompanyBrainEvidenceGraph;
  timeline: CompanyBrainTimeline;
  savedAuditViews: CompanyBrainSavedAuditViews;
  writebackPolicySimulator: CompanyBrainWritebackPolicySimulator;
  previewReplaySimulator: WritebackPreviewReplaySimulator;
  coreReadiness: CompanyBrainCoreReadiness;
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
