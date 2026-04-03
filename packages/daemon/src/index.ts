import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createNodeWebSocket } from "@hono/node-ws";

import { config } from "./config.js";
import { getDb } from "./db/client.js";
import { scanAgents } from "./registry/agent-registry.js";
import { handleLogStreamConnection } from "./ws/log-stream.js";

import agentRoutes from "./routes/agents.js";
import jobRoutes from "./routes/jobs.js";
import healthRoutes from "./routes/health.js";

const app = new Hono();

// WebSocket setup
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Middleware
app.use("*", cors());
app.use("*", logger());

// REST routes
app.route("/api/agents", agentRoutes);
app.route("/api/jobs", jobRoutes);
app.route("/api/health", healthRoutes);

// WebSocket route for log streaming
app.get(
  "/ws/jobs/:id/logs",
  upgradeWebSocket((c) => {
    const jobId = c.req.param("id") ?? "";
    return {
      onOpen(_evt, ws) {
        handleLogStreamConnection(ws as any, jobId);
      },
    };
  })
);

// Initialize
async function start() {
  // Initialize database
  getDb();
  console.log(`[aios] Database initialized at ${config.dbPath}`);

  // Scan for agents
  const agents = await scanAgents();
  console.log(`[aios] Discovered ${agents.length} agents`);

  // Start server
  const server = serve(
    {
      fetch: app.fetch,
      port: config.port,
      hostname: config.host,
    },
    (info) => {
      console.log(`[aios] Daemon running at http://${info.address}:${info.port}`);
    }
  );

  injectWebSocket(server);

  // Graceful shutdown
  const shutdown = () => {
    console.log("\n[aios] Shutting down...");
    server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((err) => {
  console.error("[aios] Failed to start:", err);
  process.exit(1);
});
