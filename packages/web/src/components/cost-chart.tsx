"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CostByDay } from "@aios/shared";

interface CostChartProps {
  data: CostByDay[];
}

export function CostChart({ data }: CostChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-neutral-800 bg-neutral-900/30">
        <p className="text-sm text-neutral-600">No cost data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/30 p-4">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#27272a"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickLine={false}
            axisLine={{ stroke: "#27272a" }}
            tickFormatter={(d: string) => {
              const date = new Date(d);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            width={55}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f0f12",
              border: "1px solid #27272a",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#e4e4e7",
            }}
            labelStyle={{ color: "#71717a", marginBottom: "4px" }}
            formatter={(value: number) => [`$${value.toFixed(4)}`, "Cost"]}
            labelFormatter={(label: string) => {
              const date = new Date(label);
              return date.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
            }}
          />
          <Area
            type="monotone"
            dataKey="costUsd"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#costGradient)"
            dot={false}
            activeDot={{
              r: 4,
              stroke: "#3b82f6",
              strokeWidth: 2,
              fill: "#0f0f12",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
