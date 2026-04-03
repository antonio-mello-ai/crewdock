"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WS_URL } from "@/lib/utils";
import type { WsMessage, JobStatus } from "@aios/shared";

export interface LogStreamState {
  lines: string[];
  isConnected: boolean;
  jobComplete: {
    status: JobStatus;
    exitCode: number | null;
    costUsd: number;
  } | null;
}

export function useLogStream(jobId: string | undefined): LogStreamState {
  const [lines, setLines] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [jobComplete, setJobComplete] = useState<LogStreamState["jobComplete"]>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!jobId) return;

    // Reset state
    setLines([]);
    setIsConnected(false);
    setJobComplete(null);
    cleanup();

    const ws = new WebSocket(`${WS_URL}/ws/jobs/${jobId}/logs`);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        switch (msg.type) {
          case "log":
            setLines((prev) => [...prev, msg.line]);
            break;
          case "job_complete":
            setJobComplete({
              status: msg.status,
              exitCode: msg.exitCode,
              costUsd: msg.costUsd,
            });
            break;
          case "error":
            setLines((prev) => [...prev, `[error] ${msg.message}`]);
            break;
        }
      } catch {
        // Non-JSON messages go straight to lines
        setLines((prev) => [...prev, event.data]);
      }
    };

    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    return cleanup;
  }, [jobId, cleanup]);

  return { lines, isConnected, jobComplete };
}
