import { Hono } from "hono";
import {
  createSession,
  getSession,
  listSessions,
  getSessionMessages,
  sendMessage,
  closeSession,
} from "../sessions/session-manager.js";

const app = new Hono();

// Create a new session
app.post("/", async (c) => {
  try {
    const body = await c.req.json<{ agentId: string; title?: string }>();
    if (!body.agentId) {
      return c.json({ error: "bad_request", message: "agentId is required" }, 400);
    }
    const session = createSession(body.agentId, body.title);
    return c.json({ data: session }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

// List sessions
app.get("/", (c) => {
  const agentId = c.req.query("agentId") ?? undefined;
  const limit = Number(c.req.query("limit")) || 20;
  const data = listSessions(agentId, limit);
  return c.json({ data, total: data.length });
});

// Get session detail
app.get("/:id", (c) => {
  const session = getSession(c.req.param("id") ?? "");
  if (!session) return c.json({ error: "not_found", message: "Session not found" }, 404);
  return c.json({ data: session });
});

// Get session messages
app.get("/:id/messages", (c) => {
  const messages = getSessionMessages(c.req.param("id") ?? "");
  return c.json({ data: messages, total: messages.length });
});

// Send a message in a session
app.post("/:id/messages", async (c) => {
  try {
    const body = await c.req.json<{ content: string }>();
    if (!body.content?.trim()) {
      return c.json({ error: "bad_request", message: "content is required" }, 400);
    }
    const result = await sendMessage(c.req.param("id") ?? "", body.content.trim());
    return c.json({ data: result }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "send_failed", message }, 400);
  }
});

// Close a session
app.post("/:id/close", (c) => {
  const closed = closeSession(c.req.param("id") ?? "");
  if (!closed) return c.json({ error: "not_found", message: "Session not found" }, 404);
  return c.json({ data: { closed: true } });
});

export default app;
