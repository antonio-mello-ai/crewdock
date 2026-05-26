"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Agent, Task, Activity, CostEntry } from "@/lib/api/types";

export function useAgents() {
  return useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: () => apiFetch("/api/v1/agents"),
  });
}

export function useTasks(params?: { status?: string; agent_id?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.agent_id) searchParams.set("agent_id", params.agent_id);
  const qs = searchParams.toString();

  return useQuery<Task[]>({
    queryKey: ["tasks", params],
    queryFn: () => apiFetch(`/api/v1/tasks${qs ? `?${qs}` : ""}`),
  });
}

export function useActivity(params?: { limit?: number }) {
  const limit = params?.limit ?? 50;
  return useQuery<Activity[]>({
    queryKey: ["activity", limit],
    queryFn: () => apiFetch(`/api/v1/activity?limit=${limit}`),
  });
}

export function useCosts() {
  return useQuery<CostEntry[]>({
    queryKey: ["costs"],
    queryFn: () => apiFetch("/api/v1/costs"),
  });
}

export function useCostSummary() {
  return useQuery<
    {
      agent_id: string;
      total_tokens_in: number;
      total_tokens_out: number;
      total_cost_usd: number;
      entry_count: number;
    }[]
  >({
    queryKey: ["costs", "summary"],
    queryFn: () => apiFetch("/api/v1/costs/summary/agents"),
  });
}
