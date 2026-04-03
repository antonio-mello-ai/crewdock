"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { WS_URL } from "@/lib/utils";
import type { SessionMessage, SessionWsMessage } from "@aios/shared";

interface UseSessionReturn {
  messages: SessionMessage[];
  streamingContent: string;
  isStreaming: boolean;
  isConnected: boolean;
  sendMessage: (content: string) => void;
  connect: (sessionId: string) => void;
  disconnect: () => void;
  setMessages: React.Dispatch<React.SetStateAction<SessionMessage[]>>;
}

export function useSession(): UseSessionReturn {
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(
    (sessionId: string) => {
      disconnect();
      sessionIdRef.current = sessionId;

      const ws = new WebSocket(`${WS_URL}/ws/sessions/${sessionId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg: SessionWsMessage = JSON.parse(event.data);

          if (msg.type === "chunk") {
            setIsStreaming(true);
            setStreamingContent((prev) => prev + msg.content);
          } else if (msg.type === "done") {
            setIsStreaming(false);
            const finalContent = streamingContentRef.current;
            setStreamingContent("");

            const assistantMsg: SessionMessage = {
              id: msg.messageId,
              sessionId,
              role: "assistant",
              content: finalContent,
              costUsd: msg.costUsd,
              tokensIn: 0,
              tokensOut: 0,
              durationMs: msg.durationMs,
              createdAt: Date.now(),
            };

            setMessages((prev) => [...prev, assistantMsg]);
          } else if (msg.type === "error") {
            setIsStreaming(false);
            setStreamingContent("");
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    },
    [disconnect]
  );

  // Keep a ref to streaming content for the done handler
  const streamingContentRef = useRef("");
  useEffect(() => {
    streamingContentRef.current = streamingContent;
  }, [streamingContent]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!sessionIdRef.current) return;

      // Add user message to local state immediately
      const userMsg: SessionMessage = {
        id: `temp-${Date.now()}`,
        sessionId: sessionIdRef.current,
        role: "user",
        content,
        costUsd: 0,
        tokensIn: 0,
        tokensOut: 0,
        durationMs: 0,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setStreamingContent("");
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    messages,
    streamingContent,
    isStreaming,
    isConnected,
    sendMessage,
    connect,
    disconnect,
    setMessages,
  };
}
