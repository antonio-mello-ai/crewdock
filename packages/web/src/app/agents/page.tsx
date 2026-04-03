"use client";

import { useAgents } from "@/hooks/use-api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bot } from "lucide-react";

export default function AgentsPage() {
  const { data, isLoading } = useAgents();
  const agents = data?.data ?? [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-100">
          Agents
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Registered agent definitions
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center">
          <p className="text-sm text-neutral-500">No agents registered</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="hover:border-neutral-700 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-neutral-500" />
                  <CardTitle className="text-sm font-mono">
                    {agent.name}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {agent.description && (
                  <p className="text-xs text-neutral-500 mb-3">
                    {agent.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {agent.frente && (
                    <Badge variant="outline" className="text-[10px]">
                      {agent.frente}
                    </Badge>
                  )}
                  {agent.model && (
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {agent.model}
                    </Badge>
                  )}
                  {agent.modes.map((mode) => (
                    <Badge key={mode} variant="secondary" className="text-[10px]">
                      {mode}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
