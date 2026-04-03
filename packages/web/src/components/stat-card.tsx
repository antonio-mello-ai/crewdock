"use client";

import { cn } from "@/lib/utils";

interface StatCardProps {
  value: string;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ value, label, icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-800/60 bg-neutral-900/40 p-5 transition-colors hover:border-neutral-700/60",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-neutral-100 font-mono">
            {value}
          </p>
          <p className="mt-1 text-xs text-neutral-500">{label}</p>
        </div>
        {icon && (
          <div className="text-neutral-600">{icon}</div>
        )}
      </div>
    </div>
  );
}
