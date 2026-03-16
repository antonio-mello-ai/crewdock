"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/atoms/page-header";
import { EmptyState } from "@/components/atoms/empty-state";
import { apiFetch } from "@/lib/api/client";
import { Zap, Wrench } from "lucide-react";

interface McpTool {
  server: string;
  name: string;
  qualified_name: string;
  description: string;
}

interface Skill {
  id: string;
  name: string;
  description: string | null;
  agent_id: string | null;
  enabled: boolean;
}

export default function SkillsPage() {
  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ["skills"],
    queryFn: () => apiFetch("/api/v1/skills"),
  });

  const { data: mcpTools = [] } = useQuery<McpTool[]>({
    queryKey: ["mcp-tools"],
    queryFn: () => apiFetch("/api/v1/mcp/tools"),
  });

  const totalCount = skills.length + mcpTools.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills"
        subtitle={`${totalCount} skill${totalCount !== 1 ? "s" : ""} available`}
      />

      {/* MCP Tools */}
      {mcpTools.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            MCP Tools ({mcpTools.length})
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {mcpTools.map((tool) => (
              <Card key={tool.qualified_name} className="card-hover">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Wrench className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm truncate">{tool.name}</h3>
                        <Badge variant="default" className="text-xs">Active</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        via {tool.server}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Registered Skills */}
      {skills.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Registered Skills ({skills.length})
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <Card key={skill.id} className="card-hover">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm truncate">{skill.name}</h3>
                        <Badge variant={skill.enabled ? "default" : "secondary"} className="text-xs">
                          {skill.enabled ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {skill.description && (
                        <p className="text-sm text-muted-foreground mt-2">{skill.description}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {totalCount === 0 && (
        <EmptyState
          icon={Zap}
          title="No skills available"
          description="Register MCP servers in Settings or create skills via the API."
        />
      )}
    </div>
  );
}
