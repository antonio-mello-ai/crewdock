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
  id: string;
  description: string | null;
  onCalendar: string;
  command: string;
  enabled: boolean;
  lastRun: number | null;
  nextRun: number | null;
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

// --- Session ---

export type SessionStatus = "active" | "closed";

export interface Session {
  id: string;
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
  agentId: string;
  title?: string;
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
  | { type: "error"; message: string };

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
