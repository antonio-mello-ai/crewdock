"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  useWorkspaces,
  useSessions,
  useSessionMessages,
  useCreateSession,
  useSendMessage,
  useCancelSession,
} from "@/hooks/use-api";
import { useSession as useSessionWs } from "@/hooks/use-session";
import { ChatMessage } from "@/components/chat-message";
import { MessageInput } from "@/components/message-input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCost, formatDuration } from "@/lib/utils";
import {
  FolderOpen,
  Plus,
  MessageSquare,
  Loader2,
  DollarSign,
  Clock,
  Hash,
  Shield,
  ShieldOff,
} from "lucide-react";
import type { PermissionMode } from "@aios/shared";

const PERMISSION_LABELS: Record<string, { icon: typeof Shield; color: string }> = {
  plan: { icon: Shield, color: "text-green-500" },
  full: { icon: ShieldOff, color: "text-red-500" },
};

export default function ConsolePage() {
  const { data: workspacesData } = useWorkspaces();
  const workspaces = workspacesData?.data ?? [];

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [permissionMode, setPermissionMode] = useState<PermissionMode>("plan");

  // Sessions for selected workspace
  const { data: sessionsData } = useSessions(selectedWorkspaceId || undefined);
  const agentSessions = sessionsData?.data ?? [];

  // Messages for active session
  const { data: messagesData } = useSessionMessages(activeSessionId);

  // Session creation + message sending
  const createSession = useCreateSession();
  const sendMessage = useSendMessage(activeSessionId ?? "");
  const cancelSession = useCancelSession(activeSessionId ?? "");

  // WebSocket streaming
  const ws = useSessionWs();

  // Scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Current workspace
  const selectedWorkspace = useMemo(
    () => workspaces.find((w) => w.id === selectedWorkspaceId),
    [workspaces, selectedWorkspaceId]
  );

  // Handle deep-link query params (?workspace=X&session=Y) — runs once on mount
  const [deepLinkApplied, setDeepLinkApplied] = useState(false);
  useEffect(() => {
    if (deepLinkApplied || typeof window === "undefined" || workspaces.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const wsParam = params.get("workspace");
    const sessionParam = params.get("session");
    if (wsParam && workspaces.some((w) => w.id === wsParam)) {
      setSelectedWorkspaceId(wsParam);
    }
    if (sessionParam) {
      setActiveSessionId(sessionParam);
    }
    setDeepLinkApplied(true);
  }, [workspaces, deepLinkApplied]);

  // Auto-select first workspace
  useEffect(() => {
    if (workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId]);

  // Merge API messages with streaming messages
  const allMessages = useMemo(() => {
    const apiMessages = messagesData?.data ?? [];
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

  // Clear messages when session changes
  useEffect(() => {
    ws.setMessages([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  // Handlers
  const handleNewSession = useCallback(() => {
    if (!selectedWorkspaceId) return;
    createSession.mutate(
      { workspaceId: selectedWorkspaceId, permissionMode },
      {
        onSuccess: (res) => {
          setActiveSessionId(res.data.id);
        },
      }
    );
  }, [selectedWorkspaceId, createSession, permissionMode]);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!activeSessionId) return;
      ws.sendMessage(content);
      sendMessage.mutate({ content });
    },
    [activeSessionId, ws, sendMessage]
  );

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

  // Group workspaces by group
  const workspaceGroups = useMemo(() => {
    const groups = new Map<string, typeof workspaces>();
    for (const ws of workspaces) {
      const group = ws.group ?? "Other";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(ws);
    }
    return groups;
  }, [workspaces]);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="border-b border-border bg-neutral-950/30 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Workspace selector */}
          <div className="w-52">
            <Select
              value={selectedWorkspaceId}
              onChange={(e) => {
                setSelectedWorkspaceId(e.target.value);
                setActiveSessionId(undefined);
              }}
              icon={<FolderOpen className="h-3.5 w-3.5" />}
            >
              <option value="" disabled>
                Select workspace
              </option>
              {Array.from(workspaceGroups.entries()).map(([group, wsList]) => (
                <optgroup key={group} label={group}>
                  {wsList.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>

          {/* Session selector */}
          {agentSessions.length > 0 && (
            <div className="w-56">
              <Select
                value={activeSessionId ?? ""}
                onChange={(e) => setActiveSessionId(e.target.value)}
                icon={<MessageSquare className="h-3.5 w-3.5" />}
              >
                <option value="" disabled>
                  Select session
                </option>
                {agentSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title || `Session ${session.id.slice(0, 8)}`}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Permission Mode */}
          <div className="w-40">
            <Select
              value={permissionMode}
              onChange={(e) =>
                setPermissionMode(e.target.value as PermissionMode)
              }
              icon={
                (() => {
                  const perm = PERMISSION_LABELS[permissionMode] ?? PERMISSION_LABELS.plan;
                  const Icon = perm.icon;
                  return (
                    <Icon
                      className={`h-3.5 w-3.5 ${perm.color}`}
                    />
                  );
                })()
              }
            >
              <option value="plan">Read Only</option>
              <option value="full">Dangerously Accept Edits</option>
            </Select>
          </div>

          {/* New Session */}
          <Button
            onClick={handleNewSession}
            disabled={!selectedWorkspaceId || createSession.isPending}
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

          {/* Session stats (inline, no sidebar needed) */}
          {activeSessionId && sessionStats.messageCount > 0 && (
            <div className="hidden md:flex items-center gap-3 text-xs text-neutral-500">
              <div className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                <span className="font-mono">{sessionStats.messageCount} msgs</span>
              </div>
              <Separator orientation="vertical" className="h-3" />
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span className="font-mono">{formatCost(sessionStats.cost)}</span>
              </div>
              <Separator orientation="vertical" className="h-3" />
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="font-mono">{formatDuration(sessionStats.duration)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Workspace description */}
        {selectedWorkspace && (
          <p className="mt-2 text-xs text-neutral-600 font-mono truncate">
            {selectedWorkspace.description} — {selectedWorkspace.path}
          </p>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-auto">
        {activeSessionId ? (
          <div className="py-4">
            {allMessages.length === 0 && !ws.isStreaming ? (
              <div className="flex h-full min-h-[300px] items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-neutral-700 mb-3" />
                  <p className="text-sm text-neutral-500">
                    Start a conversation in{" "}
                    <span className="text-neutral-300 font-medium">
                      {selectedWorkspace?.name ?? "this workspace"}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-neutral-600">
                    Claude will read the CLAUDE.md and have full context of this project
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

                {ws.isStreaming && (
                  <ChatMessage
                    role="assistant"
                    content={ws.streamingContent ?? ""}
                    isStreaming
                  />
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center min-h-[400px]">
            <div className="text-center">
              <FolderOpen className="mx-auto h-10 w-10 text-neutral-700 mb-4" />
              <p className="text-sm text-neutral-500 mb-1">
                Select a workspace and start a session
              </p>
              <p className="text-xs text-neutral-600">
                Each workspace runs Claude with its own CLAUDE.md context
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      {activeSessionId && (
        <MessageInput
          onSend={handleSendMessage}
          onStop={() => cancelSession.mutate()}
          isStreaming={ws.isStreaming}
          disabled={sendMessage.isPending}
          placeholder={`Message ${selectedWorkspace?.name ?? "workspace"}...`}
        />
      )}
    </div>
  );
}
