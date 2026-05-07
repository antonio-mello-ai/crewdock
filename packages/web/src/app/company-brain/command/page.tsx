"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Loader2,
  PlayCircle,
  Send,
  ShieldAlert,
} from "lucide-react";
import { useRouteCompanyBrainCommand } from "@/hooks/use-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const AREA_OPTIONS = [
  "auto",
  "strategy",
  "development",
  "marketing",
  "sales",
  "operations",
  "finance",
  "customer",
  "platform",
  "unknown",
];

const INTENT_OPTIONS = [
  "auto",
  "create_work_item",
  "create_guidance",
  "create_external_action_proposal",
  "create_github_issue_proposal",
  "submit_session_result",
  "route_to_goal_decomposition",
  "ask_clarification",
];

function decisionVariant(
  decision: string
): "default" | "secondary" | "destructive" | "outline" {
  if (decision === "blocked") return "destructive";
  if (decision === "created") return "default";
  if (decision === "needs_clarification") return "secondary";
  if (decision === "deferred_to_goal_decomposition") return "secondary";
  return "outline";
}

export default function CompanyBrainCommandPage() {
  const [text, setText] = useState("");
  const [intentHint, setIntentHint] = useState("auto");
  const [area, setArea] = useState("auto");
  const [dryRun, setDryRun] = useState(true);
  const route = useRouteCompanyBrainCommand();

  const submit = (commit: boolean) => {
    if (!text.trim()) return;
    route.mutate({
      text,
      intentHint: intentHint === "auto" ? undefined : intentHint,
      area: area === "auto" ? undefined : area,
      dryRun: !commit,
      actor: "command-router-ui",
    });
  };

  const result = route.data?.data;

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">
              Company Command Router
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Submit a request and AIOS routes it to the right area, target
              object kind and policy gate. Risk C is always blocked. Risk B
              external writeback returns a preview with the existing proposal
              flow. Risk A internal requests can be committed as native
              `WorkItem` or `GuidanceItem` records.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/company-brain/map"
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-muted"
            >
              <ArrowLeft className="size-3" />
              Operating Map
            </Link>
          </div>
        </header>

        <section className="rounded-md border border-border bg-background p-4">
          <label htmlFor="cmd-text" className="text-sm font-semibold">
            Request
          </label>
          <textarea
            id="cmd-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Example: refactor build pipeline; or open a github issue for the auth bug; or increase retention next quarter"
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            rows={4}
          />

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="cmd-intent" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Intent hint
              </label>
              <select
                id="cmd-intent"
                value={intentHint}
                onChange={(event) => setIntentHint(event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
              >
                {INTENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cmd-area" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Area hint
              </label>
              <select
                id="cmd-area"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
              >
                {AREA_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="mt-3 inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!dryRun}
              onChange={(event) => setDryRun(!event.target.checked)}
            />
            Commit (create WorkItem or GuidanceItem when allowed)
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => submit(false)} disabled={!text.trim() || route.isPending}>
              {route.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Preview
            </Button>
            <Button
              variant="outline"
              onClick={() => submit(true)}
              disabled={!text.trim() || route.isPending || dryRun}
            >
              <PlayCircle className="size-4" />
              Commit
            </Button>
          </div>
        </section>

        {result ? (
          <section className="rounded-md border border-border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">Routing</h2>
              <Badge variant={decisionVariant(result.routing.decision)}>
                {result.routing.decision}
              </Badge>
              <Badge variant="outline">risk={result.classification.riskClass}</Badge>
              <Badge variant="outline">{result.classification.area}</Badge>
              <Badge variant="outline">{result.classification.intentKind}</Badge>
              <Badge variant="outline">target={result.classification.targetKind}</Badge>
              <span className="text-xs text-muted-foreground">
                confidence {(result.classification.confidence * 100).toFixed(0)}%
              </span>
            </div>

            <div className="mt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Rationale
              </h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {result.routing.rationale.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            </div>

            <div className="mt-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
              <div className="font-semibold">{result.routing.nextActionLabel}</div>
              <p className="mt-1 text-muted-foreground">
                {result.routing.nextActionDetail}
              </p>
              {result.routing.policySummary ? (
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <ShieldAlert className="size-3" />
                  {result.routing.policySummary}
                </p>
              ) : null}
            </div>

            {result.routing.createdWorkItemId ? (
              <p className="mt-3 text-sm">
                Created WorkItem id:{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  {result.routing.createdWorkItemId}
                </code>
              </p>
            ) : null}
            {result.routing.createdGuidanceItemId ? (
              <p className="mt-3 text-sm">
                Created GuidanceItem id:{" "}
                <code className="rounded bg-muted px-1 py-0.5">
                  {result.routing.createdGuidanceItemId}
                </code>
              </p>
            ) : null}

            {result.routing.clarifications?.length ? (
              <div className="mt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Clarifications needed
                </h3>
                <ul className="mt-1 space-y-2 text-sm">
                  {result.routing.clarifications.map((clarification, idx) => (
                    <li key={idx}>
                      <div>{clarification.question}</div>
                      {clarification.options?.length ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {clarification.options.map((option) => (
                            <Badge
                              key={option}
                              variant="outline"
                              className="text-[10px]"
                            >
                              {option}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
