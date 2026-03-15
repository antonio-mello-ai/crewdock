"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/atoms/page-header";
import { createAgent } from "@/lib/api/mutations";
import {
  AGENT_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type AgentTemplate,
} from "@/lib/agent-templates";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  BarChart2,
  PenTool,
  Headphones,
  Code2,
  Trophy,
  Users,
  Briefcase,
  Share2,
  Microscope,
  Plus,
  Check,
  Sparkles,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  search: Search,
  "bar-chart-2": BarChart2,
  "pen-tool": PenTool,
  headphones: Headphones,
  "code-2": Code2,
  trophy: Trophy,
  users: Users,
  briefcase: Briefcase,
  "share-2": Share2,
  microscope: Microscope,
};

const CATEGORY_COLORS: Record<string, string> = {
  Marketing: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  Analytics: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Operations: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Engineering: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  Sales: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  HR: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  Strategy: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

function TemplateCard({
  template,
  onInstall,
  installing,
  installed,
}: {
  template: AgentTemplate;
  onInstall: () => void;
  installing: boolean;
  installed: boolean;
}) {
  const Icon = ICON_MAP[template.icon] || Sparkles;
  const colorClass =
    CATEGORY_COLORS[template.category] ||
    "bg-slate-500/10 text-slate-600 dark:text-slate-400";

  return (
    <Card className="card-hover flex flex-col">
      <CardContent className="p-5 flex flex-col flex-1">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorClass}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">{template.name}</h3>
              <Badge variant="outline" className="text-xs">
                {template.category}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {template.model}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-3 flex-1">
          {template.description}
        </p>

        <div className="flex flex-wrap gap-1 mt-3">
          {template.skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t">
          <Button
            size="sm"
            className="w-full gap-2"
            onClick={onInstall}
            disabled={installing || installed}
            variant={installed ? "outline" : "default"}
          >
            {installed ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Installed
              </>
            ) : installing ? (
              "Installing..."
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Install Agent
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TemplatesPage() {
  const [filter, setFilter] = useState<string | null>(null);
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const installMutation = useMutation({
    mutationFn: (template: AgentTemplate) =>
      createAgent({
        name: template.name,
        model: template.model,
        description: template.description,
        system_prompt: template.systemPrompt,
      }),
    onSuccess: (_, template) => {
      setInstalled((prev) => new Set(prev).add(template.id));
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const filtered = filter
    ? AGENT_TEMPLATES.filter((t) => t.category === filter)
    : AGENT_TEMPLATES;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Templates"
        subtitle={`${AGENT_TEMPLATES.length} pre-configured agents ready to install`}
      />

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === null ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter(null)}
        >
          All
        </Button>
        {TEMPLATE_CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={filter === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(filter === cat ? null : cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onInstall={() => installMutation.mutate(template)}
            installing={
              installMutation.isPending &&
              installMutation.variables?.id === template.id
            }
            installed={installed.has(template.id)}
          />
        ))}
      </div>
    </div>
  );
}
