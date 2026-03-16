"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useCosts, useAgents } from "@/hooks/use-api";
import { DollarSign, Coins, Hash, TrendingUp } from "lucide-react";

const PERIODS = [
  { label: "Today", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "All", days: 0 },
];

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function CostsPage() {
  const { data: costs = [] } = useCosts();
  const { data: agents = [] } = useAgents();
  const [periodDays, setPeriodDays] = useState(0);
  // Capture "now" at mount — stable across renders
  const [mountTime] = useState(() => Date.now());

  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.name]));
  const agentIndex = Object.fromEntries(agents.map((a, i) => [a.id, i]));

  // Filter costs by period
  const filteredCosts = useMemo(() => {
    if (periodDays === 0) return costs;
    const cutoff = mountTime - periodDays * 86400000;
    return costs.filter((c) => new Date(c.created_at).getTime() > cutoff);
  }, [costs, periodDays, mountTime]);

  // Aggregate by agent from filtered costs
  const agentCosts: Record<string, { cost: number; tokens: number }> = {};
  for (const c of filteredCosts) {
    const key = c.agent_id;
    if (!agentCosts[key]) agentCosts[key] = { cost: 0, tokens: 0 };
    agentCosts[key].cost += c.cost_usd;
    agentCosts[key].tokens += c.tokens_in + c.tokens_out;
  }

  const chartData = Object.entries(agentCosts).map(([agentId, data]) => ({
    name: agentMap[agentId] || agentId.slice(0, 8),
    cost: Number(data.cost.toFixed(4)),
    tokens: data.tokens,
    fill: AGENT_CHART_COLORS[(agentIndex[agentId] ?? 0) % AGENT_CHART_COLORS.length],
  }));

  const totalCost = Object.values(agentCosts).reduce((s, d) => s + d.cost, 0);
  const totalTokens = Object.values(agentCosts).reduce((s, d) => s + d.tokens, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Costs</h1>
          <p className="text-sm text-muted-foreground">
            Token usage and cost tracking per agent.
          </p>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.label}
              variant={periodDays === p.days ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriodDays(p.days)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Total Cost" value={`$${totalCost.toFixed(2)}`} icon={DollarSign} />
        <StatCard
          title="Total Tokens"
          value={totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(0)}K` : String(totalTokens)}
          icon={Coins}
        />
        <StatCard title="Cost Entries" value={String(filteredCosts.length)} icon={Hash} />
        <StatCard title="Agents Tracked" value={String(Object.keys(agentCosts).length)} icon={TrendingUp} />
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
