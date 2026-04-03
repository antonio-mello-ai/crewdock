import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, isAbsolute, resolve } from "node:path";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db/client.js";
import { sessions, sessionMessages } from "../db/schema.js";
import { config } from "../config.js";
import { parseCostFromLog } from "../jobs/cost-parser.js";

export interface Session {
  id: string;
  agentId: string;
  title: string | null;
  workDir: string;
  status: "active" | "closed";
  totalCostUsd: number;
  totalTokensIn: number;
  totalTokensOut: number;
  messageCount: number;
  createdAt: number;
  lastActiveAt: number;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
  durationMs: number;
  createdAt: number;
}

interface ActiveSession {
  process: ChildProcess | null;
  subscribers: Set<(msg: SessionStreamMessage) => void>;
}

export type SessionStreamMessage =
  | { type: "chunk"; content: string }
  | { type: "done"; messageId: string; costUsd: number; durationMs: number }
  | { type: "error"; message: string };

const activeSessions = new Map<string, ActiveSession>();

// Session working directories (each session gets its own dir so --continue works)
const SESSION_DIR_BASE = join(config.logDir, "sessions");

function getSessionWorkDir(sessionId: string): string {
  const dir = join(SESSION_DIR_BASE, sessionId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function createSession(agentId: string, title?: string): Session {
  const db = getDb();
  const id = nanoid(12);
  const now = Date.now();
  const workDir = getSessionWorkDir(id);

  const row = {
    id,
    agentId,
    title: title ?? null,
    workDir,
    status: "active" as const,
    totalCostUsd: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    messageCount: 0,
    createdAt: now,
    lastActiveAt: now,
  };

  db.insert(sessions).values(row).run();

  activeSessions.set(id, { process: null, subscribers: new Set() });

  return row;
}

export function getSession(id: string): Session | undefined {
  const db = getDb();
  const row = db.select().from(sessions).where(eq(sessions.id, id)).get();
  return row as Session | undefined;
}

export function listSessions(agentId?: string, limit = 20): Session[] {
  const db = getDb();
  let rows = db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.lastActiveAt))
    .limit(limit)
    .all();

  if (agentId) {
    rows = rows.filter((r) => r.agentId === agentId);
  }

  return rows as Session[];
}

export function getSessionMessages(sessionId: string): SessionMessage[] {
  const db = getDb();
  return db
    .select()
    .from(sessionMessages)
    .where(eq(sessionMessages.sessionId, sessionId))
    .all() as SessionMessage[];
}

export function subscribeToSession(
  sessionId: string,
  callback: (msg: SessionStreamMessage) => void
): (() => void) | null {
  let active = activeSessions.get(sessionId);
  if (!active) {
    active = { process: null, subscribers: new Set() };
    activeSessions.set(sessionId, active);
  }
  active.subscribers.add(callback);
  return () => {
    active!.subscribers.delete(callback);
  };
}

function broadcast(sessionId: string, msg: SessionStreamMessage) {
  const active = activeSessions.get(sessionId);
  if (!active) return;
  for (const cb of active.subscribers) {
    try {
      cb(msg);
    } catch {
      // subscriber disconnected
    }
  }
}

