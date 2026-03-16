"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AGENT_CHART_COLORS } from "@/lib/agent-colors";
import { useCosts, useCostSummary, useAgents } from "@/hooks/use-api";
import { DollarSign, Coins, Hash, TrendingUp } from "lucide-react";

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CostsPage() {
  const { data: costs = [] } = useCosts();
  const { data: summary = [] } = useCostSummary();
  const { data: agents = [] } = useAgents();

  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.name]));

  const agentIndex = Object.fromEntries(agents.map((a, i) => [a.id, i]));

  const chartData = summary.map((s) => ({
    name: agentMap[s.agent_id] || s.agent_id.slice(0, 8),
    cost: Number(s.total_cost_usd),
    tokens: s.total_tokens_in + s.total_tokens_out,
    fill: AGENT_CHART_COLORS[(agentIndex[s.agent_id] ?? 0) % AGENT_CHART_COLORS.length],
  }));

  const totalCost = summary.reduce((s, d) => s + Number(d.total_cost_usd), 0);
  const totalTokens = summary.reduce(
    (s, d) => s + d.total_tokens_in + d.total_tokens_out,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Costs</h1>
        <p className="text-sm text-muted-foreground">
          Token usage and cost tracking per agent.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Total Cost" value={`$${totalCost.toFixed(2)}`} icon={DollarSign} />
        <StatCard
          title="Total Tokens"
          value={totalTokens > 0 ? `${(totalTokens / 1000).toFixed(0)}K` : "0"}
          icon={Coins}
        />
        <StatCard title="Cost Entries" value={costs.length} icon={Hash} />
        <StatCard title="Agents Tracked" value={summary.length} icon={TrendingUp} />
      </div>

      {chartData.length > 0 ? (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-4">Cost by Agent (USD)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">No cost data yet</p>
            <p className="text-sm text-muted-foreground">
              Costs will be tracked as agents process tasks.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
