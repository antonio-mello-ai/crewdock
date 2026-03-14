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

// Placeholder data — will be replaced by API calls
const PLACEHOLDER_DATA = [
  { name: "Nexus", cost: 12.5, tokens: 450000 },
  { name: "Bernard", cost: 8.3, tokens: 320000 },
  { name: "Pulse", cost: 3.2, tokens: 280000 },
  { name: "Atlas", cost: 5.1, tokens: 350000 },
];

const TOTALS = {
  totalCost: PLACEHOLDER_DATA.reduce((s, d) => s + d.cost, 0),
  totalTokens: PLACEHOLDER_DATA.reduce((s, d) => s + d.tokens, 0),
  agents: PLACEHOLDER_DATA.length,
};

export default function CostsPage() {
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
            <p className="text-2xl font-bold">${TOTALS.totalCost.toFixed(2)}</p>
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
              {(TOTALS.totalTokens / 1000).toFixed(0)}K
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{TOTALS.agents}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Cost by Agent (USD)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={PLACEHOLDER_DATA}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="cost" fill="hsl(var(--primary))" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
