"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  PlayCircle,
  RefreshCw,
  ShieldAlert,
  Terminal,
} from "lucide-react";
import {
  useCancelCompanyBrainAgentRun,
  useCompanyBrainAgentRun,
  useCompanyBrainAgentRunLogs,
  useCompanyBrainAgentRunSuggestions,
  useCompanyBrainAgentRunsList,
  useCompanyBrainAgentRunsSummary,
  useCompanyBrainAutoDispatchPolicy,
  useDismissCompanyBrainAgentRunSuggestion,
  useEvaluateCompanyBrainAgentRunPolicy,
  useExecuteCompanyBrainAgentRun,
  usePromoteCompanyBrainAgentRunSuggestion,
} from "@/hooks/use-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTimeAgo } from "@/lib/utils";

interface AgentRunRow {
  id: string;
  workItemId: string | null;
  status: string;
  claimState: string;
  runnerType: string;
  attempt: number;
  branch: string | null;
  repo: string | null;
  prUrl: string | null;
  errorSummary: string | null;
  updatedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
}

interface AgentRunSummary {
  totalCount: number;
  byStatus: Record<string, number>;
  blockedCount: number;
  failedCount: number;
  prOpenedCount: number;
  needsReviewCount: number;
  retryingCount: number;
  recentCompletedCount: number;
  staleCount: number;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["completed", "pr_opened"].includes(status)) return "default";
  if (["running", "claimed", "needs_review"].includes(status)) return "secondary";
  if (["failed", "blocked", "cancelled", "timed_out"].includes(status)) return "destructive";
  return "outline";
}

