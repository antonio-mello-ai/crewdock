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
import workspaceRoutes from "./routes/workspaces.js";
import jobRoutes from "./routes/jobs.js";
import sessionRoutes from "./routes/sessions.js";
import costRoutes from "./routes/costs.js";
import hitlRoutes from "./routes/hitl.js";
import healthRoutes from "./routes/health.js";
import terminalRoutes from "./routes/terminal.js";
import schedulesRoutes from "./routes/schedules.js";
import briefingRoutes from "./routes/briefing.js";
import { subscribeToSession } from "./sessions/session-manager.js";
import {
  subscribeToTerminal,
  writeToTerminal,
  resizeTerminal,
  listTerminals,
  closeTerminal,
} from "./terminal/terminal-manager.js";

const app = new Hono();

// WebSocket setup
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Middleware
app.use("*", cors());
app.use("*", logger());

// REST routes
app.route("/api/agents", agentRoutes);
app.route("/api/workspaces", workspaceRoutes);
app.route("/api/jobs", jobRoutes);
app.route("/api/sessions", sessionRoutes);
app.route("/api/costs", costRoutes);
app.route("/api/hitl", hitlRoutes);
app.route("/api/health", healthRoutes);
app.route("/api/terminal", terminalRoutes);
app.route("/api/schedules", schedulesRoutes);
app.route("/api/briefing", briefingRoutes);

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

// WebSocket route for session streaming (interactive console)
app.get(
  "/ws/sessions/:id",
  upgradeWebSocket((c) => {
    const sessionId = c.req.param("id") ?? "";
    let unsub: (() => void) | null = null;
    return {
      onOpen(_evt, ws) {
        unsub = subscribeToSession(sessionId, (msg) => {
          try {
            (ws as any).send(JSON.stringify(msg));
          } catch {
            // disconnected
          }
        });
        if (!unsub) {
          (ws as any).send(JSON.stringify({ type: "error", message: "Session not found" }));
          (ws as any).close();
        }
      },
      onClose() {
        unsub?.();
      },
    };
  })
);

// WebSocket route for terminal I/O
app.get(
  "/ws/terminal/:id",
  upgradeWebSocket((c) => {
    const terminalId = c.req.param("id") ?? "";
    let unsub: (() => void) | null = null;
    return {
      onOpen(_evt, ws) {
        unsub = subscribeToTerminal(terminalId, (data) => {
          try {
            (ws as any).send(JSON.stringify({ type: "output", data }));
          } catch {
            // disconnected
          }
        });
        if (!unsub) {
          (ws as any).send(
            JSON.stringify({ type: "error", message: "Terminal not found" })
          );
          (ws as any).close();
        }
      },
      onMessage(event, _ws) {
        try {
          const raw = typeof event.data === "string" ? event.data : event.data?.toString?.() ?? "";
          const msg = JSON.parse(raw);
          if (msg.type === "input" && typeof msg.data === "string") {
            writeToTerminal(terminalId, msg.data);
          } else if (
            msg.type === "resize" &&
            typeof msg.cols === "number" &&
            typeof msg.rows === "number"
          ) {
            resizeTerminal(terminalId, msg.cols, msg.rows);
          }
        } catch {
          // ignore parse errors
        }
      },
      onClose() {
        unsub?.();
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
    for (const t of listTerminals()) {
      closeTerminal(t.id);
    }
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
