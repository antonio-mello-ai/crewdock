import { spawn, type ChildProcess } from "node:child_process";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db/client.js";
import { sessions, sessionMessages } from "../db/schema.js";
import { parseCostFromLog } from "../jobs/cost-parser.js";
import { getWorkspace } from "../registry/workspaces.js";

export interface Session {
  id: string;
  workspaceId: string;
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

export function createSession(workspaceId: string, title?: string): Session {
  const db = getDb();
  const workspace = getWorkspace(workspaceId);
  if (!workspace) throw new Error(`Workspace "${workspaceId}" not found`);

  const id = nanoid(12);
  const now = Date.now();

  // Session runs in the workspace path (like cd <workspace> && claude)
  const workDir = workspace.path;

  const row = {
    id,
    // Store workspaceId in agentId column (reusing existing schema)
    agentId: workspaceId,
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

  return { ...row, workspaceId };
}

export function getSession(id: string): Session | undefined {
  const db = getDb();
  const row = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!row) return undefined;
  return { ...row, workspaceId: row.agentId } as Session;
}

export function listSessions(workspaceId?: string, limit = 20): Session[] {
  const db = getDb();
  let rows = db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.lastActiveAt))
    .limit(limit)
    .all();

  if (workspaceId) {
    rows = rows.filter((r) => r.agentId === workspaceId);
  }

  return rows.map((r) => ({ ...r, workspaceId: r.agentId })) as Session[];
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

  const isFirstMessage = session.messageCount === 0;

  // Build claude command — run directly in workspace path
  // This is equivalent to: cd <workspace> && claude -p "message"
  const args: string[] = [
    "-p",
    content,
    "--verbose",
    "--output-format",
    "stream-json",
    "--dangerously-skip-permissions",
  ];

  if (!isFirstMessage) {
    args.push("--continue");
  }

  // Use workspace path as CWD — Claude reads CLAUDE.md from this directory
  const workDir = session.workDir;
  const startTime = Date.now();
  const responseChunks: string[] = [];
  const fullOutput: string[] = [];

  const child = spawn("claude", args, {
    cwd: workDir,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  active.process = child;
  const assistantMsgId = nanoid(12);

  child.stdout?.on("data", (data: Buffer) => {
    const text = data.toString();
    fullOutput.push(text);

    const lines = text.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.type === "assistant" && event.message?.content) {
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
        // Not JSON — plain text output
        responseChunks.push(text);
        broadcast(sessionId, { type: "chunk", content: text });
        break;
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
    const responseText = responseChunks.join("").trim() || fullText.trim();

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

    db.update(sessions)
      .set({
        totalCostUsd: session.totalCostUsd + cost.costUsd,
        totalTokensIn: session.totalTokensIn + cost.tokensIn,
        totalTokensOut: session.totalTokensOut + cost.tokensOut,
        messageCount: session.messageCount + 2,
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
