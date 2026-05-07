"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Brain,
  CheckCircle2,
  Clipboard,
  Copy,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  useCompanyBrainOperatingSnapshot,
  useGenerateCompanyBrainDailyAgentHandoff,
  useRunCompanyBrainOperatingCadence,
  useRunCompanyBrainWatcher,
} from "@/hooks/use-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTimeAgo } from "@/lib/utils";
import type {
  CompanyBrainOperatingSnapshotCard,
  CompanyBrainOperatingSnapshotCardKey,
} from "@aios/shared";

const cardIcons: Record<CompanyBrainOperatingSnapshotCardKey, typeof Brain> = {
  aios_briefing: Brain,
  operating_cadence: RefreshCw,
  gate_closure_ritual: ShieldCheck,
  source_health: Activity,
  daily_agent_handoff: Clipboard,
};

function stateVariant(state: string): "default" | "secondary" | "destructive" | "outline" {
  if (["critical", "error"].includes(state)) return "destructive";
  if (["healthy", "ready", "clear"].includes(state)) return "default";
  if (["needs_run", "attention", "missing"].includes(state)) return "secondary";
  return "outline";
}

function formatTimestamp(value: number | null) {
  return value ? formatTimeAgo(value) : "never";
}

export default function CompanyBrainOperatingPage() {
  const { data, isLoading } = useCompanyBrainOperatingSnapshot();
  const runCadence = useRunCompanyBrainOperatingCadence();
  const runWatcher = useRunCompanyBrainWatcher();
  const generateHandoff = useGenerateCompanyBrainDailyAgentHandoff();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const snapshot = data?.data;
  const handoffMarkdown = snapshot?.latestAgentContext?.content ?? "";
  const handoffFilename = useMemo(() => {
    const date = new Date(snapshot?.latestAgentContext?.createdAt ?? Date.now())
      .toISOString()
      .slice(0, 10);
    return `aios-daily-agent-handoff-${date}.md`;
  }, [snapshot?.latestAgentContext?.createdAt]);

  const runPrimaryAction = (card: CompanyBrainOperatingSnapshotCard) => {
    if (card.primaryActionKind === "run_briefing") {
      runWatcher.mutate({
        watcherId: "watcher-aios-briefing-v0",
        body: {
          title: "AIOS Operating Briefing",
          summary: "Manual run from Company Brain Operating Surface.",
        },
      });
      return;
    }
    if (card.primaryActionKind === "run_operating_cadence") {
      runCadence.mutate({ mode: "all" });
      return;
    }
    if (card.primaryActionKind === "generate_daily_handoff") {
      generateHandoff.mutate({ targetAgent: "codex" });
      return;
    }
    window.location.href = "/company-brain";
  };

  const copyHandoff = async () => {
    if (!handoffMarkdown) return;
    try {
      await navigator.clipboard.writeText(handoffMarkdown);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
    }
  };

  const downloadHandoff = () => {
    if (!handoffMarkdown) return;
    const blob = new Blob([handoffMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = handoffFilename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const running =
    runCadence.isPending || runWatcher.isPending || generateHandoff.isPending;

  if (isLoading || !snapshot) {
    return (
      <main className="min-h-screen bg-background p-6 text-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading Company Brain Operating
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="size-4" />
              Updated {formatTimeAgo(snapshot.generatedAt)}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Company Brain Operating
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={stateVariant(snapshot.overallStatus)}>
                {snapshot.overallStatus}
              </Badge>
              <p className="text-sm text-muted-foreground">{snapshot.summary}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => runCadence.mutate({ mode: "all" })}
              disabled={running}
            >
              {runCadence.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Run Operating Cadence
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = "/company-brain")}>
              <FileText className="size-4" />
              Admin
            </Button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {snapshot.cards.map((card) => {
            const Icon = cardIcons[card.key];
            return (
              <article key={card.key} className="rounded-md border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <h2 className="truncate text-sm font-semibold">{card.title}</h2>
                  </div>
                  <Badge variant={stateVariant(card.state)}>{card.state}</Badge>
                </div>
                <p className="mt-3 min-h-12 text-sm text-muted-foreground">
                  {card.mainAlert}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(card.lastUpdatedAt)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runPrimaryAction(card)}
                    disabled={running}
                  >
                    {running &&
                    ["run_briefing", "run_operating_cadence", "generate_daily_handoff"].includes(
                      card.primaryActionKind
                    ) ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-3" />
                    )}
                    {card.primaryActionLabel}
                  </Button>
                </div>
              </article>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-md border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Recent Operating Events</h2>
              <Badge variant="outline">{snapshot.timeline.stats.eventCount} events</Badge>
            </div>
            <div className="mt-4 divide-y divide-border">
              {snapshot.recentEvents.map((event) => (
                <div key={event.id} className="grid gap-1 py-3 md:grid-cols-[150px_1fr]">
                  <div className="text-xs text-muted-foreground">
                    {formatTimeAgo(event.at)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{event.title}</span>
                      {event.status ? <Badge variant="outline">{event.status}</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.eventType}
                      {event.detail ? ` - ${event.detail}` : ""}
                    </p>
                  </div>
                </div>
              ))}
              {!snapshot.recentEvents.length ? (
                <div className="py-6 text-sm text-muted-foreground">
                  No operating events recorded yet.
                </div>
              ) : null}
            </div>
          </div>

          <aside className="rounded-md border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Daily Agent Handoff</h2>
              <Badge variant={snapshot.latestAgentContext ? "default" : "secondary"}>
                {snapshot.latestAgentContext ? "ready" : "missing"}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {snapshot.latestAgentContext?.title ?? "No handoff generated yet."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => generateHandoff.mutate({ targetAgent: "codex" })}
                disabled={running}
              >
                {generateHandoff.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Clipboard className="size-4" />
                )}
                Generate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={copyHandoff}
                disabled={!handoffMarkdown}
              >
                <Copy className="size-4" />
                {copyState === "copied" ? "Copied" : copyState === "failed" ? "Failed" : "Copy"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={downloadHandoff}
                disabled={!handoffMarkdown}
              >
                <Download className="size-4" />
                Download .md
              </Button>
            </div>
            <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-xs leading-5">
              {handoffMarkdown || "Generate a Daily Agent Handoff to populate this panel."}
            </pre>
          </aside>
        </section>
      </div>
    </main>
  );
}
