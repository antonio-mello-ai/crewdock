"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileText,
  GitPullRequest,
  Loader2,
  Milestone,
  Plus,
  RefreshCw,
  Target,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import {
  useCompanyBrainSummary,
  useCreateCompanyBrainArtifact,
  useCreateCompanyBrainDecision,
  useCreateCompanyBrainGoal,
  useCreateCompanyBrainImprovementProposal,
  useCreateCompanyBrainPriority,
  useCreateCompanyBrainSource,
  useCreateCompanyBrainStrategyTradeoff,
  useCreateCompanyBrainWatcher,
  useCreateCompanyBrainWorkflowRun,
  useCreateCompanyBrainWorkItem,
  useExtractCompanyBrainArtifactInsights,
  useExtractCompanyBrainSignalGuidance,
  useGenerateCompanyBrainAgentContext,
  useImportCompanyBrainSlackMessages,
  useRunCompanyBrainWatcher,
  useRunFelhenDemo,
  useSyncCompanyBrainGitHubIssues,
  useSyncCompanyBrainSlackChannel,
  useUpdateCompanyBrainDecision,
  useUpdateCompanyBrainGuidanceItem,
  useUpdateCompanyBrainImprovementProposal,
} from "@/hooks/use-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatTimeAgo } from "@/lib/utils";
import type {
  CompanyBrainArea,
  DecisionStatus,
  GoalStatus,
  RiskClass,
  SlaStatus,
  SourceType,
  SignalSeverity,
  StrategyTradeoffKind,
  StrategyTradeoffStatus,
  WorkItemStatus,
  ActionPolicy,
  AgentContextType,
  ArtifactInsightExtractionMode,
  ImprovementChangeClass,
} from "@aios/shared";

const areas: CompanyBrainArea[] = [
  "strategy",
  "development",
  "operations",
  "product",
  "marketing",
  "sales",
  "platform",
  "unknown",
];

const sourceTypes: SourceType[] = [
  "github_issue",
  "github_repo",
  "local_doc",
  "git",
  "slack",
  "meeting",
  "manual",
  "runtime",
];

const goalStatuses: GoalStatus[] = [
  "not_started",
  "on_track",
  "at_risk",
  "blocked",
  "done",
];

const decisionStatuses: DecisionStatus[] = [
  "proposed",
  "accepted",
  "superseded",
  "rejected",
  "archived",
];
const strategyTradeoffKinds: StrategyTradeoffKind[] = [
  "tradeoff",
  "constraint",
  "non_goal",
  "risk",
  "dependency",
  "principle",
];
const strategyTradeoffStatuses: StrategyTradeoffStatus[] = [
  "proposed",
  "accepted",
  "superseded",
  "rejected",
  "archived",
];

const agentContextTypes: AgentContextType[] = [
  "briefing",
  "spec",
  "prompt",
  "playbook",
  "constraints",
];

const improvementChangeClasses: ImprovementChangeClass[] = ["A", "B", "C", "unknown"];

const workStatuses: WorkItemStatus[] = [
  "new",
  "triage",
  "planned",
  "in_progress",
  "review",
  "qa",
  "blocked",
  "done",
];

const riskClasses: RiskClass[] = ["A", "B", "C", "unknown"];
const slaStatuses: SlaStatus[] = ["not_set", "on_track", "at_risk", "breached"];
const signalSeverities: SignalSeverity[] = ["info", "warn", "critical"];
const githubIssueStates = ["open", "closed", "all"] as const;
type GitHubIssueState = (typeof githubIssueStates)[number];
const artifactExtractionModes: ArtifactInsightExtractionMode[] = [
  "decision",
  "signal",
  "both",
];
const actionPolicies: ActionPolicy[] = [
  "observe_only",
  "create_artifacts",
  "create_work_items",
  "request_human",
  "writeback_allowed",
];

