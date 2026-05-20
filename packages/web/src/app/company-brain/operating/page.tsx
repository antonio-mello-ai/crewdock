"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Brain,
  CheckCircle2,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  FileText,
  GitPullRequest,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Target,
} from "lucide-react";
import {
  useCompanyBrainAiosPrReviewIntake,
  useCompanyBrainOperatingPackRegistry,
  useCompanyBrainOperatingSnapshot,
  useGenerateCompanyBrainDailyAgentHandoff,
  useRunCompanyBrainOperatingCadence,
  useRunCompanyBrainWatcher,
  useSyncCompanyBrainAiosPrReviews,
} from "@/hooks/use-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTimeAgo } from "@/lib/utils";
import type {
  CompanyBrainOperatingPackRegistryEntry,
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
  if (["healthy", "ready", "clear", "idle", "running"].includes(state)) {
    return "default";
  }
  if (["needs_run", "attention", "missing", "disabled"].includes(state)) {
    return "secondary";
  }
  return "outline";
}

function formatTimestamp(value: number | null) {
  return value ? formatTimeAgo(value) : "never";
}

export default function CompanyBrainOperatingPage() {
  const { data, isLoading } = useCompanyBrainOperatingSnapshot();
  const { data: operatingPackRegistryData } = useCompanyBrainOperatingPackRegistry();
  const { data: prReviewData } = useCompanyBrainAiosPrReviewIntake();
  const runCadence = useRunCompanyBrainOperatingCadence();
  const runWatcher = useRunCompanyBrainWatcher();
  const generateHandoff = useGenerateCompanyBrainDailyAgentHandoff();
  const syncPrReviews = useSyncCompanyBrainAiosPrReviews();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const [nextWorkCopyState, setNextWorkCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const snapshot = data?.data;
  const operatingPackRegistry = operatingPackRegistryData?.data;
  const prReviewIntake = prReviewData?.data;
  const pendingPrReviews =
    prReviewIntake?.items.filter((item) =>
      ["awaiting_human_review", "changes_requested", "draft"].includes(
        item.reviewStatus
      )
    ) ?? [];
  const operatingLoop = snapshot?.operatingCadence.operatingLoop;
  const handoffMarkdown = snapshot?.latestAgentContext?.content ?? "";
  const handoffFilename = useMemo(() => {
    const date = new Date(snapshot?.latestAgentContext?.createdAt ?? Date.now())
      .toISOString()
      .slice(0, 10);
    return `aios-daily-agent-handoff-${date}.md`;
  }, [snapshot?.latestAgentContext?.createdAt]);
  const nextWork = snapshot?.nextWork;
  const nextWorkPrompt = nextWork?.recommended?.agentPromptMarkdown ?? "";
  const nextWorkFilename = useMemo(() => {
    const date = new Date(nextWork?.generatedAt ?? Date.now()).toISOString().slice(0, 10);
    const slug = nextWork?.recommended?.branchSuggestion ?? "next-work";
    return `aios-next-work-${slug}-${date}.md`;
  }, [nextWork?.generatedAt, nextWork?.recommended?.branchSuggestion]);

  const copyNextWorkPrompt = async () => {
    if (!nextWorkPrompt) return;
    try {
      await navigator.clipboard.writeText(nextWorkPrompt);
      setNextWorkCopyState("copied");
      window.setTimeout(() => setNextWorkCopyState("idle"), 1800);
    } catch {
      setNextWorkCopyState("failed");
    }
  };

  const downloadNextWorkPrompt = () => {
    if (!nextWorkPrompt) return;
    const blob = new Blob([nextWorkPrompt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nextWorkFilename;
    link.click();
    URL.revokeObjectURL(url);
  };

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

  const syncAiosPrReviews = () => {
    syncPrReviews.mutate({
      repo: "antonio-mello-ai/crewdock",
      state: "open",
      limit: 50,
      sourceName: "AIOS-authored PR Reviews",
      area: "development",
      owner: "Antonio",
      visibility: "internal",
      createSignals: true,
    });
  };

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
            {operatingLoop ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={stateVariant(operatingLoop.status)}>
                  loop {operatingLoop.status}
                </Badge>
                <span>
                  tick {formatTimestamp(operatingLoop.lastTickAt)}
                </span>
                <span>
                  last run {formatTimestamp(operatingLoop.lastRunAt)}
                </span>
                <span>
                  next {formatTimestamp(operatingLoop.nextTickAt)}
                </span>
              </div>
            ) : null}
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
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/company-brain/map")}
            >
              <FileText className="size-4" />
              Operating Map
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/company-brain/command")}
            >
              <FileText className="size-4" />
              Command Router
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                (window.location.href = "/company-brain/session-results/new")
              }
            >
              <FileText className="size-4" />
              Submit Session
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/company-brain/agent-runs")}
            >
              <FileText className="size-4" />
              Agent Runs
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = "/company-brain")}>
              <FileText className="size-4" />
              Admin
            </Button>
          </div>
        </header>

        <section className="rounded-md border border-primary/40 bg-primary/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target className="size-5 text-primary" />
              <h2 className="text-lg font-semibold">Next Work</h2>
              {nextWork?.recommended ? (
                <Badge variant="default">{nextWork.recommended.workItem.status}</Badge>
              ) : (
                <Badge variant="secondary">empty</Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {nextWork
                ? `${nextWork.candidatesConsidered} candidates - active=${nextWork.totals.activeWorkItemCount} blocked=${nextWork.totals.blockedWorkItemCount}`
                : null}
            </span>
          </div>

          {nextWork?.recommended ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold">
                      {nextWork.recommended.workItem.title}
                    </h3>
                    {nextWork.recommended.workItem.externalUrl ? (
                      <a
                        href={nextWork.recommended.workItem.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" />
                        {nextWork.recommended.workItem.externalId ?? "external"}
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">{nextWork.recommended.workItem.area}</Badge>
                    {nextWork.recommended.priority ? (
                      <Badge variant="outline">
                        Priority: {nextWork.recommended.priority.title}
                      </Badge>
                    ) : null}
                    {nextWork.recommended.goal ? (
                      <Badge variant="outline">Goal: {nextWork.recommended.goal.title}</Badge>
                    ) : null}
                    {nextWork.recommended.workItem.labels.slice(0, 4).map((label) => (
                      <Badge key={label} variant="outline">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Why this is next
                  </h4>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {nextWork.recommended.rationale.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>

                {nextWork.recommended.acceptanceCriteria.length ? (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Acceptance Criteria
                    </h4>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                      {nextWork.recommended.acceptanceCriteria.map((ac, idx) => (
                        <li key={idx}>{ac}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="text-xs text-muted-foreground">
                  Suggested branch:{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                    {nextWork.recommended.branchSuggestion}
                  </code>
                </div>
              </div>

              <aside className="rounded-md border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold">Agent Prompt</h4>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyNextWorkPrompt}
                      disabled={!nextWorkPrompt}
                    >
                      <Copy className="size-3" />
                      {nextWorkCopyState === "copied"
                        ? "Copied"
                        : nextWorkCopyState === "failed"
                          ? "Failed"
                          : "Copy"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={downloadNextWorkPrompt}
                      disabled={!nextWorkPrompt}
                    >
                      <Download className="size-3" />
                      .md
                    </Button>
                  </div>
                </div>
                <pre className="mt-3 max-h-[280px] overflow-auto whitespace-pre-wrap rounded border border-border bg-muted/30 p-2 text-[11px] leading-4">
                  {nextWorkPrompt || "Generate a recommendation to populate this prompt."}
                </pre>
              </aside>
            </div>
          ) : nextWork?.emptyState ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm">{nextWork.emptyState.reason}</p>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Next steps
                </h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {nextWork.emptyState.nextSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Health
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
          </div>
        </section>

        <section className="rounded-md border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Brain className="size-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Operating Pack Registry</h2>
                {operatingPackRegistry ? (
                  <Badge variant="outline">
                    {operatingPackRegistry.totals.activeCount} active
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Approved reusable routines by area, channel, policy and entrypoint.
              </p>
            </div>
            {operatingPackRegistry ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {operatingPackRegistry.totals.entryCount} packs
                </Badge>
                <Badge variant="outline">
                  {operatingPackRegistry.totals.noExternalWriteCount} no write
                </Badge>
                <Badge variant="outline">
                  {operatingPackRegistry.totals.proposalOnlyCount} proposal-only
                </Badge>
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {(operatingPackRegistry?.entries ?? []).map(
              (entry: CompanyBrainOperatingPackRegistryEntry) => (
                <article key={entry.slug} className="rounded-md border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{entry.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{entry.slug}</p>
                    </div>
                    <Badge variant={stateVariant(entry.status)}>{entry.status}</Badge>
                  </div>

                  <p className="mt-3 min-h-16 text-sm text-muted-foreground">
                    {entry.summary}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
                    <Badge variant="outline">{entry.area}</Badge>
                    <Badge variant="outline">{entry.executionMode}</Badge>
                    <Badge variant="outline">Risk {entry.maxRiskClass}</Badge>
                    <Badge variant="outline">{entry.actionPolicy}</Badge>
                    <Badge variant="outline">{entry.externalWritePolicy}</Badge>
                  </div>

                  <div className="mt-4 space-y-3 text-xs">
                    <div>
                      <div className="font-semibold text-muted-foreground">Channels</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {entry.channels.map((channel) => (
                          <Badge key={channel} variant="secondary">
                            {channel}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-muted-foreground">Entrypoints</div>
                      <div className="mt-1 space-y-1">
                        {entry.entrypoints.map((entrypoint) => (
                          <div
                            key={`${entry.slug}-${entrypoint.kind}-${entrypoint.label}`}
                            className="rounded border border-border bg-muted/30 px-2 py-1"
                          >
                            <span className="font-medium">{entrypoint.label}</span>
                            <span className="mx-1 text-muted-foreground">/</span>
                            <span className="break-all text-muted-foreground">
                              {entrypoint.path ??
                                entrypoint.mcpTool ??
                                entrypoint.watcherId ??
                                entrypoint.kind}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                    {entry.statusNote}
                  </div>
                </article>
              )
            )}
          </div>
        </section>

        <section className="rounded-md border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <GitPullRequest className="size-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">AIOS-authored PR review</h2>
                <Badge
                  variant={
                    pendingPrReviews.some(
                      (item) => item.reviewStatus === "changes_requested"
                    )
                      ? "destructive"
                      : pendingPrReviews.length
                        ? "secondary"
                        : "default"
                  }
                >
                  {pendingPrReviews.length
                    ? `${pendingPrReviews.length} pending`
                    : "clear"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Tracks AIOS-authored GitHub PRs that need human review. Read-only;
                no merge, close, label, assign or deploy action.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {prReviewIntake ? (
                <>
                  <Badge variant="outline">{prReviewIntake.totals.total} total</Badge>
                  <Badge variant="outline">
                    {prReviewIntake.totals.awaitingHumanReview} awaiting
                  </Badge>
                  <Badge variant="outline">
                    {prReviewIntake.totals.changesRequested} changes
                  </Badge>
                </>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={syncAiosPrReviews}
                disabled={syncPrReviews.isPending}
              >
                {syncPrReviews.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <RefreshCw className="size-3" />
                )}
                Sync reviews
              </Button>
            </div>
          </div>

          <div className="mt-4 divide-y divide-border">
            {pendingPrReviews.slice(0, 5).map((item) => (
              <div
                key={`${item.repo}#${item.number}`}
                className="grid gap-2 py-3 md:grid-cols-[150px_1fr_auto]"
              >
                <div className="text-xs text-muted-foreground">
                  {formatTimeAgo(Date.parse(item.updatedAt))}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-medium text-primary hover:underline"
                    >
                      #{item.number} {item.title}
                    </a>
                    <Badge variant={stateVariant(item.reviewStatus)}>
                      {item.reviewStatus}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    agentRun={item.marker.agentRunId} proposal=
                    {item.marker.proposalId} workItem={item.workItemId ?? "-"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.approvals} approvals</span>
                  <span>{item.changesRequested} changes</span>
                  <span>{item.comments + item.reviewComments} comments</span>
                </div>
              </div>
            ))}
            {!pendingPrReviews.length ? (
              <div className="py-6 text-sm text-muted-foreground">
                No AIOS-authored PR is currently waiting for human review.
              </div>
            ) : null}
          </div>
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
