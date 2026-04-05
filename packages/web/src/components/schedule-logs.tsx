"use client";

import { useScheduleLogs } from "@/hooks/use-api";
import { Loader2 } from "lucide-react";

export function ScheduleLogs({ name }: { name: string }) {
  const { data, isLoading, error } = useScheduleLogs(name, true);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-neutral-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading logs…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-400 py-2">
        Error: {error.message}
      </div>
    );
  }

  const lines = data?.data?.lines ?? [];

  if (lines.length === 0) {
    return (
      <div className="text-xs text-neutral-600 py-2 italic">
        No logs yet (service has not run, or logs rotated out).
      </div>
    );
  }

  return (
    <div className="rounded border border-neutral-800/60 bg-neutral-950/60 max-h-80 overflow-y-auto">
      <pre className="text-[11px] font-mono text-neutral-400 p-3 whitespace-pre-wrap break-all">
        {lines.join("\n")}
      </pre>
    </div>
  );
}