export async function sendMessage(
  sessionId: string,
  content: string
): Promise<{ messageId: string }> {
  const db = getDb();
  const session = getSession(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.status === "closed") throw new Error("Session is closed");

  const active = activeSessions.get(sessionId) ?? {
    process: null,
    subscribers: new Set(),
  };
  if (!activeSessions.has(sessionId)) {
    activeSessions.set(sessionId, active);
  }

  // Check if a message is already being processed
  if (active.process) {
    throw new Error("Session is busy processing a message");
  }

  const now = Date.now();
  const userMsgId = nanoid(12);

  // Store user message
  db.insert(sessionMessages)
    .values({
      id: userMsgId,
      sessionId,
      role: "user",
      content,
      costUsd: 0,
      tokensIn: 0,
      tokensOut: 0,
      durationMs: 0,
      createdAt: now,
    })
    .run();

  // Determine if this is a continuation or first message
  const isFirstMessage = session.messageCount === 0;

  // Build claude command
  const claudeCmd = resolveCmd(config.runAgentCmd);
  const args: string[] = [];

  // For dev mode (mock), use mock script
  if (claudeCmd.includes("mock")) {
    args.push("", session.agentId, "chat", "--no-notify");
  } else {
    // Production: use claude CLI directly for interactive sessions
    args.push(
      "-p",
      content,
      "--verbose",
      "--output-format",
      "stream-json",
      "--dangerously-skip-permissions"
    );
    if (!isFirstMessage) {
      args.push("--continue");
    }
  }

  const workDir = session.workDir;
  const startTime = Date.now();
  const responseChunks: string[] = [];
  const fullOutput: string[] = [];

  // Spawn claude process
  const cmd = claudeCmd.includes("mock") ? claudeCmd : "claude";
  const child = spawn(cmd, args, {
    cwd: workDir,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  active.process = child;
  const assistantMsgId = nanoid(12);

  child.stdout?.on("data", (data: Buffer) => {
    const text = data.toString();
    fullOutput.push(text);

    // Try to parse stream-json events
    const lines = text.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.type === "assistant" && event.message?.content) {
          // Extract text from content blocks
          for (const block of event.message.content) {
            if (block.type === "text") {
              responseChunks.push(block.text);
              broadcast(sessionId, { type: "chunk", content: block.text });
            }
          }
        } else if (event.type === "content_block_delta" && event.delta?.text) {
          responseChunks.push(event.delta.text);
          broadcast(sessionId, { type: "chunk", content: event.delta.text });
        }
      } catch {
        // Not JSON — treat as plain text output (mock mode)
        responseChunks.push(text);
        broadcast(sessionId, { type: "chunk", content: text });
        break; // Don't process line by line for plain text
      }
    }
  });

  child.stderr?.on("data", (data: Buffer) => {
    fullOutput.push(data.toString());
  });

  child.on("close", () => {
    const durationMs = Date.now() - startTime;
    const fullText = fullOutput.join("");
    const cost = parseCostFromLog(fullText);
    const responseText =
      responseChunks.join("").trim() || fullText.trim();

    // Store assistant message
    db.insert(sessionMessages)
      .values({
        id: assistantMsgId,
        sessionId,
        role: "assistant",
        content: responseText,
        costUsd: cost.costUsd,
        tokensIn: cost.tokensIn,
        tokensOut: cost.tokensOut,
        durationMs,
        createdAt: Date.now(),
      })
      .run();

    // Update session stats
    db.update(sessions)
      .set({
        totalCostUsd: session.totalCostUsd + cost.costUsd,
        totalTokensIn: session.totalTokensIn + cost.tokensIn,
        totalTokensOut: session.totalTokensOut + cost.tokensOut,
        messageCount: session.messageCount + 2, // user + assistant
        lastActiveAt: Date.now(),
        title:
          session.title ??
          (content.length > 60 ? content.slice(0, 60) + "..." : content),
      })
      .where(eq(sessions.id, sessionId))
      .run();

    broadcast(sessionId, {
      type: "done",
      messageId: assistantMsgId,
      costUsd: cost.costUsd,
      durationMs,
    });

    active.process = null;
  });

  child.on("error", (err) => {
    broadcast(sessionId, { type: "error", message: err.message });
    active.process = null;
  });

  return { messageId: userMsgId };
}

export function closeSession(sessionId: string): boolean {
  const db = getDb();
  const session = getSession(sessionId);
  if (!session) return false;

  const active = activeSessions.get(sessionId);
  if (active?.process) {
    active.process.kill("SIGTERM");
  }

  db.update(sessions)
    .set({ status: "closed" })
    .where(eq(sessions.id, sessionId))
    .run();

  activeSessions.delete(sessionId);
  return true;
}

function resolveCmd(cmd: string): string {
  if (isAbsolute(cmd)) return cmd;
  return resolve(process.cwd(), cmd);
}
