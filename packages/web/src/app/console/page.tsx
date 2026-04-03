"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  useAgents,
  useSessions,
  useSessionMessages,
  useCreateSession,
  useSendMessage,
} from "@/hooks/use-api";
import { useSession as useSessionWs } from "@/hooks/use-session";
import { ChatMessage } from "@/components/chat-message";
import { MessageInput } from "@/components/message-input";
import { AgentPanel } from "@/components/agent-panel";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Plus,
  MessageSquare,
  Loader2,
  PanelRightClose,
  PanelRight,
} from "lucide-react";

export default function ConsolePage() {
  const { data: agentsData } = useAgents();
  const agents = agentsData?.data ?? [];

  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [showPanel, setShowPanel] = useState(true);

  // Sessions for selected agent
  const { data: sessionsData } = useSessions(selectedAgentId || undefined);
  const sessions = sessionsData?.data ?? [];

  // Messages for active session
  const { data: messagesData } = useSessionMessages(activeSessionId);

  // Session creation
  const createSession = useCreateSession();

  // Message sending
  const sendMessage = useSendMessage(activeSessionId ?? "");

  // WebSocket streaming
  const ws = useSessionWs();

  // Scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Current agent
  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId),
    [agents, selectedAgentId]
  );

  // Auto-select first agent
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  // Merge API messages with streaming messages
  const allMessages = useMemo(() => {
    const apiMessages = messagesData?.data ?? [];
    // Use ws.messages that aren't in apiMessages
    const apiIds = new Set(apiMessages.map((m) => m.id));
    const wsOnly = ws.messages.filter((m) => !apiIds.has(m.id));
    return [...apiMessages, ...wsOnly];
  }, [messagesData?.data, ws.messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length, ws.streamingContent]);

  // Connect WS when session changes
  useEffect(() => {
    if (activeSessionId) {
      ws.connect(activeSessionId);
    }
    return () => {
      ws.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  // Load messages into WS state when session changes
  useEffect(() => {
    ws.setMessages([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  // Handlers
  const handleNewSession = useCallback(() => {
    if (!selectedAgentId) return;
    createSession.mutate(
      { agentId: selectedAgentId },
      {
        onSuccess: (res) => {
          setActiveSessionId(res.data.id);
        },
      }
    );
  }, [selectedAgentId, createSession]);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!activeSessionId) return;
      // Optimistic: add to ws state
      ws.sendMessage(content);
      // Actually send to API
      sendMessage.mutate({ content });
    },
    [activeSessionId, ws, sendMessage]
  );

  const handleSelectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  // Session stats
  const sessionStats = useMemo(() => {
    const msgs = allMessages;
    const cost = msgs.reduce((sum, m) => sum + (m.costUsd || 0), 0);
    const firstMsg = msgs[0];
    const lastMsg = msgs[msgs.length - 1];
    const duration =
      firstMsg && lastMsg ? lastMsg.createdAt - firstMsg.createdAt : 0;
    return { messageCount: msgs.length, cost, duration };
  }, [allMessages]);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="border-b border-border bg-neutral-950/30 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Agent selector */}
          <div className="w-52">
            <Select
              value={selectedAgentId}
              onChange={(e) => {
                setSelectedAgentId(e.target.value);
                setActiveSessionId(undefined);
              }}
              icon={<Bot className="h-3.5 w-3.5" />}
            >
              <option value="" disabled>
                Select agent
              </option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Session selector */}
          <div className="w-56">
            <Select
              value={activeSessionId ?? ""}
              onChange={(e) => setActiveSessionId(e.target.value)}
              icon={<MessageSquare className="h-3.5 w-3.5" />}
            >
              <option value="" disabled>
                Select session
              </option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.title || `Session ${session.id.slice(0, 8)}`}
                </option>
              ))}
            </Select>
          </div>

          {/* New Session */}
          <Button
            onClick={handleNewSession}
            disabled={!selectedAgentId || createSession.isPending}
            size="sm"
            className="gap-1.5"
          >
            {createSession.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            New Session
          </Button>

          <div className="flex-1" />

          {/* Toggle panel */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-neutral-500 hover:text-neutral-300 hidden lg:flex"
            onClick={() => setShowPanel(!showPanel)}
          >
            {showPanel ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Chat area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-auto">
            {activeSessionId ? (
              <div className="py-4">
                {allMessages.length === 0 && !ws.isStreaming ? (
                  <div className="flex h-full min-h-[300px] items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="mx-auto h-8 w-8 text-neutral-700 mb-3" />
                      <p className="text-sm text-neutral-500">
                        Start a conversation with{" "}
                        <span className="text-neutral-300 font-medium">
                          {selectedAgent?.name ?? "the agent"}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-neutral-600">
                        Type a message below
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {allMessages.map((msg) => (
                      <ChatMessage
                        key={msg.id}
                        role={msg.role}
                        content={msg.content}
                        timestamp={msg.createdAt}
                        costUsd={msg.costUsd}
                        durationMs={msg.durationMs}
                      />
                    ))}

                    {/* Streaming message */}
                    {ws.isStreaming && ws.streamingContent && (
                      <ChatMessage
                        role="assistant"
                        content={ws.streamingContent}
                        isStreaming
                      />
                    )}

                    {/* Streaming indicator without content yet */}
                    {ws.isStreaming && !ws.streamingContent && (
                      <div className="flex gap-3 px-4 py-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-700/50 bg-neutral-800/60">
                          <Bot className="h-3.5 w-3.5 text-neutral-400" />
                        </div>
                        <div className="rounded-lg bg-neutral-900/60 border border-neutral-800/50 px-4 py-3">
                          <span className="inline-flex gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-500 animate-bounce [animation-delay:0ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-500 animate-bounce [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-500 animate-bounce [animation-delay:300ms]" />
                          </span>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/50">
                    <MessageSquare className="h-6 w-6 text-neutral-600" />
                  </div>
                  <h2 className="text-base font-medium text-neutral-300">
                    Interactive Console
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600 max-w-xs">
                    Select an agent and create a session to start chatting
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          {activeSessionId && (
            <MessageInput
              onSend={handleSendMessage}
              disabled={!activeSessionId}
              isStreaming={ws.isStreaming}
              placeholder={
                selectedAgent
                  ? `Message ${selectedAgent.name}...`
                  : "Type a message..."
              }
            />
          )}
        </div>

        {/* Right panel */}
        {showPanel && (
          <div className="hidden lg:flex w-72 border-l border-border bg-neutral-950/30 flex-col">
            <AgentPanel
              agent={selectedAgent ?? null}
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={handleSelectSession}
              messageCount={sessionStats.messageCount}
              sessionCost={sessionStats.cost}
              sessionDuration={sessionStats.duration}
            />
          </div>
        )}
      </div>
    </div>
  );
}
