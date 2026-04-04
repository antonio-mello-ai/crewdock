import { Hono } from "hono";
import {
  getWorkspaces,
  getWorkspace,
  getDiscoveredWorkspaces,
  getWorkspaceConfig,
  saveWorkspaceConfig,
  refreshWorkspaces,
  type WorkspaceOverride,
} from "../registry/workspaces.js";

const app = new Hono();

// Get active workspaces (filtered by config)
app.get("/", (c) => {
  const workspaces = getWorkspaces();
  return c.json({ data: workspaces, total: workspaces.length });
});

// Get ALL discovered workspaces (for settings page)
app.get("/discovered", (c) => {
  const all = getDiscoveredWorkspaces();
  return c.json({ data: all, total: all.length });
});

// Get workspace config (overrides)
app.get("/config", (c) => {
  const config = getWorkspaceConfig();
  return c.json({ data: config });
});

// Save workspace config
app.put("/config", async (c) => {
  try {
    const body = await c.req.json<Record<string, WorkspaceOverride>>();
    saveWorkspaceConfig(body);
    refreshWorkspaces();
    const workspaces = getWorkspaces();
    return c.json({ data: workspaces, total: workspaces.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "save_failed", message }, 400);
  }
});

// Refresh workspace discovery
app.post("/refresh", (c) => {
  const workspaces = refreshWorkspaces();
  return c.json({ data: workspaces, total: workspaces.length });
});

app.get("/:id", (c) => {
  const ws = getWorkspace(c.req.param("id") ?? "");
  if (!ws) return c.json({ error: "not_found", message: "Workspace not found" }, 404);
  return c.json({ data: ws });
});

export default app;
