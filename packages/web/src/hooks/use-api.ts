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
  CreateJobRequest,
  CreateSessionRequest,
  SendMessageRequest,
  CostSummary,
  CostByDay,
  AgentHealth,
  HitlRequest,
  ApiResponse,
  ApiListResponse,
} from "@aios/shared";
import { DAEMON_URL } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${DAEMON_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API error ${res.status}`);
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
