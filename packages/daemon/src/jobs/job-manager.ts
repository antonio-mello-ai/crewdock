import { spawn, type ChildProcess } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, isAbsolute } from "node:path";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db/client.js";
import { jobs } from "../db/schema.js";
import { config } from "../config.js";
import { MAX_CONCURRENT_JOBS, LOG_BUFFER_LINES } from "@aios/shared";
import type { Job, CreateJobRequest, JobStatus, WsMessage } from "@aios/shared";
import { parseCostFromLog } from "./cost-parser.js";
import { sendPushAsync } from "../push/push-sender.js";

interface ActiveJob {
  process: ChildProcess;
  logBuffer: string[];
  subscribers: Set<(msg: WsMessage) => void>;
}

const activeJobs = new Map<string, ActiveJob>();

export function getActiveJobCount(): number {
  return activeJobs.size;
}

export function subscribeToJob(
  jobId: string,
  callback: (msg: WsMessage) => void
): (() => void) | null {
  const active = activeJobs.get(jobId);
  if (!active) return null;

  // Send buffered lines first
  for (const line of active.logBuffer) {
    callback({ type: "log", line, stream: "stdout" });
  }

  active.subscribers.add(callback);
  return () => {
    active.subscribers.delete(callback);
  };
}

function broadcast(jobId: string, msg: WsMessage) {
  const active = activeJobs.get(jobId);
  if (!active) return;
  for (const cb of active.subscribers) {
    try {
      cb(msg);
    } catch {
      // subscriber disconnected
    }
  }
}

function bufferLine(jobId: string, line: string) {
  const active = activeJobs.get(jobId);
  if (!active) return;
  active.logBuffer.push(line);
  if (active.logBuffer.length > LOG_BUFFER_LINES) {
    active.logBuffer.shift();
  }
}

export async function createJob(request: CreateJobRequest): Promise<Job> {
  if (activeJobs.size >= MAX_CONCURRENT_JOBS) {
    throw new Error(`Maximum concurrent jobs (${MAX_CONCURRENT_JOBS}) reached`);
  }

  const db = getDb();
  const id = nanoid(12);
  const now = Date.now();

  const logFileName = `${request.agentId ?? "orchestrator"}-${request.mode ?? "run"}-${new Date().toISOString().replace(/[:.]/g, "-")}.log`;
  const logPath = join(config.logDir, logFileName);

  // Ensure log directory exists
  mkdirSync(config.logDir, { recursive: true });

  const jobRow = {
    id,
    agentId: request.agentId ?? null,
    type: request.type,
    objective: request.objective,
    mode: request.mode ?? null,
    status: "queued" as const,
    exitCode: null,
    logPath,
    startedAt: null,
    finishedAt: null,
    createdAt: now,
    totalTokensIn: 0,
    totalTokensOut: 0,
    totalCostUsd: 0,
  };

  db.insert(jobs).values(jobRow).run();

  // Start execution
  startJob(id, request);

  return {
    ...jobRow,
    status: "running",
    startedAt: now,
  };
}

