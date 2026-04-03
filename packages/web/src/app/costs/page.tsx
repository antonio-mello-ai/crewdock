"use client";

import { useState } from "react";
import { useCostSummary, useCostByDay, useCostHealth } from "@/hooks/use-api";
import { StatCard } from "@/components/stat-card";
import { CostChart } from "@/components/cost-chart";
import { HealthTable } from "@/components/health-table";
import { formatCost } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  Loader2,
  Briefcase,
  Zap,
  Activity,
} from "lucide-react";

const periods = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
] as const;

type Period = (typeof periods)[number]["value"];

export default function CostsPage() {
  const [period, setPeriod] = useState<Period>("7d");

  const { data: summaryData, isLoading: summaryLoading } =
    useCostSummary(period);
  const { data: byDayData, isLoading: byDayLoading } = useCostByDay(period);
  const { data: healthData, isLoading: healthLoading } = useCostHealth();

  const summary = summaryData?.data;
  const byDay = byDayData?.data ?? [];
  const health = healthData?.data ?? [];

  const isLoading = summaryLoading || byDayLoading || healthLoading;

  function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100">
            Costs
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Resource consumption and agent health
          </p>
        </div>

        {/* Period selector */}
        <div className="flex items-center rounded-lg border border-neutral-800 bg-neutral-900/40 p-0.5">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "rounded-md px-4 py-1.5 text-xs font-medium transition-all",
                period === p.value
                  ? "bg-neutral-800 text-neutral-100 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              value={summary ? formatCost(summary.totalCostUsd) : "$0.00"}
              label="Total cost"
              icon={<DollarSign className="h-5 w-5" />}
            />
            <StatCard
              value={summary ? String(summary.totalJobs) : "0"}
              label="Jobs completed"
              icon={<Briefcase className="h-5 w-5" />}
            />
            <StatCard
              value={
                summary
                  ? formatTokens(
                      summary.totalTokensIn + summary.totalTokensOut
                    )
                  : "0"
              }
              label="Total tokens"
              icon={<Zap className="h-5 w-5" />}
            />
          </div>

          {/* Area chart */}
          <div>
            <h2 className="text-sm font-medium text-neutral-300 mb-3">
              Cost Over Time
            </h2>
            <CostChart data={byDay} />
          </div>

          {/* Agent Health */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-neutral-500" />
              <h2 className="text-sm font-medium text-neutral-300">
                Agent Health
              </h2>
            </div>
            <HealthTable data={health} />
          </div>
        </div>
      )}
    </div>
  );
}
