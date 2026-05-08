"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { useSubmitCompanyBrainSessionResult } from "@/hooks/use-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const RUNNER_TYPES = ["claude_code", "codex", "symphony", "manual", "other"] as const;
const OUTCOMES = [
  "completed",
  "pr_opened",
  "awaiting_review",
  "blocked",
  "failed",
  "cancelled",
] as const;
const VALIDATION_STATUSES = ["passed", "failed", "skipped", "partial", "unknown"] as const;
const SEVERITIES = ["info", "warn", "critical"] as const;
const AUDIENCES = ["human", "team", "agent", "system"] as const;
const AREAS = [
  "strategy",
  "development",
  "operations",
  "product",
  "marketing",
  "sales",
  "finance",
  "people",
  "customer",
  "platform",
  "unknown",
];

interface ValidationRow {
  kind: string;
  status: (typeof VALIDATION_STATUSES)[number];
  notes?: string;
}

interface BlockerRow {
  kind: string;
  description: string;
  severity: (typeof SEVERITIES)[number];
}

interface NextStepRow {
  action: string;
  audience: (typeof AUDIENCES)[number];
  severity: (typeof SEVERITIES)[number];
}

export default function CompanyBrainSessionResultIntakePage() {
  const [workItemId, setWorkItemId] = useState("");
  const [externalIssueRef, setExternalIssueRef] = useState("");
  const [runnerType, setRunnerType] = useState<(typeof RUNNER_TYPES)[number]>(
    "claude_code"
  );
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number]>("completed");
  const [summary, setSummary] = useState("");
  const [detail, setDetail] = useState("");
  const [branch, setBranch] = useState("");
  const [prUrl, setPrUrl] = useState("");
  const [commitsRaw, setCommitsRaw] = useState("");
  const [changedFilesRaw, setChangedFilesRaw] = useState("");
  const [area, setArea] = useState("development");
  const [actor, setActor] = useState("");
  const [validations, setValidations] = useState<ValidationRow[]>([]);
  const [blockers, setBlockers] = useState<BlockerRow[]>([]);
  const [nextSteps, setNextSteps] = useState<NextStepRow[]>([]);
  const submit = useSubmitCompanyBrainSessionResult();

  const submitDisabled = useMemo(
    () => !summary.trim() || submit.isPending,
    [summary, submit.isPending]
  );

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!summary.trim()) return;
    const commits = commitsRaw
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [sha, ...rest] = line.split(/\s+/);
        return rest.length ? { sha, message: rest.join(" ") } : { sha };
      });
    const changedFiles = changedFilesRaw
      .split(/[\n,]+/)
      .map((file) => file.trim())
      .filter((file) => file.length > 0);
    submit.mutate({
      workItemId: workItemId.trim() || undefined,
      externalIssueRef: externalIssueRef.trim() || undefined,
      runnerType,
      outcome,
      summary: summary.trim(),
      detail: detail.trim() || undefined,
      branch: branch.trim() || undefined,
      prUrl: prUrl.trim() || undefined,
      commits: commits.length ? commits : undefined,
      changedFiles: changedFiles.length ? changedFiles : undefined,
      validations: validations.length ? validations : undefined,
      blockers: blockers.length ? blockers : undefined,
      nextSteps: nextSteps.length ? nextSteps : undefined,
      area,
      actor: actor.trim() || undefined,
    });
  };

  const result = submit.data?.data as
    | {
        artifact?: { id: string; title: string };
        workItem?: { id: string; status: string } | null;
        signalsCreated?: Array<{ id: string }>;
        guidanceItemsCreated?: Array<{ id: string }>;
        workItemUpdated?: boolean;
      }
    | undefined;

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">Submit Session Result</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Capture the outcome of an agent or human session as durable
              evidence in Company Brain. Creates an Artifact `session_result`,
              optionally moves the linked WorkItem to review/blocked/needs_human
              and generates Signal/Guidance candidates from blockers, failed
              validations and next steps.
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

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <section className="rounded-md border border-border p-4">
            <h2 className="text-sm font-semibold">Target work item</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                WorkItem id
                <input
                  value={workItemId}
                  onChange={(e) => setWorkItemId(e.target.value)}
                  placeholder="optional"
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-normal normal-case tracking-normal"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                External issue ref
                <input
                  value={externalIssueRef}
                  onChange={(e) => setExternalIssueRef(e.target.value)}
                  placeholder="antonio-mello-ai/crewdock#52"
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-normal normal-case tracking-normal"
                />
              </label>
            </div>
          </section>

          <section className="rounded-md border border-border p-4">
            <h2 className="text-sm font-semibold">Run</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Runner type
                <select
                  value={runnerType}
                  onChange={(e) => setRunnerType(e.target.value as typeof runnerType)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-normal normal-case"
                >
                  {RUNNER_TYPES.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Outcome
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as typeof outcome)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-normal normal-case"
                >
                  {OUTCOMES.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Area
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-normal normal-case"
                >
                  {AREAS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Summary (required)
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="One-line description of what happened"
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-normal normal-case"
                rows={2}
              />
            </label>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Detail
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Optional longer description"
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-normal normal-case"
                rows={3}
              />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Branch
                <input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="optional"
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-normal normal-case tracking-normal"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                PR URL
                <input
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-normal normal-case tracking-normal"
                />
              </label>
            </div>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Commits (one per line, `sha message`)
              <textarea
                value={commitsRaw}
                onChange={(e) => setCommitsRaw(e.target.value)}
                placeholder={"abc1234 fix: thing\ndef5678 refactor: other"}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-normal normal-case tracking-normal"
                rows={2}
              />
            </label>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Changed files (comma or newline separated)
              <textarea
                value={changedFilesRaw}
                onChange={(e) => setChangedFilesRaw(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-normal normal-case tracking-normal"
                rows={2}
              />
            </label>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Actor
              <input
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                placeholder="claude-code, antonio-mello, etc"
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-normal normal-case tracking-normal"
              />
            </label>
          </section>

          <section className="rounded-md border border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Validations</h2>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setValidations((rows) => [
                    ...rows,
                    { kind: "build", status: "passed" },
                  ])
                }
              >
                <Plus className="size-3" />
                Add
              </Button>
            </div>
            {validations.map((row, idx) => (
              <div key={idx} className="mt-2 grid gap-2 sm:grid-cols-[1fr_140px_1fr_auto]">
                <input
                  value={row.kind}
                  onChange={(e) =>
                    setValidations((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, kind: e.target.value } : r))
                    )
                  }
                  placeholder="kind (e.g. build, tests)"
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                />
                <select
                  value={row.status}
                  onChange={(e) =>
                    setValidations((rows) =>
                      rows.map((r, i) =>
                        i === idx
                          ? { ...r, status: e.target.value as ValidationRow["status"] }
                          : r
                      )
                    )
                  }
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                >
                  {VALIDATION_STATUSES.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
                <input
                  value={row.notes ?? ""}
                  onChange={(e) =>
                    setValidations((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, notes: e.target.value } : r))
                    )
                  }
                  placeholder="notes (optional)"
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setValidations((rows) => rows.filter((_, i) => i !== idx))
                  }
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </section>

          <section className="rounded-md border border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Blockers</h2>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setBlockers((rows) => [
                    ...rows,
                    { kind: "policy", description: "", severity: "warn" },
                  ])
                }
              >
                <Plus className="size-3" />
                Add
              </Button>
            </div>
            {blockers.map((row, idx) => (
              <div key={idx} className="mt-2 grid gap-2 sm:grid-cols-[140px_1fr_120px_auto]">
                <input
                  value={row.kind}
                  onChange={(e) =>
                    setBlockers((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, kind: e.target.value } : r))
                    )
                  }
                  placeholder="kind"
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                />
                <input
                  value={row.description}
                  onChange={(e) =>
                    setBlockers((rows) =>
                      rows.map((r, i) =>
                        i === idx ? { ...r, description: e.target.value } : r
                      )
                    )
                  }
                  placeholder="description"
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                />
                <select
                  value={row.severity}
                  onChange={(e) =>
                    setBlockers((rows) =>
                      rows.map((r, i) =>
                        i === idx
                          ? { ...r, severity: e.target.value as BlockerRow["severity"] }
                          : r
                      )
                    )
                  }
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                >
                  {SEVERITIES.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setBlockers((rows) => rows.filter((_, i) => i !== idx))
                  }
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </section>

          <section className="rounded-md border border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Next steps</h2>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setNextSteps((rows) => [
                    ...rows,
                    { action: "", audience: "human", severity: "info" },
                  ])
                }
              >
                <Plus className="size-3" />
                Add
              </Button>
            </div>
            {nextSteps.map((row, idx) => (
              <div key={idx} className="mt-2 grid gap-2 sm:grid-cols-[1fr_120px_120px_auto]">
                <input
                  value={row.action}
                  onChange={(e) =>
                    setNextSteps((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, action: e.target.value } : r))
                    )
                  }
                  placeholder="action"
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                />
                <select
                  value={row.audience}
                  onChange={(e) =>
                    setNextSteps((rows) =>
                      rows.map((r, i) =>
                        i === idx
                          ? { ...r, audience: e.target.value as NextStepRow["audience"] }
                          : r
                      )
                    )
                  }
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                >
                  {AUDIENCES.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
                <select
                  value={row.severity}
                  onChange={(e) =>
                    setNextSteps((rows) =>
                      rows.map((r, i) =>
                        i === idx
                          ? { ...r, severity: e.target.value as NextStepRow["severity"] }
                          : r
                      )
                    )
                  }
                  className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                >
                  {SEVERITIES.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setNextSteps((rows) => rows.filter((_, i) => i !== idx))
                  }
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </section>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={submitDisabled}>
              {submit.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Submit
            </Button>
            {submit.isError ? (
              <span className="text-xs text-destructive">
                {submit.error.message}
              </span>
            ) : null}
          </div>
        </form>

        {result?.artifact ? (
          <section className="rounded-md border border-border bg-muted/20 p-4 text-sm">
            <h2 className="text-base font-semibold">Result</h2>
            <ul className="mt-2 space-y-1">
              <li>
                Artifact: <code className="rounded bg-muted px-1">{result.artifact.id}</code> -{" "}
                {result.artifact.title}
              </li>
              {result.workItem ? (
                <li>
                  WorkItem:{" "}
                  <code className="rounded bg-muted px-1">{result.workItem.id}</code>{" "}
                  <Badge variant="outline" className="ml-1 text-[10px]">
                    {result.workItem.status}
                  </Badge>{" "}
                  {result.workItemUpdated ? (
                    <Badge variant="default" className="ml-1 text-[10px]">
                      updated
                    </Badge>
                  ) : null}
                </li>
              ) : null}
              <li>Signals created: {result.signalsCreated?.length ?? 0}</li>
              <li>Guidance created: {result.guidanceItemsCreated?.length ?? 0}</li>
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