function toDateInput(value: number | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function fromDateInput(value: string) {
  if (!value) return null;
  return new Date(`${value}T12:00:00`).getTime();
}

function splitMultiline(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function StatusBadge({ value }: { value: string }) {
  const color =
    value === "blocked" ||
    value === "failed" ||
    value === "breached" ||
    value === "at_risk" ||
    value === "critical" ||
    value === "error" ||
    value === "drift" ||
    value === "contradiction" ||
    value === "source_unhealthy" ||
    value === "source_without_artifacts" ||
    value === "unlinked_work_item" ||
    value === "pending_gate" ||
    value === "sla_risk" ||
    value === "missing_workflow" ||
    value === "missing_signal" ||
    value === "open_guidance" ||
    value === "stale" ||
    value === "never_synced" ||
    value === "sync_error" ||
    value === "unknown_health" ||
    value === "no_artifacts" ||
    value === "no_work_items" ||
    value === "no_signals"
      ? "border-amber-800/60 bg-amber-950/30 text-amber-300"
      : value === "done" ||
          value === "completed" ||
          value === "passed" ||
          value === "on_track" ||
          value === "healthy" ||
          value === "fresh" ||
          value === "aligned" ||
          value === "accepted" ||
          value === "closed_loop" ||
          value === "improving"
        ? "border-emerald-800/60 bg-emerald-950/30 text-emerald-300"
        : "border-neutral-800 bg-neutral-900/60 text-neutral-400";

  return (
    <Badge variant="outline" className={color}>
      {value.replaceAll("_", " ")}
    </Badge>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-xs font-medium text-neutral-500">{children}</label>;
}

export default function CompanyBrainPage() {
  const { data, isLoading } = useCompanyBrainSummary();
  const createSource = useCreateCompanyBrainSource();
  const createArtifact = useCreateCompanyBrainArtifact();
  const createPriority = useCreateCompanyBrainPriority();
  const createGoal = useCreateCompanyBrainGoal();
  const createDecision = useCreateCompanyBrainDecision();
  const createStrategyTradeoff = useCreateCompanyBrainStrategyTradeoff();
  const extractArtifactInsights = useExtractCompanyBrainArtifactInsights();
  const extractSignalGuidance = useExtractCompanyBrainSignalGuidance();
  const generateAgentContext = useGenerateCompanyBrainAgentContext();
  const createImprovementProposal = useCreateCompanyBrainImprovementProposal();
  const updateImprovementProposal = useUpdateCompanyBrainImprovementProposal();
  const updateDecision = useUpdateCompanyBrainDecision();
  const createWorkItem = useCreateCompanyBrainWorkItem();
  const createWorkflowRun = useCreateCompanyBrainWorkflowRun();
  const createWatcher = useCreateCompanyBrainWatcher();
  const runWatcher = useRunCompanyBrainWatcher();
  const runFelhenDemo = useRunFelhenDemo();
  const syncGitHubIssues = useSyncCompanyBrainGitHubIssues();
  const importSlackMessages = useImportCompanyBrainSlackMessages();
  const syncSlackChannel = useSyncCompanyBrainSlackChannel();
  const updateGuidance = useUpdateCompanyBrainGuidanceItem();

  const summary = data?.data;
  const sources = summary?.sources ?? [];
  const artifacts = summary?.artifacts ?? [];
  const priorities = summary?.priorities ?? [];
  const goals = summary?.goals ?? [];
  const decisions = summary?.decisions ?? [];
  const strategyTradeoffs = summary?.strategyTradeoffs ?? [];
  const workItems = summary?.workItems ?? [];
  const blueprints = summary?.workflowBlueprints ?? [];
  const runs = summary?.workflowRuns ?? [];
  const steps = summary?.workflowSteps ?? [];
  const watchers = summary?.watchers ?? [];
  const watcherRuns = summary?.watcherRuns ?? [];
  const signals = summary?.signals ?? [];
  const alignmentFindings = summary?.alignmentFindings ?? [];
  const guidanceItems = summary?.guidanceItems ?? [];
  const agentContexts = summary?.agentContexts ?? [];
  const improvementProposals = summary?.improvementProposals ?? [];
  const adoptionDashboard = summary?.adoptionDashboard;
  const sourceHealthReport = summary?.sourceHealthReport;

  const developmentBlueprint = blueprints.find(
    (blueprint) => blueprint.id === "development-blueprint-v0"
  );

  const unlinkedWorkItems = useMemo(
    () => workItems.filter((item) => !item.priorityId && !item.goalId),
    [workItems]
  );

  const stepsByRun = useMemo(() => {
    const map = new Map<string, typeof steps>();
    for (const step of steps) {
      const list = map.get(step.runId) ?? [];
      list.push(step);
      map.set(step.runId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position);
    }
    return map;
  }, [steps]);

  const [sourceForm, setSourceForm] = useState({
    name: "ERP GitHub Issues",
    sourceType: "github_issue" as SourceType,
    area: "development" as CompanyBrainArea,
    externalRef: "https://github.com/antonio-mello-ai/erp-desmanches/issues",
    owner: "Felhen",
  });

  const [priorityForm, setPriorityForm] = useState({
    title: "Company Brain Slice 1 foundation",
    area: "platform" as CompanyBrainArea,
    owner: "Antonio",
    reviewCadence: "weekly",
    timeHorizon: "2026-05-06 to 2026-05-12",
    successCriteria:
      "strategy, goal, evidence, work item, workflow run, gate and provenance registered in AIOS",
  });

  const [goalForm, setGoalForm] = useState({
    priorityId: "",
    title: "Slice 1 operational kernel accepted",
    owner: "Antonio",
    dueAt: toDateInput(Date.now() + 6 * 24 * 60 * 60 * 1000),
    reviewCadence: "daily",
    status: "on_track" as GoalStatus,
    slaStatus: "on_track" as SlaStatus,
  });

  const [artifactForm, setArtifactForm] = useState({
    sourceId: "",
    title: "ERP REF issue evidence",
    rawRef: "",
    summary: "External GitHub issue registered as execution evidence.",
  });

  const [artifactExtractorForm, setArtifactExtractorForm] = useState({
    artifactId: "",
    mode: "both" as ArtifactInsightExtractionMode,
    priorityId: "",
    goalId: "",
    workItemId: "",
    signalSeverity: "info" as SignalSeverity,
  });

  const [decisionForm, setDecisionForm] = useState({
    title: "Closed loop guidance requires human feedback before writeback",
    summary:
      "Guidance can be accepted, completed or ignored inside AIOS before any external writeback.",
    rationale:
      "The Company Brain should capture intent and feedback internally before adapters mutate external systems.",
    area: "platform" as CompanyBrainArea,
    owner: "Antonio",
    status: "accepted" as DecisionStatus,
    sourceArtifactId: "",
    priorityId: "",
    goalId: "",
  });

  const [strategyTradeoffForm, setStrategyTradeoffForm] = useState({
    title: "AIOS favors read-only learning before external writeback",
    summary:
      "Use broad connector capability for continuity, but keep runtime actions observe-only until policy and HITL are explicit.",
    rationale:
      "The product needs fast operational learning without allowing an early adapter to mutate external systems by accident.",
    kind: "tradeoff" as StrategyTradeoffKind,
    status: "accepted" as StrategyTradeoffStatus,
    priorityId: "",
    decisionId: "",
    sourceArtifactId: "",
    acceptedOption: "Read/import first, writeback only through explicit policy gates.",
    rejectedOptions: "Automatic Slack replies from ingestion adapters",
    constraints: "External writeback requires action_policy, risk_class, provenance and HITL",
    riskClass: "B" as RiskClass,
  });

  const [agentContextForm, setAgentContextForm] = useState({
    title: "AIOS closed-loop execution context",
    targetAgent: "full-stack-dev",
    contextType: "briefing" as AgentContextType,
    priorityId: "",
    goalId: "",
    decisionId: "",
    guidanceItemId: "",
    workItemId: "",
    sourceArtifactId: "",
  });

  const [improvementForm, setImprovementForm] = useState({
    title: "AutoImprove proposal from accepted guidance",
    hypothesis:
      "If accepted guidance is converted into a reviewed proposal, future agents can validate impact before promotion.",
    changeClass: "B" as ImprovementChangeClass,
    signalId: "",
    findingId: "",
    guidanceItemId: "",
    agentContextId: "",
    priorityId: "",
    goalId: "",
    validationPlan:
      "Validate with API dogfood, build, diff check, and human review before any promotion.",
  });

  const [workItemForm, setWorkItemForm] = useState({
    title: "[ERP-REF-01] Baseline de runtime, testes e ambiente local",
    area: "development" as CompanyBrainArea,
    owner: "Antonio",
    status: "triage" as WorkItemStatus,
    priorityId: "",
    goalId: "",
    externalProvider: "github",
    externalId: "erp-desmanches#19",
    externalUrl: "",
    riskClass: "B" as RiskClass,
    dueAt: "",
    sourceId: "",
  });

  const [runForm, setRunForm] = useState({
    blueprintId: "development-blueprint-v0",
    workItemId: "",
    title: "ERP-REF-01 Development Blueprint run",
    owner: "Antonio",
    dueAt: "",
  });

  const [watcherForm, setWatcherForm] = useState({
    title: "GitHub Issues manual watcher",
    sourceId: "",
    scopeQuery: "repo:antonio-mello-ai/erp-desmanches state:open",
    actionPolicy: "create_work_items" as ActionPolicy,
    riskClass: "B" as RiskClass,
  });

  const [watcherRunForm, setWatcherRunForm] = useState({
    watcherId: "watcher-github-issues-manual-v0",
    sourceId: "",
    rawRef: "",
    title: "Manual GitHub issue watcher observation",
    summary: "Manual watcher run created an artifact and optional internal work item.",
    workItemId: "",
    workflowRunId: "",
    priorityId: "",
    goalId: "",
    signalSeverity: "warn" as SignalSeverity,
    createWorkItem: true,
  });

  const [githubSyncForm, setGithubSyncForm] = useState({
    repo: "antonio-mello-ai/crewdock",
    state: "open" as GitHubIssueState,
    limit: "5",
    sourceName: "CrewDock GitHub Issues read-only sync",
    owner: "Felhen",
    priorityId: "",
    goalId: "",
    createWorkItems: true,
  });

  const [slackImportForm, setSlackImportForm] = useState({
    sourceName: "AIOS Slack manual import",
    workspaceName: "felhen",
    channelName: "aios-ops",
    user: "Antonio",
    permalink: "",
    text: "Slack evidence imported into Company Brain with read-only provenance.",
  });

  const [slackSyncForm, setSlackSyncForm] = useState({
    sourceName: "Felhen #aios-runtime Slack read-only sync",
    workspaceName: "Felhen",
    channelName: "aios-runtime",
    limit: "10",
  });

  const handleCreateSource = (event: FormEvent) => {
    event.preventDefault();
    createSource.mutate(sourceForm);
  };

  const handleCreatePriority = (event: FormEvent) => {
    event.preventDefault();
    createPriority.mutate({
      ...priorityForm,
      ownerType: "human",
      status: "active",
      visibility: "internal",
    });
  };

  const handleCreateGoal = (event: FormEvent) => {
    event.preventDefault();
    createGoal.mutate({
      ...goalForm,
      priorityId: goalForm.priorityId || null,
      dueAt: fromDateInput(goalForm.dueAt),
      ownerType: "human",
      visibility: "internal",
    });
  };

  const handleCreateArtifact = (event: FormEvent) => {
    event.preventDefault();
    if (!artifactForm.sourceId) return;
    createArtifact.mutate({
      ...artifactForm,
      artifactType: "github_issue",
      area: "development",
      humanReviewStatus: "approved",
      visibility: "internal",
    });
  };

  const handleExtractArtifactInsights = (event: FormEvent) => {
    event.preventDefault();
    if (!artifactExtractorForm.artifactId) return;
    extractArtifactInsights.mutate({
      artifactId: artifactExtractorForm.artifactId,
      mode: artifactExtractorForm.mode,
      priorityId: artifactExtractorForm.priorityId || null,
      goalId: artifactExtractorForm.goalId || null,
      workItemId: artifactExtractorForm.workItemId || null,
      signalSeverity: artifactExtractorForm.signalSeverity,
      owner: "Felhen",
    });
  };

  const handleCreateDecision = (event: FormEvent) => {
    event.preventDefault();
    createDecision.mutate({
      title: decisionForm.title,
      summary: decisionForm.summary || null,
      rationale: decisionForm.rationale || null,
      area: decisionForm.area,
      owner: decisionForm.owner || null,
      ownerType: decisionForm.owner ? "human" : "unknown",
      status: decisionForm.status,
      decidedAt: Date.now(),
      sourceArtifactIds: decisionForm.sourceArtifactId
        ? [decisionForm.sourceArtifactId]
        : [],
      priorityIds: decisionForm.priorityId ? [decisionForm.priorityId] : [],
      goalIds: decisionForm.goalId ? [decisionForm.goalId] : [],
      visibility: "internal",
    });
  };

  const handleCreateStrategyTradeoff = (event: FormEvent) => {
    event.preventDefault();
    createStrategyTradeoff.mutate({
      title: strategyTradeoffForm.title,
      summary: strategyTradeoffForm.summary || null,
      rationale: strategyTradeoffForm.rationale || null,
      kind: strategyTradeoffForm.kind,
      status: strategyTradeoffForm.status,
      area: "strategy",
      owner: "Felhen",
      ownerType: "team",
      priorityId: strategyTradeoffForm.priorityId || null,
      decisionId: strategyTradeoffForm.decisionId || null,
      sourceArtifactIds: strategyTradeoffForm.sourceArtifactId
        ? [strategyTradeoffForm.sourceArtifactId]
        : [],
      acceptedOption: strategyTradeoffForm.acceptedOption || null,
      rejectedOptions: splitMultiline(strategyTradeoffForm.rejectedOptions),
      constraints: splitMultiline(strategyTradeoffForm.constraints),
      riskClass: strategyTradeoffForm.riskClass,
      visibility: "internal",
    });
  };

  const handleGenerateAgentContext = (event: FormEvent) => {
    event.preventDefault();
    generateAgentContext.mutate({
      title: agentContextForm.title,
      targetAgent: agentContextForm.targetAgent,
      contextType: agentContextForm.contextType,
      priorityIds: agentContextForm.priorityId ? [agentContextForm.priorityId] : [],
      goalIds: agentContextForm.goalId ? [agentContextForm.goalId] : [],
      decisionIds: agentContextForm.decisionId ? [agentContextForm.decisionId] : [],
      guidanceItemIds: agentContextForm.guidanceItemId
        ? [agentContextForm.guidanceItemId]
        : [],
      workItemIds: agentContextForm.workItemId ? [agentContextForm.workItemId] : [],
      sourceArtifactIds: agentContextForm.sourceArtifactId
        ? [agentContextForm.sourceArtifactId]
        : [],
      visibility: "internal",
    });
  };

  const handleCreateImprovementProposal = (event: FormEvent) => {
    event.preventDefault();
    createImprovementProposal.mutate({
      title: improvementForm.title,
      hypothesis: improvementForm.hypothesis,
      area: "platform",
      owner: "Antonio",
      ownerType: "human",
      signalIds: improvementForm.signalId ? [improvementForm.signalId] : [],
      alignmentFindingIds: improvementForm.findingId
        ? [improvementForm.findingId]
        : [],
      guidanceItemIds: improvementForm.guidanceItemId
        ? [improvementForm.guidanceItemId]
        : [],
      agentContextIds: improvementForm.agentContextId
        ? [improvementForm.agentContextId]
        : [],
      priorityIds: improvementForm.priorityId ? [improvementForm.priorityId] : [],
      goalIds: improvementForm.goalId ? [improvementForm.goalId] : [],
      changeClass: improvementForm.changeClass,
      validationPlan: improvementForm.validationPlan,
      status: "proposed",
      promotionStatus: "not_ready",
      visibility: "internal",
    });
  };

  const reviewImprovementProposal = (
    id: string,
    status: "validated" | "rejected",
    promotionStatus: "candidate" | "rejected"
  ) => {
    updateImprovementProposal.mutate({
      id,
      body: {
        status,
        promotionStatus,
        impactReview:
          status === "validated"
            ? "Marked as validation candidate in Company Brain UI."
            : "Rejected in Company Brain UI before promotion.",
      },
    });
  };

  const handleCreateWorkItem = (event: FormEvent) => {
    event.preventDefault();
    createWorkItem.mutate({
      ...workItemForm,
      priorityId: workItemForm.priorityId || null,
      goalId: workItemForm.goalId || null,
      dueAt: fromDateInput(workItemForm.dueAt),
      sourceId: workItemForm.sourceId || null,
      ownerType: "human",
      labels: ["dogfood", "development-blueprint"],
      visibility: "internal",
    });
  };

  const handleCreateRun = (event: FormEvent) => {
    event.preventDefault();
    createWorkflowRun.mutate({
      blueprintId: runForm.blueprintId,
      workItemId: runForm.workItemId || null,
      title: runForm.title,
      owner: runForm.owner,
      ownerType: "human",
      dueAt: fromDateInput(runForm.dueAt),
      status: "running",
      gateStatus: "pending",
      slaStatus: "on_track",
      visibility: "internal",
    });
  };

  const handleCreateWatcher = (event: FormEvent) => {
    event.preventDefault();
    createWatcher.mutate({
      title: watcherForm.title,
      description:
        "Manual/simulated watcher for GitHub Issues and PR/CI evidence.",
      sourceIds: watcherForm.sourceId ? [watcherForm.sourceId] : [],
      triggerType: "manual",
      eventFilter: "github.issue|github.pull_request|github.check_run",
      scopeQuery: watcherForm.scopeQuery,
      owner: "Felhen",
      ownerType: "team",
      targetWorkflowBlueprintId: "development-blueprint-v0",
      riskClass: watcherForm.riskClass,
      actionPolicy: watcherForm.actionPolicy,
      status: "active",
      failurePolicy: "record_error_no_writeback",
      outputPolicy: "artifact_and_internal_work_item",
      visibility: "internal",
    });
  };

  const handleRunWatcher = (event: FormEvent) => {
    event.preventDefault();
    if (!watcherRunForm.watcherId) return;
    runWatcher.mutate({
      watcherId: watcherRunForm.watcherId,
      body: {
        sourceId: watcherRunForm.sourceId || undefined,
        rawRef: watcherRunForm.rawRef || undefined,
        title: watcherRunForm.title,
        summary: watcherRunForm.summary,
        workItemId: watcherRunForm.workItemId || null,
        workflowRunId: watcherRunForm.workflowRunId || null,
        priorityId: watcherRunForm.priorityId || null,
        goalId: watcherRunForm.goalId || null,
        signalSeverity: watcherRunForm.signalSeverity,
        createWorkItem: watcherRunForm.createWorkItem,
        workItemTitle: watcherRunForm.title,
        externalUrl: watcherRunForm.rawRef || null,
      },
    });
  };

  const handleSyncGitHubIssues = (event: FormEvent) => {
    event.preventDefault();
    syncGitHubIssues.mutate({
      repo: githubSyncForm.repo,
      state: githubSyncForm.state,
      limit: Number(githubSyncForm.limit) || 5,
      sourceName: githubSyncForm.sourceName || undefined,
      area: "development",
      owner: githubSyncForm.owner || undefined,
      createWorkItems: githubSyncForm.createWorkItems,
      priorityId: githubSyncForm.priorityId || null,
      goalId: githubSyncForm.goalId || null,
      visibility: "internal",
    });
  };

  const handleImportSlackMessages = (event: FormEvent) => {
    event.preventDefault();
    importSlackMessages.mutate({
      sourceName: slackImportForm.sourceName || undefined,
      workspaceName: slackImportForm.workspaceName || undefined,
      area: "operations",
      owner: "Felhen",
      visibility: "internal",
      messages: [
        {
          text: slackImportForm.text,
          permalink: slackImportForm.permalink || null,
          channelName: slackImportForm.channelName || null,
          user: slackImportForm.user || null,
          occurredAt: Date.now(),
        },
      ],
    });
  };

  const handleSyncSlackChannel = (event: FormEvent) => {
    event.preventDefault();
    syncSlackChannel.mutate({
      sourceName: slackSyncForm.sourceName || undefined,
      workspaceName: slackSyncForm.workspaceName || undefined,
      channelName: slackSyncForm.channelName || undefined,
      limit: Number(slackSyncForm.limit) || 10,
      area: "operations",
      owner: "Felhen",
      visibility: "internal",
    });
  };

  const handleRunFelhenDemo = () => {
    runFelhenDemo.mutate({
      owner: "Felhen",
      visibility: "internal",
    });
  };

  const updateGuidanceFeedback = (
    id: string,
    status: "accepted" | "done" | "ignored",
    feedbackStatus: "accepted" | "completed" | "ignored"
  ) => {
    updateGuidance.mutate({
      id,
      body: {
        status,
        feedbackStatus,
        feedbackNote: `Updated from Company Brain UI as ${status}.`,
      },
    });
  };

  const updateDecisionStatus = (id: string, status: DecisionStatus) => {
    updateDecision.mutate({
      id,
      body: {
        status,
        reviewNote: `Reviewed from Company Brain UI as ${status}.`,
      },
    });
  };

  const handleExtractSignalGuidance = (signalId: string) => {
    extractSignalGuidance.mutate({ signalId });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-100">
            Company Brain
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Strategy, goals, evidence, work items, workflow runs and gates.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-12">
          <Metric icon={Database} label="Sources" value={summary?.stats.sourceCount ?? 0} />
          <Metric
            icon={Database}
            label="Projects"
            value={adoptionDashboard?.stats.projectCount ?? 0}
          />
          <Metric
            icon={Workflow}
            label="Closed loop"
            value={adoptionDashboard?.stats.closedLoopProjectCount ?? 0}
          />
          <Metric icon={Target} label="Goals" value={summary?.stats.goalCount ?? 0} />
          <Metric
            icon={CheckCircle2}
            label="Decisions"
            value={summary?.stats.decisionCount ?? 0}
          />
          <Metric
            icon={AlertTriangle}
            label="Unlinked"
            value={summary?.stats.unlinkedWorkItemCount ?? 0}
          />
          <Metric icon={FileText} label="Signals" value={summary?.stats.signalCount ?? 0} />
          <Metric
            icon={AlertTriangle}
            label="Findings"
            value={summary?.stats.alignmentFindingCount ?? 0}
          />
          <Metric
            icon={Workflow}
            label="Guidance"
            value={summary?.stats.openGuidanceCount ?? 0}
          />
          <Metric
            icon={AlertTriangle}
            label="Gates"
            value={adoptionDashboard?.stats.pendingGateCount ?? 0}
          />
          <Metric
            icon={FileText}
            label="Contexts"
            value={summary?.stats.agentContextCount ?? 0}
          />
          <Metric
            icon={Workflow}
            label="Proposals"
            value={summary?.stats.improvementProposalCount ?? 0}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
        </div>
      ) : (
        <div className="space-y-8">
          {adoptionDashboard ? (
            <section className="rounded-lg border border-neutral-800/60 bg-neutral-900/30">
              <div className="border-b border-neutral-800/50 px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-neutral-500" />
                    <h2 className="text-sm font-semibold text-neutral-200">
                      Adoption Dashboard
                    </h2>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleRunFelhenDemo}
                    disabled={runFelhenDemo.isPending}
                  >
                    {runFelhenDemo.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Run demo
                  </Button>
                </div>
              </div>
              <div className="grid gap-0 lg:grid-cols-[1.5fr_1fr]">
                <div className="divide-y divide-neutral-800/40 border-neutral-800/50 lg:border-r">
                  {adoptionDashboard.projects.length === 0 ? (
                    <EmptyState label="No Company Brain sources registered" />
                  ) : (
                    adoptionDashboard.projects.slice(0, 6).map((project) => (
                      <div key={project.id} className="px-5 py-4">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium text-neutral-200">
                                {project.title}
                              </p>
                              <StatusBadge value={project.stage} />
                              <StatusBadge value={project.healthStatus} />
                            </div>
                            <p className="mt-1 text-xs text-neutral-600">
                              {project.area} · {project.sourceType} ·{" "}
                              {project.owner ?? "no owner"} ·{" "}
                              {project.lastActivityAt
                                ? formatTimeAgo(project.lastActivityAt)
                                : "no activity"}
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-left xl:w-72">
                            <MiniMetric
                              label="evidence"
                              value={project.metrics.artifactCount}
                            />
                            <MiniMetric
                              label="work"
                              value={project.metrics.workItemCount}
                            />
                            <MiniMetric
                              label="signals"
                              value={project.metrics.signalCount}
                            />
                          </div>
                        </div>
                        {project.gapKinds.length ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {project.gapKinds.map((gap) => (
                              <StatusBadge key={gap} value={gap} />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
                <div className="divide-y divide-neutral-800/40">
                  {adoptionDashboard.gaps.length === 0 ? (
                    <EmptyState label="No adoption gaps detected" />
                  ) : (
                    adoptionDashboard.gaps.slice(0, 8).map((gap) => (
                      <div key={gap.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-200">
                              {gap.title}
                            </p>
                            <p className="mt-1 text-xs text-neutral-600">
                              {gap.kind.replaceAll("_", " ")} · {gap.area}
                            </p>
                          </div>
                          <StatusBadge value={gap.severity} />
                        </div>
                        <p className="mt-2 text-xs text-neutral-500">
                          {gap.rationale}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {sourceHealthReport ? (
            <section className="rounded-lg border border-neutral-800/60 bg-neutral-900/30">
              <div className="border-b border-neutral-800/50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-neutral-500" />
                  <h2 className="text-sm font-semibold text-neutral-200">
                    Source Health
                  </h2>
                </div>
              </div>
              <div className="divide-y divide-neutral-800/40">
                {sourceHealthReport.sources.length === 0 ? (
                  <EmptyState label="No sources to inspect" />
                ) : (
                  sourceHealthReport.sources.slice(0, 8).map((source) => (
                    <div key={source.sourceId} className="px-5 py-4">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium text-neutral-200">
                              {source.title}
                            </p>
                            <StatusBadge value={source.healthStatus} />
                            <StatusBadge value={source.freshnessStatus} />
                          </div>
                          <p className="mt-1 text-xs text-neutral-600">
                            {source.area} · {source.sourceType} ·{" "}
                            {source.owner ?? "no owner"} · sync{" "}
                            {source.lastSyncAt
                              ? formatTimeAgo(source.lastSyncAt)
                              : "never"}
                          </p>
                          {source.syncError ? (
                            <p className="mt-2 text-xs text-amber-300">
                              {source.syncError}
                            </p>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-left xl:w-96">
                          <MiniMetric label="artifacts" value={source.artifactCount} />
                          <MiniMetric label="work" value={source.workItemCount} />
                          <MiniMetric label="signals" value={source.signalCount} />
                          <MiniMetric label="watchers" value={source.watcherCount} />
                        </div>
                      </div>
                      {source.issueKinds.length ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {source.issueKinds.map((issue) => (
                            <StatusBadge key={issue} value={issue} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-3">
            <KernelForm title="Source" icon={Database} onSubmit={handleCreateSource}>
              <FieldLabel>Name</FieldLabel>
              <Input
                value={sourceForm.name}
                onChange={(event) =>
                  setSourceForm({ ...sourceForm, name: event.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Type</FieldLabel>
                  <Select
                    value={sourceForm.sourceType}
                    onChange={(event) =>
                      setSourceForm({
                        ...sourceForm,
                        sourceType: event.target.value as SourceType,
                      })
                    }
                  >
                    {sourceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Area</FieldLabel>
                  <Select
                    value={sourceForm.area}
                    onChange={(event) =>
                      setSourceForm({
                        ...sourceForm,
                        area: event.target.value as CompanyBrainArea,
                      })
                    }
                  >
                    {areas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <FieldLabel>External ref</FieldLabel>
              <Input
                value={sourceForm.externalRef}
                onChange={(event) =>
                  setSourceForm({ ...sourceForm, externalRef: event.target.value })
                }
              />
              <FieldLabel>Owner</FieldLabel>
              <Input
                value={sourceForm.owner}
                onChange={(event) =>
                  setSourceForm({ ...sourceForm, owner: event.target.value })
                }
              />
              <SubmitButton pending={createSource.isPending} />
            </KernelForm>

            <KernelForm title="Priority" icon={Target} onSubmit={handleCreatePriority}>
              <FieldLabel>Title</FieldLabel>
              <Input
                value={priorityForm.title}
                onChange={(event) =>
                  setPriorityForm({ ...priorityForm, title: event.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Area</FieldLabel>
                  <Select
                    value={priorityForm.area}
                    onChange={(event) =>
                      setPriorityForm({
                        ...priorityForm,
                        area: event.target.value as CompanyBrainArea,
                      })
                    }
                  >
                    {areas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Cadence</FieldLabel>
                  <Input
                    value={priorityForm.reviewCadence}
                    onChange={(event) =>
                      setPriorityForm({
                        ...priorityForm,
                        reviewCadence: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <FieldLabel>Owner</FieldLabel>
              <Input
                value={priorityForm.owner}
                onChange={(event) =>
                  setPriorityForm({ ...priorityForm, owner: event.target.value })
                }
              />
              <FieldLabel>Success criteria</FieldLabel>
              <textarea
                value={priorityForm.successCriteria}
                onChange={(event) =>
                  setPriorityForm({
                    ...priorityForm,
                    successCriteria: event.target.value,
                  })
                }
                className="min-h-20 rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600"
              />
              <SubmitButton pending={createPriority.isPending} />
            </KernelForm>

            <KernelForm title="Goal" icon={Milestone} onSubmit={handleCreateGoal}>
              <FieldLabel>Title</FieldLabel>
              <Input
                value={goalForm.title}
                onChange={(event) =>
                  setGoalForm({ ...goalForm, title: event.target.value })
                }
              />
              <FieldLabel>Priority</FieldLabel>
              <Select
                value={goalForm.priorityId}
                onChange={(event) =>
                  setGoalForm({ ...goalForm, priorityId: event.target.value })
                }
              >
                <option value="">unlinked</option>
                {priorities.map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    {priority.title}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Due</FieldLabel>
                  <Input
                    type="date"
                    value={goalForm.dueAt}
                    onChange={(event) =>
                      setGoalForm({ ...goalForm, dueAt: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>SLA</FieldLabel>
                  <Select
                    value={goalForm.slaStatus}
                    onChange={(event) =>
                      setGoalForm({
                        ...goalForm,
                        slaStatus: event.target.value as SlaStatus,
                      })
                    }
                  >
                    {slaStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    value={goalForm.status}
                    onChange={(event) =>
                      setGoalForm({
                        ...goalForm,
                        status: event.target.value as GoalStatus,
                      })
                    }
                  >
                    {goalStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Cadence</FieldLabel>
                  <Input
                    value={goalForm.reviewCadence}
                    onChange={(event) =>
                      setGoalForm({
                        ...goalForm,
                        reviewCadence: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <SubmitButton pending={createGoal.isPending} />
            </KernelForm>
          </section>

          <section className="grid gap-4 lg:grid-cols-4">
            <KernelForm title="Watcher" icon={Workflow} onSubmit={handleCreateWatcher}>
              <FieldLabel>Title</FieldLabel>
              <Input
                value={watcherForm.title}
                onChange={(event) =>
                  setWatcherForm({ ...watcherForm, title: event.target.value })
                }
              />
              <FieldLabel>Source</FieldLabel>
              <Select
                value={watcherForm.sourceId}
                onChange={(event) =>
                  setWatcherForm({ ...watcherForm, sourceId: event.target.value })
                }
              >
                <option value="">select at run time</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </Select>
              <FieldLabel>Scope query</FieldLabel>
              <Input
                value={watcherForm.scopeQuery}
                onChange={(event) =>
                  setWatcherForm({
                    ...watcherForm,
                    scopeQuery: event.target.value,
                  })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Policy</FieldLabel>
                  <Select
                    value={watcherForm.actionPolicy}
                    onChange={(event) =>
                      setWatcherForm({
                        ...watcherForm,
                        actionPolicy: event.target.value as ActionPolicy,
                      })
                    }
                  >
                    {actionPolicies.map((policy) => (
                      <option key={policy} value={policy}>
                        {policy}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Risk</FieldLabel>
                  <Select
                    value={watcherForm.riskClass}
                    onChange={(event) =>
                      setWatcherForm({
                        ...watcherForm,
                        riskClass: event.target.value as RiskClass,
                      })
                    }
                  >
                    {riskClasses.map((risk) => (
                      <option key={risk} value={risk}>
                        {risk}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <SubmitButton pending={createWatcher.isPending} />
            </KernelForm>

            <KernelForm title="Watcher run" icon={GitPullRequest} onSubmit={handleRunWatcher}>
              <FieldLabel>Watcher</FieldLabel>
              <Select
                value={watcherRunForm.watcherId}
                onChange={(event) =>
                  setWatcherRunForm({
                    ...watcherRunForm,
                    watcherId: event.target.value,
                  })
                }
              >
                <option value="">select watcher</option>
                {watchers.map((watcher) => (
                  <option key={watcher.id} value={watcher.id}>
                    {watcher.title}
                  </option>
                ))}
              </Select>
              <FieldLabel>Source</FieldLabel>
              <Select
                value={watcherRunForm.sourceId}
                onChange={(event) =>
                  setWatcherRunForm({
                    ...watcherRunForm,
                    sourceId: event.target.value,
                  })
                }
              >
                <option value="">watcher default</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </Select>
              <FieldLabel>Raw ref</FieldLabel>
              <Input
                value={watcherRunForm.rawRef}
                onChange={(event) =>
                  setWatcherRunForm({ ...watcherRunForm, rawRef: event.target.value })
                }
              />
              <FieldLabel>Title</FieldLabel>
              <Input
                value={watcherRunForm.title}
                onChange={(event) =>
                  setWatcherRunForm({ ...watcherRunForm, title: event.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Work item link</FieldLabel>
                  <Select
                    value={watcherRunForm.workItemId}
                    onChange={(event) =>
                      setWatcherRunForm({
                        ...watcherRunForm,
                        workItemId: event.target.value,
                      })
                    }
                  >
                    <option value="">create or no link</option>
                    {workItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Workflow run</FieldLabel>
                  <Select
                    value={watcherRunForm.workflowRunId}
                    onChange={(event) =>
                      setWatcherRunForm({
                        ...watcherRunForm,
                        workflowRunId: event.target.value,
                      })
                    }
                  >
                    <option value="">no run link</option>
                    {runs.map((run) => (
                      <option key={run.id} value={run.id}>
                        {run.title}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <FieldLabel>Priority</FieldLabel>
                  <Select
                    value={watcherRunForm.priorityId}
                    onChange={(event) =>
                      setWatcherRunForm({
                        ...watcherRunForm,
                        priorityId: event.target.value,
                      })
                    }
                  >
                    <option value="">derive or unlinked</option>
                    {priorities.map((priority) => (
                      <option key={priority.id} value={priority.id}>
                        {priority.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Goal</FieldLabel>
                  <Select
                    value={watcherRunForm.goalId}
                    onChange={(event) =>
                      setWatcherRunForm({
                        ...watcherRunForm,
                        goalId: event.target.value,
                      })
                    }
                  >
                    <option value="">derive or unlinked</option>
                    {goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Severity</FieldLabel>
                  <Select
                    value={watcherRunForm.signalSeverity}
                    onChange={(event) =>
                      setWatcherRunForm({
                        ...watcherRunForm,
                        signalSeverity: event.target.value as SignalSeverity,
                      })
                    }
                  >
                    {signalSeverities.map((severity) => (
                      <option key={severity} value={severity}>
                        {severity}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-neutral-400">
                <input
                  type="checkbox"
                  checked={watcherRunForm.createWorkItem}
                  onChange={(event) =>
                    setWatcherRunForm({
                      ...watcherRunForm,
                      createWorkItem: event.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-neutral-700 bg-neutral-950"
                />
                Create internal WorkItem
              </label>
              <SubmitButton
                pending={runWatcher.isPending}
                disabled={!watcherRunForm.watcherId}
              />
            </KernelForm>

            <KernelForm
              title="GitHub sync"
              icon={GitPullRequest}
              onSubmit={handleSyncGitHubIssues}
            >
              <FieldLabel>Repository</FieldLabel>
              <Input
                value={githubSyncForm.repo}
                onChange={(event) =>
                  setGithubSyncForm({
                    ...githubSyncForm,
                    repo: event.target.value,
                  })
                }
              />
              <FieldLabel>Source name</FieldLabel>
              <Input
                value={githubSyncForm.sourceName}
                onChange={(event) =>
                  setGithubSyncForm({
                    ...githubSyncForm,
                    sourceName: event.target.value,
                  })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>State</FieldLabel>
                  <Select
                    value={githubSyncForm.state}
                    onChange={(event) =>
                      setGithubSyncForm({
                        ...githubSyncForm,
                        state: event.target.value as GitHubIssueState,
                      })
                    }
                  >
                    {githubIssueStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Limit</FieldLabel>
                  <Input
                    value={githubSyncForm.limit}
                    onChange={(event) =>
                      setGithubSyncForm({
                        ...githubSyncForm,
                        limit: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Priority</FieldLabel>
                  <Select
                    value={githubSyncForm.priorityId}
                    onChange={(event) =>
                      setGithubSyncForm({
                        ...githubSyncForm,
                        priorityId: event.target.value,
                      })
                    }
                  >
                    <option value="">unlinked</option>
                    {priorities.map((priority) => (
                      <option key={priority.id} value={priority.id}>
                        {priority.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Goal</FieldLabel>
                  <Select
                    value={githubSyncForm.goalId}
                    onChange={(event) =>
                      setGithubSyncForm({
                        ...githubSyncForm,
                        goalId: event.target.value,
                      })
                    }
                  >
                    <option value="">unlinked</option>
                    {goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-neutral-400">
                <input
                  type="checkbox"
                  checked={githubSyncForm.createWorkItems}
                  onChange={(event) =>
                    setGithubSyncForm({
                      ...githubSyncForm,
                      createWorkItems: event.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-neutral-700 bg-neutral-950"
                />
                Create internal WorkItems
              </label>
              <SubmitButton pending={syncGitHubIssues.isPending} />
            </KernelForm>

            <KernelForm
              title="Slack sync"
              icon={RefreshCw}
              onSubmit={handleSyncSlackChannel}
            >
              <FieldLabel>Source name</FieldLabel>
              <Input
                value={slackSyncForm.sourceName}
                onChange={(event) =>
                  setSlackSyncForm({
                    ...slackSyncForm,
                    sourceName: event.target.value,
                  })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Workspace</FieldLabel>
                  <Input
                    value={slackSyncForm.workspaceName}
                    onChange={(event) =>
                      setSlackSyncForm({
                        ...slackSyncForm,
                        workspaceName: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Channel</FieldLabel>
                  <Input
                    value={slackSyncForm.channelName}
                    onChange={(event) =>
                      setSlackSyncForm({
                        ...slackSyncForm,
                        channelName: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <FieldLabel>Limit</FieldLabel>
              <Input
                value={slackSyncForm.limit}
                onChange={(event) =>
                  setSlackSyncForm({
                    ...slackSyncForm,
                    limit: event.target.value,
                  })
                }
              />
              <SubmitButton
                pending={syncSlackChannel.isPending}
                disabled={!slackSyncForm.channelName.trim()}
              />
            </KernelForm>

            <KernelForm
              title="Slack import"
              icon={FileText}
              onSubmit={handleImportSlackMessages}
            >
              <FieldLabel>Source name</FieldLabel>
              <Input
                value={slackImportForm.sourceName}
                onChange={(event) =>
                  setSlackImportForm({
                    ...slackImportForm,
                    sourceName: event.target.value,
                  })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Workspace</FieldLabel>
                  <Input
                    value={slackImportForm.workspaceName}
                    onChange={(event) =>
                      setSlackImportForm({
                        ...slackImportForm,
                        workspaceName: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Channel</FieldLabel>
                  <Input
                    value={slackImportForm.channelName}
                    onChange={(event) =>
                      setSlackImportForm({
                        ...slackImportForm,
                        channelName: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <FieldLabel>Permalink</FieldLabel>
              <Input
                value={slackImportForm.permalink}
                onChange={(event) =>
                  setSlackImportForm({
                    ...slackImportForm,
                    permalink: event.target.value,
                  })
                }
              />
              <FieldLabel>Message</FieldLabel>
              <textarea
                value={slackImportForm.text}
                onChange={(event) =>
                  setSlackImportForm({
                    ...slackImportForm,
                    text: event.target.value,
                  })
                }
                className="min-h-20 rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600"
              />
              <SubmitButton
                pending={importSlackMessages.isPending}
                disabled={!slackImportForm.text.trim()}
              />
            </KernelForm>
          </section>

          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <KernelForm title="Evidence" icon={FileText} onSubmit={handleCreateArtifact}>
              <FieldLabel>Source</FieldLabel>
              <Select
                value={artifactForm.sourceId}
                onChange={(event) =>
                  setArtifactForm({ ...artifactForm, sourceId: event.target.value })
                }
              >
                <option value="">select source</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </Select>
              <FieldLabel>Title</FieldLabel>
              <Input
                value={artifactForm.title}
                onChange={(event) =>
                  setArtifactForm({ ...artifactForm, title: event.target.value })
                }
              />
              <FieldLabel>Raw ref</FieldLabel>
              <Input
                value={artifactForm.rawRef}
                onChange={(event) =>
                  setArtifactForm({ ...artifactForm, rawRef: event.target.value })
                }
              />
              <FieldLabel>Summary</FieldLabel>
              <textarea
                value={artifactForm.summary}
                onChange={(event) =>
                  setArtifactForm({ ...artifactForm, summary: event.target.value })
                }
                className="min-h-20 rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600"
              />
              <SubmitButton
                pending={createArtifact.isPending}
                disabled={!artifactForm.sourceId}
              />
            </KernelForm>

            <KernelForm
              title="Extract"
              icon={RefreshCw}
              onSubmit={handleExtractArtifactInsights}
            >
              <FieldLabel>Artifact</FieldLabel>
              <Select
                value={artifactExtractorForm.artifactId}
                onChange={(event) =>
                  setArtifactExtractorForm({
                    ...artifactExtractorForm,
                    artifactId: event.target.value,
                  })
                }
              >
                <option value="">select artifact</option>
                {artifacts.map((artifact) => (
                  <option key={artifact.id} value={artifact.id}>
                    {artifact.title}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Mode</FieldLabel>
                  <Select
                    value={artifactExtractorForm.mode}
                    onChange={(event) =>
                      setArtifactExtractorForm({
                        ...artifactExtractorForm,
                        mode: event.target.value as ArtifactInsightExtractionMode,
                      })
                    }
                  >
                    {artifactExtractionModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Severity</FieldLabel>
                  <Select
                    value={artifactExtractorForm.signalSeverity}
                    onChange={(event) =>
                      setArtifactExtractorForm({
                        ...artifactExtractorForm,
                        signalSeverity: event.target.value as SignalSeverity,
                      })
                    }
                  >
                    {signalSeverities.map((severity) => (
                      <option key={severity} value={severity}>
                        {severity}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Priority</FieldLabel>
                  <Select
                    value={artifactExtractorForm.priorityId}
                    onChange={(event) =>
                      setArtifactExtractorForm({
                        ...artifactExtractorForm,
                        priorityId: event.target.value,
                      })
                    }
                  >
                    <option value="">no priority</option>
                    {priorities.map((priority) => (
                      <option key={priority.id} value={priority.id}>
                        {priority.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Work item</FieldLabel>
                  <Select
                    value={artifactExtractorForm.workItemId}
                    onChange={(event) =>
                      setArtifactExtractorForm({
                        ...artifactExtractorForm,
                        workItemId: event.target.value,
                      })
                    }
                  >
                    <option value="">no work item</option>
                    {workItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <SubmitButton
                pending={extractArtifactInsights.isPending}
                disabled={!artifactExtractorForm.artifactId}
              />
            </KernelForm>

            <KernelForm title="Decision" icon={CheckCircle2} onSubmit={handleCreateDecision}>
              <FieldLabel>Title</FieldLabel>
              <Input
                value={decisionForm.title}
                onChange={(event) =>
                  setDecisionForm({ ...decisionForm, title: event.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Area</FieldLabel>
                  <Select
                    value={decisionForm.area}
                    onChange={(event) =>
                      setDecisionForm({
                        ...decisionForm,
                        area: event.target.value as CompanyBrainArea,
                      })
                    }
                  >
                    {areas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    value={decisionForm.status}
                    onChange={(event) =>
                      setDecisionForm({
                        ...decisionForm,
                        status: event.target.value as DecisionStatus,
                      })
                    }
                  >
                    {decisionStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <FieldLabel>Source artifact</FieldLabel>
              <Select
                value={decisionForm.sourceArtifactId}
                onChange={(event) =>
                  setDecisionForm({
                    ...decisionForm,
                    sourceArtifactId: event.target.value,
                  })
                }
              >
                <option value="">no artifact source</option>
                {artifacts.map((artifact) => (
                  <option key={artifact.id} value={artifact.id}>
                    {artifact.title}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Priority</FieldLabel>
                  <Select
                    value={decisionForm.priorityId}
                    onChange={(event) =>
                      setDecisionForm({
                        ...decisionForm,
                        priorityId: event.target.value,
                      })
                    }
                  >
                    <option value="">no priority</option>
                    {priorities.map((priority) => (
                      <option key={priority.id} value={priority.id}>
                        {priority.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Goal</FieldLabel>
                  <Select
                    value={decisionForm.goalId}
                    onChange={(event) =>
                      setDecisionForm({ ...decisionForm, goalId: event.target.value })
                    }
                  >
                    <option value="">no goal</option>
                    {goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <FieldLabel>Rationale</FieldLabel>
              <textarea
                value={decisionForm.rationale}
                onChange={(event) =>
                  setDecisionForm({
                    ...decisionForm,
                    rationale: event.target.value,
                  })
                }
                className="min-h-20 rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600"
              />
              <SubmitButton pending={createDecision.isPending} />
            </KernelForm>

            <KernelForm
              title="Tradeoff"
              icon={AlertTriangle}
              onSubmit={handleCreateStrategyTradeoff}
            >
              <FieldLabel>Title</FieldLabel>
              <Input
                value={strategyTradeoffForm.title}
                onChange={(event) =>
                  setStrategyTradeoffForm({
                    ...strategyTradeoffForm,
                    title: event.target.value,
                  })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Kind</FieldLabel>
                  <Select
                    value={strategyTradeoffForm.kind}
                    onChange={(event) =>
                      setStrategyTradeoffForm({
                        ...strategyTradeoffForm,
                        kind: event.target.value as StrategyTradeoffKind,
                      })
                    }
                  >
                    {strategyTradeoffKinds.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    value={strategyTradeoffForm.status}
                    onChange={(event) =>
                      setStrategyTradeoffForm({
                        ...strategyTradeoffForm,
                        status: event.target.value as StrategyTradeoffStatus,
                      })
                    }
                  >
                    {strategyTradeoffStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Priority</FieldLabel>
                  <Select
                    value={strategyTradeoffForm.priorityId}
                    onChange={(event) =>
                      setStrategyTradeoffForm({
                        ...strategyTradeoffForm,
                        priorityId: event.target.value,
                      })
                    }
                  >
                    <option value="">no priority</option>
                    {priorities.map((priority) => (
                      <option key={priority.id} value={priority.id}>
                        {priority.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Decision</FieldLabel>
                  <Select
                    value={strategyTradeoffForm.decisionId}
                    onChange={(event) =>
                      setStrategyTradeoffForm({
                        ...strategyTradeoffForm,
                        decisionId: event.target.value,
                      })
                    }
                  >
                    <option value="">no decision</option>
                    {decisions.map((decision) => (
                      <option key={decision.id} value={decision.id}>
                        {decision.title}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <FieldLabel>Accepted option</FieldLabel>
              <Input
                value={strategyTradeoffForm.acceptedOption}
                onChange={(event) =>
                  setStrategyTradeoffForm({
                    ...strategyTradeoffForm,
                    acceptedOption: event.target.value,
                  })
                }
              />
              <FieldLabel>Source artifact</FieldLabel>
              <Select
                value={strategyTradeoffForm.sourceArtifactId}
                onChange={(event) =>
                  setStrategyTradeoffForm({
                    ...strategyTradeoffForm,
                    sourceArtifactId: event.target.value,
                  })
                }
              >
                <option value="">no artifact source</option>
                {artifacts.map((artifact) => (
                  <option key={artifact.id} value={artifact.id}>
                    {artifact.title}
                  </option>
                ))}
              </Select>
              <FieldLabel>Rationale</FieldLabel>
              <textarea
                value={strategyTradeoffForm.rationale}
                onChange={(event) =>
                  setStrategyTradeoffForm({
                    ...strategyTradeoffForm,
                    rationale: event.target.value,
                  })
                }
                className="min-h-16 rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600"
              />
              <FieldLabel>Constraints</FieldLabel>
              <textarea
                value={strategyTradeoffForm.constraints}
                onChange={(event) =>
                  setStrategyTradeoffForm({
                    ...strategyTradeoffForm,
                    constraints: event.target.value,
                  })
                }
                className="min-h-16 rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600"
              />
              <SubmitButton
                pending={createStrategyTradeoff.isPending}
                disabled={!strategyTradeoffForm.title.trim()}
              />
            </KernelForm>

            <KernelForm
              title="Agent context"
              icon={FileText}
              onSubmit={handleGenerateAgentContext}
            >
              <FieldLabel>Title</FieldLabel>
              <Input
                value={agentContextForm.title}
                onChange={(event) =>
                  setAgentContextForm({
                    ...agentContextForm,
                    title: event.target.value,
                  })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Target agent</FieldLabel>
                  <Input
                    value={agentContextForm.targetAgent}
                    onChange={(event) =>
                      setAgentContextForm({
                        ...agentContextForm,
                        targetAgent: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Type</FieldLabel>
                  <Select
                    value={agentContextForm.contextType}
                    onChange={(event) =>
                      setAgentContextForm({
                        ...agentContextForm,
                        contextType: event.target.value as AgentContextType,
                      })
                    }
                  >
                    {agentContextTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <FieldLabel>Decision</FieldLabel>
              <Select
                value={agentContextForm.decisionId}
                onChange={(event) =>
                  setAgentContextForm({
                    ...agentContextForm,
                    decisionId: event.target.value,
                  })
                }
              >
                <option value="">no decision</option>
                {decisions.map((decision) => (
                  <option key={decision.id} value={decision.id}>
                    {decision.title}
                  </option>
                ))}
              </Select>
              <FieldLabel>Guidance</FieldLabel>
              <Select
                value={agentContextForm.guidanceItemId}
                onChange={(event) =>
                  setAgentContextForm({
                    ...agentContextForm,
                    guidanceItemId: event.target.value,
                  })
                }
              >
                <option value="">no guidance</option>
                {guidanceItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Priority</FieldLabel>
                  <Select
                    value={agentContextForm.priorityId}
                    onChange={(event) =>
                      setAgentContextForm({
                        ...agentContextForm,
                        priorityId: event.target.value,
                      })
                    }
                  >
                    <option value="">no priority</option>
                    {priorities.map((priority) => (
                      <option key={priority.id} value={priority.id}>
                        {priority.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Goal</FieldLabel>
                  <Select
                    value={agentContextForm.goalId}
                    onChange={(event) =>
                      setAgentContextForm({
                        ...agentContextForm,
                        goalId: event.target.value,
                      })
                    }
                  >
                    <option value="">no goal</option>
                    {goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <SubmitButton
                pending={generateAgentContext.isPending}
                disabled={!agentContextForm.targetAgent}
              />
            </KernelForm>

            <KernelForm
              title="Improvement proposal"
              icon={Workflow}
              onSubmit={handleCreateImprovementProposal}
            >
              <FieldLabel>Title</FieldLabel>
              <Input
                value={improvementForm.title}
                onChange={(event) =>
                  setImprovementForm({
                    ...improvementForm,
                    title: event.target.value,
                  })
                }
              />
              <FieldLabel>Hypothesis</FieldLabel>
              <textarea
                value={improvementForm.hypothesis}
                onChange={(event) =>
                  setImprovementForm({
                    ...improvementForm,
                    hypothesis: event.target.value,
                  })
                }
                className="min-h-20 rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600"
              />
              <FieldLabel>Signal</FieldLabel>
              <Select
                value={improvementForm.signalId}
                onChange={(event) =>
                  setImprovementForm({
                    ...improvementForm,
                    signalId: event.target.value,
                  })
                }
              >
                <option value="">no signal</option>
                {signals.map((signal) => (
                  <option key={signal.id} value={signal.id}>
                    {signal.summary}
                  </option>
                ))}
              </Select>
              <FieldLabel>Guidance</FieldLabel>
              <Select
                value={improvementForm.guidanceItemId}
                onChange={(event) =>
                  setImprovementForm({
                    ...improvementForm,
                    guidanceItemId: event.target.value,
                  })
                }
              >
                <option value="">no guidance</option>
                {guidanceItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Agent context</FieldLabel>
                  <Select
                    value={improvementForm.agentContextId}
                    onChange={(event) =>
                      setImprovementForm({
                        ...improvementForm,
                        agentContextId: event.target.value,
                      })
                    }
                  >
                    <option value="">no context</option>
                    {agentContexts.map((context) => (
                      <option key={context.id} value={context.id}>
                        {context.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Class</FieldLabel>
                  <Select
                    value={improvementForm.changeClass}
                    onChange={(event) =>
                      setImprovementForm({
                        ...improvementForm,
                        changeClass: event.target.value as ImprovementChangeClass,
                      })
                    }
                  >
                    {improvementChangeClasses.map((changeClass) => (
                      <option key={changeClass} value={changeClass}>
                        {changeClass}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <FieldLabel>Validation plan</FieldLabel>
              <textarea
                value={improvementForm.validationPlan}
                onChange={(event) =>
                  setImprovementForm({
                    ...improvementForm,
                    validationPlan: event.target.value,
                  })
                }
                className="min-h-20 rounded-md border border-neutral-800 bg-transparent px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600"
              />
              <SubmitButton pending={createImprovementProposal.isPending} />
            </KernelForm>

            <KernelForm title="Work item" icon={GitPullRequest} onSubmit={handleCreateWorkItem}>
              <FieldLabel>Title</FieldLabel>
              <Input
                value={workItemForm.title}
                onChange={(event) =>
                  setWorkItemForm({ ...workItemForm, title: event.target.value })
                }
              />
              <FieldLabel>Source</FieldLabel>
              <Select
                value={workItemForm.sourceId}
                onChange={(event) =>
                  setWorkItemForm({ ...workItemForm, sourceId: event.target.value })
                }
              >
                <option value="">no source</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Priority</FieldLabel>
                  <Select
                    value={workItemForm.priorityId}
                    onChange={(event) =>
                      setWorkItemForm({
                        ...workItemForm,
                        priorityId: event.target.value,
                      })
                    }
                  >
                    <option value="">unlinked</option>
                    {priorities.map((priority) => (
                      <option key={priority.id} value={priority.id}>
                        {priority.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Goal</FieldLabel>
                  <Select
                    value={workItemForm.goalId}
                    onChange={(event) =>
                      setWorkItemForm({ ...workItemForm, goalId: event.target.value })
                    }
                  >
                    <option value="">unlinked</option>
                    {goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    value={workItemForm.status}
                    onChange={(event) =>
                      setWorkItemForm({
                        ...workItemForm,
                        status: event.target.value as WorkItemStatus,
                      })
                    }
                  >
                    {workStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Risk</FieldLabel>
                  <Select
                    value={workItemForm.riskClass}
                    onChange={(event) =>
                      setWorkItemForm({
                        ...workItemForm,
                        riskClass: event.target.value as RiskClass,
                      })
                    }
                  >
                    {riskClasses.map((risk) => (
                      <option key={risk} value={risk}>
                        {risk}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <FieldLabel>External URL</FieldLabel>
              <Input
                value={workItemForm.externalUrl}
                onChange={(event) =>
                  setWorkItemForm({
                    ...workItemForm,
                    externalUrl: event.target.value,
                  })
                }
              />
              <SubmitButton pending={createWorkItem.isPending} />
            </KernelForm>

            <KernelForm title="Workflow run" icon={Workflow} onSubmit={handleCreateRun}>
              <FieldLabel>Blueprint</FieldLabel>
              <Select
                value={runForm.blueprintId}
                onChange={(event) =>
                  setRunForm({ ...runForm, blueprintId: event.target.value })
                }
              >
                {blueprints.map((blueprint) => (
                  <option key={blueprint.id} value={blueprint.id}>
                    {blueprint.title}
                  </option>
                ))}
              </Select>
              <FieldLabel>Work item</FieldLabel>
              <Select
                value={runForm.workItemId}
                onChange={(event) =>
                  setRunForm({ ...runForm, workItemId: event.target.value })
                }
              >
                <option value="">no work item</option>
                {workItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </Select>
              <FieldLabel>Title</FieldLabel>
              <Input
                value={runForm.title}
                onChange={(event) =>
                  setRunForm({ ...runForm, title: event.target.value })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <FieldLabel>Owner</FieldLabel>
                  <Input
                    value={runForm.owner}
                    onChange={(event) =>
                      setRunForm({ ...runForm, owner: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Due</FieldLabel>
                  <Input
                    type="date"
                    value={runForm.dueAt}
                    onChange={(event) =>
                      setRunForm({ ...runForm, dueAt: event.target.value })
                    }
                  />
                </div>
              </div>
              <SubmitButton
                pending={createWorkflowRun.isPending}
                disabled={!runForm.blueprintId}
              />
            </KernelForm>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/30">
              <div className="border-b border-neutral-800/50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-neutral-500" />
                  <h2 className="text-sm font-semibold text-neutral-200">
                    Signals
                  </h2>
                </div>
              </div>
              <div className="divide-y divide-neutral-800/40">
                {signals.length === 0 ? (
                  <EmptyState label="No signals generated" />
                ) : (
                  signals.slice(0, 6).map((signal) => {
                    const artifact = artifacts.find(
                      (item) => item.id === signal.artifactId
                    );
                    const source = sources.find((item) => item.id === signal.sourceId);
                    return (
                      <div key={signal.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-200">
                              {signal.summary}
                            </p>
                            <p className="mt-1 text-xs text-neutral-600">
                              {source?.name ?? signal.source} ·{" "}
                              {artifact?.title ?? signal.entityId}
                            </p>
                          </div>
                          <StatusBadge value={signal.severity} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={extractSignalGuidance.isPending}
                            onClick={() => handleExtractSignalGuidance(signal.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Guidance
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/30">
              <div className="border-b border-neutral-800/50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-neutral-500" />
                  <h2 className="text-sm font-semibold text-neutral-200">
                    Alignment Findings
                  </h2>
                </div>
              </div>
              <div className="divide-y divide-neutral-800/40">
                {alignmentFindings.length === 0 ? (
                  <EmptyState label="No findings generated" />
                ) : (
                  alignmentFindings.slice(0, 6).map((finding) => {
                    const priority = priorities.find(
                      (item) => item.id === finding.priorityId
                    );
                    const workItem = workItems.find(
                      (item) => item.id === finding.workItemId
                    );
                    return (
                      <div key={finding.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-200">
                              {priority?.title ?? workItem?.title ?? "Unlinked evidence"}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs text-neutral-600">
                              {finding.rationale}
                            </p>
                          </div>
                          <StatusBadge value={finding.classification} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/30">
              <div className="border-b border-neutral-800/50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-neutral-500" />
                  <h2 className="text-sm font-semibold text-neutral-200">
                    Guidance Queue
                  </h2>
                </div>
              </div>
              <div className="divide-y divide-neutral-800/40">
                {guidanceItems.length === 0 ? (
                  <EmptyState label="No guidance generated" />
                ) : (
                  guidanceItems.slice(0, 6).map((item) => (
                    <div key={item.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-neutral-200">
                            {item.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-neutral-600">
                            {item.action}
                          </p>
                          {item.feedbackNote && (
                            <p className="mt-2 line-clamp-1 text-xs text-neutral-500">
                              {item.feedbackNote}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <StatusBadge value={item.status} />
                          <StatusBadge value={item.feedbackStatus} />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={updateGuidance.isPending}
                          onClick={() =>
                            updateGuidanceFeedback(item.id, "accepted", "accepted")
                          }
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={updateGuidance.isPending}
                          onClick={() =>
                            updateGuidanceFeedback(item.id, "done", "completed")
                          }
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Done
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={updateGuidance.isPending}
                          onClick={() =>
                            updateGuidanceFeedback(item.id, "ignored", "ignored")
                          }
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Ignore
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/30">
              <div className="border-b border-neutral-800/50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-neutral-500" />
                  <h2 className="text-sm font-semibold text-neutral-200">
                    Strategy Map
                  </h2>
                </div>
              </div>
              <div className="divide-y divide-neutral-800/40">
                {priorities.length === 0 ? (
                  <EmptyState label="No priorities registered" />
                ) : (
                  priorities.map((priority) => {
                    const priorityGoals = goals.filter(
                      (goal) => goal.priorityId === priority.id
                    );
                    const priorityWork = workItems.filter(
                      (item) => item.priorityId === priority.id
                    );
                    const priorityDecisions = decisions.filter((decision) =>
                      decision.priorityIds.includes(priority.id)
                    );
                    const priorityTradeoffs = strategyTradeoffs.filter(
                      (tradeoff) => tradeoff.priorityId === priority.id
                    );
                    return (
                      <div key={priority.id} className="px-5 py-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-medium text-neutral-200">
                                {priority.title}
                              </h3>
                              <StatusBadge value={priority.status} />
                              <Badge
                                variant="outline"
                                className="border-neutral-800 text-neutral-500"
                              >
                                {priority.area}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">
                              {priority.owner ?? "no owner"} ·{" "}
                              {priority.reviewCadence ?? "no cadence"}
                            </p>
                          </div>
                          <p className="text-xs text-neutral-600">
                            {priorityGoals.length} goal
                            {priorityGoals.length === 1 ? "" : "s"} ·{" "}
                            {priorityWork.length} work item
                            {priorityWork.length === 1 ? "" : "s"} ·{" "}
                            {priorityDecisions.length} decision
                            {priorityDecisions.length === 1 ? "" : "s"} ·{" "}
                            {priorityTradeoffs.length} tradeoff
                            {priorityTradeoffs.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {priorityGoals.map((goal) => (
                            <div
                              key={goal.id}
                              className="rounded-md border border-neutral-800/50 bg-neutral-950/30 p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm text-neutral-300">
                                  {goal.title}
                                </p>
                                <StatusBadge value={goal.slaStatus} />
                              </div>
                              <p className="mt-1 text-xs text-neutral-600">
                                due {goal.dueAt ? toDateInput(goal.dueAt) : "not set"} ·{" "}
                                {goal.reviewCadence ?? "no cadence"}
                              </p>
                            </div>
                          ))}
                          {priorityTradeoffs.map((tradeoff) => (
                            <div
                              key={tradeoff.id}
                              className="rounded-md border border-neutral-800/50 bg-neutral-950/30 p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm text-neutral-300">
                                  {tradeoff.title}
                                </p>
                                <StatusBadge value={tradeoff.status} />
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs text-neutral-600">
                                {tradeoff.acceptedOption ?? tradeoff.summary ?? tradeoff.kind}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/30">
              <div className="border-b border-neutral-800/50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400/80" />
                  <h2 className="text-sm font-semibold text-neutral-200">
                    Unlinked Work
                  </h2>
                </div>
              </div>
              <div className="divide-y divide-neutral-800/40">
                {unlinkedWorkItems.length === 0 ? (
                  <EmptyState label="No unlinked work items" />
                ) : (
                  unlinkedWorkItems.map((item) => (
                    <div key={item.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-neutral-200">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-neutral-600">
                            {item.externalProvider ?? "native"} ·{" "}
                            {item.externalId ?? item.id}
                          </p>
                        </div>
                        <StatusBadge value="unlinked" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-neutral-800/60 bg-neutral-900/30">
            <div className="border-b border-neutral-800/50 px-5 py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-neutral-500" />
                <h2 className="text-sm font-semibold text-neutral-200">
                  Strategy Tradeoffs
                </h2>
              </div>
            </div>
            <div className="divide-y divide-neutral-800/40">
              {strategyTradeoffs.length === 0 ? (
                <EmptyState label="No strategy tradeoffs registered" />
              ) : (
                strategyTradeoffs.slice(0, 8).map((tradeoff) => {
                  const priority = priorities.find(
                    (item) => item.id === tradeoff.priorityId
                  );
                  const decision = decisions.find(
                    (item) => item.id === tradeoff.decisionId
                  );
                  return (
                    <div key={tradeoff.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-neutral-200">
                            {tradeoff.title}
                          </p>
                          <p className="mt-1 text-xs text-neutral-600">
                            {tradeoff.kind} · {tradeoff.riskClass} ·{" "}
                            {priority?.title ?? "no priority"} ·{" "}
                            {decision?.title ?? "no decision"}
                          </p>
                          {tradeoff.rationale && (
                            <p className="mt-2 line-clamp-2 text-sm text-neutral-500">
                              {tradeoff.rationale}
                            </p>
                          )}
                        </div>
                        <StatusBadge value={tradeoff.status} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-lg border border-neutral-800/60 bg-neutral-900/30">
            <div className="border-b border-neutral-800/50 px-5 py-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-neutral-500" />
                <h2 className="text-sm font-semibold text-neutral-200">
                  Decisions
                </h2>
              </div>
            </div>
            <div className="divide-y divide-neutral-800/40">
              {decisions.length === 0 ? (
                <EmptyState label="No decisions registered" />
              ) : (
                decisions.slice(0, 8).map((decision) => (
                  <div key={decision.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-200">
                          {decision.title}
                        </p>
                        <p className="mt-1 text-xs text-neutral-600">
                          {decision.owner ?? "no owner"} · {decision.area} ·{" "}
                          {decision.priorityIds.length} priorities ·{" "}
                          {decision.sourceArtifactIds.length} artifacts
                        </p>
                        {decision.rationale && (
                          <p className="mt-2 line-clamp-2 text-sm text-neutral-500">
                            {decision.rationale}
                          </p>
                        )}
                      </div>
                      <StatusBadge value={decision.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={updateDecision.isPending}
                        onClick={() => updateDecisionStatus(decision.id, "accepted")}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={updateDecision.isPending}
                        onClick={() => updateDecisionStatus(decision.id, "rejected")}
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={updateDecision.isPending}
                        onClick={() => updateDecisionStatus(decision.id, "superseded")}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Supersede
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-lg border border-neutral-800/60 bg-neutral-900/30">
            <div className="border-b border-neutral-800/50 px-5 py-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-neutral-500" />
                <h2 className="text-sm font-semibold text-neutral-200">
                  Agent Contexts
                </h2>
              </div>
            </div>
            <div className="divide-y divide-neutral-800/40">
              {agentContexts.length === 0 ? (
                <EmptyState label="No agent contexts generated" />
              ) : (
                agentContexts.slice(0, 6).map((context) => (
                  <div key={context.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-200">
                          {context.title}
                        </p>
                        <p className="mt-1 text-xs text-neutral-600">
                          {context.targetAgent} · {context.contextType} ·{" "}
                          {context.sourceKnowledgeIds.length} sources
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-neutral-500">
                          {context.content}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge value={context.status} />
                        <StatusBadge value={context.validationStatus} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-lg border border-neutral-800/60 bg-neutral-900/30">
            <div className="border-b border-neutral-800/50 px-5 py-4">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-neutral-500" />
                <h2 className="text-sm font-semibold text-neutral-200">
                  Improvement Proposals
                </h2>
              </div>
            </div>
            <div className="divide-y divide-neutral-800/40">
              {improvementProposals.length === 0 ? (
                <EmptyState label="No improvement proposals registered" />
              ) : (
                improvementProposals.slice(0, 6).map((proposal) => (
                  <div key={proposal.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-200">
                          {proposal.title}
                        </p>
                        <p className="mt-1 text-xs text-neutral-600">
                          class {proposal.changeClass} ·{" "}
                          {proposal.signalIds.length} signals ·{" "}
                          {proposal.agentContextIds.length} contexts
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-neutral-500">
                          {proposal.hypothesis}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge value={proposal.status} />
                        <StatusBadge value={proposal.promotionStatus} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={updateImprovementProposal.isPending}
                        onClick={() =>
                          reviewImprovementProposal(
                            proposal.id,
                            "validated",
                            "candidate"
                          )
                        }
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Candidate
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={updateImprovementProposal.isPending}
                        onClick={() =>
                          reviewImprovementProposal(
                            proposal.id,
                            "rejected",
                            "rejected"
                          )
                        }
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/30">
              <div className="border-b border-neutral-800/50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-neutral-500" />
                  <h2 className="text-sm font-semibold text-neutral-200">
                    Evidence Inbox
                  </h2>
                </div>
              </div>
              <div className="divide-y divide-neutral-800/40">
                {artifacts.length === 0 ? (
                  <EmptyState label="No artifacts registered" />
                ) : (
                  artifacts.slice(0, 8).map((artifact) => {
                    const source = sources.find((item) => item.id === artifact.sourceId);
                    return (
                      <div key={artifact.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-200">
                              {artifact.title}
                            </p>
                            <p className="mt-1 text-xs text-neutral-600">
                              {source?.name ?? artifact.sourceId} ·{" "}
                              {formatTimeAgo(artifact.ingestedAt)}
                            </p>
                          </div>
                          <StatusBadge value={artifact.humanReviewStatus} />
                        </div>
                        {artifact.summary && (
                          <p className="mt-2 line-clamp-2 text-sm text-neutral-500">
                            {artifact.summary}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/30">
              <div className="border-b border-neutral-800/50 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-neutral-500" />
                  <h2 className="text-sm font-semibold text-neutral-200">
                    Workflow Runs
                  </h2>
                </div>
              </div>
              <div className="divide-y divide-neutral-800/40">
                {runs.length === 0 ? (
                  <EmptyState
                    label={
                      developmentBlueprint
                        ? "Development Blueprint v0 is ready"
                        : "No workflow blueprint registered"
                    }
                  />
                ) : (
                  runs.map((run) => {
                    const runSteps = stepsByRun.get(run.id) ?? [];
                    const current = runSteps.find(
                      (step) => step.stepKey === run.currentStep
                    );
                    return (
                      <div key={run.id} className="px-5 py-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-neutral-200">
                                {run.title}
                              </p>
                              <p className="mt-1 text-xs text-neutral-600">
                                {run.workflowArea} · current{" "}
                                {current?.title ?? run.currentStep ?? "not set"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <StatusBadge value={run.gateStatus} />
                              <StatusBadge value={run.slaStatus} />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {runSteps.slice(0, 13).map((step) => (
                              <span
                                key={step.id}
                                className="inline-flex h-2.5 w-8 rounded-full bg-neutral-800"
                                title={step.title}
                              >
                                <span
                                  className={
                                    step.status === "running"
                                      ? "h-2.5 w-full rounded-full bg-blue-500/70"
                                      : step.status === "completed"
                                        ? "h-2.5 w-full rounded-full bg-emerald-500/70"
                                        : "h-2.5 w-full rounded-full bg-neutral-700/60"
                                  }
                                />
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-neutral-800/60 bg-neutral-900/30">
            <div className="border-b border-neutral-800/50 px-5 py-4">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-neutral-500" />
                <h2 className="text-sm font-semibold text-neutral-200">
                  Operating Loops
                </h2>
              </div>
            </div>
            <div className="divide-y divide-neutral-800/40">
              {watchers.length === 0 ? (
                <EmptyState label="No watchers registered" />
              ) : (
                watchers.map((watcher) => {
                  const lastRun = watcherRuns.find(
                    (run) => run.watcherId === watcher.id
                  );
                  return (
                    <div key={watcher.id} className="px-5 py-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium text-neutral-200">
                              {watcher.title}
                            </p>
                            <StatusBadge value={watcher.status} />
                            <Badge
                              variant="outline"
                              className="border-neutral-800 text-neutral-500"
                            >
                              {watcher.triggerType}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="border-neutral-800 text-neutral-500"
                            >
                              {watcher.actionPolicy}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-neutral-600">
                            {watcher.scopeQuery ?? "no scope"} · risk{" "}
                            {watcher.riskClass}
                          </p>
                        </div>
                        <div className="text-left lg:text-right">
                          <p className="text-xs text-neutral-500">
                            last run{" "}
                            {watcher.lastRunAt
                              ? formatTimeAgo(watcher.lastRunAt)
                              : "never"}
                          </p>
                          <p className="mt-1 text-xs text-neutral-600">
                            {lastRun
                              ? `${lastRun.artifactsCreated.length} artifacts · ${lastRun.signalsCreated.length} signals · ${lastRun.alignmentFindingsCreated.length} findings · ${lastRun.guidanceCreated.length} guidance`
                              : "no outputs yet"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/30 px-3 py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-neutral-500" />
        <span className="text-xs text-neutral-500">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold text-neutral-200">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-neutral-800/60 px-2 py-1.5">
      <p className="text-xs font-medium text-neutral-300">{value}</p>
      <p className="truncate text-[11px] text-neutral-600">{label}</p>
    </div>
  );
}

function KernelForm({
  title,
  icon: Icon,
  onSubmit,
  children,
}: {
  title: string;
  icon: LucideIcon;
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border border-neutral-800/60 bg-neutral-900/30 p-4"
    >
      <div className="mb-1 flex items-center gap-2">
        <Icon className="h-4 w-4 text-neutral-500" />
        <h2 className="text-sm font-semibold text-neutral-200">{title}</h2>
      </div>
      {children}
    </form>
  );
}

function SubmitButton({
  pending,
  disabled = false,
}: {
  pending: boolean;
  disabled?: boolean;
}) {
  return (
    <Button type="submit" size="sm" disabled={pending || disabled}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      Register
    </Button>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-neutral-600">
      <CheckCircle2 className="h-4 w-4" />
      {label}
    </div>
  );
}
