"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    name: "felhen-context",
    agent: "Atlas",
    description: "QMD search for company context questions",
    enabled: false,
    phase: 1,
  },
  {
    name: "content-radar",
    agent: "Pulse",
    description: "Web search for AI/tech news",
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
    <div>
      <h1 className="text-2xl font-bold">Skills</h1>
      <p className="mt-1 text-muted-foreground">
        Skills registry per agent.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {SKILLS.map((skill) => (
          <Card key={skill.name}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                {skill.name}
                <div className="flex gap-1">
                  <Badge variant="outline">Phase {skill.phase}</Badge>
                  <Badge variant={skill.enabled ? "default" : "secondary"}>
                    {skill.enabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{skill.agent}</p>
              <p className="mt-1 text-sm">{skill.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