function AgentRunDetail({ runId }: { runId: string }) {
  const { data: runRes } = useCompanyBrainAgentRun(runId);
  const { data: logsRes } = useCompanyBrainAgentRunLogs(runId, 80);
  const policyMutation = useEvaluateCompanyBrainAgentRunPolicy();
  const executeMutation = useExecuteCompanyBrainAgentRun();
  const cancelMutation = useCancelCompanyBrainAgentRun();
  const [actor, setActor] = useState("");
  const [rationale, setRationale] = useState("");
  const [commandOverride, setCommandOverride] = useState("");
  const [argsOverrideRaw, setArgsOverrideRaw] = useState("");

  const run = runRes?.data as AgentRunRow & {
    workspaceRef: string | null;
    auditTrail: Array<{ at: number; event: string; actor: string | null; note: string | null }>;
    metadata: Record<string, unknown> | null;
  } | undefined;
  const logs = logsRes?.data as
    | {
        tail: string[];
        byteSize: number;
        lineCount: number;
        lastEvent: string | null;
        lastEventAt: number | null;
        isStaleHeartbeat: boolean;
      }
    | undefined;
  const policy = policyMutation.data?.data as
    | {
        decision: string;
        realExecutionAllowed: boolean;
        blockReasons: string[];
        satisfiedGates: string[];
        gates: Array<{ key: string; title: string; status: string; detail: string; remediation?: string | null }>;
        subprocessEnv: { allowedKeys: string[]; redactedKeys: string[] };
      }
    | undefined;

  const argsArray = useMemo(
    () =>
      argsOverrideRaw
        .split(/\n+/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    [argsOverrideRaw]
  );

  const onEvaluate = (intent: "dry_run" | "real_execution") => {
    policyMutation.mutate({
      agentRunId: runId,
      actor: actor.trim() || undefined,
      rationale: rationale.trim() || undefined,
      intent,
      commandOverride: commandOverride.trim() || undefined,
    });
  };

  const onExecute = () => {
    if (!actor.trim() || !rationale.trim()) return;
    executeMutation.mutate({
      agentRunId: runId,
      actor: actor.trim(),
      rationale: rationale.trim(),
      commandOverride: commandOverride.trim() || undefined,
      argsOverride: argsArray.length ? argsArray : undefined,
    });
  };

  const onCancel = () => {
    if (!actor.trim() || !rationale.trim()) return;
    cancelMutation.mutate({
      agentRunId: runId,
      actor: actor.trim(),
      rationale: rationale.trim(),
    });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-3">
        <section className="rounded-md border border-border bg-background p-3 text-sm">
          <h3 className="font-semibold">Identity</h3>
          <dl className="mt-1 grid grid-cols-2 gap-1 text-xs">
            <dt className="text-muted-foreground">id</dt>
            <dd className="truncate">{run?.id}</dd>
            <dt className="text-muted-foreground">workItemId</dt>
            <dd className="truncate">{run?.workItemId ?? "(none)"}</dd>
            <dt className="text-muted-foreground">runnerType</dt>
            <dd>{run?.runnerType}</dd>
            <dt className="text-muted-foreground">repo</dt>
            <dd className="truncate">{run?.repo ?? "(none)"}</dd>
            <dt className="text-muted-foreground">branch</dt>
            <dd className="truncate">{run?.branch ?? "(none)"}</dd>
            <dt className="text-muted-foreground">workspaceRef</dt>
            <dd className="truncate text-[11px]">{run?.workspaceRef ?? "(none)"}</dd>
            <dt className="text-muted-foreground">prUrl</dt>
            <dd className="truncate">
              {run?.prUrl ? (
                <a className="text-primary hover:underline" href={run.prUrl} target="_blank" rel="noopener noreferrer">
                  {run.prUrl}
                </a>
              ) : (
                "(none)"
              )}
            </dd>
          </dl>
          {run?.errorSummary ? (
            <p className="mt-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
              {run.errorSummary}
            </p>
          ) : null}
        </section>

        {policy ? (
          <section className="rounded-md border border-border bg-background p-3 text-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Policy</h3>
              <Badge variant={policy.realExecutionAllowed ? "default" : "destructive"}>
                {policy.decision}
              </Badge>
            </div>
            {policy.blockReasons.length ? (
              <p className="mt-1 text-xs text-destructive">
                blockers: {policy.blockReasons.join(", ")}
              </p>
            ) : (
              <p className="mt-1 text-xs">satisfied gates: {policy.satisfiedGates.length}</p>
            )}
            <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-[11px]">
              {policy.gates.map((gate) => (
                <li key={gate.key} className="flex gap-2">
                  <Badge
                    variant={
                      gate.status === "passed"
                        ? "default"
                        : gate.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                    className="shrink-0 text-[10px]"
                  >
                    {gate.status}
                  </Badge>
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{gate.title}</span> — {gate.detail}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-muted-foreground">
              subprocess env allowed: {policy.subprocessEnv.allowedKeys.slice(0, 6).join(", ")}; redacted: {policy.subprocessEnv.redactedKeys.length} keys
            </p>
          </section>
        ) : null}

        <section className="rounded-md border border-border bg-background p-3 text-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Logs (tail 80)</h3>
            {logs?.isStaleHeartbeat ? (
              <Badge variant="destructive" className="text-[10px]">
                stale heartbeat
              </Badge>
            ) : null}
          </div>
          <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded border border-border bg-muted/30 p-2 text-[11px] leading-4">
            {logs?.tail?.length ? logs.tail.join("\n") : "(no log file yet)"}
          </pre>
          {logs ? (
            <p className="mt-1 text-[10px] text-muted-foreground">
              {logs.byteSize} bytes / {logs.lineCount} lines / lastEvent={logs.lastEvent ?? "(none)"}
            </p>
          ) : null}
        </section>
      </div>

      <aside className="space-y-3">
        <section className="rounded-md border border-border bg-background p-3 text-sm">
          <h3 className="font-semibold">Actor / rationale</h3>
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="actor (you)"
            className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
          />
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="rationale"
            rows={2}
            className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
          />
        </section>

        <section className="rounded-md border border-border bg-background p-3 text-sm">
          <h3 className="font-semibold">Command overrides (dogfood)</h3>
          <input
            value={commandOverride}
            onChange={(e) => setCommandOverride(e.target.value)}
            placeholder="commandOverride (e.g. echo)"
            className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
          />
          <textarea
            value={argsOverrideRaw}
            onChange={(e) => setArgsOverrideRaw(e.target.value)}
            placeholder="argsOverride (one per line)"
            rows={3}
            className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
          />
        </section>

        <section className="space-y-2 rounded-md border border-border bg-background p-3 text-sm">
          <Button onClick={() => onEvaluate("dry_run")} variant="outline" size="sm" className="w-full">
            {policyMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <ShieldAlert className="size-3" />}
            Evaluate policy (dry-run)
          </Button>
          <Button onClick={() => onEvaluate("real_execution")} variant="outline" size="sm" className="w-full">
            <ShieldAlert className="size-3" />
            Evaluate policy (real)
          </Button>
          <Button
            onClick={onExecute}
            disabled={
              !actor.trim() ||
              !rationale.trim() ||
              executeMutation.isPending ||
              (policy ? !policy.realExecutionAllowed : false)
            }
            className="w-full"
          >
            {executeMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <PlayCircle className="size-3" />}
            Execute (supervised)
          </Button>
          <Button
            onClick={onCancel}
            variant="destructive"
            size="sm"
            disabled={!actor.trim() || !rationale.trim() || cancelMutation.isPending}
            className="w-full"
          >
            {cancelMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Ban className="size-3" />}
            Cancel
          </Button>
          {executeMutation.isError ? (
            <p className="text-[11px] text-destructive">{executeMutation.error.message}</p>
          ) : null}
          {cancelMutation.isError ? (
            <p className="text-[11px] text-destructive">{cancelMutation.error.message}</p>
          ) : null}
        </section>
      </aside>
    </div>
  );
}

interface AgentRunSuggestionRow {
  id: string;
  workItemId: string;
  runnerType: string;
  status: "active" | "dismissed" | "superseded";
  rationale: string;
  policyDecision: string;
  generatedFrom: {
    workItemTitle: string;
    workItemArea: string;
    suggestedAction: string;
    sourceIssueRef: string | null;
    operatingLoopScheduleId: string | null;
    operatingLoopScheduledAt: number | null;
  };
  promotedAgentRunId: string | null;
  promotedBy: string | null;
  promotedAt: number | null;
  createdAt: number;
}

function SuggestionRow({ suggestion }: { suggestion: AgentRunSuggestionRow }) {
  const dismissMutation = useDismissCompanyBrainAgentRunSuggestion();
  const promoteMutation = usePromoteCompanyBrainAgentRunSuggestion();
  const [actor, setActor] = useState("");
  const [rationale, setRationale] = useState("");
  const [open, setOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteActor, setPromoteActor] = useState("");
  const [promoteRationale, setPromoteRationale] = useState("");
  return (
    <li className="border-t border-border first:border-t-0">
      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {suggestion.policyDecision}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {suggestion.runnerType}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {suggestion.generatedFrom.workItemArea}
            </Badge>
            {suggestion.generatedFrom.sourceIssueRef ? (
              <Badge variant="outline" className="text-[10px]">
                {suggestion.generatedFrom.sourceIssueRef}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-medium">{suggestion.generatedFrom.workItemTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{suggestion.rationale}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Suggested action: <code className="text-[11px]">{suggestion.generatedFrom.suggestedAction}</code>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Created {formatTimeAgo(suggestion.createdAt)} · Observe-only — no subprocess will start.
            {suggestion.promotedAgentRunId ? (
              <>
                {" · "}
                <span className="text-emerald-500">
                  Promoted → AgentRun <code className="text-[11px]">{suggestion.promotedAgentRunId}</code>
                  {suggestion.promotedBy ? ` by ${suggestion.promotedBy}` : ""}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col gap-1 sm:w-64">
          <div className="flex gap-1 self-end">
            {!suggestion.promotedAgentRunId ? (
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  setPromoteOpen(!promoteOpen);
                  setOpen(false);
                }}
              >
                {promoteOpen ? "Cancel" : "Promote"}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(!open);
                setPromoteOpen(false);
              }}
            >
              {open ? "Cancel" : "Dismiss"}
            </Button>
          </div>
          {promoteOpen ? (
            <div className="flex flex-col gap-1 rounded border border-border p-2">
              <input
                type="text"
                value={promoteActor}
                onChange={(e) => setPromoteActor(e.target.value)}
                placeholder="actor"
                className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
              />
              <input
                type="text"
                value={promoteRationale}
                onChange={(e) => setPromoteRationale(e.target.value)}
                placeholder="rationale for promotion"
                className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
              />
              <Button
                size="sm"
                variant="default"
                onClick={() =>
                  promoteMutation.mutate(
                    {
                      suggestionId: suggestion.id,
                      actor: promoteActor,
                      rationale: promoteRationale,
                    },
                    {
                      onSuccess: () => {
                        setPromoteOpen(false);
                        setPromoteActor("");
                        setPromoteRationale("");
                      },
                    }
                  )
                }
                disabled={
                  !promoteActor.trim() ||
                  !promoteRationale.trim() ||
                  promoteMutation.isPending
                }
              >
                {promoteMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <PlayCircle className="size-3" />}
                Confirm promote
              </Button>
              {promoteMutation.isError ? (
                <p className="text-[10px] text-destructive">{promoteMutation.error.message}</p>
              ) : null}
              <p className="text-[10px] text-muted-foreground">
                Creates a queued AgentRun. No subprocess will run until you Execute manually.
              </p>
            </div>
          ) : null}
          {open ? (
            <div className="flex flex-col gap-1 rounded border border-border p-2">
              <input
                type="text"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                placeholder="actor"
                className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
              />
              <input
                type="text"
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="reason for dismissal"
                className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
              />
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  dismissMutation.mutate(
                    { suggestionId: suggestion.id, actor, rationale },
                    {
                      onSuccess: () => {
                        setOpen(false);
                        setActor("");
                        setRationale("");
                      },
                    }
                  )
                }
                disabled={!actor.trim() || !rationale.trim() || dismissMutation.isPending}
              >
                {dismissMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Ban className="size-3" />}
                Confirm dismiss
              </Button>
              {dismissMutation.isError ? (
                <p className="text-[10px] text-destructive">{dismissMutation.error.message}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

interface AutoDispatchGate {
  key: string;
  title: string;
  status: "passed" | "failed" | "warn";
  detail: string;
  remediation?: string;
  envRefs?: string[];
  expectedFormat?: string;
  exampleValue?: string;
  docsLink?: string;
}

interface AutoDispatchPolicySummaryRow {
  config: {
    enabled: boolean;
    repoAllowlist: string[];
    workflowAllowlist: string[];
    areaAllowlist: string[];
    requireRiskA: boolean;
    maxConcurrency: number;
    tokenBudget: number;
    cooldownMs: number;
    maxRuntimeMs: number;
  };
  runtime: {
    activeAgentRunCount: number;
    lastAutoDispatchAt: number | null;
    cooldownRemainingMs: number;
    tokensSpentInWindow: number;
    tokensAvailableInWindow: number;
  };
  eligibilityPreview: {
    decision: string;
    eligible: boolean;
    gates: AutoDispatchGate[];
    blockReasons: string[];
    workItemId: string | null;
  } | null;
}

export default function CompanyBrainAgentRunsPage() {
  const { data: summaryRes } = useCompanyBrainAgentRunsSummary();
  const { data: listRes, isLoading } = useCompanyBrainAgentRunsList({ limit: 50 });
  const { data: suggestionsRes } = useCompanyBrainAgentRunSuggestions("active");
  const { data: autoDispatchRes } = useCompanyBrainAutoDispatchPolicy();
  const autoDispatch = autoDispatchRes?.data as AutoDispatchPolicySummaryRow | undefined;
  const [expanded, setExpanded] = useState<string | null>(null);
  const summary = summaryRes?.data as AgentRunSummary | undefined;
  const list = listRes?.data as { items: AgentRunRow[]; total: number } | undefined;
  const suggestions = (suggestionsRes?.data as { suggestions: AgentRunSuggestionRow[]; totals: { active: number; dismissed: number; superseded: number } } | undefined)?.suggestions ?? [];

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Agent Runs</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Supervised agent runs lifecycle, policy gates, logs and manual real-execution console. Real subprocesses
              never start unless the policy returns <code>allowed_real_execution</code>; the form blocks the Execute
              button until actor + rationale + gates pass.
            </p>
          </div>
          <Link
            href="/company-brain/operating"
            className="inline-flex items-center gap-1 self-start rounded-md border border-border px-2 py-1 text-sm hover:bg-muted"
          >
            <ArrowLeft className="size-3" />
            Operating
          </Link>
        </header>

        {summary ? (
          <section className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
            <article className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-muted-foreground">total</p>
              <p className="text-lg font-semibold">{summary.totalCount}</p>
            </article>
            <article className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-muted-foreground">running</p>
              <p className="text-lg font-semibold">{summary.byStatus?.running ?? 0}</p>
            </article>
            <article className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-muted-foreground">blocked</p>
              <p className="text-lg font-semibold">{summary.blockedCount}</p>
            </article>
            <article className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-muted-foreground">failed</p>
              <p className="text-lg font-semibold">{summary.failedCount}</p>
            </article>
            <article className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-muted-foreground">pr_opened</p>
              <p className="text-lg font-semibold">{summary.prOpenedCount}</p>
            </article>
            <article className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-muted-foreground">recent ✓ 24h</p>
              <p className="text-lg font-semibold">{summary.recentCompletedCount}</p>
            </article>
            <article className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-muted-foreground">stale</p>
              <p className="text-lg font-semibold">{summary.staleCount}</p>
            </article>
          </section>
        ) : null}

        {autoDispatch ? (
          <section className="rounded-md border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
              <h2 className="text-lg font-semibold">Auto-Dispatch policy</h2>
              <Badge
                variant={autoDispatch.config.enabled ? "default" : "destructive"}
                className="text-[10px]"
              >
                {autoDispatch.config.enabled ? "ENV ENABLED" : "DEFAULT-OFF"}
              </Badge>
            </div>
            <div className="grid gap-3 p-3 md:grid-cols-2 lg:grid-cols-3">
              <article className="text-sm">
                <p className="text-xs text-muted-foreground">repo allowlist</p>
                <p className="font-mono text-[11px]">
                  {autoDispatch.config.repoAllowlist.length
                    ? autoDispatch.config.repoAllowlist.join(", ")
                    : "(empty)"}
                </p>
              </article>
              <article className="text-sm">
                <p className="text-xs text-muted-foreground">workflow allowlist</p>
                <p className="font-mono text-[11px]">
                  {autoDispatch.config.workflowAllowlist.length
                    ? autoDispatch.config.workflowAllowlist.join(", ")
                    : "(empty)"}
                </p>
              </article>
              <article className="text-sm">
                <p className="text-xs text-muted-foreground">area allowlist</p>
                <p className="font-mono text-[11px]">
                  {autoDispatch.config.areaAllowlist.length
                    ? autoDispatch.config.areaAllowlist.join(", ")
                    : "(empty)"}
                </p>
              </article>
              <article className="text-sm">
                <p className="text-xs text-muted-foreground">concurrency</p>
                <p className="font-mono text-[11px]">
                  {autoDispatch.runtime.activeAgentRunCount} / {autoDispatch.config.maxConcurrency}
                </p>
              </article>
              <article className="text-sm">
                <p className="text-xs text-muted-foreground">token budget</p>
                <p className="font-mono text-[11px]">
                  {autoDispatch.runtime.tokensSpentInWindow} spent /{" "}
                  {autoDispatch.config.tokenBudget} window
                </p>
              </article>
              <article className="text-sm">
                <p className="text-xs text-muted-foreground">cooldown</p>
                <p className="font-mono text-[11px]">
                  {autoDispatch.runtime.cooldownRemainingMs > 0
                    ? `${Math.ceil(autoDispatch.runtime.cooldownRemainingMs / 1000)}s remaining`
                    : `${autoDispatch.config.cooldownMs}ms (idle)`}
                </p>
              </article>
            </div>
            {autoDispatch.eligibilityPreview ? (
              <div className="border-t border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted-foreground">eligibility preview:</p>
                  <Badge
                    variant={autoDispatch.eligibilityPreview.eligible ? "default" : "destructive"}
                    className="text-[10px]"
                  >
                    {autoDispatch.eligibilityPreview.decision}
                  </Badge>
                  {autoDispatch.eligibilityPreview.workItemId ? (
                    <code className="text-[11px]">
                      WorkItem {autoDispatch.eligibilityPreview.workItemId}
                    </code>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">global preview (no WorkItem)</span>
                  )}
                </div>
                <ul className="mt-2 grid gap-2 text-[11px] sm:grid-cols-2">
                  {autoDispatch.eligibilityPreview.gates.map((gate) => (
                    <li key={gate.key} className="flex items-start gap-2">
                      <span
                        className={
                          gate.status === "passed"
                            ? "text-emerald-500"
                            : gate.status === "warn"
                              ? "text-amber-500"
                              : "text-destructive"
                        }
                      >
                        {gate.status === "passed" ? "✓" : gate.status === "warn" ? "⚠" : "✗"}
                      </span>
                      <div className="flex-1">
                        <p>
                          <span className="font-medium">{gate.title}</span>: {gate.detail}
                        </p>
                        {gate.status === "failed" && gate.envRefs && gate.envRefs.length > 0 ? (
                          <p className="mt-1 text-muted-foreground">
                            <span className="font-medium">Env:</span>{" "}
                            <code className="text-[10px]">{gate.envRefs.join(", ")}</code>
                            {gate.expectedFormat ? (
                              <>
                                {" — "}
                                {gate.expectedFormat}
                              </>
                            ) : null}
                          </p>
                        ) : null}
                        {gate.status === "failed" && gate.exampleValue ? (
                          <p className="mt-1 text-muted-foreground">
                            <span className="font-medium">Example:</span>{" "}
                            <code className="text-[10px]">{gate.exampleValue}</code>
                          </p>
                        ) : null}
                        {gate.status === "failed" && gate.docsLink ? (
                          <p className="mt-1 text-muted-foreground">
                            <span className="font-medium">Docs:</span>{" "}
                            <code className="text-[10px]">{gate.docsLink}</code>
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        {suggestions.length > 0 ? (
          <section className="rounded-md border border-border">
            <div className="flex items-center justify-between border-b border-border p-3">
              <h2 className="text-lg font-semibold">Suggestions ({suggestions.length})</h2>
              <p className="text-[11px] text-muted-foreground">
                Operating Loop suggester · observe-only · no auto-dispatch
              </p>
            </div>
            <ul>
              {suggestions.map((s) => (
                <SuggestionRow key={s.id} suggestion={s} />
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-md border border-border">
          <div className="flex items-center justify-between border-b border-border p-3">
            <h2 className="text-lg font-semibold">Runs ({list?.total ?? 0})</h2>
            {isLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
          </div>
          <ul className="divide-y divide-border">
            {list?.items?.map((row) => (
              <li key={row.id}>
                <button
                  onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                  className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/40"
                >
                  {expanded === row.id ? (
                    <ChevronDown className="mt-1 size-4 shrink-0" />
                  ) : (
                    <ChevronRight className="mt-1 size-4 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="text-xs">{row.id}</code>
                      <Badge variant={statusVariant(row.status)} className="text-[10px]">
                        {row.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        attempt {row.attempt}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {row.runnerType}
                      </Badge>
                      {row.branch ? (
                        <Badge variant="outline" className="text-[10px]">
                          {row.branch}
                        </Badge>
                      ) : null}
                      {row.prUrl ? (
                        <Badge variant="default" className="text-[10px]">
                          PR
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.workItemId ? `WorkItem ${row.workItemId} · ` : ""}
                      updated {formatTimeAgo(row.updatedAt)}
                      {row.errorSummary ? ` · ${row.errorSummary}` : ""}
                    </p>
                  </div>
                </button>
                {expanded === row.id ? (
                  <div className="border-t border-border bg-muted/20 p-3">
                    <AgentRunDetail runId={row.id} />
                  </div>
                ) : null}
              </li>
            ))}
            {list && list.items?.length === 0 ? (
              <li className="p-6 text-center text-sm text-muted-foreground">
                <Terminal className="mx-auto mb-2 size-6 opacity-50" />
                No agent runs yet. Create one via{" "}
                <code className="text-xs">POST /api/company-brain/agent-runs</code> or the Next Work surface.
              </li>
            ) : null}
          </ul>
        </section>

        <footer className="border-t border-border pt-3 text-xs text-muted-foreground">
          <CheckCircle2 className="mr-1 inline size-3" />
          Real execution is intentionally gated by{" "}
          <code className="text-[11px]">AIOS_AGENT_RUNNER_ENABLED</code>,{" "}
          <code className="text-[11px]">AIOS_AGENT_RUNNER_REPO_ALLOWLIST</code>,{" "}
          <code className="text-[11px]">AIOS_AGENT_RUNNER_COMMAND_ALLOWLIST</code> and{" "}
          <code className="text-[11px]">AIOS_AGENT_WORKSPACE_ALLOWLIST</code>. <RefreshCw className="ml-1 inline size-3" />{" "}
          Auto-refreshes every 5 seconds.
        </footer>
      </div>
    </main>
  );
}
