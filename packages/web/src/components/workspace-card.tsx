"use client";

import type { Session, Workspace } from "@aios/shared";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatTimeAgo, formatCost } from "@/lib/utils";
import { MessageSquare, FolderOpen, ArrowRight } from "lucide-react";

interface WorkspaceCardProps {
  workspace: Workspace;
  sessions: Session[];
}

export function WorkspaceCard({ workspace, sessions }: WorkspaceCardProps) {
  const activeSessions = sessions.filter((s) => s.status === "active");
  const totalCost = sessions.reduce((sum, s) => sum + s.totalCostUsd, 0);
  const lastActive = sessions.reduce(
    (max, s) => Math.max(max, s.lastActiveAt),
    0
  );

  return (
    <Link
      href={`/console?workspace=${workspace.id}`}
      className="block"
    >
      <Card className="group relative overflow-hidden transition-all duration-200 hover:border-neutral-700 hover:shadow-md hover:shadow-black/20 cursor-pointer">
        {/* Subtle top accent line */}
        <div
          className={`absolute top-0 left-0 right-0 h-px ${
            activeSessions.length > 0
              ? "bg-blue-500/60"
              : sessions.length > 0
                ? "bg-green-500/30"
                : "bg-neutral-800"
          }`}
        />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-sm font-semibold tracking-wide text-neutral-200 truncate">
              {workspace.name}
            </CardTitle>
            <div className="flex items-center gap-1 text-muted-foreground shrink-0">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="text-xs font-mono">{sessions.length}</span>
            </div>
          </div>
          {workspace.description && (
            <p className="text-xs text-neutral-500 line-clamp-2 mt-1">
              {workspace.description}
            </p>
          )}
        </CardHeader>

        <CardContent>
          {sessions.length > 0 ? (
            <div className="space-y-2">
              {/* Stats row */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-neutral-500">
                  {activeSessions.length > 0 ? (
                    <>
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                      <span>{activeSessions.length} active</span>
                    </>
                  ) : (
                    <span>Last: {formatTimeAgo(lastActive)}</span>
                  )}
                </div>
                <span className="text-neutral-600 font-mono">
                  {formatCost(totalCost)}
                </span>
              </div>

              {/* Recent session preview */}
              {sessions.slice(0, 2).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 text-xs text-neutral-500 truncate"
                >
                  <ArrowRight className="h-3 w-3 shrink-0 text-neutral-700" />
                  <span className="truncate">
                    {s.title || `Session ${s.id.slice(0, 6)}`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <FolderOpen className="h-3 w-3" />
              <span>No sessions yet</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
