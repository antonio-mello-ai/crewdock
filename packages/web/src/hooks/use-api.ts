"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  Agent,
  Workspace,
  Job,
  Session,
  SessionMessage,
  Schedule,
  Briefing,
  CreateJobRequest,
  CreateSessionRequest,
  SendMessageRequest,
  CostSummary,
  CostByDay,
  AgentHealth,
  HitlRequest,
  ApiResponse,
  ApiListResponse,
  CompanyBrainWritebackAuditTrailResponse,
  CompanyBrainWritebackEvidenceIntegrityGapsResponse,
  CompanyBrainWritebackEvidenceRemediationSuggestionsResponse,
  CompanyBrainOperatingSnapshot,
  CompanyBrainSummary,
  CompanyBrainCommandRouterResult,
  CompanyOperatingMap,
  CreateAgentContextRequest,
  CreateArtifactRequest,
  CreateAlignmentFindingRequest,
  CreateDecisionRequest,
  CreateExternalActionProposalRequest,
  ExecuteExternalActionProposalRequest,
  CreateGoalRequest,
  CreateGuidanceItemRequest,
  CreateImprovementProposalRequest,
  CreateSignalRequest,
  CreateSourceRequest,
  CreateStrategicPriorityRequest,
  CreateStrategyTradeoffRequest,
  CreateWatcherRequest,
  CreateWorkflowRunRequest,
  CreateWorkItemRequest,
  ExtractArtifactInsightsRequest,
  ExtractArtifactInsightsResponse,
  ExtractSignalGuidanceRequest,
  ExtractSignalGuidanceResponse,
  GenerateAgentContextRequest,
  GenerateDailyAgentHandoffRequest,
  GenerateDailyAgentHandoffResponse,
  ImportSlackMessagesRequest,
  ImportSlackMessagesResponse,
  RunFelhenDemoRequest,
  RunFelhenDemoResponse,
  RunOperatingCadenceRequest,
  RunOperatingCadenceResponse,
  RunWatcherRequest,
  RunWatcherResponse,
  SyncGitHubIssuesRequest,
  SyncGitHubIssuesResponse,
  SyncGitHubNotificationsRequest,
  SyncGitHubNotificationsResponse,
  SyncGitHubPrCiRequest,
  SyncGitHubPrCiResponse,
  SyncSlackChannelRequest,
  SyncSlackChannelResponse,
  UpdateDecisionRequest,
  UpdateExternalActionProposalRequest,
  UpdateGuidanceItemRequest,
  UpdateImprovementProposalRequest,
  AlignmentFinding,
  AgentContext,
  Artifact,
  Decision,
  ExternalActionProposal,
  GitHubCommentWritebackResponse,
  GitHubIssueCreateProposalPreviewResponse,
  GitHubIssueCreateWritebackResponse,
  GitHubLabelProposalPreviewResponse,
  GitHubLabelWritebackResponse,
  GitHubStatusCheckProposalPreviewResponse,
  GitHubStatusCheckWritebackResponse,
  Goal,
  GuidanceItem,
  ImprovementProposal,
  Signal,
  SlackThreadReplyWritebackResponse,
  Source,
  StrategicPriority,
  StrategyTradeoff,
  Watcher,
  WritebackEvidencePacket,
  WorkflowRun,
  WorkItem,
} from "@aios/shared";
import { DAEMON_URL } from "@/lib/utils";

export interface CompanyBrainWritebackAuditTrailFilters {
  adapter?: string | null;
  proposalId?: string | null;
  guidanceId?: string | null;
  destinationType?: string | null;
  actionType?: string | null;
  riskClass?: string | null;
  executionStatus?: string | null;
  event?: string | null;
  actor?: string | null;
  fromAt?: number | null;
  toAt?: number | null;
  idempotencyKey?: string | null;
  externalUrl?: string | null;
  search?: string | null;
  limit?: number | string | null;
}

