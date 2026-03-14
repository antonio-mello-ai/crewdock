"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useCosts, useCostSummary } from "@/hooks/use-api";
import { useAgents } from "@/hooks/use-api";

export default function CostsPage() {
  const { data: costs = [] } = useCosts();
  const { data: summary = [] } = useCostSummary();
  const { data: agents = [] } = useAgents();

  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.name]));

  const chartData = summary.map((s) => ({
    name: agentMap[s.agent_id] || s.agent_id.slice(0, 8),
    cost: Number(s.total_cost_usd),
    tokens: s.total_tokens_in + s.total_tokens_out,
  }));

  const totalCost = summary.reduce((s, d) => s + Number(d.total_cost_usd), 0);
  const totalTokens = summary.reduce(
    (s, d) => s + d.total_tokens_in + d.total_tokens_out,
    0
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Costs</h1>
      <p className="mt-1 text-muted-foreground">
        Token usage and cost tracking per agent.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totalTokens > 0
                ? `${(totalTokens / 1000).toFixed(0)}K`
                : "0"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cost Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{costs.length}</p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Cost by Agent (USD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cost" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          No cost data recorded yet.
        </p>
      )}
    </div>
  );
}
