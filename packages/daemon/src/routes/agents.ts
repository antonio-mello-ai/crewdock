import { Hono } from "hono";
import { getAgents, getAgent, scanAgents } from "../registry/agent-registry.js";

const app = new Hono();

app.get("/", (c) => {
  const frente = c.req.query("frente");
  let agents = getAgents();
  if (frente) {
    agents = agents.filter((a) => a.frente === frente);
  }
  return c.json({ data: agents, total: agents.length });
});

app.get("/:id", (c) => {
  const agent = getAgent(c.req.param("id"));
  if (!agent) return c.json({ error: "not_found", message: "Agent not found" }, 404);
  return c.json({ data: agent });
});

app.post("/refresh", async (c) => {
  const agents = await scanAgents();
  return c.json({ data: agents, total: agents.length });
});

export default app;