export interface CompanyBrainWritebackEvidenceIntegrityGapFilters {
  severity?: string | null;
  kind?: string | null;
  adapter?: string | null;
  proposalId?: string | null;
  limit?: number | string | null;
}

export interface CompanyBrainWritebackEvidenceRemediationFilters {
  severity?: string | null;
  gapKind?: string | null;
  actionKind?: string | null;
  adapter?: string | null;
  proposalId?: string | null;
  limit?: number | string | null;
}

function writebackAuditTrailQueryString(
  filters:
    | CompanyBrainWritebackAuditTrailFilters
    | CompanyBrainWritebackEvidenceIntegrityGapFilters
    | CompanyBrainWritebackEvidenceRemediationFilters,
  format?: "csv"
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  if (format) params.set("format", format);
  const query = params.toString();
  return query ? `?${query}` : "";
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // credentials: "include" is required so the browser sends CF Access
  // `CF_Authorization` cookie cross-origin (ai.felhen.ai → api.crewdock.ai).
  // The daemon's CORS config allows credentials only from the whitelisted
  // origins — wildcard + credentials is rejected by the browser.
  const res = await fetch(`${DAEMON_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    if (res.status === 401) {
      // CF Access session expired or missing — force re-auth by reloading.
      // Circuit breaker: only reload once per session to avoid an infinite
      // loop if CF Access persistently rejects (clock skew, bad policy,
      // corrupted cookie). After one reload, surface the error.
      if (typeof window !== "undefined") {
        try {
          const tried = sessionStorage.getItem("aios_reload_on_401") === "1";
          if (!tried) {
            sessionStorage.setItem("aios_reload_on_401", "1");
            window.location.reload();
            throw new Error("unauthorized — reloading to re-authenticate");
          }
        } catch {
          // sessionStorage unavailable — fail closed, no reload
        }
      }
      throw new Error("unauthorized — CF Access session invalid");
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API error ${res.status}`);
  }
  // Clear the reload breaker on any successful response so the next 401
  // gets a fresh chance to recover.
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("aios_reload_on_401");
    } catch {
      // ignore
    }
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export function useAgents() {
  return useQuery<ApiListResponse<Agent>>({
    queryKey: ["agents"],
    queryFn: () => api("/api/agents"),
    refetchInterval: 30_000,
  });
}

