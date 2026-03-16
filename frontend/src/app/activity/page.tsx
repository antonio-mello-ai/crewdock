"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useActivity, useAgents } from "@/hooks/use-api";
import ReactMarkdown from "react-markdown";
import {
  Activity as ActivityIcon,
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  CheckCircle,
  Bot,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

function actionIcon(action: string) {
  if (action.includes("created")) return <Plus className="h-3.5 w-3.5" />;
  if (action.includes("updated")) return <Pencil className="h-3.5 w-3.5" />;
  if (action.includes("deleted")) return <Trash2 className="h-3.5 w-3.5" />;
  if (action.includes("chat")) return <MessageSquare className="h-3.5 w-3.5" />;
  if (action.includes("completed") || action.includes("approved")) return <CheckCircle className="h-3.5 w-3.5" />;
  return <ActivityIcon className="h-3.5 w-3.5" />;
}

function actionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("created")) return "default";
  if (action.includes("deleted")) return "destructive";
  if (action.includes("chat")) return "secondary";
  if (action.includes("completed")) return "default";
  return "outline";
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getPayloadText(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  // For task results, show the result field
  if (payload.result) return String(payload.result);
  // For chat, show the message
  if (payload.message) return String(payload.message);
  // For other, join values
  const values = Object.values(payload).filter((v) => typeof v === "string");
  return values.length > 0 ? values.join(", ") : null;
}

export default function ActivityPage() {
  const { data: activities = [], isLoading } = useActivity({ limit: 50 });
  const { data: agents = [] } = useAgents();
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.name]));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="text-sm text-muted-foreground">
          {activities.length} event{activities.length !== 1 ? "s" : ""} recorded
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 rounded bg-muted" />
                  <div className="h-3 w-48 rounded bg-muted" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : activities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ActivityIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">No activity yet</p>
            <p className="text-sm text-muted-foreground">
              Activity will appear here as you interact with your agents.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {activities.map((activity, i) => {
              const agentName = agentMap[activity.agent_id] ?? activity.agent_id.slice(0, 8);
              const payloadText = getPayloadText(activity.payload);
              const isExpanded = expanded.has(activity.id);
              const hasContent = !!payloadText && payloadText.length > 80;

              return (
                <div
                  key={activity.id}
                  className={`px-4 py-3 transition-colors hover:bg-muted/50 ${
                    i < activities.length - 1 ? "border-b" : ""
                  } ${hasContent ? "cursor-pointer" : ""}`}
                  onClick={() => hasContent && toggle(activity.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      {actionIcon(activity.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={actionVariant(activity.action)} className="text-xs gap-1">
                          {activity.action.replace(".", " ")}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Bot className="h-3 w-3" />
                          {agentName}
                        </div>
                        {payloadText && !isExpanded && (
                          <span className="text-sm truncate max-w-md">
                            {payloadText.slice(0, 80)}{payloadText.length > 80 ? "..." : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(activity.created_at)}
                      </span>
                      {hasContent && (
                        isExpanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  {isExpanded && payloadText && (
                    <div className="mt-3 ml-12 p-3 rounded-lg bg-muted/50 text-sm prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{payloadText}</ReactMarkdown>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
