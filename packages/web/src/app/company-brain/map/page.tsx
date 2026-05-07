"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Brain,
  Briefcase,
  CheckCircle2,
  Compass,
  ExternalLink,
  Gavel,
  HeartHandshake,
  Loader2,
  MapPinned,
  ShieldCheck,
  Target,
  Wallet,
  Wrench,
} from "lucide-react";
import { useCompanyBrainOperatingMap } from "@/hooks/use-api";
import { Badge } from "@/components/ui/badge";
import { formatTimeAgo } from "@/lib/utils";
import type {
  CompanyOperatingMapArea,
  CompanyOperatingMapAreaSlug,
  CompanyOperatingMapAreaStatus,
} from "@aios/shared";

const areaIcons: Record<CompanyOperatingMapAreaSlug, typeof Brain> = {
  strategy: Compass,
  development: Wrench,
  marketing: Target,
  sales: Briefcase,
  operations: Activity,
  finance: Wallet,
  support: HeartHandshake,
  legal_compliance: Gavel,
};

function statusVariant(
  status: CompanyOperatingMapAreaStatus
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "critical") return "destructive";
  if (status === "healthy") return "default";
  if (status === "attention" || status === "policy_blocked") return "secondary";
  return "outline";
}

function workItemBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (["blocked", "needs_human"].includes(status)) return "destructive";
  if (["review", "qa", "security_review"].includes(status)) return "secondary";
  if (["done", "deployed", "monitoring"].includes(status)) return "default";
  return "outline";
}

function AreaCard({ area }: { area: CompanyOperatingMapArea }) {
  const Icon = areaIcons[area.slug];
  const isEmpty = area.status === "empty";
  return (
    <article
      className={`rounded-md border p-4 ${
        area.isPrimary
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-background"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{area.displayName}</h3>
            <p className="text-[11px] text-muted-foreground">
              area={area.primaryArea}
              {area.isPrimary ? " · primary" : ""}
            </p>
          </div>
        </div>
        <Badge variant={statusVariant(area.status)}>{area.status}</Badge>
      </div>

      <p className="mt-2 text-xs leading-snug text-muted-foreground">
        {area.description}
      </p>

      {isEmpty ? (
        <p className="mt-3 text-xs italic text-muted-foreground">
          {area.emptyStateReason ??
            "No data yet. Wire a source and create the first WorkItem."}
        </p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Work items</dt>
              <dd>
                {area.totals.workItemOpenCount}/{area.totals.workItemCount} open
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Review</dt>
              <dd>{area.totals.workItemReviewCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Blocked</dt>
              <dd
                className={
                  area.totals.workItemBlockedCount > 0
                    ? "font-semibold text-destructive"
                    : ""
                }
              >
                {area.totals.workItemBlockedCount}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Done</dt>
              <dd>{area.totals.workItemDoneCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Sources</dt>
              <dd>
                {area.totals.sourceHealthyCount}/{area.totals.sourceCount} healthy
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Sessions</dt>
              <dd>{area.totals.recentSessionResultCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Guidance</dt>
              <dd
                className={
                  area.totals.openGuidanceCount > 0 ? "font-semibold" : ""
                }
              >
                {area.totals.openGuidanceCount}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Proposals</dt>
              <dd>
                {area.totals.pendingProposalCount}p / {area.totals.blockedProposalCount}b
              </dd>
            </div>
          </dl>

          {area.topWorkItems.length ? (
            <div className="mt-4">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Top work
              </h4>
              <ul className="mt-1 space-y-1">
                {area.topWorkItems.map((item) => (
                  <li key={item.workItemId} className="flex items-start gap-2">
                    <Badge
                      variant={workItemBadgeVariant(item.status)}
                      className="mt-0.5 shrink-0 text-[10px]"
                    >
                      {item.status}
                    </Badge>
                    <span className="min-w-0 truncate text-xs">
                      {item.externalUrl ? (
                        <a
                          href={item.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          {item.title}
                          <ExternalLink className="size-3 shrink-0 opacity-60" />
                        </a>
                      ) : (
                        item.title
                      )}
                      {item.lastSessionResultOutcome ? (
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          ({item.lastSessionResultOutcome})
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {area.openGuidance.length ? (
            <div className="mt-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Open guidance
              </h4>
              <ul className="mt-1 space-y-1 text-xs">
                {area.openGuidance.slice(0, 3).map((guidance) => (
                  <li key={guidance.guidanceId} className="flex gap-2">
                    <span className="text-muted-foreground">→</span>
                    <span className="min-w-0">{guidance.action}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {area.pendingProposals.length ? (
            <div className="mt-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Proposals awaiting review
              </h4>
              <ul className="mt-1 space-y-1 text-xs">
                {area.pendingProposals.slice(0, 3).map((proposal) => (
                  <li key={proposal.proposalId} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {proposal.actionType}
                    </Badge>
                    <span className="min-w-0 truncate">{proposal.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-3 text-[10px] italic text-muted-foreground">
            {area.agentRunsSummary.note}
          </p>
        </>
      )}
    </article>
  );
}

export default function CompanyBrainOperatingMapPage() {
  const { data, isLoading } = useCompanyBrainOperatingMap();
  const map = data?.data;

  if (isLoading || !map) {
    return (
      <main className="min-h-screen bg-background p-6 text-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading Company Operating Map
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPinned className="size-4" />
              Updated {formatTimeAgo(map.generatedAt)}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Company Operating Map
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              AIOS / Company Brain at the center, operating areas around it.
              Each area aggregates WorkItems, sources, guidance, proposals and
              recent evidence from the same Company Brain.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/company-brain/operating"
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-muted"
            >
              <ArrowLeft className="size-3" />
              Operating
            </Link>
            <Link
              href="/company-brain"
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-muted"
            >
              Brain Admin
            </Link>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-md border border-border p-4">
            <div className="flex items-center gap-2">
              <Brain className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Areas</h2>
            </div>
            <p className="mt-2 text-2xl font-semibold">{map.totals.areaCount}</p>
            <p className="text-xs text-muted-foreground">
              {map.totals.primaryAreaCount} primary
            </p>
          </article>
          <article className="rounded-md border border-border p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Healthy</h2>
            </div>
            <p className="mt-2 text-2xl font-semibold">
              {map.totals.healthyAreaCount}
            </p>
            <p className="text-xs text-muted-foreground">no blockers</p>
          </article>
          <article className="rounded-md border border-border p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Attention</h2>
            </div>
            <p className="mt-2 text-2xl font-semibold">
              {map.totals.attentionAreaCount}
            </p>
            <p className="text-xs text-muted-foreground">
              guidance / proposals / signals
            </p>
          </article>
          <article className="rounded-md border border-border p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Critical</h2>
            </div>
            <p className="mt-2 text-2xl font-semibold">
              {map.totals.criticalAreaCount}
            </p>
            <p className="text-xs text-muted-foreground">
              blocked work or critical signals
            </p>
          </article>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {map.areas.map((area) => (
            <AreaCard key={area.slug} area={area} />
          ))}
        </section>

        <footer className="border-t border-border pt-4 text-xs text-muted-foreground">
          <p>
            v0 derives state from the Company Brain (WorkItems, sources, signals,
            guidance, ExternalActionProposals, session_result artifacts). Agent
            runs are a derived count of session_result artifacts; the
            Symphony-compatible AgentRunner schema (AIOS-EXEC-03 v1+) will
            replace it with first-class run records.
          </p>
        </footer>
      </div>
    </main>
  );
}
