import { Hono } from "hono";
import { getWorkspaces, getWorkspace } from "../registry/workspaces.js";

const app = new Hono();

app.get("/", (c) => {
  const workspaces = getWorkspaces();
  return c.json({ data: workspaces, total: workspaces.length });
});

app.get("/:id", (c) => {
  const ws = getWorkspace(c.req.param("id") ?? "");
  if (!ws) return c.json({ error: "not_found", message: "Workspace not found" }, 404);
  return c.json({ data: ws });
});

export default app;
