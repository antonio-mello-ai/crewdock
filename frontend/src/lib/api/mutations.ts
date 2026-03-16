import { apiFetch } from "@/lib/api/client";
import type { Agent, Task } from "@/lib/api/types";

// Agents
export async function createAgent(data: {
  name: string;
  model: string;
  description?: string;
  system_prompt?: string;
}): Promise<Agent> {
  return apiFetch("/api/v1/agents", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAgent(
  id: string,
  data: Partial<{ name: string; model: string; description: string; system_prompt: string; status: string }>
): Promise<Agent> {
  return apiFetch(`/api/v1/agents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteAgent(id: string): Promise<void> {
  await apiFetch(`/api/v1/agents/${id}`, { method: "DELETE" });
}

// Tasks
export async function createTask(data: {
  title: string;
  description?: string;
  agent_id: string;
  schedule?: string;
  is_recurring?: boolean;
}): Promise<Task> {
  return apiFetch("/api/v1/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTask(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    status: string;
    agent_id: string;
    schedule: string;
    is_recurring: boolean;
  }>
): Promise<Task> {
  return apiFetch(`/api/v1/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function runTask(id: string): Promise<{ status: string }> {
  return apiFetch(`/api/v1/tasks/${id}/run`, { method: "POST" });
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch(`/api/v1/tasks/${id}`, { method: "DELETE" });
}
