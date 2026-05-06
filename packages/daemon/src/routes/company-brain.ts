import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type {
  AlignmentClassification,
  CompanyBrainArea,
  CompanyBrainAdoptionDashboard,
  CompanyBrainBriefingSection,
  CompanyBrainBriefingSnapshot,
  CompanyBrainReviewCohesion,
  CompanyBrainReviewQueueItem,
  CompanyBrainSourceHealthReport,
  CreateAgentContextRequest,
  CreateArtifactRequest,
  CreateAlignmentFindingRequest,
  CreateDecisionRequest,
  CreateGoalRequest,
  CreateGuidanceItemRequest,
  CreateImprovementProposalRequest,
  CreateMilestoneRequest,
  CreateSignalRequest,
  CreateSourceRequest,
  CreateStrategicPriorityRequest,
  CreateStrategyTradeoffRequest,
  CreateWatcherRequest,
  CreateWorkflowBlueprintRequest,
  CreateWorkflowRunRequest,
  CreateWorkItemRequest,
  ExtractArtifactInsightsRequest,
  ExtractSignalGuidanceRequest,
  GuidanceAudience,
  GenerateAgentContextRequest,
  ImportLocalDocsRequest,
  ImportSlackMessagesRequest,
  RunFelhenDemoRequest,
  SignalSource,
  SignalSeverity,
  RunWatcherRequest,
  SyncGitHubIssuesRequest,
  SyncGitHubNotificationsRequest,
  SyncGitHubPrCiRequest,
  SyncSlackChannelRequest,
  UpdateDecisionRequest,
  UpdateGuidanceItemRequest,
  UpdateImprovementProposalRequest,
  WorkflowBlueprintStage,
} from "@aios/shared";
import { getDb } from "../db/client.js";
import { config } from "../config.js";
import {
  cbAgentContexts,
  cbAlignmentFindings,
  cbArtifactLinks,
  cbArtifacts,
  cbDecisions,
  cbGoals,
  cbGuidanceItems,
  cbImprovementProposals,
  cbMilestones,
  cbSignals,
  cbSources,
  cbStrategicPriorities,
  cbStrategyTradeoffs,
  cbWatcherRuns,
  cbWatchers,
  cbWorkflowBlueprints,
  cbWorkflowRuns,
  cbWorkflowSteps,
  cbWorkItems,
} from "../db/schema.js";

const app = new Hono();

function now() {
  return Date.now();
}

