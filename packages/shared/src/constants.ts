export const JOB_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

export const JOB_TYPES = ["agent", "orchestrator", "skill"] as const;

export const HITL_STATUSES = ["pending", "responded", "expired"] as const;

export const DEFAULT_DAEMON_PORT = 3101;
export const DEFAULT_WEB_PORT = 3100;

export const MAX_CONCURRENT_JOBS = 3;
export const LOG_BUFFER_LINES = 1000;
export const HITL_EXPIRY_HOURS = 24;

// Cost per million tokens (USD) — updated as pricing changes
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-6": { input: 15.0, output: 75.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 0.8, output: 4.0 },
};
