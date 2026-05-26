// API types — mirrors backend Pydantic schemas.
// Will be replaced by Orval-generated types when backend is running.

export type AgentStatus = "online" | "offline" | "busy" | "error";
export type TaskStatus =
  | "scheduled"
  | "queued"
  | "in_progress"
  | "done"
  | "failed";

export interface Agent {
  id: string;
  name: string;
  model: string;
  status: AgentStatus;
  description: string | null;
  system_prompt: string | null;
  avatar_url: string | null;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  schedule: string | null;
  is_recurring: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  agent_id: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  action: string;
  payload: Record<string, unknown> | null;
  agent_id: string;
  task_id: string | null;
  created_at: string;
}

export interface CostEntry {
  id: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  agent_id: string;
  task_id: string | null;
  created_at: string;
}

export interface SearchResult {
  docid: string;
  file: string;
  title: string;
  score: number;
  context: string;
  snippet: string;
}
