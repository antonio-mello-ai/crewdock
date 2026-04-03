"use client";

import { cn, formatCost, formatDuration } from "@/lib/utils";
import { Markdown } from "@/components/markdown";
import { Bot, User, Clock, DollarSign } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  costUsd?: number;
  durationMs?: number;
  isStreaming?: boolean;
}

export function ChatMessage({
  role,
  content,
  timestamp,
  costUsd,
  durationMs,
  isStreaming,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3 group",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
          isUser
            ? "border-blue-800/50 bg-blue-950/60"
            : "border-neutral-700/50 bg-neutral-800/60"
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-blue-400" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-neutral-400" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[75%] min-w-0 rounded-lg px-4 py-3",
          isUser
            ? "bg-blue-950/40 border border-blue-900/30"
            : "bg-neutral-900/60 border border-neutral-800/50"
        )}
      >
        {isUser ? (
          <p className="text-sm text-neutral-200 whitespace-pre-wrap break-words">
            {content}
          </p>
        ) : (
          <Markdown content={content} />
        )}

        {/* Streaming indicator */}
        {isStreaming && (
          <span className="inline-flex gap-1 mt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-500 animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-500 animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-500 animate-bounce [animation-delay:300ms]" />
          </span>
        )}

        {/* Meta info — assistant only */}
        {!isUser && !isStreaming && (costUsd !== undefined || durationMs !== undefined) && (
          <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity">
            {durationMs !== undefined && durationMs > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(durationMs)}
              </span>
            )}
            {costUsd !== undefined && costUsd > 0 && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatCost(costUsd)}
              </span>
            )}
          </div>
        )}

        {/* Timestamp */}
        {timestamp && !isStreaming && (
          <div className="mt-1.5 text-[11px] text-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity">
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>
    </div>
  );
}
