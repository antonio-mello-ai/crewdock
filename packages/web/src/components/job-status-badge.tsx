import type { JobStatus } from "@aios/shared";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  JobStatus,
  { label: string; bg: string; text: string; dot: string; pulse?: boolean }
> = {
  queued: {
    label: "Queued",
    bg: "bg-neutral-800/60",
    text: "text-neutral-400",
    dot: "bg-neutral-500",
  },
  running: {
    label: "Running",
    bg: "bg-blue-950/60",
    text: "text-blue-400",
    dot: "bg-blue-400",
    pulse: true,
  },
  completed: {
    label: "Completed",
    bg: "bg-green-950/50",
    text: "text-green-400",
    dot: "bg-green-400",
  },
  failed: {
    label: "Failed",
    bg: "bg-red-950/50",
    text: "text-red-400",
    dot: "bg-red-400",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-yellow-950/40",
    text: "text-yellow-400",
    dot: "bg-yellow-400",
  },
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const cfg = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        cfg.bg,
        cfg.text
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          cfg.dot,
          cfg.pulse && "animate-pulse-dot"
        )}
      />
      {cfg.label}
    </span>
  );
}
