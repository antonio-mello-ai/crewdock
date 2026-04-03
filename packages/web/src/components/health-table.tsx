"use client";

import type { AgentHealth } from "@aios/shared";
import { formatCost } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HealthTableProps {
  data: AgentHealth[];
}

function TrendIndicator({ value }: { value: number }) {
  if (Math.abs(value) < 1) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
        <Minus className="h-3 w-3" />
        <span className="font-mono">0%</span>
      </span>
    );
  }

  // For cost, up is bad (red), down is good (green)
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-400">
        <TrendingUp className="h-3 w-3" />
        <span className="font-mono">+{value.toFixed(0)}%</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-400">
      <TrendingDown className="h-3 w-3" />
      <span className="font-mono">{value.toFixed(0)}%</span>
    </span>
  );
}

export function HealthTable({ data }: HealthTableProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-900/30 p-8 text-center">
        <p className="text-sm text-neutral-600">No agent health data</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/30 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-neutral-800/60 hover:bg-transparent">
            <TableHead className="text-xs font-medium text-neutral-400">
              Agent
            </TableHead>
            <TableHead className="text-xs font-medium text-neutral-400 text-right">
              Cost (7d)
            </TableHead>
            <TableHead className="text-xs font-medium text-neutral-400 text-right">
              Jobs
            </TableHead>
            <TableHead className="text-xs font-medium text-neutral-400 text-right">
              Fail Rate
            </TableHead>
            <TableHead className="text-xs font-medium text-neutral-400 text-right">
              Trend
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((agent) => (
            <TableRow
              key={agent.agentId}
              className="border-neutral-800/40 hover:bg-neutral-800/20"
            >
              <TableCell className="font-mono text-sm text-neutral-200">
                {agent.agentId}
              </TableCell>
              <TableCell className="text-right font-mono text-sm text-neutral-300">
                {formatCost(agent.totalCost7d)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm text-neutral-300">
                {agent.totalJobs7d}
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={`font-mono text-sm ${
                    agent.failRate > 0.2
                      ? "text-red-400"
                      : agent.failRate > 0.05
                        ? "text-yellow-400"
                        : "text-green-400"
                  }`}
                >
                  {(agent.failRate * 100).toFixed(0)}%
                </span>
              </TableCell>
              <TableCell className="text-right">
                <TrendIndicator value={agent.costTrendPct} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
