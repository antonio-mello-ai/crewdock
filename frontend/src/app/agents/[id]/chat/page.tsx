"use client";

import { useState, useRef, useEffect, useCallback, use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api/client";
import { getToken } from "@/lib/auth";
import type { Agent } from "@/lib/api/types";
import Link from "next/link";
import { Send, ArrowLeft, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AgentChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: agent } = useQuery<Agent>({
    queryKey: ["agent", id],
    queryFn: () => apiFetch(`/api/v1/agents/${id}`),
  });

  // Load previous session if available
  useEffect(() => {
    const savedSession = sessionStorage.getItem(`chat_session_${id}`);
    if (!savedSession) return;
    setSessionId(savedSession);
    const token = getToken() || process.env.NEXT_PUBLIC_API_TOKEN || "";
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${apiUrl}/api/v1/chat/history/${savedSession}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((history: { role: string; content: string }[]) => {
        if (Array.isArray(history) && history.length > 0) {
          setMessages(
            history.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
              timestamp: new Date(),
            }))
          );
        }
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const message = input.trim();
    setInput("");
    setStreaming(true);

    // Add user message
    setMessages((prev) => [
      ...prev,
      { role: "user", content: message, timestamp: new Date() },
    ]);

    // Add empty assistant message that we'll stream into
    const assistantIndex = messages.length + 1;
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", timestamp: new Date() },
    ]);

    try {
      const token = getToken() || process.env.NEXT_PUBLIC_API_TOKEN || "";
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

      const response = await fetch(`${apiUrl}/api/v1/chat/${id}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message, session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.token) {
              fullText += data.token;
              setMessages((prev) => {
                const updated = [...prev];
                updated[assistantIndex] = {
                  ...updated[assistantIndex],
                  content: fullText,
                };
                return updated;
              });
            }
            if (data.done && data.session_id) {
              setSessionId(data.session_id);
              sessionStorage.setItem(`chat_session_${id}`, data.session_id);
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Connection failed";
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantIndex] = {
          ...updated[assistantIndex],
          content: `Error: ${errorMsg}`,
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, messages.length, id, sessionId]);

  return (
    <div className="flex h-[calc(100vh-4.5rem)] md:h-[calc(100vh-3rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b pb-3">
        <Link
          href="/agents"
          className="text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-semibold">
          {agent?.name ?? "Loading..."}
        </h1>
        {agent && (
          <Badge variant="outline" className="text-xs">
            {agent.model}
          </Badge>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                <MessageSquare className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">
                Chat with {agent?.name ?? "agent"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Send a message to start the conversation.
              </p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
              {msg.content && (
                <p className="text-xs opacity-50 mt-1">
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        ))}
        {streaming && messages[messages.length - 1]?.content === "" && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2.5">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t pt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${agent?.name ?? "agent"}...`}
            disabled={streaming}
            className="flex-1"
            autoFocus
          />
          <Button type="submit" disabled={streaming || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