function stableHash(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

const AIOS_BRIEFING_SOURCE_ID = "source-aios-briefing-v0";
const AIOS_BRIEFING_WATCHER_ID = "watcher-aios-briefing-v0";
const GITHUB_PR_CI_WATCHER_ID = "watcher-github-pr-ci-v0";
const GITHUB_NOTIFICATIONS_WATCHER_ID = "watcher-github-notifications-v0";

function allowedLocalDocRoots() {
  const envRoots = process.env.AIOS_LOCAL_DOC_IMPORT_ROOTS?.split(",") ?? [];
  return [
    ...envRoots,
    config.projectsDir,
    process.cwd(),
    resolve(process.cwd(), "../../.."),
  ]
    .map((root) => root.trim())
    .filter(Boolean)
    .map((root) => resolve(root));
}

function resolveImportPath(inputPath: string) {
  const absolutePath = resolve(inputPath);
  const allowedRoot = allowedLocalDocRoots().find((root) => {
    const rel = relative(root, absolutePath);
    return rel === "" || (!!rel && !rel.startsWith("..") && !rel.startsWith("/"));
  });
  if (!allowedRoot) {
    throw new Error(`path is outside allowed import roots: ${inputPath}`);
  }
  if (!existsSync(absolutePath)) {
    throw new Error(`path not found: ${inputPath}`);
  }
  const stat = statSync(absolutePath);
  if (!stat.isFile()) {
    throw new Error(`path is not a file: ${inputPath}`);
  }
  if (!/\.(md|mdx|txt)$/i.test(absolutePath)) {
    throw new Error(`unsupported file type: ${inputPath}`);
  }
  return { absolutePath, allowedRoot, stat };
}

function summarizeDoc(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join(" ")
    .replaceAll(/[#*_`]/g, "")
    .slice(0, 500);
}

function parseSlackTimestamp(ts: string | null | undefined) {
  if (!ts) return null;
  const [seconds, fraction = "0"] = ts.split(".");
  const secondsNumber = Number(seconds);
  if (!Number.isFinite(secondsNumber)) return null;
  const fractionMs = Number(fraction.padEnd(3, "0").slice(0, 3));
  return secondsNumber * 1000 + (Number.isFinite(fractionMs) ? fractionMs : 0);
}

function slackTimestampFromMs(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const millis = Math.max(0, Math.floor(ms % 1000));
  return `${seconds}.${String(millis).padStart(3, "0")}`;
}

function summarizeSlackText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 500);
}

function readEnvValueFromFile(path: string, key: string) {
  if (!existsSync(path)) return null;
  const line = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .find((item) => item.trim().startsWith(`${key}=`));
  if (!line) return null;
  const value = line.slice(line.indexOf("=") + 1).trim();
  return value.replace(/^["']|["']$/g, "") || null;
}

function getSecretEnv(key: string) {
  if (process.env[key]) return process.env[key];
  const candidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env.dev"),
    resolve(process.cwd(), ".env.prod"),
    resolve(process.cwd(), "../..", ".env.local"),
    resolve(process.cwd(), "../..", ".env.dev"),
    resolve(process.cwd(), "../..", ".env.prod"),
  ];
  for (const candidate of candidates) {
    const value = readEnvValueFromFile(candidate, key);
    if (value) return value;
  }
  return null;
}

interface SlackApiEnvelope {
  ok: boolean;
  error?: string;
  needed?: string;
  provided?: string;
}

interface SlackAuthTestResponse extends SlackApiEnvelope {
  team?: string;
  team_id?: string;
}

interface SlackConversation {
  id: string;
  name?: string;
  is_private?: boolean;
  is_member?: boolean;
}

interface SlackConversationsListResponse extends SlackApiEnvelope {
  channels?: SlackConversation[];
  response_metadata?: {
    next_cursor?: string;
  };
}

interface SlackConversationInfoResponse extends SlackApiEnvelope {
  channel?: SlackConversation;
}

interface SlackMessagePayload {
  type?: string;
  subtype?: string;
  text?: string;
  user?: string;
  username?: string;
  bot_id?: string;
  ts?: string;
  thread_ts?: string;
  reply_count?: number;
  latest_reply?: string;
}

interface SlackConversationHistoryResponse extends SlackApiEnvelope {
  messages?: SlackMessagePayload[];
}

interface SlackConversationRepliesResponse extends SlackApiEnvelope {
  messages?: SlackMessagePayload[];
}

interface SlackPermalinkResponse extends SlackApiEnvelope {
  permalink?: string;
}

async function slackApi<T extends SlackApiEnvelope>(
  token: string,
  method: string,
  params: Record<string, string | number | boolean | null | undefined> = {}
) {
  const url = new URL(`https://slack.com/api/${method}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "aios-runtime-company-brain",
    },
  });
  const payload = (await res.json().catch(() => ({
    ok: false,
    error: `invalid_json_status_${res.status}`,
  }))) as T;
  if (!res.ok || !payload.ok) {
    const details = payload.needed
      ? ` needed=${payload.needed} provided=${payload.provided ?? "unknown"}`
      : "";
    throw new Error(`Slack ${method} failed: ${payload.error ?? res.status}${details}`);
  }
  return payload;
}

function normalizeSlackChannelName(channelName: string) {
  return channelName.trim().replace(/^#/, "");
}

async function findSlackChannel(args: {
  token: string;
  channelId?: string | null;
  channelName?: string | null;
}) {
  if (args.channelId?.trim()) {
    const info = await slackApi<SlackConversationInfoResponse>(
      args.token,
      "conversations.info",
      { channel: args.channelId.trim() }
    );
    if (!info.channel) throw new Error("Slack conversations.info returned no channel");
    return info.channel;
  }

  const wantedName = args.channelName
    ? normalizeSlackChannelName(args.channelName)
    : null;
  if (!wantedName) {
    throw new Error("channelId or channelName is required");
  }

  let cursor = "";
  for (let page = 0; page < 20; page += 1) {
    const list = await slackApi<SlackConversationsListResponse>(
      args.token,
      "conversations.list",
      {
        types: "public_channel,private_channel",
        exclude_archived: true,
        limit: 200,
        cursor,
      }
    );
    const match = list.channels?.find((channel) => channel.name === wantedName);
    if (match) return match;
    cursor = list.response_metadata?.next_cursor ?? "";
    if (!cursor) break;
  }

  throw new Error(`Slack channel not found or not visible to bot: ${wantedName}`);
}

async function fetchSlackPermalink(token: string, channelId: string, ts: string) {
  try {
    const result = await slackApi<SlackPermalinkResponse>(
      token,
      "chat.getPermalink",
      { channel: channelId, message_ts: ts }
    );
    return result.permalink ?? null;
  } catch {
    return null;
  }
}

interface GitHubIssuePayload {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  html_url: string;
  url: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  labels: Array<{ name: string }>;
  user: { login: string } | null;
  pull_request?: unknown;
}

interface GitHubPullRequestPayload {
  id: number;
  number: number;
  state: "open" | "closed";
  title: string;
  body: string | null;
  html_url: string;
  url: string;
  draft?: boolean;
  merged_at: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: { login: string } | null;
  head: {
    sha: string;
    ref: string;
    repo: { full_name: string } | null;
  };
  base: {
    ref: string;
    repo: { full_name: string } | null;
  };
}

interface GitHubCommitStatusPayload {
  state: "error" | "failure" | "pending" | "success";
  statuses: Array<{
    id: number;
    context: string;
    state: string;
    target_url: string | null;
    description: string | null;
    updated_at: string;
  }>;
}

interface GitHubCheckRunPayload {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string | null;
  details_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  output?: {
    title?: string | null;
    summary?: string | null;
  };
}

interface GitHubCheckRunsPayload {
  total_count: number;
  check_runs: GitHubCheckRunPayload[];
}

interface GitHubNotificationPayload {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  last_read_at: string | null;
  url: string;
  subject: {
    title: string;
    url: string | null;
    latest_comment_url: string | null;
    type: string;
  };
  repository: {
    full_name: string;
    html_url: string;
  };
}

function parseGitHubRepo(repo: string) {
  const normalized = repo
    .trim()
    .replace(/^https:\/\/github.com\//, "")
    .replace(/\/issues\/?$/, "")
    .replace(/\.git$/, "");
  const [owner, name] = normalized.split("/");
  if (!owner || !name) {
    throw new Error("repo must be owner/name or a github.com repository URL");
  }
  return { owner, name, fullName: `${owner}/${name}` };
}

async function githubApi<T>(path: string, params: Record<string, string> = {}) {
  const token = getSecretEnv("GITHUB_TOKEN") ?? getSecretEnv("GH_TOKEN");
  const url = new URL(`https://api.github.com${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "aios-runtime-company-brain",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub API failed ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

async function fetchGitHubIssues(repo: string, state: string, limit: number) {
  const parsed = parseGitHubRepo(repo);
  const issues = await githubApi<GitHubIssuePayload[]>(
    `/repos/${parsed.owner}/${parsed.name}/issues`,
    {
      state,
      per_page: String(Math.max(1, Math.min(limit, 100))),
    }
  );
  return {
    repo: parsed,
    issues: issues.filter((issue) => !issue.pull_request),
  };
}

async function fetchGitHubPullRequestsWithCi(repo: string, state: string, limit: number) {
  const parsed = parseGitHubRepo(repo);
  const pulls = await githubApi<GitHubPullRequestPayload[]>(
    `/repos/${parsed.owner}/${parsed.name}/pulls`,
    {
      state,
      per_page: String(Math.max(1, Math.min(limit, 100))),
    }
  );
  const enriched = [];
  for (const pull of pulls) {
    const [combinedStatus, checkRuns] = await Promise.all([
      githubApi<GitHubCommitStatusPayload>(
        `/repos/${parsed.owner}/${parsed.name}/commits/${pull.head.sha}/status`
      ).catch(() => null),
      githubApi<GitHubCheckRunsPayload>(
        `/repos/${parsed.owner}/${parsed.name}/commits/${pull.head.sha}/check-runs`,
        { per_page: "100" }
      ).catch(() => null),
    ]);
    enriched.push({
      pull,
      combinedStatus,
      checkRuns: checkRuns?.check_runs ?? [],
    });
  }
  return { repo: parsed, pulls: enriched };
}

async function fetchGitHubNotifications(args: {
  all: boolean;
  participating: boolean;
  limit: number;
}) {
  const notifications = await githubApi<GitHubNotificationPayload[]>(
    "/notifications",
    {
      all: String(args.all),
      participating: String(args.participating),
      per_page: String(Math.max(1, Math.min(args.limit, 100))),
    }
  );
  return notifications;
}

function requireText(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function severityFromRisk(riskClass: string): SignalSeverity {
  if (riskClass === "C") return "critical";
  if (riskClass === "B") return "warn";
  return "info";
}

function signalSourceFromArtifact(artifactType: string) {
  if (artifactType.includes("slack") || artifactType.includes("meeting")) {
    return "transcript" as const;
  }
  if (artifactType.includes("github") || artifactType.includes("issue")) {
    return "support" as const;
  }
  if (artifactType.includes("error") || artifactType.includes("incident")) {
    return "error" as const;
  }
  return "qa" as const;
}

function candidateText(title: string, summary: string | null | undefined) {
  return summarizeSlackText(`${title}. ${summary ?? ""}`).slice(0, 500);
}

function classifyAlignment(args: {
  priorityId: string | null;
  goalId: string | null;
  hasWorkItem: boolean;
}): {
  classification: AlignmentClassification;
  rationale: string;
  suggestedAction: string;
  confidence: number;
} {
  if (args.priorityId && args.goalId) {
    return {
      classification: "aligned",
      rationale:
        "Signal evidence is linked to a WorkItem with explicit priority and goal.",
      suggestedAction:
        "Continue execution through the linked workflow and keep attaching evidence to the goal.",
      confidence: 0.9,
    };
  }
  if (args.priorityId || args.goalId) {
    return {
      classification: "weak",
      rationale:
        "Signal evidence has a partial strategy link, but priority and goal are not both present.",
      suggestedAction:
        "Complete the missing priority or goal link before the work advances past triage.",
      confidence: 0.72,
    };
  }
  return {
    classification: "unknown",
    rationale: args.hasWorkItem
      ? "WorkItem exists but is not linked to a priority or goal."
      : "Evidence exists but no WorkItem, priority or goal link is present.",
    suggestedAction:
      "Triage this signal and link it to a priority/goal or explicitly keep it unlinked.",
    confidence: 0.64,
  };
}

function defaultGuidanceAudience(
  classification: AlignmentClassification
): GuidanceAudience {
  return classification === "aligned" ? "agent" : "human";
}

function bullet(title: string, body: string | null | undefined) {
  return `- ${title}${body ? `: ${body}` : ""}`;
}

function buildAgentContextContent(args: {
  title: string;
  targetAgent: string;
  contextType: string;
  priorities: Array<{ title: string; status: string; successCriteria: string | null }>;
  goals: Array<{ title: string; status: string; dueAt: number | null; reviewCadence: string | null }>;
  decisions: Array<{ title: string; status: string; rationale: string | null }>;
  guidanceItems: Array<{ title: string; action: string; status: string; feedbackStatus: string }>;
  workItems: Array<{ title: string; status: string; externalUrl: string | null }>;
  artifacts: Array<{ title: string; rawRef: string; summary: string | null }>;
}) {
  const lines = [
    `# ${args.title}`,
    "",
    `Target agent: ${args.targetAgent}`,
    `Context type: ${args.contextType}`,
    "",
    "## Operating Constraints",
    "- Use the linked Company Brain records as source of truth.",
    "- Do not perform external writeback unless a policy/gate explicitly allows it.",
    "- Preserve provenance in any generated output.",
  ];

  if (args.priorities.length) {
    lines.push("", "## Priorities");
    for (const priority of args.priorities) {
      lines.push(
        bullet(
          `${priority.title} (${priority.status})`,
          priority.successCriteria
        )
      );
    }
  }
  if (args.goals.length) {
    lines.push("", "## Goals");
    for (const goal of args.goals) {
      const due = goal.dueAt ? new Date(goal.dueAt).toISOString().slice(0, 10) : "no due date";
      lines.push(
        bullet(
          `${goal.title} (${goal.status})`,
          `due ${due}; cadence ${goal.reviewCadence ?? "not set"}`
        )
      );
    }
  }
  if (args.decisions.length) {
    lines.push("", "## Decisions");
    for (const decision of args.decisions) {
      lines.push(bullet(`${decision.title} (${decision.status})`, decision.rationale));
    }
  }
  if (args.guidanceItems.length) {
    lines.push("", "## Guidance");
    for (const item of args.guidanceItems) {
      lines.push(
        bullet(
          `${item.title} (${item.status}/${item.feedbackStatus})`,
          item.action
        )
      );
    }
  }
  if (args.workItems.length) {
    lines.push("", "## Work Items");
    for (const item of args.workItems) {
      lines.push(bullet(`${item.title} (${item.status})`, item.externalUrl));
    }
  }
  if (args.artifacts.length) {
    lines.push("", "## Source Evidence");
    for (const artifact of args.artifacts) {
      lines.push(bullet(`${artifact.title} [${artifact.rawRef}]`, artifact.summary));
    }
  }

  return `${lines.join("\n")}\n`;
}

function listAll() {
  const db = getDb();
  const sources = db.select().from(cbSources).orderBy(desc(cbSources.updatedAt)).all();
  const artifacts = db
    .select()
    .from(cbArtifacts)
    .orderBy(desc(cbArtifacts.ingestedAt))
    .limit(100)
    .all();
  const priorities = db
    .select()
    .from(cbStrategicPriorities)
    .orderBy(desc(cbStrategicPriorities.updatedAt))
    .all();
  const goals = db.select().from(cbGoals).orderBy(desc(cbGoals.updatedAt)).all();
  const milestones = db
    .select()
    .from(cbMilestones)
    .orderBy(desc(cbMilestones.updatedAt))
    .all();
  const decisions = db
    .select()
    .from(cbDecisions)
    .orderBy(desc(cbDecisions.updatedAt))
    .limit(100)
    .all();
  const strategyTradeoffs = db
    .select()
    .from(cbStrategyTradeoffs)
    .orderBy(desc(cbStrategyTradeoffs.updatedAt))
    .limit(100)
    .all();
  const workItems = db
    .select()
    .from(cbWorkItems)
    .orderBy(desc(cbWorkItems.updatedAt))
    .limit(100)
    .all();
  const workflowBlueprints = db
    .select()
    .from(cbWorkflowBlueprints)
    .orderBy(desc(cbWorkflowBlueprints.updatedAt))
    .all();
  const workflowRuns = db
    .select()
    .from(cbWorkflowRuns)
    .orderBy(desc(cbWorkflowRuns.updatedAt))
    .limit(100)
    .all();
  const workflowSteps = db
    .select()
    .from(cbWorkflowSteps)
    .orderBy(desc(cbWorkflowSteps.position))
    .limit(300)
    .all();
  const artifactLinks = db
    .select()
    .from(cbArtifactLinks)
    .orderBy(desc(cbArtifactLinks.createdAt))
    .limit(200)
    .all();
  const watchers = db.select().from(cbWatchers).orderBy(desc(cbWatchers.updatedAt)).all();
  const watcherRuns = db
    .select()
    .from(cbWatcherRuns)
    .orderBy(desc(cbWatcherRuns.startedAt))
    .limit(100)
    .all();
  const signals = db
    .select()
    .from(cbSignals)
    .orderBy(desc(cbSignals.timestamp))
    .limit(100)
    .all();
  const alignmentFindings = db
    .select()
    .from(cbAlignmentFindings)
    .orderBy(desc(cbAlignmentFindings.updatedAt))
    .limit(100)
    .all();
  const guidanceItems = db
    .select()
    .from(cbGuidanceItems)
    .orderBy(desc(cbGuidanceItems.updatedAt))
    .limit(100)
    .all();
  const agentContexts = db
    .select()
    .from(cbAgentContexts)
    .orderBy(desc(cbAgentContexts.updatedAt))
    .limit(100)
    .all();
  const improvementProposals = db
    .select()
    .from(cbImprovementProposals)
    .orderBy(desc(cbImprovementProposals.updatedAt))
    .limit(100)
    .all();

  return {
    sources,
    artifacts,
    priorities,
    goals,
    milestones,
    decisions,
    strategyTradeoffs,
    workItems,
    workflowBlueprints,
    workflowRuns,
    workflowSteps,
    artifactLinks,
    watchers,
    watcherRuns,
    signals,
    alignmentFindings,
    guidanceItems,
    agentContexts,
    improvementProposals,
  };
}

function latestTimestamp(values: Array<number | null | undefined>) {
  const valid = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );
  if (!valid.length) return null;
  return Math.max(...valid);
}

function buildAdoptionDashboard(
  data: ReturnType<typeof listAll>
): CompanyBrainAdoptionDashboard {
  type AdoptionGap = CompanyBrainAdoptionDashboard["gaps"][number];
  type AdoptionGapKind = AdoptionGap["kind"];
  type AdoptionProject = CompanyBrainAdoptionDashboard["projects"][number];

  const generatedAt = now();
  const staleAfterMs = 7 * 24 * 60 * 60 * 1000;
  const gaps: AdoptionGap[] = [];
  const workItemById = new Map(data.workItems.map((item) => [item.id, item]));

  const addGap = (gap: AdoptionGap) => {
    if (!gaps.some((item) => item.id === gap.id)) gaps.push(gap);
  };

  const projects: AdoptionProject[] = data.sources.map((source) => {
    const artifacts = data.artifacts.filter((artifact) => artifact.sourceId === source.id);
    const artifactIds = new Set(artifacts.map((artifact) => artifact.id));
    const workItems = data.workItems.filter(
      (item) =>
        item.sourceId === source.id ||
        (item.artifactId ? artifactIds.has(item.artifactId) : false)
    );
    const workItemIds = new Set(workItems.map((item) => item.id));
    const workflowRuns = data.workflowRuns.filter(
      (run) => run.workItemId !== null && workItemIds.has(run.workItemId)
    );
    const workflowRunIds = new Set(workflowRuns.map((run) => run.id));
    const signals = data.signals.filter(
      (signal) =>
        signal.sourceId === source.id ||
        (signal.artifactId ? artifactIds.has(signal.artifactId) : false) ||
        (signal.workItemId ? workItemIds.has(signal.workItemId) : false) ||
        (signal.workflowRunId ? workflowRunIds.has(signal.workflowRunId) : false)
    );
    const signalIds = new Set(signals.map((signal) => signal.id));
    const findings = data.alignmentFindings.filter(
      (finding) =>
        finding.signalIds.some((id) => signalIds.has(id)) ||
        finding.artifactIds.some((id) => artifactIds.has(id)) ||
        (finding.workItemId ? workItemIds.has(finding.workItemId) : false) ||
        (finding.workflowRunId ? workflowRunIds.has(finding.workflowRunId) : false)
    );
    const findingIds = new Set(findings.map((finding) => finding.id));
    const guidance = data.guidanceItems.filter(
      (item) =>
        (item.signalId ? signalIds.has(item.signalId) : false) ||
        (item.findingId ? findingIds.has(item.findingId) : false) ||
        (item.workItemId ? workItemIds.has(item.workItemId) : false) ||
        (item.workflowRunId ? workflowRunIds.has(item.workflowRunId) : false)
    );
    const guidanceIds = new Set(guidance.map((item) => item.id));
    const proposals = data.improvementProposals.filter(
      (proposal) =>
        proposal.sourceArtifactIds.some((id) => artifactIds.has(id)) ||
        proposal.workItemIds.some((id) => workItemIds.has(id)) ||
        proposal.signalIds.some((id) => signalIds.has(id)) ||
        proposal.alignmentFindingIds.some((id) => findingIds.has(id)) ||
        proposal.guidanceItemIds.some((id) => guidanceIds.has(id))
    );
    const openGuidance = guidance.filter((item) => ["new", "open"].includes(item.status));
    const activeWorkflowRuns = workflowRuns.filter((run) =>
      ["planned", "running", "blocked", "needs_human"].includes(run.status)
    );
    const gateBlocked = workflowRuns.filter((run) =>
      ["pending", "blocked", "failed"].includes(run.gateStatus)
    );
    const slaAtRisk = workflowRuns.filter((run) =>
      ["at_risk", "breached"].includes(run.slaStatus)
    );
    const unlinkedWorkItems = workItems.filter((item) => !item.priorityId && !item.goalId);
    const sourceIsStale =
      !source.lastSyncAt || generatedAt - source.lastSyncAt > staleAfterMs;
    const sourceHasHealthIssue = source.healthStatus !== "healthy" || sourceIsStale;
    const gapKinds = new Set<AdoptionGapKind>();

    if (sourceHasHealthIssue) {
      gapKinds.add("source_unhealthy");
      addGap({
        id: `source_unhealthy:${source.id}`,
        kind: "source_unhealthy",
        title: `${source.name} source health needs review`,
        severity: source.healthStatus === "error" ? "critical" : "warn",
        area: source.area,
        sourceId: source.id,
        targetType: "source",
        targetId: source.id,
        rationale:
          source.syncError ??
          (source.lastSyncAt ? "Source freshness window exceeded." : "Source never synced."),
      });
    }

    if (!artifacts.length) {
      gapKinds.add("source_without_artifacts");
      addGap({
        id: `source_without_artifacts:${source.id}`,
        kind: "source_without_artifacts",
        title: `${source.name} has no artifacts`,
        severity: "warn",
        area: source.area,
        sourceId: source.id,
        targetType: "source",
        targetId: source.id,
        rationale: "Closed loop adoption needs evidence artifacts for this source.",
      });
    }

    if (workItems.length && !workflowRuns.length) {
      gapKinds.add("missing_workflow");
      addGap({
        id: `missing_workflow:${source.id}`,
        kind: "missing_workflow",
        title: `${source.name} has work without workflow runs`,
        severity: "warn",
        area: source.area,
        sourceId: source.id,
        targetType: "source",
        targetId: source.id,
        rationale: "Closed loop adoption needs workflow runs for linked work.",
      });
    }
    if (workflowRuns.length && !signals.length) {
      gapKinds.add("missing_signal");
      addGap({
        id: `missing_signal:${source.id}`,
        kind: "missing_signal",
        title: `${source.name} has workflows without signals`,
        severity: "warn",
        area: source.area,
        sourceId: source.id,
        targetType: "source",
        targetId: source.id,
        rationale: "Closed loop adoption needs signals from workflow evidence.",
      });
    }
    if (unlinkedWorkItems.length) gapKinds.add("unlinked_work_item");
    if (gateBlocked.length) gapKinds.add("pending_gate");
    if (slaAtRisk.length) gapKinds.add("sla_risk");
    if (openGuidance.length) gapKinds.add("open_guidance");

    let stage: AdoptionProject["stage"] = "source_registered";
    if (artifacts.length) stage = "evidence_only";
    if (workItems.length) stage = "work_linked";
    if (workflowRuns.length) stage = activeWorkflowRuns.length ? "workflow_running" : "workflow_tracked";
    if (signals.length || guidance.length) stage = "closed_loop";
    if (proposals.length) stage = "improving";

    return {
      id: source.id,
      title: source.name,
      area: source.area,
      owner: source.owner,
      sourceType: source.sourceType,
      healthStatus: source.healthStatus,
      stage,
      lastActivityAt: latestTimestamp([
        source.lastSyncAt,
        source.updatedAt,
        ...artifacts.map((artifact) => artifact.ingestedAt),
        ...workItems.map((item) => item.updatedAt),
        ...workflowRuns.map((run) => run.updatedAt),
        ...signals.map((signal) => signal.timestamp),
        ...guidance.map((item) => item.updatedAt),
        ...proposals.map((proposal) => proposal.updatedAt),
      ]),
      sourceIds: [source.id],
      metrics: {
        artifactCount: artifacts.length,
        workItemCount: workItems.length,
        unlinkedWorkItemCount: unlinkedWorkItems.length,
        workflowRunCount: workflowRuns.length,
        activeWorkflowRunCount: activeWorkflowRuns.length,
        signalCount: signals.length,
        openGuidanceCount: openGuidance.length,
        improvementProposalCount: proposals.length,
        gateBlockedCount: gateBlocked.length,
        slaAtRiskCount: slaAtRisk.length,
      },
      gapKinds: [...gapKinds],
    };
  });

  for (const item of data.workItems) {
    if (!item.priorityId && !item.goalId) {
      addGap({
        id: `unlinked_work_item:${item.id}`,
        kind: "unlinked_work_item",
        title: item.title,
        severity: "warn",
        area: item.area,
        sourceId: item.sourceId,
        targetType: "work_item",
        targetId: item.id,
        rationale: "Work item has no priority or goal link.",
      });
    }
  }

  for (const run of data.workflowRuns) {
    if (["pending", "blocked", "failed"].includes(run.gateStatus)) {
      const workItem = run.workItemId ? workItemById.get(run.workItemId) : undefined;
      addGap({
        id: `pending_gate:${run.id}`,
        kind: "pending_gate",
        title: run.title,
        severity: run.gateStatus === "failed" || run.gateStatus === "blocked" ? "critical" : "warn",
        area: run.workflowArea,
        sourceId: workItem?.sourceId ?? null,
        targetType: "workflow_run",
        targetId: run.id,
        rationale: `Workflow gate is ${run.gateStatus}.`,
      });
    }
    if (["at_risk", "breached"].includes(run.slaStatus)) {
      const workItem = run.workItemId ? workItemById.get(run.workItemId) : undefined;
      addGap({
        id: `sla_risk:workflow_run:${run.id}`,
        kind: "sla_risk",
        title: run.title,
        severity: run.slaStatus === "breached" ? "critical" : "warn",
        area: run.workflowArea,
        sourceId: workItem?.sourceId ?? null,
        targetType: "workflow_run",
        targetId: run.id,
        rationale: `Workflow SLA is ${run.slaStatus}.`,
      });
    }
  }

  for (const goal of data.goals) {
    if (["at_risk", "breached"].includes(goal.slaStatus)) {
      addGap({
        id: `sla_risk:goal:${goal.id}`,
        kind: "sla_risk",
        title: goal.title,
        severity: goal.slaStatus === "breached" ? "critical" : "warn",
        area: goal.area,
        sourceId: null,
        targetType: "goal",
        targetId: goal.id,
        rationale: `Goal SLA is ${goal.slaStatus}.`,
      });
    }
  }

  for (const item of data.guidanceItems) {
    if (["new", "open"].includes(item.status)) {
      addGap({
        id: `open_guidance:${item.id}`,
        kind: "open_guidance",
        title: item.title,
        severity: item.severity,
        area: item.area,
        sourceId: null,
        targetType: "guidance_item",
        targetId: item.id,
        rationale: "Guidance is still open and needs feedback or completion.",
      });
    }
  }

  projects.sort((a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0));

  return {
    generatedAt,
    projects,
    gaps,
    stats: {
      projectCount: projects.length,
      closedLoopProjectCount: projects.filter((project) =>
        ["closed_loop", "improving"].includes(project.stage)
      ).length,
      improvingProjectCount: projects.filter((project) => project.stage === "improving")
        .length,
      sourceHealthIssueCount: gaps.filter((gap) => gap.kind === "source_unhealthy")
        .length,
      unlinkedWorkItemCount: gaps.filter((gap) => gap.kind === "unlinked_work_item")
        .length,
      pendingGateCount: gaps.filter((gap) => gap.kind === "pending_gate").length,
      slaRiskCount: gaps.filter((gap) => gap.kind === "sla_risk").length,
      openGuidanceCount: gaps.filter((gap) => gap.kind === "open_guidance").length,
    },
  };
}

function buildSourceHealthReport(
  data: ReturnType<typeof listAll>
): CompanyBrainSourceHealthReport {
  type SourceHealthIssueKind =
    CompanyBrainSourceHealthReport["sources"][number]["issueKinds"][number];
  type SourceFreshnessStatus =
    CompanyBrainSourceHealthReport["sources"][number]["freshnessStatus"];

  const generatedAt = now();
  const staleAfterMs = 7 * 24 * 60 * 60 * 1000;

  const sources = data.sources.map((source) => {
    const artifacts = data.artifacts.filter((artifact) => artifact.sourceId === source.id);
    const artifactIds = new Set(artifacts.map((artifact) => artifact.id));
    const workItems = data.workItems.filter(
      (item) =>
        item.sourceId === source.id ||
        (item.artifactId ? artifactIds.has(item.artifactId) : false)
    );
    const workItemIds = new Set(workItems.map((item) => item.id));
    const workflowRuns = data.workflowRuns.filter(
      (run) => run.workItemId !== null && workItemIds.has(run.workItemId)
    );
    const workflowRunIds = new Set(workflowRuns.map((run) => run.id));
    const watchers = data.watchers.filter((watcher) =>
      watcher.sourceIds.includes(source.id)
    );
    const watcherIds = new Set(watchers.map((watcher) => watcher.id));
    const watcherRuns = data.watcherRuns.filter((run) =>
      watcherIds.has(run.watcherId)
    );
    const signals = data.signals.filter(
      (signal) =>
        signal.sourceId === source.id ||
        (signal.artifactId ? artifactIds.has(signal.artifactId) : false) ||
        (signal.workItemId ? workItemIds.has(signal.workItemId) : false) ||
        (signal.workflowRunId ? workflowRunIds.has(signal.workflowRunId) : false) ||
        (signal.watcherId ? watcherIds.has(signal.watcherId) : false)
    );
    const signalIds = new Set(signals.map((signal) => signal.id));
    const guidance = data.guidanceItems.filter(
      (item) =>
        (item.signalId ? signalIds.has(item.signalId) : false) ||
        (item.workItemId ? workItemIds.has(item.workItemId) : false) ||
        (item.workflowRunId ? workflowRunIds.has(item.workflowRunId) : false)
    );
    const openGuidance = guidance.filter((item) => ["new", "open"].includes(item.status));
    const issueKinds = new Set<SourceHealthIssueKind>();

    let freshnessStatus: SourceFreshnessStatus = "fresh";
    if (source.syncError || source.healthStatus === "error") {
      freshnessStatus = "error";
      issueKinds.add("sync_error");
    } else if (!source.lastSyncAt) {
      freshnessStatus = "never_synced";
      issueKinds.add("never_synced");
    } else if (generatedAt - source.lastSyncAt > staleAfterMs) {
      freshnessStatus = "stale";
      issueKinds.add("stale");
    } else if (source.healthStatus === "unknown") {
      freshnessStatus = "unknown";
      issueKinds.add("unknown_health");
    }

    if (!artifacts.length) issueKinds.add("no_artifacts");
    if (!workItems.length) issueKinds.add("no_work_items");
    if (!signals.length) issueKinds.add("no_signals");

    return {
      sourceId: source.id,
      title: source.name,
      sourceType: source.sourceType,
      area: source.area,
      owner: source.owner,
      externalRef: source.externalRef,
      healthStatus: source.healthStatus,
      freshnessStatus,
      lastSyncAt: source.lastSyncAt,
      lastArtifactAt: latestTimestamp(artifacts.map((artifact) => artifact.ingestedAt)),
      lastSignalAt: latestTimestamp(signals.map((signal) => signal.timestamp)),
      lastWatcherRunAt: latestTimestamp(
        watcherRuns.map((run) => run.finishedAt ?? run.startedAt)
      ),
      lastActivityAt: latestTimestamp([
        source.lastSyncAt,
        source.updatedAt,
        ...artifacts.map((artifact) => artifact.ingestedAt),
        ...workItems.map((item) => item.updatedAt),
        ...workflowRuns.map((run) => run.updatedAt),
        ...signals.map((signal) => signal.timestamp),
        ...watcherRuns.map((run) => run.finishedAt ?? run.startedAt),
      ]),
      syncError: source.syncError,
      artifactCount: artifacts.length,
      workItemCount: workItems.length,
      workflowRunCount: workflowRuns.length,
      signalCount: signals.length,
      watcherCount: watchers.length,
      watcherRunCount: watcherRuns.length,
      openGuidanceCount: openGuidance.length,
      issueKinds: [...issueKinds],
    };
  });

  sources.sort((a, b) => {
    const issueDelta = b.issueKinds.length - a.issueKinds.length;
    if (issueDelta !== 0) return issueDelta;
    return (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0);
  });

  return {
    generatedAt,
    staleAfterMs,
    sources,
    stats: {
      sourceCount: sources.length,
      healthyCount: sources.filter(
        (source) => source.healthStatus === "healthy" && source.freshnessStatus === "fresh"
      ).length,
      staleCount: sources.filter((source) => source.freshnessStatus === "stale").length,
      errorCount: sources.filter((source) => source.freshnessStatus === "error").length,
      unknownCount: sources.filter((source) => source.freshnessStatus === "unknown").length,
      neverSyncedCount: sources.filter((source) => source.freshnessStatus === "never_synced")
        .length,
      sourceWithoutArtifactsCount: sources.filter((source) =>
        source.issueKinds.includes("no_artifacts")
      ).length,
      sourceWithoutWorkItemsCount: sources.filter((source) =>
        source.issueKinds.includes("no_work_items")
      ).length,
      sourceWithoutSignalsCount: sources.filter((source) =>
        source.issueKinds.includes("no_signals")
      ).length,
    },
  };
}

const briefingSectionKeys: CompanyBrainBriefingSection["key"][] = [
  "decisions",
  "tradeoffs",
  "open_guidance",
  "findings",
  "source_health",
  "adoption_dashboard",
  "unlinked_work",
  "gates_sla",
  "next_steps",
];

function isBriefingSectionKey(
  key: unknown
): key is CompanyBrainBriefingSection["key"] {
  return (
    typeof key === "string" &&
    briefingSectionKeys.includes(key as CompanyBrainBriefingSection["key"])
  );
}

function isActionPolicy(value: unknown): value is CompanyBrainBriefingSnapshot["actionPolicy"] {
  return (
    value === "observe_only" ||
    value === "create_artifacts" ||
    value === "create_work_items" ||
    value === "request_human" ||
    value === "writeback_allowed"
  );
}

function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  );
}

function limitOrNone(values: string[], limit = 6) {
  const limited = uniqueStrings(values).slice(0, limit);
  return limited.length ? limited : ["None currently detected."];
}

function textSnippet(value: string | null | undefined, maxLength = 120) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function formatEntityLine(args: {
  prefix?: string;
  title: string;
  status?: string | null;
  detail?: string | null;
}) {
  const title = args.prefix ? `${args.prefix}: ${args.title}` : args.title;
  const status = args.status ? ` [${args.status}]` : "";
  const detail = args.detail ? ` - ${args.detail}` : "";
  return `${title}${status}${detail}`;
}

function stringArrayFromMetadata(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function briefingSectionsFromMetadata(value: unknown): CompanyBrainBriefingSection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((section): CompanyBrainBriefingSection[] => {
    if (!section || typeof section !== "object") return [];
    const candidate = section as {
      key?: unknown;
      title?: unknown;
      items?: unknown;
    };
    if (!isBriefingSectionKey(candidate.key)) return [];
    const title = typeof candidate.title === "string" ? candidate.title : candidate.key;
    const items = stringArrayFromMetadata(candidate.items);
    return [{ key: candidate.key, title, items }];
  });
}

function buildLastBriefing(
  data: ReturnType<typeof listAll>
): CompanyBrainBriefingSnapshot | null {
  const artifact = data.artifacts
    .filter((item) => item.artifactType === "aios_briefing")
    .sort((a, b) => b.ingestedAt - a.ingestedAt)[0];
  if (!artifact) return null;

  const metadata = artifact.metadata ?? {};
  const watcherId = typeof metadata.watcherId === "string" ? metadata.watcherId : null;
  const watcherRunId =
    typeof metadata.watcherRunId === "string" ? metadata.watcherRunId : null;
  const actionPolicy = isActionPolicy(metadata.actionPolicy)
    ? metadata.actionPolicy
    : "observe_only";

  return {
    artifactId: artifact.id,
    watcherId,
    watcherRunId,
    generatedAt: artifact.ingestedAt,
    title: artifact.title,
    summary: artifact.summary,
    rawRef: artifact.rawRef,
    actionPolicy,
    sections: briefingSectionsFromMetadata(metadata.sections),
    nextSteps: stringArrayFromMetadata(metadata.nextSteps),
    gapSignalIds: stringArrayFromMetadata(metadata.gapSignalIds),
    provenance: artifact.provenance,
  };
}

function buildBriefingSections(args: {
  data: ReturnType<typeof listAll>;
  adoptionDashboard: CompanyBrainAdoptionDashboard;
  sourceHealthReport: CompanyBrainSourceHealthReport;
  generatedAt: number;
}): { sections: CompanyBrainBriefingSection[]; nextSteps: string[] } {
  const { data, adoptionDashboard, sourceHealthReport, generatedAt } = args;
  const weekAgo = generatedAt - 7 * 24 * 60 * 60 * 1000;
  const relevantHealthSources = sourceHealthReport.sources.filter(
    (source) => source.sourceId !== AIOS_BRIEFING_SOURCE_ID
  );
  const relevantGaps = adoptionDashboard.gaps.filter(
    (gap) => gap.sourceId !== AIOS_BRIEFING_SOURCE_ID
  );
  const pendingDecisions = data.decisions.filter((decision) => decision.status === "proposed");
  const newDecisions = data.decisions.filter((decision) => decision.createdAt >= weekAgo);
  const activeTradeoffs = data.strategyTradeoffs.filter((tradeoff) =>
    ["proposed", "accepted"].includes(tradeoff.status)
  );
  const openGuidance = data.guidanceItems.filter((item) =>
    ["new", "open"].includes(item.status)
  );
  const overdueGuidance = openGuidance.filter(
    (item) => typeof item.dueAt === "number" && item.dueAt < generatedAt
  );
  const driftFindings = data.alignmentFindings.filter((finding) =>
    ["drift", "contradiction", "weak", "unknown"].includes(finding.classification)
  );
  const unhealthySources = relevantHealthSources.filter(
    (source) => source.issueKinds.length > 0
  );
  const unlinkedWorkItems = data.workItems.filter(
    (item) => !item.priorityId && !item.goalId
  );
  const riskyRuns = data.workflowRuns.filter(
    (run) =>
      ["pending", "blocked", "failed"].includes(run.gateStatus) ||
      ["at_risk", "breached"].includes(run.slaStatus)
  );
  const riskyGoals = data.goals.filter((goal) =>
    ["at_risk", "breached"].includes(goal.slaStatus)
  );

  const sections: CompanyBrainBriefingSection[] = [
    {
      key: "decisions",
      title: "Decisions",
      items: limitOrNone([
        ...newDecisions.map((decision) =>
          formatEntityLine({
            prefix: "new",
            title: decision.title,
            status: decision.status,
            detail: textSnippet(decision.rationale ?? decision.summary),
          })
        ),
        ...pendingDecisions.map((decision) =>
          formatEntityLine({
            prefix: "pending",
            title: decision.title,
            status: decision.status,
            detail: textSnippet(decision.rationale ?? decision.summary),
          })
        ),
      ]),
    },
    {
      key: "tradeoffs",
      title: "Tradeoffs",
      items: limitOrNone(
        activeTradeoffs.map((tradeoff) =>
          formatEntityLine({
            prefix: tradeoff.kind,
            title: tradeoff.title,
            status: tradeoff.status,
            detail: textSnippet(tradeoff.acceptedOption ?? tradeoff.summary),
          })
        )
      ),
    },
    {
      key: "open_guidance",
      title: "Open Guidance",
      items: limitOrNone([
        ...overdueGuidance.map((item) =>
          formatEntityLine({
            prefix: "overdue",
            title: item.title,
            status: item.status,
            detail: item.action,
          })
        ),
        ...openGuidance.map((item) =>
          formatEntityLine({
            title: item.title,
            status: item.status,
            detail: textSnippet(item.action),
          })
        ),
      ]),
    },
    {
      key: "findings",
      title: "Findings",
      items: limitOrNone(
        driftFindings.map((finding) =>
          formatEntityLine({
            title: finding.rationale,
            status: finding.classification,
            detail: finding.suggestedAction,
          })
        )
      ),
    },
    {
      key: "source_health",
      title: "Source Health",
      items: limitOrNone(
        unhealthySources.map((source) =>
          formatEntityLine({
            title: source.title,
            status: source.freshnessStatus,
            detail: source.issueKinds.join(", "),
          })
        )
      ),
    },
    {
      key: "adoption_dashboard",
      title: "Adoption Dashboard",
      items: [
        `${adoptionDashboard.stats.closedLoopProjectCount}/${adoptionDashboard.stats.projectCount} projects closed-loop; ${adoptionDashboard.stats.improvingProjectCount} improving.`,
        `${relevantGaps.length} adoption gaps visible; ${adoptionDashboard.stats.openGuidanceCount} open guidance; ${adoptionDashboard.stats.pendingGateCount} pending gates; ${adoptionDashboard.stats.slaRiskCount} SLA risks.`,
        ...relevantGaps
          .slice(0, 4)
          .map((gap) =>
            formatEntityLine({
              prefix: gap.kind,
              title: gap.title,
              status: gap.severity,
              detail: gap.rationale,
            })
          ),
      ],
    },
    {
      key: "unlinked_work",
      title: "Unlinked Work",
      items: limitOrNone(
        unlinkedWorkItems.map((item) =>
          formatEntityLine({
            title: item.title,
            status: item.status,
            detail: "No priority or goal link.",
          })
        )
      ),
    },
    {
      key: "gates_sla",
      title: "Gates and SLA",
      items: limitOrNone([
        ...riskyRuns.map((run) =>
          formatEntityLine({
            title: run.title,
            status: `gate=${run.gateStatus}; sla=${run.slaStatus}`,
            detail: run.currentStep ? `current step ${run.currentStep}` : null,
          })
        ),
        ...riskyGoals.map((goal) =>
          formatEntityLine({
            title: goal.title,
            status: `goal sla=${goal.slaStatus}`,
            detail: goal.reviewCadence,
          })
        ),
      ]),
    },
  ];

  const nextSteps = uniqueStrings([
    pendingDecisions.length
      ? `Review ${pendingDecisions.length} proposed decision candidates.`
      : "",
    activeTradeoffs.some((tradeoff) => tradeoff.status === "proposed")
      ? "Accept, reject or supersede proposed strategy tradeoffs."
      : "",
    openGuidance.length
      ? `Close feedback on ${openGuidance.length} open guidance items.`
      : "",
    unhealthySources.length
      ? `Refresh or repair ${unhealthySources.length} source health gaps.`
      : "",
    unlinkedWorkItems.length
      ? `Link ${unlinkedWorkItems.length} work items to priority or goal.`
      : "",
    riskyRuns.length || riskyGoals.length
      ? "Review blocked gates and SLA risks before starting new writeback work."
      : "",
    relevantGaps.length
      ? "Run review cohesion before expanding adapters."
      : "Keep the daily briefing cadence and move to review cohesion.",
  ]);

  sections.push({
    key: "next_steps",
    title: "Next Steps",
    items: limitOrNone(nextSteps),
  });

  return { sections, nextSteps: limitOrNone(nextSteps) };
}

interface BriefingGapSignalCandidate {
  title: string;
  summary: string;
  rawRef: string;
  severity: SignalSeverity;
  source: SignalSource;
  area: CompanyBrainArea;
  sourceId: string | null;
  entityId: string;
  workItemId: string | null;
  workflowRunId: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
}

function buildBriefingGapCandidates(args: {
  data: ReturnType<typeof listAll>;
  sourceHealthReport: CompanyBrainSourceHealthReport;
  generatedAt: number;
  runId: string;
}): BriefingGapSignalCandidate[] {
  const { data, sourceHealthReport, generatedAt, runId } = args;
  const candidates: BriefingGapSignalCandidate[] = [];
  const addCandidate = (candidate: BriefingGapSignalCandidate) => {
    if (candidates.some((item) => item.rawRef === candidate.rawRef)) return;
    candidates.push(candidate);
  };

  for (const source of sourceHealthReport.sources) {
    if (source.sourceId === AIOS_BRIEFING_SOURCE_ID) continue;
    const clearHealthIssue = source.issueKinds.find((kind) =>
      ["sync_error", "stale", "never_synced"].includes(kind)
    );
    if (!clearHealthIssue) continue;
    addCandidate({
      title: `Source health gap: ${source.title}`,
      summary: `Source ${source.title} is ${source.freshnessStatus}; issues: ${source.issueKinds.join(", ")}.`,
      rawRef: `aios://company-brain/briefing/${runId}/source-health/${source.sourceId}`,
      severity: source.freshnessStatus === "error" ? "critical" : "warn",
      source: "telemetry",
      area: source.area,
      sourceId: source.sourceId,
      entityId: source.sourceId,
      workItemId: null,
      workflowRunId: null,
      tags: ["aios_briefing", "source_health", clearHealthIssue],
      metadata: {
        gapKind: "source_health",
        issueKinds: source.issueKinds,
        freshnessStatus: source.freshnessStatus,
      },
    });
  }

  for (const item of data.guidanceItems) {
    if (!["new", "open"].includes(item.status)) continue;
    if (typeof item.dueAt !== "number" || item.dueAt >= generatedAt) continue;
    addCandidate({
      title: `Overdue guidance: ${item.title}`,
      summary: `Guidance ${item.title} is overdue and still ${item.status}.`,
      rawRef: `aios://company-brain/briefing/${runId}/guidance/${item.id}`,
      severity: item.severity,
      source: "qa",
      area: item.area,
      sourceId: null,
      entityId: item.id,
      workItemId: item.workItemId,
      workflowRunId: item.workflowRunId,
      tags: ["aios_briefing", "guidance_overdue"],
      metadata: {
        gapKind: "guidance_overdue",
        dueAt: item.dueAt,
        status: item.status,
      },
    });
  }

  for (const item of data.workItems) {
    if (item.priorityId || item.goalId) continue;
    addCandidate({
      title: `Unlinked work item: ${item.title}`,
      summary: `Work item ${item.title} has no priority or goal link.`,
      rawRef: `aios://company-brain/briefing/${runId}/work-item/${item.id}`,
      severity: "warn",
      source: "qa",
      area: item.area,
      sourceId: item.sourceId,
      entityId: item.id,
      workItemId: item.id,
      workflowRunId: null,
      tags: ["aios_briefing", "unlinked_work_item"],
      metadata: {
        gapKind: "unlinked_work_item",
        status: item.status,
      },
    });
  }

  for (const run of data.workflowRuns) {
    if (!["blocked", "failed"].includes(run.gateStatus)) continue;
    addCandidate({
      title: `Critical gate pending: ${run.title}`,
      summary: `Workflow run ${run.title} has gate status ${run.gateStatus}.`,
      rawRef: `aios://company-brain/briefing/${runId}/workflow-run/${run.id}/gate`,
      severity: "critical",
      source: "qa",
      area: run.workflowArea,
      sourceId: null,
      entityId: run.id,
      workItemId: run.workItemId,
      workflowRunId: run.id,
      tags: ["aios_briefing", "critical_gate", run.gateStatus],
      metadata: {
        gapKind: "critical_gate",
        gateStatus: run.gateStatus,
        slaStatus: run.slaStatus,
      },
    });
  }

  for (const run of data.workflowRuns) {
    if (!["at_risk", "breached"].includes(run.slaStatus)) continue;
    addCandidate({
      title: `Workflow SLA risk: ${run.title}`,
      summary: `Workflow run ${run.title} has SLA status ${run.slaStatus}.`,
      rawRef: `aios://company-brain/briefing/${runId}/workflow-run/${run.id}/sla`,
      severity: run.slaStatus === "breached" ? "critical" : "warn",
      source: "qa",
      area: run.workflowArea,
      sourceId: null,
      entityId: run.id,
      workItemId: run.workItemId,
      workflowRunId: run.id,
      tags: ["aios_briefing", "sla_risk", run.slaStatus],
      metadata: {
        gapKind: "sla_risk",
        gateStatus: run.gateStatus,
        slaStatus: run.slaStatus,
      },
    });
  }

  return candidates.slice(0, 10);
}

function buildBriefingSummary(sections: CompanyBrainBriefingSection[]) {
  const lines = [
    "AIOS operational briefing generated from the Company Brain.",
    "",
  ];
  for (const section of sections) {
    lines.push(`## ${section.title}`);
    for (const item of section.items) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

function runAiosBriefingWatcher(args: {
  watcher: typeof cbWatchers.$inferSelect;
  startedAt: number;
  runId: string;
}) {
  const db = getDb();
  const { watcher, startedAt, runId } = args;
  const source = db
    .select()
    .from(cbSources)
    .where(eq(cbSources.id, AIOS_BRIEFING_SOURCE_ID))
    .get();
  if (!source) throw new Error("AIOS briefing source not found");

  const data = listAll();
  const adoptionDashboard = buildAdoptionDashboard(data);
  const sourceHealthReport = buildSourceHealthReport(data);
  const { sections, nextSteps } = buildBriefingSections({
    data,
    adoptionDashboard,
    sourceHealthReport,
    generatedAt: startedAt,
  });
  const candidates = buildBriefingGapCandidates({
    data,
    sourceHealthReport,
    generatedAt: startedAt,
    runId,
  });
  const artifactId = nanoid(12);
  const rawRef = `aios://company-brain/briefing/${runId}`;
  const provenance = {
    sourceId: source.id,
    rawRef,
    createdFrom: `watcher:${watcher.id}:briefing`,
    confidence: 1,
    extractedAt: startedAt,
    humanReviewStatus: "approved" as const,
    visibility: watcher.visibility,
    notes: `action_policy=${watcher.actionPolicy}; risk_class=${watcher.riskClass}`,
  };
  const signalsCreated = candidates.map((candidate) => {
    const signalId = nanoid(12);
    const tags = uniqueStrings([
      "watcher",
      watcher.id,
      "aios_briefing",
      ...candidate.tags,
    ]);
    const envelope = {
      source: candidate.source,
      scope: "core" as const,
      entity_type: "job" as const,
      entity_id: candidate.entityId,
      timestamp: startedAt,
      summary: candidate.summary,
      raw_ref: candidate.rawRef,
      severity: candidate.severity,
      confidence: 0.92,
      tags,
    };
    return {
      id: signalId,
      source: candidate.source,
      scope: "core" as const,
      entityType: "job" as const,
      entityId: candidate.entityId,
      timestamp: startedAt,
      summary: candidate.summary,
      rawRef: candidate.rawRef,
      severity: candidate.severity,
      confidence: 0.92,
      tags,
      area: candidate.area,
      sourceId: candidate.sourceId,
      artifactId,
      workItemId: candidate.workItemId,
      workflowRunId: candidate.workflowRunId,
      watcherId: watcher.id,
      watcherRunId: runId,
      visibility: watcher.visibility,
      provenance: {
        ...provenance,
        artifactId,
        rawRef: candidate.rawRef,
        createdFrom: `watcher:${watcher.id}:briefing_signal`,
      },
      metadata: {
        ...candidate.metadata,
        autoImproveEnvelope: envelope,
        actionPolicy: watcher.actionPolicy,
        watcherRunId: runId,
      },
      createdAt: startedAt,
      updatedAt: startedAt,
    };
  });
  const gapSignalIds = signalsCreated.map((signal) => signal.id);
  const summary = buildBriefingSummary(sections);
  const artifact = {
    id: artifactId,
    sourceId: source.id,
    artifactType: "aios_briefing",
    area: "platform" as const,
    title: `AIOS Briefing ${new Date(startedAt).toISOString()}`,
    summary,
    contentRef: rawRef,
    rawRef,
    author: watcher.owner ?? "AIOS Briefing watcher",
    occurredAt: startedAt,
    ingestedAt: startedAt,
    hash: stableHash(`${watcher.id}:${runId}:${summary}`),
    visibility: watcher.visibility,
    provenance,
    humanReviewStatus: "approved" as const,
    confidence: 1,
    metadata: {
      watcherId: watcher.id,
      watcherRunId: runId,
      actionPolicy: watcher.actionPolicy,
      riskClass: watcher.riskClass,
      sections,
      nextSteps,
      gapSignalIds,
      adoptionDashboardStats: adoptionDashboard.stats,
      sourceHealthStats: sourceHealthReport.stats,
      generatedAt: startedAt,
    },
  };

  db.insert(cbArtifacts).values(artifact).run();
  for (const signal of signalsCreated) {
    db.insert(cbSignals).values(signal).run();
    db.insert(cbArtifactLinks)
      .values({
        id: nanoid(12),
        artifactId,
        targetType: "signal",
        targetId: signal.id,
        relationship: "briefing_gap_signal",
        confidence: signal.confidence,
        rationale:
          "AIOS Briefing watcher emitted an observe-only AutoImprove gap signal.",
        createdAt: startedAt,
      })
      .run();
  }

  const finishedAt = now();
  const sourceIds = [source.id];
  const run = {
    id: runId,
    watcherId: watcher.id,
    startedAt,
    finishedAt,
    status: "completed" as const,
    triggerRef: rawRef,
    sourceIds,
    artifactsCreated: [artifactId],
    signalsCreated: gapSignalIds,
    alignmentFindingsCreated: [],
    workItemsCreated: [],
    guidanceCreated: [],
    workflowRunsLinked: [],
    errorSummary: null,
    actionPolicy: watcher.actionPolicy,
    riskClass: watcher.riskClass,
    provenance: {
      ...provenance,
      artifactId,
      createdFrom: `watcher:${watcher.id}:run`,
    },
    createdAt: startedAt,
    updatedAt: finishedAt,
  };

  db.insert(cbWatcherRuns).values(run).run();
  db.update(cbWatchers)
    .set({
      lastRunAt: finishedAt,
      status: "active",
      updatedAt: finishedAt,
    })
    .where(eq(cbWatchers.id, watcher.id))
    .run();
  db.update(cbSources)
    .set({
      lastSyncAt: finishedAt,
      healthStatus: "healthy",
      syncError: null,
      updatedAt: finishedAt,
    })
    .where(eq(cbSources.id, source.id))
    .run();

  return {
    run,
    artifact,
    signalsCreated,
    alignmentFindingsCreated: [],
    workItemsCreated: [],
    guidanceItemsCreated: [],
    workflowRunsLinked: [],
  };
}

function buildReviewCohesion(
  data: ReturnType<typeof listAll>
): CompanyBrainReviewCohesion {
  const generatedAt = now();
  const items: CompanyBrainReviewQueueItem[] = [];
  const findingSignalIds = new Set(
    data.alignmentFindings.flatMap((finding) => finding.signalIds)
  );
  const guidanceFindingIds = new Set(
    data.guidanceItems
      .map((item) => item.findingId)
      .filter((id): id is string => typeof id === "string")
  );
  const guidanceSignalIds = new Set(
    data.guidanceItems
      .map((item) => item.signalId)
      .filter((id): id is string => typeof id === "string")
  );
  const overdueGuidanceIds = new Set(
    data.guidanceItems
      .filter(
        (item) =>
          ["new", "open"].includes(item.status) &&
          typeof item.dueAt === "number" &&
          item.dueAt < generatedAt
      )
      .map((item) => item.id)
  );

  for (const decision of data.decisions) {
    if (decision.status !== "proposed") continue;
    items.push({
      id: `decision_candidate:${decision.id}`,
      kind: "decision_candidate",
      targetType: "decision",
      targetId: decision.id,
      title: decision.title,
      rationale: decision.rationale ?? decision.summary,
      status: decision.status,
      severity: null,
      area: decision.area,
      sourceId: null,
      artifactId: decision.sourceArtifactIds[0] ?? null,
      signalId: null,
      findingId: null,
      guidanceItemId: null,
      workItemId: null,
      workflowRunId: null,
      updatedAt: decision.updatedAt,
      nextAction: "Accept, reject or supersede the decision candidate.",
      provenance: decision.provenance,
    });
  }

  for (const signal of data.signals) {
    if (findingSignalIds.has(signal.id)) continue;
    items.push({
      id: `signal_needs_finding:${signal.id}`,
      kind: "signal_needs_finding",
      targetType: "signal",
      targetId: signal.id,
      title: signal.summary,
      rationale: "Signal has not been classified into an AlignmentFinding.",
      status: signal.severity,
      severity: signal.severity,
      area: signal.area,
      sourceId: signal.sourceId,
      artifactId: signal.artifactId,
      signalId: signal.id,
      findingId: null,
      guidanceItemId: null,
      workItemId: signal.workItemId,
      workflowRunId: signal.workflowRunId,
      updatedAt: signal.updatedAt,
      nextAction: "Run Signal -> Finding/Guidance extraction.",
      provenance: signal.provenance,
    });
  }

  for (const finding of data.alignmentFindings) {
    const hasGuidance =
      guidanceFindingIds.has(finding.id) ||
      finding.signalIds.some((signalId) => guidanceSignalIds.has(signalId));
    if (hasGuidance) continue;
    items.push({
      id: `finding_needs_guidance:${finding.id}`,
      kind: "finding_needs_guidance",
      targetType: "alignment_finding",
      targetId: finding.id,
      title: finding.rationale,
      rationale: finding.suggestedAction,
      status: finding.classification,
      severity: finding.severity,
      area: finding.area,
      sourceId: null,
      artifactId: finding.artifactIds[0] ?? null,
      signalId: finding.signalIds[0] ?? null,
      findingId: finding.id,
      guidanceItemId: null,
      workItemId: finding.workItemId,
      workflowRunId: finding.workflowRunId,
      updatedAt: finding.updatedAt,
      nextAction: "Create a guidance candidate or close the finding as intentionally unowned.",
      provenance: finding.provenance,
    });
  }

  for (const item of data.guidanceItems) {
    if (!["new", "open"].includes(item.status)) continue;
    if (item.feedbackStatus !== "pending") continue;
    items.push({
      id: `guidance_needs_feedback:${item.id}`,
      kind: "guidance_needs_feedback",
      targetType: "guidance_item",
      targetId: item.id,
      title: item.title,
      rationale: item.action,
      status: `${item.status}/${item.feedbackStatus}`,
      severity: item.severity,
      area: item.area,
      sourceId: null,
      artifactId: null,
      signalId: item.signalId,
      findingId: item.findingId,
      guidanceItemId: item.id,
      workItemId: item.workItemId,
      workflowRunId: item.workflowRunId,
      updatedAt: item.updatedAt,
      nextAction: overdueGuidanceIds.has(item.id)
        ? "Review overdue guidance feedback."
        : "Accept, complete or ignore guidance feedback.",
      provenance: item.provenance,
    });
  }

  const severityRank = (severity: CompanyBrainReviewQueueItem["severity"]) => {
    if (severity === "critical") return 3;
    if (severity === "warn") return 2;
    if (severity === "info") return 1;
    return 0;
  };

  items.sort((a, b) => {
    const severityDelta = severityRank(b.severity) - severityRank(a.severity);
    if (severityDelta !== 0) return severityDelta;
    return b.updatedAt - a.updatedAt;
  });

  return {
    generatedAt,
    items,
    stats: {
      totalItemCount: items.length,
      pendingDecisionCount: items.filter((item) => item.kind === "decision_candidate")
        .length,
      signalsWithoutFindingCount: items.filter(
        (item) => item.kind === "signal_needs_finding"
      ).length,
      findingsWithoutGuidanceCount: items.filter(
        (item) => item.kind === "finding_needs_guidance"
      ).length,
      guidanceNeedingFeedbackCount: items.filter(
        (item) => item.kind === "guidance_needs_feedback"
      ).length,
      overdueGuidanceCount: items.filter(
        (item) =>
          item.kind === "guidance_needs_feedback" &&
          item.guidanceItemId !== null &&
          overdueGuidanceIds.has(item.guidanceItemId)
      ).length,
      criticalItemCount: items.filter((item) => item.severity === "critical").length,
    },
  };
}

app.get("/summary", (c) => {
  const data = listAll();
  const adoptionDashboard = buildAdoptionDashboard(data);
  const sourceHealthReport = buildSourceHealthReport(data);
  const lastBriefing = buildLastBriefing(data);
  const reviewCohesion = buildReviewCohesion(data);
  const unlinkedWorkItemCount = data.workItems.filter(
    (item) => !item.priorityId && !item.goalId
  ).length;
  const activeWorkflowRunCount = data.workflowRuns.filter((run) =>
    ["planned", "running", "blocked", "needs_human"].includes(run.status)
  ).length;
  const gateBlockedCount = data.workflowRuns.filter(
    (run) => run.gateStatus === "blocked" || run.gateStatus === "failed"
  ).length;
  const slaAtRiskCount =
    data.goals.filter((goal) => goal.slaStatus === "at_risk" || goal.slaStatus === "breached")
      .length +
    data.workflowRuns.filter(
      (run) => run.slaStatus === "at_risk" || run.slaStatus === "breached"
    ).length;
  const watcherErrorCount =
    data.watchers.filter((watcher) => watcher.status === "error").length +
    data.watcherRuns.filter((run) => run.status === "failed").length;
  const driftFindingCount = data.alignmentFindings.filter((finding) =>
    ["drift", "contradiction"].includes(finding.classification)
  ).length;
  const openGuidanceCount = data.guidanceItems.filter((item) =>
    ["new", "open"].includes(item.status)
  ).length;

  return c.json({
    data: {
      ...data,
      adoptionDashboard,
      sourceHealthReport,
      lastBriefing,
      reviewCohesion,
      stats: {
        sourceCount: data.sources.length,
        artifactCount: data.artifacts.length,
        priorityCount: data.priorities.length,
        goalCount: data.goals.length,
        decisionCount: data.decisions.length,
        activeDecisionCount: data.decisions.filter((decision) =>
          ["proposed", "accepted"].includes(decision.status)
        ).length,
        strategyTradeoffCount: data.strategyTradeoffs.length,
        activeStrategyTradeoffCount: data.strategyTradeoffs.filter((tradeoff) =>
          ["proposed", "accepted"].includes(tradeoff.status)
        ).length,
        workItemCount: data.workItems.length,
        unlinkedWorkItemCount,
        activeWorkflowRunCount,
        gateBlockedCount,
        slaAtRiskCount,
        watcherCount: data.watchers.length,
        activeWatcherCount: data.watchers.filter((watcher) => watcher.status === "active")
          .length,
        watcherRunCount: data.watcherRuns.length,
        watcherErrorCount,
        signalCount: data.signals.length,
        alignmentFindingCount: data.alignmentFindings.length,
        driftFindingCount,
        guidanceItemCount: data.guidanceItems.length,
        openGuidanceCount,
        agentContextCount: data.agentContexts.length,
        readyAgentContextCount: data.agentContexts.filter((context) =>
          ["ready", "active"].includes(context.status)
        ).length,
        improvementProposalCount: data.improvementProposals.length,
        promotionCandidateCount: data.improvementProposals.filter((proposal) =>
          ["candidate", "approved"].includes(proposal.promotionStatus)
        ).length,
        reviewQueueItemCount: reviewCohesion.stats.totalItemCount,
      },
    },
  });
});

app.get("/adoption-dashboard", (c) => {
  const data = buildAdoptionDashboard(listAll());
  return c.json({ data });
});

app.get("/source-health", (c) => {
  const data = buildSourceHealthReport(listAll());
  return c.json({ data });
});

app.get("/briefing", (c) => {
  const data = buildLastBriefing(listAll());
  return c.json({ data });
});

app.get("/review-cohesion", (c) => {
  const data = buildReviewCohesion(listAll());
  return c.json({ data });
});

app.post("/demo/felhen-v0-1", async (c) => {
  try {
    const body = (await c.req
      .json<RunFelhenDemoRequest>()
      .catch(() => ({}))) as RunFelhenDemoRequest;
    const db = getDb();
    const timestamp = now();
    const owner = body.owner ?? "Felhen";
    const visibility = body.visibility ?? "internal";
    const demoRef = "aios://demo/felhen-v0.1";

    let source =
      db
        .select()
        .from(cbSources)
        .all()
        .find((item) => item.externalRef === demoRef) ?? null;
    if (!source) {
      source = {
        id: nanoid(12),
        name: "Felhen Demo v0.1",
        sourceType: "runtime" as const,
        area: "platform" as const,
        externalRef: demoRef,
        status: "active" as const,
        healthStatus: "healthy" as const,
        owner,
        ownerType: "team" as const,
        visibility,
        lastSyncAt: timestamp,
        syncError: null,
        metadata: {
          demo: "felhen-v0.1",
          readOnly: true,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbSources).values(source).run();
    } else {
      source = {
        ...source,
        healthStatus: "healthy" as const,
        lastSyncAt: timestamp,
        syncError: null,
        updatedAt: timestamp,
      };
      db.update(cbSources)
        .set({
          healthStatus: source.healthStatus,
          lastSyncAt: source.lastSyncAt,
          syncError: source.syncError,
          updatedAt: source.updatedAt,
        })
        .where(eq(cbSources.id, source.id))
        .run();
    }

    let priority =
      db
        .select()
        .from(cbStrategicPriorities)
        .all()
        .find((item) => item.title === "Felhen AIOS Demo v0.1 closed loop") ?? null;
    if (!priority) {
      priority = {
        id: nanoid(12),
        title: "Felhen AIOS Demo v0.1 closed loop",
        description: "Demonstrate strategy to learning through the Company Brain.",
        area: "platform" as const,
        owner,
        ownerType: "team" as const,
        status: "active" as const,
        timeHorizon: "2026-05-06 demo checkpoint",
        reviewCadence: "daily",
        successCriteria:
          "Strategy, evidence, work item, workflow run, signal, finding, guidance and improvement proposal are visible in AIOS.",
        visibility,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbStrategicPriorities).values(priority).run();
    }

    let goal =
      db
        .select()
        .from(cbGoals)
        .all()
        .find((item) => item.title === "Demo Felhen v0.1 accepted") ?? null;
    if (!goal) {
      goal = {
        id: nanoid(12),
        priorityId: priority.id,
        title: "Demo Felhen v0.1 accepted",
        description: "Operational demo proves the AIOS kernel can close a loop.",
        area: "platform" as const,
        owner,
        ownerType: "team" as const,
        status: "on_track" as const,
        dueAt: timestamp + 24 * 60 * 60 * 1000,
        reviewCadence: "daily",
        slaStatus: "on_track" as const,
        confidence: 1,
        targetMetric: "closed_loop_objects_created",
        targetValue: "1 complete chain",
        currentValue: null,
        visibility,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbGoals).values(goal).run();
    }
    if (!goal) throw new Error("demo goal not available");

    const artifactRawRef = `${demoRef}/evidence/source-health-slack`;
    let artifact =
      db
        .select()
        .from(cbArtifacts)
        .all()
        .find((item) => item.rawRef === artifactRawRef) ?? null;
    if (!artifact) {
      const summary =
        "Felhen demo evidence: local docs, GitHub Issues, Slack import, Adoption Dashboard and Source Health are available in Company Brain.";
      artifact = {
        id: nanoid(12),
        sourceId: source.id,
        artifactType: "demo_evidence",
        area: "platform" as const,
        title: "Felhen Demo v0.1 evidence",
        summary,
        contentRef: artifactRawRef,
        rawRef: artifactRawRef,
        author: owner,
        occurredAt: timestamp,
        ingestedAt: timestamp,
        hash: stableHash(summary),
        visibility,
        provenance: {
          sourceId: source.id,
          rawRef: artifactRawRef,
          createdFrom: "demo:felhen-v0.1:evidence",
          confidence: 1,
          extractedAt: timestamp,
          humanReviewStatus: "approved" as const,
          visibility,
          notes: "read_only=true",
        },
        humanReviewStatus: "approved" as const,
        confidence: 1,
        metadata: {
          demo: "felhen-v0.1",
          readOnly: true,
        },
      };
      db.insert(cbArtifacts).values(artifact).run();
    }

    let workItem =
      db
        .select()
        .from(cbWorkItems)
        .all()
        .find(
          (item) =>
            item.externalProvider === "aios" &&
            item.externalId === "felhen-demo-v0.1#closed-loop"
        ) ?? null;
    if (!workItem) {
      workItem = {
        id: nanoid(12),
        title: "Felhen Demo v0.1 closed-loop work item",
        description: "Demonstrate strategy to evidence to workflow to learning in AIOS.",
        area: "platform" as const,
        owner,
        ownerType: "team" as const,
        status: "in_progress" as const,
        priorityId: priority.id,
        goalId: goal.id,
        milestoneId: null,
        externalProvider: "aios",
        externalId: "felhen-demo-v0.1#closed-loop",
        externalUrl: demoRef,
        riskClass: "B" as const,
        dueAt: goal.dueAt,
        blockedReason: null,
        labels: ["demo", "company-brain", "closed-loop"],
        sourceId: source.id,
        artifactId: artifact.id,
        visibility,
        provenance: {
          sourceId: source.id,
          rawRef: demoRef,
          artifactId: artifact.id,
          createdFrom: "demo:felhen-v0.1:work_item",
          confidence: 1,
          extractedAt: timestamp,
          humanReviewStatus: "approved" as const,
          visibility,
          notes: "read_only=true",
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbWorkItems).values(workItem).run();
      db.insert(cbArtifactLinks)
        .values({
          id: nanoid(12),
          artifactId: artifact.id,
          targetType: "work_item",
          targetId: workItem.id,
          relationship: "demo_evidence_for_work",
          confidence: 1,
          rationale: "Felhen Demo v0.1 evidence supports the demo work item.",
          createdAt: timestamp,
        })
        .run();
    }

    const blueprint = db
      .select()
      .from(cbWorkflowBlueprints)
      .where(eq(cbWorkflowBlueprints.id, "development-blueprint-v0"))
      .get();
    if (!blueprint) throw new Error("development-blueprint-v0 not found");
    const stages = blueprint.stages as WorkflowBlueprintStage[];
    let workflowRun =
      db
        .select()
        .from(cbWorkflowRuns)
        .all()
        .find(
          (run) =>
            run.workItemId === workItem.id &&
            run.title === "Felhen Demo v0.1 Development Blueprint run"
        ) ?? null;
    if (!workflowRun) {
      workflowRun = {
        id: nanoid(12),
        blueprintId: blueprint.id,
        workItemId: workItem.id,
        title: "Felhen Demo v0.1 Development Blueprint run",
        workflowArea: "platform" as const,
        status: "running" as const,
        currentStep: stages[0]?.key ?? null,
        gateStatus: "pending" as const,
        slaStatus: "on_track" as const,
        owner,
        ownerType: "team" as const,
        dueAt: goal.dueAt,
        startedAt: timestamp,
        finishedAt: null,
        sourceArtifactIds: [artifact.id],
        visibility,
        provenance: {
          sourceId: source.id,
          rawRef: demoRef,
          artifactId: artifact.id,
          createdFrom: "demo:felhen-v0.1:workflow_run",
          confidence: 1,
          extractedAt: timestamp,
          humanReviewStatus: "approved" as const,
          visibility,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbWorkflowRuns).values(workflowRun).run();
      for (const [index, stage] of stages.entries()) {
        db.insert(cbWorkflowSteps)
          .values({
            id: `${workflowRun.id}-${stage.key}`,
            runId: workflowRun.id,
            blueprintId: blueprint.id,
            stepKey: stage.key,
            title: stage.title,
            position: index + 1,
            owner: null,
            ownerType: stage.ownerType,
            status: index === 0 ? "running" : "not_started",
            gateStatus: index === 0 ? "pending" : "not_started",
            slaStatus: "not_set",
            dueAt: null,
            evidenceArtifactIds: index === 0 ? [artifact.id] : [],
            requiredArtifact: stage.artifactExpected,
            completedAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          .run();
      }
    }

    let signal =
      db
        .select()
        .from(cbSignals)
        .all()
        .find((item) => item.rawRef === `${demoRef}/signal/closed-loop-ready`) ?? null;
    if (!signal) {
      signal = {
        id: nanoid(12),
        source: "qa" as const,
        scope: "core" as const,
        entityType: "job" as const,
        entityId: workItem.id,
        timestamp,
        summary: "Felhen demo closed-loop chain is ready for internal review.",
        rawRef: `${demoRef}/signal/closed-loop-ready`,
        severity: "info" as const,
        confidence: 0.95,
        tags: ["demo", "closed_loop", "felhen"],
        area: "platform" as const,
        sourceId: source.id,
        artifactId: artifact.id,
        workItemId: workItem.id,
        workflowRunId: workflowRun.id,
        watcherId: null,
        watcherRunId: null,
        visibility,
        provenance: {
          sourceId: source.id,
          rawRef: `${demoRef}/signal/closed-loop-ready`,
          artifactId: artifact.id,
          createdFrom: "demo:felhen-v0.1:signal",
          confidence: 0.95,
          extractedAt: timestamp,
          humanReviewStatus: "approved" as const,
          visibility,
        },
        metadata: {
          demo: "felhen-v0.1",
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbSignals).values(signal).run();
    }

    let alignmentFinding =
      db
        .select()
        .from(cbAlignmentFindings)
        .all()
        .find((item) => item.workItemId === workItem.id && item.signalIds.includes(signal.id)) ??
      null;
    if (!alignmentFinding) {
      alignmentFinding = {
        id: nanoid(12),
        priorityId: priority.id,
        goalId: goal.id,
        artifactIds: [artifact.id],
        signalIds: [signal.id],
        workItemId: workItem.id,
        workflowRunId: workflowRun.id,
        area: "platform" as const,
        classification: "aligned" as const,
        rationale:
          "Demo work item, workflow run and signal are linked to the AIOS demo priority and goal.",
        confidence: 0.95,
        suggestedAction: "Review the demo chain in Adoption Dashboard and Source Health.",
        severity: "info" as const,
        visibility,
        provenance: {
          sourceId: source.id,
          rawRef: `${demoRef}/finding/aligned`,
          artifactId: artifact.id,
          createdFrom: "demo:felhen-v0.1:alignment_finding",
          confidence: 0.95,
          extractedAt: timestamp,
          humanReviewStatus: "approved" as const,
          visibility,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbAlignmentFindings).values(alignmentFinding).run();
    }

    let guidanceItem =
      db
        .select()
        .from(cbGuidanceItems)
        .all()
        .find((item) => item.signalId === signal.id && item.findingId === alignmentFinding.id) ??
      null;
    if (!guidanceItem) {
      guidanceItem = {
        id: nanoid(12),
        audience: "team" as const,
        priorityId: priority.id,
        goalId: goal.id,
        findingId: alignmentFinding.id,
        signalId: signal.id,
        workItemId: workItem.id,
        workflowRunId: workflowRun.id,
        area: "platform" as const,
        title: "Review Felhen Demo v0.1 closed loop",
        action: "Use the demo chain to validate AIOS closed-loop operating readiness.",
        dueAt: goal.dueAt,
        severity: "info" as const,
        status: "open" as const,
        feedbackStatus: "pending" as const,
        feedbackNote: null,
        feedbackAt: null,
        generatedFrom: {
          demo: "felhen-v0.1",
          signalId: signal.id,
          findingId: alignmentFinding.id,
        },
        visibility,
        provenance: {
          sourceId: source.id,
          rawRef: `${demoRef}/guidance/review`,
          artifactId: artifact.id,
          createdFrom: "demo:felhen-v0.1:guidance",
          confidence: 0.95,
          extractedAt: timestamp,
          humanReviewStatus: "pending" as const,
          visibility,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbGuidanceItems).values(guidanceItem).run();
    }

    let improvementProposal =
      db
        .select()
        .from(cbImprovementProposals)
        .all()
        .find((item) => item.title === "Felhen Demo v0.1 operating loop learning") ?? null;
    if (!improvementProposal) {
      improvementProposal = {
        id: nanoid(12),
        title: "Felhen Demo v0.1 operating loop learning",
        hypothesis:
          "If the demo chain is visible end-to-end, future AIOS slices can be selected from adoption and source health gaps.",
        area: "platform" as const,
        owner,
        ownerType: "team" as const,
        signalIds: [signal.id],
        alignmentFindingIds: [alignmentFinding.id],
        guidanceItemIds: [guidanceItem.id],
        agentContextIds: [],
        sourceArtifactIds: [artifact.id],
        workItemIds: [workItem.id],
        priorityIds: [priority.id],
        goalIds: [goal.id],
        changeClass: "B" as const,
        patchRef: null,
        validationPlan: "Validate via demo endpoint, summary, adoption dashboard, source health and build.",
        impactReview: null,
        status: "proposed" as const,
        promotionStatus: "candidate" as const,
        visibility,
        provenance: {
          sourceId: source.id,
          rawRef: `${demoRef}/improvement/demo-learning`,
          artifactId: artifact.id,
          createdFrom: "demo:felhen-v0.1:improvement_proposal",
          confidence: 0.9,
          extractedAt: timestamp,
          humanReviewStatus: "needs_review" as const,
          visibility,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbImprovementProposals).values(improvementProposal).run();
    }

    const data = listAll();
    return c.json(
      {
        data: {
          source,
          priority,
          goal,
          artifact,
          workItem,
          workflowRun,
          signal,
          alignmentFinding,
          guidanceItem,
          improvementProposal,
          adoptionDashboard: buildAdoptionDashboard(data),
          sourceHealthReport: buildSourceHealthReport(data),
        },
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "demo_failed", message }, 400);
  }
});

app.get("/sources", (c) => {
  const data = getDb().select().from(cbSources).orderBy(desc(cbSources.updatedAt)).all();
  return c.json({ data, total: data.length });
});

app.post("/sources", async (c) => {
  try {
    const body = await c.req.json<CreateSourceRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      name: requireText(body.name, "name"),
      sourceType: body.sourceType,
      area: body.area ?? "unknown",
      externalRef: body.externalRef ?? null,
      status: body.status ?? "active",
      healthStatus: body.healthStatus ?? "unknown",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "unknown",
      visibility: body.visibility ?? "internal",
      lastSyncAt: null,
      syncError: null,
      metadata: body.metadata ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbSources).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/artifacts", (c) => {
  const sourceId = c.req.query("sourceId");
  let data = getDb()
    .select()
    .from(cbArtifacts)
    .orderBy(desc(cbArtifacts.ingestedAt))
    .limit(100)
    .all();
  if (sourceId) data = data.filter((artifact) => artifact.sourceId === sourceId);
  return c.json({ data, total: data.length });
});

app.post("/artifacts", async (c) => {
  try {
    const body = await c.req.json<CreateArtifactRequest>();
    const timestamp = now();
    const title = requireText(body.title, "title");
    const rawRef = requireText(body.rawRef, "rawRef");
    const sourceId = requireText(body.sourceId, "sourceId");
    const source = getDb().select().from(cbSources).where(eq(cbSources.id, sourceId)).get();
    if (!source) throw new Error("sourceId not found");

    const row = {
      id: nanoid(12),
      sourceId,
      artifactType: body.artifactType ?? "manual",
      area: body.area ?? source.area,
      title,
      summary: body.summary ?? null,
      contentRef: body.contentRef ?? null,
      rawRef,
      author: body.author ?? null,
      occurredAt: body.occurredAt ?? timestamp,
      ingestedAt: timestamp,
      hash:
        body.hash ??
        stableHash(`${sourceId}:${rawRef}:${title}:${body.summary ?? ""}`),
      visibility: body.visibility ?? source.visibility,
      provenance: body.provenance ?? {
        sourceId,
        rawRef,
        createdFrom: "api",
        confidence: body.confidence ?? 1,
        extractedAt: timestamp,
        humanReviewStatus: body.humanReviewStatus ?? "pending",
        visibility: body.visibility ?? source.visibility,
      },
      humanReviewStatus: body.humanReviewStatus ?? "pending",
      confidence: body.confidence ?? 1,
      metadata: body.metadata ?? null,
    };
    getDb().insert(cbArtifacts).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.post("/importers/local-docs", async (c) => {
  try {
    const body = await c.req.json<ImportLocalDocsRequest>();
    if (!Array.isArray(body.paths) || body.paths.length === 0) {
      throw new Error("paths is required");
    }
    const db = getDb();
    const timestamp = now();
    let source = body.sourceId
      ? db.select().from(cbSources).where(eq(cbSources.id, body.sourceId)).get()
      : null;
    if (body.sourceId && !source) throw new Error("sourceId not found");
    if (!source) {
      source = {
        id: nanoid(12),
        name: body.sourceName ?? "Local docs import",
        sourceType: "local_doc" as const,
        area: body.area ?? "platform",
        externalRef: "local_docs",
        status: "active" as const,
        healthStatus: "unknown" as const,
        owner: body.owner ?? null,
        ownerType: body.owner ? ("human" as const) : ("unknown" as const),
        visibility: body.visibility ?? "internal",
        lastSyncAt: null,
        syncError: null,
        metadata: {
          importer: "local_docs",
          allowedRoots: allowedLocalDocRoots(),
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbSources).values(source).run();
    }

    const artifactsCreated = [];
    for (const inputPath of body.paths) {
      const { absolutePath, allowedRoot, stat } = resolveImportPath(inputPath);
      const content = readFileSync(absolutePath, "utf-8");
      const rawRef = absolutePath;
      const title = basename(absolutePath).replace(/\.(md|mdx|txt)$/i, "");
      const artifact = {
        id: nanoid(12),
        sourceId: source.id,
        artifactType: body.artifactType ?? "local_doc",
        area: body.area ?? source.area,
        title,
        summary: summarizeDoc(content),
        contentRef: absolutePath,
        rawRef,
        author: body.owner ?? source.owner ?? "local_docs_importer",
        occurredAt: stat.mtimeMs,
        ingestedAt: timestamp,
        hash: stableHash(content),
        visibility: body.visibility ?? source.visibility,
        provenance: {
          sourceId: source.id,
          rawRef,
          createdFrom: "importer:local_docs",
          confidence: 1,
          extractedAt: timestamp,
          humanReviewStatus: "pending" as const,
          visibility: body.visibility ?? source.visibility,
          notes: `allowed_root=${allowedRoot}`,
        },
        humanReviewStatus: "pending" as const,
        confidence: 1,
        metadata: {
          importer: "local_docs",
          importPath: absolutePath,
          allowedRoot,
          sizeBytes: stat.size,
          mtimeMs: stat.mtimeMs,
          relativePath: relative(allowedRoot, absolutePath),
        },
      };
      db.insert(cbArtifacts).values(artifact).run();
      artifactsCreated.push(artifact);
    }

    db.update(cbSources)
      .set({
        lastSyncAt: timestamp,
        healthStatus: "healthy",
        syncError: null,
        updatedAt: timestamp,
      })
      .where(eq(cbSources.id, source.id))
      .run();

    return c.json(
      {
        data: {
          source,
          artifactsCreated,
        },
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "import_failed", message }, 400);
  }
});

app.post("/adapters/slack/channel/sync", async (c) => {
  try {
    const body = await c.req.json<SyncSlackChannelRequest>();
    const token = getSecretEnv("SLACK_BOT_TOKEN");
    if (!token) {
      throw new Error("SLACK_BOT_TOKEN is required for Slack channel sync");
    }
    if (!token.startsWith("xoxb-")) {
      throw new Error("SLACK_BOT_TOKEN must be a Bot User OAuth Token");
    }

    const db = getDb();
    const timestamp = now();
    const auth = await slackApi<SlackAuthTestResponse>(token, "auth.test");
    const channel = await findSlackChannel({
      token,
      channelId: body.channelId,
      channelName: body.channelName,
    });
    const workspaceName = body.workspaceName?.trim() || auth.team || "slack";
    const workspaceId = auth.team_id ?? null;
    const channelName = channel.name ?? body.channelName ?? channel.id;
    const externalRef = `slack://${workspaceId ?? workspaceName}/${channel.id}`;
    let source = body.sourceId
      ? db.select().from(cbSources).where(eq(cbSources.id, body.sourceId)).get()
      : null;
    if (body.sourceId && !source) throw new Error("sourceId not found");
    if (!source) {
      source =
        db
          .select()
          .from(cbSources)
          .all()
          .find(
            (item) =>
              item.sourceType === "slack" &&
              (item.externalRef === externalRef || item.name === body.sourceName)
          ) ?? null;
    }
    if (!source) {
      source = {
        id: nanoid(12),
        name: body.sourceName ?? `${workspaceName} #${channelName} Slack sync`,
        sourceType: "slack" as const,
        area: body.area ?? "operations",
        externalRef,
        status: "active" as const,
        healthStatus: "unknown" as const,
        owner: body.owner ?? null,
        ownerType: body.owner ? ("human" as const) : ("unknown" as const),
        visibility: body.visibility ?? "internal",
        lastSyncAt: null,
        syncError: null,
        metadata: {
          adapter: "slack_channel",
          workspaceName,
          workspaceId,
          channelId: channel.id,
          channelName,
          readOnly: true,
          actionPolicy: "observe_only",
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbSources).values(source).run();
    }

    const limit = Math.max(1, Math.min(body.limit ?? 25, 200));
    const threadLimit = Math.max(0, Math.min(body.threadLimit ?? 10, 50));
    const incremental = body.incremental !== false;
    const includeThreads = body.includeThreads === true;
    const oldestUsed =
      body.oldest ??
      (incremental && source.lastSyncAt
        ? slackTimestampFromMs(Math.max(0, source.lastSyncAt - 1000))
        : null);
    const history = await slackApi<SlackConversationHistoryResponse>(
      token,
      "conversations.history",
      {
        channel: channel.id,
        limit,
        oldest: oldestUsed,
        latest: body.latest,
        inclusive: false,
      }
    );
    const existingArtifacts = db.select().from(cbArtifacts).all();
    const knownThreadTs = new Set<string>();
    for (const artifact of existingArtifacts) {
      if (artifact.sourceId !== source.id) continue;
      const metadata = artifact.metadata ?? {};
      if (metadata.channelId !== channel.id) continue;
      const threadTs =
        typeof metadata.threadTs === "string" ? metadata.threadTs : null;
      if (threadTs) knownThreadTs.add(threadTs);
    }

    const messages = history.messages ?? [];
    const threadRoots = new Set<string>();
    const imports = new Map<
      string,
      { message: SlackMessagePayload; isThreadReply: boolean; parentTs: string | null }
    >();
    const addMessage = (
      message: SlackMessagePayload,
      isThreadReply: boolean,
      parentTs: string | null
    ) => {
      if (!message.ts) return;
      imports.set(message.ts, { message, isThreadReply, parentTs });
      const threadTs = message.thread_ts ?? null;
      if (threadTs) threadRoots.add(threadTs);
      if ((message.reply_count ?? 0) > 0 || message.latest_reply) {
        threadRoots.add(threadTs ?? message.ts);
      }
    };
    for (const message of messages) addMessage(message, false, null);
    if (includeThreads) {
      for (const threadTs of knownThreadTs) threadRoots.add(threadTs);
      for (const threadTs of Array.from(threadRoots).slice(0, threadLimit)) {
        const replies = await slackApi<SlackConversationRepliesResponse>(
          token,
          "conversations.replies",
          {
            channel: channel.id,
            ts: threadTs,
            limit: 200,
            oldest: oldestUsed,
            latest: body.latest,
            inclusive: false,
          }
        );
        for (const reply of replies.messages ?? []) {
          if (!reply.ts || reply.ts === threadTs) continue;
          addMessage(reply, true, threadTs);
        }
      }
    }

    const artifactsCreated = [];
    let latestTs: string | null = null;
    let repliesSeen = 0;
    for (const { message, isThreadReply, parentTs } of imports.values()) {
      const text = summarizeSlackText(message.text ?? "");
      if (!message.ts || !text) continue;
      const permalink = await fetchSlackPermalink(token, channel.id, message.ts);
      const rawRef =
        permalink ?? `slack://${workspaceId ?? workspaceName}/${channel.id}/${message.ts}`;
      if (!latestTs || Number(message.ts) > Number(latestTs)) latestTs = message.ts;
      if (isThreadReply) repliesSeen += 1;
      if (existingArtifacts.some((artifact) => artifact.rawRef === rawRef)) continue;
      const occurredAt = parseSlackTimestamp(message.ts) ?? timestamp;
      const threadTs = message.thread_ts ?? parentTs;
      const payload = JSON.stringify({
        workspaceName,
        workspaceId,
        channelId: channel.id,
        channelName,
        user: message.user ?? null,
        username: message.username ?? null,
        botId: message.bot_id ?? null,
        ts: message.ts,
        threadTs,
        isThreadReply,
        parentTs,
        replyCount: message.reply_count ?? 0,
        latestReply: message.latest_reply ?? null,
        subtype: message.subtype ?? null,
        text,
      });
      const author =
        message.user ?? message.username ?? message.bot_id ?? source.owner ?? "slack";
      const artifact = {
        id: nanoid(12),
        sourceId: source.id,
        artifactType: "slack_message",
        area: body.area ?? source.area,
        title: `Slack #${channelName}${isThreadReply ? " thread" : ""}: ${text.slice(0, 80)}`,
        summary: text,
        contentRef: permalink ?? rawRef,
        rawRef,
        author,
        occurredAt,
        ingestedAt: timestamp,
        hash: stableHash(payload),
        visibility: body.visibility ?? source.visibility,
        provenance: {
          sourceId: source.id,
          rawRef,
          createdFrom: "adapter:slack_channel",
          confidence: 0.95,
          extractedAt: timestamp,
          humanReviewStatus: "pending" as const,
          visibility: body.visibility ?? source.visibility,
          notes: "read_only=true; action_policy=observe_only",
        },
        humanReviewStatus: "pending" as const,
        confidence: 0.95,
        metadata: {
          adapter: "slack_channel",
          readOnly: true,
          actionPolicy: "observe_only",
          workspaceName,
          workspaceId,
          channelId: channel.id,
          channelName,
          isPrivate: Boolean(channel.is_private),
          isMember: Boolean(channel.is_member),
          user: message.user ?? null,
          username: message.username ?? null,
          botId: message.bot_id ?? null,
          ts: message.ts,
          threadTs,
          isThreadReply,
          parentTs,
          replyCount: message.reply_count ?? 0,
          latestReply: message.latest_reply ?? null,
          subtype: message.subtype ?? null,
          permalink,
        },
      };
      db.insert(cbArtifacts).values(artifact).run();
      existingArtifacts.push(artifact);
      artifactsCreated.push(artifact);
    }

    const previousLatestTs =
      typeof source.metadata?.latestTs === "string" ? source.metadata.latestTs : null;
    const updatedMetadata = {
      ...(source.metadata ?? {}),
      adapter: "slack_channel",
      workspaceName,
      workspaceId,
      channelId: channel.id,
      channelName,
      readOnly: true,
      actionPolicy: "observe_only",
      incremental,
      includeThreads,
      threadLimit,
      oldestUsed,
      latestTs: latestTs ?? previousLatestTs,
      lastMessagesSeen: imports.size,
      lastRepliesSeen: repliesSeen,
      syncedAt: timestamp,
    };
    const updatedSource = {
      ...source,
      lastSyncAt: timestamp,
      healthStatus: "healthy" as const,
      syncError: null,
      metadata: updatedMetadata,
      updatedAt: timestamp,
    };
    db.update(cbSources)
      .set({
        lastSyncAt: updatedSource.lastSyncAt,
        healthStatus: updatedSource.healthStatus,
        syncError: updatedSource.syncError,
        metadata: updatedSource.metadata,
        updatedAt: updatedSource.updatedAt,
      })
      .where(eq(cbSources.id, source.id))
      .run();

    return c.json(
      {
        data: {
          source: updatedSource,
          artifactsCreated,
          messagesSeen: imports.size,
          threadsSeen: includeThreads ? Math.min(threadRoots.size, threadLimit) : 0,
          repliesSeen,
          incremental,
          includeThreads,
          oldestUsed,
          latestTs: updatedMetadata.latestTs,
          channel: {
            id: channel.id,
            name: channelName,
            isPrivate: Boolean(channel.is_private),
            isMember: Boolean(channel.is_member),
          },
          workspace: {
            id: workspaceId,
            name: workspaceName,
          },
        },
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "sync_failed", message }, 400);
  }
});

app.post("/importers/slack-messages", async (c) => {
  try {
    const body = await c.req.json<ImportSlackMessagesRequest>();
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      throw new Error("messages is required");
    }
    const db = getDb();
    const timestamp = now();
    const workspaceName = body.workspaceName?.trim() || "manual_slack_import";
    const externalRef = `slack://${workspaceName}`;
    let source = body.sourceId
      ? db.select().from(cbSources).where(eq(cbSources.id, body.sourceId)).get()
      : null;
    if (body.sourceId && !source) throw new Error("sourceId not found");
    if (!source) {
      source =
        db
          .select()
          .from(cbSources)
          .all()
          .find(
            (item) =>
              item.sourceType === "slack" &&
              (item.externalRef === externalRef || item.name === body.sourceName)
          ) ?? null;
    }
    if (!source) {
      source = {
        id: nanoid(12),
        name: body.sourceName ?? `${workspaceName} Slack import`,
        sourceType: "slack" as const,
        area: body.area ?? "operations",
        externalRef,
        status: "active" as const,
        healthStatus: "unknown" as const,
        owner: body.owner ?? null,
        ownerType: body.owner ? ("human" as const) : ("unknown" as const),
        visibility: body.visibility ?? "internal",
        lastSyncAt: null,
        syncError: null,
        metadata: {
          importer: "slack_messages",
          workspaceName,
          readOnly: true,
          mode: "manual",
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbSources).values(source).run();
    }

    const existingArtifacts = db.select().from(cbArtifacts).all();
    const artifactsCreated = [];
    for (const message of body.messages) {
      const text = requireText(message.text, "message.text");
      const channel = message.channelName ?? message.channelId ?? "unknown_channel";
      const occurredAt = message.occurredAt ?? parseSlackTimestamp(message.ts) ?? timestamp;
      const rawRef =
        message.permalink ??
        `slack://${workspaceName}/${channel}/${message.ts ?? stableHash(text).slice(0, 12)}`;
      if (existingArtifacts.some((artifact) => artifact.rawRef === rawRef)) continue;
      const payload = JSON.stringify({
        workspaceName,
        channelId: message.channelId ?? null,
        channelName: message.channelName ?? null,
        user: message.user ?? null,
        ts: message.ts ?? null,
        threadTs: message.threadTs ?? null,
        text,
      });
      const artifact = {
        id: nanoid(12),
        sourceId: source.id,
        artifactType: "slack_message",
        area: body.area ?? source.area,
        title: `Slack ${channel}: ${summarizeSlackText(text).slice(0, 80)}`,
        summary: summarizeSlackText(text),
        contentRef: message.permalink ?? rawRef,
        rawRef,
        author: message.user ?? source.owner ?? "slack_importer",
        occurredAt,
        ingestedAt: timestamp,
        hash: stableHash(payload),
        visibility: body.visibility ?? source.visibility,
        provenance: {
          sourceId: source.id,
          rawRef,
          createdFrom: "importer:slack_messages",
          confidence: 0.9,
          extractedAt: timestamp,
          humanReviewStatus: "pending" as const,
          visibility: body.visibility ?? source.visibility,
          notes: "read_only=true; mode=manual",
        },
        humanReviewStatus: "pending" as const,
        confidence: 0.9,
        metadata: {
          importer: "slack_messages",
          readOnly: true,
          workspaceName,
          channelId: message.channelId ?? null,
          channelName: message.channelName ?? null,
          user: message.user ?? null,
          ts: message.ts ?? null,
          threadTs: message.threadTs ?? null,
          permalink: message.permalink ?? null,
          ...(message.metadata ?? {}),
        },
      };
      db.insert(cbArtifacts).values(artifact).run();
      existingArtifacts.push(artifact);
      artifactsCreated.push(artifact);
    }

    const updatedSource = {
      ...source,
      lastSyncAt: timestamp,
      healthStatus: "healthy" as const,
      syncError: null,
      updatedAt: timestamp,
    };
    db.update(cbSources)
      .set({
        lastSyncAt: updatedSource.lastSyncAt,
        healthStatus: updatedSource.healthStatus,
        syncError: updatedSource.syncError,
        updatedAt: updatedSource.updatedAt,
      })
      .where(eq(cbSources.id, source.id))
      .run();

    return c.json(
      {
        data: {
          source: updatedSource,
          artifactsCreated,
          messagesSeen: body.messages.length,
        },
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "import_failed", message }, 400);
  }
});

app.post("/adapters/github/issues/sync", async (c) => {
  try {
    const body = await c.req.json<SyncGitHubIssuesRequest>();
    const db = getDb();
    const timestamp = now();
    const { repo, issues } = await fetchGitHubIssues(
      requireText(body.repo, "repo"),
      body.state ?? "open",
      body.limit ?? 25
    );
    let source = body.sourceId
      ? db.select().from(cbSources).where(eq(cbSources.id, body.sourceId)).get()
      : null;
    if (body.sourceId && !source) throw new Error("sourceId not found");
    if (!source) {
      source = {
        id: nanoid(12),
        name: body.sourceName ?? `${repo.fullName} GitHub Issues`,
        sourceType: "github_issue" as const,
        area: body.area ?? "development",
        externalRef: `https://github.com/${repo.fullName}/issues`,
        status: "active" as const,
        healthStatus: "unknown" as const,
        owner: body.owner ?? null,
        ownerType: body.owner ? ("human" as const) : ("unknown" as const),
        visibility: body.visibility ?? "internal",
        lastSyncAt: null,
        syncError: null,
        metadata: {
          adapter: "github_issues",
          repo: repo.fullName,
          readOnly: true,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbSources).values(source).run();
    }

    const existingArtifacts = db.select().from(cbArtifacts).all();
    const existingWorkItems = db.select().from(cbWorkItems).all();
    const artifactsCreated = [];
    const workItemsCreated = [];

    for (const issue of issues) {
      const rawRef = issue.html_url;
      let artifact = existingArtifacts.find((item) => item.rawRef === rawRef);
      if (!artifact) {
        const issuePayload = JSON.stringify({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          body: issue.body,
          labels: issue.labels.map((label) => label.name),
          updated_at: issue.updated_at,
        });
        artifact = {
          id: nanoid(12),
          sourceId: source.id,
          artifactType: "github_issue",
          area: body.area ?? source.area,
          title: `#${issue.number} ${issue.title}`,
          summary: issue.body?.trim().slice(0, 500) ?? null,
          contentRef: issue.url,
          rawRef,
          author: issue.user?.login ?? null,
          occurredAt: Date.parse(issue.updated_at || issue.created_at),
          ingestedAt: timestamp,
          hash: stableHash(issuePayload),
          visibility: body.visibility ?? source.visibility,
          provenance: {
            sourceId: source.id,
            rawRef,
            createdFrom: "adapter:github_issues",
            confidence: 1,
            extractedAt: timestamp,
            humanReviewStatus: "pending" as const,
            visibility: body.visibility ?? source.visibility,
            notes: "read_only=true",
          },
          humanReviewStatus: "pending" as const,
          confidence: 1,
          metadata: {
            adapter: "github_issues",
            readOnly: true,
            repo: repo.fullName,
            githubIssueId: issue.id,
            number: issue.number,
            state: issue.state,
            labels: issue.labels.map((label) => label.name),
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            closedAt: issue.closed_at,
          },
        };
        db.insert(cbArtifacts).values(artifact).run();
        existingArtifacts.push(artifact);
        artifactsCreated.push(artifact);
      }

      if (body.createWorkItems ?? true) {
        const externalId = `${repo.fullName}#${issue.number}`;
        const existing = existingWorkItems.find(
          (item) =>
            item.externalProvider === "github" && item.externalId === externalId
        );
        if (!existing) {
          const workItem = {
            id: nanoid(12),
            title: `#${issue.number} ${issue.title}`,
            description: issue.body?.trim().slice(0, 1000) ?? null,
            area: body.area ?? source.area,
            owner: body.owner ?? null,
            ownerType: body.owner ? ("human" as const) : ("unknown" as const),
            status: issue.state === "closed" ? ("done" as const) : ("triage" as const),
            priorityId: body.priorityId ?? null,
            goalId: body.goalId ?? null,
            milestoneId: null,
            externalProvider: "github",
            externalId,
            externalUrl: rawRef,
            riskClass: "unknown" as const,
            dueAt: null,
            blockedReason: null,
            labels: ["github_issue", ...issue.labels.map((label) => label.name)],
            sourceId: source.id,
            artifactId: artifact.id,
            visibility: body.visibility ?? source.visibility,
            provenance: {
              sourceId: source.id,
              rawRef,
              artifactId: artifact.id,
              createdFrom: "adapter:github_issues:work_item",
              confidence: 1,
              extractedAt: timestamp,
              humanReviewStatus: "pending" as const,
              visibility: body.visibility ?? source.visibility,
              notes: "read_only=true",
            },
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          db.insert(cbWorkItems).values(workItem).run();
          existingWorkItems.push(workItem);
          workItemsCreated.push(workItem);
          db.insert(cbArtifactLinks)
            .values({
              id: nanoid(12),
              artifactId: artifact.id,
              targetType: "work_item",
              targetId: workItem.id,
              relationship: "synced_from_github_issue",
              confidence: 1,
              rationale: "Read-only GitHub Issues adapter created canonical WorkItem.",
              createdAt: timestamp,
            })
            .run();
        }
      }
    }

    const updatedSource = {
      ...source,
      lastSyncAt: timestamp,
      healthStatus: "healthy" as const,
      syncError: null,
      updatedAt: timestamp,
    };
    db.update(cbSources)
      .set({
        lastSyncAt: updatedSource.lastSyncAt,
        healthStatus: updatedSource.healthStatus,
        syncError: updatedSource.syncError,
        updatedAt: updatedSource.updatedAt,
      })
      .where(eq(cbSources.id, source.id))
      .run();

    return c.json(
      {
        data: {
          source: updatedSource,
          artifactsCreated,
          workItemsCreated,
          issuesSeen: issues.length,
        },
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "sync_failed", message }, 400);
  }
});

app.post("/adapters/github/pr-ci/sync", async (c) => {
  const db = getDb();
  const timestamp = now();
  const runId = nanoid(12);

  try {
    const body = await c.req.json<SyncGitHubPrCiRequest>();
    const watcher = db
      .select()
      .from(cbWatchers)
      .where(eq(cbWatchers.id, GITHUB_PR_CI_WATCHER_ID))
      .get();
    if (!watcher) throw new Error("GitHub PR/CI watcher seed not found");
    if (watcher.status !== "active") throw new Error("GitHub PR/CI watcher is not active");

    const { repo, pulls } = await fetchGitHubPullRequestsWithCi(
      requireText(body.repo, "repo"),
      body.state ?? "open",
      body.limit ?? 25
    );
    let source = body.sourceId
      ? db.select().from(cbSources).where(eq(cbSources.id, body.sourceId)).get()
      : null;
    if (body.sourceId && !source) throw new Error("sourceId not found");
    if (!source) {
      source =
        db
          .select()
          .from(cbSources)
          .all()
          .find(
            (item) =>
              item.sourceType === "github_repo" &&
              item.externalRef === `https://github.com/${repo.fullName}/pulls`
          ) ?? null;
    }
    if (!source) {
      source = {
        id: nanoid(12),
        name: body.sourceName ?? `${repo.fullName} GitHub PR/CI`,
        sourceType: "github_repo" as const,
        area: body.area ?? "development",
        externalRef: `https://github.com/${repo.fullName}/pulls`,
        status: "active" as const,
        healthStatus: "unknown" as const,
        owner: body.owner ?? null,
        ownerType: body.owner ? ("human" as const) : ("unknown" as const),
        visibility: body.visibility ?? "internal",
        lastSyncAt: null,
        syncError: null,
        metadata: {
          adapter: "github_pr_ci",
          repo: repo.fullName,
          readOnly: true,
          actionPolicy: "observe_only",
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbSources).values(source).run();
    }

    const existingArtifacts = db.select().from(cbArtifacts).all();
    const existingSignals = db.select().from(cbSignals).all();
    const artifactsCreated = [];
    const signalsCreated = [];
    let checksSeen = 0;
    let failingChecksSeen = 0;

    for (const item of pulls) {
      const pull = item.pull;
      const statusState = item.combinedStatus?.state ?? "pending";
      const failingChecks = item.checkRuns.filter((check) =>
        ["failure", "timed_out", "cancelled", "action_required"].includes(
          check.conclusion ?? ""
        )
      );
      const pendingChecks = item.checkRuns.filter(
        (check) => check.status !== "completed" || check.conclusion === null
      );
      checksSeen += item.checkRuns.length + (item.combinedStatus?.statuses.length ?? 0);
      failingChecksSeen += failingChecks.length;

      const rawRef = `${pull.html_url}@${pull.head.sha}`;
      let artifact = existingArtifacts.find((candidate) => candidate.rawRef === rawRef);
      if (!artifact) {
        const payload = JSON.stringify({
          id: pull.id,
          number: pull.number,
          title: pull.title,
          state: pull.state,
          draft: pull.draft ?? false,
          mergedAt: pull.merged_at,
          headSha: pull.head.sha,
          statusState,
          checkRuns: item.checkRuns.map((check) => ({
            id: check.id,
            name: check.name,
            status: check.status,
            conclusion: check.conclusion,
          })),
        });
        artifact = {
          id: nanoid(12),
          sourceId: source.id,
          artifactType: "github_pr_ci",
          area: body.area ?? source.area,
          title: `PR #${pull.number} ${pull.title}`,
          summary:
            pull.body?.trim().slice(0, 500) ??
            `GitHub PR ${pull.number} CI status is ${statusState}.`,
          contentRef: pull.url,
          rawRef,
          author: pull.user?.login ?? null,
          occurredAt: Date.parse(pull.updated_at || pull.created_at),
          ingestedAt: timestamp,
          hash: stableHash(payload),
          visibility: body.visibility ?? source.visibility,
          provenance: {
            sourceId: source.id,
            rawRef,
            createdFrom: "watcher:github_pr_ci:artifact",
            confidence: 1,
            extractedAt: timestamp,
            humanReviewStatus: "pending" as const,
            visibility: body.visibility ?? source.visibility,
            notes: "read_only=true; action_policy=observe_only",
          },
          humanReviewStatus: "pending" as const,
          confidence: 1,
          metadata: {
            adapter: "github_pr_ci",
            watcherId: watcher.id,
            watcherRunId: runId,
            readOnly: true,
            actionPolicy: "observe_only",
            repo: repo.fullName,
            pullRequestId: pull.id,
            number: pull.number,
            state: pull.state,
            draft: pull.draft ?? false,
            mergedAt: pull.merged_at,
            headSha: pull.head.sha,
            headRef: pull.head.ref,
            baseRef: pull.base.ref,
            statusState,
            checkRuns: item.checkRuns.map((check) => ({
              id: check.id,
              name: check.name,
              status: check.status,
              conclusion: check.conclusion,
              htmlUrl: check.html_url,
              detailsUrl: check.details_url,
              startedAt: check.started_at,
              completedAt: check.completed_at,
            })),
          },
        };
        db.insert(cbArtifacts).values(artifact).run();
        existingArtifacts.push(artifact);
        artifactsCreated.push(artifact);
      }

      const needsSignal =
        body.createSignals !== false &&
        (["error", "failure", "pending"].includes(statusState) ||
          failingChecks.length > 0 ||
          pendingChecks.length > 0);
      if (!needsSignal) continue;

      const signalRawRef = `${rawRef}#ci`;
      if (
        existingSignals.some(
          (signal) =>
            signal.rawRef === signalRawRef &&
            signal.metadata?.headSha === pull.head.sha &&
            signal.metadata?.statusState === statusState
        )
      ) {
        continue;
      }
      const severity: SignalSeverity =
        statusState === "error" || statusState === "failure" || failingChecks.length
          ? "critical"
          : "warn";
      const summary = `GitHub PR #${pull.number} CI is ${statusState}; ${failingChecks.length} failing checks, ${pendingChecks.length} pending checks.`;
      const signalId = nanoid(12);
      const tags = [
        "github_pr_ci",
        repo.fullName,
        `pr:${pull.number}`,
        `status:${statusState}`,
      ];
      const envelope = {
        source: "qa" as const,
        scope: "core" as const,
        entity_type: "job" as const,
        entity_id: `${repo.fullName}#${pull.number}:${pull.head.sha}`,
        timestamp,
        summary,
        raw_ref: signalRawRef,
        severity,
        confidence: 0.95,
        tags,
      };
      const signal = {
        id: signalId,
        source: "qa" as const,
        scope: "core" as const,
        entityType: "job" as const,
        entityId: `${repo.fullName}#${pull.number}:${pull.head.sha}`,
        timestamp,
        summary,
        rawRef: signalRawRef,
        severity,
        confidence: 0.95,
        tags,
        area: body.area ?? source.area,
        sourceId: source.id,
        artifactId: artifact.id,
        workItemId: null,
        workflowRunId: null,
        watcherId: watcher.id,
        watcherRunId: runId,
        visibility: body.visibility ?? source.visibility,
        provenance: {
          sourceId: source.id,
          rawRef: signalRawRef,
          artifactId: artifact.id,
          createdFrom: "watcher:github_pr_ci:signal",
          confidence: 0.95,
          extractedAt: timestamp,
          humanReviewStatus: "pending" as const,
          visibility: body.visibility ?? source.visibility,
          notes: "read_only=true; action_policy=observe_only",
        },
        metadata: {
          autoImproveEnvelope: envelope,
          repo: repo.fullName,
          pullRequestNumber: pull.number,
          headSha: pull.head.sha,
          statusState,
          failingChecks: failingChecks.map((check) => check.name),
          pendingChecks: pendingChecks.map((check) => check.name),
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbSignals).values(signal).run();
      db.insert(cbArtifactLinks)
        .values({
          id: nanoid(12),
          artifactId: artifact.id,
          targetType: "signal",
          targetId: signal.id,
          relationship: "generated_signal",
          confidence: signal.confidence,
          rationale: "GitHub PR/CI watcher normalized CI state into an internal signal.",
          createdAt: timestamp,
        })
        .run();
      existingSignals.push(signal);
      signalsCreated.push(signal);
    }

    const finishedAt = now();
    const run = {
      id: runId,
      watcherId: watcher.id,
      startedAt: timestamp,
      finishedAt,
      status: "completed" as const,
      triggerRef: `https://github.com/${repo.fullName}/pulls`,
      sourceIds: [source.id],
      artifactsCreated: artifactsCreated.map((artifact) => artifact.id),
      signalsCreated: signalsCreated.map((signal) => signal.id),
      alignmentFindingsCreated: [],
      workItemsCreated: [],
      guidanceCreated: [],
      workflowRunsLinked: [],
      errorSummary: null,
      actionPolicy: watcher.actionPolicy,
      riskClass: watcher.riskClass,
      provenance: {
        sourceId: source.id,
        rawRef: `https://github.com/${repo.fullName}/pulls`,
        createdFrom: "watcher:github_pr_ci:run",
        confidence: 1,
        extractedAt: timestamp,
        humanReviewStatus: "pending" as const,
        visibility: watcher.visibility,
      },
      createdAt: timestamp,
      updatedAt: finishedAt,
    };
    db.insert(cbWatcherRuns).values(run).run();

    const updatedSource = {
      ...source,
      lastSyncAt: finishedAt,
      healthStatus: "healthy" as const,
      syncError: null,
      metadata: {
        ...(source.metadata ?? {}),
        adapter: "github_pr_ci",
        repo: repo.fullName,
        readOnly: true,
        actionPolicy: "observe_only",
        watcherId: watcher.id,
        lastWatcherRunId: run.id,
        pullsSeen: pulls.length,
        checksSeen,
        failingChecksSeen,
      },
      updatedAt: finishedAt,
    };
    db.update(cbSources)
      .set({
        lastSyncAt: updatedSource.lastSyncAt,
        healthStatus: updatedSource.healthStatus,
        syncError: updatedSource.syncError,
        metadata: updatedSource.metadata,
        updatedAt: updatedSource.updatedAt,
      })
      .where(eq(cbSources.id, source.id))
      .run();
    db.update(cbWatchers)
      .set({
        lastRunAt: finishedAt,
        status: "active",
        updatedAt: finishedAt,
      })
      .where(eq(cbWatchers.id, watcher.id))
      .run();

    return c.json(
      {
        data: {
          source: updatedSource,
          watcherRun: run,
          artifactsCreated,
          signalsCreated,
          pullRequestsSeen: pulls.length,
          checksSeen,
          failingChecksSeen,
        },
      },
      201
    );
  } catch (err) {
    const finishedAt = now();
    const message = err instanceof Error ? err.message : "Unknown error";
    db.insert(cbWatcherRuns)
      .values({
        id: runId,
        watcherId: GITHUB_PR_CI_WATCHER_ID,
        startedAt: timestamp,
        finishedAt,
        status: "failed",
        triggerRef: null,
        sourceIds: [],
        artifactsCreated: [],
        signalsCreated: [],
        alignmentFindingsCreated: [],
        workItemsCreated: [],
        guidanceCreated: [],
        workflowRunsLinked: [],
        errorSummary: message,
        actionPolicy: "observe_only",
        riskClass: "B",
        provenance: {
          createdFrom: "watcher:github_pr_ci:run",
          confidence: 1,
          extractedAt: timestamp,
          humanReviewStatus: "pending",
          visibility: "internal",
        },
        createdAt: timestamp,
        updatedAt: finishedAt,
      })
      .run();
    db.update(cbWatchers)
      .set({
        lastRunAt: finishedAt,
        status: "error",
        updatedAt: finishedAt,
      })
      .where(eq(cbWatchers.id, GITHUB_PR_CI_WATCHER_ID))
      .run();
    return c.json({ error: "sync_failed", message }, 400);
  }
});

app.post("/adapters/github/notifications/sync", async (c) => {
  const db = getDb();
  const timestamp = now();
  const runId = nanoid(12);

  try {
    const body = await c.req.json<SyncGitHubNotificationsRequest>();
    const watcher = db
      .select()
      .from(cbWatchers)
      .where(eq(cbWatchers.id, GITHUB_NOTIFICATIONS_WATCHER_ID))
      .get();
    if (!watcher) throw new Error("GitHub notifications watcher seed not found");
    if (watcher.status !== "active") {
      throw new Error("GitHub notifications watcher is not active");
    }

    const notifications = await fetchGitHubNotifications({
      all: body.all ?? false,
      participating: body.participating ?? false,
      limit: body.limit ?? 25,
    });
    let source = body.sourceId
      ? db.select().from(cbSources).where(eq(cbSources.id, body.sourceId)).get()
      : null;
    if (body.sourceId && !source) throw new Error("sourceId not found");
    if (!source) {
      source =
        db
          .select()
          .from(cbSources)
          .all()
          .find(
            (item) =>
              item.sourceType === "github_repo" &&
              item.externalRef === "https://github.com/notifications"
          ) ?? null;
    }
    if (!source) {
      source = {
        id: nanoid(12),
        name: body.sourceName ?? "GitHub Notifications",
        sourceType: "github_repo" as const,
        area: body.area ?? "development",
        externalRef: "https://github.com/notifications",
        status: "active" as const,
        healthStatus: "unknown" as const,
        owner: body.owner ?? null,
        ownerType: body.owner ? ("human" as const) : ("unknown" as const),
        visibility: body.visibility ?? "internal",
        lastSyncAt: null,
        syncError: null,
        metadata: {
          adapter: "github_notifications",
          readOnly: true,
          actionPolicy: "observe_only",
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbSources).values(source).run();
    }

    const existingArtifacts = db.select().from(cbArtifacts).all();
    const existingSignals = db.select().from(cbSignals).all();
    const artifactsCreated = [];
    const signalsCreated = [];
    const unreadSeen = notifications.filter((item) => item.unread).length;

    for (const notification of notifications) {
      const rawRef = `github://notification/${notification.id}`;
      let artifact = existingArtifacts.find((item) => item.rawRef === rawRef);
      if (!artifact) {
        const payload = JSON.stringify({
          id: notification.id,
          unread: notification.unread,
          reason: notification.reason,
          updatedAt: notification.updated_at,
          subject: notification.subject,
          repository: notification.repository.full_name,
        });
        artifact = {
          id: nanoid(12),
          sourceId: source.id,
          artifactType: "github_notification",
          area: body.area ?? source.area,
          title: `${notification.repository.full_name}: ${notification.subject.title}`,
          summary: `${notification.subject.type} notification (${notification.reason}); unread=${notification.unread}.`,
          contentRef: notification.subject.url ?? notification.url,
          rawRef,
          author: "github",
          occurredAt: Date.parse(notification.updated_at),
          ingestedAt: timestamp,
          hash: stableHash(payload),
          visibility: body.visibility ?? source.visibility,
          provenance: {
            sourceId: source.id,
            rawRef,
            createdFrom: "watcher:github_notifications:artifact",
            confidence: 1,
            extractedAt: timestamp,
            humanReviewStatus: "pending" as const,
            visibility: body.visibility ?? source.visibility,
            notes: "read_only=true; action_policy=observe_only",
          },
          humanReviewStatus: "pending" as const,
          confidence: 1,
          metadata: {
            adapter: "github_notifications",
            watcherId: watcher.id,
            watcherRunId: runId,
            readOnly: true,
            actionPolicy: "observe_only",
            notificationId: notification.id,
            unread: notification.unread,
            reason: notification.reason,
            updatedAt: notification.updated_at,
            lastReadAt: notification.last_read_at,
            repository: notification.repository.full_name,
            repositoryUrl: notification.repository.html_url,
            subjectTitle: notification.subject.title,
            subjectType: notification.subject.type,
            subjectUrl: notification.subject.url,
            latestCommentUrl: notification.subject.latest_comment_url,
          },
        };
        db.insert(cbArtifacts).values(artifact).run();
        existingArtifacts.push(artifact);
        artifactsCreated.push(artifact);
      }

      if (body.createSignals === false || !notification.unread) continue;
      const signalRawRef = `${rawRef}#unread`;
      if (
        existingSignals.some(
          (signal) =>
            signal.rawRef === signalRawRef &&
            signal.metadata?.notificationId === notification.id
        )
      ) {
        continue;
      }
      const severity: SignalSeverity = ["mention", "review_requested"].includes(
        notification.reason
      )
        ? "critical"
        : "warn";
      const summary = `Unread GitHub notification in ${notification.repository.full_name}: ${notification.subject.title} (${notification.reason}).`;
      const signalId = nanoid(12);
      const tags = [
        "github_notification",
        notification.repository.full_name,
        notification.reason,
        notification.subject.type,
      ];
      const envelope = {
        source: "qa" as const,
        scope: "core" as const,
        entity_type: "job" as const,
        entity_id: notification.id,
        timestamp,
        summary,
        raw_ref: signalRawRef,
        severity,
        confidence: 0.95,
        tags,
      };
      const signal = {
        id: signalId,
        source: "qa" as const,
        scope: "core" as const,
        entityType: "job" as const,
        entityId: notification.id,
        timestamp,
        summary,
        rawRef: signalRawRef,
        severity,
        confidence: 0.95,
        tags,
        area: body.area ?? source.area,
        sourceId: source.id,
        artifactId: artifact.id,
        workItemId: null,
        workflowRunId: null,
        watcherId: watcher.id,
        watcherRunId: runId,
        visibility: body.visibility ?? source.visibility,
        provenance: {
          sourceId: source.id,
          rawRef: signalRawRef,
          artifactId: artifact.id,
          createdFrom: "watcher:github_notifications:signal",
          confidence: 0.95,
          extractedAt: timestamp,
          humanReviewStatus: "pending" as const,
          visibility: body.visibility ?? source.visibility,
          notes: "read_only=true; action_policy=observe_only",
        },
        metadata: {
          autoImproveEnvelope: envelope,
          notificationId: notification.id,
          unread: notification.unread,
          reason: notification.reason,
          repository: notification.repository.full_name,
          subjectType: notification.subject.type,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbSignals).values(signal).run();
      db.insert(cbArtifactLinks)
        .values({
          id: nanoid(12),
          artifactId: artifact.id,
          targetType: "signal",
          targetId: signal.id,
          relationship: "generated_signal",
          confidence: signal.confidence,
          rationale:
            "GitHub notifications watcher normalized an unread notification into an internal signal.",
          createdAt: timestamp,
        })
        .run();
      existingSignals.push(signal);
      signalsCreated.push(signal);
    }

    const finishedAt = now();
    const run = {
      id: runId,
      watcherId: watcher.id,
      startedAt: timestamp,
      finishedAt,
      status: "completed" as const,
      triggerRef: "https://github.com/notifications",
      sourceIds: [source.id],
      artifactsCreated: artifactsCreated.map((artifact) => artifact.id),
      signalsCreated: signalsCreated.map((signal) => signal.id),
      alignmentFindingsCreated: [],
      workItemsCreated: [],
      guidanceCreated: [],
      workflowRunsLinked: [],
      errorSummary: null,
      actionPolicy: watcher.actionPolicy,
      riskClass: watcher.riskClass,
      provenance: {
        sourceId: source.id,
        rawRef: "https://github.com/notifications",
        createdFrom: "watcher:github_notifications:run",
        confidence: 1,
        extractedAt: timestamp,
        humanReviewStatus: "pending" as const,
        visibility: watcher.visibility,
      },
      createdAt: timestamp,
      updatedAt: finishedAt,
    };
    db.insert(cbWatcherRuns).values(run).run();

    const updatedSource = {
      ...source,
      lastSyncAt: finishedAt,
      healthStatus: "healthy" as const,
      syncError: null,
      metadata: {
        ...(source.metadata ?? {}),
        adapter: "github_notifications",
        readOnly: true,
        actionPolicy: "observe_only",
        watcherId: watcher.id,
        lastWatcherRunId: run.id,
        notificationsSeen: notifications.length,
        unreadSeen,
      },
      updatedAt: finishedAt,
    };
    db.update(cbSources)
      .set({
        lastSyncAt: updatedSource.lastSyncAt,
        healthStatus: updatedSource.healthStatus,
        syncError: updatedSource.syncError,
        metadata: updatedSource.metadata,
        updatedAt: updatedSource.updatedAt,
      })
      .where(eq(cbSources.id, source.id))
      .run();
    db.update(cbWatchers)
      .set({
        lastRunAt: finishedAt,
        status: "active",
        updatedAt: finishedAt,
      })
      .where(eq(cbWatchers.id, watcher.id))
      .run();

    return c.json(
      {
        data: {
          source: updatedSource,
          watcherRun: run,
          artifactsCreated,
          signalsCreated,
          notificationsSeen: notifications.length,
          unreadSeen,
        },
      },
      201
    );
  } catch (err) {
    const finishedAt = now();
    const message = err instanceof Error ? err.message : "Unknown error";
    db.insert(cbWatcherRuns)
      .values({
        id: runId,
        watcherId: GITHUB_NOTIFICATIONS_WATCHER_ID,
        startedAt: timestamp,
        finishedAt,
        status: "failed",
        triggerRef: null,
        sourceIds: [],
        artifactsCreated: [],
        signalsCreated: [],
        alignmentFindingsCreated: [],
        workItemsCreated: [],
        guidanceCreated: [],
        workflowRunsLinked: [],
        errorSummary: message,
        actionPolicy: "observe_only",
        riskClass: "B",
        provenance: {
          createdFrom: "watcher:github_notifications:run",
          confidence: 1,
          extractedAt: timestamp,
          humanReviewStatus: "pending",
          visibility: "internal",
        },
        createdAt: timestamp,
        updatedAt: finishedAt,
      })
      .run();
    db.update(cbWatchers)
      .set({
        lastRunAt: finishedAt,
        status: "error",
        updatedAt: finishedAt,
      })
      .where(eq(cbWatchers.id, GITHUB_NOTIFICATIONS_WATCHER_ID))
      .run();
    return c.json({ error: "sync_failed", message }, 400);
  }
});

app.get("/priorities", (c) => {
  const data = getDb()
    .select()
    .from(cbStrategicPriorities)
    .orderBy(desc(cbStrategicPriorities.updatedAt))
    .all();
  return c.json({ data, total: data.length });
});

app.post("/priorities", async (c) => {
  try {
    const body = await c.req.json<CreateStrategicPriorityRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      title: requireText(body.title, "title"),
      description: body.description ?? null,
      area: body.area ?? "strategy",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "human",
      status: body.status ?? "active",
      timeHorizon: body.timeHorizon ?? null,
      reviewCadence: body.reviewCadence ?? null,
      successCriteria: body.successCriteria ?? null,
      visibility: body.visibility ?? "internal",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbStrategicPriorities).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/goals", (c) => {
  const data = getDb().select().from(cbGoals).orderBy(desc(cbGoals.updatedAt)).all();
  return c.json({ data, total: data.length });
});

app.post("/goals", async (c) => {
  try {
    const body = await c.req.json<CreateGoalRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      priorityId: body.priorityId ?? null,
      title: requireText(body.title, "title"),
      description: body.description ?? null,
      area: body.area ?? "strategy",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "human",
      targetMetric: body.targetMetric ?? null,
      targetValue: body.targetValue ?? null,
      currentValue: body.currentValue ?? null,
      dueAt: body.dueAt ?? null,
      reviewCadence: body.reviewCadence ?? null,
      status: body.status ?? "not_started",
      confidence: body.confidence ?? 1,
      slaStatus: body.slaStatus ?? "not_set",
      visibility: body.visibility ?? "internal",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbGoals).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/milestones", (c) => {
  const data = getDb()
    .select()
    .from(cbMilestones)
    .orderBy(desc(cbMilestones.updatedAt))
    .all();
  return c.json({ data, total: data.length });
});

app.post("/milestones", async (c) => {
  try {
    const body = await c.req.json<CreateMilestoneRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      goalId: body.goalId ?? null,
      priorityId: body.priorityId ?? null,
      title: requireText(body.title, "title"),
      area: body.area ?? "strategy",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "human",
      dueAt: body.dueAt ?? null,
      status: body.status ?? "not_started",
      readyCriteria: body.readyCriteria ?? null,
      evidenceRequired: body.evidenceRequired ?? null,
      slaStatus: body.slaStatus ?? "not_set",
      visibility: body.visibility ?? "internal",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbMilestones).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/decisions", (c) => {
  const data = getDb()
    .select()
    .from(cbDecisions)
    .orderBy(desc(cbDecisions.updatedAt))
    .limit(100)
    .all();
  return c.json({ data, total: data.length });
});

app.post("/decisions", async (c) => {
  try {
    const body = await c.req.json<CreateDecisionRequest>();
    const db = getDb();
    const timestamp = now();
    const sourceArtifactIds = body.sourceArtifactIds ?? [];
    for (const artifactId of sourceArtifactIds) {
      const artifact = db
        .select()
        .from(cbArtifacts)
        .where(eq(cbArtifacts.id, artifactId))
        .get();
      if (!artifact) throw new Error(`sourceArtifactIds contains unknown artifact ${artifactId}`);
    }
    const priorityIds = body.priorityIds ?? [];
    for (const priorityId of priorityIds) {
      const priority = db
        .select()
        .from(cbStrategicPriorities)
        .where(eq(cbStrategicPriorities.id, priorityId))
        .get();
      if (!priority) throw new Error(`priorityIds contains unknown priority ${priorityId}`);
    }
    const goalIds = body.goalIds ?? [];
    for (const goalId of goalIds) {
      const goal = db.select().from(cbGoals).where(eq(cbGoals.id, goalId)).get();
      if (!goal) throw new Error(`goalIds contains unknown goal ${goalId}`);
    }
    const row = {
      id: nanoid(12),
      title: requireText(body.title, "title"),
      summary: body.summary ?? null,
      rationale: body.rationale ?? null,
      area: body.area ?? "strategy",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "unknown",
      status: body.status ?? "proposed",
      decidedAt: body.decidedAt ?? null,
      sourceArtifactIds,
      priorityIds,
      goalIds,
      visibility: body.visibility ?? "internal",
      provenance: body.provenance ?? {
        rawRef: sourceArtifactIds[0] ?? priorityIds[0] ?? undefined,
        artifactId: sourceArtifactIds[0],
        createdFrom: "api:decision",
        confidence: 1,
        extractedAt: timestamp,
        humanReviewStatus: "approved",
        visibility: body.visibility ?? "internal",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.insert(cbDecisions).values(row).run();
    for (const artifactId of sourceArtifactIds) {
      db.insert(cbArtifactLinks)
        .values({
          id: nanoid(12),
          artifactId,
          targetType: "decision",
          targetId: row.id,
          relationship: "source_for_decision",
          confidence: 1,
          rationale: "Decision created with this artifact as source evidence.",
          createdAt: timestamp,
        })
        .run();
    }
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.put("/decisions/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json<UpdateDecisionRequest>();
    const db = getDb();
    const timestamp = now();
    const existing = db.select().from(cbDecisions).where(eq(cbDecisions.id, id)).get();
    if (!existing) throw new Error("decision not found");

    const priorityIds = body.priorityIds ?? existing.priorityIds;
    for (const priorityId of priorityIds) {
      const priority = db
        .select()
        .from(cbStrategicPriorities)
        .where(eq(cbStrategicPriorities.id, priorityId))
        .get();
      if (!priority) throw new Error(`priorityIds contains unknown priority ${priorityId}`);
    }
    const goalIds = body.goalIds ?? existing.goalIds;
    for (const goalId of goalIds) {
      const goal = db.select().from(cbGoals).where(eq(cbGoals.id, goalId)).get();
      if (!goal) throw new Error(`goalIds contains unknown goal ${goalId}`);
    }

    const status = body.status ?? existing.status;
    const reviewStatus =
      status === "rejected"
        ? ("rejected" as const)
        : status === "proposed"
          ? ("pending" as const)
          : ("approved" as const);
    const notes = [existing.provenance?.notes, body.reviewNote]
      .map((item) => item?.trim())
      .filter(Boolean)
      .join("; ");
    const visibility = body.visibility ?? existing.visibility;
    const row = {
      ...existing,
      title: body.title !== undefined ? requireText(body.title, "title") : existing.title,
      summary: body.summary !== undefined ? body.summary : existing.summary,
      rationale: body.rationale !== undefined ? body.rationale : existing.rationale,
      owner: body.owner !== undefined ? body.owner : existing.owner,
      ownerType: body.ownerType ?? existing.ownerType,
      status,
      decidedAt:
        body.decidedAt !== undefined
          ? body.decidedAt
          : status === "accepted"
            ? (existing.decidedAt ?? timestamp)
            : existing.decidedAt,
      priorityIds,
      goalIds,
      visibility,
      provenance: {
        ...(existing.provenance ?? {}),
        createdFrom: existing.provenance?.createdFrom ?? "api:decision_review",
        confidence: existing.provenance?.confidence ?? 1,
        extractedAt: existing.provenance?.extractedAt ?? timestamp,
        humanReviewStatus: reviewStatus,
        visibility,
        notes: notes || undefined,
      },
      updatedAt: timestamp,
    };

    db.update(cbDecisions).set(row).where(eq(cbDecisions.id, id)).run();
    return c.json({ data: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "update_failed", message }, 400);
  }
});

app.get("/strategy-tradeoffs", (c) => {
  const data = getDb()
    .select()
    .from(cbStrategyTradeoffs)
    .orderBy(desc(cbStrategyTradeoffs.updatedAt))
    .limit(100)
    .all();
  return c.json({ data, total: data.length });
});

app.post("/strategy-tradeoffs", async (c) => {
  try {
    const body = await c.req.json<CreateStrategyTradeoffRequest>();
    const db = getDb();
    const timestamp = now();
    const priorityId = body.priorityId ?? null;
    if (priorityId) {
      const priority = db
        .select()
        .from(cbStrategicPriorities)
        .where(eq(cbStrategicPriorities.id, priorityId))
        .get();
      if (!priority) throw new Error("priorityId not found");
    }
    const decisionId = body.decisionId ?? null;
    if (decisionId) {
      const decision = db.select().from(cbDecisions).where(eq(cbDecisions.id, decisionId)).get();
      if (!decision) throw new Error("decisionId not found");
    }
    const sourceArtifactIds = body.sourceArtifactIds ?? [];
    for (const artifactId of sourceArtifactIds) {
      const artifact = db
        .select()
        .from(cbArtifacts)
        .where(eq(cbArtifacts.id, artifactId))
        .get();
      if (!artifact) throw new Error(`sourceArtifactIds contains unknown artifact ${artifactId}`);
    }
    const row = {
      id: nanoid(12),
      title: requireText(body.title, "title"),
      summary: body.summary ?? null,
      rationale: body.rationale ?? null,
      kind: body.kind ?? "tradeoff",
      area: body.area ?? "strategy",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "unknown",
      status: body.status ?? "proposed",
      priorityId,
      decisionId,
      sourceArtifactIds,
      acceptedOption: body.acceptedOption ?? null,
      rejectedOptions: body.rejectedOptions ?? [],
      constraints: body.constraints ?? [],
      riskClass: body.riskClass ?? "unknown",
      visibility: body.visibility ?? "internal",
      provenance: body.provenance ?? {
        rawRef: sourceArtifactIds[0] ?? decisionId ?? priorityId ?? undefined,
        artifactId: sourceArtifactIds[0],
        createdFrom: "api:strategy_tradeoff",
        confidence: 1,
        extractedAt: timestamp,
        humanReviewStatus: "approved",
        visibility: body.visibility ?? "internal",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.insert(cbStrategyTradeoffs).values(row).run();
    for (const artifactId of sourceArtifactIds) {
      db.insert(cbArtifactLinks)
        .values({
          id: nanoid(12),
          artifactId,
          targetType: "strategy_tradeoff",
          targetId: row.id,
          relationship: "source_for_tradeoff",
          confidence: 1,
          rationale: "Strategy tradeoff created with this artifact as source evidence.",
          createdAt: timestamp,
        })
        .run();
    }
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/work-items", (c) => {
  const status = c.req.query("status");
  let data = getDb()
    .select()
    .from(cbWorkItems)
    .orderBy(desc(cbWorkItems.updatedAt))
    .limit(100)
    .all();
  if (status === "unlinked") {
    data = data.filter((item) => !item.priorityId && !item.goalId);
  } else if (status) {
    data = data.filter((item) => item.status === status);
  }
  return c.json({ data, total: data.length });
});

app.post("/work-items", async (c) => {
  try {
    const body = await c.req.json<CreateWorkItemRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      title: requireText(body.title, "title"),
      description: body.description ?? null,
      area: body.area ?? "unknown",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "unknown",
      status: body.status ?? "new",
      priorityId: body.priorityId ?? null,
      goalId: body.goalId ?? null,
      milestoneId: body.milestoneId ?? null,
      externalProvider: body.externalProvider ?? null,
      externalId: body.externalId ?? null,
      externalUrl: body.externalUrl ?? null,
      riskClass: body.riskClass ?? "unknown",
      dueAt: body.dueAt ?? null,
      blockedReason: body.blockedReason ?? null,
      labels: body.labels ?? [],
      sourceId: body.sourceId ?? null,
      artifactId: body.artifactId ?? null,
      visibility: body.visibility ?? "internal",
      provenance: body.provenance ?? {
        sourceId: body.sourceId ?? undefined,
        artifactId: body.artifactId ?? undefined,
        rawRef: body.externalUrl ?? body.externalId ?? undefined,
        createdFrom: "api",
        confidence: 1,
        extractedAt: timestamp,
        humanReviewStatus: "approved",
        visibility: body.visibility ?? "internal",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbWorkItems).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.post("/extractors/artifact-insights", async (c) => {
  try {
    const body = await c.req.json<ExtractArtifactInsightsRequest>();
    const db = getDb();
    const timestamp = now();
    const artifactId = requireText(body.artifactId, "artifactId");
    const artifact = db.select().from(cbArtifacts).where(eq(cbArtifacts.id, artifactId)).get();
    if (!artifact) throw new Error("artifactId not found");
    const source = db.select().from(cbSources).where(eq(cbSources.id, artifact.sourceId)).get();
    const priorityId = body.priorityId ?? null;
    if (priorityId) {
      const priority = db
        .select()
        .from(cbStrategicPriorities)
        .where(eq(cbStrategicPriorities.id, priorityId))
        .get();
      if (!priority) throw new Error("priorityId not found");
    }
    const goalId = body.goalId ?? null;
    if (goalId) {
      const goal = db.select().from(cbGoals).where(eq(cbGoals.id, goalId)).get();
      if (!goal) throw new Error("goalId not found");
    }
    const workItemId = body.workItemId ?? null;
    if (workItemId) {
      const workItem = db
        .select()
        .from(cbWorkItems)
        .where(eq(cbWorkItems.id, workItemId))
        .get();
      if (!workItem) throw new Error("workItemId not found");
    }

    const mode = body.mode ?? "both";
    const text = candidateText(artifact.title, artifact.summary);
    const owner = body.owner ?? source?.owner ?? null;
    let decision = null;
    let signal = null;
    let decisionCreated = false;
    let signalCreated = false;

    if (mode === "decision" || mode === "both") {
      decision =
        db
          .select()
          .from(cbDecisions)
          .all()
          .find(
            (item) =>
              item.sourceArtifactIds.includes(artifact.id) &&
              item.provenance?.createdFrom === "extractor:artifact_insights"
          ) ?? null;
      if (!decision) {
        decision = {
          id: nanoid(12),
          title: `Decision candidate: ${artifact.title.slice(0, 90)}`,
          summary: text,
          rationale:
            "Candidate extracted from an artifact by extractor v0. Human review is required before treating it as an accepted decision.",
          area: artifact.area,
          owner,
          ownerType: owner ? (source?.ownerType ?? "human") : ("unknown" as const),
          status: "proposed" as const,
          decidedAt: null,
          sourceArtifactIds: [artifact.id],
          priorityIds: priorityId ? [priorityId] : [],
          goalIds: goalId ? [goalId] : [],
          visibility: artifact.visibility,
          provenance: {
            sourceId: artifact.sourceId,
            rawRef: artifact.rawRef,
            artifactId: artifact.id,
            createdFrom: "extractor:artifact_insights",
            confidence: 0.65,
            extractedAt: timestamp,
            humanReviewStatus: "pending" as const,
            visibility: artifact.visibility,
            notes: "candidate=true; extractor=artifact_insights_v0",
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        db.insert(cbDecisions).values(decision).run();
        db.insert(cbArtifactLinks)
          .values({
            id: nanoid(12),
            artifactId: artifact.id,
            targetType: "decision",
            targetId: decision.id,
            relationship: "candidate_source_for_decision",
            confidence: 0.65,
            rationale: "Decision candidate extracted from this artifact.",
            createdAt: timestamp,
          })
          .run();
        decisionCreated = true;
      }
    }

    if (mode === "signal" || mode === "both") {
      signal =
        db
          .select()
          .from(cbSignals)
          .all()
          .find(
            (item) =>
              item.artifactId === artifact.id &&
              item.metadata?.extractor === "artifact_insights_v0"
          ) ?? null;
      if (!signal) {
        signal = {
          id: nanoid(12),
          source: body.signalSource ?? signalSourceFromArtifact(artifact.artifactType),
          scope: "core" as const,
          entityType: "job" as const,
          entityId: workItemId ?? artifact.id,
          timestamp: artifact.occurredAt,
          summary: `Candidate signal: ${text}`,
          rawRef: artifact.rawRef,
          severity: body.signalSeverity ?? "info",
          confidence: 0.65,
          tags: ["candidate", "artifact_extractor_v0", artifact.artifactType],
          area: artifact.area,
          sourceId: artifact.sourceId,
          artifactId: artifact.id,
          workItemId,
          workflowRunId: null,
          watcherId: null,
          watcherRunId: null,
          visibility: artifact.visibility,
          provenance: {
            sourceId: artifact.sourceId,
            rawRef: artifact.rawRef,
            artifactId: artifact.id,
            createdFrom: "extractor:artifact_insights",
            confidence: 0.65,
            extractedAt: timestamp,
            humanReviewStatus: "pending" as const,
            visibility: artifact.visibility,
            notes: "candidate=true; extractor=artifact_insights_v0",
          },
          metadata: {
            extractor: "artifact_insights_v0",
            candidate: true,
            mode,
            priorityId,
            goalId,
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        db.insert(cbSignals).values(signal).run();
        signalCreated = true;
      }
    }

    return c.json(
      {
        data: {
          artifact,
          decision,
          signal,
          decisionCreated,
          signalCreated,
        },
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "extract_failed", message }, 400);
  }
});

app.get("/signals", (c) => {
  const watcherRunId = c.req.query("watcherRunId");
  let data = getDb()
    .select()
    .from(cbSignals)
    .orderBy(desc(cbSignals.timestamp))
    .limit(100)
    .all();
  if (watcherRunId) data = data.filter((signal) => signal.watcherRunId === watcherRunId);
  return c.json({ data, total: data.length });
});

app.post("/signals", async (c) => {
  try {
    const body = await c.req.json<CreateSignalRequest>();
    const timestamp = now();
    const db = getDb();
    const artifact = body.artifactId
      ? db.select().from(cbArtifacts).where(eq(cbArtifacts.id, body.artifactId)).get()
      : null;
    const sourceId = body.sourceId ?? artifact?.sourceId ?? null;
    const source = sourceId
      ? db.select().from(cbSources).where(eq(cbSources.id, sourceId)).get()
      : null;
    const row = {
      id: nanoid(12),
      source: body.source,
      scope: body.scope,
      entityType: body.entityType,
      entityId: requireText(body.entityId, "entityId"),
      timestamp: body.timestamp ?? timestamp,
      summary: requireText(body.summary, "summary"),
      rawRef: requireText(body.rawRef, "rawRef"),
      severity: body.severity ?? "info",
      confidence: body.confidence ?? 1,
      tags: body.tags ?? [],
      area: body.area ?? artifact?.area ?? source?.area ?? "unknown",
      sourceId,
      artifactId: body.artifactId ?? null,
      workItemId: body.workItemId ?? null,
      workflowRunId: body.workflowRunId ?? null,
      watcherId: body.watcherId ?? null,
      watcherRunId: body.watcherRunId ?? null,
      visibility: body.visibility ?? artifact?.visibility ?? source?.visibility ?? "internal",
      provenance: body.provenance ?? {
        sourceId: sourceId ?? undefined,
        rawRef: body.rawRef,
        artifactId: body.artifactId ?? undefined,
        createdFrom: "api:signal",
        confidence: body.confidence ?? 1,
        extractedAt: timestamp,
        humanReviewStatus: "approved",
        visibility: body.visibility ?? artifact?.visibility ?? source?.visibility ?? "internal",
      },
      metadata: body.metadata ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.insert(cbSignals).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.post("/extractors/signal-guidance", async (c) => {
  try {
    const body = await c.req.json<ExtractSignalGuidanceRequest>();
    const db = getDb();
    const timestamp = now();
    const signalId = requireText(body.signalId, "signalId");
    const signal = db.select().from(cbSignals).where(eq(cbSignals.id, signalId)).get();
    if (!signal) throw new Error("signalId not found");

    const workItemId = body.workItemId ?? signal.workItemId ?? null;
    const workItem = workItemId
      ? db.select().from(cbWorkItems).where(eq(cbWorkItems.id, workItemId)).get()
      : null;
    if (workItemId && !workItem) throw new Error("workItemId not found");

    const workflowRunId = body.workflowRunId ?? signal.workflowRunId ?? null;
    const workflowRun = workflowRunId
      ? db.select().from(cbWorkflowRuns).where(eq(cbWorkflowRuns.id, workflowRunId)).get()
      : null;
    if (workflowRunId && !workflowRun) throw new Error("workflowRunId not found");

    const metadataGoalId =
      typeof signal.metadata?.goalId === "string" ? signal.metadata.goalId : null;
    const requestedGoalId = body.goalId ?? workItem?.goalId ?? metadataGoalId;
    const goal = requestedGoalId
      ? db.select().from(cbGoals).where(eq(cbGoals.id, requestedGoalId)).get()
      : null;
    if (requestedGoalId && !goal) throw new Error("goalId not found");

    const metadataPriorityId =
      typeof signal.metadata?.priorityId === "string" ? signal.metadata.priorityId : null;
    const priorityId =
      body.priorityId ?? workItem?.priorityId ?? goal?.priorityId ?? metadataPriorityId;
    if (priorityId) {
      const priority = db
        .select()
        .from(cbStrategicPriorities)
        .where(eq(cbStrategicPriorities.id, priorityId))
        .get();
      if (!priority) throw new Error("priorityId not found");
    }

    const derived = classifyAlignment({
      priorityId,
      goalId: requestedGoalId,
      hasWorkItem: Boolean(workItemId),
    });
    const classification = body.classification ?? derived.classification;
    const artifactIds = signal.artifactId ? [signal.artifactId] : [];
    let alignmentFinding =
      db
        .select()
        .from(cbAlignmentFindings)
        .all()
        .find(
          (item) =>
            item.signalIds.includes(signal.id) &&
            item.provenance?.createdFrom === "extractor:signal_guidance"
        ) ?? null;
    let findingCreated = false;
    if (!alignmentFinding) {
      alignmentFinding = {
        id: nanoid(12),
        priorityId,
        goalId: requestedGoalId,
        artifactIds,
        signalIds: [signal.id],
        workItemId,
        workflowRunId,
        area: signal.area,
        classification,
        rationale: body.classification
          ? `Signal manually classified as ${classification}. ${derived.rationale}`
          : derived.rationale,
        confidence: Math.min(signal.confidence, derived.confidence),
        suggestedAction: derived.suggestedAction,
        severity: signal.severity,
        visibility: signal.visibility,
        provenance: {
          sourceId: signal.sourceId ?? undefined,
          rawRef: signal.rawRef,
          artifactId: signal.artifactId ?? undefined,
          createdFrom: "extractor:signal_guidance",
          confidence: Math.min(signal.confidence, derived.confidence),
          extractedAt: timestamp,
          humanReviewStatus: "pending" as const,
          visibility: signal.visibility,
          notes: "candidate=true; extractor=signal_guidance_v0",
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbAlignmentFindings).values(alignmentFinding).run();
      findingCreated = true;
    }

    let guidanceItem =
      db
        .select()
        .from(cbGuidanceItems)
        .all()
        .find(
          (item) =>
            item.signalId === signal.id &&
            item.provenance?.createdFrom === "extractor:signal_guidance"
        ) ?? null;
    let guidanceCreated = false;
    if (!guidanceItem) {
      guidanceItem = {
        id: nanoid(12),
        audience: body.audience ?? "human",
        priorityId,
        goalId: requestedGoalId,
        findingId: alignmentFinding.id,
        signalId: signal.id,
        workItemId,
        workflowRunId,
        area: signal.area,
        title: `Guidance candidate: ${signal.summary.slice(0, 90)}`,
        action:
          derived.suggestedAction ??
          "Review this signal, confirm the strategy link and decide the next action.",
        dueAt: null,
        severity: signal.severity,
        status: "open" as const,
        feedbackStatus: "pending" as const,
        feedbackNote: null,
        feedbackAt: null,
        generatedFrom: {
          extractor: "signal_guidance_v0",
          signalId: signal.id,
          findingId: alignmentFinding.id,
          classification,
        },
        visibility: signal.visibility,
        provenance: {
          sourceId: signal.sourceId ?? undefined,
          rawRef: signal.rawRef,
          artifactId: signal.artifactId ?? undefined,
          createdFrom: "extractor:signal_guidance",
          confidence: alignmentFinding.confidence,
          extractedAt: timestamp,
          humanReviewStatus: "pending" as const,
          visibility: signal.visibility,
          notes: "candidate=true; extractor=signal_guidance_v0",
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbGuidanceItems).values(guidanceItem).run();
      guidanceCreated = true;
    }

    return c.json(
      {
        data: {
          signal,
          alignmentFinding,
          guidanceItem,
          findingCreated,
          guidanceCreated,
        },
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "extract_failed", message }, 400);
  }
});

app.get("/alignment-findings", (c) => {
  const data = getDb()
    .select()
    .from(cbAlignmentFindings)
    .orderBy(desc(cbAlignmentFindings.updatedAt))
    .limit(100)
    .all();
  return c.json({ data, total: data.length });
});

app.post("/alignment-findings", async (c) => {
  try {
    const body = await c.req.json<CreateAlignmentFindingRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      priorityId: body.priorityId ?? null,
      goalId: body.goalId ?? null,
      artifactIds: body.artifactIds ?? [],
      signalIds: body.signalIds ?? [],
      workItemId: body.workItemId ?? null,
      workflowRunId: body.workflowRunId ?? null,
      area: body.area ?? "unknown",
      classification: body.classification,
      rationale: requireText(body.rationale, "rationale"),
      confidence: body.confidence ?? 1,
      suggestedAction: body.suggestedAction ?? null,
      severity: body.severity ?? "info",
      visibility: body.visibility ?? "internal",
      provenance: body.provenance ?? {
        rawRef: body.signalIds?.[0] ?? body.artifactIds?.[0],
        artifactId: body.artifactIds?.[0],
        createdFrom: "api:alignment_finding",
        confidence: body.confidence ?? 1,
        extractedAt: timestamp,
        humanReviewStatus: "approved",
        visibility: body.visibility ?? "internal",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbAlignmentFindings).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/guidance-items", (c) => {
  const status = c.req.query("status");
  let data = getDb()
    .select()
    .from(cbGuidanceItems)
    .orderBy(desc(cbGuidanceItems.updatedAt))
    .limit(100)
    .all();
  if (status) data = data.filter((item) => item.status === status);
  return c.json({ data, total: data.length });
});

app.post("/guidance-items", async (c) => {
  try {
    const body = await c.req.json<CreateGuidanceItemRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      audience: body.audience ?? "human",
      priorityId: body.priorityId ?? null,
      goalId: body.goalId ?? null,
      findingId: body.findingId ?? null,
      signalId: body.signalId ?? null,
      workItemId: body.workItemId ?? null,
      workflowRunId: body.workflowRunId ?? null,
      area: body.area ?? "unknown",
      title: requireText(body.title, "title"),
      action: requireText(body.action, "action"),
      dueAt: body.dueAt ?? null,
      severity: body.severity ?? "info",
      status: body.status ?? "open",
      feedbackStatus: body.feedbackStatus ?? "pending",
      feedbackNote: body.feedbackNote ?? null,
      feedbackAt: body.feedbackNote || body.feedbackStatus ? timestamp : null,
      generatedFrom: body.generatedFrom ?? null,
      visibility: body.visibility ?? "internal",
      provenance: body.provenance ?? {
        rawRef: body.findingId ?? body.signalId ?? undefined,
        artifactId: undefined,
        createdFrom: "api:guidance_item",
        confidence: 1,
        extractedAt: timestamp,
        humanReviewStatus: "approved",
        visibility: body.visibility ?? "internal",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbGuidanceItems).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.put("/guidance-items/:id", async (c) => {
  try {
    const db = getDb();
    const id = c.req.param("id");
    const body = await c.req.json<UpdateGuidanceItemRequest>();
    const existing = db
      .select()
      .from(cbGuidanceItems)
      .where(eq(cbGuidanceItems.id, id))
      .get();
    if (!existing) throw new Error("guidance item not found");

    const timestamp = now();
    const hasFeedback =
      body.feedbackStatus !== undefined || body.feedbackNote !== undefined;
    const update = {
      audience: body.audience ?? existing.audience,
      action: body.action ?? existing.action,
      dueAt: body.dueAt !== undefined ? body.dueAt : existing.dueAt,
      severity: body.severity ?? existing.severity,
      status: body.status ?? existing.status,
      feedbackStatus: body.feedbackStatus ?? existing.feedbackStatus,
      feedbackNote:
        body.feedbackNote !== undefined ? body.feedbackNote : existing.feedbackNote,
      feedbackAt: hasFeedback ? timestamp : existing.feedbackAt,
      updatedAt: timestamp,
    };

    db.update(cbGuidanceItems)
      .set(update)
      .where(eq(cbGuidanceItems.id, id))
      .run();

    return c.json({
      data: {
        ...existing,
        ...update,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "update_failed", message }, 400);
  }
});

app.get("/agent-contexts", (c) => {
  const data = getDb()
    .select()
    .from(cbAgentContexts)
    .orderBy(desc(cbAgentContexts.updatedAt))
    .limit(100)
    .all();
  return c.json({ data, total: data.length });
});

app.post("/agent-contexts", async (c) => {
  try {
    const body = await c.req.json<CreateAgentContextRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      title: requireText(body.title, "title"),
      targetAgent: requireText(body.targetAgent, "targetAgent"),
      contextType: body.contextType ?? "briefing",
      sourceKnowledgeIds: body.sourceKnowledgeIds ?? [],
      sourceArtifactIds: body.sourceArtifactIds ?? [],
      decisionIds: body.decisionIds ?? [],
      guidanceItemIds: body.guidanceItemIds ?? [],
      workItemIds: body.workItemIds ?? [],
      priorityIds: body.priorityIds ?? [],
      goalIds: body.goalIds ?? [],
      content: requireText(body.content, "content"),
      contentFormat: body.contentFormat ?? "markdown",
      status: body.status ?? "draft",
      validationStatus: body.validationStatus ?? "unvalidated",
      visibility: body.visibility ?? "internal",
      provenance: body.provenance ?? {
        rawRef: body.sourceKnowledgeIds?.[0],
        artifactId: body.sourceArtifactIds?.[0],
        createdFrom: "api:agent_context",
        confidence: 1,
        extractedAt: timestamp,
        humanReviewStatus: "approved",
        visibility: body.visibility ?? "internal",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbAgentContexts).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.post("/agent-contexts/generate", async (c) => {
  try {
    const body = await c.req.json<GenerateAgentContextRequest>();
    const db = getDb();
    const timestamp = now();
    const sourceArtifactIds = body.sourceArtifactIds ?? [];
    const decisionIds = body.decisionIds ?? [];
    const guidanceItemIds = body.guidanceItemIds ?? [];
    const workItemIds = body.workItemIds ?? [];
    const priorityIds = body.priorityIds ?? [];
    const goalIds = body.goalIds ?? [];

    const artifacts = sourceArtifactIds.map((id) => {
      const row = db.select().from(cbArtifacts).where(eq(cbArtifacts.id, id)).get();
      if (!row) throw new Error(`sourceArtifactIds contains unknown artifact ${id}`);
      return row;
    });
    const decisions = decisionIds.map((id) => {
      const row = db.select().from(cbDecisions).where(eq(cbDecisions.id, id)).get();
      if (!row) throw new Error(`decisionIds contains unknown decision ${id}`);
      return row;
    });
    const guidanceItems = guidanceItemIds.map((id) => {
      const row = db.select().from(cbGuidanceItems).where(eq(cbGuidanceItems.id, id)).get();
      if (!row) throw new Error(`guidanceItemIds contains unknown guidance item ${id}`);
      return row;
    });
    const workItems = workItemIds.map((id) => {
      const row = db.select().from(cbWorkItems).where(eq(cbWorkItems.id, id)).get();
      if (!row) throw new Error(`workItemIds contains unknown work item ${id}`);
      return row;
    });
    const priorities = priorityIds.map((id) => {
      const row = db
        .select()
        .from(cbStrategicPriorities)
        .where(eq(cbStrategicPriorities.id, id))
        .get();
      if (!row) throw new Error(`priorityIds contains unknown priority ${id}`);
      return row;
    });
    const goals = goalIds.map((id) => {
      const row = db.select().from(cbGoals).where(eq(cbGoals.id, id)).get();
      if (!row) throw new Error(`goalIds contains unknown goal ${id}`);
      return row;
    });

    const title =
      body.title ??
      `${body.targetAgent} ${body.contextType ?? "briefing"} context`;
    const contextType = body.contextType ?? "briefing";
    const sourceKnowledgeIds = [
      ...sourceArtifactIds.map((id) => `artifact:${id}`),
      ...decisionIds.map((id) => `decision:${id}`),
      ...guidanceItemIds.map((id) => `guidance:${id}`),
      ...workItemIds.map((id) => `work_item:${id}`),
      ...priorityIds.map((id) => `priority:${id}`),
      ...goalIds.map((id) => `goal:${id}`),
    ];
    const content = buildAgentContextContent({
      title,
      targetAgent: body.targetAgent,
      contextType,
      priorities,
      goals,
      decisions,
      guidanceItems,
      workItems,
      artifacts,
    });

    const row = {
      id: nanoid(12),
      title,
      targetAgent: requireText(body.targetAgent, "targetAgent"),
      contextType,
      sourceKnowledgeIds,
      sourceArtifactIds,
      decisionIds,
      guidanceItemIds,
      workItemIds,
      priorityIds,
      goalIds,
      content,
      contentFormat: "markdown",
      status: "ready" as const,
      validationStatus: "needs_review" as const,
      visibility: body.visibility ?? "internal",
      provenance: {
        rawRef: sourceKnowledgeIds[0],
        artifactId: sourceArtifactIds[0],
        createdFrom: "api:agent_context_generator",
        confidence: 0.9,
        extractedAt: timestamp,
        humanReviewStatus: "needs_review" as const,
        visibility: body.visibility ?? "internal",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.insert(cbAgentContexts).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "generate_failed", message }, 400);
  }
});

app.get("/improvement-proposals", (c) => {
  const data = getDb()
    .select()
    .from(cbImprovementProposals)
    .orderBy(desc(cbImprovementProposals.updatedAt))
    .limit(100)
    .all();
  return c.json({ data, total: data.length });
});

app.post("/improvement-proposals", async (c) => {
  try {
    const body = await c.req.json<CreateImprovementProposalRequest>();
    const db = getDb();
    const timestamp = now();
    const signalIds = body.signalIds ?? [];
    for (const id of signalIds) {
      const row = db.select().from(cbSignals).where(eq(cbSignals.id, id)).get();
      if (!row) throw new Error(`signalIds contains unknown signal ${id}`);
    }
    const alignmentFindingIds = body.alignmentFindingIds ?? [];
    for (const id of alignmentFindingIds) {
      const row = db
        .select()
        .from(cbAlignmentFindings)
        .where(eq(cbAlignmentFindings.id, id))
        .get();
      if (!row) throw new Error(`alignmentFindingIds contains unknown finding ${id}`);
    }
    const guidanceItemIds = body.guidanceItemIds ?? [];
    for (const id of guidanceItemIds) {
      const row = db.select().from(cbGuidanceItems).where(eq(cbGuidanceItems.id, id)).get();
      if (!row) throw new Error(`guidanceItemIds contains unknown guidance item ${id}`);
    }
    const agentContextIds = body.agentContextIds ?? [];
    for (const id of agentContextIds) {
      const row = db.select().from(cbAgentContexts).where(eq(cbAgentContexts.id, id)).get();
      if (!row) throw new Error(`agentContextIds contains unknown agent context ${id}`);
    }

    const row = {
      id: nanoid(12),
      title: requireText(body.title, "title"),
      hypothesis: requireText(body.hypothesis, "hypothesis"),
      area: body.area ?? "unknown",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "unknown",
      signalIds,
      alignmentFindingIds,
      guidanceItemIds,
      agentContextIds,
      sourceArtifactIds: body.sourceArtifactIds ?? [],
      workItemIds: body.workItemIds ?? [],
      priorityIds: body.priorityIds ?? [],
      goalIds: body.goalIds ?? [],
      changeClass: body.changeClass ?? "unknown",
      patchRef: body.patchRef ?? null,
      validationPlan: body.validationPlan ?? null,
      impactReview: body.impactReview ?? null,
      status: body.status ?? "proposed",
      promotionStatus: body.promotionStatus ?? "not_ready",
      visibility: body.visibility ?? "internal",
      provenance: body.provenance ?? {
        rawRef:
          signalIds[0] ??
          guidanceItemIds[0] ??
          agentContextIds[0] ??
          body.sourceArtifactIds?.[0],
        artifactId: body.sourceArtifactIds?.[0],
        createdFrom: "api:improvement_proposal",
        confidence: 1,
        extractedAt: timestamp,
        humanReviewStatus: "needs_review",
        visibility: body.visibility ?? "internal",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.insert(cbImprovementProposals).values(row).run();
    for (const artifactId of row.sourceArtifactIds) {
      db.insert(cbArtifactLinks)
        .values({
          id: nanoid(12),
          artifactId,
          targetType: "improvement_proposal",
          targetId: row.id,
          relationship: "source_for_improvement",
          confidence: 1,
          rationale: "ImprovementProposal created with this artifact as evidence.",
          createdAt: timestamp,
        })
        .run();
    }
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.put("/improvement-proposals/:id", async (c) => {
  try {
    const db = getDb();
    const id = c.req.param("id");
    const body = await c.req.json<UpdateImprovementProposalRequest>();
    const existing = db
      .select()
      .from(cbImprovementProposals)
      .where(eq(cbImprovementProposals.id, id))
      .get();
    if (!existing) throw new Error("improvement proposal not found");
    const timestamp = now();
    const update = {
      patchRef: body.patchRef !== undefined ? body.patchRef : existing.patchRef,
      validationPlan:
        body.validationPlan !== undefined
          ? body.validationPlan
          : existing.validationPlan,
      impactReview:
        body.impactReview !== undefined ? body.impactReview : existing.impactReview,
      status: body.status ?? existing.status,
      promotionStatus: body.promotionStatus ?? existing.promotionStatus,
      updatedAt: timestamp,
    };
    db.update(cbImprovementProposals)
      .set(update)
      .where(eq(cbImprovementProposals.id, id))
      .run();
    return c.json({
      data: {
        ...existing,
        ...update,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "update_failed", message }, 400);
  }
});

app.get("/workflow-blueprints", (c) => {
  const data = getDb()
    .select()
    .from(cbWorkflowBlueprints)
    .orderBy(desc(cbWorkflowBlueprints.updatedAt))
    .all();
  return c.json({ data, total: data.length });
});

app.post("/workflow-blueprints", async (c) => {
  try {
    const body = await c.req.json<CreateWorkflowBlueprintRequest>();
    const timestamp = now();
    const stages = body.stages ?? [];
    const row = {
      id: nanoid(12),
      title: requireText(body.title, "title"),
      description: body.description ?? null,
      workflowArea: body.workflowArea ?? "unknown",
      version: body.version ?? "v0",
      status: body.status ?? "draft",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "unknown",
      reviewCadence: body.reviewCadence ?? null,
      riskClass: body.riskClass ?? "unknown",
      stages,
      gates: body.gates ?? stages.map((stage) => stage.gate),
      requiredArtifacts:
        body.requiredArtifacts ?? stages.map((stage) => stage.artifactExpected),
      visibility: body.visibility ?? "internal",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbWorkflowBlueprints).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/workflow-runs", (c) => {
  const data = getDb()
    .select()
    .from(cbWorkflowRuns)
    .orderBy(desc(cbWorkflowRuns.updatedAt))
    .limit(100)
    .all();
  return c.json({ data, total: data.length });
});

app.post("/workflow-runs", async (c) => {
  try {
    const body = await c.req.json<CreateWorkflowRunRequest>();
    const timestamp = now();
    const blueprint = getDb()
      .select()
      .from(cbWorkflowBlueprints)
      .where(eq(cbWorkflowBlueprints.id, requireText(body.blueprintId, "blueprintId")))
      .get();
    if (!blueprint) throw new Error("blueprintId not found");

    const stages = blueprint.stages as WorkflowBlueprintStage[];
    const currentStep = body.currentStep ?? stages[0]?.key ?? null;
    const run = {
      id: nanoid(12),
      blueprintId: blueprint.id,
      workItemId: body.workItemId ?? null,
      title: requireText(body.title, "title"),
      workflowArea: body.workflowArea ?? blueprint.workflowArea,
      status: body.status ?? "planned",
      currentStep,
      gateStatus: body.gateStatus ?? "pending",
      slaStatus: body.slaStatus ?? "not_set",
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "unknown",
      dueAt: body.dueAt ?? null,
      startedAt: body.startedAt ?? null,
      finishedAt: null,
      sourceArtifactIds: body.sourceArtifactIds ?? [],
      visibility: body.visibility ?? blueprint.visibility,
      provenance: body.provenance ?? {
        rawRef: body.workItemId ?? blueprint.id,
        createdFrom: "api",
        confidence: 1,
        extractedAt: timestamp,
        humanReviewStatus: "approved",
        visibility: body.visibility ?? blueprint.visibility,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const db = getDb();
    db.insert(cbWorkflowRuns).values(run).run();
    for (const [index, stage] of stages.entries()) {
      db.insert(cbWorkflowSteps)
        .values({
          id: `${run.id}-${stage.key}`,
          runId: run.id,
          blueprintId: blueprint.id,
          stepKey: stage.key,
          title: stage.title,
          position: index + 1,
          owner: null,
          ownerType: stage.ownerType,
          status: index === 0 ? "running" : "not_started",
          gateStatus: index === 0 ? "pending" : "not_started",
          slaStatus: "not_set",
          dueAt: null,
          evidenceArtifactIds: [],
          requiredArtifact: stage.artifactExpected,
          completedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .run();
    }

    return c.json({ data: run }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/workflow-runs/:id/steps", (c) => {
  const runId = c.req.param("id");
  const data = getDb()
    .select()
    .from(cbWorkflowSteps)
    .where(eq(cbWorkflowSteps.runId, runId))
    .orderBy(cbWorkflowSteps.position)
    .all();
  return c.json({ data, total: data.length });
});

app.get("/artifact-links", (c) => {
  const data = getDb()
    .select()
    .from(cbArtifactLinks)
    .orderBy(desc(cbArtifactLinks.createdAt))
    .limit(200)
    .all();
  return c.json({ data, total: data.length });
});

app.post("/artifact-links", async (c) => {
  try {
    const body = await c.req.json<{
      artifactId: string;
      targetType: string;
      targetId: string;
      relationship?: string;
      confidence?: number;
      rationale?: string | null;
    }>();
    const row = {
      id: nanoid(12),
      artifactId: requireText(body.artifactId, "artifactId"),
      targetType: requireText(body.targetType, "targetType"),
      targetId: requireText(body.targetId, "targetId"),
      relationship: body.relationship ?? "evidence_for",
      confidence: body.confidence ?? 1,
      rationale: body.rationale ?? null,
      createdAt: now(),
    };
    getDb().insert(cbArtifactLinks).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/watchers", (c) => {
  const data = getDb().select().from(cbWatchers).orderBy(desc(cbWatchers.updatedAt)).all();
  return c.json({ data, total: data.length });
});

app.post("/watchers", async (c) => {
  try {
    const body = await c.req.json<CreateWatcherRequest>();
    const timestamp = now();
    const row = {
      id: nanoid(12),
      title: requireText(body.title, "title"),
      description: body.description ?? null,
      sourceIds: body.sourceIds ?? [],
      triggerType: body.triggerType ?? "manual",
      schedule: body.schedule ?? null,
      eventFilter: body.eventFilter ?? null,
      scopeQuery: body.scopeQuery ?? null,
      owner: body.owner ?? null,
      ownerType: body.ownerType ?? "unknown",
      targetWorkflowBlueprintId: body.targetWorkflowBlueprintId ?? null,
      riskClass: body.riskClass ?? "unknown",
      actionPolicy: body.actionPolicy ?? "observe_only",
      status: body.status ?? "active",
      lastRunAt: null,
      nextRunAt: body.nextRunAt ?? null,
      failurePolicy: body.failurePolicy ?? null,
      outputPolicy: body.outputPolicy ?? null,
      visibility: body.visibility ?? "internal",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    getDb().insert(cbWatchers).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.get("/watcher-runs", (c) => {
  const watcherId = c.req.query("watcherId");
  let data = getDb()
    .select()
    .from(cbWatcherRuns)
    .orderBy(desc(cbWatcherRuns.startedAt))
    .limit(100)
    .all();
  if (watcherId) data = data.filter((run) => run.watcherId === watcherId);
  return c.json({ data, total: data.length });
});

app.get("/watchers/:id/runs", (c) => {
  const watcherId = c.req.param("id");
  const data = getDb()
    .select()
    .from(cbWatcherRuns)
    .where(eq(cbWatcherRuns.watcherId, watcherId))
    .orderBy(desc(cbWatcherRuns.startedAt))
    .limit(100)
    .all();
  return c.json({ data, total: data.length });
});

app.post("/watchers/:id/run", async (c) => {
  const db = getDb();
  const watcherId = c.req.param("id");
  const startedAt = now();
  const runId = nanoid(12);

  try {
    const body = (await c.req
      .json<RunWatcherRequest>()
      .catch(() => ({}))) as RunWatcherRequest;
    const watcher = db.select().from(cbWatchers).where(eq(cbWatchers.id, watcherId)).get();
    if (!watcher) throw new Error("watcher not found");
    if (watcher.status !== "active") throw new Error("watcher is not active");
    if (watcher.id === AIOS_BRIEFING_WATCHER_ID) {
      const data = runAiosBriefingWatcher({ watcher, startedAt, runId });
      return c.json({ data }, 201);
    }

    const sourceIds = Array.from(
      new Set([body.sourceId, ...watcher.sourceIds].filter((id): id is string => !!id))
    );
    const sourceId = sourceIds[0];
    if (!sourceId) {
      throw new Error("watcher run requires a sourceId or watcher sourceIds");
    }
    const source = db.select().from(cbSources).where(eq(cbSources.id, sourceId)).get();
    if (!source) throw new Error("sourceId not found");

    const rawRef =
      body.rawRef ??
      body.externalUrl ??
      watcher.scopeQuery ??
      source.externalRef ??
      `${watcher.id}:${runId}`;
    const title = body.title ?? `${watcher.title}: ${source.name}`;
    const summary =
      body.summary ??
      `Manual watcher run for ${watcher.title}. Policy: ${watcher.actionPolicy}.`;
    const artifactId = nanoid(12);
    const provenance = {
      sourceId,
      rawRef,
      createdFrom: `watcher:${watcher.id}`,
      confidence: 1,
      extractedAt: startedAt,
      humanReviewStatus: "approved" as const,
      visibility: watcher.visibility,
      notes: `action_policy=${watcher.actionPolicy}; risk_class=${watcher.riskClass}`,
    };

    const artifact = {
      id: artifactId,
      sourceId,
      artifactType: "watcher_observation",
      area: source.area,
      title,
      summary,
      contentRef: null,
      rawRef,
      author: watcher.owner ?? "AIOS watcher",
      occurredAt: startedAt,
      ingestedAt: startedAt,
      hash: stableHash(`${watcher.id}:${runId}:${sourceId}:${rawRef}:${title}`),
      visibility: watcher.visibility,
      provenance,
      humanReviewStatus: "approved" as const,
      confidence: 1,
      metadata: {
        watcherId: watcher.id,
        watcherRunId: runId,
        triggerType: watcher.triggerType,
        scopeQuery: watcher.scopeQuery,
        actionPolicy: watcher.actionPolicy,
        riskClass: watcher.riskClass,
      },
    };
    db.insert(cbArtifacts).values(artifact).run();

    const requestedGoal = body.goalId
      ? db.select().from(cbGoals).where(eq(cbGoals.id, body.goalId)).get()
      : null;
    if (body.goalId && !requestedGoal) throw new Error("goalId not found");
    const requestedPriorityId = body.priorityId ?? requestedGoal?.priorityId ?? null;
    if (
      requestedPriorityId &&
      !db
        .select()
        .from(cbStrategicPriorities)
        .where(eq(cbStrategicPriorities.id, requestedPriorityId))
        .get()
    ) {
      throw new Error("priorityId not found");
    }

    const createdWorkItems = [];
    const linkedWorkItemIds: string[] = [];
    const linkedWorkItem = body.workItemId
      ? db.select().from(cbWorkItems).where(eq(cbWorkItems.id, body.workItemId)).get()
      : null;
    if (body.workItemId && !linkedWorkItem) throw new Error("workItemId not found");
    if (body.workItemId) {
      linkedWorkItemIds.push(body.workItemId);
      db.insert(cbArtifactLinks)
        .values({
          id: nanoid(12),
          artifactId,
          targetType: "work_item",
          targetId: body.workItemId,
          relationship: "watcher_evidence",
          confidence: 1,
          rationale: `Watcher ${watcher.id} linked evidence to existing WorkItem.`,
          createdAt: startedAt,
        })
        .run();
    }

    if (body.createWorkItem) {
      const workItem = {
        id: nanoid(12),
        title: body.workItemTitle ?? title,
        description: summary,
        area: source.area,
        owner: watcher.owner,
        ownerType: watcher.ownerType,
        status: "triage" as const,
        priorityId: requestedPriorityId,
        goalId: body.goalId ?? null,
        milestoneId: null,
        externalProvider: source.sourceType.startsWith("github") ? "github" : null,
        externalId: body.rawRef ?? null,
        externalUrl:
          body.externalUrl ?? (rawRef.startsWith("http://") || rawRef.startsWith("https://") ? rawRef : null),
        riskClass: watcher.riskClass,
        dueAt: null,
        blockedReason: null,
        labels: ["watcher", watcher.id],
        sourceId,
        artifactId,
        visibility: watcher.visibility,
        provenance: {
          ...provenance,
          artifactId,
          createdFrom: `watcher:${watcher.id}:work_item`,
        },
        createdAt: startedAt,
        updatedAt: startedAt,
      };
      db.insert(cbWorkItems).values(workItem).run();
      createdWorkItems.push(workItem);
      linkedWorkItemIds.push(workItem.id);
      db.insert(cbArtifactLinks)
        .values({
          id: nanoid(12),
          artifactId,
          targetType: "work_item",
          targetId: workItem.id,
          relationship: "created_from_watcher",
          confidence: 1,
          rationale: `Watcher ${watcher.id} created internal WorkItem under ${watcher.actionPolicy}.`,
          createdAt: startedAt,
        })
        .run();
    }

    const workflowRunsLinked = [];
    if (body.workflowRunId) {
      workflowRunsLinked.push(body.workflowRunId);
      db.insert(cbArtifactLinks)
        .values({
          id: nanoid(12),
          artifactId,
          targetType: "workflow_run",
          targetId: body.workflowRunId,
          relationship: "watcher_evidence",
          confidence: 1,
          rationale: `Watcher ${watcher.id} linked evidence to WorkflowRun.`,
          createdAt: startedAt,
        })
        .run();
    }

    const alignmentWorkItem = createdWorkItems[0] ?? linkedWorkItem ?? null;
    const alignmentPriorityId =
      requestedPriorityId ?? alignmentWorkItem?.priorityId ?? requestedGoal?.priorityId ?? null;
    const alignmentGoalId = body.goalId ?? alignmentWorkItem?.goalId ?? null;
    const signalSeverity = body.signalSeverity ?? severityFromRisk(watcher.riskClass);
    const signalId = nanoid(12);
    const signal = {
      id: signalId,
      source: body.signalSource ?? "qa",
      scope: body.signalScope ?? "core",
      entityType: body.signalEntityType ?? "job",
      entityId:
        body.signalEntityId ??
        alignmentWorkItem?.id ??
        body.workflowRunId ??
        artifactId,
      timestamp: startedAt,
      summary: body.summary ?? summary,
      rawRef,
      severity: signalSeverity,
      confidence: 1,
      tags: body.signalTags ?? [
        "watcher",
        watcher.id,
        source.sourceType,
        source.area,
      ],
      area: source.area,
      sourceId,
      artifactId,
      workItemId: alignmentWorkItem?.id ?? null,
      workflowRunId: body.workflowRunId ?? null,
      watcherId: watcher.id,
      watcherRunId: runId,
      visibility: watcher.visibility,
      provenance: {
        ...provenance,
        artifactId,
        createdFrom: `watcher:${watcher.id}:signal`,
      },
      metadata: {
        autoImproveEnvelope: {
          source: body.signalSource ?? "qa",
          scope: body.signalScope ?? "core",
          entity_type: body.signalEntityType ?? "job",
          entity_id:
            body.signalEntityId ??
            alignmentWorkItem?.id ??
            body.workflowRunId ??
            artifactId,
          timestamp: startedAt,
          summary: body.summary ?? summary,
          raw_ref: rawRef,
          severity: signalSeverity,
          confidence: 1,
          tags: body.signalTags ?? [
            "watcher",
            watcher.id,
            source.sourceType,
            source.area,
          ],
        },
      },
      createdAt: startedAt,
      updatedAt: startedAt,
    };
    db.insert(cbSignals).values(signal).run();
    db.insert(cbArtifactLinks)
      .values({
        id: nanoid(12),
        artifactId,
        targetType: "signal",
        targetId: signalId,
        relationship: "generated_signal",
        confidence: 1,
        rationale: `Watcher ${watcher.id} normalized the artifact into an AutoImprove Signal envelope.`,
        createdAt: startedAt,
      })
      .run();

    const alignment = classifyAlignment({
      priorityId: alignmentPriorityId,
      goalId: alignmentGoalId,
      hasWorkItem: !!alignmentWorkItem,
    });
    const findingId = nanoid(12);
    const finding = {
      id: findingId,
      priorityId: alignmentPriorityId,
      goalId: alignmentGoalId,
      artifactIds: [artifactId],
      signalIds: [signalId],
      workItemId: alignmentWorkItem?.id ?? null,
      workflowRunId: body.workflowRunId ?? null,
      area: source.area,
      classification: alignment.classification,
      rationale: alignment.rationale,
      confidence: alignment.confidence,
      suggestedAction: alignment.suggestedAction,
      severity: signalSeverity,
      visibility: watcher.visibility,
      provenance: {
        ...provenance,
        artifactId,
        createdFrom: `watcher:${watcher.id}:alignment_finding`,
      },
      createdAt: startedAt,
      updatedAt: startedAt,
    };
    db.insert(cbAlignmentFindings).values(finding).run();
    db.insert(cbArtifactLinks)
      .values({
        id: nanoid(12),
        artifactId,
        targetType: "alignment_finding",
        targetId: findingId,
        relationship: "classified_against_strategy",
        confidence: alignment.confidence,
        rationale: alignment.rationale,
        createdAt: startedAt,
      })
      .run();

    const guidanceItemId = nanoid(12);
    const guidanceItem = {
      id: guidanceItemId,
      audience: body.guidanceAudience ?? defaultGuidanceAudience(alignment.classification),
      priorityId: alignmentPriorityId,
      goalId: alignmentGoalId,
      findingId,
      signalId,
      workItemId: alignmentWorkItem?.id ?? null,
      workflowRunId: body.workflowRunId ?? null,
      area: source.area,
      title: `Guidance: ${title}`,
      action: body.guidanceAction ?? alignment.suggestedAction,
      dueAt: body.guidanceDueAt ?? null,
      severity: signalSeverity,
      status: "open" as const,
      feedbackStatus: "pending" as const,
      feedbackNote: null,
      feedbackAt: null,
      generatedFrom: {
        watcherId: watcher.id,
        watcherRunId: runId,
        artifactId,
        signalId,
        findingId,
        classification: alignment.classification,
      },
      visibility: watcher.visibility,
      provenance: {
        ...provenance,
        artifactId,
        createdFrom: `watcher:${watcher.id}:guidance_item`,
      },
      createdAt: startedAt,
      updatedAt: startedAt,
    };
    db.insert(cbGuidanceItems).values(guidanceItem).run();
    db.insert(cbArtifactLinks)
      .values({
        id: nanoid(12),
        artifactId,
        targetType: "guidance_item",
        targetId: guidanceItemId,
        relationship: "generated_guidance",
        confidence: alignment.confidence,
        rationale: `Guidance created from finding ${findingId}.`,
        createdAt: startedAt,
      })
      .run();

    const finishedAt = now();
    const run = {
      id: runId,
      watcherId: watcher.id,
      startedAt,
      finishedAt,
      status: "completed" as const,
      triggerRef: rawRef,
      sourceIds,
      artifactsCreated: [artifactId],
      signalsCreated: [signalId],
      alignmentFindingsCreated: [findingId],
      workItemsCreated: createdWorkItems.map((item) => item.id),
      guidanceCreated: [guidanceItemId],
      workflowRunsLinked,
      errorSummary: null,
      actionPolicy: watcher.actionPolicy,
      riskClass: watcher.riskClass,
      provenance: {
        ...provenance,
        artifactId,
        createdFrom: `watcher:${watcher.id}:run`,
      },
      createdAt: startedAt,
      updatedAt: finishedAt,
    };
    db.insert(cbWatcherRuns).values(run).run();
    db.update(cbWatchers)
      .set({
        lastRunAt: finishedAt,
        status: "active",
        updatedAt: finishedAt,
      })
      .where(eq(cbWatchers.id, watcher.id))
      .run();
    db.update(cbSources)
      .set({
        lastSyncAt: finishedAt,
        healthStatus: "healthy",
        syncError: null,
        updatedAt: finishedAt,
      })
      .where(eq(cbSources.id, sourceId))
      .run();

    return c.json(
      {
        data: {
          run,
          artifact,
          signalsCreated: [signal],
          alignmentFindingsCreated: [finding],
          workItemsCreated: createdWorkItems,
          guidanceItemsCreated: [guidanceItem],
          workflowRunsLinked,
        },
      },
      201
    );
  } catch (err) {
    const finishedAt = now();
    const message = err instanceof Error ? err.message : "Unknown error";
    db.insert(cbWatcherRuns)
      .values({
        id: runId,
        watcherId,
        startedAt,
        finishedAt,
        status: "failed",
        triggerRef: null,
        sourceIds: [],
        artifactsCreated: [],
        signalsCreated: [],
        alignmentFindingsCreated: [],
        workItemsCreated: [],
        guidanceCreated: [],
        workflowRunsLinked: [],
        errorSummary: message,
        actionPolicy: "observe_only",
        riskClass: "unknown",
        provenance: {
          createdFrom: `watcher:${watcherId}:run`,
          confidence: 1,
          extractedAt: startedAt,
          humanReviewStatus: "approved",
          visibility: "internal",
        },
        createdAt: startedAt,
        updatedAt: finishedAt,
      })
      .run();
    db.update(cbWatchers)
      .set({
        lastRunAt: finishedAt,
        status: "error",
        updatedAt: finishedAt,
      })
      .where(eq(cbWatchers.id, watcherId))
      .run();
    return c.json({ error: "run_failed", message }, 400);
  }
});

export default app;
