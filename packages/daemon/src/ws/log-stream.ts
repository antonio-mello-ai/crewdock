import { subscribeToJob } from "../jobs/job-manager.js";
import type { WsMessage } from "@aios/shared";

interface WsLike {
  send(data: string): void;
  close(): void;
  addEventListener(event: string, handler: () => void): void;
}

export function handleLogStreamConnection(
  ws: WsLike,
  jobId: string
) {
  const unsubscribe = subscribeToJob(jobId, (msg: WsMessage) => {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // connection closed
    }
  });

  if (!unsubscribe) {
    ws.send(JSON.stringify({ type: "error", message: "Job not found or not running" }));
    ws.close();
    return;
  }

  ws.addEventListener("close", () => {
    unsubscribe();
  });
}
