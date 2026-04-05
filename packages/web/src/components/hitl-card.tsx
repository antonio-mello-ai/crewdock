"use client";

import { useState } from "react";
import type { HitlRequest } from "@aios/shared";
import { formatTimeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Bot,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";

interface HitlCardProps {
  request: HitlRequest;
  agentName?: string;
  onRespond: (id: string, response: string) => void;
  isResponding?: boolean;
}

export function HitlCard({
  request,
  agentName,
  onRespond,
  isResponding,
}: HitlCardProps) {
  const [expanded, setExpanded] = useState(request.status === "pending");
  const [customResponse, setCustomResponse] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const isPending = request.status === "pending";
  const isResponded = request.status === "responded";

  const statusIcon = isPending ? (
    <Clock className="h-4 w-4 text-amber-400" />
  ) : isResponded ? (
    <CheckCircle2 className="h-4 w-4 text-green-400" />
  ) : (
    <XCircle className="h-4 w-4 text-neutral-500" />
  );

  const statusLabel = isPending
    ? "Pending"
    : isResponded
      ? "Responded"
      : "Expired";

  return (
    <div
      className={cn(
        "rounded-lg border transition-all",
        isPending
          ? "border-amber-900/40 bg-amber-950/10"
          : "border-neutral-800/50 bg-neutral-900/30"
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        {statusIcon}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-200 truncate">
            {request.question}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {agentName && (
              <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
                <Bot className="h-3 w-3" />
                {agentName}
              </span>
            )}
            <span className="text-[11px] text-neutral-600">
              {formatTimeAgo(request.createdAt)}
            </span>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            isPending
              ? "bg-amber-900/30 text-amber-400"
              : isResponded
                ? "bg-green-900/30 text-green-400"
                : "bg-neutral-800/50 text-neutral-500"
          )}
        >
          {statusLabel}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-neutral-600 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-neutral-600 shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Context */}
          {request.context && Object.keys(request.context).length > 0 && (
            <div className="rounded-md bg-neutral-950/50 border border-neutral-800/40 p-3">
              <pre className="text-xs font-mono text-neutral-400 whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(request.context, null, 2)}
              </pre>
            </div>
          )}

          {/* Response (if responded) */}
          {isResponded && request.response && (
            <div className="rounded-md bg-green-950/20 border border-green-900/20 p-3">
              <p className="text-xs text-neutral-400 mb-1">Response:</p>
              <p className="text-sm text-neutral-200">{request.response}</p>
            </div>
          )}

          {/* Action buttons (if pending) */}
          {isPending && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => onRespond(request.id, "approved")}
                  disabled={isResponding}
                  className="gap-1.5 bg-green-900/40 text-green-300 border border-green-800/40 hover:bg-green-900/60"
                >
                  {isResponding ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRespond(request.id, "rejected")}
                  disabled={isResponding}
                  className="gap-1.5 text-red-400 border-red-900/40 hover:bg-red-950/30"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCustom(!showCustom)}
                  className="gap-1.5 text-neutral-400"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Custom
                </Button>
              </div>

              {showCustom && (
                <div className="flex gap-2">
                  <textarea
                    name="hitl-custom-response"
                    value={customResponse}
                    onChange={(e) => setCustomResponse(e.target.value)}
                    placeholder="Type a custom response..."
                    rows={2}
                    className="flex-1 rounded-md border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-700 focus:outline-none resize-none"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (customResponse.trim()) {
                        onRespond(request.id, customResponse.trim());
                        setCustomResponse("");
                        setShowCustom(false);
                      }
                    }}
                    disabled={!customResponse.trim() || isResponding}
                    className="self-end"
                  >
                    Send
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
