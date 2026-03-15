"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/atoms/page-header";
import { EmptyState } from "@/components/atoms/empty-state";
import { Zap, Bot } from "lucide-react";

interface SkillInfo {
  name: string;
  agent: string;
  description: string;
  enabled: boolean;
  phase: number;
}

const SKILLS: SkillInfo[] = [
  {
    name: "morning-briefing",
    agent: "Atlas",
    description: "Daily briefing: calendar, pending emails, tasks",
    enabled: false,
    phase: 1,
  },
  {
    name: "infra-health",
    agent: "Nexus",
    description: "SSH health check on all VMs via Tailscale",
    enabled: false,
    phase: 1,
  },
  {
    name: "company-context",
    agent: "Atlas",
    description: "Knowledge base search for company context questions",
    enabled: false,
    phase: 1,
  },
  {
    name: "content-radar",
    agent: "Pulse",
    description: "Web search for AI/tech news and trends",
    enabled: false,
    phase: 2,
  },
  {
    name: "project-checkin",
    agent: "Bernard",
    description: "Git log, open PRs, issues overview",
    enabled: false,
    phase: 2,
  },
  {
    name: "code-activity",
    agent: "Bernard",
    description: "Analyze commits, identify patterns",
    enabled: false,
    phase: 2,
  },
];

export default function SkillsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills"
        subtitle={`${SKILLS.length} skills available`}
      />

      {SKILLS.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No skills available"
          description="Skills will be added as agents gain new capabilities."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {SKILLS.map((skill) => (
            <Card key={skill.name} className="card-hover">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm truncate">
                        {skill.name}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className="text-xs"
                        >
                          P{skill.phase}
                        </Badge>
                        <Badge
                          variant={skill.enabled ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {skill.enabled ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Bot className="h-3 w-3" />
                      {skill.agent}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {skill.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
