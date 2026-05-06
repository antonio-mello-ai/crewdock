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
  CompanyBrainSummary,
  CreateAgentContextRequest,
  CreateArtifactRequest,
  CreateAlignmentFindingRequest,
  CreateDecisionRequest,
  CreateGoalRequest,
  CreateGuidanceItemRequest,
  CreateImprovementProposalRequest,
  CreateSignalRequest,
  CreateSourceRequest,
  CreateStrategicPriorityRequest,
  CreateWatcherRequest,
  CreateWorkflowRunRequest,
  CreateWorkItemRequest,
  GenerateAgentContextRequest,
  ImportSlackMessagesRequest,
  ImportSlackMessagesResponse,
  RunWatcherRequest,
  RunWatcherResponse,
  SyncGitHubIssuesRequest,
  SyncGitHubIssuesResponse,
  UpdateGuidanceItemRequest,
  UpdateImprovementProposalRequest,
  AlignmentFinding,
  AgentContext,
  Artifact,
  Decision,
  Goal,
  GuidanceItem,
  ImprovementProposal,
  Signal,
  Source,
  StrategicPriority,
  Watcher,
  WorkflowRun,
  WorkItem,
} from "@aios/shared";
import { DAEMON_URL } from "@/lib/utils";

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
