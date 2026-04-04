import { Hono } from "hono";
import {
  createTerminal,
  closeTerminal,
  listTerminals,
} from "../terminal/terminal-manager.js";

const app = new Hono();

// Create a new terminal
app.post("/", async (c) => {
  try {
    const body = await c.req.json<{ workspaceId: string }>();
    if (!body.workspaceId) {
      return c.json(
        { error: "bad_request", message: "workspaceId is required" },
        400
      );
    }
    const id = createTerminal(body.workspaceId);
    return c.json({ data: { id, workspaceId: body.workspaceId } }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

// List active terminals
app.get("/", (c) => {
  const data = listTerminals();
  return c.json({ data, total: data.length });
});

// Close a terminal
app.post("/:id/close", (c) => {
  const closed = closeTerminal(c.req.param("id") ?? "");
  if (!closed)
    return c.json(
      { error: "not_found", message: "Terminal not found" },
      404
    );
  return c.json({ data: { closed: true } });
});

export default app;