export function useAgent(id: string | undefined) {
  return useQuery<ApiResponse<Agent>>({
    queryKey: ["agents", id],
    queryFn: () => api(`/api/agents/${id}`),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export interface JobFilters {
  status?: string;
  agentId?: string;
  limit?: number;
  offset?: number;
}

export function useJobs(filters: JobFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "all")
    params.set("status", filters.status);
  if (filters.agentId) params.set("agentId", filters.agentId);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.offset) params.set("offset", String(filters.offset));
  const qs = params.toString();

  return useQuery<ApiListResponse<Job>>({
    queryKey: ["jobs", filters],
    queryFn: () => api(`/api/jobs${qs ? `?${qs}` : ""}`),
    refetchInterval: 5_000,
  });
}

export function useJob(id: string | undefined) {
  return useQuery<ApiResponse<Job>>({
    queryKey: ["jobs", id],
    queryFn: () => api(`/api/jobs/${id}`),
    enabled: !!id,
    refetchInterval: (query) => {
      const job = query.state.data?.data;
      if (job && (job.status === "running" || job.status === "queued"))
        return 3_000;
      return false;
    },
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<Job>, Error, CreateJobRequest>({
    mutationFn: (body) =>
      api("/api/jobs", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useJobLogs(id: string | undefined, enabled: boolean) {
  return useQuery<ApiResponse<{ lines: string[] }>>({
    queryKey: ["jobs", id, "logs"],
    queryFn: () => api(`/api/jobs/${id}/logs`),
    enabled: !!id && enabled,
  });
}

export function useCancelJob() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<Job>, Error, string>({
    mutationFn: (id) => api(`/api/jobs/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

export function useWorkspaces() {
  return useQuery<ApiListResponse<Workspace>>({
    queryKey: ["workspaces"],
    queryFn: () => api("/api/workspaces"),
  });
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export function useSessions(workspaceId?: string) {
  const params = new URLSearchParams();
  if (workspaceId) params.set("workspaceId", workspaceId);
  const qs = params.toString();

  return useQuery<ApiListResponse<Session>>({
    queryKey: ["sessions", { workspaceId }],
    queryFn: () => api(`/api/sessions${qs ? `?${qs}` : ""}`),
    refetchInterval: 10_000,
  });
}

export function useSession(id?: string) {
  return useQuery<ApiResponse<Session>>({
    queryKey: ["sessions", id],
    queryFn: () => api(`/api/sessions/${id}`),
    enabled: !!id,
    refetchInterval: 5_000,
  });
}

export function useSessionMessages(sessionId?: string) {
  return useQuery<ApiListResponse<SessionMessage>>({
    queryKey: ["sessions", sessionId, "messages"],
    queryFn: () => api(`/api/sessions/${sessionId}/messages`),
    enabled: !!sessionId,
    refetchInterval: 2_000,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<Session>, Error, CreateSessionRequest>({
    mutationFn: (body) =>
      api("/api/sessions", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

export function useCancelSession(sessionId: string) {
  return useMutation<ApiResponse<{ cancelled: boolean }>, Error, void>({
    mutationFn: () =>
      api(`/api/sessions/${sessionId}/cancel`, { method: "POST" }),
  });
}

export function useSendMessage(sessionId: string) {
  const qc = useQueryClient();
  return useMutation<ApiResponse<SessionMessage>, Error, SendMessageRequest>({
    mutationFn: (body) =>
      api(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions", sessionId, "messages"] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Briefing
// ---------------------------------------------------------------------------

export function useBriefing(hours: number = 12) {
  return useQuery<ApiResponse<Briefing>>({
    queryKey: ["briefing", hours],
    queryFn: () => api(`/api/briefing?hours=${hours}`),
    refetchInterval: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Schedules
// ---------------------------------------------------------------------------

export function useSchedules() {
  return useQuery<ApiListResponse<Schedule>>({
    queryKey: ["schedules"],
    queryFn: () => api("/api/schedules"),
    refetchInterval: 15_000,
  });
}

export function useRunSchedule() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<{ triggered: boolean }>, Error, string>({
    mutationFn: (name) =>
      api(`/api/schedules/${encodeURIComponent(name)}/run`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
}

export function useToggleSchedule() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<{ enabled: boolean }>,
    Error,
    { name: string; enabled: boolean }
  >({
    mutationFn: ({ name, enabled }) =>
      api(
        `/api/schedules/${encodeURIComponent(name)}/${enabled ? "enable" : "disable"}`,
        { method: "POST" }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
}

export interface CreateScheduleInput {
  name: string;
  description: string;
  command: string;
  onCalendar: string;
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<Schedule>, Error, CreateScheduleInput>({
    mutationFn: (input) =>
      api("/api/schedules", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<{ deleted: boolean }>, Error, string>({
    mutationFn: (name) =>
      api(`/api/schedules/${encodeURIComponent(name)}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });
}

export function useScheduleLogs(name: string | undefined, enabled: boolean) {
  return useQuery<ApiResponse<{ lines: string[] }>>({
    queryKey: ["schedules", name, "logs"],
    queryFn: () =>
      api(`/api/schedules/${encodeURIComponent(name!)}/logs?lines=200`),
    enabled: !!name && enabled,
  });
}

// ---------------------------------------------------------------------------
// Costs
// ---------------------------------------------------------------------------

export function useCostSummary(period: string) {
  return useQuery<ApiResponse<CostSummary>>({
    queryKey: ["costs", "summary", period],
    queryFn: () => api(`/api/costs/summary?period=${period}`),
    refetchInterval: 30_000,
  });
}

export function useCostByDay(period: string) {
  return useQuery<ApiListResponse<CostByDay>>({
    queryKey: ["costs", "by-day", period],
    queryFn: () => api(`/api/costs/by-day?period=${period}`),
    refetchInterval: 30_000,
  });
}

export function useCostHealth() {
  return useQuery<ApiListResponse<AgentHealth>>({
    queryKey: ["costs", "health"],
    queryFn: () => api("/api/costs/health"),
    refetchInterval: 30_000,
  });
}

// ---------------------------------------------------------------------------
// HITL
// ---------------------------------------------------------------------------

export function useHitlRequests(status?: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const qs = params.toString();

  return useQuery<ApiListResponse<HitlRequest>>({
    queryKey: ["hitl", { status }],
    queryFn: () => api(`/api/hitl${qs ? `?${qs}` : ""}`),
    refetchInterval: 5_000,
  });
}

export function useRespondHitl() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<HitlRequest>,
    Error,
    { id: string; response: string }
  >({
    mutationFn: ({ id, response }) =>
      api(`/api/hitl/${id}/respond`, {
        method: "POST",
        body: JSON.stringify({ response }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hitl"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Company Brain
// ---------------------------------------------------------------------------

export function useCompanyBrainSummary() {
  return useQuery<ApiResponse<CompanyBrainSummary>>({
    queryKey: ["company-brain", "summary"],
    queryFn: () => api("/api/company-brain/summary"),
    refetchInterval: 10_000,
  });
}

export function useCompanyBrainOperatingSnapshot() {
  return useQuery<ApiResponse<CompanyBrainOperatingSnapshot>>({
    queryKey: ["company-brain", "operating-snapshot"],
    queryFn: () => api("/api/company-brain/operating-snapshot"),
    refetchInterval: 10_000,
  });
}

export function useCompanyBrainOperatingMap() {
  return useQuery<ApiResponse<CompanyOperatingMap>>({
    queryKey: ["company-brain", "operating-map"],
    queryFn: () => api("/api/company-brain/operating-map"),
    refetchInterval: 15_000,
  });
}

export function useCompanyBrainAgentRunsList(filters?: {
  status?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.limit) params.set("limit", String(filters.limit));
  const query = params.toString();
  return useQuery<ApiResponse<unknown>>({
    queryKey: ["company-brain", "agent-runs", "list", filters],
    queryFn: () =>
      api(`/api/company-brain/agent-runs${query ? `?${query}` : ""}`),
    refetchInterval: 5_000,
  });
}

export function useCompanyBrainAgentRunsSummary() {
  return useQuery<ApiResponse<unknown>>({
    queryKey: ["company-brain", "agent-runs", "summary"],
    queryFn: () => api("/api/company-brain/agent-runs/summary"),
    refetchInterval: 5_000,
  });
}

export function useCompanyBrainAgentRun(id: string | null) {
  return useQuery<ApiResponse<unknown>>({
    queryKey: ["company-brain", "agent-run", id],
    queryFn: () => api(`/api/company-brain/agent-runs/${id}`),
    enabled: Boolean(id),
    refetchInterval: 5_000,
  });
}

export function useCompanyBrainAgentRunLogs(id: string | null, tail = 100) {
  return useQuery<ApiResponse<unknown>>({
    queryKey: ["company-brain", "agent-run", id, "logs", tail],
    queryFn: () =>
      api(`/api/company-brain/agent-runs/${id}/logs?tail=${tail}`),
    enabled: Boolean(id),
    refetchInterval: 4_000,
  });
}

export function useEvaluateCompanyBrainAgentRunPolicy() {
  return useMutation<ApiResponse<unknown>, Error, {
    agentRunId: string;
    actor?: string;
    rationale?: string;
    intent?: "dry_run" | "real_execution";
    commandOverride?: string;
  }>({
    mutationFn: ({ agentRunId, ...rest }) =>
      api(`/api/company-brain/agent-runs/${agentRunId}/policy/evaluate`, {
        method: "POST",
        body: JSON.stringify(rest),
      }),
  });
}

export function useExecuteCompanyBrainAgentRun() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<unknown>, Error, {
    agentRunId: string;
    actor: string;
    rationale: string;
    commandOverride?: string;
    argsOverride?: string[];
    promptOverride?: string;
    timeoutMsOverride?: number;
  }>({
    mutationFn: ({ agentRunId, ...rest }) =>
      api(`/api/company-brain/agent-runs/${agentRunId}/execute`, {
        method: "POST",
        body: JSON.stringify(rest),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["company-brain", "agent-run", vars.agentRunId] });
      qc.invalidateQueries({ queryKey: ["company-brain", "agent-runs"] });
    },
  });
}

export function useCancelCompanyBrainAgentRun() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<unknown>, Error, {
    agentRunId: string;
    actor: string;
    rationale: string;
  }>({
    mutationFn: ({ agentRunId, ...rest }) =>
      api(`/api/company-brain/agent-runs/${agentRunId}/cancel`, {
        method: "POST",
        body: JSON.stringify(rest),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["company-brain", "agent-run", vars.agentRunId] });
      qc.invalidateQueries({ queryKey: ["company-brain", "agent-runs"] });
    },
  });
}

export function useCreateCompanyBrainAgentRun() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<unknown>, Error, Record<string, unknown>>({
    mutationFn: (body) =>
      api("/api/company-brain/agent-runs", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-brain", "agent-runs"] });
    },
  });
}

export function useSubmitCompanyBrainSessionResult() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<unknown>,
    Error,
    Record<string, unknown>
  >({
    mutationFn: (body) =>
      api("/api/company-brain/session-results", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-brain"] });
    },
  });
}

export function useRouteCompanyBrainCommand() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<CompanyBrainCommandRouterResult>,
    Error,
    {
      text: string;
      intentHint?: string;
      area?: string;
      riskClassHint?: string;
      dryRun?: boolean;
      actor?: string;
      workItemTitle?: string;
      workItemDescription?: string;
      guidanceTitle?: string;
      guidanceAction?: string;
      guidanceAudience?: string;
    }
  >({
    mutationFn: (body) =>
      api("/api/company-brain/command-router", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-brain"] });
    },
  });
}

export function useRunCompanyBrainOperatingCadence() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<RunOperatingCadenceResponse>,
    Error,
    RunOperatingCadenceRequest
  >({
    mutationFn: (body) =>
      api("/api/company-brain/operating-cadence/run", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useCompanyBrainWritebackAuditTrail(
  filters: CompanyBrainWritebackAuditTrailFilters
) {
  return useQuery<ApiResponse<CompanyBrainWritebackAuditTrailResponse>>({
    queryKey: ["company-brain", "writeback-audit-trail", filters],
    queryFn: () =>
      api(
        `/api/company-brain/external-action-proposals/audit-trail${writebackAuditTrailQueryString(
          filters
        )}`
      ),
    refetchInterval: 10_000,
  });
}

export function useCompanyBrainWritebackEvidenceIntegrityGaps(
  filters: CompanyBrainWritebackEvidenceIntegrityGapFilters
) {
  return useQuery<ApiResponse<CompanyBrainWritebackEvidenceIntegrityGapsResponse>>({
    queryKey: ["company-brain", "writeback-evidence-integrity-gaps", filters],
    queryFn: () =>
      api(
        `/api/company-brain/external-action-proposals/evidence-integrity-gaps${writebackAuditTrailQueryString(
          filters
        )}`
      ),
    refetchInterval: 10_000,
  });
}

export function useCompanyBrainWritebackEvidenceRemediationSuggestions(
  filters: CompanyBrainWritebackEvidenceRemediationFilters
) {
  return useQuery<
    ApiResponse<CompanyBrainWritebackEvidenceRemediationSuggestionsResponse>
  >({
    queryKey: [
      "company-brain",
      "writeback-evidence-remediation-suggestions",
      filters,
    ],
    queryFn: () =>
      api(
        `/api/company-brain/external-action-proposals/evidence-remediation-suggestions${writebackAuditTrailQueryString(
          filters
        )}`
      ),
    refetchInterval: 10_000,
  });
}

export function companyBrainWritebackAuditTrailCsvUrl(
  filters: CompanyBrainWritebackAuditTrailFilters
) {
  return `${DAEMON_URL}/api/company-brain/external-action-proposals/audit-trail${writebackAuditTrailQueryString(
    filters,
    "csv"
  )}`;
}

export function companyBrainDaemonApiUrl(path: string) {
  return `${DAEMON_URL}${path}`;
}

export function useRunFelhenDemo() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<RunFelhenDemoResponse>, Error, RunFelhenDemoRequest>({
    mutationFn: (body) =>
      api("/api/company-brain/demo/felhen-v0-1", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useCreateCompanyBrainSource() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<Source>, Error, CreateSourceRequest>({
    mutationFn: (body) =>
      api("/api/company-brain/sources", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useCreateCompanyBrainArtifact() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<Artifact>, Error, CreateArtifactRequest>({
    mutationFn: (body) =>
      api("/api/company-brain/artifacts", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useSyncCompanyBrainGitHubIssues() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<SyncGitHubIssuesResponse>,
    Error,
    SyncGitHubIssuesRequest
  >({
    mutationFn: (body) =>
      api("/api/company-brain/adapters/github/issues/sync", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useSyncCompanyBrainGitHubPrCi() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<SyncGitHubPrCiResponse>,
    Error,
    SyncGitHubPrCiRequest
  >({
    mutationFn: (body) =>
      api("/api/company-brain/adapters/github/pr-ci/sync", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useSyncCompanyBrainGitHubNotifications() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<SyncGitHubNotificationsResponse>,
    Error,
    SyncGitHubNotificationsRequest
  >({
    mutationFn: (body) =>
      api("/api/company-brain/adapters/github/notifications/sync", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useImportCompanyBrainSlackMessages() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<ImportSlackMessagesResponse>,
    Error,
    ImportSlackMessagesRequest
  >({
    mutationFn: (body) =>
      api("/api/company-brain/importers/slack-messages", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useSyncCompanyBrainSlackChannel() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<SyncSlackChannelResponse>,
    Error,
    SyncSlackChannelRequest
  >({
    mutationFn: (body) =>
      api("/api/company-brain/adapters/slack/channel/sync", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useCreateCompanyBrainPriority() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<StrategicPriority>,
    Error,
    CreateStrategicPriorityRequest
  >({
    mutationFn: (body) =>
      api("/api/company-brain/priorities", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useCreateCompanyBrainGoal() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<Goal>, Error, CreateGoalRequest>({
    mutationFn: (body) =>
      api("/api/company-brain/goals", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useCreateCompanyBrainDecision() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<Decision>, Error, CreateDecisionRequest>({
    mutationFn: (body) =>
      api("/api/company-brain/decisions", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useCreateCompanyBrainAgentContext() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<AgentContext>, Error, CreateAgentContextRequest>({
    mutationFn: (body) =>
      api("/api/company-brain/agent-contexts", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useUpdateCompanyBrainDecision() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<Decision>,
    Error,
    { id: string; body: UpdateDecisionRequest }
  >({
    mutationFn: ({ id, body }) =>
      api(`/api/company-brain/decisions/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useCreateCompanyBrainStrategyTradeoff() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<StrategyTradeoff>, Error, CreateStrategyTradeoffRequest>({
    mutationFn: (body) =>
      api("/api/company-brain/strategy-tradeoffs", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useGenerateCompanyBrainAgentContext() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<AgentContext>, Error, GenerateAgentContextRequest>({
    mutationFn: (body) =>
      api("/api/company-brain/agent-contexts/generate", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useGenerateCompanyBrainDailyAgentHandoff() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<GenerateDailyAgentHandoffResponse>,
    Error,
    GenerateDailyAgentHandoffRequest
  >({
    mutationFn: (body) =>
      api("/api/company-brain/agent-contexts/daily-handoff", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useCreateCompanyBrainWorkItem() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<WorkItem>, Error, CreateWorkItemRequest>({
    mutationFn: (body) =>
      api("/api/company-brain/work-items", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useCreateCompanyBrainSignal() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<Signal>, Error, CreateSignalRequest>({
    mutationFn: (body) =>
      api("/api/company-brain/signals", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useExtractCompanyBrainArtifactInsights() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<ExtractArtifactInsightsResponse>,
    Error,
    ExtractArtifactInsightsRequest
  >({
    mutationFn: (body) =>
      api("/api/company-brain/extractors/artifact-insights", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useExtractCompanyBrainSignalGuidance() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<ExtractSignalGuidanceResponse>,
    Error,
    ExtractSignalGuidanceRequest
  >({
    mutationFn: (body) =>
      api("/api/company-brain/extractors/signal-guidance", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useCreateCompanyBrainAlignmentFinding() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<AlignmentFinding>,
    Error,
    CreateAlignmentFindingRequest
  >({
    mutationFn: (body) =>
      api("/api/company-brain/alignment-findings", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useCreateCompanyBrainGuidanceItem() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<GuidanceItem>, Error, CreateGuidanceItemRequest>({
    mutationFn: (body) =>
      api("/api/company-brain/guidance-items", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useUpdateCompanyBrainGuidanceItem() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<GuidanceItem>,
    Error,
    { id: string; body: UpdateGuidanceItemRequest }
  >({
    mutationFn: ({ id, body }) =>
      api(`/api/company-brain/guidance-items/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useCreateCompanyBrainExternalActionProposalFromGuidance() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<ExternalActionProposal>,
    Error,
    CreateExternalActionProposalRequest
  >({
    mutationFn: (body) =>
      api("/api/company-brain/external-action-proposals/from-guidance", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useUpdateCompanyBrainExternalActionProposal() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<ExternalActionProposal>,
    Error,
    { id: string; body: UpdateExternalActionProposalRequest }
  >({
    mutationFn: ({ id, body }) =>
      api(`/api/company-brain/external-action-proposals/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function usePreviewCompanyBrainGitHubCommentWriteback() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<GitHubCommentWritebackResponse>,
    Error,
    { id: string; body?: ExecuteExternalActionProposalRequest }
  >({
    mutationFn: ({ id, body }) =>
      api(`/api/company-brain/external-action-proposals/${id}/github-comment/preview`, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useGetCompanyBrainWritebackEvidencePacket() {
  return useMutation<ApiResponse<WritebackEvidencePacket>, Error, { id: string }>({
    mutationFn: ({ id }) =>
      api(`/api/company-brain/external-action-proposals/${id}/evidence-packet`),
  });
}

export function companyBrainWritebackEvidencePacketJsonUrl(id: string) {
  return `${DAEMON_URL}/api/company-brain/external-action-proposals/${id}/evidence-packet?download=1`;
}

export function companyBrainWritebackEvidencePacketMarkdownUrl(id: string) {
  return `${DAEMON_URL}/api/company-brain/external-action-proposals/${id}/evidence-packet?format=markdown`;
}

export function usePreviewCompanyBrainGitHubLabelProposal() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<GitHubLabelProposalPreviewResponse>,
    Error,
    { id: string; body?: ExecuteExternalActionProposalRequest }
  >({
    mutationFn: ({ id, body }) =>
      api(`/api/company-brain/external-action-proposals/${id}/github-label/preview`, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function usePreviewCompanyBrainGitHubIssueCreateProposal() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<GitHubIssueCreateProposalPreviewResponse>,
    Error,
    { id: string; body?: ExecuteExternalActionProposalRequest }
  >({
    mutationFn: ({ id, body }) =>
      api(
        `/api/company-brain/external-action-proposals/${id}/github-issue-create/preview`,
        {
          method: "POST",
          body: JSON.stringify(body ?? {}),
        }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useExecuteCompanyBrainGitHubIssueCreateWriteback() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<GitHubIssueCreateWritebackResponse>,
    Error,
    { id: string; body?: ExecuteExternalActionProposalRequest }
  >({
    mutationFn: ({ id, body }) =>
      api(
        `/api/company-brain/external-action-proposals/${id}/github-issue-create/execute`,
        {
          method: "POST",
          body: JSON.stringify(body ?? {}),
        }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useExecuteCompanyBrainGitHubLabelWriteback() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<GitHubLabelWritebackResponse>,
    Error,
    { id: string; body?: ExecuteExternalActionProposalRequest }
  >({
    mutationFn: ({ id, body }) =>
      api(`/api/company-brain/external-action-proposals/${id}/github-label/execute`, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function usePreviewCompanyBrainGitHubStatusCheckProposal() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<GitHubStatusCheckProposalPreviewResponse>,
    Error,
    { id: string; body?: ExecuteExternalActionProposalRequest }
  >({
    mutationFn: ({ id, body }) =>
      api(
        `/api/company-brain/external-action-proposals/${id}/github-status-check/preview`,
        {
          method: "POST",
          body: JSON.stringify(body ?? {}),
        }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useExecuteCompanyBrainGitHubStatusCheckWriteback() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<GitHubStatusCheckWritebackResponse>,
    Error,
    { id: string; body?: ExecuteExternalActionProposalRequest }
  >({
    mutationFn: ({ id, body }) =>
      api(
        `/api/company-brain/external-action-proposals/${id}/github-status-check/execute`,
        {
          method: "POST",
          body: JSON.stringify(body ?? {}),
        }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useExecuteCompanyBrainGitHubCommentWriteback() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<GitHubCommentWritebackResponse>,
    Error,
    { id: string; body?: ExecuteExternalActionProposalRequest }
  >({
    mutationFn: ({ id, body }) =>
      api(`/api/company-brain/external-action-proposals/${id}/github-comment/execute`, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function usePreviewCompanyBrainSlackThreadReplyWriteback() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<SlackThreadReplyWritebackResponse>,
    Error,
    { id: string; body?: ExecuteExternalActionProposalRequest }
  >({
    mutationFn: ({ id, body }) =>
      api(
        `/api/company-brain/external-action-proposals/${id}/slack-thread-reply/preview`,
        {
          method: "POST",
          body: JSON.stringify(body ?? {}),
        }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useExecuteCompanyBrainSlackThreadReplyWriteback() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<SlackThreadReplyWritebackResponse>,
    Error,
    { id: string; body?: ExecuteExternalActionProposalRequest }
  >({
    mutationFn: ({ id, body }) =>
      api(
        `/api/company-brain/external-action-proposals/${id}/slack-thread-reply/execute`,
        {
          method: "POST",
          body: JSON.stringify(body ?? {}),
        }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useCreateCompanyBrainImprovementProposal() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<ImprovementProposal>,
    Error,
    CreateImprovementProposalRequest
  >({
    mutationFn: (body) =>
      api("/api/company-brain/improvement-proposals", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useUpdateCompanyBrainImprovementProposal() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<ImprovementProposal>,
    Error,
    { id: string; body: UpdateImprovementProposalRequest }
  >({
    mutationFn: ({ id, body }) =>
      api(`/api/company-brain/improvement-proposals/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useCreateCompanyBrainWorkflowRun() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<WorkflowRun>, Error, CreateWorkflowRunRequest>({
    mutationFn: (body) =>
      api("/api/company-brain/workflow-runs", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useCreateCompanyBrainWatcher() {
  const qc = useQueryClient();
  return useMutation<ApiResponse<Watcher>, Error, CreateWatcherRequest>({
    mutationFn: (body) =>
      api("/api/company-brain/watchers", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}

export function useRunCompanyBrainWatcher() {
  const qc = useQueryClient();
  return useMutation<
    ApiResponse<RunWatcherResponse>,
    Error,
    { watcherId: string; body: RunWatcherRequest }
  >({
    mutationFn: ({ watcherId, body }) =>
      api(`/api/company-brain/watchers/${watcherId}/run`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-brain"] }),
  });
}
