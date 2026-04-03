"use client";

import type { Agent, Session } from "@aios/shared";
import { formatTimeAgo, formatCost, formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Bot,
  Cpu,
  FolderGit2,
  MessageSquare,
  DollarSign,
  Clock,
  History,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AgentPanelProps {
  agent: Agent | null;
  sessions: Session[];
  activeSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  messageCount?: number;
  sessionCost?: number;
  sessionDuration?: number;
}

export function AgentPanel({
  agent,
  sessions,
  activeSessionId,
  onSelectSession,
  messageCount = 0,
  sessionCost = 0,
  sessionDuration = 0,
}: AgentPanelProps) {
  if (!agent) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-neutral-600">Select an agent</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Agent Info */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-700/50 bg-neutral-800/60">
            <Bot className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-neutral-100 truncate">
              {agent.name}
            </h3>
            {agent.frente && (
              <span className="text-[11px] text-neutral-500 font-mono">
                {agent.frente}
              </span>
            )}
          </div>
        </div>

        {agent.description && (
          <p className="text-xs text-neutral-500 leading-relaxed line-clamp-3">
            {agent.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {agent.model && (
            <span className="inline-flex items-center gap-1 rounded bg-neutral-800/80 px-2 py-0.5 text-[11px] text-neutral-400 font-mono">
              <Cpu className="h-3 w-3" />
              {agent.model}
            </span>
          )}
          {agent.frente && (
            <span className="inline-flex items-center gap-1 rounded bg-neutral-800/80 px-2 py-0.5 text-[11px] text-neutral-400 font-mono">
              <FolderGit2 className="h-3 w-3" />
              {agent.frente}
            </span>
          )}
        </div>
      </div>

      <Separator />

      {/* Session Stats */}
      {activeSessionId && (
        <>
          <div className="p-4 space-y-2">
            <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              Session
            </h4>
            <div className="grid grid-cols-1 gap-1.5">
              <StatRow
                icon={<MessageSquare className="h-3 w-3" />}
                label="Messages"
                value={String(messageCount)}
              />
              <StatRow
                icon={<DollarSign className="h-3 w-3" />}
                label="Cost"
                value={formatCost(sessionCost)}
              />
              <StatRow
                icon={<Clock className="h-3 w-3" />}
                label="Duration"
                value={formatDuration(sessionDuration)}
              />
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Recent Sessions */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <History className="h-3 w-3 text-neutral-500" />
          <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
            Recent Sessions
          </h4>
        </div>

        {sessions.length > 0 ? (
          <div className="space-y-0.5">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  "w-full text-left rounded-md px-2.5 py-2 text-xs transition-colors",
                  session.id === activeSessionId
                    ? "bg-neutral-800/80 text-neutral-200"
                    : "text-neutral-500 hover:bg-neutral-800/40 hover:text-neutral-300"
                )}
              >
                <div className="truncate font-medium">
                  {session.title || "Untitled session"}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-600">
                  <span>{session.messageCount} msgs</span>
                  <span>{formatCost(session.totalCostUsd)}</span>
                  <span className="ml-auto">{formatTimeAgo(session.lastActiveAt)}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-600">No sessions yet</p>
        )}
      </div>
    </div>
  );
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-neutral-500">
        {icon}
        {label}
      </span>
      <span className="font-mono text-neutral-300">{value}</span>
    </div>
  );
}
