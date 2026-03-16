import type { Agent } from "@/lib/api/types";

export const AGENT_COLORS = [
  "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
];

// Agent color for charts (solid hex values matching AGENT_COLORS order)
export const AGENT_CHART_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f97316", // orange
  "#f43f5e", // rose
  "#06b6d4", // cyan
];

export function agentReadyDot(agent: Agent): string {
  if (agent.system_prompt) return "bg-emerald-500";
  return "bg-amber-500";
}

export function agentReadyLabel(agent: Agent): string {
  return agent.system_prompt ? "Ready" : "Needs prompt";
}