function startJob(jobId: string, request: CreateJobRequest) {
  const db = getDb();
  const now = Date.now();

  let cmd: string;
  let args: string[];

  if (request.type === "orchestrator") {
    cmd = config.runOrchestratorCmd;
    args = [request.objective, "--no-notify"];
  } else {
    cmd = config.runAgentCmd;
    const projectPath = request.projectPath ?? "";
    args = [projectPath, request.agentId ?? "", request.mode ?? "run", "--no-notify"];
  }

  // Resolve command path: if relative, resolve from CWD (monorepo root when running dev)
  const resolvedCmd = isAbsolute(cmd) ? cmd : resolve(process.cwd(), cmd);

  const child = spawn(resolvedCmd, args, {
    cwd: config.projectsDir,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const active: ActiveJob = {
    process: child,
    logBuffer: [],
    subscribers: new Set(),
  };
  activeJobs.set(jobId, active);

  // Update status to running
  db.update(jobs)
    .set({ status: "running", startedAt: now })
    .where(eq(jobs.id, jobId))
    .run();

  // Collect full log for persistence
  const fullLog: string[] = [];

  const handleData = (stream: "stdout" | "stderr") => (data: Buffer) => {
    const lines = data.toString().split("\n").filter((l) => l.length > 0);
    for (const line of lines) {
      bufferLine(jobId, line);
      fullLog.push(line);
      broadcast(jobId, { type: "log", line, stream });
    }
  };

  child.stdout?.on("data", handleData("stdout"));
  child.stderr?.on("data", handleData("stderr"));

  // Look up the full job record for push notifications (agentId, objective).
  // Captured once at spawn time; this is a snapshot — don't rely on fields
  // that may change during execution (none today, but worth noting).
  const jobRecord = db.select().from(jobs).where(eq(jobs.id, jobId)).get();

  // Dedup flag: child.on("error") and child.on("close") can BOTH fire for the
  // same failure (e.g. ENOENT). Ensure we only send one push per terminal state.
  let terminalPushSent = false;

  child.on("close", (code) => {
    const finishedAt = Date.now();
    const status: JobStatus = code === 0 ? "completed" : "failed";

    // Write full log to file
    const logPath = db.select({ logPath: jobs.logPath }).from(jobs).where(eq(jobs.id, jobId)).get()?.logPath;
    if (logPath) {
      try {
        writeFileSync(logPath, fullLog.join("\n"), "utf-8");
      } catch {
        // log dir may not exist in dev
      }
    }

    // Parse cost from log
    const cost = parseCostFromLog(fullLog.join("\n"));

    db.update(jobs)
      .set({
        status,
        exitCode: code,
        finishedAt,
        totalTokensIn: cost.tokensIn,
        totalTokensOut: cost.tokensOut,
        totalCostUsd: cost.costUsd,
      })
      .where(eq(jobs.id, jobId))
      .run();

    broadcast(jobId, {
      type: "job_complete",
      status,
      exitCode: code,
      costUsd: cost.costUsd,
    });

    // Push notification for failed jobs (only if not already sent by error handler)
    if (status === "failed" && jobRecord && !terminalPushSent) {
      terminalPushSent = true;
      sendPushAsync({
        title: `Job failed: ${jobRecord.agentId ?? "unknown"}`,
        body: jobRecord.objective ?? "A background job has failed",
        url: `/jobs/detail?id=${jobId}`,
        tag: `job-${jobId}`,
      });
    }

    activeJobs.delete(jobId);
  });

  child.on("error", (err) => {
    db.update(jobs)
      .set({ status: "failed", finishedAt: Date.now() })
      .where(eq(jobs.id, jobId))
      .run();

    broadcast(jobId, { type: "error", message: err.message });

    if (jobRecord && !terminalPushSent) {
      terminalPushSent = true;
      sendPushAsync({
        title: `Job failed: ${jobRecord.agentId ?? "unknown"}`,
        body: err.message,
        url: `/jobs/detail?id=${jobId}`,
        tag: `job-${jobId}`,
      });
    }

    activeJobs.delete(jobId);
  });
}

export function cancelJob(jobId: string): boolean {
  const active = activeJobs.get(jobId);
  if (!active) return false;

  active.process.kill("SIGTERM");

  // Give 5s for graceful shutdown, then SIGKILL
  setTimeout(() => {
    if (activeJobs.has(jobId)) {
      active.process.kill("SIGKILL");
    }
  }, 5000);

  const db = getDb();
  db.update(jobs)
    .set({ status: "cancelled", finishedAt: Date.now() })
    .where(eq(jobs.id, jobId))
    .run();

  broadcast(jobId, {
    type: "job_complete",
    status: "cancelled",
    exitCode: null,
    costUsd: 0,
  });

  activeJobs.delete(jobId);
  return true;
}

export function getJob(id: string): Job | undefined {
  const db = getDb();
  const row = db.select().from(jobs).where(eq(jobs.id, id)).get();
  if (!row) return undefined;
  return row as Job;
}

export function listJobs(filters?: {
  status?: JobStatus;
  agentId?: string;
  limit?: number;
  offset?: number;
}): { data: Job[]; total: number } {
  const db = getDb();
  // Simple query — filters applied in JS for now (low volume)
  let allRows = db.select().from(jobs).orderBy(jobs.createdAt).all().reverse();

  if (filters?.status) {
    allRows = allRows.filter((r) => r.status === filters.status);
  }
  if (filters?.agentId) {
    allRows = allRows.filter((r) => r.agentId === filters.agentId);
  }

  const total = allRows.length;
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  return {
    data: allRows.slice(offset, offset + limit) as Job[],
    total,
  };
}
