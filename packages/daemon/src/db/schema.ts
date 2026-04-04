import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  model: text("model"),
  filePath: text("file_path").notNull(),
  project: text("project"),
  frente: text("frente"),
  modes: text("modes", { mode: "json" }).$type<string[]>().default([]),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  agentId: text("agent_id"),
  type: text("type", { enum: ["agent", "orchestrator", "skill"] }).notNull(),
  objective: text("objective").notNull(),
  mode: text("mode"),
  status: text("status", {
    enum: ["queued", "running", "completed", "failed", "cancelled"],
  }).notNull().default("queued"),
  exitCode: integer("exit_code"),
  logPath: text("log_path"),
  startedAt: integer("started_at", { mode: "number" }),
  finishedAt: integer("finished_at", { mode: "number" }),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  totalTokensIn: integer("total_tokens_in").notNull().default(0),
  totalTokensOut: integer("total_tokens_out").notNull().default(0),
  totalCostUsd: real("total_cost_usd").notNull().default(0),
});

export const costEntries = sqliteTable("cost_entries", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull(),
  model: text("model").notNull(),
  tokensIn: integer("tokens_in").notNull(),
  tokensOut: integer("tokens_out").notNull(),
  costUsd: real("cost_usd").notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const schedules = sqliteTable("schedules", {
  id: text("id").primaryKey(),
  description: text("description"),
  onCalendar: text("on_calendar").notNull(),
  command: text("command").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  lastRun: integer("last_run", { mode: "number" }),
  nextRun: integer("next_run", { mode: "number" }),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  title: text("title"),
  workDir: text("work_dir").notNull(),
  status: text("status", {
    enum: ["active", "closed"],
  }).notNull().default("active"),
  permissionMode: text("permission_mode", {
    enum: ["plan", "acceptEdits", "full"],
  }).notNull().default("plan"),
  totalCostUsd: real("total_cost_usd").notNull().default(0),
  totalTokensIn: integer("total_tokens_in").notNull().default(0),
  totalTokensOut: integer("total_tokens_out").notNull().default(0),
  messageCount: integer("message_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  lastActiveAt: integer("last_active_at", { mode: "number" }).notNull(),
});

export const sessionMessages = sqliteTable("session_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  costUsd: real("cost_usd").notNull().default(0),
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const hitlRequests = sqliteTable("hitl_requests", {
  id: text("id").primaryKey(),
  jobId: text("job_id"),
  agentId: text("agent_id"),
  question: text("question").notNull(),
  context: text("context", { mode: "json" }).$type<Record<string, unknown>>(),
  status: text("status", {
    enum: ["pending", "responded", "expired"],
  }).notNull().default("pending"),
  response: text("response"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  respondedAt: integer("responded_at", { mode: "number" }),
});
