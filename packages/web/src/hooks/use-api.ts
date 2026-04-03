"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  Agent,
  Job,
  CreateJobRequest,
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
