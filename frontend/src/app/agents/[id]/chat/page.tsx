"use client";

import { useState, useRef, useEffect, use } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api/client";
import type { Agent } from "@/lib/api/types";
import Link from "next/link";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatResponse {
  response: string;
  session_id: string;
  agent_id: string;
  agent_name: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: agent } = useQuery<Agent>({
    queryKey: ["agent", id],
    queryFn: () => apiFetch(`/api/v1/agents/${id}`),
  });

  const chatMutation = useMutation({
    mutationFn: (message: string) =>
      apiFetch<ChatResponse>(`/api/v1/chat/${id}`, {
        method: "POST",
        body: JSON.stringify({ message, session_id: sessionId }),
      }),
    onSuccess: (data) => {
      setSessionId(data.session_id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, timestamp: new Date() },
      ]);
    },
    onError: (error: Error) => {
      const errorMsg = error.message || "Unable to reach the agent.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${errorMsg}. Try a shorter message or check if the API key is configured.`,
          timestamp: new Date(),
        },
      ]);
    },
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;
    const message = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: message, timestamp: new Date() },
    ]);
    chatMutation.mutate(message);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-4.5rem)] md:h-[calc(100vh-3rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b pb-3">
        <Link
          href="/agents"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Agents
        </Link>
        <span className="text-muted-foreground">/</span>
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
              <p className="text-4xl mb-4">&#x1F4AC;</p>
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
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className="text-xs opacity-50 mt-1">
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <p className="text-sm text-muted-foreground animate-pulse">
                {agent?.name ?? "Agent"} is thinking...
              </p>
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
            disabled={chatMutation.isPending}
            className="flex-1"
            autoFocus
          />
          <Button type="submit" disabled={chatMutation.isPending || !input.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
