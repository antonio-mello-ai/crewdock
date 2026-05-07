import { createHash } from "node:crypto";
import { setDefaultResultOrder } from "node:dns";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type {
  ActionPolicy,
  AlignmentClassification,
  CompanyBrainArea,
  CompanyBrainAdoptionDashboard,
  CompanyBrainBriefingSection,
  CompanyBrainBriefingSnapshot,
  CompanyBrainCoreReadiness,
  CompanyBrainEvidenceGraph,
  CompanyBrainEvidenceGraphNodeKind,
  CompanyBrainGateClosureRitual,
  CompanyBrainOperatingCadence,
  CompanyBrainOperatingSnapshot,
  CompanyBrainReviewCohesion,
  CompanyBrainSavedAuditViews,
  CompanyBrainTimeline,
  CompanyBrainTimelineEvent,
  CompanyBrainTimelineScope,
  CompanyBrainWritebackPolicySimulator,
  CompanyBrainReviewQueueItem,
  CompanyBrainSourceHealthReport,
  CompanyBrainWritebackAuditTrailResponse,
  CompanyBrainWritebackEvidenceIntegrityGapsResponse,
  CompanyBrainWritebackEvidenceRemediationSuggestionsResponse,
  CompanyBrainWritebackProposalTargetReview,
  CompanyBrainWritebackSafetyDashboard,
  CreateAgentContextRequest,
  CreateArtifactRequest,
  CreateAlignmentFindingRequest,
  CreateDecisionRequest,
  CreateExternalActionProposalRequest,
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
  ExternalActionApprovalStatus,
  ExternalActionAuditEvent,
  ExternalActionDestination,
  ExternalActionExecutionStatus,
  ExternalActionKind,
  ExternalActionProposal,
  GitHubCommentWritebackResponse,
  GitHubCommentWritebackTarget,
  GitHubLabelActionMode,
  GitHubLabelProposalPreviewResponse,
  GitHubLabelWritebackResponse,
  GitHubStatusCheckProposalPreviewResponse,
  GitHubStatusCheckWritebackResponse,
  GitHubStatusCheckTarget,
  GitHubStatusWritebackEvidence,
  ExecuteExternalActionProposalRequest,
  SlackThreadReplyWritebackResponse,
  SlackThreadReplyWritebackTarget,
  ExtractArtifactInsightsRequest,
  ExtractSignalGuidanceRequest,
  GuidanceAudience,
  GenerateAgentContextRequest,
  GenerateDailyAgentHandoffRequest,
  GenerateDailyAgentHandoffResponse,
  ImportLocalDocsRequest,
  ImportSlackMessagesRequest,
  Provenance,
  RunFelhenDemoRequest,
  RunOperatingCadenceRequest,
  RunOperatingCadenceResponse,
  SignalSource,
  SignalSeverity,
  RunWatcherRequest,
  SyncGitHubIssuesRequest,
  SyncGitHubNotificationsRequest,
  SyncGitHubPrCiRequest,
  SyncGitHubPrCiResponse,
  SyncSlackChannelRequest,
  RiskClass,
  UpdateDecisionRequest,
  UpdateExternalActionProposalRequest,
  UpdateGuidanceItemRequest,
  UpdateImprovementProposalRequest,
  Visibility,
  WatcherRunTriggerSource,
  WritebackAdapterKey,
  WritebackEvidencePacket,
  WritebackPreviewReplaySimulator,
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
  cbExternalActionProposals,
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

try {
  setDefaultResultOrder("ipv4first");
} catch {
  // Ignore runtimes that do not support changing DNS result order.
}

function now() {
  return Date.now();
}

function stableHash(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stablePayloadHash(payload: Record<string, unknown>) {
  return stableHash(stableJson(payload));
}

const AIOS_BRIEFING_SOURCE_ID = "source-aios-briefing-v0";
const AIOS_BRIEFING_WATCHER_ID = "watcher-aios-briefing-v0";
const GITHUB_PR_CI_WATCHER_ID = "watcher-github-pr-ci-v0";
const GITHUB_NOTIFICATIONS_WATCHER_ID = "watcher-github-notifications-v0";
const WRITEBACK_PREVIEW_STALE_MS = 24 * 60 * 60 * 1000;
const OPERATING_CADENCE_DEFAULT_REPO =
  process.env.AIOS_OPERATING_CADENCE_GITHUB_REPO ?? "antonio-mello-ai/crewdock";
const OPERATING_CADENCE_WATCHER_IDS = [
  AIOS_BRIEFING_WATCHER_ID,
  GITHUB_PR_CI_WATCHER_ID,
];

interface WatcherTriggerContext {
  triggerSource: WatcherRunTriggerSource;
  scheduleId: string | null;
  scheduledAt: number | null;
}

function watcherScheduleId(watcherId: string) {
  return `company-brain:${watcherId}`;
}

function normalizeTriggerContext(args: {
  watcherId: string;
  triggerSource?: WatcherRunTriggerSource | null;
  scheduleId?: string | null;
  scheduledAt?: number | null;
}): WatcherTriggerContext {
  const triggerSource = args.triggerSource === "schedule" ? "schedule" : "manual";
  return {
    triggerSource,
    scheduleId:
      triggerSource === "schedule"
        ? args.scheduleId ?? watcherScheduleId(args.watcherId)
        : null,
    scheduledAt: triggerSource === "schedule" ? args.scheduledAt ?? now() : null,
  };
}

function scheduleTriggerRef(context: WatcherTriggerContext, runId: string) {
  if (context.triggerSource !== "schedule" || !context.scheduleId) return null;
  return `schedule://${encodeURIComponent(context.scheduleId)}/${runId}`;
}

function triggerNotes(context: WatcherTriggerContext) {
  return [
    `trigger_source=${context.triggerSource}`,
    context.scheduleId ? `schedule_id=${context.scheduleId}` : null,
    context.scheduledAt ? `scheduled_at=${context.scheduledAt}` : null,
  ]
    .filter((value): value is string => !!value)
    .join("; ");
}

function provenanceCreatedFrom(base: string, context: WatcherTriggerContext) {
  if (context.triggerSource !== "schedule") return base;
  if (base.endsWith(":run")) return base.replace(/:run$/, ":scheduled_run");
  if (base.endsWith(":briefing")) {
    return base.replace(/:briefing$/, ":scheduled_briefing");
  }
  if (base.endsWith(":artifact")) {
    return base.replace(/:artifact$/, ":scheduled_artifact");
  }
  if (base.endsWith(":signal")) return base.replace(/:signal$/, ":scheduled_signal");
  return `${base}:scheduled`;
}

function watcherCadenceIntervalMs(watcher: { schedule: string | null }) {
  const schedule = watcher.schedule?.toLowerCase() ?? "";
  if (!schedule) return null;
  const hourMatch = schedule.match(/every\s+(\d+)\s*h/);
  if (hourMatch) return Number(hourMatch[1]) * 60 * 60 * 1000;
  if (schedule.includes("hourly")) return 60 * 60 * 1000;
  if (schedule.includes("every 2 hours")) return 2 * 60 * 60 * 1000;
  if (schedule.includes("every 4 hours")) return 4 * 60 * 60 * 1000;
  if (schedule.includes("daily")) return 24 * 60 * 60 * 1000;
  if (schedule.includes("poll")) return 4 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function nextCadenceRunAt(
  watcher: { schedule: string | null },
  finishedAt: number
) {
  const interval = watcherCadenceIntervalMs(watcher);
  return interval ? finishedAt + interval : null;
}

function isCadenceWatcher(watcher: {
  id: string;
  triggerType: string;
  schedule: string | null;
}) {
  return (
    OPERATING_CADENCE_WATCHER_IDS.includes(watcher.id) ||
    ["schedule", "polling"].includes(watcher.triggerType) ||
    !!watcher.schedule?.toLowerCase().includes("daily") ||
    !!watcher.schedule?.toLowerCase().includes("every")
  );
}

function isScheduledWatcherRun(run: {
  triggerRef: string | null;
  provenance: Provenance | null;
}) {
  const createdFrom = run.provenance?.createdFrom ?? "";
  const notes = run.provenance?.notes ?? "";
  return (
    run.triggerRef?.startsWith("schedule://") ||
    createdFrom.includes(":scheduled_") ||
    notes.includes("trigger_source=schedule")
  );
}

function lastRunForWatcher(
  runs: Array<typeof cbWatcherRuns.$inferSelect>,
  watcherId: string,
  onlyScheduled = false
) {
  return runs
    .filter(
      (run) =>
        run.watcherId === watcherId &&
        (!onlyScheduled || isScheduledWatcherRun(run))
    )
    .sort((a, b) => b.startedAt - a.startedAt)[0];
}

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

interface SlackChatPostMessageResponse extends SlackApiEnvelope {
  channel?: string;
  ts?: string;
  message?: SlackMessagePayload;
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

async function slackApiPost<T extends SlackApiEnvelope>(
  token: string,
  method: string,
  body: Record<string, unknown>
) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": "aios-runtime-company-brain",
    },
    body: JSON.stringify(body),
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

interface GitHubIssueCommentPayload {
  id: number;
  body: string | null;
  html_url: string;
  url: string;
  created_at: string;
  updated_at: string;
  user: { login: string } | null;
}

interface GitHubLabelPayload {
  id: number;
  name: string;
  color?: string;
}

interface GitHubRepoPayload {
  private: boolean;
  html_url?: string;
  default_branch?: string;
}

interface GitHubCommitStatusEntryPayload {
  id: number;
  state: string;
  description: string | null;
  target_url: string | null;
  context: string;
  url: string;
  created_at?: string;
  updated_at?: string;
  creator?: { login: string } | null;
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

async function githubApiRequest<T>(
  path: string,
  args: {
    method?: string;
    params?: Record<string, string>;
    body?: unknown;
    requireToken?: boolean;
  } = {}
) {
  const token = getSecretEnv("GITHUB_TOKEN") ?? getSecretEnv("GH_TOKEN");
  if (args.requireToken && !token) {
    throw new Error("GITHUB_TOKEN or GH_TOKEN is required for GitHub writeback");
  }
  const url = new URL(`https://api.github.com${path}`);
  for (const [key, value] of Object.entries(args.params ?? {})) {
    url.searchParams.set(key, value);
  }
  const method = args.method ?? "GET";
  const maxAttempts = method === "GET" ? 3 : 1;
  let res: Response | null = null;
  let lastFetchError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      res = await fetch(url, {
        method,
        headers: {
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "aios-runtime-company-brain",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: args.body === undefined ? undefined : JSON.stringify(args.body),
      });
      break;
    } catch (err) {
      lastFetchError = err;
      if (attempt < maxAttempts) {
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 400 * attempt));
      }
    }
  }
  if (!res) {
    const message = lastFetchError instanceof Error ? lastFetchError.message : "fetch failed";
    throw new Error(`GitHub API fetch failed: ${message}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub API failed ${res.status}: ${text.slice(0, 300)}`);
  }
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

async function githubApi<T>(path: string, params: Record<string, string> = {}) {
  return githubApiRequest<T>(path, { params });
}

function parseGitHubIssueOrPullRef(ref: string): GitHubCommentWritebackTarget {
  const value = ref.trim();
  const urlMatch = value.match(
    /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/(issues|pull)\/(\d+)(?:[/?#].*)?$/
  );
  if (urlMatch) {
    const [, owner, repo, kind, number] = urlMatch;
    return {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      number: Number(number),
      kind: kind === "pull" ? "pull" : "issue",
      url: `https://github.com/${owner}/${repo}/${kind}/${number}`,
    };
  }

  const fullRefMatch = value.match(/^([^/\s#]+)\/([^/\s#]+)#(\d+)$/);
  if (fullRefMatch) {
    const [, owner, repo, number] = fullRefMatch;
    return {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      number: Number(number),
      kind: "issue_or_pull",
      url: `https://github.com/${owner}/${repo}/issues/${number}`,
    };
  }

  const defaultOwner =
    getSecretEnv("AIOS_GITHUB_DEFAULT_OWNER") ?? getSecretEnv("GITHUB_DEFAULT_OWNER");
  const repoRefMatch = value.match(/^([^/\s#]+)#(\d+)$/);
  if (repoRefMatch && defaultOwner) {
    const [, repo, number] = repoRefMatch;
    return {
      owner: defaultOwner,
      repo,
      fullName: `${defaultOwner}/${repo}`,
      number: Number(number),
      kind: "issue_or_pull",
      url: `https://github.com/${defaultOwner}/${repo}/issues/${number}`,
    };
  }

  throw new Error(
    "destinationRef must be owner/repo#number, repo#number with AIOS_GITHUB_DEFAULT_OWNER, or a GitHub issue/PR URL"
  );
}

function isGitHubCommentAction(actionType: ExternalActionKind) {
  return actionType === "comment" || actionType === "github_comment";
}

function isGitHubLabelAction(actionType: ExternalActionKind) {
  return actionType === "label" || actionType === "github_label";
}

function isGitHubStatusCheckAction(actionType: ExternalActionKind) {
  return actionType === "github_status" || actionType === "github_check";
}

function isSlackThreadReplyAction(actionType: ExternalActionKind) {
  return actionType === "thread_reply" || actionType === "slack_thread_reply";
}

function encodeMarkerValue(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function githubCommentWritebackMarker(proposal: ExternalActionProposal) {
  return `<!-- aios-writeback proposal_id=${encodeMarkerValue(
    proposal.id
  )} idempotency_key=${encodeMarkerValue(proposal.idempotencyKey)} -->`;
}

function externalActionPayloadBody(proposal: ExternalActionProposal) {
  const body = proposal.payload.body;
  if (typeof body !== "string" || !body.trim()) {
    throw new Error("payload.body is required for external writeback");
  }
  return body.trim();
}

function buildGitHubCommentWritebackPreview(proposal: ExternalActionProposal) {
  if (!proposal.destinationRef?.trim()) {
    throw new Error("destinationRef is required for GitHub comment writeback");
  }
  if (!proposal.idempotencyKey.trim()) {
    throw new Error("idempotencyKey is required for GitHub comment writeback");
  }
  const target = parseGitHubIssueOrPullRef(proposal.destinationRef);
  const marker = githubCommentWritebackMarker(proposal);
  const body = `${externalActionPayloadBody(proposal)}\n\n${marker}`;
  return { target, marker, body };
}

function gitHubLabelPayloadLabels(proposal: ExternalActionProposal) {
  const labels = Array.isArray(proposal.payload.labels)
    ? proposal.payload.labels
    : typeof proposal.payload.label === "string"
      ? [proposal.payload.label]
      : [];
  const normalized = uniqueStrings(
    labels.flatMap((label) =>
      typeof label === "string" ? label.split(",").map((item) => item.trim()) : []
    )
  );
  if (!normalized.length) {
    throw new Error("payload.labels must include at least one GitHub label");
  }
  return normalized;
}

function gitHubLabelPayloadMode(
  proposal: ExternalActionProposal
): GitHubLabelActionMode {
  const mode = proposal.payload.mode;
  if (mode === "remove" || mode === "set") return mode;
  return "add";
}

function normalizedGitHubLabelName(label: string) {
  return label.trim().toLowerCase();
}

function githubLabelExternalId(
  target: GitHubCommentWritebackTarget,
  labels: string[]
) {
  return `${target.fullName}#${target.number}:label:add:${labels
    .map(normalizedGitHubLabelName)
    .sort()
    .join(",")}`;
}

function gitHubLabelWritebackAllowlist() {
  const raw =
    getSecretEnv("AIOS_GITHUB_LABEL_WRITEBACK_ALLOWLIST") ??
    "antonio-mello-ai/crewdock#3=enhancement";
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [targetRef, labelsRef = ""] = entry.split("=");
      const target = parseGitHubIssueOrPullRef(targetRef);
      const labels = uniqueStrings(
        labelsRef
          .split("|")
          .map((label) => normalizedGitHubLabelName(label))
          .filter(Boolean)
      );
      return { target, labels };
    });
}

function assertGitHubLabelWritebackAllowlisted(
  target: GitHubCommentWritebackTarget,
  labels: string[]
) {
  const normalizedLabels = labels.map(normalizedGitHubLabelName);
  const allowed = gitHubLabelWritebackAllowlist().some((entry) => {
    const sameTarget =
      entry.target.fullName.toLowerCase() === target.fullName.toLowerCase() &&
      entry.target.number === target.number;
    if (!sameTarget) return false;
    if (!entry.labels.length) return true;
    return normalizedLabels.every((label) => entry.labels.includes(label));
  });
  if (!allowed) {
    throw new Error(
      "GitHub label writeback target is not allowlisted for this v0 executor"
    );
  }
}

function normalizedGitHubStatusContext(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) throw new Error("GitHub status context is required");
  return normalized;
}

function normalizedGitHubSha(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(normalized)) {
    throw new Error("payload.sha must be a full 40 character Git commit SHA");
  }
  return normalized;
}

function gitHubStatusWritebackAllowlist() {
  const raw =
    getSecretEnv("AIOS_GITHUB_STATUS_WRITEBACK_ALLOWLIST") ??
    "antonio-mello-ai/felhen@b9e1057f44988555227ae8031cd48325fb6efc71=aios/dogfood-status:success";
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [targetRef, ruleRef = ""] = entry.split("=");
      const [repoRef, shaRef = ""] = targetRef.split("@");
      const repo = parseGitHubRepoName(repoRef);
      const [contextRef = "", stateRef = "success"] = ruleRef.split(":");
      return {
        repo,
        sha: normalizedGitHubSha(shaRef),
        context: normalizedGitHubStatusContext(contextRef),
        state: normalizeGitHubStatusState(stateRef),
      };
    });
}

function assertGitHubStatusWritebackAllowlisted(args: {
  target: GitHubStatusCheckTarget;
  contextName: string;
  state: string | null;
}) {
  if (!args.target.sha) {
    throw new Error("GitHub status writeback requires an explicit SHA target");
  }
  if (!args.state) {
    throw new Error("GitHub status writeback requires a status state");
  }
  const sha = normalizedGitHubSha(args.target.sha);
  const context = normalizedGitHubStatusContext(args.contextName);
  const state = normalizeGitHubStatusState(args.state);
  const allowed = gitHubStatusWritebackAllowlist().some((entry) => {
    return (
      entry.repo.fullName.toLowerCase() === args.target.repo.toLowerCase() &&
      entry.sha === sha &&
      entry.context === context &&
      entry.state === state
    );
  });
  if (!allowed) {
    throw new Error(
      "GitHub status writeback target, SHA, context or state is not allowlisted"
    );
  }
}

function payloadString(
  payload: Record<string, unknown>,
  keys: string[],
  fieldName: string
) {
  const value = keys.map((key) => payload[key]).find((item) => item !== undefined);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`payload.${fieldName} is required`);
  }
  return value.trim();
}

function payloadOptionalString(payload: Record<string, unknown>, keys: string[]) {
  const value = keys.map((key) => payload[key]).find((item) => item !== undefined);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function payloadNumber(
  payload: Record<string, unknown>,
  keys: string[]
) {
  const value = keys.map((key) => payload[key]).find((item) => item !== undefined);
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}

function parseGitHubRepoName(repo: string) {
  const match = repo.trim().match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!match) throw new Error("payload.repo must be owner/repo");
  return {
    owner: match[1],
    name: match[2],
    fullName: `${match[1]}/${match[2]}`,
  };
}

function gitHubStatusCheckTarget(
  proposal: ExternalActionProposal
): GitHubStatusCheckTarget {
  const repo = parseGitHubRepoName(payloadString(proposal.payload, ["repo"], "repo"));
  const pullNumber = payloadNumber(proposal.payload, ["pullNumber", "pull_number"]);
  const sha = payloadOptionalString(proposal.payload, ["sha", "headSha", "head_sha"]);
  if (!pullNumber && !sha) {
    throw new Error("payload.pullNumber or payload.sha is required");
  }
  const ref = sha ?? `pull/${pullNumber}`;
  return {
    repo: repo.fullName,
    owner: repo.owner,
    name: repo.name,
    pullNumber,
    sha,
    ref,
    url: pullNumber
      ? `https://github.com/${repo.fullName}/pull/${pullNumber}`
      : `https://github.com/${repo.fullName}/commit/${sha}`,
  };
}

function gitHubStatusExternalUrl(
  preview: Omit<GitHubStatusCheckProposalPreviewResponse, "proposal" | "policySummary">
) {
  return preview.targetUrl ?? preview.target.url;
}

function isCompatibleGitHubCommitStatus(
  status: GitHubCommitStatusEntryPayload,
  preview: Omit<GitHubStatusCheckProposalPreviewResponse, "proposal" | "policySummary">
) {
  return (
    status.context === preview.contextName &&
    status.state === preview.state &&
    (status.description ?? "") === preview.description &&
    (status.target_url ?? null) === (gitHubStatusExternalUrl(preview) ?? null)
  );
}

function normalizeGitHubStatusState(value: string) {
  const normalized = value.trim().toLowerCase();
  if (["error", "failure", "pending", "success"].includes(normalized)) {
    return normalized;
  }
  throw new Error("payload.state must be error, failure, pending or success");
}

function normalizeGitHubCheckConclusion(value: string) {
  const normalized = value.trim().toLowerCase();
  if (
    [
      "success",
      "failure",
      "neutral",
      "cancelled",
      "skipped",
      "timed_out",
      "action_required",
    ].includes(normalized)
  ) {
    return normalized;
  }
  throw new Error(
    "payload.conclusion must be success, failure, neutral, cancelled, skipped, timed_out or action_required"
  );
}

function buildGitHubLabelProposalPreview(
  proposal: ExternalActionProposal
): Omit<GitHubLabelProposalPreviewResponse, "proposal" | "policySummary"> {
  if (!proposal.destinationRef?.trim()) {
    throw new Error("destinationRef is required for GitHub label proposal preview");
  }
  if (!proposal.idempotencyKey?.trim()) {
    throw new Error("idempotencyKey is required for GitHub label proposal preview");
  }
  const target = parseGitHubIssueOrPullRef(proposal.destinationRef);
  const labels = gitHubLabelPayloadLabels(proposal);
  const mode = gitHubLabelPayloadMode(proposal);
  const allowlisted = (() => {
    try {
      assertGitHubLabelWritebackAllowlisted(target, labels);
      return true;
    } catch {
      return false;
    }
  })();
  const locallyExecutable =
    proposal.riskClass === "B" &&
    proposal.actionPolicy === "writeback_allowed" &&
    proposal.approvalStatus === "approved" &&
    mode === "add" &&
    labels.length === 1 &&
    allowlisted;
  return {
    target,
    labels,
    mode,
    idempotencyKey: proposal.idempotencyKey,
    dryRun: true,
    status: locallyExecutable ? ("dry_run" as const) : ("preview_only" as const),
    executionBlocked: !locallyExecutable,
    mutationAttempted: false,
    externalId: proposal.externalId,
    externalUrl: proposal.externalUrl,
  };
}

function buildGitHubStatusCheckProposalPreview(
  proposal: ExternalActionProposal
): Omit<GitHubStatusCheckProposalPreviewResponse, "proposal" | "policySummary"> {
  if (!proposal.idempotencyKey?.trim()) {
    throw new Error("idempotencyKey is required for GitHub status/check preview");
  }
  const target = gitHubStatusCheckTarget(proposal);
  const contextName = payloadString(
    proposal.payload,
    proposal.actionType === "github_check" ? ["name", "context"] : ["context", "name"],
    proposal.actionType === "github_check" ? "name" : "context"
  );
  const title = payloadString(proposal.payload, ["title"], "title");
  const summary = payloadString(proposal.payload, ["summary"], "summary");
  const description = payloadString(proposal.payload, ["description"], "description");
  const rationale = payloadString(proposal.payload, ["rationale"], "rationale");
  const targetUrl = payloadOptionalString(proposal.payload, ["targetUrl", "target_url"]);
  const state =
    proposal.actionType === "github_status"
      ? normalizeGitHubStatusState(
          payloadString(proposal.payload, ["state"], "state")
        )
      : payloadOptionalString(proposal.payload, ["state"]);
  const conclusion =
    proposal.actionType === "github_check"
      ? normalizeGitHubCheckConclusion(
          payloadString(proposal.payload, ["conclusion"], "conclusion")
        )
      : payloadOptionalString(proposal.payload, ["conclusion"]);
  const statusAllowlisted = (() => {
    if (proposal.actionType !== "github_status") return false;
    try {
      assertGitHubStatusWritebackAllowlisted({ target, contextName, state });
      return true;
    } catch {
      return false;
    }
  })();
  const locallyExecutable =
    proposal.actionType === "github_status" &&
    proposal.riskClass === "B" &&
    proposal.actionPolicy === "writeback_allowed" &&
    proposal.approvalStatus === "approved" &&
    Boolean(target.sha) &&
    state === "success" &&
    statusAllowlisted;
  return {
    target,
    actionType: proposal.actionType as "github_status" | "github_check",
    contextName,
    state,
    conclusion,
    title,
    summary,
    description,
    targetUrl,
    rationale,
    payloadHash: stablePayloadHash(proposal.payload),
    idempotencyKey: proposal.idempotencyKey,
    riskRationale:
      proposal.actionType === "github_status"
        ? "Risk B allowlisted internal GitHub commit status; execution requires approval, preview, explicit SHA, retry safety and idempotency."
        : "Risk B preview-only operational feedback for PR/CI; no GitHub check-run is created in this cut.",
    dryRun: true,
    status: locallyExecutable ? "dry_run" : "preview_only",
    executionBlocked: !locallyExecutable,
    mutationAttempted: false,
    externalId: proposal.externalId,
    externalUrl: proposal.externalUrl,
  };
}

function validateGitHubCommentWritebackProposal(proposal: ExternalActionProposal) {
  if (proposal.approvalStatus !== "approved") {
    throw new Error("proposal must be approved before GitHub writeback");
  }
  if (!["not_started", "dry_run", "failed"].includes(proposal.executionStatus)) {
    throw new Error("proposal executionStatus must be not_started, dry_run or failed");
  }
  if (proposal.destinationType !== "github") {
    throw new Error("proposal destinationType must be github");
  }
  if (!isGitHubCommentAction(proposal.actionType)) {
    throw new Error("proposal actionType must be comment");
  }
  if (proposal.riskClass !== "B") {
    throw new Error("proposal riskClass must be B");
  }
  if (proposal.actionPolicy !== "writeback_allowed") {
    throw new Error("proposal actionPolicy must be writeback_allowed");
  }
  return buildGitHubCommentWritebackPreview(proposal);
}

function validateGitHubLabelProposalPreview(proposal: ExternalActionProposal) {
  if (proposal.destinationType !== "github") {
    throw new Error("proposal destinationType must be github");
  }
  if (!isGitHubLabelAction(proposal.actionType)) {
    throw new Error("proposal actionType must be label");
  }
  if (proposal.riskClass === "unknown") {
    throw new Error("proposal riskClass must be classified before label preview");
  }
  if (
    proposal.actionPolicy !== "request_human" &&
    proposal.actionPolicy !== "writeback_allowed"
  ) {
    throw new Error(
      "proposal actionPolicy must be request_human or writeback_allowed for label preview"
    );
  }
  if (proposal.approvalStatus === "rejected") {
    throw new Error("rejected label proposals require a new proposal");
  }
  if (proposal.executionStatus === "cancelled") {
    throw new Error("cancelled label proposals require a new proposal");
  }
  return buildGitHubLabelProposalPreview(proposal);
}

function validateGitHubLabelWritebackProposal(proposal: ExternalActionProposal) {
  if (proposal.approvalStatus !== "approved") {
    throw new Error("proposal must be approved before GitHub label writeback");
  }
  if (!["not_started", "dry_run", "failed"].includes(proposal.executionStatus)) {
    throw new Error("proposal executionStatus must be not_started, dry_run or failed");
  }
  if (proposal.destinationType !== "github") {
    throw new Error("proposal destinationType must be github");
  }
  if (!isGitHubLabelAction(proposal.actionType)) {
    throw new Error("proposal actionType must be label");
  }
  if (proposal.riskClass !== "B") {
    throw new Error("proposal riskClass must be B");
  }
  if (proposal.actionPolicy !== "writeback_allowed") {
    throw new Error("proposal actionPolicy must be writeback_allowed");
  }
  const preview = buildGitHubLabelProposalPreview(proposal);
  if (preview.mode !== "add") {
    throw new Error("GitHub label writeback v0 supports mode=add only");
  }
  if (preview.labels.length !== 1) {
    throw new Error("GitHub label writeback v0 supports exactly one label");
  }
  assertGitHubLabelWritebackAllowlisted(preview.target, preview.labels);
  return preview;
}

function validateGitHubStatusCheckProposalPreview(proposal: ExternalActionProposal) {
  if (proposal.destinationType !== "github") {
    throw new Error("proposal destinationType must be github");
  }
  if (!isGitHubStatusCheckAction(proposal.actionType)) {
    throw new Error("proposal actionType must be github_status or github_check");
  }
  if (proposal.riskClass !== "B") {
    throw new Error("proposal riskClass must be B for status/check preview");
  }
  if (
    proposal.actionPolicy !== "request_human" &&
    proposal.actionPolicy !== "writeback_allowed"
  ) {
    throw new Error(
      "proposal actionPolicy must be request_human or writeback_allowed for status/check preview"
    );
  }
  if (proposal.approvalStatus === "rejected") {
    throw new Error("rejected status/check proposals require a new proposal");
  }
  if (proposal.executionStatus === "cancelled") {
    throw new Error("cancelled status/check proposals require a new proposal");
  }
  return buildGitHubStatusCheckProposalPreview(proposal);
}

function validateGitHubStatusWritebackProposal(proposal: ExternalActionProposal) {
  if (proposal.approvalStatus !== "approved") {
    throw new Error("proposal must be approved before GitHub status writeback");
  }
  if (!["not_started", "dry_run", "failed"].includes(proposal.executionStatus)) {
    throw new Error("proposal executionStatus must be not_started, dry_run or failed");
  }
  if (proposal.destinationType !== "github") {
    throw new Error("proposal destinationType must be github");
  }
  if (proposal.actionType !== "github_status") {
    throw new Error("GitHub status writeback v0 supports github_status only");
  }
  if (proposal.riskClass !== "B") {
    throw new Error("proposal riskClass must be B");
  }
  if (proposal.actionPolicy !== "writeback_allowed") {
    throw new Error("proposal actionPolicy must be writeback_allowed");
  }
  const preview = buildGitHubStatusCheckProposalPreview(proposal);
  if (!preview.target.sha) {
    throw new Error("GitHub status writeback v0 requires an explicit SHA");
  }
  if (preview.contextName !== "aios/dogfood-status") {
    throw new Error("GitHub status writeback v0 only supports context aios/dogfood-status");
  }
  if (preview.state !== "success") {
    throw new Error("GitHub status writeback v0 only supports state success");
  }
  assertGitHubStatusWritebackAllowlisted({
    target: preview.target,
    contextName: preview.contextName,
    state: preview.state,
  });
  if (preview.executionBlocked) {
    throw new Error("GitHub status writeback is blocked by local policy");
  }
  return preview;
}

class WritebackExecutionReviewError extends Error {
  review: CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"];

  constructor(
    message: string,
    review: CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"]
  ) {
    super(message);
    this.name = "WritebackExecutionReviewError";
    this.review = review;
  }
}

class WritebackRetryApprovalRequiredError extends WritebackExecutionReviewError {
  constructor(
    message: string,
    review: CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"]
  ) {
    super(message, review);
    this.name = "WritebackRetryApprovalRequiredError";
  }
}

function auditMetadata(event: ExternalActionAuditEvent | null) {
  return (event?.metadata ?? {}) as Record<string, unknown>;
}

function metadataRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function metadataString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function metadataNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function metadataBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function latestAuditEvent(proposal: ExternalActionProposal, eventName: string) {
  return [...proposal.auditTrail]
    .reverse()
    .find((event) => event.event === eventName) ?? null;
}

function previewEventForProposal(proposal: ExternalActionProposal) {
  if (proposal.destinationType === "github" && isGitHubCommentAction(proposal.actionType)) {
    return "github_comment_previewed";
  }
  if (proposal.destinationType === "github" && isGitHubLabelAction(proposal.actionType)) {
    return "github_label_previewed";
  }
  if (
    proposal.destinationType === "github" &&
    isGitHubStatusCheckAction(proposal.actionType)
  ) {
    return "github_status_check_previewed";
  }
  if (proposal.destinationType === "slack" && isSlackThreadReplyAction(proposal.actionType)) {
    return "slack_thread_reply_previewed";
  }
  return null;
}

function currentPayloadHash(proposal: ExternalActionProposal) {
  return stablePayloadHash(proposal.payload);
}

function buildWritebackExecutionReview(
  proposal: ExternalActionProposal,
  generatedAt = now()
): CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"] {
  const previewEvent = previewEventForProposal(proposal);
  const approvalAudit = latestAuditEvent(proposal, "approved");
  const approvalMetadata = auditMetadata(approvalAudit);
  const previewAny = previewEvent ? latestAuditEvent(proposal, previewEvent) : null;
  const previewAfterApproval =
    previewAny && (!proposal.approvedAt || previewAny.at >= proposal.approvedAt)
      ? previewAny
      : null;
  const previewRequest = metadataRecord(auditMetadata(previewAfterApproval).request);
  const currentHash = currentPayloadHash(proposal);
  const payloadHashApproved = metadataString(approvalMetadata.payloadHash);
  const payloadHashPreview = metadataString(previewRequest.payloadHash);
  const destinationRefApproved = metadataString(approvalMetadata.destinationRef);
  const destinationRefPreview = metadataString(previewRequest.destinationRef);
  const idempotencyKeyApproved = metadataString(approvalMetadata.idempotencyKey);
  const idempotencyKeyPreview = metadataString(previewRequest.idempotencyKey);
  const flags: CompanyBrainWritebackSafetyDashboard["items"][number]["reviewFlags"] =
    [];
  const addFlag = (flag: (typeof flags)[number]) => {
    if (!flags.includes(flag)) flags.push(flag);
  };

  if (
    proposal.approvalStatus !== "approved" ||
    !approvalAudit ||
    !proposal.approvedAt ||
    !payloadHashApproved ||
    !destinationRefApproved ||
    !idempotencyKeyApproved
  ) {
    addFlag("needs_reapproval");
    if (proposal.approvalStatus === "approved") addFlag("missing_approval_snapshot");
  }

  if (proposal.approvalStatus === "blocked" || proposal.executionStatus === "blocked") {
    addFlag("blocked");
  }
  if (proposal.approvalStatus === "rejected" || proposal.executionStatus === "cancelled") {
    addFlag("blocked");
  }
  if (proposal.riskClass === "C" || proposal.riskClass === "unknown") {
    addFlag("blocked");
  }
  if (
    proposal.destinationType === "github" &&
    isGitHubStatusCheckAction(proposal.actionType)
  ) {
    try {
      if (buildGitHubStatusCheckProposalPreview(proposal).executionBlocked) {
        addFlag("blocked");
      }
    } catch {
      addFlag("blocked");
    }
  }
  if (
    proposal.destinationType === "github" &&
    isGitHubLabelAction(proposal.actionType) &&
    proposal.approvalStatus === "approved"
  ) {
    try {
      if (buildGitHubLabelProposalPreview(proposal).executionBlocked) {
        addFlag("blocked");
      }
    } catch {
      addFlag("blocked");
    }
  }
  if (
    ((proposal.destinationType === "github" &&
      (isGitHubCommentAction(proposal.actionType) ||
        isGitHubLabelAction(proposal.actionType) ||
        proposal.actionType === "github_status")) ||
      (proposal.destinationType === "slack" &&
        isSlackThreadReplyAction(proposal.actionType))) &&
    proposal.actionPolicy !== "writeback_allowed"
  ) {
    addFlag("blocked");
  }

  if (payloadHashApproved && payloadHashApproved !== currentHash) {
    addFlag("payload_mismatch");
  }
  if (payloadHashPreview && payloadHashPreview !== currentHash) {
    addFlag("payload_mismatch");
  }
  if (
    destinationRefApproved !== null &&
    destinationRefApproved !== proposal.destinationRef
  ) {
    addFlag("destination_mismatch");
  }
  if (destinationRefPreview !== null && destinationRefPreview !== proposal.destinationRef) {
    addFlag("destination_mismatch");
  }
  if (
    idempotencyKeyApproved !== null &&
    idempotencyKeyApproved !== proposal.idempotencyKey
  ) {
    addFlag("idempotency_mismatch");
    addFlag("needs_reapproval");
  }
  if (
    idempotencyKeyPreview !== null &&
    idempotencyKeyPreview !== proposal.idempotencyKey
  ) {
    addFlag("idempotency_mismatch");
    addFlag("needs_preview");
  }

  if (!previewAfterApproval) {
    addFlag("needs_preview");
    addFlag("missing_preview_snapshot");
    if (previewAny && proposal.approvedAt && previewAny.at < proposal.approvedAt) {
      addFlag("preview_before_approval");
    }
  } else if (generatedAt - previewAfterApproval.at > WRITEBACK_PREVIEW_STALE_MS) {
    addFlag("needs_preview");
    addFlag("stale_preview");
  }

  if (hasDuplicateAvoidanceAudit(proposal)) addFlag("duplicate_prevented");
  if (
    ["completed", "executed"].includes(proposal.executionStatus)
  ) {
    addFlag("completed");
  }
  if (proposal.executionStatus === "failed") {
    const unsafe = flags.some((flag) =>
      [
        "needs_reapproval",
        "needs_preview",
        "payload_mismatch",
        "destination_mismatch",
        "idempotency_mismatch",
        "blocked",
      ].includes(flag)
    );
    addFlag(unsafe ? "unsafe_failed" : "retryable_failed");
  }

  let status: CompanyBrainWritebackSafetyDashboard["items"][number]["reviewStatus"] =
    "ready_to_execute";
  if (flags.includes("blocked")) status = "blocked";
  else if (flags.includes("duplicate_prevented")) status = "duplicate_prevented";
  else if (flags.includes("completed")) status = "completed";
  else if (flags.includes("unsafe_failed")) status = "unsafe_failed";
  else if (flags.includes("retryable_failed")) status = "retryable_failed";
  else if (flags.includes("payload_mismatch")) status = "payload_mismatch";
  else if (flags.includes("destination_mismatch")) status = "destination_mismatch";
  else if (flags.includes("needs_reapproval")) status = "needs_reapproval";
  else if (flags.includes("needs_preview")) status = "needs_preview";

  return {
    status,
    flags,
    payloadHashApproved,
    payloadHashPreview,
    payloadHashCurrent: currentHash,
    destinationRefApproved,
    destinationRefPreview,
    destinationRefCurrent: proposal.destinationRef,
    idempotencyKeyApproved,
    idempotencyKeyPreview,
    idempotencyKeyCurrent: proposal.idempotencyKey,
    approvedAt: proposal.approvedAt,
    previewAt: previewAfterApproval?.at ?? null,
    previewEvent,
    actor: approvalAudit?.actor ?? proposal.approvedBy,
    rationale: approvalAudit?.note ?? null,
    staleAfterMs: WRITEBACK_PREVIEW_STALE_MS,
  };
}

function assertWritebackExecutionReview(args: {
  proposal: ExternalActionProposal;
  retryRationale?: string | null;
}) {
  const review = buildWritebackExecutionReview(args.proposal);
  if (review.status === "ready_to_execute") return review;
  if (review.status === "retryable_failed") {
    if (args.retryRationale?.trim()) return review;
    throw new WritebackRetryApprovalRequiredError(
      "failed writeback retry requires a new human retry rationale",
      {
        ...review,
        flags: [...review.flags, "retry_rationale_required"],
        status: "retryable_failed",
      }
    );
  }
  throw new WritebackExecutionReviewError(
    `writeback execution blocked: ${review.status}`,
    review
  );
}

async function fetchGitHubIssueComments(args: GitHubCommentWritebackTarget) {
  const comments: GitHubIssueCommentPayload[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const current = await githubApiRequest<GitHubIssueCommentPayload[]>(
      `/repos/${args.owner}/${args.repo}/issues/${args.number}/comments`,
      {
        requireToken: true,
        params: {
          per_page: "100",
          page: String(page),
        },
      }
    );
    comments.push(...current);
    if (current.length < 100) break;
  }
  return comments;
}

async function fetchGitHubIssueLabels(args: GitHubCommentWritebackTarget) {
  const issue = await githubApiRequest<GitHubIssuePayload>(
    `/repos/${args.owner}/${args.repo}/issues/${args.number}`,
    { requireToken: true }
  );
  return issue.labels.map((label) => label.name);
}

async function assertGitHubRepoLabelsExist(
  target: GitHubCommentWritebackTarget,
  labels: string[]
) {
  await Promise.all(
    labels.map((label) =>
      githubApiRequest<GitHubLabelPayload>(
        `/repos/${target.owner}/${target.repo}/labels/${encodeURIComponent(label)}`,
        { requireToken: true }
      )
    )
  );
}

async function addGitHubIssueLabels(
  target: GitHubCommentWritebackTarget,
  labels: string[]
) {
  return githubApiRequest<GitHubLabelPayload[]>(
    `/repos/${target.owner}/${target.repo}/issues/${target.number}/labels`,
    {
      method: "POST",
      requireToken: true,
      body: { labels },
    }
  );
}

async function assertGitHubStatusRepoPrivate(target: GitHubStatusCheckTarget) {
  const repo = await githubApiRequest<GitHubRepoPayload>(
    `/repos/${target.owner}/${target.name}`,
    { requireToken: true }
  );
  if (!repo.private) {
    throw new Error("GitHub status writeback requires a private repository");
  }
  return repo;
}

async function fetchGitHubCommitStatuses(target: GitHubStatusCheckTarget) {
  if (!target.sha) {
    throw new Error("GitHub status writeback requires an explicit SHA");
  }
  const sha = normalizedGitHubSha(target.sha);
  return githubApiRequest<GitHubCommitStatusEntryPayload[]>(
    `/repos/${target.owner}/${target.name}/commits/${sha}/statuses`,
    {
      requireToken: true,
      params: { per_page: "100" },
    }
  );
}

async function createGitHubCommitStatus(
  preview: Omit<GitHubStatusCheckProposalPreviewResponse, "proposal" | "policySummary">
) {
  if (!preview.target.sha) {
    throw new Error("GitHub status writeback requires an explicit SHA");
  }
  return githubApiRequest<GitHubCommitStatusEntryPayload>(
    `/repos/${preview.target.owner}/${preview.target.name}/statuses/${normalizedGitHubSha(
      preview.target.sha
    )}`,
    {
      method: "POST",
      requireToken: true,
      body: {
        state: preview.state,
        target_url: gitHubStatusExternalUrl(preview),
        description: preview.description,
        context: preview.contextName,
      },
    }
  );
}

function normalizeSlackChannelId(channelId: string) {
  const normalized = channelId.trim().toUpperCase();
  if (/^D[A-Z0-9]+$/.test(normalized)) {
    throw new Error("Slack writeback to DMs is not allowed");
  }
  if (!/^[CG][A-Z0-9]+$/.test(normalized)) {
    throw new Error("Slack destinationRef must include a public/private channel id");
  }
  return normalized;
}

function normalizeSlackThreadTs(threadTs: string) {
  const normalized = threadTs.trim();
  if (/^\d{10,}\.\d+$/.test(normalized)) return normalized;
  const permalinkTs = normalized.match(/^p?(\d{10})(\d{1,9})$/);
  if (permalinkTs) {
    const [, seconds, fraction] = permalinkTs;
    return `${seconds}.${fraction.padEnd(6, "0").slice(0, 6)}`;
  }
  throw new Error("Slack destinationRef must include a valid threadTs timestamp");
}

function slackThreadTarget(channelId: string, threadTs: string) {
  const targetChannelId = normalizeSlackChannelId(channelId);
  const targetThreadTs = normalizeSlackThreadTs(threadTs);
  return {
    channelId: targetChannelId,
    threadTs: targetThreadTs,
    url: `slack://${targetChannelId}/${targetThreadTs}`,
  };
}

function parseSlackThreadRef(ref: string): SlackThreadReplyWritebackTarget {
  const value = ref.trim();
  if (!value) {
    throw new Error("destinationRef is required for Slack thread reply writeback");
  }

  try {
    const url = new URL(value);
    if (url.hostname.includes("slack.com")) {
      const match = url.pathname.match(/\/archives\/([CGD][A-Z0-9]+)\/p(\d{10,})/i);
      if (match) {
        const [, channelId, permalinkTs] = match;
        const threadTs = url.searchParams.get("thread_ts") ?? permalinkTs;
        return slackThreadTarget(channelId, threadTs);
      }
    }
  } catch {
    // Continue with compact ref formats.
  }

  if (value.toLowerCase().startsWith("slack://")) {
    const parts = value
      .replace(/^slack:\/\//i, "")
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);
    const channelIndex = parts.findIndex((part) => /^[CGD][A-Z0-9]+$/i.test(part));
    if (channelIndex >= 0 && parts[channelIndex + 1]) {
      return slackThreadTarget(parts[channelIndex], parts[channelIndex + 1]);
    }
  }

  const keyValueChannel = value.match(/\bchannel(?:Id|_id)?[=:\s]+([CGD][A-Z0-9]+)/i);
  const keyValueThread = value.match(/\bthread(?:Ts|_ts)?[=:\s]+(\d{10,}(?:\.\d+)?)/i);
  if (keyValueChannel && keyValueThread) {
    return slackThreadTarget(keyValueChannel[1], keyValueThread[1]);
  }

  const compact = value.match(/^([CGD][A-Z0-9]+)[/:](\d{10,}(?:\.\d+)?)$/i);
  if (compact) {
    return slackThreadTarget(compact[1], compact[2]);
  }

  throw new Error(
    "destinationRef must be slack://channel/threadTs, channelId:threadTs, channelId/threadTs, or a Slack thread permalink"
  );
}

function slackThreadReplyWritebackMarker(proposal: ExternalActionProposal) {
  return `_aios-writeback proposal=${encodeMarkerValue(
    proposal.id
  )} key=${encodeMarkerValue(proposal.idempotencyKey)}_`;
}

function buildSlackThreadReplyWritebackPreview(proposal: ExternalActionProposal) {
  if (!proposal.destinationRef?.trim()) {
    throw new Error("destinationRef is required for Slack thread reply writeback");
  }
  if (!proposal.idempotencyKey.trim()) {
    throw new Error("idempotencyKey is required for Slack thread reply writeback");
  }
  const target = parseSlackThreadRef(proposal.destinationRef);
  const marker = slackThreadReplyWritebackMarker(proposal);
  const body = `${externalActionPayloadBody(proposal)}\n\n${marker}`;
  return { target, marker, body };
}

function validateSlackThreadReplyWritebackProposal(proposal: ExternalActionProposal) {
  if (proposal.approvalStatus !== "approved") {
    throw new Error("proposal must be approved before Slack writeback");
  }
  if (!["not_started", "dry_run", "failed"].includes(proposal.executionStatus)) {
    throw new Error("proposal executionStatus must be not_started, dry_run or failed");
  }
  if (proposal.destinationType !== "slack") {
    throw new Error("proposal destinationType must be slack");
  }
  if (!isSlackThreadReplyAction(proposal.actionType)) {
    throw new Error("proposal actionType must be thread_reply");
  }
  if (proposal.riskClass !== "B") {
    throw new Error("proposal riskClass must be B");
  }
  if (proposal.actionPolicy !== "writeback_allowed") {
    throw new Error("proposal actionPolicy must be writeback_allowed");
  }
  return buildSlackThreadReplyWritebackPreview(proposal);
}

function slackBotTokenForWriteback() {
  const token = getSecretEnv("SLACK_BOT_TOKEN");
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is required for Slack thread reply writeback");
  }
  if (!token.startsWith("xoxb-")) {
    throw new Error("SLACK_BOT_TOKEN must be a bot token");
  }
  return token;
}

async function fetchSlackThreadReplies(
  token: string,
  target: SlackThreadReplyWritebackTarget
) {
  const result = await slackApi<SlackConversationRepliesResponse>(
    token,
    "conversations.replies",
    {
      channel: target.channelId,
      ts: target.threadTs,
      limit: 200,
    }
  );
  return result.messages ?? [];
}

function assertExistingSlackThread(
  replies: SlackMessagePayload[],
  target: SlackThreadReplyWritebackTarget
) {
  const root = replies.find((message) => message.ts === target.threadTs);
  if (!root) {
    throw new Error("Slack thread root not found or not visible to bot");
  }
  const hasExistingReply = replies.some(
    (message) => message.ts && message.ts !== target.threadTs
  );
  const replyCount = typeof root.reply_count === "number" ? root.reply_count : 0;
  if (!hasExistingReply && replyCount < 1) {
    throw new Error(
      "Slack destinationRef must point to an existing thread with at least one reply"
    );
  }
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

async function runGitHubPrCiWatcherSync(
  body: SyncGitHubPrCiRequest
): Promise<SyncGitHubPrCiResponse> {
  const db = getDb();
  const timestamp = now();
  const runId = nanoid(12);
  const triggerContext = normalizeTriggerContext({
    watcherId: GITHUB_PR_CI_WATCHER_ID,
    triggerSource: body.triggerSource,
    scheduleId: body.scheduleId,
    scheduledAt: body.scheduledAt,
  });

  try {
    const watcher = db
      .select()
      .from(cbWatchers)
      .where(eq(cbWatchers.id, GITHUB_PR_CI_WATCHER_ID))
      .get();
    if (!watcher) throw new Error("GitHub PR/CI watcher seed not found");
    if (!["active", "error"].includes(watcher.status)) {
      throw new Error("GitHub PR/CI watcher is not runnable");
    }

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
            createdFrom:
              triggerContext.triggerSource === "schedule"
                ? "watcher:github_pr_ci:scheduled_artifact"
                : "watcher:github_pr_ci:artifact",
            confidence: 1,
            extractedAt: timestamp,
            humanReviewStatus: "pending" as const,
            visibility: body.visibility ?? source.visibility,
            notes: `read_only=true; action_policy=observe_only; ${triggerNotes(triggerContext)}`,
          },
          humanReviewStatus: "pending" as const,
          confidence: 1,
          metadata: {
            adapter: "github_pr_ci",
            watcherId: watcher.id,
            watcherRunId: runId,
            triggerSource: triggerContext.triggerSource,
            scheduleId: triggerContext.scheduleId,
            scheduledAt: triggerContext.scheduledAt,
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
          createdFrom:
            triggerContext.triggerSource === "schedule"
              ? "watcher:github_pr_ci:scheduled_signal"
              : "watcher:github_pr_ci:signal",
          confidence: 0.95,
          extractedAt: timestamp,
          humanReviewStatus: "pending" as const,
          visibility: body.visibility ?? source.visibility,
          notes: `read_only=true; action_policy=observe_only; ${triggerNotes(triggerContext)}`,
        },
        metadata: {
          autoImproveEnvelope: envelope,
          triggerSource: triggerContext.triggerSource,
          scheduleId: triggerContext.scheduleId,
          scheduledAt: triggerContext.scheduledAt,
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

    if (!artifactsCreated.length) {
      const rawRef = `https://github.com/${repo.fullName}/pulls#poll:${runId}`;
      const payload = JSON.stringify({
        repo: repo.fullName,
        state: body.state ?? "open",
        pullsSeen: pulls.length,
        checksSeen,
        failingChecksSeen,
        runId,
      });
      const artifact = {
        id: nanoid(12),
        sourceId: source.id,
        artifactType: "github_pr_ci_poll",
        area: body.area ?? source.area,
        title: `${repo.fullName} PR/CI scheduled poll`,
        summary: `Scheduled GitHub PR/CI poll observed ${pulls.length} pull requests, ${checksSeen} checks and ${failingChecksSeen} failing checks.`,
        contentRef: `https://github.com/${repo.fullName}/pulls`,
        rawRef,
        author: "github",
        occurredAt: timestamp,
        ingestedAt: timestamp,
        hash: stableHash(payload),
        visibility: body.visibility ?? source.visibility,
        provenance: {
          sourceId: source.id,
          rawRef,
          createdFrom:
            triggerContext.triggerSource === "schedule"
              ? "watcher:github_pr_ci:scheduled_poll_artifact"
              : "watcher:github_pr_ci:poll_artifact",
          confidence: 1,
          extractedAt: timestamp,
          humanReviewStatus: "pending" as const,
          visibility: body.visibility ?? source.visibility,
          notes: `read_only=true; action_policy=observe_only; ${triggerNotes(triggerContext)}`,
        },
        humanReviewStatus: "pending" as const,
        confidence: 1,
        metadata: {
          adapter: "github_pr_ci",
          watcherId: watcher.id,
          watcherRunId: runId,
          triggerSource: triggerContext.triggerSource,
          scheduleId: triggerContext.scheduleId,
          scheduledAt: triggerContext.scheduledAt,
          readOnly: true,
          actionPolicy: "observe_only",
          repo: repo.fullName,
          state: body.state ?? "open",
          pullsSeen: pulls.length,
          checksSeen,
          failingChecksSeen,
        },
      };
      db.insert(cbArtifacts).values(artifact).run();
      artifactsCreated.push(artifact);
    }

    const finishedAt = now();
    const rawRef = `https://github.com/${repo.fullName}/pulls`;
    const triggerRef = scheduleTriggerRef(triggerContext, runId) ?? rawRef;
    const run = {
      id: runId,
      watcherId: watcher.id,
      startedAt: timestamp,
      finishedAt,
      status: "completed" as const,
      triggerRef,
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
        rawRef: triggerRef,
        createdFrom:
          triggerContext.triggerSource === "schedule"
            ? "watcher:github_pr_ci:scheduled_run"
            : "watcher:github_pr_ci:run",
        confidence: 1,
        extractedAt: timestamp,
        humanReviewStatus: "pending" as const,
        visibility: watcher.visibility,
        notes: triggerNotes(triggerContext),
      },
      createdAt: timestamp,
      updatedAt: finishedAt,
    };
    db.insert(cbWatcherRuns).values(run).run();

    const watcherSourceIds = uniqueStrings([...watcher.sourceIds, source.id]);
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
        lastTriggerSource: triggerContext.triggerSource,
        lastScheduleId: triggerContext.scheduleId,
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
        sourceIds: watcherSourceIds,
        lastRunAt: finishedAt,
        nextRunAt:
          triggerContext.triggerSource === "schedule"
            ? nextCadenceRunAt(watcher, finishedAt)
            : watcher.nextRunAt,
        status: "active",
        updatedAt: finishedAt,
      })
      .where(eq(cbWatchers.id, watcher.id))
      .run();

    return {
      source: updatedSource,
      watcherRun: run,
      artifactsCreated,
      signalsCreated,
      pullRequestsSeen: pulls.length,
      checksSeen,
      failingChecksSeen,
    };
  } catch (err) {
    const finishedAt = now();
    const message = err instanceof Error ? err.message : "Unknown error";
    const triggerRef = scheduleTriggerRef(triggerContext, runId);
    const provenance: Provenance = {
      createdFrom:
        triggerContext.triggerSource === "schedule"
          ? "watcher:github_pr_ci:scheduled_run"
          : "watcher:github_pr_ci:run",
      confidence: 1,
      extractedAt: timestamp,
      humanReviewStatus: "pending",
      visibility: "internal",
      notes: triggerNotes(triggerContext),
    };
    if (triggerRef) provenance.rawRef = triggerRef;
    db.insert(cbWatcherRuns)
      .values({
        id: runId,
        watcherId: GITHUB_PR_CI_WATCHER_ID,
        startedAt: timestamp,
        finishedAt,
        status: "failed",
        triggerRef,
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
        provenance,
        createdAt: timestamp,
        updatedAt: finishedAt,
      })
      .run();
    db.update(cbWatchers)
      .set({
        lastRunAt: finishedAt,
        nextRunAt:
          triggerContext.triggerSource === "schedule"
            ? nextCadenceRunAt({ schedule: "every 2 hours" }, finishedAt)
            : null,
        status: "error",
        updatedAt: finishedAt,
      })
      .where(eq(cbWatchers.id, GITHUB_PR_CI_WATCHER_ID))
      .run();
    throw err;
  }
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

function buildDailyAgentHandoffContent(args: {
  title: string;
  targetAgent: string;
  generatedAt: number;
  briefing: CompanyBrainBriefingSnapshot | null;
  gateClosureRitual: CompanyBrainGateClosureRitual;
  operatingCadence: CompanyBrainOperatingCadence;
  sourceHealthReport: CompanyBrainSourceHealthReport;
  guidanceItems: Array<typeof cbGuidanceItems.$inferSelect>;
  decisions: Array<typeof cbDecisions.$inferSelect>;
}) {
  const lines = [
    `# ${args.title}`,
    "",
    `Target agent: ${args.targetAgent}`,
    `Generated at: ${new Date(args.generatedAt).toISOString()}`,
    "",
    "## Operating Contract",
    "- Use Company Brain records as source of truth for this session.",
    "- Preserve provenance for any new evidence, work item, signal or guidance.",
    "- Do not execute external writeback unless an approved proposal and policy gate explicitly allow it.",
    "- Keep close/reopen/merge/deploy/delete/permissions/DM/email/billing actions blocked.",
    "",
    "## Daily State",
    bullet(
      "Operating cadence",
      `${args.operatingCadence.stats.activeScheduledWatcherCount}/${args.operatingCadence.stats.scheduledWatcherCount} scheduled watchers active; stale=${args.operatingCadence.stats.staleCadenceCount}; due=${args.operatingCadence.stats.dueCadenceCount}`
    ),
    bullet(
      "Gate closure",
      `${args.gateClosureRitual.stats.itemCount} items; critical=${args.gateClosureRitual.stats.criticalCount}; pending gates=${args.gateClosureRitual.stats.pendingGateCount}; SLA risk=${args.gateClosureRitual.stats.slaAtRiskCount + args.gateClosureRitual.stats.slaBreachedCount}`
    ),
    bullet(
      "Source health",
      `${args.sourceHealthReport.stats.healthyCount}/${args.sourceHealthReport.stats.sourceCount} healthy; stale=${args.sourceHealthReport.stats.staleCount}; errors=${args.sourceHealthReport.stats.errorCount}`
    ),
    bullet(
      "Latest briefing",
      args.briefing
        ? `${args.briefing.title} (${new Date(args.briefing.generatedAt).toISOString()})`
        : "No briefing artifact available"
    ),
  ];

  if (args.gateClosureRitual.items.length) {
    lines.push("", "## Gate Closure Focus");
    for (const item of args.gateClosureRitual.items.slice(0, 8)) {
      lines.push(
        bullet(
          `${item.kind}: ${item.title} (${item.status}/${item.severity})`,
          item.recommendedAction
        )
      );
    }
  }

  if (args.guidanceItems.length) {
    lines.push("", "## Open Guidance");
    for (const item of args.guidanceItems.slice(0, 8)) {
      lines.push(bullet(`${item.title} (${item.status}/${item.feedbackStatus})`, item.action));
    }
  }

  if (args.decisions.length) {
    lines.push("", "## Pending Decisions");
    for (const decision of args.decisions.slice(0, 6)) {
      lines.push(bullet(`${decision.title} (${decision.status})`, decision.rationale));
    }
  }

  if (args.briefing?.nextSteps.length) {
    lines.push("", "## Briefing Next Steps");
    for (const step of args.briefing.nextSteps.slice(0, 8)) {
      lines.push(`- ${step}`);
    }
  }

  lines.push(
    "",
    "## Session Exit Criteria",
    "- Update durable docs/handoff for any material state change.",
    "- Run relevant validation before commit.",
    "- Leave blocked external mutations documented rather than implicit."
  );

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
  const externalActionProposals = db
    .select()
    .from(cbExternalActionProposals)
    .orderBy(desc(cbExternalActionProposals.updatedAt))
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
    externalActionProposals,
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
  const writebackReviews = new Map(
    data.externalActionProposals.map((proposal) => [
      proposal.id,
      buildWritebackExecutionReview(proposal, generatedAt),
    ])
  );
  const writebackIntegrityGaps = buildWritebackEvidenceIntegrityGaps(
    data,
    writebackReviews,
    generatedAt
  );
  const writebackRemediationSuggestions =
    buildWritebackEvidenceRemediationSuggestions(
      writebackIntegrityGaps,
      generatedAt
    );
  const proposalTargetReview = buildWritebackProposalTargetReview({
    data,
    reviews: writebackReviews,
    generatedAt,
    limit: 500,
  });
  const previewReplaySimulator = buildPreviewReplaySimulator(data);
  const targetObservabilitySummaries = buildWritebackTargetObservabilitySummaries(
    data.externalActionProposals,
    writebackReviews,
    generatedAt
  );
  const operatingCadence = buildOperatingCadence(data);
  const cadenceByWatcherId = new Map(
    operatingCadence.watchers.map((watcher) => [watcher.watcherId, watcher])
  );
  const writebackMaturityFor = (
    writebackProposals: ExternalActionProposal[]
  ): AdoptionProject["writebackMaturity"] => {
    const reviews = writebackProposals.map(
      (proposal) =>
        writebackReviews.get(proposal.id) ??
        buildWritebackExecutionReview(proposal, generatedAt)
    );
    const latestAuditAt = latestTimestamp(
      writebackProposals.map((proposal) => latestExternalActionAudit(proposal)?.at)
    );
    const sortedByAudit = [...writebackProposals].sort(
      (a, b) =>
        (latestExternalActionAudit(b)?.at ?? b.updatedAt) -
        (latestExternalActionAudit(a)?.at ?? a.updatedAt)
    );
    const pendingApprovalCount = writebackProposals.filter(
      (proposal) => proposal.approvalStatus === "pending"
    ).length;
    const approvedCount = writebackProposals.filter(
      (proposal) => proposal.approvalStatus === "approved"
    ).length;
    const completedCount = writebackProposals.filter(isCompletedExternalWriteback).length;
    const completedNoopCount = writebackProposals.filter(hasCompletedNoopAudit).length;
    const failedCount = writebackProposals.filter(
      (proposal) => proposal.executionStatus === "failed"
    ).length;
    const blockedCount = reviews.filter((review) => review.status === "blocked").length;
    const duplicatePreventedCount = writebackProposals.filter(
      hasDuplicateAvoidanceAudit
    ).length;
    const mutationAttemptedCount = writebackProposals.filter(
      hasExternalMutationAttemptAudit
    ).length;
    const staleApprovalCount = writebackProposals.filter((proposal) => {
      const review = writebackReviews.get(proposal.id);
      return (
        proposal.approvalStatus === "approved" &&
        proposal.approvedAt !== null &&
        review?.previewAt === null &&
        generatedAt - proposal.approvedAt > WRITEBACK_PREVIEW_STALE_MS
      );
    }).length;
    const stalePreviewCount = reviews.filter((review) =>
      review.flags.includes("stale_preview")
    ).length;
    const needsReview =
      pendingApprovalCount +
      failedCount +
      blockedCount +
      staleApprovalCount +
      stalePreviewCount;
    let stage: AdoptionProject["writebackMaturity"]["stage"] = "none";
    if (writebackProposals.length) stage = "proposal_created";
    if (pendingApprovalCount) stage = "pending_review";
    if (approvedCount && !pendingApprovalCount) stage = "preview_ready";
    if (completedCount || completedNoopCount || duplicatePreventedCount) {
      stage = "executed_or_noop";
    }
    if (needsReview) stage = "blocked_or_failed";

    return {
      stage,
      proposalCount: writebackProposals.length,
      pendingApprovalCount,
      approvedCount,
      completedCount,
      completedNoopCount,
      failedCount,
      blockedCount,
      duplicatePreventedCount,
      mutationAttemptedCount,
      staleApprovalCount,
      stalePreviewCount,
      latestAuditAt,
      latestExternalUrl:
        sortedByAudit.find((proposal) => proposal.externalUrl)?.externalUrl ?? null,
    };
  };

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
    const writebackProposals = data.externalActionProposals.filter(
      (proposal) =>
        guidanceIds.has(proposal.guidanceItemId) ||
        (proposal.signalId ? signalIds.has(proposal.signalId) : false) ||
        (proposal.findingId ? findingIds.has(proposal.findingId) : false) ||
        (proposal.workItemId ? workItemIds.has(proposal.workItemId) : false) ||
        (proposal.workflowRunId ? workflowRunIds.has(proposal.workflowRunId) : false)
    );
    const writebackMaturity = writebackMaturityFor(writebackProposals);
    const writebackProposalIds = new Set(writebackProposals.map((proposal) => proposal.id));
    const writebackTargetKeys = new Set(
      writebackProposals.map((proposal) => writebackTargetObservabilityBase(proposal).targetKey)
    );
    const projectProposalReviewItems = proposalTargetReview.items.filter((item) =>
      writebackProposalIds.has(item.proposalId)
    );
    const projectIntegrityGaps = writebackIntegrityGaps.filter((gap) =>
      writebackProposalIds.has(gap.proposalId)
    );
    const projectRemediationSuggestions = writebackRemediationSuggestions.filter(
      (suggestion) => writebackProposalIds.has(suggestion.proposalId)
    );
    const projectTargetSummaries = targetObservabilitySummaries.filter((target) =>
      writebackTargetKeys.has(target.targetKey)
    );
    const projectPreviewReplayItems = previewReplaySimulator.items.filter((item) =>
      writebackProposalIds.has(item.proposalId)
    );
    const sourceEvidenceGraph = buildCompanyBrainEvidenceGraph({
      data,
      rootKind: "source",
      rootId: source.id,
      limit: 250,
    });
    const sourceTimeline = buildCompanyBrainTimeline({
      data,
      scope: "source",
      id: source.id,
      limit: 100,
    });
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
    const sourceWatchers = data.watchers.filter((watcher) =>
      watcher.sourceIds.includes(source.id)
    );
    const sourceCadenceWatchers = sourceWatchers
      .map((watcher) => cadenceByWatcherId.get(watcher.id))
      .filter(
        (
          watcher
        ): watcher is CompanyBrainOperatingCadence["watchers"][number] =>
          !!watcher && watcher.cadenceStatus !== "not_scheduled"
      );
    const sourceCadenceNeedsAttention = sourceCadenceWatchers.filter((watcher) =>
      ["due", "stale", "error"].includes(watcher.cadenceStatus)
    );
    const proposalReviewNeedsActionCount = projectProposalReviewItems.filter((item) =>
      [
        "ready_to_execute",
        "needs_preview",
        "needs_reapproval",
        "retryable_failed",
        "unsafe_failed",
        "payload_mismatch",
        "destination_mismatch",
        "blocked",
      ].includes(item.reviewStatus)
    ).length;
    const previewBlockedCount = projectPreviewReplayItems.filter(
      (item) => item.preview.executionBlocked || !item.preview.available
    ).length;
    const replayTerminalCount = projectPreviewReplayItems.filter(
      (item) => item.replay.terminalState
    ).length;
    const retryNeedsRationaleCount = projectPreviewReplayItems.filter(
      (item) => item.replay.manualRetryRequiresRationale
    ).length;
    const projectExternalWriteEventCount =
      sourceTimeline.stats.externalWriteEventCount +
      writebackMaturity.mutationAttemptedCount;
    const auditProblemCount =
      proposalReviewNeedsActionCount +
      projectIntegrityGaps.length +
      projectRemediationSuggestions.length +
      previewBlockedCount +
      retryNeedsRationaleCount +
      sourceEvidenceGraph.stats.orphanNodeCount;
    let auditReadinessStage: AdoptionProject["auditReadiness"]["stage"] =
      "not_started";
    if (artifacts.length || workItems.length) auditReadinessStage = "evidence_ready";
    if (workflowRuns.length || signals.length || guidance.length || writebackProposals.length) {
      auditReadinessStage = "review_ready";
    }
    if (
      (writebackMaturity.completedCount ||
        writebackMaturity.completedNoopCount ||
        writebackMaturity.duplicatePreventedCount) &&
      !auditProblemCount
    ) {
      auditReadinessStage = "execution_ready";
    }
    if (auditProblemCount) auditReadinessStage = "needs_attention";
    const auditReadinessScore = Math.max(
      0,
      Math.min(
        100,
        (artifacts.length ? 20 : 0) +
          (workItems.length ? 15 : 0) +
          (workflowRuns.length ? 15 : 0) +
          (signals.length || guidance.length ? 15 : 0) +
          (writebackProposals.length ? 15 : 0) +
          (writebackMaturity.completedCount ||
          writebackMaturity.completedNoopCount ||
          writebackMaturity.duplicatePreventedCount
            ? 10
            : 0) +
          (auditProblemCount ? 0 : 10) -
          Math.min(40, auditProblemCount * 8)
      )
    );
    const auditNextAction =
      projectIntegrityGaps.length > 0
        ? `Repair ${projectIntegrityGaps.length} evidence integrity gaps.`
        : projectRemediationSuggestions.length > 0
          ? `Review ${projectRemediationSuggestions.length} remediation suggestions.`
          : proposalReviewNeedsActionCount > 0
            ? `Use proposal/target review for ${proposalReviewNeedsActionCount} items.`
            : previewBlockedCount > 0
              ? `Use preview/replay simulator for ${previewBlockedCount} blocked previews.`
              : sourceEvidenceGraph.stats.orphanNodeCount > 0
                ? `Inspect ${sourceEvidenceGraph.stats.orphanNodeCount} evidence graph orphans.`
                : !artifacts.length
                  ? "Register source evidence."
                  : !workflowRuns.length && workItems.length
                    ? "Create workflow run for linked work."
                    : !writebackProposals.length
                      ? "Create governed proposal only from accepted guidance."
                      : "Keep audit readiness monitored.";
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

    if (sourceWatchers.length && sourceCadenceWatchers.length === 0) {
      gapKinds.add("watcher_cadence_gap");
      addGap({
        id: `watcher_cadence_missing:${source.id}`,
        kind: "watcher_cadence_gap",
        title: `${source.name} watcher cadence is not scheduled`,
        severity: "warn",
        area: source.area,
        sourceId: source.id,
        targetType: "source",
        targetId: source.id,
        rationale:
          "The source has watcher coverage, but no schedule/polling cadence is active.",
      });
    } else if (sourceCadenceNeedsAttention.length) {
      gapKinds.add("watcher_cadence_gap");
      addGap({
        id: `watcher_cadence_stale:${source.id}`,
        kind: "watcher_cadence_gap",
        title: `${source.name} watcher cadence needs attention`,
        severity: sourceCadenceNeedsAttention.some(
          (watcher) => watcher.cadenceStatus === "error"
        )
          ? "critical"
          : "warn",
        area: source.area,
        sourceId: source.id,
        targetType: "source",
        targetId: source.id,
        rationale: `${sourceCadenceNeedsAttention.length} scheduled watchers are due, stale or in error.`,
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
    if (writebackMaturity.stage === "blocked_or_failed") {
      gapKinds.add("writeback_needs_review");
      addGap({
        id: `writeback_needs_review:${source.id}`,
        kind: "writeback_needs_review",
        title: `${source.name} writeback safety needs review`,
        severity: writebackMaturity.failedCount ? "critical" : "warn",
        area: source.area,
        sourceId: source.id,
        targetType: "source",
        targetId: source.id,
          rationale: `${writebackMaturity.blockedCount} blocked, ${writebackMaturity.failedCount} failed, ${writebackMaturity.staleApprovalCount} stale approvals, ${writebackMaturity.stalePreviewCount} stale previews.`,
      });
    }
    if (auditReadinessStage === "needs_attention") {
      gapKinds.add("audit_readiness_gap");
      addGap({
        id: `audit_readiness_gap:${source.id}`,
        kind: "audit_readiness_gap",
        title: `${source.name} audit readiness needs review`,
        severity: projectIntegrityGaps.some((gap) => gap.severity === "critical")
          ? "critical"
          : "warn",
        area: source.area,
        sourceId: source.id,
        targetType: "source",
        targetId: source.id,
        rationale: auditNextAction,
      });
    }

    let stage: AdoptionProject["stage"] = "source_registered";
    if (artifacts.length) stage = "evidence_only";
    if (workItems.length) stage = "work_linked";
    if (workflowRuns.length) stage = activeWorkflowRuns.length ? "workflow_running" : "workflow_tracked";
    if (signals.length || guidance.length) stage = "closed_loop";
    if (proposals.length || writebackProposals.length) stage = "improving";

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
        ...writebackProposals.map((proposal) => proposal.updatedAt),
        writebackMaturity.latestAuditAt,
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
      writebackMaturity,
      auditReadiness: {
        stage: auditReadinessStage,
        score: auditReadinessScore,
        targetCount: projectTargetSummaries.length,
        proposalReviewNeedsActionCount,
        evidenceIntegrityGapCount: projectIntegrityGaps.length,
        remediationSuggestionCount: projectRemediationSuggestions.length,
        evidenceGraphNodeCount: sourceEvidenceGraph.stats.nodeCount,
        evidenceGraphOrphanCount: sourceEvidenceGraph.stats.orphanNodeCount,
        timelineEventCount: sourceTimeline.stats.eventCount,
        externalWriteEventCount: projectExternalWriteEventCount,
        previewBlockedCount,
        replayTerminalCount,
        retryNeedsRationaleCount,
        latestAuditAt: latestTimestamp([
          writebackMaturity.latestAuditAt,
          sourceTimeline.stats.latestAt,
        ]),
        nextAction: auditNextAction,
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
      writebackProjectCount: projects.filter(
        (project) => project.writebackMaturity.proposalCount > 0
      ).length,
      writebackCompletedProjectCount: projects.filter((project) =>
        ["executed_or_noop", "blocked_or_failed"].includes(
          project.writebackMaturity.stage
        ) &&
        (project.writebackMaturity.completedCount > 0 ||
          project.writebackMaturity.completedNoopCount > 0)
      ).length,
      writebackNeedsReviewProjectCount: projects.filter(
        (project) => project.writebackMaturity.stage === "blocked_or_failed"
      ).length,
      duplicatePreventedWritebackCount: projects.reduce(
        (sum, project) => sum + project.writebackMaturity.duplicatePreventedCount,
        0
      ),
      auditReadyProjectCount: projects.filter((project) =>
        ["review_ready", "execution_ready"].includes(project.auditReadiness.stage)
      ).length,
      auditNeedsAttentionProjectCount: projects.filter(
        (project) => project.auditReadiness.stage === "needs_attention"
      ).length,
      auditReadinessGapCount: gaps.filter((gap) => gap.kind === "audit_readiness_gap")
        .length,
      auditTargetCount: projects.reduce(
        (sum, project) => sum + project.auditReadiness.targetCount,
        0
      ),
    },
  };
}

function buildOperatingCadence(
  data: ReturnType<typeof listAll>
): CompanyBrainOperatingCadence {
  const generatedAt = now();
  const watchers = data.watchers.map((watcher) => {
    const runs = data.watcherRuns
      .filter((run) => run.watcherId === watcher.id)
      .sort((a, b) => b.startedAt - a.startedAt);
    const scheduledRuns = runs.filter(isScheduledWatcherRun);
    const lastRun = runs[0] ?? null;
    const lastScheduledRun = scheduledRuns[0] ?? null;
    const isScheduled = isCadenceWatcher(watcher);
    const scheduleId = isScheduled ? watcherScheduleId(watcher.id) : null;
    const intervalMs = isScheduled ? watcherCadenceIntervalMs(watcher) : null;
    const expectedNextRunAt =
      watcher.nextRunAt ??
      (lastScheduledRun && intervalMs
        ? (lastScheduledRun.finishedAt ?? lastScheduledRun.startedAt) + intervalMs
        : null);
    const staleAfterMs = intervalMs ? Math.max(intervalMs * 1.5, intervalMs + 60_000) : null;
    const lastScheduledAt = lastScheduledRun?.finishedAt ?? lastScheduledRun?.startedAt ?? null;
    let cadenceStatus: CompanyBrainOperatingCadence["watchers"][number]["cadenceStatus"] =
      "not_scheduled";
    let nextAction = "No cadence configured.";

    if (["paused", "archived"].includes(watcher.status)) {
      cadenceStatus = "disabled";
      nextAction = "Enable watcher before scheduling it.";
    } else if (watcher.status === "error") {
      cadenceStatus = "error";
      nextAction = "Review last watcher error before the next scheduled run.";
    } else if (!isScheduled) {
      cadenceStatus = "not_scheduled";
      nextAction = "Add schedule/polling cadence only if this watcher becomes daily-critical.";
    } else if (!lastScheduledRun) {
      cadenceStatus = "due";
      nextAction = "Run scheduled cadence once to establish provenance and freshness.";
    } else if (
      staleAfterMs &&
      lastScheduledAt &&
      generatedAt - lastScheduledAt > staleAfterMs
    ) {
      cadenceStatus = "stale";
      nextAction = "Run scheduled cadence now and inspect Source Health.";
    } else if (expectedNextRunAt && expectedNextRunAt <= generatedAt) {
      cadenceStatus = "due";
      nextAction = "Run scheduled cadence; expected next run is due.";
    } else {
      cadenceStatus = "active";
      nextAction = "Cadence is current; keep observing freshness.";
    }

    const lastTriggerSource: WatcherRunTriggerSource | null = lastRun
      ? isScheduledWatcherRun(lastRun)
        ? "schedule"
        : "manual"
      : null;

    return {
      watcherId: watcher.id,
      title: watcher.title,
      status: watcher.status,
      actionPolicy: watcher.actionPolicy,
      riskClass: watcher.riskClass,
      triggerType: watcher.triggerType,
      schedule: watcher.schedule,
      scheduleId,
      sourceIds: watcher.sourceIds,
      runCount: runs.length,
      scheduledRunCount: scheduledRuns.length,
      lastRunAt: lastRun?.finishedAt ?? lastRun?.startedAt ?? watcher.lastRunAt,
      lastScheduledRunAt: lastScheduledAt,
      nextRunAt: watcher.nextRunAt,
      expectedNextRunAt,
      staleAfterMs,
      cadenceStatus,
      lastRunStatus: lastRun?.status ?? null,
      lastTriggerSource,
      lastTriggerRef: lastRun?.triggerRef ?? null,
      nextAction,
    };
  });

  const scheduledWatchers = watchers.filter(
    (watcher) => watcher.cadenceStatus !== "not_scheduled"
  );
  const lastScheduledRunAt = latestTimestamp(
    scheduledWatchers.map((watcher) => watcher.lastScheduledRunAt)
  );
  const nextScheduledRunAt = scheduledWatchers
    .map((watcher) => watcher.expectedNextRunAt)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b)[0] ?? null;

  watchers.sort((a, b) => {
    const priority = {
      stale: 5,
      due: 4,
      error: 3,
      disabled: 2,
      active: 1,
      not_scheduled: 0,
    } satisfies Record<
      CompanyBrainOperatingCadence["watchers"][number]["cadenceStatus"],
      number
    >;
    const delta = priority[b.cadenceStatus] - priority[a.cadenceStatus];
    if (delta !== 0) return delta;
    return (b.lastScheduledRunAt ?? b.lastRunAt ?? 0) - (a.lastScheduledRunAt ?? a.lastRunAt ?? 0);
  });

  return {
    generatedAt,
    watchers,
    stats: {
      watcherCount: watchers.length,
      scheduledWatcherCount: scheduledWatchers.length,
      activeScheduledWatcherCount: scheduledWatchers.filter(
        (watcher) => watcher.cadenceStatus === "active"
      ).length,
      staleCadenceCount: scheduledWatchers.filter(
        (watcher) => watcher.cadenceStatus === "stale"
      ).length,
      dueCadenceCount: scheduledWatchers.filter(
        (watcher) => watcher.cadenceStatus === "due"
      ).length,
      disabledCadenceCount: scheduledWatchers.filter(
        (watcher) => watcher.cadenceStatus === "disabled"
      ).length,
      errorCadenceCount: scheduledWatchers.filter(
        (watcher) => watcher.cadenceStatus === "error"
      ).length,
      scheduledRunCount: data.watcherRuns.filter(isScheduledWatcherRun).length,
      manualRunCount: data.watcherRuns.filter((run) => !isScheduledWatcherRun(run))
        .length,
      lastScheduledRunAt,
      nextScheduledRunAt,
    },
  };
}

function buildGateClosureRitual(
  data: ReturnType<typeof listAll>
): CompanyBrainGateClosureRitual {
  const generatedAt = now();
  const workItemById = new Map(data.workItems.map((item) => [item.id, item]));
  const items: CompanyBrainGateClosureRitual["items"] = [];
  const addItem = (item: CompanyBrainGateClosureRitual["items"][number]) => {
    if (!items.some((candidate) => candidate.id === item.id)) items.push(item);
  };

  for (const run of data.workflowRuns) {
    const workItem = run.workItemId ? workItemById.get(run.workItemId) ?? null : null;
    if (["pending", "blocked", "failed"].includes(run.gateStatus)) {
      const status: CompanyBrainGateClosureRitual["items"][number]["status"] =
        run.gateStatus === "blocked"
          ? "blocked"
          : run.gateStatus === "failed"
            ? "failed"
            : "ready_for_review";
      addItem({
        id: `workflow_gate:${run.id}`,
        kind: "workflow_gate",
        status,
        severity: run.gateStatus === "pending" ? "warn" : "critical",
        area: run.workflowArea,
        title: run.title,
        targetType: "workflow_run",
        targetId: run.id,
        workItemId: run.workItemId,
        priorityId: workItem?.priorityId ?? null,
        goalId: workItem?.goalId ?? null,
        owner: run.owner,
        gateStatus: run.gateStatus,
        slaStatus: run.slaStatus,
        dueAt: workItem?.dueAt ?? null,
        lastActivityAt: run.updatedAt,
        rationale: `Workflow gate is ${run.gateStatus}.`,
        recommendedAction:
          run.gateStatus === "pending"
            ? "Review required evidence and decide whether the next workflow step can start."
            : "Resolve or explicitly escalate the blocked/failed gate before opening new work.",
      });
    }

    if (["at_risk", "breached"].includes(run.slaStatus)) {
      addItem({
        id: `workflow_sla:${run.id}`,
        kind: "workflow_sla",
        status: run.slaStatus === "breached" ? "breached" : "at_risk",
        severity: run.slaStatus === "breached" ? "critical" : "warn",
        area: run.workflowArea,
        title: run.title,
        targetType: "workflow_run",
        targetId: run.id,
        workItemId: run.workItemId,
        priorityId: workItem?.priorityId ?? null,
        goalId: workItem?.goalId ?? null,
        owner: run.owner,
        gateStatus: run.gateStatus,
        slaStatus: run.slaStatus,
        dueAt: workItem?.dueAt ?? null,
        lastActivityAt: run.updatedAt,
        rationale: `Workflow SLA is ${run.slaStatus}.`,
        recommendedAction:
          "Reconfirm owner, due date and next evidence needed to recover the workflow SLA.",
      });
    }
  }

  for (const goal of data.goals) {
    if (!["at_risk", "breached"].includes(goal.slaStatus)) continue;
    addItem({
      id: `goal_sla:${goal.id}`,
      kind: "goal_sla",
      status: goal.slaStatus === "breached" ? "breached" : "at_risk",
      severity: goal.slaStatus === "breached" ? "critical" : "warn",
      area: goal.area,
      title: goal.title,
      targetType: "goal",
      targetId: goal.id,
      workItemId: null,
      priorityId: goal.priorityId,
      goalId: goal.id,
      owner: goal.owner,
      gateStatus: null,
      slaStatus: goal.slaStatus,
      dueAt: goal.dueAt,
      lastActivityAt: goal.updatedAt,
      rationale: `Goal SLA is ${goal.slaStatus}.`,
      recommendedAction:
        "Use the daily gate ritual to decide whether the goal needs replan, scope trim or escalation.",
    });
  }

  items.sort((a, b) => {
    const severityRank = { critical: 2, warn: 1, info: 0 };
    const severityDelta = severityRank[b.severity] - severityRank[a.severity];
    if (severityDelta !== 0) return severityDelta;
    return (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0);
  });

  const stats = {
    itemCount: items.length,
    criticalCount: items.filter((item) => item.severity === "critical").length,
    warnCount: items.filter((item) => item.severity === "warn").length,
    workflowGateCount: items.filter((item) => item.kind === "workflow_gate").length,
    workflowSlaCount: items.filter((item) => item.kind === "workflow_sla").length,
    goalSlaCount: items.filter((item) => item.kind === "goal_sla").length,
    pendingGateCount: items.filter(
      (item) => item.kind === "workflow_gate" && item.gateStatus === "pending"
    ).length,
    blockedGateCount: items.filter(
      (item) => item.kind === "workflow_gate" && item.gateStatus === "blocked"
    ).length,
    failedGateCount: items.filter(
      (item) => item.kind === "workflow_gate" && item.gateStatus === "failed"
    ).length,
    slaAtRiskCount: items.filter((item) => item.slaStatus === "at_risk").length,
    slaBreachedCount: items.filter((item) => item.slaStatus === "breached").length,
    dailyClosureReadyCount: items.filter(
      (item) => item.status === "ready_for_review"
    ).length,
  };
  const slaRiskCount = stats.slaAtRiskCount + stats.slaBreachedCount;
  const overallStatus: CompanyBrainGateClosureRitual["overallStatus"] =
    stats.criticalCount || stats.blockedGateCount || stats.failedGateCount
      ? "critical"
      : stats.itemCount
        ? "attention"
        : "clear";
  const summary = stats.itemCount
    ? `${stats.itemCount} gate/SLA items need review; ${stats.criticalCount} critical; ${stats.pendingGateCount} pending gates; ${slaRiskCount} SLA risks.`
    : "No workflow gate or SLA items need closure.";

  return {
    generatedAt,
    overallStatus,
    summary,
    totals: {
      itemCount: stats.itemCount,
      criticalCount: stats.criticalCount,
      warnCount: stats.warnCount,
      pendingGateCount: stats.pendingGateCount,
      slaRiskCount,
      dailyClosureReadyCount: stats.dailyClosureReadyCount,
    },
    items,
    stats,
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
  const operatingCadence = buildOperatingCadence(data);
  const cadenceByWatcherId = new Map(
    operatingCadence.watchers.map((watcher) => [watcher.watcherId, watcher])
  );

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
    const scheduledWatchers = watchers
      .map((watcher) => cadenceByWatcherId.get(watcher.id))
      .filter(
        (
          watcher
        ): watcher is CompanyBrainOperatingCadence["watchers"][number] =>
          !!watcher && watcher.cadenceStatus !== "not_scheduled"
      );
    const staleWatchers = scheduledWatchers.filter((watcher) =>
      ["stale", "due", "error"].includes(watcher.cadenceStatus)
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
    const sourceMetadata = metadataRecord(source.metadata);
    const sourceAdapter = metadataString(sourceMetadata.adapter);
    const evidenceOnlyAdapter = [
      "github_pr_ci",
      "github_notifications",
      "slack_channel",
    ].includes(sourceAdapter ?? "");
    const evidenceOnlySource = source.sourceType === "runtime" || evidenceOnlyAdapter;
    const expectsWorkItems =
      metadataBoolean(sourceMetadata.expectsWorkItems) ?? !evidenceOnlySource;
    const expectsSignals =
      metadataBoolean(sourceMetadata.expectsSignals) ?? !evidenceOnlySource;

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
    if (expectsWorkItems && !workItems.length) issueKinds.add("no_work_items");
    if (expectsSignals && !signals.length) issueKinds.add("no_signals");
    if (watchers.length > 0 && scheduledWatchers.length === 0) {
      issueKinds.add("watcher_cadence_missing");
    }
    if (staleWatchers.length > 0) {
      issueKinds.add("watcher_cadence_stale");
    }

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
      lastScheduledWatcherRunAt: latestTimestamp(
        scheduledWatchers.map((watcher) => watcher.lastScheduledRunAt)
      ),
      nextWatcherRunAt:
        scheduledWatchers
          .map((watcher) => watcher.expectedNextRunAt)
          .filter((value): value is number => typeof value === "number")
          .sort((a, b) => a - b)[0] ?? null,
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
      automatedWatcherCount: scheduledWatchers.length,
      staleWatcherCount: staleWatchers.length,
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
      watcherCadenceStaleCount: sources.filter((source) =>
        source.issueKinds.includes("watcher_cadence_stale")
      ).length,
      sourceWithoutCadenceCount: sources.filter((source) =>
        source.issueKinds.includes("watcher_cadence_missing")
      ).length,
    },
  };
}

function buildCoreReadiness(args: {
  data: ReturnType<typeof listAll>;
  adoptionDashboard: CompanyBrainAdoptionDashboard;
  sourceHealthReport: CompanyBrainSourceHealthReport;
  operatingCadence: CompanyBrainOperatingCadence;
  gateClosureRitual: CompanyBrainGateClosureRitual;
  writebackSafetyDashboard: CompanyBrainWritebackSafetyDashboard;
  evidenceGraph: CompanyBrainEvidenceGraph;
  timeline: CompanyBrainTimeline;
  savedAuditViews: CompanyBrainSavedAuditViews;
  writebackPolicySimulator: CompanyBrainWritebackPolicySimulator;
  previewReplaySimulator: WritebackPreviewReplaySimulator;
  lastBriefing: CompanyBrainBriefingSnapshot | null;
}): CompanyBrainCoreReadiness {
  const {
    data,
    adoptionDashboard,
    sourceHealthReport,
    operatingCadence,
    gateClosureRitual,
    writebackSafetyDashboard,
    evidenceGraph,
    timeline,
    savedAuditViews,
    writebackPolicySimulator,
    previewReplaySimulator,
    lastBriefing,
  } = args;
  const generatedAt = now();
  type Module = CompanyBrainCoreReadiness["modules"][number];
  type ModuleStatus = Module["statuses"][number];
  type Gap = CompanyBrainCoreReadiness["gaps"][number];

  const module = (item: Module): Module => ({
    ...item,
    statuses: uniqueStrings(item.statuses) as ModuleStatus[],
  });
  const evidencePacketCount = writebackSafetyDashboard.evidencePacketIndex.length;
  const automatedWatcherCount =
    operatingCadence.stats.scheduledWatcherCount;
  const hasClosedLoop =
    data.signals.length > 0 &&
    data.alignmentFindings.length > 0 &&
    data.guidanceItems.length > 0;
  const hasStrategyRuntime = data.priorities.length > 0 && data.goals.length > 0;
  const hasWorkRuntime = data.workItems.length > 0 && data.workflowRuns.length > 0;
  const hasWritebackDogfood =
    writebackSafetyDashboard.stats.completedExternalWriteCount > 0 ||
    writebackSafetyDashboard.stats.completedNoopCount > 0;
  const hasDesignPartnerOperatingPack =
    existsSync(resolve(process.cwd(), "docs/company-brain-design-partner-operating-pack.md")) ||
    data.artifacts.some((artifact) => {
      const provenance = metadataRecord(artifact.provenance);
      return (
        artifact.rawRef.includes("company-brain-design-partner-operating-pack") ||
        artifact.contentRef?.includes("company-brain-design-partner-operating-pack") ||
        metadataString(provenance.createdFrom)?.includes("design_partner_operating_pack")
      );
    });

  const modules: Module[] = [
    module({
      key: "company_brain_schema",
      title: "Company Brain schema",
      statuses: ["operational", "dogfooded"],
      summary:
        "Horizontal schema exists for sources, artifacts, strategy, goals, work, workflows, closed-loop objects and governed writeback.",
      evidence: [
        `${data.sources.length} sources`,
        `${data.artifacts.length} artifacts`,
        `${data.workflowBlueprints.length} workflow blueprints`,
        `${data.externalActionProposals.length} external action proposals`,
      ],
      gaps: [],
      nextAction: "Keep schema evolution additive and tied to dogfood gaps.",
    }),
    module({
      key: "source_registry",
      title: "Source Registry",
      statuses: data.sources.length ? ["operational", "dogfooded"] : ["missing"],
      summary: "Sources are first-class records with area, source type, owner, health and provenance boundaries.",
      evidence: [
        `${data.sources.length} registered sources`,
        `${sourceHealthReport.stats.healthyCount} healthy/fresh sources`,
        `${sourceHealthReport.stats.staleCount} stale sources`,
        `${sourceHealthReport.stats.watcherCadenceStaleCount} sources with stale watcher cadence`,
      ],
      gaps: automatedWatcherCount ? [] : ["No automated watcher cadence is configured in this dogfood DB."],
      nextAction: automatedWatcherCount
        ? "Use source health to drive daily operating review."
        : "Schedule or poll the highest-value internal sources before design-partner use.",
    }),
    module({
      key: "artifact_store",
      title: "Artifact Store",
      statuses: data.artifacts.length ? ["operational", "dogfooded"] : ["missing"],
      summary: "Artifacts capture raw evidence with source, raw_ref, hashes, visibility and provenance.",
      evidence: [
        `${data.artifacts.length} artifacts`,
        `${data.artifactLinks.length} artifact links`,
      ],
      gaps: [],
      nextAction: "Keep new adapters writing artifacts before higher-order objects.",
    }),
    module({
      key: "strategy_goals_tradeoffs",
      title: "Strategy/Goals/Tradeoffs",
      statuses: hasStrategyRuntime ? ["operational", "dogfooded"] : ["operational"],
      summary: "Strategy, goals, milestones, decisions and tradeoffs are modeled as runtime entities.",
      evidence: [
        `${data.priorities.length} priorities`,
        `${data.goals.length} goals`,
        `${data.decisions.length} decisions`,
        `${data.strategyTradeoffs.length} tradeoffs`,
      ],
      gaps: data.strategyTradeoffs.length ? [] : ["Tradeoffs are supported but need more real operating examples."],
      nextAction: "Use real strategy review artifacts to populate tradeoffs and decisions.",
    }),
    module({
      key: "workflows",
      title: "WorkItems/WorkflowRuns",
      statuses: hasWorkRuntime ? ["operational", "dogfooded"] : ["operational"],
      summary: "Canonical WorkItems and WorkflowRuns connect external work to internal gates, SLA and evidence.",
      evidence: [
        `${data.workItems.length} work items`,
        `${data.workflowRuns.length} workflow runs`,
        `${adoptionDashboard.stats.pendingGateCount} pending gates`,
        `${gateClosureRitual.stats.itemCount} gate closure ritual items`,
      ],
      gaps: gateClosureRitual.stats.itemCount
        ? [`${gateClosureRitual.stats.itemCount} gates/SLA items need daily closure ritual.`]
        : [],
      nextAction: gateClosureRitual.stats.itemCount
        ? "Run Gate Closure Ritual before starting new work."
        : "Keep workflow gates reviewed during the daily briefing.",
    }),
    module({
      key: "watchers",
      title: "Watchers",
      statuses: [
        "operational",
        ...(data.watcherRuns.length ? (["dogfooded"] as ModuleStatus[]) : []),
        "read_only_only",
        ...(automatedWatcherCount ? [] : (["needs_real_adapter"] as ModuleStatus[])),
      ],
      summary: "Watchers can observe sources and produce internal evidence without external writeback.",
      evidence: [
        `${data.watchers.length} watchers`,
        `${data.watcherRuns.length} watcher runs`,
        `${automatedWatcherCount} automated cadence watchers`,
        `${operatingCadence.stats.scheduledRunCount} scheduled runs`,
        operatingCadence.stats.lastScheduledRunAt
          ? `last scheduled ${new Date(operatingCadence.stats.lastScheduledRunAt).toISOString()}`
          : "no scheduled run yet",
        operatingCadence.stats.nextScheduledRunAt
          ? `next expected ${new Date(operatingCadence.stats.nextScheduledRunAt).toISOString()}`
          : "next expected run unknown",
      ],
      gaps: [
        ...(automatedWatcherCount
          ? []
          : ["Current readiness still relies on manual watcher runs for dogfood cadence."]),
        ...(operatingCadence.stats.staleCadenceCount ||
        operatingCadence.stats.dueCadenceCount
          ? [
              `${operatingCadence.stats.staleCadenceCount} stale and ${operatingCadence.stats.dueCadenceCount} due cadence watchers.`,
            ]
          : []),
      ],
      nextAction:
        operatingCadence.stats.staleCadenceCount || operatingCadence.stats.dueCadenceCount
          ? "Run scheduled cadence and inspect Source Health freshness."
          : "Keep briefing and key source watchers on their daily/polling cadence.",
    }),
    module({
      key: "closed_loop",
      title: "Signals/Findings/Guidance",
      statuses: hasClosedLoop ? ["operational", "dogfooded"] : ["operational"],
      summary: "The internal loop can classify evidence and produce guidance with feedback state.",
      evidence: [
        `${data.signals.length} signals`,
        `${data.alignmentFindings.length} findings`,
        `${data.guidanceItems.length} guidance items`,
        `${data.guidanceItems.filter((item) => ["new", "open"].includes(item.status)).length} open guidance`,
      ],
      gaps: hasClosedLoop ? [] : ["Closed-loop objects exist but need a complete current dogfood chain."],
      nextAction: "Keep every new real source producing at least one signal/finding/guidance chain.",
    }),
    module({
      key: "agent_context_improvement",
      title: "AgentContext/ImprovementProposal",
      statuses: [
        "operational",
        ...(data.agentContexts.length || data.improvementProposals.length
          ? (["dogfooded"] as ModuleStatus[])
          : []),
        "read_only_only",
      ],
      summary: "Approved knowledge can become AgentContext and internal ImprovementProposal records without auto-apply.",
      evidence: [
        `${data.agentContexts.length} agent contexts`,
        `${data.improvementProposals.length} improvement proposals`,
      ],
      gaps: data.agentContexts.length ? [] : ["AgentContext still needs repeated daily-use generation."],
      nextAction: "Generate contexts from accepted guidance before handoffs and agent sessions.",
    }),
    module({
      key: "source_health",
      title: "Source Health",
      statuses: ["operational", "dogfooded", "read_only_only"],
      summary: "Source Health reports freshness, sync errors, volumes and watcher activity.",
      evidence: [
        `${sourceHealthReport.sources.length} source health rows`,
        `${sourceHealthReport.stats.errorCount} errors`,
        `${sourceHealthReport.stats.staleCount} stale sources`,
      ],
      gaps: [],
      nextAction: "Use Source Health as the first daily triage screen.",
    }),
    module({
      key: "adoption_dashboard",
      title: "Adoption Dashboard",
      statuses: ["operational", "dogfooded", "read_only_only"],
      summary: "Adoption Dashboard shows closed-loop stage, writeback maturity and audit readiness per project/source.",
      evidence: [
        `${adoptionDashboard.stats.projectCount} projects`,
        `${adoptionDashboard.stats.closedLoopProjectCount} closed-loop projects`,
        `${adoptionDashboard.stats.auditReadyProjectCount} audit-ready projects`,
      ],
      gaps: adoptionDashboard.stats.auditNeedsAttentionProjectCount
        ? [`${adoptionDashboard.stats.auditNeedsAttentionProjectCount} projects need audit readiness review.`]
        : [],
      nextAction: "Use audit readiness to choose the next daily operating gap.",
    }),
    module({
      key: "writeback_governance",
      title: "Writeback Governance",
      statuses: [
        "operational",
        ...(data.externalActionProposals.length ? (["dogfooded"] as ModuleStatus[]) : []),
        "blocked_by_policy",
      ],
      summary: "ExternalActionProposal, HITL, preview gates, retry safety and audit trail govern writeback.",
      evidence: [
        `${data.externalActionProposals.length} proposals`,
        `${writebackSafetyDashboard.stats.completedExternalWriteCount} completed external writes`,
        `${writebackSafetyDashboard.stats.blockedProposalCount} blocked proposals`,
      ],
      gaps: ["Stronger external mutations remain blocked until explicitly approved."],
      nextAction: "Keep GitHub/Slack writes limited to approved Risk B paths.",
    }),
    module({
      key: "evidence_packets",
      title: "Evidence Packets",
      statuses: evidencePacketCount
        ? ["operational", "dogfooded", "read_only_only"]
        : ["operational", "read_only_only"],
      summary: "Evidence packets export proposal, guidance, hashes, refs, events, gaps and audit trail.",
      evidence: [
        `${evidencePacketCount} indexed packets`,
        `${writebackSafetyDashboard.evidenceIntegritySummary.total} integrity gaps`,
      ],
      gaps: [],
      nextAction: "Attach evidence packet exports to review handoffs when writeback is discussed.",
    }),
    module({
      key: "audit_timeline_graph",
      title: "Audit/Timeline/Graph",
      statuses: ["operational", "dogfooded", "read_only_only"],
      summary: "Graph, timeline, saved audit views, policy simulator and replay simulator expose provenance and safety.",
      evidence: [
        `${evidenceGraph.stats.nodeCount} graph nodes`,
        `${timeline.stats.eventCount} timeline events`,
        `${savedAuditViews.stats.viewCount} saved audit views`,
        `${writebackPolicySimulator.stats.caseCount} policy simulation cases`,
        `${previewReplaySimulator.stats.proposalCount} replay-simulated proposals`,
      ],
      gaps: [],
      nextAction: "Use graph/timeline when debugging provenance or target history.",
    }),
    module({
      key: "briefing",
      title: "Briefing",
      statuses: lastBriefing
        ? ["operational", "dogfooded", "read_only_only"]
        : ["operational", "read_only_only"],
      summary: "AIOS Briefing summarizes operational, writeback safety, audit readiness and execution readiness state.",
      evidence: [
        lastBriefing ? `latest artifact ${lastBriefing.artifactId}` : "no briefing artifact yet",
        `${lastBriefing?.sections.length ?? 0} sections`,
      ],
      gaps: lastBriefing ? [] : ["Briefing watcher needs a run in the current DB."],
      nextAction: "Run briefing at the beginning/end of daily AIOS operating sessions.",
    }),
    module({
      key: "mcp_coverage",
      title: "MCP coverage",
      statuses: ["operational", "dogfooded"],
      summary: "MCP exposes summary, briefing, adapters, review, writeback governance, audit, graph, timeline and packet exports.",
      evidence: [
        "Company Brain summary/read tools available",
        "MCP Markdown evidence export dogfooded",
        "Writeback execute tools remain gated",
      ],
      gaps: [],
      nextAction: "Keep MCP tools aligned with each new API surface.",
    }),
  ];

  const gaps: Gap[] = [];
  const addGap = (gap: Gap) => gaps.push(gap);
  if (!automatedWatcherCount) {
    addGap({
      id: "daily_cadence_watchers",
      impact: "daily_use",
      severity: "warn",
      title: "Daily use still needs scheduled/polling watcher cadence",
      rationale:
        "The core is usable interactively, but daily operating value depends on automatic briefing/source watcher runs.",
      nextAction: "Schedule the briefing watcher and one high-signal GitHub/Slack/source watcher.",
      requiresExternalMutation: false,
    });
  }
  if (operatingCadence.stats.staleCadenceCount || operatingCadence.stats.dueCadenceCount) {
    addGap({
      id: "stale_or_due_watcher_cadence",
      impact: "daily_use",
      severity: operatingCadence.stats.staleCadenceCount ? "warn" : "info",
      title: "Scheduled watcher cadence needs a run",
      rationale: `${operatingCadence.stats.staleCadenceCount} cadence watchers are stale and ${operatingCadence.stats.dueCadenceCount} are due.`,
      nextAction: "Run Operating Cadence locally or through the approved schedule target.",
      requiresExternalMutation: false,
    });
  }
  if (gateClosureRitual.stats.itemCount > 0) {
    addGap({
      id: "pending_workflow_gates",
      impact: "daily_use",
      severity: gateClosureRitual.stats.criticalCount ? "critical" : "warn",
      title: "Gates and SLA items need daily closure discipline",
      rationale: `${gateClosureRitual.stats.itemCount} workflow/goal items are in the gate closure ritual.`,
      nextAction:
        "Review Gate Closure Ritual before starting new work or expanding automation.",
      requiresExternalMutation: false,
    });
  }
  if (!lastBriefing) {
    addGap({
      id: "missing_briefing_artifact",
      impact: "demo",
      severity: "warn",
      title: "Demo needs a latest AIOS briefing artifact",
      rationale: "The briefing module is implemented, but no latest briefing exists in this DB.",
      nextAction: "Run watcher-aios-briefing-v0 before demos.",
      requiresExternalMutation: false,
    });
  }
  if (!hasDesignPartnerOperatingPack) {
    addGap({
      id: "design_partner_operating_pack",
      impact: "design_partner",
      severity: "warn",
      title: "Design-partner readiness needs a stable operating pack",
      rationale:
        "The core is dogfooded internally, but design partners need a repeatable onboarding story, data boundaries and runbook.",
      nextAction: "Create a demo/runbook pack from the Felhen closed-loop dogfood path.",
      requiresExternalMutation: false,
    });
  }
  addGap({
    id: "stronger_writeback_requires_new_approval",
    impact: "requires_external_mutation",
    severity: "info",
    title: "Stronger writeback remains intentionally blocked",
    rationale:
      "Check-run real execution, assign/unassign, notification read and status-changing actions require explicit target/policy approval.",
    nextAction: "Approve one controlled target and one Risk B action before adding any new executor.",
    requiresExternalMutation: true,
  });
  addGap({
    id: "ui_role_polish",
    impact: "polish",
    severity: "info",
    title: "UI can be refined into role-specific daily views",
    rationale:
      "The Company Brain page is feature-complete enough for internal use, but still dense for repeated non-builder operation.",
    nextAction: "Only polish after daily dogfood reveals concrete friction.",
    requiresExternalMutation: false,
  });

  const hasRequiredInternalLoop =
    hasStrategyRuntime &&
    hasWorkRuntime &&
    hasClosedLoop &&
    data.sources.length > 0 &&
    data.artifacts.length > 0 &&
    data.watcherRuns.length > 0 &&
    adoptionDashboard.stats.closedLoopProjectCount > 0 &&
    evidencePacketCount > 0 &&
    hasWritebackDogfood;
  const dailyUseBlockingGapCount = gaps.filter((gap) => gap.impact === "daily_use")
    .length;
  const demoGapCount = gaps.filter((gap) => gap.impact === "demo").length;
  const designPartnerGapCount = gaps.filter(
    (gap) => gap.impact === "design_partner"
  ).length;
  const hasMissingModule = modules.some((item) => item.statuses.includes("missing"));
  const overallStatus: CompanyBrainCoreReadiness["overallStatus"] = hasMissingModule
    ? "needs_foundation_work"
    : dailyUseBlockingGapCount
      ? "daily_use_blocked"
      : demoGapCount
        ? "demo_not_ready"
        : designPartnerGapCount
          ? "design_partner_not_ready"
          : hasRequiredInternalLoop && lastBriefing
            ? "internal_closed_loop_ready"
            : hasRequiredInternalLoop
              ? "demo_ready"
              : "demo_not_ready";

  return {
    generatedAt,
    overallStatus,
    modules,
    gaps,
    stats: {
      moduleCount: modules.length,
      operationalCount: modules.filter((item) => item.statuses.includes("operational"))
        .length,
      dogfoodedCount: modules.filter((item) => item.statuses.includes("dogfooded"))
        .length,
      readOnlyOnlyCount: modules.filter((item) =>
        item.statuses.includes("read_only_only")
      ).length,
      previewOnlyCount: modules.filter((item) => item.statuses.includes("preview_only"))
        .length,
      needsRealAdapterCount: modules.filter((item) =>
        item.statuses.includes("needs_real_adapter")
      ).length,
      blockedByPolicyCount: modules.filter((item) =>
        item.statuses.includes("blocked_by_policy")
      ).length,
      missingCount: modules.filter((item) => item.statuses.includes("missing"))
        .length,
      dailyUseBlockingGapCount,
      demoGapCount,
      designPartnerGapCount,
      polishGapCount: gaps.filter((gap) => gap.impact === "polish").length,
      externalMutationGapCount: gaps.filter(
        (gap) => gap.impact === "requires_external_mutation"
      ).length,
      automatedWatcherCount,
      staleCadenceCount: operatingCadence.stats.staleCadenceCount,
      dueCadenceCount: operatingCadence.stats.dueCadenceCount,
      lastScheduledRunAt: operatingCadence.stats.lastScheduledRunAt,
      nextScheduledRunAt: operatingCadence.stats.nextScheduledRunAt,
    },
  };
}

function buildOperatingSnapshot(
  data: ReturnType<typeof listAll>
): CompanyBrainOperatingSnapshot {
  const generatedAt = now();
  const lastBriefing = buildLastBriefing(data);
  const operatingCadence = buildOperatingCadence(data);
  const gateClosureRitual = buildGateClosureRitual(data);
  const sourceHealthReport = buildSourceHealthReport(data);
  const timeline = buildCompanyBrainTimeline({ data, limit: 12 });
  const latestAgentContext =
    data.agentContexts
      .filter(
        (context) =>
          context.provenance?.createdFrom === "company_brain:daily_agent_handoff"
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
  const latestCadenceRunAt =
    operatingCadence.stats.lastScheduledRunAt ??
    latestTimestamp(operatingCadence.watchers.map((watcher) => watcher.lastRunAt));
  const latestGateActivityAt = latestTimestamp(
    gateClosureRitual.items.map((item) => item.lastActivityAt ?? item.dueAt)
  );
  const latestSourceActivityAt = latestTimestamp(
    sourceHealthReport.sources.map((source) => source.lastActivityAt)
  );
  const sourceHealthAlertCount =
    sourceHealthReport.stats.errorCount +
    sourceHealthReport.stats.staleCount +
    sourceHealthReport.stats.watcherCadenceStaleCount +
    sourceHealthReport.stats.sourceWithoutCadenceCount;
  const briefingAlert =
    lastBriefing?.nextSteps[0] ??
    "Run watcher-aios-briefing-v0 to create the daily operating brief.";
  const cadenceAlert =
    operatingCadence.stats.staleCadenceCount || operatingCadence.stats.dueCadenceCount
      ? `${operatingCadence.stats.staleCadenceCount} stale and ${operatingCadence.stats.dueCadenceCount} due watchers.`
      : `${operatingCadence.stats.activeScheduledWatcherCount} scheduled watchers active.`;
  const gateAlert = gateClosureRitual.stats.itemCount
    ? `${gateClosureRitual.stats.itemCount} gate/SLA items need review.`
    : "No gate/SLA closure items are open.";
  const sourceAlert = sourceHealthAlertCount
    ? `${sourceHealthAlertCount} source health alerts need review.`
    : `${sourceHealthReport.stats.healthyCount}/${sourceHealthReport.stats.sourceCount} sources healthy/fresh.`;
  const handoffAlert = latestAgentContext
    ? `${latestAgentContext.title} is ready for ${latestAgentContext.targetAgent}.`
    : "Generate a Daily Agent Handoff before starting a new agent session.";

  const cards: CompanyBrainOperatingSnapshot["cards"] = [
    {
      key: "aios_briefing",
      title: "AIOS Briefing",
      state: lastBriefing ? "ready" : "needs_run",
      lastUpdatedAt: lastBriefing?.generatedAt ?? null,
      mainAlert: briefingAlert,
      primaryActionLabel: "Run briefing",
      primaryActionKind: "run_briefing",
    },
    {
      key: "operating_cadence",
      title: "Operating Cadence",
      state:
        operatingCadence.stats.errorCadenceCount > 0
          ? "error"
          : operatingCadence.stats.staleCadenceCount ||
              operatingCadence.stats.dueCadenceCount
            ? "needs_run"
            : "healthy",
      lastUpdatedAt: latestCadenceRunAt ?? operatingCadence.generatedAt,
      mainAlert: cadenceAlert,
      primaryActionLabel: "Run Operating Cadence",
      primaryActionKind: "run_operating_cadence",
    },
    {
      key: "gate_closure_ritual",
      title: "Gate Closure Ritual",
      state: gateClosureRitual.overallStatus,
      lastUpdatedAt: latestGateActivityAt ?? gateClosureRitual.generatedAt,
      mainAlert: gateAlert,
      primaryActionLabel: "Review gates",
      primaryActionKind: "review_gate_closure",
    },
    {
      key: "source_health",
      title: "Source Health",
      state: sourceHealthReport.stats.errorCount
        ? "error"
        : sourceHealthAlertCount
          ? "attention"
          : "healthy",
      lastUpdatedAt: latestSourceActivityAt ?? sourceHealthReport.generatedAt,
      mainAlert: sourceAlert,
      primaryActionLabel: "Review sources",
      primaryActionKind: "review_source_health",
    },
    {
      key: "daily_agent_handoff",
      title: "Daily Agent Handoff",
      state: latestAgentContext ? "ready" : "missing",
      lastUpdatedAt: latestAgentContext?.updatedAt ?? null,
      mainAlert: handoffAlert,
      primaryActionLabel: "Generate handoff",
      primaryActionKind: "generate_daily_handoff",
    },
  ];
  const totals = {
    cardCount: cards.length,
    readyCount: cards.filter((card) =>
      ["ready", "healthy", "clear"].includes(card.state)
    ).length,
    attentionCount: cards.filter((card) =>
      ["attention", "needs_run"].includes(card.state)
    ).length,
    criticalCount: cards.filter((card) => card.state === "critical").length,
    errorCount: cards.filter((card) => card.state === "error").length,
    missingCount: cards.filter((card) => card.state === "missing").length,
  };
  const overallStatus: CompanyBrainOperatingSnapshot["overallStatus"] =
    totals.errorCount > 0
      ? "error"
      : totals.criticalCount > 0
        ? "critical"
        : totals.attentionCount > 0 || totals.missingCount > 0
          ? "attention"
          : "healthy";
  const summary = `${totals.readyCount}/${totals.cardCount} operating cards ready; ${totals.attentionCount} attention; ${totals.criticalCount} critical; ${totals.errorCount} errors; ${totals.missingCount} missing.`;

  return {
    generatedAt,
    overallStatus,
    summary,
    totals,
    cards,
    lastBriefing,
    latestAgentContext,
    operatingCadence,
    gateClosureRitual,
    sourceHealthReport,
    timeline,
    recentEvents: timeline.events.slice(0, 8),
  };
}

const briefingSectionKeys: CompanyBrainBriefingSection["key"][] = [
  "decisions",
  "tradeoffs",
  "open_guidance",
  "findings",
  "source_health",
  "operating_cadence",
  "gate_closure",
  "adoption_dashboard",
  "unlinked_work",
  "gates_sla",
  "writeback_safety",
  "audit_readiness",
  "execution_readiness",
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
  const writebackSafetyDashboard = buildWritebackSafetyDashboard(data);
  const operatingCadence = buildOperatingCadence(data);
  const gateClosureRitual = buildGateClosureRitual(data);
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
  const cadenceWatchersNeedingAttention = operatingCadence.watchers.filter((watcher) =>
    ["due", "stale", "error"].includes(watcher.cadenceStatus)
  );
  const recentScheduledRuns = data.watcherRuns
    .filter(isScheduledWatcherRun)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 5);
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
  const pendingWritebackProposals = data.externalActionProposals.filter(
    (proposal) => proposal.approvalStatus === "pending"
  );
  const failedWritebackProposals = data.externalActionProposals.filter(
    (proposal) => proposal.executionStatus === "failed"
  );
  const riskCOrUnknownWritebacks = data.externalActionProposals.filter(
    (proposal) => proposal.riskClass === "C" || proposal.riskClass === "unknown"
  );
  const blockedWritebackItems = writebackSafetyDashboard.items.filter(
    (item) => item.reviewStatus === "blocked"
  );
  const writebacksNeedingReview = writebackSafetyDashboard.items.filter((item) =>
    [
      "needs_preview",
      "needs_reapproval",
      "payload_mismatch",
      "destination_mismatch",
      "retryable_failed",
      "unsafe_failed",
    ].includes(item.reviewStatus)
  );
  const recentWritebackExecutions = writebackSafetyDashboard.latestAuditTrail.filter(
    (event) =>
      event.event.endsWith("_posted") ||
      event.event.endsWith("_added") ||
      event.event.endsWith("_set") ||
      event.event.endsWith("_reused") ||
      event.event.endsWith("_completed_noop")
  );
  const writebackLoopMetrics = writebackSafetyDashboard.operatingLoopMetrics;
  const integritySummary = writebackSafetyDashboard.evidenceIntegritySummary;
  const remediationSummary =
    writebackSafetyDashboard.evidenceRemediationSummary;
  const proposalTargetReview = buildWritebackProposalTargetReview({
    data,
    generatedAt,
    limit: 100,
  });
  const evidenceGraph = buildCompanyBrainEvidenceGraph({ data, limit: 250 });
  const timeline = buildCompanyBrainTimeline({ data, limit: 100 });
  const savedAuditViews = buildCompanyBrainSavedAuditViews(data);
  const policySimulator = buildWritebackPolicySimulator();
  const previewReplaySimulator = buildPreviewReplaySimulator(data);
  const priorityAuditViews = savedAuditViews.views.filter((view) =>
    ["critical", "warn"].includes(view.reviewPriority)
  );
  const proposalReviewItemsNeedingAction = proposalTargetReview.items.filter((item) =>
    [
      "ready_to_execute",
      "needs_preview",
      "needs_reapproval",
      "retryable_failed",
      "unsafe_failed",
      "payload_mismatch",
      "destination_mismatch",
      "blocked",
    ].includes(item.reviewStatus)
  );
  const previewReplayItemsNeedingAction = previewReplaySimulator.items.filter(
    (item) =>
      item.preview.executionBlocked ||
      item.replay.manualRetryRequiresRationale ||
      item.replay.terminalState ||
      !item.preview.available
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
      key: "operating_cadence",
      title: "Operating Cadence",
      items: limitOrNone([
        `${operatingCadence.stats.activeScheduledWatcherCount}/${operatingCadence.stats.scheduledWatcherCount} scheduled watchers active; ${operatingCadence.stats.scheduledRunCount} scheduled runs; ${operatingCadence.stats.manualRunCount} manual runs.`,
        `${operatingCadence.stats.staleCadenceCount} stale cadence watchers; ${operatingCadence.stats.dueCadenceCount} due; next=${operatingCadence.stats.nextScheduledRunAt ? new Date(operatingCadence.stats.nextScheduledRunAt).toISOString() : "unknown"}.`,
        ...cadenceWatchersNeedingAttention.slice(0, 4).map((watcher) =>
          formatEntityLine({
            prefix: "cadence",
            title: watcher.title,
            status: watcher.cadenceStatus,
            detail: watcher.nextAction,
          })
        ),
        ...recentScheduledRuns.map((run) =>
          formatEntityLine({
            prefix: "scheduled_run",
            title: run.watcherId,
            status: run.status,
            detail: run.triggerRef,
          })
        ),
      ]),
    },
    {
      key: "gate_closure",
      title: "Gate Closure Ritual",
      items: limitOrNone([
        `${gateClosureRitual.stats.itemCount} ritual items; ${gateClosureRitual.stats.criticalCount} critical; ${gateClosureRitual.stats.pendingGateCount} pending gates; ${gateClosureRitual.stats.slaAtRiskCount} SLA at risk; ${gateClosureRitual.stats.slaBreachedCount} breached.`,
        ...gateClosureRitual.items.slice(0, 6).map((item) =>
          formatEntityLine({
            prefix: item.kind,
            title: item.title,
            status: item.status,
            detail: item.recommendedAction,
          })
        ),
      ]),
    },
    {
      key: "adoption_dashboard",
      title: "Adoption Dashboard",
      items: [
        `${adoptionDashboard.stats.closedLoopProjectCount}/${adoptionDashboard.stats.projectCount} projects closed-loop; ${adoptionDashboard.stats.improvingProjectCount} improving.`,
        `${relevantGaps.length} adoption gaps visible; ${adoptionDashboard.stats.openGuidanceCount} open guidance; ${adoptionDashboard.stats.pendingGateCount} pending gates; ${adoptionDashboard.stats.slaRiskCount} SLA risks.`,
        `${adoptionDashboard.stats.auditReadyProjectCount}/${adoptionDashboard.stats.projectCount} projects audit-ready; ${adoptionDashboard.stats.auditNeedsAttentionProjectCount} need audit readiness review; ${adoptionDashboard.stats.auditTargetCount} writeback targets tracked.`,
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
    {
      key: "writeback_safety",
      title: "Writeback Safety",
      items: limitOrNone([
        `${pendingWritebackProposals.length} pending approvals; ${failedWritebackProposals.length} failed; ${writebackSafetyDashboard.stats.completedExternalWriteCount} completed external writes; ${writebackSafetyDashboard.stats.duplicateAvoidedCount} duplicates prevented.`,
        `${blockedWritebackItems.length} blocked by safety; ${writebackLoopMetrics.counts.staleApproval} stale approvals; ${writebackLoopMetrics.counts.stalePreview} stale previews; ${writebackLoopMetrics.counts.mutationAttempted} mutation attempts.`,
        `${integritySummary.total} evidence integrity gaps; ${integritySummary.criticalCount} critical; ${integritySummary.warnCount} warn.`,
        `${remediationSummary.total} remediation suggestions; ${remediationSummary.humanReviewCount} need human review; ${remediationSummary.newProposalCount} suggest new proposal.`,
        ...writebackSafetyDashboard.targetObservabilitySummaries
          .slice(0, 3)
          .map((target) =>
            formatEntityLine({
              prefix: "target",
              title: target.targetLabel,
              status: `${target.completedCount}/${target.proposalCount} completed`,
              detail: `needs_review=${target.needsReviewCount}; stale=${target.staleApprovalCount + target.stalePreviewCount}`,
            })
          ),
        ...pendingWritebackProposals.slice(0, 4).map((proposal) =>
          formatEntityLine({
            prefix: "pending",
            title: proposal.title,
            status: proposal.approvalStatus,
            detail: `${proposal.destinationType}/${proposal.actionType}`,
          })
        ),
        ...failedWritebackProposals.slice(0, 4).map((proposal) =>
          formatEntityLine({
            prefix: "failed",
            title: proposal.title,
            status: proposal.executionStatus,
            detail: proposal.errorSummary ?? proposal.destinationRef,
          })
        ),
        ...recentWritebackExecutions.slice(0, 4).map((event) =>
          formatEntityLine({
            prefix: "recent",
            title: event.title,
            status: event.event,
            detail: event.targetSummary ?? event.externalUrl ?? event.destinationRef,
          })
        ),
        ...riskCOrUnknownWritebacks.slice(0, 4).map((proposal) =>
          formatEntityLine({
            prefix: "risk_blocked",
            title: proposal.title,
            status: proposal.riskClass,
            detail: proposal.policySummary,
          })
        ),
        ...blockedWritebackItems.slice(0, 4).map((item) =>
          formatEntityLine({
            prefix: "blocked",
            title: item.title,
            status: item.reviewStatus,
            detail:
              item.auditReview.blockReasons.slice(0, 3).join(", ") ||
              item.nextAction,
          })
        ),
        ...writebacksNeedingReview.slice(0, 4).map((item) =>
          formatEntityLine({
            prefix: "review",
            title: item.title,
            status: item.reviewStatus,
            detail: item.nextAction,
          })
        ),
      ]),
    },
    {
      key: "audit_readiness",
      title: "Audit Readiness",
      items: limitOrNone([
        `${proposalTargetReview.stats.proposalCount} proposals across ${proposalTargetReview.stats.targetCount} targets; ${proposalTargetReview.stats.needsReviewCount} need review; ${proposalTargetReview.stats.blockedCount} blocked; ${proposalTargetReview.stats.integrityGapCount} integrity gaps.`,
        `${evidenceGraph.stats.nodeCount} evidence graph nodes; ${evidenceGraph.stats.edgeCount} edges; ${evidenceGraph.stats.orphanNodeCount} orphan nodes.`,
        `${timeline.stats.eventCount} timeline events; ${timeline.stats.externalWriteEventCount} external write events; latest=${timeline.stats.latestAt ? new Date(timeline.stats.latestAt).toISOString() : "none"}.`,
        `${savedAuditViews.stats.viewCount} saved audit views; ${savedAuditViews.stats.criticalCount} critical; ${savedAuditViews.stats.warnCount} warn.`,
        ...priorityAuditViews.slice(0, 4).map((view) =>
          formatEntityLine({
            prefix: view.surface,
            title: view.title,
            status: view.reviewPriority,
            detail: `${view.itemCount} items; export ${view.exportUrl}`,
          })
        ),
        ...proposalReviewItemsNeedingAction.slice(0, 4).map((item) =>
          formatEntityLine({
            prefix: "proposal_review",
            title: item.title,
            status: item.reviewStatus,
            detail: item.nextAction,
          })
        ),
      ]),
    },
    {
      key: "execution_readiness",
      title: "Execution Readiness",
      items: limitOrNone([
        `${policySimulator.stats.executableCaseCount} executable policy cases; ${policySimulator.stats.previewOnlyCaseCount} preview-only; ${policySimulator.stats.blockedCaseCount} blocked; ${policySimulator.stats.humanApprovalRequiredCount} require HITL.`,
        `${previewReplaySimulator.stats.previewAvailableCount}/${previewReplaySimulator.stats.proposalCount} proposals have local preview simulators; ${previewReplaySimulator.stats.previewBlockedCount} previews blocked; ${previewReplaySimulator.stats.terminalStateCount} terminal states.`,
        `${previewReplaySimulator.stats.duplicatePreventedCount} duplicate/replay protections visible; ${previewReplaySimulator.stats.failedRetryNeedsRationaleCount} failed retries require rationale; ${previewReplaySimulator.stats.safeToExecuteWithoutNewApprovalCount} safe-to-execute-without-new-approval.`,
        ...policySimulator.cases
          .filter((item) => item.executionBlocked || item.previewOnly)
          .slice(0, 4)
          .map((item) =>
            formatEntityLine({
              prefix: item.previewOnly ? "preview_only" : "blocked",
              title: item.title,
              status: item.input.actionType,
              detail: item.rationale,
            })
          ),
        ...previewReplayItemsNeedingAction.slice(0, 4).map((item) =>
          formatEntityLine({
            prefix: "replay",
            title: item.title,
            status: item.reviewStatus,
            detail: item.replay.reason,
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
    cadenceWatchersNeedingAttention.length
      ? `Run ${cadenceWatchersNeedingAttention.length} due/stale scheduled watchers.`
      : "",
    gateClosureRitual.stats.itemCount
      ? `Run Gate Closure Ritual for ${gateClosureRitual.stats.itemCount} gates/SLA items.`
      : "",
    unlinkedWorkItems.length
      ? `Link ${unlinkedWorkItems.length} work items to priority or goal.`
      : "",
    riskyRuns.length || riskyGoals.length
      ? "Review blocked gates and SLA risks before starting new writeback work."
      : "",
    pendingWritebackProposals.length
      ? `Review ${pendingWritebackProposals.length} pending writeback proposals through HITL.`
      : "",
    failedWritebackProposals.length
      ? `Audit ${failedWritebackProposals.length} failed writebacks before any retry.`
      : "",
    writebacksNeedingReview.length
      ? `Refresh preview/reapproval for ${writebacksNeedingReview.length} writeback safety items.`
      : "",
    writebackLoopMetrics.counts.staleApproval || writebackLoopMetrics.counts.stalePreview
      ? "Refresh stale writeback approvals/previews before any execution."
      : "",
    riskCOrUnknownWritebacks.length
      ? "Keep risk C/unknown writeback proposals blocked until policy changes."
      : "",
    blockedWritebackItems.length
      ? `Keep ${blockedWritebackItems.length} safety-blocked writeback items out of execution.`
      : "",
    integritySummary.criticalCount || integritySummary.warnCount
      ? `Review ${integritySummary.total} writeback evidence integrity gaps before expanding executors.`
      : "",
    remediationSummary.total
      ? `Use ${remediationSummary.total} read-only remediation suggestions to repair evidence packets.`
      : "",
    proposalTargetReview.stats.needsReviewCount
      ? `Use proposal/target review for ${proposalTargetReview.stats.needsReviewCount} writeback readiness items.`
      : "",
    evidenceGraph.stats.orphanNodeCount
      ? `Inspect ${evidenceGraph.stats.orphanNodeCount} orphan evidence graph nodes before expanding automation.`
      : "",
    savedAuditViews.stats.criticalCount || savedAuditViews.stats.warnCount
      ? `Open saved audit views for ${savedAuditViews.stats.criticalCount + savedAuditViews.stats.warnCount} prioritized audit slices.`
      : "",
    previewReplaySimulator.stats.failedRetryNeedsRationaleCount
      ? `Require manual retry rationale for ${previewReplaySimulator.stats.failedRetryNeedsRationaleCount} failed writeback proposals.`
      : "",
    policySimulator.stats.blockedCaseCount
      ? "Keep policy simulator blocked cases preview/read-only until a new executor is explicitly approved."
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
  triggerSource?: WatcherRunTriggerSource | null;
  scheduleId?: string | null;
  scheduledAt?: number | null;
}) {
  const db = getDb();
  const { watcher, startedAt, runId } = args;
  const triggerContext = normalizeTriggerContext({
    watcherId: watcher.id,
    triggerSource: args.triggerSource,
    scheduleId: args.scheduleId,
    scheduledAt: args.scheduledAt,
  });
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
  const runTriggerRef = scheduleTriggerRef(triggerContext, runId) ?? rawRef;
  const provenance = {
    sourceId: source.id,
    rawRef,
    createdFrom: provenanceCreatedFrom(
      `watcher:${watcher.id}:briefing`,
      triggerContext
    ),
    confidence: 1,
    extractedAt: startedAt,
    humanReviewStatus: "approved" as const,
    visibility: watcher.visibility,
    notes: `action_policy=${watcher.actionPolicy}; risk_class=${watcher.riskClass}; ${triggerNotes(triggerContext)}`,
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
        createdFrom:
          triggerContext.triggerSource === "schedule"
            ? `watcher:${watcher.id}:scheduled_briefing_signal`
            : `watcher:${watcher.id}:briefing_signal`,
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
  const writebackSafetyDashboard = buildWritebackSafetyDashboard(data);
  let artifact: typeof cbArtifacts.$inferInsert = {
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
      triggerSource: triggerContext.triggerSource,
      scheduleId: triggerContext.scheduleId,
      scheduledAt: triggerContext.scheduledAt,
      actionPolicy: watcher.actionPolicy,
      riskClass: watcher.riskClass,
      sections,
      nextSteps,
      gapSignalIds,
      adoptionDashboardStats: adoptionDashboard.stats,
      sourceHealthStats: sourceHealthReport.stats,
      writebackSafetyStats: writebackSafetyDashboard.stats,
      writebackOperatingLoopMetrics: writebackSafetyDashboard.operatingLoopMetrics,
      writebackEvidenceIntegritySummary:
        writebackSafetyDashboard.evidenceIntegritySummary,
      writebackEvidenceRemediationSummary:
        writebackSafetyDashboard.evidenceRemediationSummary,
      writebackProposalTargetReviewStats: buildWritebackProposalTargetReview({
        data,
      }).stats,
      evidenceGraphStats: buildCompanyBrainEvidenceGraph({ data }).stats,
      timelineStats: buildCompanyBrainTimeline({ data }).stats,
      savedAuditViewStats: buildCompanyBrainSavedAuditViews(data).stats,
      writebackPolicySimulatorStats: buildWritebackPolicySimulator().stats,
      previewReplaySimulatorStats: buildPreviewReplaySimulator(data).stats,
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
    triggerRef: runTriggerRef,
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
      rawRef: runTriggerRef,
      createdFrom: provenanceCreatedFrom(
        `watcher:${watcher.id}:run`,
        triggerContext
      ),
    },
    createdAt: startedAt,
    updatedAt: finishedAt,
  };

  db.insert(cbWatcherRuns).values(run).run();
  db.update(cbWatchers)
    .set({
      lastRunAt: finishedAt,
      nextRunAt:
        triggerContext.triggerSource === "schedule"
          ? nextCadenceRunAt(watcher, finishedAt)
          : watcher.nextRunAt,
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

  const refreshedData = listAll();
  const refreshedAdoptionDashboard = buildAdoptionDashboard(refreshedData);
  const refreshedSourceHealthReport = buildSourceHealthReport(refreshedData);
  const refreshedBriefing = buildBriefingSections({
    data: refreshedData,
    adoptionDashboard: refreshedAdoptionDashboard,
    sourceHealthReport: refreshedSourceHealthReport,
    generatedAt: finishedAt,
  });
  const refreshedSummary = buildBriefingSummary(refreshedBriefing.sections);
  const refreshedWritebackSafetyDashboard = buildWritebackSafetyDashboard(refreshedData);
  artifact = {
    ...artifact,
    summary: refreshedSummary,
    hash: stableHash(`${watcher.id}:${runId}:${refreshedSummary}`),
    metadata: {
      ...artifact.metadata,
      sections: refreshedBriefing.sections,
      nextSteps: refreshedBriefing.nextSteps,
      adoptionDashboardStats: refreshedAdoptionDashboard.stats,
      sourceHealthStats: refreshedSourceHealthReport.stats,
      writebackSafetyStats: refreshedWritebackSafetyDashboard.stats,
      writebackOperatingLoopMetrics:
        refreshedWritebackSafetyDashboard.operatingLoopMetrics,
      writebackEvidenceIntegritySummary:
        refreshedWritebackSafetyDashboard.evidenceIntegritySummary,
      writebackEvidenceRemediationSummary:
        refreshedWritebackSafetyDashboard.evidenceRemediationSummary,
      writebackProposalTargetReviewStats: buildWritebackProposalTargetReview({
        data: refreshedData,
      }).stats,
      evidenceGraphStats: buildCompanyBrainEvidenceGraph({ data: refreshedData }).stats,
      timelineStats: buildCompanyBrainTimeline({ data: refreshedData }).stats,
      savedAuditViewStats: buildCompanyBrainSavedAuditViews(refreshedData).stats,
      writebackPolicySimulatorStats: buildWritebackPolicySimulator().stats,
      previewReplaySimulatorStats: buildPreviewReplaySimulator(refreshedData).stats,
      refreshedAfterWatcherRunPersisted: true,
      refreshedAt: finishedAt,
    },
  };
  db.update(cbArtifacts)
    .set({
      summary: artifact.summary,
      hash: artifact.hash,
      metadata: artifact.metadata,
    })
    .where(eq(cbArtifacts.id, artifact.id))
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

function latestExternalActionAudit(proposal: ExternalActionProposal) {
  return proposal.auditTrail[proposal.auditTrail.length - 1] ?? null;
}

function hasDuplicateAvoidanceAudit(proposal: ExternalActionProposal) {
  return proposal.auditTrail.some((event) => {
    const metadata = event.metadata as
      | {
          response?: {
            reusedExisting?: unknown;
          };
        }
      | null
      | undefined;
    return event.event.endsWith("_reused") || metadata?.response?.reusedExisting === true;
  });
}

function latestWritebackExecutionAudit(proposal: ExternalActionProposal) {
  return (
    [...proposal.auditTrail]
      .reverse()
      .find((event) =>
        [
          "github_comment_posted",
          "github_comment_reused",
          "github_comment_failed",
          "github_comment_execution_blocked",
          "github_comment_retry_required",
          "github_label_added",
          "github_label_completed_noop",
          "github_label_failed",
          "github_label_execution_blocked",
          "github_label_retry_required",
          "github_status_set",
          "github_status_completed_noop",
          "github_status_failed",
          "github_status_execution_blocked",
          "github_status_retry_required",
          "slack_thread_reply_posted",
          "slack_thread_reply_reused",
          "slack_thread_reply_failed",
          "slack_thread_reply_execution_blocked",
          "slack_thread_reply_retry_required",
        ].includes(event.event)
      ) ?? null
  );
}

function hasCompletedNoopAudit(proposal: ExternalActionProposal) {
  return proposal.auditTrail.some((event) => {
    const response = metadataRecord(auditMetadata(event).response);
    return event.event.endsWith("_completed_noop") || response.completedNoop === true;
  });
}

function hasExternalMutationAttemptAudit(proposal: ExternalActionProposal) {
  return proposal.auditTrail.some((event) => {
    const response = metadataRecord(auditMetadata(event).response);
    return (
      response.mutationAttempted === true ||
      [
        "github_comment_posted",
        "github_label_added",
        "github_status_set",
        "slack_thread_reply_posted",
      ].includes(event.event)
    );
  });
}

function writebackBlockReasons(
  proposal: ExternalActionProposal,
  executionReview: CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"]
) {
  const reasons = new Set<string>();
  if (
    !["ready_to_execute", "completed", "duplicate_prevented"].includes(
      executionReview.status
    )
  ) {
    for (const flag of executionReview.flags) reasons.add(flag);
  }

  if (
    proposal.destinationType === "github" &&
    isGitHubStatusCheckAction(proposal.actionType)
  ) {
    if (proposal.actionType === "github_check") {
      reasons.add("github_check_preview_only");
    }
    if (proposal.actionType === "github_status") {
      if (proposal.riskClass !== "B") reasons.add("github_status_requires_risk_b");
      if (proposal.actionPolicy !== "writeback_allowed") {
        reasons.add("github_status_requires_writeback_allowed");
      }
      if (proposal.approvalStatus !== "approved") {
        reasons.add("github_status_requires_approval");
      }
      try {
        const preview = buildGitHubStatusCheckProposalPreview(proposal);
        if (!preview.target.sha) reasons.add("github_status_requires_sha");
        if (preview.contextName !== "aios/dogfood-status") {
          reasons.add("github_status_context_not_supported");
        }
        if (preview.state !== "success") reasons.add("github_status_state_not_supported");
        if (preview.executionBlocked && proposal.approvalStatus === "approved") {
          reasons.add("github_status_target_or_policy_blocked");
        }
        try {
          assertGitHubStatusWritebackAllowlisted({
            target: preview.target,
            contextName: preview.contextName,
            state: preview.state,
          });
        } catch {
          reasons.add("github_status_target_not_allowlisted");
        }
      } catch {
        reasons.add("github_status_invalid_payload_or_destination");
      }
    }
  }

  if (
    proposal.destinationType === "github" &&
    isGitHubLabelAction(proposal.actionType)
  ) {
    if (proposal.riskClass !== "B") reasons.add("github_label_requires_risk_b");
    if (proposal.actionPolicy !== "writeback_allowed") {
      reasons.add("github_label_requires_writeback_allowed");
    }
    if (proposal.approvalStatus !== "approved") {
      reasons.add("github_label_requires_approval");
    }
    try {
      const preview = buildGitHubLabelProposalPreview(proposal);
      if (preview.mode !== "add") reasons.add("github_label_mode_not_supported");
      if (preview.labels.length !== 1) {
        reasons.add("github_label_single_label_required");
      }
      if (preview.executionBlocked && proposal.approvalStatus === "approved") {
        reasons.add("github_label_target_or_policy_blocked");
      }
      try {
        assertGitHubLabelWritebackAllowlisted(preview.target, preview.labels);
      } catch {
        reasons.add("github_label_target_not_allowlisted");
      }
    } catch {
      reasons.add("github_label_invalid_payload_or_destination");
    }
  }

  return [...reasons];
}

function isExternalWritebackDestination(proposal: ExternalActionProposal) {
  return proposal.destinationType === "github" || proposal.destinationType === "slack";
}

function isCompletedExternalWriteback(proposal: ExternalActionProposal) {
  return (
    isExternalWritebackDestination(proposal) &&
    ["completed", "executed"].includes(proposal.executionStatus)
  );
}

function writebackTargetSummary(proposal: ExternalActionProposal) {
  if (proposal.destinationType === "github" && isGitHubStatusCheckAction(proposal.actionType)) {
    const repo =
      typeof proposal.payload.repo === "string" && proposal.payload.repo.trim()
        ? proposal.payload.repo.trim()
        : "unknown_repo";
    const sha =
      typeof proposal.payload.sha === "string" && proposal.payload.sha.trim()
        ? proposal.payload.sha.trim().slice(0, 12)
        : null;
    const pullNumber =
      typeof proposal.payload.pullNumber === "number"
        ? `PR #${proposal.payload.pullNumber}`
        : typeof proposal.payload.pull_number === "number"
          ? `PR #${proposal.payload.pull_number}`
          : null;
    const context =
      typeof proposal.payload.context === "string" && proposal.payload.context.trim()
        ? proposal.payload.context.trim()
        : typeof proposal.payload.name === "string" && proposal.payload.name.trim()
          ? proposal.payload.name.trim()
          : proposal.actionType;
    const state =
      typeof proposal.payload.state === "string" && proposal.payload.state.trim()
        ? proposal.payload.state.trim()
        : typeof proposal.payload.conclusion === "string" &&
            proposal.payload.conclusion.trim()
          ? proposal.payload.conclusion.trim()
          : null;
    return [repo, sha ?? pullNumber ?? "unknown_ref", context, state]
      .filter(Boolean)
      .join(" | ");
  }

  if (proposal.destinationType === "github" && isGitHubLabelAction(proposal.actionType)) {
    try {
      const preview = buildGitHubLabelProposalPreview(proposal);
      return `${preview.target.fullName}#${preview.target.number} | label:${preview.labels.join(
        ","
      )} | ${preview.mode}`;
    } catch {
      return proposal.destinationRef;
    }
  }

  if (proposal.destinationType === "github" && isGitHubCommentAction(proposal.actionType)) {
    try {
      const target = parseGitHubIssueOrPullRef(proposal.destinationRef ?? "");
      return `${target.fullName}#${target.number} | comment`;
    } catch {
      return proposal.destinationRef;
    }
  }

  if (proposal.destinationType === "slack" && isSlackThreadReplyAction(proposal.actionType)) {
    try {
      const target = parseSlackThreadRef(proposal.destinationRef ?? "");
      return `${target.channelId} | thread:${target.threadTs}`;
    } catch {
      return proposal.destinationRef;
    }
  }

  return proposal.destinationRef;
}

function githubStatusWritebackEvidence(
  proposal: ExternalActionProposal
): GitHubStatusWritebackEvidence | null {
  if (proposal.destinationType !== "github" || proposal.actionType !== "github_status") {
    return null;
  }
  const executionEvent = latestWritebackExecutionAudit(proposal);
  const metadata = auditMetadata(executionEvent);
  const request = metadataRecord(metadata.request);
  const response = metadataRecord(metadata.response);
  const target = metadataRecord(request.target);
  const repo =
    metadataString(target.repo) ?? metadataString(proposal.payload.repo) ?? null;
  const sha =
    metadataString(target.sha) ??
    metadataString(proposal.payload.sha) ??
    metadataString(proposal.payload.headSha) ??
    null;
  const context =
    metadataString(request.contextName) ??
    metadataString(proposal.payload.context) ??
    metadataString(proposal.payload.name) ??
    null;
  const state =
    metadataString(request.state) ??
    metadataString(proposal.payload.state) ??
    metadataString(proposal.payload.conclusion) ??
    null;
  const completedNoop =
    metadataBoolean(response.completedNoop) ?? hasCompletedNoopAudit(proposal);
  const mutationAttempted =
    metadataBoolean(response.mutationAttempted) ??
    hasExternalMutationAttemptAudit(proposal);
  const existingStatusesReadCount =
    metadataNumber(response.existingStatusesReadCount) ??
    metadataNumber(response.existingStatusesRead) ??
    null;
  const successfulStatusEvent =
    executionEvent?.event === "github_status_set" ||
    executionEvent?.event === "github_status_completed_noop";
  return {
    repo,
    sha,
    shortSha: sha ? sha.slice(0, 12) : null,
    context,
    state,
    statusId: metadataString(response.statusId) ?? proposal.externalId,
    statusUrl: metadataString(response.statusUrl),
    externalUrl: metadataString(response.externalUrl) ?? proposal.externalUrl,
    repoPrivate: metadataBoolean(response.repoPrivate),
    allowlistMatched:
      metadataBoolean(response.allowlistMatched) ??
      (successfulStatusEvent ? true : null),
    existingStatusesRead:
      metadataBoolean(response.existingStatusesRead) ??
      (existingStatusesReadCount !== null || successfulStatusEvent),
    existingStatusesReadCount,
    duplicateDetected:
      metadataBoolean(response.duplicateDetected) ??
      metadataBoolean(response.reusedExisting) ??
      completedNoop,
    completedNoop,
    mutationAttempted,
    response: Object.keys(response).length ? response : null,
  };
}

function buildWritebackAuditReview(
  proposal: ExternalActionProposal,
  executionReview: CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"]
): CompanyBrainWritebackSafetyDashboard["items"][number]["auditReview"] {
  const latestAudit = latestExternalActionAudit(proposal);
  const approvalAudit = latestAuditEvent(proposal, "approved");
  const previewAudit = executionReview.previewEvent
    ? latestAuditEvent(proposal, executionReview.previewEvent)
    : null;
  const executionAudit = latestWritebackExecutionAudit(proposal);
  const githubStatus = githubStatusWritebackEvidence(proposal);
  return {
    eventCount: proposal.auditTrail.length,
    latestEvent: latestAudit?.event ?? null,
    latestActor: latestAudit?.actor ?? null,
    latestAt: latestAudit?.at ?? null,
    executionEvent: executionAudit?.event ?? null,
    blockReasons: writebackBlockReasons(proposal, executionReview),
    approvalEventAt: approvalAudit?.at ?? null,
    approvalActor: approvalAudit?.actor ?? null,
    previewEventAt: previewAudit?.at ?? null,
    executionEventAt: executionAudit?.at ?? null,
    duplicatePrevented: executionReview.flags.includes("duplicate_prevented"),
    completedNoop: hasCompletedNoopAudit(proposal),
    mutationAttempted: hasExternalMutationAttemptAudit(proposal),
    hasExternalRef: Boolean(proposal.externalId || proposal.externalUrl),
    hasError: Boolean(proposal.errorSummary),
    payloadHashCurrent: executionReview.payloadHashCurrent,
    idempotencyKey: proposal.idempotencyKey,
    destinationRef: proposal.destinationRef,
    targetSummary: writebackTargetSummary(proposal),
    githubStatus,
  };
}

function writebackSafetyItemKind(
  proposal: ExternalActionProposal
): CompanyBrainWritebackSafetyDashboard["items"][number]["kind"] | null {
  const review = buildWritebackExecutionReview(proposal);
  if (review.status === "duplicate_prevented") return "duplicate_avoided";
  if (isCompletedExternalWriteback(proposal)) return "completed_external_writeback";
  if (review.status === "blocked") return "blocked_proposal";
  if (proposal.executionStatus === "failed") return "failed_execution";
  if (
    proposal.approvalStatus === "approved" &&
    ["not_started", "dry_run"].includes(proposal.executionStatus)
  ) {
    return "approved_ready";
  }
  if (proposal.approvalStatus === "pending") return "pending_approval";
  if (proposal.approvalStatus === "rejected") return "rejected_proposal";
  if (proposal.approvalStatus === "blocked") return "blocked_proposal";
  return null;
}

function writebackSafetyNextAction(
  proposal: ExternalActionProposal,
  kind: CompanyBrainWritebackSafetyDashboard["items"][number]["kind"],
  review: CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"]
) {
  if (review.status === "ready_to_execute") {
    return "Execute only after confirming payload, destination and idempotency marker.";
  }
  if (review.status === "needs_preview") {
    return "Run a fresh preview after approval before executing.";
  }
  if (review.status === "needs_reapproval") {
    return "Review payload, destination and idempotency key before approving again.";
  }
  if (review.status === "payload_mismatch") {
    return "Create a new preview and approval because payload changed.";
  }
  if (review.status === "destination_mismatch") {
    return "Create a new preview and approval because destination changed.";
  }
  if (review.status === "retryable_failed") {
    return "Retry only with a new human retry rationale.";
  }
  if (review.status === "unsafe_failed") {
    return "Do not retry; create a new proposal or reapprove after review.";
  }
  if (review.status === "blocked") {
    return "Execution is blocked by policy; keep as preview-only or create a new proposal.";
  }
  if (
    kind === "completed_external_writeback" &&
    (!proposal.externalId || !proposal.externalUrl)
  ) {
    return "Review completed writeback with missing external id or URL.";
  }
  if (kind === "completed_external_writeback") {
    return "Include in audit review and monitor for follow-up signal.";
  }
  if (kind === "duplicate_avoided") {
    return "Confirm idempotency marker reuse and keep the proposal closed.";
  }
  if (kind === "failed_execution") {
    return "Review error summary before retrying or rejecting the proposal.";
  }
  if (kind === "approved_ready") {
    return "Run adapter preview before any approved execution.";
  }
  if (kind === "pending_approval") {
    return "Approve or reject through HITL review.";
  }
  if (kind === "rejected_proposal") {
    return "Keep rejection rationale available for audit.";
  }
  return "Blocked by governance; do not execute without a new risk policy.";
}

function writebackAdapterKey(
  proposal: ExternalActionProposal
): CompanyBrainWritebackSafetyDashboard["adapterSummaries"][number]["adapter"] {
  if (proposal.destinationType === "github" && isGitHubCommentAction(proposal.actionType)) {
    return "github_comment";
  }
  if (proposal.destinationType === "github" && isGitHubLabelAction(proposal.actionType)) {
    return "github_label";
  }
  if (
    proposal.destinationType === "github" &&
    isGitHubStatusCheckAction(proposal.actionType)
  ) {
    return "github_status_check";
  }
  if (proposal.destinationType === "slack" && isSlackThreadReplyAction(proposal.actionType)) {
    return "slack_thread_reply";
  }
  return "other";
}

function buildWritebackAdapterSummaries(
  proposals: ExternalActionProposal[],
  reviews: Map<
    string,
    CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"]
  >
): CompanyBrainWritebackSafetyDashboard["adapterSummaries"] {
  const summaries = new Map<
    CompanyBrainWritebackSafetyDashboard["adapterSummaries"][number]["adapter"],
    CompanyBrainWritebackSafetyDashboard["adapterSummaries"][number]
  >();
  for (const proposal of proposals) {
    const adapter = writebackAdapterKey(proposal);
    const existing =
      summaries.get(adapter) ?? {
        adapter,
        proposalCount: 0,
        completedCount: 0,
        completedNoopCount: 0,
        mutationAttemptedCount: 0,
        blockedCount: 0,
        readyCount: 0,
        failedCount: 0,
        latestAt: null,
      };
    const review = reviews.get(proposal.id) ?? buildWritebackExecutionReview(proposal);
    const latestAudit = latestExternalActionAudit(proposal);
    existing.proposalCount += 1;
    if (isCompletedExternalWriteback(proposal)) existing.completedCount += 1;
    if (hasCompletedNoopAudit(proposal)) existing.completedNoopCount += 1;
    if (hasExternalMutationAttemptAudit(proposal)) {
      existing.mutationAttemptedCount += 1;
    }
    if (review.status === "blocked") existing.blockedCount += 1;
    if (review.status === "ready_to_execute") existing.readyCount += 1;
    if (proposal.executionStatus === "failed") existing.failedCount += 1;
    const latestAt = latestAudit?.at ?? proposal.updatedAt;
    existing.latestAt =
      existing.latestAt === null ? latestAt : Math.max(existing.latestAt, latestAt);
    summaries.set(adapter, existing);
  }
  return [...summaries.values()].sort((a, b) => (b.latestAt ?? 0) - (a.latestAt ?? 0));
}

function writebackDestinationSummaryBase(proposal: ExternalActionProposal) {
  if (proposal.destinationType === "github") {
    try {
      const target = parseGitHubIssueOrPullRef(proposal.destinationRef ?? "");
      return {
        destinationKey: `github:${target.fullName}`,
        destinationLabel: target.fullName,
      };
    } catch {
      const repo = metadataString(proposal.payload.repo);
      if (repo) {
        return {
          destinationKey: `github:${repo}`,
          destinationLabel: repo,
        };
      }
    }
  }
  if (proposal.destinationType === "slack") {
    try {
      const target = parseSlackThreadRef(proposal.destinationRef ?? "");
      return {
        destinationKey: `slack:${target.channelId}`,
        destinationLabel: target.channelId,
      };
    } catch {
      // Fall through to raw destination.
    }
  }
  const raw = proposal.destinationRef?.trim() || "unknown";
  return {
    destinationKey: `${proposal.destinationType}:${raw}`,
    destinationLabel: raw,
  };
}

function buildWritebackDestinationSummaries(
  proposals: ExternalActionProposal[],
  reviews: Map<
    string,
    CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"]
  >
): CompanyBrainWritebackSafetyDashboard["destinationSummaries"] {
  const summaries = new Map<
    string,
    CompanyBrainWritebackSafetyDashboard["destinationSummaries"][number]
  >();
  for (const proposal of proposals) {
    const base = writebackDestinationSummaryBase(proposal);
    const existing =
      summaries.get(base.destinationKey) ?? {
        destinationKey: base.destinationKey,
        destinationType: proposal.destinationType,
        destinationLabel: base.destinationLabel,
        proposalCount: 0,
        completedCount: 0,
        completedNoopCount: 0,
        mutationAttemptedCount: 0,
        blockedCount: 0,
        failedCount: 0,
        latestAt: null,
      };
    const review = reviews.get(proposal.id) ?? buildWritebackExecutionReview(proposal);
    const latestAudit = latestExternalActionAudit(proposal);
    existing.proposalCount += 1;
    if (isCompletedExternalWriteback(proposal)) existing.completedCount += 1;
    if (hasCompletedNoopAudit(proposal)) existing.completedNoopCount += 1;
    if (hasExternalMutationAttemptAudit(proposal)) {
      existing.mutationAttemptedCount += 1;
    }
    if (review.status === "blocked") existing.blockedCount += 1;
    if (proposal.executionStatus === "failed") existing.failedCount += 1;
    const latestAt = latestAudit?.at ?? proposal.updatedAt;
    existing.latestAt =
      existing.latestAt === null ? latestAt : Math.max(existing.latestAt, latestAt);
    summaries.set(base.destinationKey, existing);
  }
  return [...summaries.values()].sort((a, b) => (b.latestAt ?? 0) - (a.latestAt ?? 0));
}

function incrementSummaryCount<T extends string>(
  counts: Partial<Record<T, number>>,
  key: T
) {
  counts[key] = (counts[key] ?? 0) + 1;
}

function writebackTargetObservabilityBase(proposal: ExternalActionProposal) {
  const githubStatus = githubStatusWritebackEvidence(proposal);
  if (proposal.destinationType === "github") {
    try {
      const target = parseGitHubIssueOrPullRef(proposal.destinationRef ?? "");
      return {
        targetKey: `github:${target.fullName}`,
        targetType: "github_repo" as const,
        targetLabel: target.fullName,
      };
    } catch {
      const repo = githubStatus?.repo ?? metadataString(proposal.payload.repo);
      if (repo) {
        return {
          targetKey: `github:${repo}`,
          targetType: "github_repo" as const,
          targetLabel: repo,
        };
      }
    }
  }
  if (proposal.destinationType === "slack") {
    try {
      const target = parseSlackThreadRef(proposal.destinationRef ?? "");
      return {
        targetKey: `slack:${target.channelId}`,
        targetType: "slack_channel" as const,
        targetLabel: target.channelId,
      };
    } catch {
      // Fall through to raw destination.
    }
  }
  const raw = proposal.destinationRef?.trim();
  if (raw) {
    return {
      targetKey: `${proposal.destinationType}:${raw}`,
      targetType: "external_target" as const,
      targetLabel: raw,
    };
  }
  return {
    targetKey: `${proposal.destinationType}:unknown`,
    targetType: "unknown" as const,
    targetLabel: "unknown",
  };
}

function isStaleApprovedWithoutPreview(
  proposal: ExternalActionProposal,
  review: CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"],
  generatedAt: number
) {
  return (
    proposal.approvalStatus === "approved" &&
    proposal.approvedAt !== null &&
    review.previewAt === null &&
    generatedAt - proposal.approvedAt > WRITEBACK_PREVIEW_STALE_MS
  );
}

function buildWritebackTargetObservabilitySummaries(
  proposals: ExternalActionProposal[],
  reviews: Map<
    string,
    CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"]
  >,
  generatedAt: number
): CompanyBrainWritebackSafetyDashboard["targetObservabilitySummaries"] {
  const summaries = new Map<
    string,
    CompanyBrainWritebackSafetyDashboard["targetObservabilitySummaries"][number]
  >();
  for (const proposal of proposals) {
    const base = writebackTargetObservabilityBase(proposal);
    const review = reviews.get(proposal.id) ?? buildWritebackExecutionReview(proposal);
    const latestAudit = latestExternalActionAudit(proposal);
    const latestAt = latestAudit?.at ?? proposal.updatedAt;
    const githubStatus = githubStatusWritebackEvidence(proposal);
    const existing =
      summaries.get(base.targetKey) ?? {
        targetKey: base.targetKey,
        targetType: base.targetType,
        targetLabel: base.targetLabel,
        destinationType: proposal.destinationType,
        repoPrivate: null,
        proposalCount: 0,
        completedCount: 0,
        completedNoopCount: 0,
        failedCount: 0,
        blockedCount: 0,
        mutationAttemptedCount: 0,
        duplicateAvoidedCount: 0,
        staleApprovalCount: 0,
        stalePreviewCount: 0,
        needsReviewCount: 0,
        adapters: {},
        executionStatuses: {},
        reviewStatuses: {},
        latestAt: null,
        latestExternalUrl: null,
        latestTargetSummary: null,
      };

    existing.proposalCount += 1;
    if (isCompletedExternalWriteback(proposal)) existing.completedCount += 1;
    if (hasCompletedNoopAudit(proposal)) existing.completedNoopCount += 1;
    if (proposal.executionStatus === "failed") existing.failedCount += 1;
    if (review.status === "blocked") existing.blockedCount += 1;
    if (hasExternalMutationAttemptAudit(proposal)) {
      existing.mutationAttemptedCount += 1;
    }
    if (hasDuplicateAvoidanceAudit(proposal)) existing.duplicateAvoidedCount += 1;
    if (isStaleApprovedWithoutPreview(proposal, review, generatedAt)) {
      existing.staleApprovalCount += 1;
    }
    if (review.flags.includes("stale_preview")) existing.stalePreviewCount += 1;
    if (review.status !== "completed" && review.status !== "duplicate_prevented") {
      existing.needsReviewCount += 1;
    }
    if (githubStatus?.repoPrivate !== null && githubStatus?.repoPrivate !== undefined) {
      existing.repoPrivate = githubStatus.repoPrivate;
    }
    incrementSummaryCount(existing.adapters, writebackAdapterKey(proposal));
    incrementSummaryCount(existing.executionStatuses, proposal.executionStatus);
    incrementSummaryCount(existing.reviewStatuses, review.status);
    if (existing.latestAt === null || latestAt >= existing.latestAt) {
      existing.latestAt = latestAt;
      existing.latestExternalUrl = proposal.externalUrl;
      existing.latestTargetSummary = writebackTargetSummary(proposal);
    }
    summaries.set(base.targetKey, existing);
  }
  return [...summaries.values()].sort((a, b) => (b.latestAt ?? 0) - (a.latestAt ?? 0));
}

function durationBetween(start: number | null | undefined, end: number | null | undefined) {
  if (
    typeof start !== "number" ||
    typeof end !== "number" ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end < start
  ) {
    return null;
  }
  return end - start;
}

function averageDuration(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null);
  if (!valid.length) return null;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function rate(count: number, total: number) {
  if (total <= 0) return 0;
  return Number((count / total).toFixed(4));
}

function buildWritebackOperatingLoopMetrics(
  data: ReturnType<typeof listAll>,
  reviews: Map<
    string,
    CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"]
  >,
  generatedAt: number
): CompanyBrainWritebackSafetyDashboard["operatingLoopMetrics"] {
  const proposals = data.externalActionProposals;
  const guidanceById = new Map(data.guidanceItems.map((item) => [item.id, item]));
  const blockReasonByProposal = new Map<string, string[]>();
  const durations = {
    guidanceToProposal: [] as Array<number | null>,
    proposalToApproval: [] as Array<number | null>,
    approvalToPreview: [] as Array<number | null>,
    previewToExecution: [] as Array<number | null>,
    proposalToExecution: [] as Array<number | null>,
  };

  for (const proposal of proposals) {
    const guidance = guidanceById.get(proposal.guidanceItemId) ?? null;
    const review =
      reviews.get(proposal.id) ?? buildWritebackExecutionReview(proposal, generatedAt);
    const executionAudit = latestWritebackExecutionAudit(proposal);
    const blockReasons = writebackBlockReasons(proposal, review);
    blockReasonByProposal.set(proposal.id, blockReasons);

    durations.guidanceToProposal.push(
      durationBetween(guidance?.createdAt, proposal.createdAt)
    );
    durations.proposalToApproval.push(
      durationBetween(proposal.createdAt, proposal.approvedAt)
    );
    durations.approvalToPreview.push(
      durationBetween(proposal.approvedAt, review.previewAt)
    );
    durations.previewToExecution.push(
      durationBetween(review.previewAt, executionAudit?.at)
    );
    durations.proposalToExecution.push(
      durationBetween(proposal.createdAt, executionAudit?.at)
    );
  }

  const proposalCount = proposals.length;
  const counts = {
    pendingApproval: proposals.filter((proposal) => proposal.approvalStatus === "pending")
      .length,
    approved: proposals.filter((proposal) => proposal.approvalStatus === "approved")
      .length,
    blocked: proposals.filter((proposal) => {
      const review = reviews.get(proposal.id);
      return (
        proposal.approvalStatus === "blocked" ||
        proposal.executionStatus === "blocked" ||
        review?.status === "blocked"
      );
    }).length,
    rejected: proposals.filter((proposal) => proposal.approvalStatus === "rejected")
      .length,
    failed: proposals.filter((proposal) => proposal.executionStatus === "failed").length,
    completed: proposals.filter(isCompletedExternalWriteback).length,
    completedNoop: proposals.filter(hasCompletedNoopAudit).length,
    duplicatePrevented: proposals.filter(hasDuplicateAvoidanceAudit).length,
    mutationAttempted: proposals.filter(hasExternalMutationAttemptAudit).length,
    staleApproval: proposals.filter((proposal) => {
      const review = reviews.get(proposal.id);
      return (
        proposal.approvalStatus === "approved" &&
        proposal.approvedAt !== null &&
        review?.previewAt === null &&
        generatedAt - proposal.approvedAt > WRITEBACK_PREVIEW_STALE_MS
      );
    }).length,
    stalePreview: proposals.filter((proposal) =>
      reviews.get(proposal.id)?.flags.includes("stale_preview")
    ).length,
    previewOnlyBlocked: proposals.filter((proposal) =>
      (blockReasonByProposal.get(proposal.id) ?? []).some((reason) =>
        reason.endsWith("_preview_only")
      )
    ).length,
  };

  return {
    generatedAt,
    staleThresholdMs: WRITEBACK_PREVIEW_STALE_MS,
    proposalCount,
    counts,
    rates: {
      blocked: rate(counts.blocked, proposalCount),
      rejected: rate(counts.rejected, proposalCount),
      failed: rate(counts.failed, proposalCount),
      completed: rate(counts.completed, proposalCount),
      completedNoop: rate(counts.completedNoop, proposalCount),
      duplicatePrevented: rate(counts.duplicatePrevented, proposalCount),
      mutationAttempted: rate(counts.mutationAttempted, proposalCount),
    },
    averageDurationsMs: {
      guidanceToProposal: averageDuration(durations.guidanceToProposal),
      proposalToApproval: averageDuration(durations.proposalToApproval),
      approvalToPreview: averageDuration(durations.approvalToPreview),
      previewToExecution: averageDuration(durations.previewToExecution),
      proposalToExecution: averageDuration(durations.proposalToExecution),
    },
  };
}

function auditTrailTextMatches(
  value: string,
  proposal: ExternalActionProposal,
  event?: ExternalActionAuditEvent,
  blockReasons: string[] = []
) {
  const haystack = [
    proposal.id,
    proposal.guidanceItemId,
    proposal.signalId,
    proposal.findingId,
    proposal.workItemId,
    proposal.workflowRunId,
    proposal.title,
    proposal.rationale,
    proposal.destinationRef,
    proposal.idempotencyKey,
    proposal.externalId,
    proposal.externalUrl,
    writebackTargetSummary(proposal),
    event?.event,
    event?.actor,
    event?.note,
    event?.metadata ? JSON.stringify(event.metadata) : null,
    ...blockReasons,
  ]
    .filter((item): item is string => typeof item === "string")
    .join("\n")
    .toLowerCase();
  return haystack.includes(value.toLowerCase());
}

function buildWritebackAuditTrail(args: {
  proposals: ExternalActionProposal[];
  reviews: Map<
    string,
    CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"]
  >;
  adapter?: CompanyBrainWritebackAuditTrailResponse["filters"]["adapter"];
  proposalId?: string | null;
  guidanceItemId?: string | null;
  destinationType?: CompanyBrainWritebackAuditTrailResponse["filters"]["destinationType"];
  actionType?: CompanyBrainWritebackAuditTrailResponse["filters"]["actionType"];
  riskClass?: CompanyBrainWritebackAuditTrailResponse["filters"]["riskClass"];
  executionStatus?: CompanyBrainWritebackAuditTrailResponse["filters"]["executionStatus"];
  event?: string | null;
  actor?: string | null;
  fromAt?: number | null;
  toAt?: number | null;
  idempotencyKey?: string | null;
  externalUrl?: string | null;
  search?: string | null;
  limit?: number;
}): CompanyBrainWritebackAuditTrailResponse {
  const limit = Math.max(1, Math.min(args.limit ?? 50, 250));
  const entries: CompanyBrainWritebackAuditTrailResponse["items"] = [];
  for (const proposal of args.proposals) {
    const adapter = writebackAdapterKey(proposal);
    if (args.adapter && adapter !== args.adapter) continue;
    if (args.proposalId && proposal.id !== args.proposalId) continue;
    if (args.guidanceItemId && proposal.guidanceItemId !== args.guidanceItemId) {
      continue;
    }
    if (args.destinationType && proposal.destinationType !== args.destinationType) {
      continue;
    }
    if (args.actionType && proposal.actionType !== args.actionType) continue;
    if (args.riskClass && proposal.riskClass !== args.riskClass) continue;
    if (args.executionStatus && proposal.executionStatus !== args.executionStatus) {
      continue;
    }
    if (
      args.idempotencyKey &&
      !proposal.idempotencyKey
        .toLowerCase()
        .includes(args.idempotencyKey.toLowerCase())
    ) {
      continue;
    }
    if (
      args.externalUrl &&
      !(proposal.externalUrl ?? "")
        .toLowerCase()
        .includes(args.externalUrl.toLowerCase())
    ) {
      continue;
    }
    const review =
      args.reviews.get(proposal.id) ?? buildWritebackExecutionReview(proposal);
    const blockReasons = writebackBlockReasons(proposal, review);
    for (const event of proposal.auditTrail) {
      if (
        args.actor &&
        !(event.actor ?? "").toLowerCase().includes(args.actor.toLowerCase())
      ) {
        continue;
      }
      if (args.fromAt !== undefined && args.fromAt !== null && event.at < args.fromAt) {
        continue;
      }
      if (args.toAt !== undefined && args.toAt !== null && event.at > args.toAt) {
        continue;
      }
      if (args.event && event.event !== args.event) {
        continue;
      }
      if (
        args.search &&
        !auditTrailTextMatches(args.search, proposal, event, blockReasons)
      ) {
        continue;
      }
      entries.push({
        proposalId: proposal.id,
        adapter,
        title: proposal.title,
        destinationType: proposal.destinationType,
        destinationRef: proposal.destinationRef,
        actionType: proposal.actionType,
        riskClass: proposal.riskClass,
        actionPolicy: proposal.actionPolicy,
        approvalStatus: proposal.approvalStatus,
        executionStatus: proposal.executionStatus,
        idempotencyKey: proposal.idempotencyKey,
        targetSummary: writebackTargetSummary(proposal),
        externalId: proposal.externalId,
        externalUrl: proposal.externalUrl,
        githubStatus: githubStatusWritebackEvidence(proposal),
        reviewStatus: review.status,
        blockReasons,
        event: event.event,
        actor: event.actor,
        at: event.at,
        note: event.note,
        metadata: event.metadata ?? null,
      });
    }
  }
  entries.sort((a, b) => b.at - a.at);
  return {
    generatedAt: now(),
    filters: {
      adapter: args.adapter ?? null,
      proposalId: args.proposalId ?? null,
      guidanceItemId: args.guidanceItemId ?? null,
      destinationType: args.destinationType ?? null,
      actionType: args.actionType ?? null,
      riskClass: args.riskClass ?? null,
      executionStatus: args.executionStatus ?? null,
      event: args.event ?? null,
      actor: args.actor ?? null,
      fromAt: args.fromAt ?? null,
      toAt: args.toAt ?? null,
      idempotencyKey: args.idempotencyKey ?? null,
      externalUrl: args.externalUrl ?? null,
      search: args.search ?? null,
      limit,
    },
    items: entries.slice(0, limit),
    total: entries.length,
  };
}

function csvCell(value: unknown) {
  const raw =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : JSON.stringify(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

function writebackAuditTrailCsv(data: CompanyBrainWritebackAuditTrailResponse) {
  const columns: Array<keyof CompanyBrainWritebackAuditTrailResponse["items"][number]> =
    [
      "at",
      "adapter",
      "proposalId",
      "event",
      "actor",
      "title",
      "destinationType",
      "destinationRef",
      "actionType",
      "riskClass",
      "actionPolicy",
      "approvalStatus",
      "executionStatus",
      "reviewStatus",
      "idempotencyKey",
      "targetSummary",
      "externalId",
      "externalUrl",
      "githubStatus",
      "blockReasons",
      "note",
      "metadata",
    ];
  return [
    columns.map(csvCell).join(","),
    ...data.items.map((item) => columns.map((column) => csvCell(item[column])).join(",")),
  ].join("\n");
}

const writebackEvidenceIntegrityGapKinds: Array<
  NonNullable<CompanyBrainWritebackEvidenceIntegrityGapsResponse["filters"]["kind"]>
> = [
  "missing_guidance_link",
  "missing_signal_or_finding_link",
  "missing_work_item_or_workflow_link",
  "missing_approval_event",
  "missing_preview_event",
  "missing_execution_event",
  "missing_payload_hash",
  "missing_idempotency_key",
  "missing_external_ref_after_completed",
  "stale_preview",
  "stale_approval",
  "insufficient_rationale",
  "incomplete_provenance",
];

function rationaleIsInsufficient(value: string | null | undefined) {
  return !value || value.trim().length < 20;
}

function provenanceIsIncomplete(provenance: Provenance | null) {
  return (
    !provenance ||
    !provenance.createdFrom ||
    !provenance.extractedAt ||
    !provenance.humanReviewStatus ||
    (!provenance.rawRef && !provenance.sourceId && !provenance.artifactId)
  );
}

function buildWritebackEvidenceIntegrityGaps(
  data: ReturnType<typeof listAll>,
  reviews: Map<
    string,
    CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"]
  >,
  generatedAt = now()
): CompanyBrainWritebackEvidenceIntegrityGapsResponse["items"] {
  const guidanceIds = new Set(data.guidanceItems.map((item) => item.id));
  const signalIds = new Set(data.signals.map((item) => item.id));
  const findingIds = new Set(data.alignmentFindings.map((item) => item.id));
  const workItemIds = new Set(data.workItems.map((item) => item.id));
  const workflowRunIds = new Set(data.workflowRuns.map((item) => item.id));
  const gaps: CompanyBrainWritebackEvidenceIntegrityGapsResponse["items"] = [];

  const addGap = (
    proposal: ExternalActionProposal,
    review: CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"],
    kind: NonNullable<
      CompanyBrainWritebackEvidenceIntegrityGapsResponse["filters"]["kind"]
    >,
    severity: SignalSeverity,
    rationale: string
  ) => {
    const latestAudit = latestExternalActionAudit(proposal);
    gaps.push({
      id: `writeback_integrity:${kind}:${proposal.id}`,
      proposalId: proposal.id,
      title: proposal.title,
      adapter: writebackAdapterKey(proposal),
      kind,
      severity,
      rationale,
      destinationType: proposal.destinationType,
      actionType: proposal.actionType,
      riskClass: proposal.riskClass,
      approvalStatus: proposal.approvalStatus,
      executionStatus: proposal.executionStatus,
      reviewStatus: review.status,
      actor: review.actor ?? latestAudit?.actor ?? proposal.approvedBy,
      detectedAt: generatedAt,
      latestAuditAt: latestAudit?.at ?? null,
    });
  };

  for (const proposal of data.externalActionProposals) {
    const review =
      reviews.get(proposal.id) ?? buildWritebackExecutionReview(proposal, generatedAt);
    const approvalEvent = latestAuditEvent(proposal, "approved");
    const previewEvent = review.previewEvent ? latestAuditEvent(proposal, review.previewEvent) : null;
    const executionEvent = latestWritebackExecutionAudit(proposal);
    const isApprovedOrBeyond =
      proposal.approvalStatus === "approved" ||
      ["dry_run", "completed", "executed", "failed"].includes(
        proposal.executionStatus
      );
    const hasSignal = proposal.signalId ? signalIds.has(proposal.signalId) : false;
    const hasFinding = proposal.findingId
      ? findingIds.has(proposal.findingId)
      : false;
    const hasWorkItem = proposal.workItemId
      ? workItemIds.has(proposal.workItemId)
      : false;
    const hasWorkflowRun = proposal.workflowRunId
      ? workflowRunIds.has(proposal.workflowRunId)
      : false;

    if (!guidanceIds.has(proposal.guidanceItemId)) {
      addGap(
        proposal,
        review,
        "missing_guidance_link",
        "warn",
        "Proposal guidanceItemId does not resolve to a GuidanceItem."
      );
    }
    if (!hasSignal && !hasFinding) {
      addGap(
        proposal,
        review,
        "missing_signal_or_finding_link",
        "warn",
        "Proposal is not linked to a Signal or AlignmentFinding."
      );
    }
    if (!hasWorkItem && !hasWorkflowRun) {
      addGap(
        proposal,
        review,
        "missing_work_item_or_workflow_link",
        "warn",
        "Proposal is not linked to a WorkItem or WorkflowRun."
      );
    }
    if (isApprovedOrBeyond && !approvalEvent) {
      addGap(
        proposal,
        review,
        "missing_approval_event",
        "critical",
        "Approved or executed proposal is missing an approval audit event."
      );
    }
    if (
      proposal.approvalStatus === "approved" &&
      proposal.executionStatus !== "not_started" &&
      !previewEvent
    ) {
      addGap(
        proposal,
        review,
        "missing_preview_event",
        "critical",
        "Approved proposal has advanced beyond not_started without a preview audit event."
      );
    }
    if (
      ["completed", "executed", "failed"].includes(proposal.executionStatus) &&
      !executionEvent
    ) {
      addGap(
        proposal,
        review,
        "missing_execution_event",
        "critical",
        "Completed, executed or failed proposal is missing an execution audit event."
      );
    }
    if (
      !review.payloadHashCurrent ||
      (isApprovedOrBeyond && !review.payloadHashApproved) ||
      (review.previewAt !== null && !review.payloadHashPreview)
    ) {
      addGap(
        proposal,
        review,
        "missing_payload_hash",
        "critical",
        "Payload hash snapshot is missing from current, approval or preview state."
      );
    }
    if (
      !proposal.idempotencyKey.trim() ||
      (isApprovedOrBeyond && !review.idempotencyKeyApproved) ||
      (review.previewAt !== null && !review.idempotencyKeyPreview)
    ) {
      addGap(
        proposal,
        review,
        "missing_idempotency_key",
        "critical",
        "Idempotency key is missing from proposal, approval or preview snapshot."
      );
    }
    if (
      isCompletedExternalWriteback(proposal) &&
      (!proposal.externalId || !proposal.externalUrl)
    ) {
      addGap(
        proposal,
        review,
        "missing_external_ref_after_completed",
        "critical",
        "Completed external writeback is missing externalId or externalUrl."
      );
    }
    if (review.flags.includes("stale_preview")) {
      addGap(
        proposal,
        review,
        "stale_preview",
        "warn",
        "Preview snapshot is older than the retry-safety freshness window."
      );
    }
    if (
      proposal.approvalStatus === "approved" &&
      proposal.approvedAt !== null &&
      review.previewAt === null &&
      generatedAt - proposal.approvedAt > WRITEBACK_PREVIEW_STALE_MS
    ) {
      addGap(
        proposal,
        review,
        "stale_approval",
        "warn",
        "Approval is stale and no fresh preview exists after approval."
      );
    }
    if (
      rationaleIsInsufficient(proposal.rationale) ||
      (isApprovedOrBeyond && rationaleIsInsufficient(review.rationale))
    ) {
      addGap(
        proposal,
        review,
        "insufficient_rationale",
        "warn",
        "Proposal or HITL approval rationale is missing or too short for audit review."
      );
    }
    if (provenanceIsIncomplete(proposal.provenance)) {
      addGap(
        proposal,
        review,
        "incomplete_provenance",
        "warn",
        "Proposal provenance is missing source/raw/artifact link, creator, extraction time or review status."
      );
    }
  }

  return gaps.sort(
    (a, b) =>
      (b.latestAuditAt ?? b.detectedAt) - (a.latestAuditAt ?? a.detectedAt)
  );
}

function buildWritebackEvidenceIntegritySummary(
  gaps: CompanyBrainWritebackEvidenceIntegrityGapsResponse["items"]
): CompanyBrainWritebackEvidenceIntegrityGapsResponse["summary"] {
  const byKind = Object.fromEntries(
    writebackEvidenceIntegrityGapKinds.map((kind) => [kind, 0])
  ) as CompanyBrainWritebackEvidenceIntegrityGapsResponse["summary"]["byKind"];
  const byAdapter = Object.fromEntries(
    (
      [
        "github_comment",
        "github_label",
        "github_status_check",
        "slack_thread_reply",
        "other",
      ] satisfies WritebackAdapterKey[]
    ).map((adapter) => [adapter, 0])
  ) as CompanyBrainWritebackEvidenceIntegrityGapsResponse["summary"]["byAdapter"];
  for (const gap of gaps) {
    byKind[gap.kind] += 1;
    byAdapter[gap.adapter] += 1;
  }
  return {
    total: gaps.length,
    criticalCount: gaps.filter((gap) => gap.severity === "critical").length,
    warnCount: gaps.filter((gap) => gap.severity === "warn").length,
    infoCount: gaps.filter((gap) => gap.severity === "info").length,
    byKind,
    byAdapter,
  };
}

function buildWritebackEvidenceIntegrityGapsResponse(args: {
  data: ReturnType<typeof listAll>;
  reviews: Map<
    string,
    CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"]
  >;
  severity?: SignalSeverity | null;
  kind?: CompanyBrainWritebackEvidenceIntegrityGapsResponse["filters"]["kind"];
  adapter?: CompanyBrainWritebackEvidenceIntegrityGapsResponse["filters"]["adapter"];
  proposalId?: string | null;
  limit?: number;
}): CompanyBrainWritebackEvidenceIntegrityGapsResponse {
  const limit = Math.max(1, Math.min(args.limit ?? 50, 250));
  const allGaps = buildWritebackEvidenceIntegrityGaps(args.data, args.reviews);
  const items = allGaps.filter((gap) => {
    if (args.severity && gap.severity !== args.severity) return false;
    if (args.kind && gap.kind !== args.kind) return false;
    if (args.adapter && gap.adapter !== args.adapter) return false;
    if (args.proposalId && gap.proposalId !== args.proposalId) return false;
    return true;
  });
  return {
    generatedAt: now(),
    filters: {
      severity: args.severity ?? null,
      kind: args.kind ?? null,
      adapter: args.adapter ?? null,
      proposalId: args.proposalId ?? null,
      limit,
    },
    items: items.slice(0, limit),
    total: items.length,
    summary: buildWritebackEvidenceIntegritySummary(allGaps),
  };
}

const writebackEvidenceRemediationActionKinds: Array<
  NonNullable<
    CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["filters"]["actionKind"]
  >
> = [
  "relink_guidance",
  "link_signal_or_finding",
  "link_work_or_workflow",
  "rerun_hitl_approval",
  "rerun_preview",
  "review_execution_audit",
  "capture_payload_hash",
  "create_new_proposal_with_idempotency",
  "attach_external_ref",
  "refresh_stale_review",
  "capture_human_rationale",
  "repair_provenance",
];

function remediationForIntegrityGap(
  gap: CompanyBrainWritebackEvidenceIntegrityGapsResponse["items"][number]
): Pick<
  CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["items"][number],
  | "actionKind"
  | "suggestedAction"
  | "rationale"
  | "targetField"
  | "requiresHumanReview"
  | "requiresNewProposal"
> {
  switch (gap.kind) {
    case "missing_guidance_link":
      return {
        actionKind: "relink_guidance",
        suggestedAction:
          "Link the proposal to the accepted GuidanceItem that generated it, or recreate the proposal from accepted guidance.",
        rationale:
          "Writeback evidence must prove which guidance authorized the proposal.",
        targetField: "guidanceItemId",
        requiresHumanReview: true,
        requiresNewProposal: true,
      };
    case "missing_signal_or_finding_link":
      return {
        actionKind: "link_signal_or_finding",
        suggestedAction:
          "Attach the source Signal or AlignmentFinding, or generate a finding from the source signal before proposing writeback again.",
        rationale:
          "Writeback should stay connected to evidence and alignment classification.",
        targetField: "signalId|findingId",
        requiresHumanReview: true,
        requiresNewProposal: false,
      };
    case "missing_work_item_or_workflow_link":
      return {
        actionKind: "link_work_or_workflow",
        suggestedAction:
          "Attach a WorkItem or WorkflowRun, or record an explicit no-workflow exception in provenance before new execution.",
        rationale:
          "Operational writeback should be traceable to work management or workflow state.",
        targetField: "workItemId|workflowRunId",
        requiresHumanReview: true,
        requiresNewProposal: false,
      };
    case "missing_approval_event":
      return {
        actionKind: "rerun_hitl_approval",
        suggestedAction:
          "Do not execute this record; collect a fresh HITL approval with actor and rationale, preferably through a new proposal if execution already advanced.",
        rationale:
          "Approval state without an approval audit event is not sufficient evidence.",
        targetField: "auditTrail.approved",
        requiresHumanReview: true,
        requiresNewProposal: gap.executionStatus !== "not_started",
      };
    case "missing_preview_event":
      return {
        actionKind: "rerun_preview",
        suggestedAction:
          "Run a fresh adapter preview after approval before any retry or further execution.",
        rationale:
          "Preview proves the exact payload, destination and idempotency snapshot.",
        targetField: "auditTrail.preview",
        requiresHumanReview: false,
        requiresNewProposal: false,
      };
    case "missing_execution_event":
      return {
        actionKind: "review_execution_audit",
        suggestedAction:
          "Review external/provider evidence and backfill only through a future audited remediation flow, or create a new proposal for any retry.",
        rationale:
          "Completed or failed execution without execution audit cannot be trusted for replay decisions.",
        targetField: "auditTrail.execution",
        requiresHumanReview: true,
        requiresNewProposal: true,
      };
    case "missing_payload_hash":
      return {
        actionKind: "capture_payload_hash",
        suggestedAction:
          "Regenerate approval and preview snapshots so current, approved and preview payload hashes are all present and matching.",
        rationale:
          "Payload hashes are the guardrail against payload drift after approval.",
        targetField: "payloadHash",
        requiresHumanReview: true,
        requiresNewProposal: false,
      };
    case "missing_idempotency_key":
      return {
        actionKind: "create_new_proposal_with_idempotency",
        suggestedAction:
          "Create a new proposal with an explicit idempotency key; do not execute the current record.",
        rationale:
          "Writeback without an idempotency key cannot safely prevent duplicates.",
        targetField: "idempotencyKey",
        requiresHumanReview: true,
        requiresNewProposal: true,
      };
    case "missing_external_ref_after_completed":
      return {
        actionKind: "attach_external_ref",
        suggestedAction:
          "Verify the provider-side object and attach externalId/externalUrl only through an audited remediation path; otherwise mark unsafe for replay.",
        rationale:
          "Completed external writeback must preserve the external proof of execution.",
        targetField: "externalId|externalUrl",
        requiresHumanReview: true,
        requiresNewProposal: false,
      };
    case "stale_preview":
      return {
        actionKind: "rerun_preview",
        suggestedAction:
          "Run a fresh preview after approval before any execution or retry.",
        rationale:
          "The existing preview is older than the freshness window.",
        targetField: "auditTrail.preview",
        requiresHumanReview: false,
        requiresNewProposal: false,
      };
    case "stale_approval":
      return {
        actionKind: "refresh_stale_review",
        suggestedAction:
          "Refresh HITL approval with current payload, destination and rationale before preview or execution.",
        rationale:
          "Approval is stale and no fresh preview exists after it.",
        targetField: "approvedAt",
        requiresHumanReview: true,
        requiresNewProposal: false,
      };
    case "insufficient_rationale":
      return {
        actionKind: "capture_human_rationale",
        suggestedAction:
          "Collect a human-readable rationale that explains why this external action is appropriate and low risk.",
        rationale:
          "Audit review needs enough rationale to evaluate intent and risk.",
        targetField: "rationale|auditTrail.note",
        requiresHumanReview: true,
        requiresNewProposal: false,
      };
    case "incomplete_provenance":
      return {
        actionKind: "repair_provenance",
        suggestedAction:
          "Attach provenance with source/raw/artifact reference, creator, extraction timestamp, review status and visibility.",
        rationale:
          "The proposal must be traceable to evidence before it can support closed-loop operation.",
        targetField: "provenance",
        requiresHumanReview: true,
        requiresNewProposal: false,
      };
  }
}

function buildWritebackEvidenceRemediationSuggestions(
  gaps: CompanyBrainWritebackEvidenceIntegrityGapsResponse["items"],
  generatedAt = now()
): CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["items"] {
  return gaps.map((gap) => {
    const remediation = remediationForIntegrityGap(gap);
    return {
      id: `writeback_remediation:${remediation.actionKind}:${gap.id}`,
      proposalId: gap.proposalId,
      gapId: gap.id,
      gapKind: gap.kind,
      adapter: gap.adapter,
      severity: gap.severity,
      title: gap.title,
      actionPolicy: "observe_only",
      executionBlocked: true,
      detectedAt: generatedAt,
      latestAuditAt: gap.latestAuditAt,
      ...remediation,
    };
  });
}

function buildWritebackEvidenceRemediationSummary(
  suggestions: CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["items"]
): CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["summary"] {
  const byActionKind = Object.fromEntries(
    writebackEvidenceRemediationActionKinds.map((kind) => [kind, 0])
  ) as CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["summary"]["byActionKind"];
  const byGapKind = Object.fromEntries(
    writebackEvidenceIntegrityGapKinds.map((kind) => [kind, 0])
  ) as CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["summary"]["byGapKind"];
  const byAdapter = Object.fromEntries(
    (
      [
        "github_comment",
        "github_label",
        "github_status_check",
        "slack_thread_reply",
        "other",
      ] satisfies WritebackAdapterKey[]
    ).map((adapter) => [adapter, 0])
  ) as CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["summary"]["byAdapter"];
  for (const suggestion of suggestions) {
    byActionKind[suggestion.actionKind] += 1;
    byGapKind[suggestion.gapKind] += 1;
    byAdapter[suggestion.adapter] += 1;
  }
  return {
    total: suggestions.length,
    criticalCount: suggestions.filter((item) => item.severity === "critical").length,
    warnCount: suggestions.filter((item) => item.severity === "warn").length,
    infoCount: suggestions.filter((item) => item.severity === "info").length,
    humanReviewCount: suggestions.filter((item) => item.requiresHumanReview).length,
    newProposalCount: suggestions.filter((item) => item.requiresNewProposal).length,
    byActionKind,
    byGapKind,
    byAdapter,
  };
}

function buildWritebackEvidenceRemediationSuggestionsResponse(args: {
  data: ReturnType<typeof listAll>;
  reviews: Map<
    string,
    CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"]
  >;
  severity?: SignalSeverity | null;
  gapKind?: CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["filters"]["gapKind"];
  actionKind?: CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["filters"]["actionKind"];
  adapter?: CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["filters"]["adapter"];
  proposalId?: string | null;
  limit?: number;
}): CompanyBrainWritebackEvidenceRemediationSuggestionsResponse {
  const limit = Math.max(1, Math.min(args.limit ?? 50, 250));
  const generatedAt = now();
  const gaps = buildWritebackEvidenceIntegrityGaps(
    args.data,
    args.reviews,
    generatedAt
  );
  const allSuggestions = buildWritebackEvidenceRemediationSuggestions(
    gaps,
    generatedAt
  );
  const items = allSuggestions.filter((suggestion) => {
    if (args.severity && suggestion.severity !== args.severity) return false;
    if (args.gapKind && suggestion.gapKind !== args.gapKind) return false;
    if (args.actionKind && suggestion.actionKind !== args.actionKind) return false;
    if (args.adapter && suggestion.adapter !== args.adapter) return false;
    if (args.proposalId && suggestion.proposalId !== args.proposalId) return false;
    return true;
  });
  return {
    generatedAt,
    filters: {
      severity: args.severity ?? null,
      gapKind: args.gapKind ?? null,
      actionKind: args.actionKind ?? null,
      adapter: args.adapter ?? null,
      proposalId: args.proposalId ?? null,
      limit,
    },
    items: items.slice(0, limit),
    total: items.length,
    summary: buildWritebackEvidenceRemediationSummary(allSuggestions),
  };
}

function buildWritebackEvidencePacket(
  proposal: ExternalActionProposal
): WritebackEvidencePacket {
  const db = getDb();
  const generatedAt = now();
  const executionReview = buildWritebackExecutionReview(proposal);
  const auditReview = buildWritebackAuditReview(proposal, executionReview);
  const approvalEvent = latestAuditEvent(proposal, "approved");
  const previewEvent = executionReview.previewEvent
    ? latestAuditEvent(proposal, executionReview.previewEvent)
    : null;
  const executionEvent = latestWritebackExecutionAudit(proposal);
  const auditTrail = buildWritebackAuditTrail({
    proposals: [proposal],
    reviews: new Map([[proposal.id, executionReview]]),
    proposalId: proposal.id,
    limit: 250,
  }).items;
  const integrityData = {
    ...listAll(),
    externalActionProposals: [proposal],
  };
  const integrityGaps = buildWritebackEvidenceIntegrityGaps(
    integrityData,
    new Map([[proposal.id, executionReview]]),
    generatedAt
  );
  return {
    generatedAt,
    proposal,
    guidanceItem: db
      .select()
      .from(cbGuidanceItems)
      .where(eq(cbGuidanceItems.id, proposal.guidanceItemId))
      .get() ?? null,
    signal: proposal.signalId
      ? db.select().from(cbSignals).where(eq(cbSignals.id, proposal.signalId)).get() ??
        null
      : null,
    alignmentFinding: proposal.findingId
      ? db
          .select()
          .from(cbAlignmentFindings)
          .where(eq(cbAlignmentFindings.id, proposal.findingId))
          .get() ?? null
      : null,
    workItem: proposal.workItemId
      ? db.select().from(cbWorkItems).where(eq(cbWorkItems.id, proposal.workItemId)).get() ??
        null
      : null,
    workflowRun: proposal.workflowRunId
      ? db
          .select()
          .from(cbWorkflowRuns)
          .where(eq(cbWorkflowRuns.id, proposal.workflowRunId))
          .get() ?? null
      : null,
    executionReview,
    auditReview,
    integrityGaps,
    remediationSuggestions: buildWritebackEvidenceRemediationSuggestions(
      integrityGaps,
      generatedAt
    ),
    auditTrail,
    approvalEvent,
    previewEvent,
    executionEvent,
    payloadHashes: {
      approved: executionReview.payloadHashApproved,
      preview: executionReview.payloadHashPreview,
      current: executionReview.payloadHashCurrent,
    },
    destinationRefs: {
      approved: executionReview.destinationRefApproved,
      preview: executionReview.destinationRefPreview,
      current: executionReview.destinationRefCurrent,
    },
    idempotencyKeys: {
      approved: executionReview.idempotencyKeyApproved,
      preview: executionReview.idempotencyKeyPreview,
      current: executionReview.idempotencyKeyCurrent,
    },
    githubStatus: githubStatusWritebackEvidence(proposal),
    externalRefs: {
      externalId: proposal.externalId,
      externalUrl: proposal.externalUrl,
      rollbackRef: proposal.rollbackRef,
    },
    timeline: {
      createdAt: proposal.createdAt,
      approvedAt: proposal.approvedAt,
      previewAt: executionReview.previewAt,
      executionAt: auditReview.executionEventAt,
      updatedAt: proposal.updatedAt,
    },
  };
}

function markdownLineValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "none";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "none";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function writebackEvidencePacketMarkdown(packet: WritebackEvidencePacket) {
  const proposal = packet.proposal;
  const lines = [
    `# AIOS Writeback Evidence Packet: ${proposal.title}`,
    "",
    "## Proposal",
    "",
    `- Proposal ID: ${proposal.id}`,
    `- Destination: ${proposal.destinationType}/${proposal.actionType}`,
    `- Risk / policy: ${proposal.riskClass} / ${proposal.actionPolicy}`,
    `- Approval status: ${proposal.approvalStatus}`,
    `- Execution status: ${proposal.executionStatus}`,
    `- Review status: ${packet.executionReview.status}`,
    `- Target: ${markdownLineValue(packet.auditReview.targetSummary ?? proposal.destinationRef)}`,
    `- Idempotency key: ${proposal.idempotencyKey}`,
    "",
    "## Hashes And Refs",
    "",
    `- Payload hash approved: ${markdownLineValue(packet.payloadHashes.approved)}`,
    `- Payload hash preview: ${markdownLineValue(packet.payloadHashes.preview)}`,
    `- Payload hash current: ${packet.payloadHashes.current}`,
    `- Destination approved: ${markdownLineValue(packet.destinationRefs.approved)}`,
    `- Destination preview: ${markdownLineValue(packet.destinationRefs.preview)}`,
    `- Destination current: ${markdownLineValue(packet.destinationRefs.current)}`,
    `- External ID: ${markdownLineValue(packet.externalRefs.externalId)}`,
    `- External URL: ${markdownLineValue(packet.externalRefs.externalUrl)}`,
    "",
    "## Events",
    "",
    `- Approval event: ${markdownLineValue(packet.approvalEvent?.event)} at ${markdownLineValue(packet.approvalEvent?.at)}`,
    `- Preview event: ${markdownLineValue(packet.previewEvent?.event)} at ${markdownLineValue(packet.previewEvent?.at)}`,
    `- Execution event: ${markdownLineValue(packet.executionEvent?.event)} at ${markdownLineValue(packet.executionEvent?.at)}`,
    `- Audit events: ${packet.auditTrail.length}`,
    "",
    "## Evidence Links",
    "",
    `- Guidance: ${markdownLineValue(packet.guidanceItem?.id)} ${packet.guidanceItem?.title ?? ""}`.trim(),
    `- Signal: ${markdownLineValue(packet.signal?.id)} ${packet.signal?.summary ?? ""}`.trim(),
    `- Finding: ${markdownLineValue(packet.alignmentFinding?.id)} ${packet.alignmentFinding?.classification ?? ""}`.trim(),
    `- Work item: ${markdownLineValue(packet.workItem?.id)} ${packet.workItem?.title ?? ""}`.trim(),
    `- Workflow run: ${markdownLineValue(packet.workflowRun?.id)} ${packet.workflowRun?.title ?? ""}`.trim(),
    "",
    "## Integrity",
    "",
    `- Integrity gaps: ${packet.integrityGaps.length}`,
    `- Remediation suggestions: ${packet.remediationSuggestions.length}`,
    `- Block reasons: ${markdownLineValue(packet.auditReview.blockReasons)}`,
    "",
  ];
  if (packet.githubStatus) {
    lines.push(
      "## GitHub Status",
      "",
      `- Repo: ${markdownLineValue(packet.githubStatus.repo)}`,
      `- SHA: ${markdownLineValue(packet.githubStatus.sha)}`,
      `- Context: ${markdownLineValue(packet.githubStatus.context)}`,
      `- State: ${markdownLineValue(packet.githubStatus.state)}`,
      `- Status ID: ${markdownLineValue(packet.githubStatus.statusId)}`,
      `- Repo private: ${markdownLineValue(packet.githubStatus.repoPrivate)}`,
      `- Existing statuses read: ${markdownLineValue(packet.githubStatus.existingStatusesRead)}`,
      `- Duplicate detected: ${markdownLineValue(packet.githubStatus.duplicateDetected)}`,
      ""
    );
  }
  lines.push("## Audit Trail", "");
  for (const event of packet.auditTrail.slice(0, 50)) {
    lines.push(
      `- ${event.at}: ${event.event} by ${event.actor ?? "system"} - ${event.note ?? "no note"}`
    );
  }
  if (packet.auditTrail.length > 50) {
    lines.push(`- ${packet.auditTrail.length - 50} additional events omitted.`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildWritebackEvidencePacketIndex(
  data: ReturnType<typeof listAll>,
  reviews: Map<
    string,
    CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"]
  >,
  integrityGaps: CompanyBrainWritebackEvidenceIntegrityGapsResponse["items"]
): CompanyBrainWritebackSafetyDashboard["evidencePacketIndex"] {
  const guidanceIds = new Set(data.guidanceItems.map((item) => item.id));
  const signalIds = new Set(data.signals.map((item) => item.id));
  const findingIds = new Set(data.alignmentFindings.map((item) => item.id));
  const workItemIds = new Set(data.workItems.map((item) => item.id));
  const workflowRunIds = new Set(data.workflowRuns.map((item) => item.id));
  const gapsByProposal = new Map<string, typeof integrityGaps>();
  for (const gap of integrityGaps) {
    const existing = gapsByProposal.get(gap.proposalId) ?? [];
    existing.push(gap);
    gapsByProposal.set(gap.proposalId, existing);
  }
  const severityRank: Record<SignalSeverity, number> = {
    critical: 3,
    warn: 2,
    info: 1,
  };

  return data.externalActionProposals
    .map((proposal) => {
      const review =
        reviews.get(proposal.id) ?? buildWritebackExecutionReview(proposal);
      const latestAudit = latestExternalActionAudit(proposal);
      const proposalGaps = gapsByProposal.get(proposal.id) ?? [];
      const integrityGapSeverity =
        proposalGaps
          .map((gap) => gap.severity)
          .sort((a, b) => severityRank[b] - severityRank[a])[0] ?? null;
      return {
        proposalId: proposal.id,
        title: proposal.title,
        destinationType: proposal.destinationType,
        actionType: proposal.actionType,
        riskClass: proposal.riskClass,
        approvalStatus: proposal.approvalStatus,
        executionStatus: proposal.executionStatus,
        reviewStatus: review.status,
        auditEventCount: proposal.auditTrail.length,
        latestAuditAt: latestAudit?.at ?? null,
        integrityGapCount: proposalGaps.length,
        integrityGapSeverity,
        integrityGapKinds: [...new Set(proposalGaps.map((gap) => gap.kind))],
        hasGuidance: guidanceIds.has(proposal.guidanceItemId),
        hasSignal: proposal.signalId ? signalIds.has(proposal.signalId) : false,
        hasFinding: proposal.findingId ? findingIds.has(proposal.findingId) : false,
        hasWorkItem: proposal.workItemId ? workItemIds.has(proposal.workItemId) : false,
        hasWorkflowRun: proposal.workflowRunId
          ? workflowRunIds.has(proposal.workflowRunId)
          : false,
        payloadHashCurrent: review.payloadHashCurrent,
        targetSummary: writebackTargetSummary(proposal),
        externalUrl: proposal.externalUrl,
        exportPath: `/api/company-brain/external-action-proposals/${proposal.id}/evidence-packet?download=1`,
        updatedAt: proposal.updatedAt,
      };
    })
    .sort(
      (a, b) =>
        (b.latestAuditAt ?? b.updatedAt) - (a.latestAuditAt ?? a.updatedAt)
    );
}

function matchSnapshot(value: string | null, current: string | null) {
  return value === null ? null : value === current;
}

function buildWritebackProposalTargetReview(args: {
  data: ReturnType<typeof listAll>;
  reviews?: Map<
    string,
    CompanyBrainWritebackSafetyDashboard["items"][number]["executionReview"]
  >;
  generatedAt?: number;
  proposalId?: string | null;
  targetKey?: string | null;
  destinationType?: ExternalActionDestination | null;
  actionType?: ExternalActionKind | null;
  riskClass?: RiskClass | null;
  reviewStatus?: CompanyBrainWritebackProposalTargetReview["filters"]["reviewStatus"];
  limit?: number;
}): CompanyBrainWritebackProposalTargetReview {
  const generatedAt = args.generatedAt ?? now();
  const data = args.data;
  const reviews =
    args.reviews ??
    new Map(
      data.externalActionProposals.map((proposal) => [
        proposal.id,
        buildWritebackExecutionReview(proposal, generatedAt),
      ])
    );
  const integrityGaps = buildWritebackEvidenceIntegrityGaps(
    data,
    reviews,
    generatedAt
  );
  const remediationSuggestions = buildWritebackEvidenceRemediationSuggestions(
    integrityGaps,
    generatedAt
  );
  const evidencePacketIndex = buildWritebackEvidencePacketIndex(
    data,
    reviews,
    integrityGaps
  );
  const targetSummaries = buildWritebackTargetObservabilitySummaries(
    data.externalActionProposals,
    reviews,
    generatedAt
  );
  const evidenceByProposal = new Map(
    evidencePacketIndex.map((item) => [item.proposalId, item])
  );
  const remediationCountByProposal = new Map<string, number>();
  for (const suggestion of remediationSuggestions) {
    remediationCountByProposal.set(
      suggestion.proposalId,
      (remediationCountByProposal.get(suggestion.proposalId) ?? 0) + 1
    );
  }
  const targetByKey = new Map(targetSummaries.map((target) => [target.targetKey, target]));
  const items = data.externalActionProposals
    .map((proposal) => {
      const review =
        reviews.get(proposal.id) ?? buildWritebackExecutionReview(proposal, generatedAt);
      const auditReview = buildWritebackAuditReview(proposal, review);
      const targetBase = writebackTargetObservabilityBase(proposal);
      const target = targetByKey.get(targetBase.targetKey);
      const evidence = evidenceByProposal.get(proposal.id);
      const latestAudit = latestExternalActionAudit(proposal);
      const approvalEvent = latestAuditEvent(proposal, "approved");
      const previewEvent = review.previewEvent
        ? latestAuditEvent(proposal, review.previewEvent)
        : null;
      const executionEvent = latestWritebackExecutionAudit(proposal);
      const kind = writebackSafetyItemKind(proposal);
      return {
        proposalId: proposal.id,
        title: proposal.title,
        destinationType: proposal.destinationType,
        actionType: proposal.actionType,
        riskClass: proposal.riskClass,
        actionPolicy: proposal.actionPolicy,
        approvalStatus: proposal.approvalStatus,
        executionStatus: proposal.executionStatus,
        reviewStatus: review.status,
        reviewFlags: review.flags,
        blockReasons: writebackBlockReasons(proposal, review),
        target: {
          targetKey: targetBase.targetKey,
          targetType: target?.targetType ?? targetBase.targetType,
          targetLabel: target?.targetLabel ?? targetBase.targetLabel,
          targetSummary: auditReview.targetSummary,
          repoPrivate: target?.repoPrivate ?? auditReview.githubStatus?.repoPrivate ?? null,
          targetProposalCount: target?.proposalCount ?? 1,
          targetNeedsReviewCount: target?.needsReviewCount ?? 0,
          targetMutationAttemptedCount: target?.mutationAttemptedCount ?? 0,
          latestExternalUrl: target?.latestExternalUrl ?? proposal.externalUrl,
        },
        evidence: {
          integrityGapCount: evidence?.integrityGapCount ?? 0,
          integrityGapSeverity: evidence?.integrityGapSeverity ?? null,
          integrityGapKinds: evidence?.integrityGapKinds ?? [],
          remediationSuggestionCount: remediationCountByProposal.get(proposal.id) ?? 0,
          hasGuidance: evidence?.hasGuidance ?? false,
          hasSignal: evidence?.hasSignal ?? false,
          hasFinding: evidence?.hasFinding ?? false,
          hasWorkItem: evidence?.hasWorkItem ?? false,
          hasWorkflowRun: evidence?.hasWorkflowRun ?? false,
        },
        hashes: {
          approved: review.payloadHashApproved,
          preview: review.payloadHashPreview,
          current: review.payloadHashCurrent,
          matchesApproval: matchSnapshot(
            review.payloadHashApproved,
            review.payloadHashCurrent
          ),
          matchesPreview: matchSnapshot(
            review.payloadHashPreview,
            review.payloadHashCurrent
          ),
        },
        refs: {
          destinationApproved: review.destinationRefApproved,
          destinationPreview: review.destinationRefPreview,
          destinationCurrent: review.destinationRefCurrent,
          destinationMatchesApproval: matchSnapshot(
            review.destinationRefApproved,
            review.destinationRefCurrent
          ),
          destinationMatchesPreview: matchSnapshot(
            review.destinationRefPreview,
            review.destinationRefCurrent
          ),
          externalId: proposal.externalId,
          externalUrl: proposal.externalUrl,
          rollbackRef: proposal.rollbackRef,
        },
        events: {
          eventCount: proposal.auditTrail.length,
          latestEvent: latestAudit?.event ?? null,
          latestAt: latestAudit?.at ?? null,
          approvalEvent: approvalEvent?.event ?? null,
          approvalAt: approvalEvent?.at ?? null,
          previewEvent: previewEvent?.event ?? null,
          previewAt: previewEvent?.at ?? null,
          executionEvent: executionEvent?.event ?? null,
          executionAt: executionEvent?.at ?? null,
          actor: latestAudit?.actor ?? review.actor,
        },
        idempotencyKey: proposal.idempotencyKey,
        githubStatus: auditReview.githubStatus,
        nextAction: kind
          ? writebackSafetyNextAction(proposal, kind, review)
          : "No immediate writeback safety action.",
        updatedAt: proposal.updatedAt,
      };
    })
    .sort(
      (a, b) =>
        (b.events.latestAt ?? b.updatedAt) - (a.events.latestAt ?? a.updatedAt)
    );
  const filteredItems = items.filter((item) => {
    if (args.proposalId && item.proposalId !== args.proposalId) return false;
    if (args.targetKey && item.target.targetKey !== args.targetKey) return false;
    if (args.destinationType && item.destinationType !== args.destinationType) {
      return false;
    }
    if (args.actionType && item.actionType !== args.actionType) return false;
    if (args.riskClass && item.riskClass !== args.riskClass) return false;
    if (args.reviewStatus && item.reviewStatus !== args.reviewStatus) return false;
    return true;
  });
  const limit = Math.max(1, Math.min(args.limit ?? 50, 250));
  return {
    generatedAt,
    filters: {
      proposalId: args.proposalId ?? null,
      targetKey: args.targetKey ?? null,
      destinationType: args.destinationType ?? null,
      actionType: args.actionType ?? null,
      riskClass: args.riskClass ?? null,
      reviewStatus: args.reviewStatus ?? null,
      limit,
    },
    items: filteredItems.slice(0, limit),
    targetSummaries,
    total: filteredItems.length,
    stats: {
      proposalCount: items.length,
      targetCount: targetSummaries.length,
      needsReviewCount: items.filter(
        (item) =>
          item.reviewStatus !== "completed" &&
          item.reviewStatus !== "duplicate_prevented"
      ).length,
      blockedCount: items.filter((item) => item.reviewStatus === "blocked").length,
      completedCount: items.filter((item) => item.reviewStatus === "completed").length,
      failedCount: items.filter((item) => item.executionStatus === "failed").length,
      integrityGapCount: items.reduce(
        (total, item) => total + item.evidence.integrityGapCount,
        0
      ),
      staleApprovalCount: targetSummaries.reduce(
        (total, target) => total + target.staleApprovalCount,
        0
      ),
      stalePreviewCount: targetSummaries.reduce(
        (total, target) => total + target.stalePreviewCount,
        0
      ),
      mutationAttemptedCount: items.filter((item) => {
        const proposal = data.externalActionProposals.find(
          (entry) => entry.id === item.proposalId
        );
        return proposal ? hasExternalMutationAttemptAudit(proposal) : false;
      }).length,
      duplicateAvoidedCount: items.filter((item) => {
        const proposal = data.externalActionProposals.find(
          (entry) => entry.id === item.proposalId
        );
        return proposal ? hasDuplicateAvoidanceAudit(proposal) : false;
      }).length,
    },
  };
}

function graphNodeId(kind: CompanyBrainEvidenceGraphNodeKind, entityId: string) {
  return `${kind}:${entityId}`;
}

function artifactLinkTargetNodeId(targetType: string, targetId: string) {
  const normalized = targetType.trim().toLowerCase();
  const kindByTargetType: Record<string, CompanyBrainEvidenceGraphNodeKind> = {
    source: "source",
    artifact: "artifact",
    priority: "priority",
    strategic_priority: "priority",
    goal: "goal",
    work_item: "work_item",
    workitem: "work_item",
    workflow_run: "workflow_run",
    workflowrun: "workflow_run",
    signal: "signal",
    alignment_finding: "alignment_finding",
    finding: "alignment_finding",
    guidance: "guidance_item",
    guidance_item: "guidance_item",
    external_action_proposal: "external_action_proposal",
    proposal: "external_action_proposal",
  };
  const kind = kindByTargetType[normalized];
  return kind ? graphNodeId(kind, targetId) : null;
}

function buildCompanyBrainEvidenceGraph(args: {
  data: ReturnType<typeof listAll>;
  rootKind?: CompanyBrainEvidenceGraphNodeKind | null;
  rootId?: string | null;
  limit?: number;
}): CompanyBrainEvidenceGraph {
  const generatedAt = now();
  const limit = Math.max(1, Math.min(args.limit ?? 250, 500));
  const data = args.data;
  const nodes = new Map<string, CompanyBrainEvidenceGraph["nodes"][number]>();
  const edges = new Map<string, CompanyBrainEvidenceGraph["edges"][number]>();
  const addNode = (node: CompanyBrainEvidenceGraph["nodes"][number]) => {
    if (!nodes.has(node.id)) nodes.set(node.id, node);
  };
  const addEdge = (edge: CompanyBrainEvidenceGraph["edges"][number]) => {
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) return;
    if (!edges.has(edge.id)) edges.set(edge.id, edge);
  };

  for (const source of data.sources) {
    addNode({
      id: graphNodeId("source", source.id),
      kind: "source",
      entityId: source.id,
      label: source.name,
      status: source.healthStatus,
      area: source.area,
      visibility: source.visibility,
      externalUrl: null,
      rawRef: source.externalRef,
      provenance: null,
      updatedAt: source.updatedAt,
    });
  }
  for (const artifact of data.artifacts) {
    addNode({
      id: graphNodeId("artifact", artifact.id),
      kind: "artifact",
      entityId: artifact.id,
      label: artifact.title,
      status: artifact.humanReviewStatus,
      area: artifact.area,
      visibility: artifact.visibility,
      externalUrl: artifact.contentRef,
      rawRef: artifact.rawRef,
      provenance: artifact.provenance,
      updatedAt: artifact.ingestedAt,
    });
  }
  for (const priority of data.priorities) {
    addNode({
      id: graphNodeId("priority", priority.id),
      kind: "priority",
      entityId: priority.id,
      label: priority.title,
      status: priority.status,
      area: priority.area,
      visibility: priority.visibility,
      externalUrl: null,
      rawRef: null,
      provenance: null,
      updatedAt: priority.updatedAt,
    });
  }
  for (const goal of data.goals) {
    addNode({
      id: graphNodeId("goal", goal.id),
      kind: "goal",
      entityId: goal.id,
      label: goal.title,
      status: goal.status,
      area: goal.area,
      visibility: goal.visibility,
      externalUrl: null,
      rawRef: null,
      provenance: null,
      updatedAt: goal.updatedAt,
    });
  }
  for (const workItem of data.workItems) {
    addNode({
      id: graphNodeId("work_item", workItem.id),
      kind: "work_item",
      entityId: workItem.id,
      label: workItem.title,
      status: workItem.status,
      area: workItem.area,
      visibility: workItem.visibility,
      externalUrl: workItem.externalUrl,
      rawRef: workItem.externalId,
      provenance: workItem.provenance,
      updatedAt: workItem.updatedAt,
    });
  }
  for (const workflowRun of data.workflowRuns) {
    addNode({
      id: graphNodeId("workflow_run", workflowRun.id),
      kind: "workflow_run",
      entityId: workflowRun.id,
      label: workflowRun.title,
      status: workflowRun.status,
      area: workflowRun.workflowArea,
      visibility: workflowRun.visibility,
      externalUrl: null,
      rawRef: workflowRun.currentStep,
      provenance: workflowRun.provenance,
      updatedAt: workflowRun.updatedAt,
    });
  }
  for (const signal of data.signals) {
    addNode({
      id: graphNodeId("signal", signal.id),
      kind: "signal",
      entityId: signal.id,
      label: signal.summary,
      status: signal.severity,
      area: signal.area,
      visibility: signal.visibility,
      externalUrl: null,
      rawRef: signal.rawRef,
      provenance: signal.provenance,
      updatedAt: signal.updatedAt,
    });
  }
  for (const finding of data.alignmentFindings) {
    addNode({
      id: graphNodeId("alignment_finding", finding.id),
      kind: "alignment_finding",
      entityId: finding.id,
      label: finding.rationale,
      status: finding.classification,
      area: finding.area,
      visibility: finding.visibility,
      externalUrl: null,
      rawRef: null,
      provenance: finding.provenance,
      updatedAt: finding.updatedAt,
    });
  }
  for (const guidance of data.guidanceItems) {
    addNode({
      id: graphNodeId("guidance_item", guidance.id),
      kind: "guidance_item",
      entityId: guidance.id,
      label: guidance.title,
      status: guidance.status,
      area: guidance.area,
      visibility: guidance.visibility,
      externalUrl: null,
      rawRef: null,
      provenance: guidance.provenance,
      updatedAt: guidance.updatedAt,
    });
  }
  const targetBasesByProposal = new Map<
    string,
    ReturnType<typeof writebackTargetObservabilityBase>
  >();
  for (const proposal of data.externalActionProposals) {
    const target = writebackTargetObservabilityBase(proposal);
    targetBasesByProposal.set(proposal.id, target);
    addNode({
      id: graphNodeId("writeback_target", target.targetKey),
      kind: "writeback_target",
      entityId: target.targetKey,
      label: target.targetLabel,
      status: target.targetType,
      area: null,
      visibility: null,
      externalUrl: proposal.externalUrl,
      rawRef: proposal.destinationRef,
      provenance: null,
      updatedAt: proposal.updatedAt,
    });
    addNode({
      id: graphNodeId("external_action_proposal", proposal.id),
      kind: "external_action_proposal",
      entityId: proposal.id,
      label: proposal.title,
      status: proposal.executionStatus,
      area: null,
      visibility: null,
      externalUrl: proposal.externalUrl,
      rawRef: proposal.destinationRef,
      provenance: null,
      updatedAt: proposal.updatedAt,
    });
  }

  for (const artifact of data.artifacts) {
    addEdge({
      id: `source_artifact:${artifact.sourceId}:${artifact.id}`,
      from: graphNodeId("source", artifact.sourceId),
      to: graphNodeId("artifact", artifact.id),
      relationship: "source_artifact",
      label: "produced artifact",
      confidence: artifact.confidence,
      provenance: artifact.provenance,
      createdAt: artifact.ingestedAt,
    });
  }
  for (const goal of data.goals) {
    if (!goal.priorityId) continue;
    addEdge({
      id: `priority_goal:${goal.priorityId}:${goal.id}`,
      from: graphNodeId("priority", goal.priorityId),
      to: graphNodeId("goal", goal.id),
      relationship: "priority_goal",
      label: "owns goal",
      confidence: goal.confidence,
      provenance: null,
      createdAt: goal.createdAt,
    });
  }
  for (const workItem of data.workItems) {
    if (workItem.priorityId) {
      addEdge({
        id: `priority_work:${workItem.priorityId}:${workItem.id}`,
        from: graphNodeId("priority", workItem.priorityId),
        to: graphNodeId("work_item", workItem.id),
        relationship: "priority_work_item",
        label: "scopes work",
        confidence: null,
        provenance: workItem.provenance,
        createdAt: workItem.createdAt,
      });
    }
    if (workItem.goalId) {
      addEdge({
        id: `goal_work:${workItem.goalId}:${workItem.id}`,
        from: graphNodeId("goal", workItem.goalId),
        to: graphNodeId("work_item", workItem.id),
        relationship: "goal_work_item",
        label: "tracks work",
        confidence: null,
        provenance: workItem.provenance,
        createdAt: workItem.createdAt,
      });
    }
    if (workItem.sourceId) {
      addEdge({
        id: `source_work:${workItem.sourceId}:${workItem.id}`,
        from: graphNodeId("source", workItem.sourceId),
        to: graphNodeId("work_item", workItem.id),
        relationship: "source_work_item",
        label: "created work item",
        confidence: null,
        provenance: workItem.provenance,
        createdAt: workItem.createdAt,
      });
    }
    if (workItem.artifactId) {
      addEdge({
        id: `artifact_work:${workItem.artifactId}:${workItem.id}`,
        from: graphNodeId("artifact", workItem.artifactId),
        to: graphNodeId("work_item", workItem.id),
        relationship: "artifact_work_item",
        label: "evidences work",
        confidence: null,
        provenance: workItem.provenance,
        createdAt: workItem.createdAt,
      });
    }
  }
  for (const workflowRun of data.workflowRuns) {
    if (workflowRun.workItemId) {
      addEdge({
        id: `work_workflow:${workflowRun.workItemId}:${workflowRun.id}`,
        from: graphNodeId("work_item", workflowRun.workItemId),
        to: graphNodeId("workflow_run", workflowRun.id),
        relationship: "work_item_workflow_run",
        label: "runs workflow",
        confidence: null,
        provenance: workflowRun.provenance,
        createdAt: workflowRun.createdAt,
      });
    }
    for (const artifactId of workflowRun.sourceArtifactIds) {
      addEdge({
        id: `artifact_workflow:${artifactId}:${workflowRun.id}`,
        from: graphNodeId("artifact", artifactId),
        to: graphNodeId("workflow_run", workflowRun.id),
        relationship: "artifact_workflow_run",
        label: "workflow evidence",
        confidence: null,
        provenance: workflowRun.provenance,
        createdAt: workflowRun.createdAt,
      });
    }
  }
  for (const signal of data.signals) {
    const signalNode = graphNodeId("signal", signal.id);
    if (signal.sourceId) {
      addEdge({
        id: `source_signal:${signal.sourceId}:${signal.id}`,
        from: graphNodeId("source", signal.sourceId),
        to: signalNode,
        relationship: "source_signal",
        label: "emitted signal",
        confidence: signal.confidence,
        provenance: signal.provenance,
        createdAt: signal.createdAt,
      });
    }
    if (signal.artifactId) {
      addEdge({
        id: `artifact_signal:${signal.artifactId}:${signal.id}`,
        from: graphNodeId("artifact", signal.artifactId),
        to: signalNode,
        relationship: "artifact_signal",
        label: "generated signal",
        confidence: signal.confidence,
        provenance: signal.provenance,
        createdAt: signal.createdAt,
      });
    }
    if (signal.workItemId) {
      addEdge({
        id: `work_signal:${signal.workItemId}:${signal.id}`,
        from: graphNodeId("work_item", signal.workItemId),
        to: signalNode,
        relationship: "work_item_signal",
        label: "observes work",
        confidence: signal.confidence,
        provenance: signal.provenance,
        createdAt: signal.createdAt,
      });
    }
    if (signal.workflowRunId) {
      addEdge({
        id: `workflow_signal:${signal.workflowRunId}:${signal.id}`,
        from: graphNodeId("workflow_run", signal.workflowRunId),
        to: signalNode,
        relationship: "workflow_run_signal",
        label: "observes workflow",
        confidence: signal.confidence,
        provenance: signal.provenance,
        createdAt: signal.createdAt,
      });
    }
  }
  for (const finding of data.alignmentFindings) {
    const findingNode = graphNodeId("alignment_finding", finding.id);
    for (const artifactId of finding.artifactIds) {
      addEdge({
        id: `artifact_finding:${artifactId}:${finding.id}`,
        from: graphNodeId("artifact", artifactId),
        to: findingNode,
        relationship: "artifact_finding",
        label: "supports finding",
        confidence: finding.confidence,
        provenance: finding.provenance,
        createdAt: finding.createdAt,
      });
    }
    for (const signalId of finding.signalIds) {
      addEdge({
        id: `signal_finding:${signalId}:${finding.id}`,
        from: graphNodeId("signal", signalId),
        to: findingNode,
        relationship: "signal_finding",
        label: "classified into finding",
        confidence: finding.confidence,
        provenance: finding.provenance,
        createdAt: finding.createdAt,
      });
    }
    if (finding.priorityId) {
      addEdge({
        id: `priority_finding:${finding.priorityId}:${finding.id}`,
        from: graphNodeId("priority", finding.priorityId),
        to: findingNode,
        relationship: "priority_finding",
        label: "evaluates priority",
        confidence: finding.confidence,
        provenance: finding.provenance,
        createdAt: finding.createdAt,
      });
    }
    if (finding.goalId) {
      addEdge({
        id: `goal_finding:${finding.goalId}:${finding.id}`,
        from: graphNodeId("goal", finding.goalId),
        to: findingNode,
        relationship: "goal_finding",
        label: "evaluates goal",
        confidence: finding.confidence,
        provenance: finding.provenance,
        createdAt: finding.createdAt,
      });
    }
    if (finding.workItemId) {
      addEdge({
        id: `work_finding:${finding.workItemId}:${finding.id}`,
        from: graphNodeId("work_item", finding.workItemId),
        to: findingNode,
        relationship: "work_item_finding",
        label: "evaluates work",
        confidence: finding.confidence,
        provenance: finding.provenance,
        createdAt: finding.createdAt,
      });
    }
    if (finding.workflowRunId) {
      addEdge({
        id: `workflow_finding:${finding.workflowRunId}:${finding.id}`,
        from: graphNodeId("workflow_run", finding.workflowRunId),
        to: findingNode,
        relationship: "workflow_run_finding",
        label: "evaluates workflow",
        confidence: finding.confidence,
        provenance: finding.provenance,
        createdAt: finding.createdAt,
      });
    }
  }
  for (const guidance of data.guidanceItems) {
    const guidanceNode = graphNodeId("guidance_item", guidance.id);
    const guidanceLinks: Array<[
      CompanyBrainEvidenceGraphNodeKind,
      string | null,
      string,
      string,
    ]> = [
      ["alignment_finding", guidance.findingId, "finding_guidance", "generates guidance"],
      ["signal", guidance.signalId, "signal_guidance", "generates guidance"],
      ["work_item", guidance.workItemId, "work_guidance", "guides work"],
      ["workflow_run", guidance.workflowRunId, "workflow_guidance", "guides workflow"],
      ["priority", guidance.priorityId, "priority_guidance", "guides priority"],
      ["goal", guidance.goalId, "goal_guidance", "guides goal"],
    ];
    for (const [kind, id, relationship, label] of guidanceLinks) {
      if (!id) continue;
      addEdge({
        id: `${relationship}:${id}:${guidance.id}`,
        from: graphNodeId(kind, id),
        to: guidanceNode,
        relationship,
        label,
        confidence: null,
        provenance: guidance.provenance,
        createdAt: guidance.createdAt,
      });
    }
  }
  for (const proposal of data.externalActionProposals) {
    const proposalNode = graphNodeId("external_action_proposal", proposal.id);
    const proposalLinks: Array<[
      CompanyBrainEvidenceGraphNodeKind,
      string | null,
      string,
      string,
    ]> = [
      ["guidance_item", proposal.guidanceItemId, "guidance_proposal", "creates proposal"],
      ["signal", proposal.signalId, "signal_proposal", "informs proposal"],
      ["alignment_finding", proposal.findingId, "finding_proposal", "informs proposal"],
      ["work_item", proposal.workItemId, "work_proposal", "acts on work"],
      ["workflow_run", proposal.workflowRunId, "workflow_proposal", "acts on workflow"],
    ];
    for (const [kind, id, relationship, label] of proposalLinks) {
      if (!id) continue;
      addEdge({
        id: `${relationship}:${id}:${proposal.id}`,
        from: graphNodeId(kind, id),
        to: proposalNode,
        relationship,
        label,
        confidence: null,
        provenance: null,
        createdAt: proposal.createdAt,
      });
    }
    const target = targetBasesByProposal.get(proposal.id);
    if (target) {
      addEdge({
        id: `proposal_target:${proposal.id}:${target.targetKey}`,
        from: proposalNode,
        to: graphNodeId("writeback_target", target.targetKey),
        relationship: "proposal_writeback_target",
        label: "targets writeback",
        confidence: null,
        provenance: null,
        createdAt: proposal.createdAt,
      });
    }
  }
  for (const link of data.artifactLinks) {
    const targetNode = artifactLinkTargetNodeId(link.targetType, link.targetId);
    if (!targetNode) continue;
    addEdge({
      id: `artifact_link:${link.id}`,
      from: graphNodeId("artifact", link.artifactId),
      to: targetNode,
      relationship: link.relationship,
      label: link.relationship,
      confidence: link.confidence,
      provenance: null,
      createdAt: link.createdAt,
    });
  }

  let graphNodes = [...nodes.values()];
  let graphEdges = [...edges.values()];
  if (args.rootKind && args.rootId) {
    const rootNodeId = graphNodeId(args.rootKind, args.rootId);
    const connected = new Set<string>([rootNodeId]);
    for (const edge of graphEdges) {
      if (edge.from === rootNodeId) connected.add(edge.to);
      if (edge.to === rootNodeId) connected.add(edge.from);
    }
    graphNodes = graphNodes.filter((node) => connected.has(node.id));
    graphEdges = graphEdges.filter(
      (edge) => connected.has(edge.from) && connected.has(edge.to)
    );
  }
  graphNodes = graphNodes
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .slice(0, limit);
  const includedNodeIds = new Set(graphNodes.map((node) => node.id));
  graphEdges = graphEdges
    .filter((edge) => includedNodeIds.has(edge.from) && includedNodeIds.has(edge.to))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, limit * 2);
  const connectedNodeIds = new Set<string>();
  for (const edge of graphEdges) {
    connectedNodeIds.add(edge.from);
    connectedNodeIds.add(edge.to);
  }

  return {
    generatedAt,
    filters: {
      rootKind: args.rootKind ?? null,
      rootId: args.rootId ?? null,
      limit,
    },
    nodes: graphNodes,
    edges: graphEdges,
    stats: {
      nodeCount: graphNodes.length,
      edgeCount: graphEdges.length,
      sourceCount: graphNodes.filter((node) => node.kind === "source").length,
      artifactCount: graphNodes.filter((node) => node.kind === "artifact").length,
      proposalCount: graphNodes.filter(
        (node) => node.kind === "external_action_proposal"
      ).length,
      targetCount: graphNodes.filter((node) => node.kind === "writeback_target")
        .length,
      orphanNodeCount: graphNodes.filter((node) => !connectedNodeIds.has(node.id))
        .length,
    },
  };
}

function buildCompanyBrainTimeline(args: {
  data: ReturnType<typeof listAll>;
  scope?: CompanyBrainTimelineScope | null;
  id?: string | null;
  limit?: number;
}): CompanyBrainTimeline {
  const generatedAt = now();
  const scope = args.scope ?? "all";
  const id = args.id ?? null;
  const limit = Math.max(1, Math.min(args.limit ?? 100, 500));
  const events: CompanyBrainTimelineEvent[] = [];
  const includeSource = (sourceId: string | null) =>
    scope === "all" || (scope === "source" && sourceId === id);
  const proposalMatches = (proposal: ExternalActionProposal) => {
    if (scope === "all") return true;
    if (scope === "proposal") return proposal.id === id;
    if (scope === "target") {
      return writebackTargetObservabilityBase(proposal).targetKey === id;
    }
    return false;
  };
  const includeProposalLink = (proposalId: string | null, targetKey: string | null) => {
    if (scope === "all") return true;
    if (scope === "proposal") return proposalId === id;
    if (scope === "target") return targetKey === id;
    return false;
  };
  const pushEvent = (event: CompanyBrainTimelineEvent) => {
    events.push(event);
  };

  for (const source of args.data.sources) {
    if (!includeSource(source.id)) continue;
    pushEvent({
      id: `source_created:${source.id}`,
      at: source.createdAt,
      scope: "source",
      eventType: "source_created",
      entityKind: "source",
      entityId: source.id,
      title: source.name,
      status: source.healthStatus,
      detail: source.sourceType,
      actor: source.owner,
      sourceId: source.id,
      proposalId: null,
      targetKey: null,
      externalUrl: null,
      rawRef: source.externalRef,
      provenance: null,
    });
    if (source.lastSyncAt) {
      pushEvent({
        id: `source_synced:${source.id}:${source.lastSyncAt}`,
        at: source.lastSyncAt,
        scope: "source",
        eventType: source.syncError ? "source_sync_error" : "source_synced",
        entityKind: "source",
        entityId: source.id,
        title: source.name,
        status: source.syncError ? "error" : source.healthStatus,
        detail: source.syncError,
        actor: source.owner,
        sourceId: source.id,
        proposalId: null,
        targetKey: null,
        externalUrl: null,
        rawRef: source.externalRef,
        provenance: null,
      });
    }
  }
  for (const artifact of args.data.artifacts) {
    if (!includeSource(artifact.sourceId)) continue;
    pushEvent({
      id: `artifact_ingested:${artifact.id}`,
      at: artifact.ingestedAt,
      scope: "source",
      eventType: "artifact_ingested",
      entityKind: "artifact",
      entityId: artifact.id,
      title: artifact.title,
      status: artifact.humanReviewStatus,
      detail: artifact.artifactType,
      actor: artifact.author,
      sourceId: artifact.sourceId,
      proposalId: null,
      targetKey: null,
      externalUrl: artifact.contentRef,
      rawRef: artifact.rawRef,
      provenance: artifact.provenance,
    });
  }
  for (const watcherRun of args.data.watcherRuns) {
    const sourceId = watcherRun.sourceIds[0] ?? null;
    if (!includeSource(sourceId)) continue;
    pushEvent({
      id: `watcher_run:${watcherRun.id}`,
      at: watcherRun.finishedAt ?? watcherRun.startedAt,
      scope: "source",
      eventType: "watcher_run",
      entityKind: "watcher_run",
      entityId: watcherRun.id,
      title: watcherRun.watcherId,
      status: watcherRun.status,
      detail: watcherRun.errorSummary,
      actor: null,
      sourceId,
      proposalId: null,
      targetKey: null,
      externalUrl: null,
      rawRef: watcherRun.triggerRef,
      provenance: watcherRun.provenance,
    });
  }
  const proposalIdsByLinkedEntity = new Map<string, ExternalActionProposal[]>();
  for (const proposal of args.data.externalActionProposals) {
    for (const [kind, entityId] of [
      ["guidance_item", proposal.guidanceItemId],
      ["signal", proposal.signalId],
      ["alignment_finding", proposal.findingId],
      ["work_item", proposal.workItemId],
      ["workflow_run", proposal.workflowRunId],
    ] as const) {
      if (!entityId) continue;
      const key = `${kind}:${entityId}`;
      proposalIdsByLinkedEntity.set(key, [
        ...(proposalIdsByLinkedEntity.get(key) ?? []),
        proposal,
      ]);
    }
  }
  const pushLinkedEvent = (args: {
    at: number;
    eventType: string;
    entityKind: CompanyBrainTimelineEvent["entityKind"];
    entityId: string;
    title: string;
    status: string | null;
    detail: string | null;
    actor?: string | null;
    sourceId?: string | null;
    externalUrl?: string | null;
    rawRef?: string | null;
    provenance?: Provenance | null;
  }) => {
    const linkedProposals =
      proposalIdsByLinkedEntity.get(`${args.entityKind}:${args.entityId}`) ?? [];
    if (scope === "source") {
      if (!includeSource(args.sourceId ?? null)) return;
      pushEvent({
        ...args,
        id: `${args.eventType}:${args.entityId}`,
        scope: "source",
        actor: args.actor ?? null,
        sourceId: args.sourceId ?? null,
        proposalId: null,
        targetKey: null,
        externalUrl: args.externalUrl ?? null,
        rawRef: args.rawRef ?? null,
        provenance: args.provenance ?? null,
      });
      return;
    }
    if (!linkedProposals.length && scope === "all") {
      pushEvent({
        ...args,
        id: `${args.eventType}:${args.entityId}`,
        scope: "all",
        actor: args.actor ?? null,
        sourceId: args.sourceId ?? null,
        proposalId: null,
        targetKey: null,
        externalUrl: args.externalUrl ?? null,
        rawRef: args.rawRef ?? null,
        provenance: args.provenance ?? null,
      });
      return;
    }
    for (const proposal of linkedProposals) {
      const targetKey = writebackTargetObservabilityBase(proposal).targetKey;
      if (!includeProposalLink(proposal.id, targetKey)) continue;
      pushEvent({
        ...args,
        id: `${args.eventType}:${args.entityId}:${proposal.id}`,
        scope: scope === "all" ? "proposal" : scope,
        actor: args.actor ?? null,
        sourceId: args.sourceId ?? null,
        proposalId: proposal.id,
        targetKey,
        externalUrl: args.externalUrl ?? null,
        rawRef: args.rawRef ?? null,
        provenance: args.provenance ?? null,
      });
    }
  };
  for (const workItem of args.data.workItems) {
    pushLinkedEvent({
      at: workItem.createdAt,
      eventType: "work_item_created",
      entityKind: "work_item",
      entityId: workItem.id,
      title: workItem.title,
      status: workItem.status,
      detail: workItem.externalUrl,
      actor: workItem.owner,
      sourceId: workItem.sourceId,
      externalUrl: workItem.externalUrl,
      rawRef: workItem.externalId,
      provenance: workItem.provenance,
    });
  }
  for (const workflowRun of args.data.workflowRuns) {
    pushLinkedEvent({
      at: workflowRun.startedAt ?? workflowRun.createdAt,
      eventType: "workflow_run_started",
      entityKind: "workflow_run",
      entityId: workflowRun.id,
      title: workflowRun.title,
      status: workflowRun.status,
      detail: workflowRun.currentStep,
      actor: workflowRun.owner,
      sourceId: null,
      provenance: workflowRun.provenance,
    });
    if (workflowRun.finishedAt) {
      pushLinkedEvent({
        at: workflowRun.finishedAt,
        eventType: "workflow_run_finished",
        entityKind: "workflow_run",
        entityId: workflowRun.id,
        title: workflowRun.title,
        status: workflowRun.status,
        detail: workflowRun.currentStep,
        actor: workflowRun.owner,
        sourceId: null,
        provenance: workflowRun.provenance,
      });
    }
  }
  for (const signal of args.data.signals) {
    pushLinkedEvent({
      at: signal.createdAt,
      eventType: "signal_created",
      entityKind: "signal",
      entityId: signal.id,
      title: signal.summary,
      status: signal.severity,
      detail: signal.source,
      actor: null,
      sourceId: signal.sourceId,
      rawRef: signal.rawRef,
      provenance: signal.provenance,
    });
  }
  for (const finding of args.data.alignmentFindings) {
    pushLinkedEvent({
      at: finding.createdAt,
      eventType: "alignment_finding_created",
      entityKind: "alignment_finding",
      entityId: finding.id,
      title: finding.rationale,
      status: finding.classification,
      detail: finding.suggestedAction,
      actor: null,
      sourceId: null,
      provenance: finding.provenance,
    });
  }
  for (const guidance of args.data.guidanceItems) {
    pushLinkedEvent({
      at: guidance.createdAt,
      eventType: "guidance_created",
      entityKind: "guidance_item",
      entityId: guidance.id,
      title: guidance.title,
      status: guidance.status,
      detail: guidance.action,
      actor: null,
      sourceId: null,
      provenance: guidance.provenance,
    });
    if (guidance.feedbackAt) {
      pushLinkedEvent({
        at: guidance.feedbackAt,
        eventType: "guidance_feedback",
        entityKind: "guidance_item",
        entityId: guidance.id,
        title: guidance.title,
        status: guidance.feedbackStatus,
        detail: guidance.feedbackNote,
        actor: null,
        sourceId: null,
        provenance: guidance.provenance,
      });
    }
  }
  for (const proposal of args.data.externalActionProposals) {
    if (!proposalMatches(proposal)) continue;
    const targetKey = writebackTargetObservabilityBase(proposal).targetKey;
    pushEvent({
      id: `proposal_created:${proposal.id}`,
      at: proposal.createdAt,
      scope: scope === "all" ? "proposal" : scope,
      eventType: "proposal_created",
      entityKind: "external_action_proposal",
      entityId: proposal.id,
      title: proposal.title,
      status: proposal.approvalStatus,
      detail: proposal.policySummary,
      actor: proposal.requestedBy,
      sourceId: null,
      proposalId: proposal.id,
      targetKey,
      externalUrl: proposal.externalUrl,
      rawRef: proposal.destinationRef,
      provenance: null,
    });
    for (const auditEvent of proposal.auditTrail) {
      if (auditEvent.event === "proposal_created") continue;
      pushEvent({
        id: `proposal_audit:${proposal.id}:${auditEvent.event}:${auditEvent.at}`,
        at: auditEvent.at,
        scope: scope === "all" ? "proposal" : scope,
        eventType: auditEvent.event,
        entityKind: "external_action_proposal",
        entityId: proposal.id,
        title: proposal.title,
        status: proposal.executionStatus,
        detail: auditEvent.note,
        actor: auditEvent.actor,
        sourceId: null,
        proposalId: proposal.id,
        targetKey,
        externalUrl: proposal.externalUrl,
        rawRef: proposal.destinationRef,
        provenance: null,
      });
    }
  }

  const sorted = events.sort((a, b) => b.at - a.at);
  const limited = sorted.slice(0, limit);
  return {
    generatedAt,
    filters: { scope, id, limit },
    events: limited,
    total: sorted.length,
    stats: {
      eventCount: sorted.length,
      proposalEventCount: sorted.filter((event) => event.proposalId).length,
      targetEventCount: sorted.filter((event) => event.targetKey).length,
      sourceEventCount: sorted.filter((event) => event.sourceId).length,
      externalWriteEventCount: sorted.filter((event) =>
        ["github_comment_posted", "github_label_added", "github_status_set", "slack_thread_reply_posted"].includes(
          event.eventType
        )
      ).length,
      latestAt: sorted[0]?.at ?? null,
      earliestAt: sorted.at(-1)?.at ?? null,
    },
  };
}

function companyBrainViewUrl(path: string, filters: Record<string, string | number | null>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== "") params.set(key, String(value));
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return `/api/company-brain/${path}${suffix}`;
}

function buildCompanyBrainSavedAuditViews(
  data: ReturnType<typeof listAll>
): CompanyBrainSavedAuditViews {
  const generatedAt = now();
  const reviews = new Map(
    data.externalActionProposals.map((proposal) => [
      proposal.id,
      buildWritebackExecutionReview(proposal, generatedAt),
    ])
  );
  const proposalReview = buildWritebackProposalTargetReview({
    data,
    reviews,
    generatedAt,
    limit: 250,
  });
  const latestProposal = proposalReview.items[0] ?? null;
  const latestTarget = proposalReview.targetSummaries[0] ?? null;
  const latestSource = [...data.sources].sort(
    (a, b) => (b.lastSyncAt ?? b.updatedAt) - (a.lastSyncAt ?? a.updatedAt)
  )[0] ?? null;
  const statusAudit = buildWritebackAuditTrail({
    proposals: data.externalActionProposals,
    reviews,
    event: "github_status_set",
    limit: 250,
  });
  const failedAudit = buildWritebackAuditTrail({
    proposals: data.externalActionProposals,
    reviews,
    executionStatus: "failed",
    limit: 250,
  });
  const views: CompanyBrainSavedAuditViews["views"] = [
    {
      id: "writeback-status-executions",
      title: "GitHub status executions",
      surface: "audit_trail",
      description: "GitHub commit status writebacks that reached execution audit.",
      filters: { event: "github_status_set", limit: 50 },
      itemCount: statusAudit.total,
      exportUrl: companyBrainViewUrl("external-action-proposals/audit-trail", {
        event: "github_status_set",
        format: "csv",
        limit: 50,
      }),
      reviewPriority: statusAudit.total ? "info" : "warn",
      updatedAt: statusAudit.items[0]?.at ?? null,
    },
    {
      id: "failed-writebacks",
      title: "Failed writebacks",
      surface: "audit_trail",
      description: "Writeback audit events for failed proposal executions.",
      filters: { executionStatus: "failed", limit: 50 },
      itemCount: failedAudit.total,
      exportUrl: companyBrainViewUrl("external-action-proposals/audit-trail", {
        executionStatus: "failed",
        format: "csv",
        limit: 50,
      }),
      reviewPriority: failedAudit.total ? "critical" : "info",
      updatedAt: failedAudit.items[0]?.at ?? null,
    },
    {
      id: "proposal-target-review-needs-review",
      title: "Proposal/target review queue",
      surface: "proposal_target_review",
      description: "Proposal/target review items that are not completed or duplicate-prevented.",
      filters: { limit: 50 },
      itemCount: proposalReview.stats.needsReviewCount,
      exportUrl: companyBrainViewUrl(
        "external-action-proposals/proposal-target-review",
        { limit: 50 }
      ),
      reviewPriority: proposalReview.stats.needsReviewCount ? "warn" : "info",
      updatedAt: proposalReview.items[0]?.updatedAt ?? null,
    },
  ];
  if (latestTarget) {
    const targetTimeline = buildCompanyBrainTimeline({
      data,
      scope: "target",
      id: latestTarget.targetKey,
      limit: 100,
    });
    views.push({
      id: `target-timeline:${latestTarget.targetKey}`,
      title: `Target timeline: ${latestTarget.targetLabel}`,
      surface: "timeline",
      description: "Latest target-linked writeback and evidence timeline.",
      filters: { scope: "target", id: latestTarget.targetKey, limit: 100 },
      itemCount: targetTimeline.total,
      exportUrl: companyBrainViewUrl("timeline", {
        scope: "target",
        id: latestTarget.targetKey,
        limit: 100,
      }),
      reviewPriority: latestTarget.needsReviewCount ? "warn" : "info",
      updatedAt: targetTimeline.stats.latestAt,
    });
  }
  if (latestProposal) {
    const proposalGraph = buildCompanyBrainEvidenceGraph({
      data,
      rootKind: "external_action_proposal",
      rootId: latestProposal.proposalId,
      limit: 100,
    });
    views.push({
      id: `proposal-graph:${latestProposal.proposalId}`,
      title: `Proposal graph: ${latestProposal.title}`,
      surface: "evidence_graph",
      description: "Evidence/provenance graph centered on the latest writeback proposal.",
      filters: {
        rootKind: "external_action_proposal",
        rootId: latestProposal.proposalId,
        limit: 100,
      },
      itemCount: proposalGraph.stats.nodeCount,
      exportUrl: companyBrainViewUrl("evidence-graph", {
        rootKind: "external_action_proposal",
        rootId: latestProposal.proposalId,
        limit: 100,
      }),
      reviewPriority: proposalGraph.stats.orphanNodeCount ? "warn" : "info",
      updatedAt: latestProposal.updatedAt,
    });
  }
  if (latestSource) {
    const sourceTimeline = buildCompanyBrainTimeline({
      data,
      scope: "source",
      id: latestSource.id,
      limit: 100,
    });
    views.push({
      id: `source-timeline:${latestSource.id}`,
      title: `Source timeline: ${latestSource.name}`,
      surface: "timeline",
      description: "Latest source ingestion, watcher and evidence timeline.",
      filters: { scope: "source", id: latestSource.id, limit: 100 },
      itemCount: sourceTimeline.total,
      exportUrl: companyBrainViewUrl("timeline", {
        scope: "source",
        id: latestSource.id,
        limit: 100,
      }),
      reviewPriority: latestSource.syncError ? "critical" : "info",
      updatedAt: sourceTimeline.stats.latestAt,
    });
  }

  return {
    generatedAt,
    views: views.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)),
    stats: {
      viewCount: views.length,
      criticalCount: views.filter((view) => view.reviewPriority === "critical")
        .length,
      warnCount: views.filter((view) => view.reviewPriority === "warn").length,
      auditTrailViewCount: views.filter((view) => view.surface === "audit_trail")
        .length,
      proposalReviewViewCount: views.filter(
        (view) => view.surface === "proposal_target_review"
      ).length,
      graphViewCount: views.filter((view) => view.surface === "evidence_graph")
        .length,
      timelineViewCount: views.filter((view) => view.surface === "timeline")
        .length,
    },
  };
}

function writebackPolicySimulationCase(args: {
  id: string;
  title: string;
  destinationType: ExternalActionDestination;
  actionType: ExternalActionKind;
  riskClass: RiskClass;
  actionPolicy: ActionPolicy;
}): CompanyBrainWritebackPolicySimulator["cases"][number] {
  const result = externalActionPolicy(args);
  const previewOnly =
    args.destinationType === "github" && args.actionType === "github_check";
  const realExecutorAvailable =
    (args.destinationType === "github" &&
      (isGitHubCommentAction(args.actionType) ||
        isGitHubLabelAction(args.actionType) ||
        args.actionType === "github_status")) ||
    (args.destinationType === "slack" && isSlackThreadReplyAction(args.actionType));
  const requiredGates = result.approvalRequired
    ? [
        "human_approval",
        "hitl_rationale",
        "preview_after_approval",
        "payload_hash_match",
        "destination_ref_match",
        "idempotency_key",
        "audit_trail",
      ]
    : ["audit_trail"];
  if (args.destinationType === "github" && args.actionType === "github_status") {
    requiredGates.push("private_repo_allowlist", "explicit_sha", "allowed_context_state");
  }
  if (args.destinationType === "github" && isGitHubLabelAction(args.actionType)) {
    requiredGates.push("label_add_only", "current_labels_read");
  }
  if (args.destinationType === "slack" && isSlackThreadReplyAction(args.actionType)) {
    requiredGates.push("existing_thread_only", "thread_replies_read");
  }
  const blockedActions = [
    "close",
    "reopen",
    "merge",
    "deploy",
    "delete",
    "permissions",
    "secrets",
    "slack_dm",
    "slack_top_level",
    "email",
    "billing",
  ];
  if (previewOnly) blockedActions.push("real_check_run_creation");
  return {
    id: args.id,
    title: args.title,
    input: {
      destinationType: args.destinationType,
      actionType: args.actionType,
      riskClass: args.riskClass,
      actionPolicy: args.actionPolicy,
    },
    result,
    executionBlocked: result.executionStatus === "blocked" || previewOnly,
    previewOnly,
    realExecutorAvailable: realExecutorAvailable && !previewOnly,
    requiredGates,
    blockedActions,
    rationale: previewOnly
      ? "Preview/dry-run is allowed, but real execution is intentionally blocked for this action type."
      : result.policySummary,
  };
}

function buildWritebackPolicySimulator(args?: {
  customCase?: {
    destinationType: ExternalActionDestination;
    actionType: ExternalActionKind;
    riskClass: RiskClass;
    actionPolicy: ActionPolicy;
  } | null;
}): CompanyBrainWritebackPolicySimulator {
  const generatedAt = now();
  const cases: CompanyBrainWritebackPolicySimulator["cases"] = [];
  if (args?.customCase) {
    cases.push(
      writebackPolicySimulationCase({
        id: "custom",
        title: "Custom simulation",
        ...args.customCase,
      })
    );
  }
  cases.push(
    writebackPolicySimulationCase({
      id: "github-comment-risk-b",
      title: "GitHub issue/PR comment",
      destinationType: "github",
      actionType: "github_comment",
      riskClass: "B",
      actionPolicy: "writeback_allowed",
    }),
    writebackPolicySimulationCase({
      id: "github-label-risk-b",
      title: "GitHub label add",
      destinationType: "github",
      actionType: "github_label",
      riskClass: "B",
      actionPolicy: "writeback_allowed",
    }),
    writebackPolicySimulationCase({
      id: "github-status-risk-b",
      title: "GitHub commit status",
      destinationType: "github",
      actionType: "github_status",
      riskClass: "B",
      actionPolicy: "writeback_allowed",
    }),
    writebackPolicySimulationCase({
      id: "github-check-risk-b-preview",
      title: "GitHub check-run preview",
      destinationType: "github",
      actionType: "github_check",
      riskClass: "B",
      actionPolicy: "request_human",
    }),
    writebackPolicySimulationCase({
      id: "slack-thread-risk-b",
      title: "Slack thread reply",
      destinationType: "slack",
      actionType: "slack_thread_reply",
      riskClass: "B",
      actionPolicy: "writeback_allowed",
    }),
    writebackPolicySimulationCase({
      id: "risk-c-blocked",
      title: "Risk C external action",
      destinationType: "github",
      actionType: "github_label",
      riskClass: "C",
      actionPolicy: "writeback_allowed",
    })
  );
  return {
    generatedAt,
    cases,
    stats: {
      caseCount: cases.length,
      executableCaseCount: cases.filter(
        (item) => item.realExecutorAvailable && !item.executionBlocked
      ).length,
      previewOnlyCaseCount: cases.filter((item) => item.previewOnly).length,
      blockedCaseCount: cases.filter((item) => item.executionBlocked).length,
      humanApprovalRequiredCount: cases.filter((item) => item.result.approvalRequired)
        .length,
    },
  };
}

function buildLocalWritebackPreview(proposal: ExternalActionProposal): {
  status: string | null;
  executionBlocked: boolean | null;
  mutationAttempted: boolean;
  payloadHash: string | null;
  error: string | null;
} {
  try {
    if (proposal.destinationType === "github" && isGitHubCommentAction(proposal.actionType)) {
      buildGitHubCommentWritebackPreview(proposal);
      return {
        status: "dry_run",
        executionBlocked: false,
        mutationAttempted: false,
        payloadHash: stablePayloadHash(proposal.payload),
        error: null,
      };
    }
    if (proposal.destinationType === "github" && isGitHubLabelAction(proposal.actionType)) {
      const preview = buildGitHubLabelProposalPreview(proposal);
      return {
        status: preview.status,
        executionBlocked: preview.executionBlocked,
        mutationAttempted: Boolean(preview.mutationAttempted),
        payloadHash: stablePayloadHash(proposal.payload),
        error: null,
      };
    }
    if (
      proposal.destinationType === "github" &&
      isGitHubStatusCheckAction(proposal.actionType)
    ) {
      const preview = buildGitHubStatusCheckProposalPreview(proposal);
      return {
        status: preview.status,
        executionBlocked: preview.executionBlocked,
        mutationAttempted: Boolean(preview.mutationAttempted),
        payloadHash: preview.payloadHash,
        error: null,
      };
    }
    if (
      proposal.destinationType === "slack" &&
      isSlackThreadReplyAction(proposal.actionType)
    ) {
      buildSlackThreadReplyWritebackPreview(proposal);
      return {
        status: "dry_run",
        executionBlocked: false,
        mutationAttempted: false,
        payloadHash: stablePayloadHash(proposal.payload),
        error: null,
      };
    }
    return {
      status: null,
      executionBlocked: true,
      mutationAttempted: false,
      payloadHash: stablePayloadHash(proposal.payload),
      error: "No local preview simulator is available for this action type.",
    };
  } catch (err) {
    return {
      status: null,
      executionBlocked: true,
      mutationAttempted: false,
      payloadHash: stablePayloadHash(proposal.payload),
      error: err instanceof Error ? err.message : "Unknown preview error",
    };
  }
}

function buildPreviewReplaySimulator(
  data: ReturnType<typeof listAll>
): WritebackPreviewReplaySimulator {
  const generatedAt = now();
  const items = data.externalActionProposals
    .map((proposal) => {
      const review = buildWritebackExecutionReview(proposal, generatedAt);
      const preview = buildLocalWritebackPreview(proposal);
      const latestEvent = latestExternalActionAudit(proposal);
      const terminalState =
        ["completed", "executed", "cancelled", "blocked"].includes(
          proposal.executionStatus
        ) || Boolean(proposal.externalId || proposal.externalUrl);
      const duplicatePrevented = hasDuplicateAvoidanceAudit(proposal);
      const completedNoop = hasCompletedNoopAudit(proposal);
      const manualRetryRequiresRationale = proposal.executionStatus === "failed";
      const safeToPreview =
        preview.error === null &&
        proposal.approvalStatus !== "blocked" &&
        proposal.executionStatus !== "cancelled";
      const safeToExecuteWithoutNewApproval =
        review.status === "ready_to_execute" &&
        preview.error === null &&
        preview.executionBlocked === false &&
        !terminalState &&
        !manualRetryRequiresRationale;
      const reason = terminalState
        ? "Terminal or externally completed proposal; do not replay write execution."
        : manualRetryRequiresRationale
          ? "Failed proposal requires human retry rationale before another execution attempt."
          : safeToExecuteWithoutNewApproval
            ? "Retry Safety says the proposal is ready, but this simulator remains read-only."
            : preview.error
              ? preview.error
              : "Proposal needs approval, preview refresh or safety review before execution.";
      return {
        proposalId: proposal.id,
        title: proposal.title,
        destinationType: proposal.destinationType,
        actionType: proposal.actionType,
        approvalStatus: proposal.approvalStatus,
        executionStatus: proposal.executionStatus,
        reviewStatus: review.status,
        targetSummary: writebackTargetSummary(proposal),
        preview: {
          available: preview.error === null,
          status: preview.status,
          executionBlocked: preview.executionBlocked,
          mutationAttempted: false,
          payloadHash: preview.payloadHash,
          idempotencyKey: proposal.idempotencyKey,
          error: preview.error,
        },
        replay: {
          terminalState,
          safeToPreview,
          safeToExecuteWithoutNewApproval,
          duplicatePrevented,
          completedNoop,
          automaticWriteRetryAllowed: false,
          manualRetryRequiresRationale,
          reason,
        },
        refs: {
          externalId: proposal.externalId,
          externalUrl: proposal.externalUrl,
          rollbackRef: proposal.rollbackRef,
        },
        latestEvent: latestEvent?.event ?? null,
        updatedAt: proposal.updatedAt,
      };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return {
    generatedAt,
    items,
    stats: {
      proposalCount: items.length,
      previewAvailableCount: items.filter((item) => item.preview.available).length,
      previewBlockedCount: items.filter((item) => item.preview.executionBlocked).length,
      terminalStateCount: items.filter((item) => item.replay.terminalState).length,
      safeToExecuteWithoutNewApprovalCount: items.filter(
        (item) => item.replay.safeToExecuteWithoutNewApproval
      ).length,
      duplicatePreventedCount: items.filter((item) => item.replay.duplicatePrevented)
        .length,
      failedRetryNeedsRationaleCount: items.filter(
        (item) => item.replay.manualRetryRequiresRationale
      ).length,
    },
  };
}

function optionalNumberQuery(value: string | undefined) {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildWritebackSafetyDashboard(
  data: ReturnType<typeof listAll>
): CompanyBrainWritebackSafetyDashboard {
  const generatedAt = now();
  const proposals = data.externalActionProposals;
  const completedExternal = proposals.filter(isCompletedExternalWriteback);
  const reviews = new Map(
    proposals.map((proposal) => [
      proposal.id,
      buildWritebackExecutionReview(proposal, generatedAt),
    ])
  );
  const evidenceIntegrityGaps = buildWritebackEvidenceIntegrityGaps(
    data,
    reviews,
    generatedAt
  );
  const evidenceRemediationSuggestions =
    buildWritebackEvidenceRemediationSuggestions(
      evidenceIntegrityGaps,
      generatedAt
    );
  const items: CompanyBrainWritebackSafetyDashboard["items"] = [];
  for (const proposal of proposals) {
    const kind = writebackSafetyItemKind(proposal);
    if (!kind) continue;
    const executionReview =
      reviews.get(proposal.id) ?? buildWritebackExecutionReview(proposal, generatedAt);
    const latestAudit = latestExternalActionAudit(proposal);
    items.push({
      id: `writeback_safety:${kind}:${proposal.id}`,
      kind,
      reviewStatus: executionReview.status,
      reviewFlags: executionReview.flags,
      executionReview,
      auditReview: buildWritebackAuditReview(proposal, executionReview),
      proposalId: proposal.id,
      title: proposal.title,
      destinationType: proposal.destinationType,
      destinationRef: proposal.destinationRef,
      actionType: proposal.actionType,
      riskClass: proposal.riskClass,
      actionPolicy: proposal.actionPolicy,
      approvalStatus: proposal.approvalStatus,
      executionStatus: proposal.executionStatus,
      externalId: proposal.externalId,
      externalUrl: proposal.externalUrl,
      idempotencyKey: proposal.idempotencyKey,
      errorSummary: proposal.errorSummary,
      auditEvent: latestAudit?.event ?? null,
      auditActor: latestAudit?.actor ?? null,
      auditAt: latestAudit?.at ?? null,
      updatedAt: proposal.updatedAt,
      nextAction: writebackSafetyNextAction(proposal, kind, executionReview),
    });
  }
  items.sort((a, b) => (b.auditAt ?? b.updatedAt) - (a.auditAt ?? a.updatedAt));

  return {
    generatedAt,
    retryPolicy: {
      executionStates: [
        "not_started",
        "dry_run",
        "completed",
        "already_completed",
        "failed",
        "cancelled",
        "blocked",
      ],
      readRetryPolicy: "automatic_get_only",
      writeRetryPolicy: "no_automatic_post_retry",
      manualRetryRequires: [
        "approved proposal",
        "fresh preview after approval",
        "unchanged payloadHash",
        "unchanged destinationRef",
        "unchanged idempotencyKey",
        "human retry rationale for failed proposals",
      ],
      terminalStates: ["completed", "executed"],
      blockedStates: ["cancelled", "blocked"],
    },
    items,
    adapterSummaries: buildWritebackAdapterSummaries(proposals, reviews),
    destinationSummaries: buildWritebackDestinationSummaries(proposals, reviews),
    targetObservabilitySummaries: buildWritebackTargetObservabilitySummaries(
      proposals,
      reviews,
      generatedAt
    ),
    operatingLoopMetrics: buildWritebackOperatingLoopMetrics(data, reviews, generatedAt),
    evidencePacketIndex: buildWritebackEvidencePacketIndex(
      data,
      reviews,
      evidenceIntegrityGaps
    ),
    evidenceIntegrityGaps,
    evidenceIntegritySummary:
      buildWritebackEvidenceIntegritySummary(evidenceIntegrityGaps),
    evidenceRemediationSuggestions,
    evidenceRemediationSummary: buildWritebackEvidenceRemediationSummary(
      evidenceRemediationSuggestions
    ),
    latestAuditTrail: buildWritebackAuditTrail({
      proposals,
      reviews,
      limit: 12,
    }).items,
    stats: {
      proposalCount: proposals.length,
      pendingApprovalCount: proposals.filter(
        (proposal) =>
          proposal.approvalStatus === "pending" &&
          !["blocked", "cancelled", "failed"].includes(proposal.executionStatus)
      ).length,
      approvedReadyCount: proposals.filter(
        (proposal) =>
          proposal.approvalStatus === "approved" &&
          ["not_started", "dry_run"].includes(proposal.executionStatus)
      ).length,
      completedExternalWriteCount: completedExternal.filter(
        (proposal) => proposal.externalId || proposal.externalUrl
      ).length,
      failedExecutionCount: proposals.filter(
        (proposal) => proposal.executionStatus === "failed"
      ).length,
      rejectedProposalCount: proposals.filter(
        (proposal) => proposal.approvalStatus === "rejected"
      ).length,
      blockedProposalCount: proposals.filter(
        (proposal) => proposal.approvalStatus === "blocked"
      ).length,
      previewOnlyBlockedCount: items.filter((item) =>
        item.auditReview.blockReasons.some((reason) =>
          reason.endsWith("_preview_only")
        )
      ).length,
      githubLabelBlockedCount: items.filter(
        (item) =>
          item.destinationType === "github" &&
          isGitHubLabelAction(item.actionType) &&
          item.reviewStatus === "blocked"
      ).length,
      githubStatusCheckBlockedCount: items.filter(
        (item) =>
          item.destinationType === "github" &&
          isGitHubStatusCheckAction(item.actionType) &&
          item.reviewStatus === "blocked"
      ).length,
      githubCommentWriteCount: completedExternal.filter(
        (proposal) =>
          proposal.destinationType === "github" &&
          isGitHubCommentAction(proposal.actionType) &&
          (proposal.externalId || proposal.externalUrl)
      ).length,
      githubLabelWriteCount: completedExternal.filter(
        (proposal) =>
          proposal.destinationType === "github" &&
          isGitHubLabelAction(proposal.actionType) &&
          (proposal.externalId || proposal.externalUrl)
      ).length,
      githubLabelNoopCount: completedExternal.filter(
        (proposal) =>
          proposal.destinationType === "github" &&
          isGitHubLabelAction(proposal.actionType) &&
          hasCompletedNoopAudit(proposal)
      ).length,
      githubStatusWriteCount: completedExternal.filter(
        (proposal) =>
          proposal.destinationType === "github" &&
          proposal.actionType === "github_status" &&
          (proposal.externalId || proposal.externalUrl)
      ).length,
      githubStatusNoopCount: completedExternal.filter(
        (proposal) =>
          proposal.destinationType === "github" &&
          proposal.actionType === "github_status" &&
          hasCompletedNoopAudit(proposal)
      ).length,
      slackThreadReplyWriteCount: completedExternal.filter(
        (proposal) =>
          proposal.destinationType === "slack" &&
          isSlackThreadReplyAction(proposal.actionType) &&
          (proposal.externalId || proposal.externalUrl)
      ).length,
      completedNoopCount: proposals.filter(hasCompletedNoopAudit).length,
      externalMutationAttemptedCount: proposals.filter(hasExternalMutationAttemptAudit)
        .length,
      duplicateAvoidedCount: proposals.filter(hasDuplicateAvoidanceAudit).length,
      riskCOrUnknownCount: proposals.filter(
        (proposal) => proposal.riskClass === "C" || proposal.riskClass === "unknown"
      ).length,
      completedMissingExternalRefCount: completedExternal.filter(
        (proposal) => !proposal.externalId || !proposal.externalUrl
      ).length,
      readyToExecuteCount: items.filter(
        (item) => item.reviewStatus === "ready_to_execute"
      ).length,
      needsPreviewCount: items.filter((item) => item.reviewStatus === "needs_preview")
        .length,
      needsReapprovalCount: items.filter(
        (item) => item.reviewStatus === "needs_reapproval"
      ).length,
      retryableFailedCount: items.filter(
        (item) => item.reviewStatus === "retryable_failed"
      ).length,
      unsafeFailedCount: items.filter((item) => item.reviewStatus === "unsafe_failed")
        .length,
      payloadMismatchCount: items.filter(
        (item) => item.reviewStatus === "payload_mismatch"
      ).length,
      destinationMismatchCount: items.filter(
        (item) => item.reviewStatus === "destination_mismatch"
      ).length,
    },
  };
}

function externalActionPolicy(args: {
  destinationType: ExternalActionDestination;
  actionType: ExternalActionKind;
  riskClass: RiskClass;
  actionPolicy: ActionPolicy;
}): {
  approvalStatus: ExternalActionApprovalStatus;
  approvalRequired: boolean;
  executionStatus: ExternalActionExecutionStatus;
  policySummary: string;
} {
  const { destinationType, actionType, riskClass, actionPolicy } = args;
  const isExternal = destinationType === "github" || destinationType === "slack";
  const isLowRiskExternal =
    (destinationType === "github" && isGitHubCommentAction(actionType)) ||
    (destinationType === "github" && isGitHubLabelAction(actionType)) ||
    (destinationType === "slack" && isSlackThreadReplyAction(actionType));
  const isPreviewOnlyExternal =
    destinationType === "github" && isGitHubStatusCheckAction(actionType);

  if (riskClass === "C") {
    return {
      approvalStatus: "blocked",
      approvalRequired: true,
      executionStatus: "blocked",
      policySummary:
        "Risk C actions are blocked in Writeback Governance v0; reinforced approval and execution adapters are not implemented.",
    };
  }

  if (riskClass === "A") {
    const allowed = !isExternal || actionType === "draft";
    return {
      approvalStatus: allowed ? "pending" : "blocked",
      approvalRequired: true,
      executionStatus: allowed ? "not_started" : "blocked",
      policySummary: allowed
        ? "Risk A allows internal actions or drafts only. External execution remains disabled in this cut."
        : "Risk A cannot target external systems unless it is represented as an internal draft.",
    };
  }

  if (riskClass === "B") {
    const allowedPolicy =
      actionPolicy === "request_human" || actionPolicy === "writeback_allowed";
    const allowed = isExternal && isLowRiskExternal && allowedPolicy;
    if (isExternal && isPreviewOnlyExternal && allowedPolicy) {
      if (actionType === "github_status") {
        return {
          approvalStatus: "pending",
          approvalRequired: true,
          executionStatus: "not_started",
          policySummary:
            "Risk B permits allowlisted internal GitHub commit status writeback only after human approval, preview, explicit SHA, Retry Safety, idempotency and audit gates. GitHub check-runs remain preview-only.",
        };
      }
      return {
        approvalStatus: "pending",
        approvalRequired: true,
        executionStatus: "not_started",
        policySummary:
          "Risk B GitHub check proposals are preview-only in this cut. They may be reviewed and dry-run, but no check-run writeback executor exists.",
      };
    }
    return {
      approvalStatus: allowed ? "pending" : "blocked",
      approvalRequired: true,
      executionStatus: allowed ? "not_started" : "blocked",
      policySummary: allowed
        ? isGitHubLabelAction(actionType)
          ? "Risk B permits allowlisted GitHub label add only after human approval, preview, idempotency, current-label read and Retry Safety gates."
          : "Risk B permits low-risk external comments or replies only after human approval and adapter-specific execution gates."
        : "Risk B requires an allowlisted low-risk external comment/reply/label plus request_human/writeback_allowed policy.",
    };
  }

  return {
    approvalStatus: "blocked",
    approvalRequired: true,
    executionStatus: "blocked",
    policySummary:
      "Unknown risk class is blocked until the proposal is explicitly classified.",
  };
}

function defaultExternalActionPayload(args: {
  actionType: ExternalActionKind;
  guidanceAction: string;
}): Record<string, unknown> {
  if (isGitHubLabelAction(args.actionType)) {
    return { labels: [], mode: "add", body: args.guidanceAction };
  }
  if (isGitHubStatusCheckAction(args.actionType)) {
    return {
      repo: "",
      pullNumber: null,
      sha: "",
      context: "aios/preview",
      state: "pending",
      conclusion: "neutral",
      title: "AIOS preview-only PR/CI feedback",
      summary: args.guidanceAction,
      description: args.guidanceAction,
      targetUrl: "",
      rationale: args.guidanceAction,
    };
  }
  if (isGitHubCommentAction(args.actionType) || isSlackThreadReplyAction(args.actionType)) {
    return { body: args.guidanceAction };
  }
  return { body: args.guidanceAction };
}

function appendAuditEvent(
  auditTrail: ExternalActionAuditEvent[],
  event: Omit<ExternalActionAuditEvent, "at">
) {
  return [
    ...auditTrail,
    {
      ...event,
      at: now(),
    },
  ];
}

app.get("/summary", (c) => {
  const data = listAll();
  const adoptionDashboard = buildAdoptionDashboard(data);
  const sourceHealthReport = buildSourceHealthReport(data);
  const operatingCadence = buildOperatingCadence(data);
  const gateClosureRitual = buildGateClosureRitual(data);
  const lastBriefing = buildLastBriefing(data);
  const reviewCohesion = buildReviewCohesion(data);
  const writebackSafetyDashboard = buildWritebackSafetyDashboard(data);
  const writebackProposalTargetReview = buildWritebackProposalTargetReview({ data });
  const evidenceGraph = buildCompanyBrainEvidenceGraph({ data });
  const timeline = buildCompanyBrainTimeline({ data });
  const savedAuditViews = buildCompanyBrainSavedAuditViews(data);
  const writebackPolicySimulator = buildWritebackPolicySimulator();
  const previewReplaySimulator = buildPreviewReplaySimulator(data);
  const coreReadiness = buildCoreReadiness({
    data,
    adoptionDashboard,
    sourceHealthReport,
    operatingCadence,
    gateClosureRitual,
    writebackSafetyDashboard,
    evidenceGraph,
    timeline,
    savedAuditViews,
    writebackPolicySimulator,
    previewReplaySimulator,
    lastBriefing,
  });
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
      operatingCadence,
      gateClosureRitual,
      lastBriefing,
      reviewCohesion,
      writebackSafetyDashboard,
      writebackProposalTargetReview,
      evidenceGraph,
      timeline,
      savedAuditViews,
      writebackPolicySimulator,
      previewReplaySimulator,
      coreReadiness,
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
        externalActionProposalCount: data.externalActionProposals.length,
        pendingExternalActionCount: data.externalActionProposals.filter(
          (proposal) => proposal.approvalStatus === "pending"
        ).length,
        approvedExternalActionCount: data.externalActionProposals.filter(
          (proposal) => proposal.approvalStatus === "approved"
        ).length,
        blockedExternalActionCount: data.externalActionProposals.filter(
          (proposal) => proposal.approvalStatus === "blocked"
        ).length,
        completedExternalActionCount:
          writebackSafetyDashboard.stats.completedExternalWriteCount,
        failedExternalActionCount:
          writebackSafetyDashboard.stats.failedExecutionCount,
        duplicateAvoidedExternalActionCount:
          writebackSafetyDashboard.stats.duplicateAvoidedCount,
      },
    },
  });
});

app.get("/core-readiness", (c) => {
  const data = listAll();
  const adoptionDashboard = buildAdoptionDashboard(data);
  const sourceHealthReport = buildSourceHealthReport(data);
  const operatingCadence = buildOperatingCadence(data);
  const gateClosureRitual = buildGateClosureRitual(data);
  const lastBriefing = buildLastBriefing(data);
  const writebackSafetyDashboard = buildWritebackSafetyDashboard(data);
  const evidenceGraph = buildCompanyBrainEvidenceGraph({ data });
  const timeline = buildCompanyBrainTimeline({ data });
  const savedAuditViews = buildCompanyBrainSavedAuditViews(data);
  const writebackPolicySimulator = buildWritebackPolicySimulator();
  const previewReplaySimulator = buildPreviewReplaySimulator(data);
  const coreReadiness = buildCoreReadiness({
    data,
    adoptionDashboard,
    sourceHealthReport,
    operatingCadence,
    gateClosureRitual,
    writebackSafetyDashboard,
    evidenceGraph,
    timeline,
    savedAuditViews,
    writebackPolicySimulator,
    previewReplaySimulator,
    lastBriefing,
  });
  return c.json({ data: coreReadiness });
});

app.get("/operating-snapshot", (c) => {
  const data = buildOperatingSnapshot(listAll());
  return c.json({ data });
});

app.get("/operating-cadence", (c) => {
  const data = buildOperatingCadence(listAll());
  return c.json({ data });
});

app.get("/gate-closure-ritual", (c) => {
  const data = buildGateClosureRitual(listAll());
  return c.json({ data });
});

app.post("/operating-cadence/run", async (c) => {
  const startedAt = now();
  const body = (await c.req
    .json<RunOperatingCadenceRequest>()
    .catch(() => ({}))) as RunOperatingCadenceRequest;
  const requestedWatcherIds = body.watcherIds?.length
    ? body.watcherIds
    : OPERATING_CADENCE_WATCHER_IDS;
  const scheduleId = body.scheduleId ?? "company-brain:operating-cadence-v0";
  const scheduledAt = body.scheduledAt ?? startedAt;
  const runs: RunOperatingCadenceResponse["runs"] = [];

  const runPrCi = requestedWatcherIds.includes(GITHUB_PR_CI_WATCHER_ID);
  if (runPrCi) {
    try {
      const result = await runGitHubPrCiWatcherSync({
        repo: body.githubPrCi?.repo ?? OPERATING_CADENCE_DEFAULT_REPO,
        state: body.githubPrCi?.state ?? "open",
        limit: body.githubPrCi?.limit ?? 5,
        sourceId: body.githubPrCi?.sourceId ?? null,
        sourceName:
          body.githubPrCi?.sourceName ??
          "Felhen GitHub PR/CI scheduled cadence watcher",
        area: body.githubPrCi?.area ?? "development",
        owner: body.githubPrCi?.owner ?? "Felhen",
        visibility: body.githubPrCi?.visibility ?? "internal",
        createSignals: body.githubPrCi?.createSignals ?? true,
        triggerSource: "schedule",
        scheduleId,
        scheduledAt,
      });
      runs.push({
        watcherId: GITHUB_PR_CI_WATCHER_ID,
        status: result.watcherRun.status,
        watcherRunId: result.watcherRun.id,
        artifactId: result.watcherRun.artifactsCreated[0] ?? null,
        triggerRef: result.watcherRun.triggerRef,
        artifactsCreated: result.artifactsCreated.length,
        signalsCreated: result.signalsCreated.length,
        errorSummary: result.watcherRun.errorSummary,
      });
    } catch (err) {
      const lastFailedRun = lastRunForWatcher(
        getDb().select().from(cbWatcherRuns).all(),
        GITHUB_PR_CI_WATCHER_ID
      );
      runs.push({
        watcherId: GITHUB_PR_CI_WATCHER_ID,
        status: "failed",
        watcherRunId: lastFailedRun?.id ?? null,
        artifactId: lastFailedRun?.artifactsCreated[0] ?? null,
        triggerRef: lastFailedRun?.triggerRef ?? null,
        artifactsCreated: 0,
        signalsCreated: 0,
        errorSummary: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const runBriefing = requestedWatcherIds.includes(AIOS_BRIEFING_WATCHER_ID);
  if (runBriefing) {
    const watcher = getDb()
      .select()
      .from(cbWatchers)
      .where(eq(cbWatchers.id, AIOS_BRIEFING_WATCHER_ID))
      .get();
    if (watcher) {
      try {
        const result = runAiosBriefingWatcher({
          watcher,
          startedAt: now(),
          runId: nanoid(12),
          triggerSource: "schedule",
          scheduleId,
          scheduledAt,
        });
        runs.push({
          watcherId: AIOS_BRIEFING_WATCHER_ID,
          status: result.run.status,
          watcherRunId: result.run.id,
          artifactId: result.run.artifactsCreated[0] ?? null,
          triggerRef: result.run.triggerRef,
          artifactsCreated: result.run.artifactsCreated.length,
          signalsCreated: result.run.signalsCreated.length,
          errorSummary: result.run.errorSummary,
        });
      } catch (err) {
        runs.push({
          watcherId: AIOS_BRIEFING_WATCHER_ID,
          status: "failed",
          watcherRunId: null,
          artifactId: null,
          triggerRef: null,
          artifactsCreated: 0,
          signalsCreated: 0,
          errorSummary: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  }

  for (const watcherId of requestedWatcherIds) {
    if (!runs.some((run) => run.watcherId === watcherId)) {
      runs.push({
        watcherId,
        status: "skipped",
        watcherRunId: null,
        artifactId: null,
        triggerRef: null,
        artifactsCreated: 0,
        signalsCreated: 0,
        errorSummary: "Watcher is not part of Operating Cadence v0.",
      });
    }
  }

  const operatingCadence = buildOperatingCadence(listAll());
  const response: RunOperatingCadenceResponse = {
    scheduleId,
    scheduledAt,
    runs,
    artifactsCreated: runs.reduce((sum, run) => sum + run.artifactsCreated, 0),
    signalsCreated: runs.reduce((sum, run) => sum + run.signalsCreated, 0),
    watcherRunsCreated: runs.filter((run) => run.watcherRunId).length,
    operatingCadence,
  };
  return c.json({ data: response }, 201);
});

app.get("/writeback-safety-dashboard", (c) => {
  const data = buildWritebackSafetyDashboard(listAll());
  return c.json({ data });
});

app.get("/evidence-graph", (c) => {
  const rootKindParam = c.req.query("rootKind")?.trim() || null;
  const rootId = c.req.query("rootId")?.trim() || null;
  const limitParam = Number(c.req.query("limit") ?? "250");
  const allowedRootKinds: CompanyBrainEvidenceGraphNodeKind[] = [
    "source",
    "artifact",
    "priority",
    "goal",
    "work_item",
    "workflow_run",
    "signal",
    "alignment_finding",
    "guidance_item",
    "external_action_proposal",
    "writeback_target",
  ];
  const rootKind = allowedRootKinds.includes(
    rootKindParam as CompanyBrainEvidenceGraphNodeKind
  )
    ? (rootKindParam as CompanyBrainEvidenceGraphNodeKind)
    : null;
  const data = buildCompanyBrainEvidenceGraph({
    data: listAll(),
    rootKind,
    rootId,
    limit: Number.isFinite(limitParam) ? limitParam : 250,
  });
  return c.json({ data });
});

app.get("/timeline", (c) => {
  const scopeParam = c.req.query("scope")?.trim() || null;
  const id = c.req.query("id")?.trim() || null;
  const limitParam = Number(c.req.query("limit") ?? "100");
  const allowedScopes: CompanyBrainTimelineScope[] = [
    "all",
    "proposal",
    "target",
    "source",
  ];
  const scope = allowedScopes.includes(scopeParam as CompanyBrainTimelineScope)
    ? (scopeParam as CompanyBrainTimelineScope)
    : "all";
  const data = buildCompanyBrainTimeline({
    data: listAll(),
    scope,
    id,
    limit: Number.isFinite(limitParam) ? limitParam : 100,
  });
  return c.json({ data });
});

app.get("/saved-audit-views", (c) => {
  const data = buildCompanyBrainSavedAuditViews(listAll());
  return c.json({ data });
});

app.get("/writeback-policy-simulator", (c) => {
  const destinationTypeParam = c.req.query("destinationType")?.trim() || null;
  const actionTypeParam = c.req.query("actionType")?.trim() || null;
  const riskClassParam = c.req.query("riskClass")?.trim() || null;
  const actionPolicyParam = c.req.query("actionPolicy")?.trim() || null;
  const allowedDestinations: ExternalActionDestination[] = [
    "github",
    "slack",
    "internal",
    "unknown",
  ];
  const allowedActions: ExternalActionKind[] = [
    "comment",
    "github_comment",
    "label",
    "github_label",
    "github_status",
    "github_check",
    "thread_reply",
    "slack_thread_reply",
    "draft",
    "unknown",
  ];
  const allowedRiskClasses: RiskClass[] = ["A", "B", "C", "unknown"];
  const allowedActionPolicies: ActionPolicy[] = [
    "observe_only",
    "create_artifacts",
    "create_work_items",
    "request_human",
    "writeback_allowed",
  ];
  const customCase =
    allowedDestinations.includes(destinationTypeParam as ExternalActionDestination) &&
    allowedActions.includes(actionTypeParam as ExternalActionKind) &&
    allowedRiskClasses.includes(riskClassParam as RiskClass) &&
    allowedActionPolicies.includes(actionPolicyParam as ActionPolicy)
      ? {
          destinationType: destinationTypeParam as ExternalActionDestination,
          actionType: actionTypeParam as ExternalActionKind,
          riskClass: riskClassParam as RiskClass,
          actionPolicy: actionPolicyParam as ActionPolicy,
        }
      : null;
  const data = buildWritebackPolicySimulator({ customCase });
  return c.json({ data });
});

app.get("/external-action-proposals/preview-replay-simulator", (c) => {
  const data = buildPreviewReplaySimulator(listAll());
  return c.json({ data });
});

app.get("/preview-replay-simulator", (c) => {
  const data = buildPreviewReplaySimulator(listAll());
  return c.json({ data });
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

    const demoExternalActionProposals: ExternalActionProposal[] = [];
    const ensureDemoExternalActionProposal = (args: {
      title: string;
      rationale: string;
      destinationRef: string;
      payload: Record<string, unknown>;
      riskClass: RiskClass;
      policySummary: string;
      approvalStatus: ExternalActionApprovalStatus;
      approvalRequired: boolean;
      executionStatus: ExternalActionExecutionStatus;
      idempotencyKey: string;
      auditEvents: ExternalActionAuditEvent[];
    }) => {
      const existing = db
        .select()
        .from(cbExternalActionProposals)
        .where(eq(cbExternalActionProposals.idempotencyKey, args.idempotencyKey))
        .get();
      if (existing) {
        demoExternalActionProposals.push(existing);
        return existing;
      }
      const row: ExternalActionProposal = {
        id: nanoid(12),
        guidanceItemId: guidanceItem.id,
        signalId: signal.id,
        findingId: alignmentFinding.id,
        workItemId: workItem.id,
        workflowRunId: workflowRun.id,
        title: args.title,
        rationale: args.rationale,
        destinationType: "internal",
        destinationRef: args.destinationRef,
        actionType: "draft",
        payload: args.payload,
        riskClass: args.riskClass,
        actionPolicy: "observe_only",
        policySummary: args.policySummary,
        approvalStatus: args.approvalStatus,
        approvalRequired: args.approvalRequired,
        requestedBy: "demo-seed",
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        executionStatus: args.executionStatus,
        externalId: null,
        externalUrl: null,
        errorSummary: null,
        rollbackRef: null,
        idempotencyKey: args.idempotencyKey,
        auditTrail: args.auditEvents,
        visibility,
        provenance: {
          sourceId: source.id,
          rawRef: `${demoRef}/external-action-proposal/${args.idempotencyKey}`,
          artifactId: artifact.id,
          createdFrom: "demo:felhen-v0.2:external_action_proposal",
          confidence: 1,
          extractedAt: timestamp,
          humanReviewStatus: "pending" as const,
          visibility,
          notes: "internal_example=true; no_external_call=true",
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.insert(cbExternalActionProposals).values(row).run();
      demoExternalActionProposals.push(row);
      return row;
    };
    const riskAPayload = {
      demo: "felhen-v0.2",
      mode: "preview_only",
      body: "Internal Risk A preview-only draft for demo readiness review.",
      canonicalArtifactField: "artifactType",
    };
    ensureDemoExternalActionProposal({
      title: "Felhen Demo v0.2 Risk A preview-only draft",
      rationale:
        "Demonstrate that low-risk internal AIOS suggestions can be inspected without any external writeback path.",
      destinationRef: `${demoRef}/writeback/preview-only`,
      payload: riskAPayload,
      riskClass: "A",
      policySummary:
        "Risk A internal draft. Preview-only example; no external destination and no executor.",
      approvalStatus: "blocked",
      approvalRequired: false,
      executionStatus: "blocked",
      idempotencyKey: "demo:felhen-v0.2:risk-a-preview-only",
      auditEvents: [
        {
          at: timestamp,
          actor: "demo-seed",
          event: "proposal_created",
          note: "Demo Seed v0.2 created an internal Risk A preview-only proposal.",
          metadata: {
            demo: "felhen-v0.2",
            mode: "preview_only",
            payloadHash: stablePayloadHash(riskAPayload),
            destinationRef: `${demoRef}/writeback/preview-only`,
            idempotencyKey: "demo:felhen-v0.2:risk-a-preview-only",
          },
        },
        {
          at: timestamp,
          actor: "demo-seed",
          event: "internal_preview_only_recorded",
          note: "No external writeback API is available or called for this example.",
          metadata: {
            executionBlocked: true,
            status: "preview_only",
          },
        },
      ],
    });
    const riskBPayload = {
      demo: "felhen-v0.2",
      mode: "pending_approval",
      body: "Internal Risk B proposal that requires human approval before any future action.",
      canonicalArtifactField: "artifactType",
    };
    ensureDemoExternalActionProposal({
      title: "Felhen Demo v0.2 Risk B pending approval",
      rationale:
        "Demonstrate the governed queue state for a higher-risk internal proposal that still does not execute externally.",
      destinationRef: `${demoRef}/writeback/pending-approval`,
      payload: riskBPayload,
      riskClass: "B",
      policySummary:
        "Risk B internal draft. Approval is required; no external destination and no executor in this demo seed.",
      approvalStatus: "pending",
      approvalRequired: true,
      executionStatus: "not_started",
      idempotencyKey: "demo:felhen-v0.2:risk-b-pending-approval",
      auditEvents: [
        {
          at: timestamp,
          actor: "demo-seed",
          event: "proposal_created",
          note: "Demo Seed v0.2 created an internal Risk B pending-approval proposal.",
          metadata: {
            demo: "felhen-v0.2",
            mode: "pending_approval",
            payloadHash: stablePayloadHash(riskBPayload),
            destinationRef: `${demoRef}/writeback/pending-approval`,
            idempotencyKey: "demo:felhen-v0.2:risk-b-pending-approval",
          },
        },
      ],
    });

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
          externalActionProposals: demoExternalActionProposals,
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
    if (!["active", "error"].includes(watcher.status)) {
      throw new Error("GitHub PR/CI watcher is not runnable");
    }

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

app.get("/external-action-proposals", (c) => {
  const approvalStatus = c.req.query("approvalStatus");
  let data = getDb()
    .select()
    .from(cbExternalActionProposals)
    .orderBy(desc(cbExternalActionProposals.updatedAt))
    .limit(100)
    .all();
  if (approvalStatus) {
    data = data.filter((item) => item.approvalStatus === approvalStatus);
  }
  return c.json({ data, total: data.length });
});

app.get("/external-action-proposals/proposal-target-review", (c) => {
  const proposalId = c.req.query("proposalId")?.trim() || null;
  const targetKey = c.req.query("targetKey")?.trim() || null;
  const destinationTypeParam = c.req.query("destinationType")?.trim() || null;
  const actionTypeParam = c.req.query("actionType")?.trim() || null;
  const riskClassParam = c.req.query("riskClass")?.trim() || null;
  const reviewStatusParam = c.req.query("reviewStatus")?.trim() || null;
  const limitParam = Number(c.req.query("limit") ?? "50");
  const allowedDestinations: ExternalActionDestination[] = [
    "github",
    "slack",
    "internal",
    "unknown",
  ];
  const destinationType = allowedDestinations.includes(
    destinationTypeParam as ExternalActionDestination
  )
    ? (destinationTypeParam as ExternalActionDestination)
    : null;
  const allowedActions: ExternalActionKind[] = [
    "comment",
    "github_comment",
    "label",
    "github_label",
    "github_status",
    "github_check",
    "thread_reply",
    "slack_thread_reply",
    "draft",
    "unknown",
  ];
  const actionType = allowedActions.includes(actionTypeParam as ExternalActionKind)
    ? (actionTypeParam as ExternalActionKind)
    : null;
  const allowedRiskClasses: RiskClass[] = ["A", "B", "C", "unknown"];
  const riskClass = allowedRiskClasses.includes(riskClassParam as RiskClass)
    ? (riskClassParam as RiskClass)
    : null;
  const allowedReviewStatuses: CompanyBrainWritebackProposalTargetReview["filters"]["reviewStatus"][] =
    [
      "ready_to_execute",
      "needs_preview",
      "needs_reapproval",
      "retryable_failed",
      "unsafe_failed",
      "payload_mismatch",
      "destination_mismatch",
      "duplicate_prevented",
      "completed",
      "blocked",
    ];
  const reviewStatus = allowedReviewStatuses.includes(
    reviewStatusParam as NonNullable<
      CompanyBrainWritebackProposalTargetReview["filters"]["reviewStatus"]
    >
  )
    ? (reviewStatusParam as NonNullable<
        CompanyBrainWritebackProposalTargetReview["filters"]["reviewStatus"]
      >)
    : null;
  const data = listAll();
  return c.json({
    data: buildWritebackProposalTargetReview({
      data,
      proposalId,
      targetKey,
      destinationType,
      actionType,
      riskClass,
      reviewStatus,
      limit: Number.isFinite(limitParam) ? limitParam : 50,
    }),
  });
});

app.get("/external-action-proposals/audit-trail", (c) => {
  const adapterParam = c.req.query("adapter")?.trim() || null;
  const proposalId = c.req.query("proposalId")?.trim() || null;
  const guidanceItemId = c.req.query("guidanceId")?.trim() || c.req.query("guidanceItemId")?.trim() || null;
  const destinationTypeParam = c.req.query("destinationType")?.trim() || null;
  const actionTypeParam = c.req.query("actionType")?.trim() || null;
  const riskClassParam = c.req.query("riskClass")?.trim() || null;
  const executionStatusParam = c.req.query("executionStatus")?.trim() || null;
  const eventParam = c.req.query("event")?.trim() || null;
  const actor = c.req.query("actor")?.trim() || null;
  const idempotencyKey = c.req.query("idempotencyKey")?.trim() || null;
  const externalUrl = c.req.query("externalUrl")?.trim() || null;
  const search = c.req.query("q")?.trim() || c.req.query("search")?.trim() || null;
  const format = c.req.query("format")?.trim().toLowerCase() ?? "json";
  const fromAtParam = optionalNumberQuery(
    c.req.query("fromAt") ?? c.req.query("from")
  );
  const toAtParam = optionalNumberQuery(c.req.query("toAt") ?? c.req.query("to"));
  const limitParam = Number(c.req.query("limit") ?? "50");
  const allowedAdapters: CompanyBrainWritebackAuditTrailResponse["filters"]["adapter"][] =
    [
      "github_comment",
      "github_label",
      "github_status_check",
      "slack_thread_reply",
      "other",
    ];
  const adapter = allowedAdapters.includes(
    adapterParam as NonNullable<
      CompanyBrainWritebackAuditTrailResponse["filters"]["adapter"]
    >
  )
    ? (adapterParam as NonNullable<
        CompanyBrainWritebackAuditTrailResponse["filters"]["adapter"]
      >)
    : null;
  const allowedDestinations: ExternalActionDestination[] = [
    "github",
    "slack",
    "internal",
    "unknown",
  ];
  const destinationType = allowedDestinations.includes(
    destinationTypeParam as ExternalActionDestination
  )
    ? (destinationTypeParam as ExternalActionDestination)
    : null;
  const allowedActions: ExternalActionKind[] = [
    "comment",
    "github_comment",
    "label",
    "github_label",
    "github_status",
    "github_check",
    "thread_reply",
    "slack_thread_reply",
    "draft",
    "unknown",
  ];
  const actionType = allowedActions.includes(actionTypeParam as ExternalActionKind)
    ? (actionTypeParam as ExternalActionKind)
    : null;
  const allowedRiskClasses: RiskClass[] = ["A", "B", "C", "unknown"];
  const riskClass = allowedRiskClasses.includes(riskClassParam as RiskClass)
    ? (riskClassParam as RiskClass)
    : null;
  const allowedExecutionStatuses: ExternalActionExecutionStatus[] = [
    "not_started",
    "blocked",
    "dry_run",
    "queued",
    "completed",
    "executed",
    "failed",
    "cancelled",
  ];
  const executionStatus = allowedExecutionStatuses.includes(
    executionStatusParam as ExternalActionExecutionStatus
  )
    ? (executionStatusParam as ExternalActionExecutionStatus)
    : null;
  const proposals = getDb()
    .select()
    .from(cbExternalActionProposals)
    .orderBy(desc(cbExternalActionProposals.updatedAt))
    .limit(250)
    .all();
  const reviews = new Map(
    proposals.map((proposal) => [
      proposal.id,
      buildWritebackExecutionReview(proposal),
    ])
  );
  const data = buildWritebackAuditTrail({
    proposals,
    reviews,
    adapter,
    proposalId,
    guidanceItemId,
    destinationType,
    actionType,
    riskClass,
    executionStatus,
    event: eventParam,
    actor,
    fromAt: fromAtParam,
    toAt: toAtParam,
    idempotencyKey,
    externalUrl,
    search,
    limit: Number.isFinite(limitParam) ? limitParam : 50,
  });
  if (format === "csv") {
    return new Response(writebackAuditTrailCsv(data), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=aios-writeback-audit-trail.csv",
      },
    });
  }
  return c.json({ data });
});

app.get("/external-action-proposals/evidence-integrity-gaps", (c) => {
  const severityParam = c.req.query("severity")?.trim() || null;
  const kindParam = c.req.query("kind")?.trim() || c.req.query("gapType")?.trim() || null;
  const adapterParam = c.req.query("adapter")?.trim() || null;
  const proposalId = c.req.query("proposalId")?.trim() || null;
  const limitParam = Number(c.req.query("limit") ?? "50");
  const allowedSeverities: SignalSeverity[] = ["info", "warn", "critical"];
  const severity = allowedSeverities.includes(severityParam as SignalSeverity)
    ? (severityParam as SignalSeverity)
    : null;
  const kind = writebackEvidenceIntegrityGapKinds.includes(
    kindParam as NonNullable<
      CompanyBrainWritebackEvidenceIntegrityGapsResponse["filters"]["kind"]
    >
  )
    ? (kindParam as NonNullable<
        CompanyBrainWritebackEvidenceIntegrityGapsResponse["filters"]["kind"]
      >)
    : null;
  const allowedAdapters: CompanyBrainWritebackEvidenceIntegrityGapsResponse["filters"]["adapter"][] =
    [
      "github_comment",
      "github_label",
      "github_status_check",
      "slack_thread_reply",
      "other",
    ];
  const adapter = allowedAdapters.includes(
    adapterParam as NonNullable<
      CompanyBrainWritebackEvidenceIntegrityGapsResponse["filters"]["adapter"]
    >
  )
    ? (adapterParam as NonNullable<
        CompanyBrainWritebackEvidenceIntegrityGapsResponse["filters"]["adapter"]
      >)
    : null;
  const data = listAll();
  const reviews = new Map(
    data.externalActionProposals.map((proposal) => [
      proposal.id,
      buildWritebackExecutionReview(proposal),
    ])
  );
  return c.json({
    data: buildWritebackEvidenceIntegrityGapsResponse({
      data,
      reviews,
      severity,
      kind,
      adapter,
      proposalId,
      limit: Number.isFinite(limitParam) ? limitParam : 50,
    }),
  });
});

app.get("/external-action-proposals/evidence-remediation-suggestions", (c) => {
  const severityParam = c.req.query("severity")?.trim() || null;
  const gapKindParam =
    c.req.query("gapKind")?.trim() ||
    c.req.query("kind")?.trim() ||
    c.req.query("gapType")?.trim() ||
    null;
  const actionKindParam = c.req.query("actionKind")?.trim() || null;
  const adapterParam = c.req.query("adapter")?.trim() || null;
  const proposalId = c.req.query("proposalId")?.trim() || null;
  const limitParam = Number(c.req.query("limit") ?? "50");
  const allowedSeverities: SignalSeverity[] = ["info", "warn", "critical"];
  const severity = allowedSeverities.includes(severityParam as SignalSeverity)
    ? (severityParam as SignalSeverity)
    : null;
  const gapKind = writebackEvidenceIntegrityGapKinds.includes(
    gapKindParam as NonNullable<
      CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["filters"]["gapKind"]
    >
  )
    ? (gapKindParam as NonNullable<
        CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["filters"]["gapKind"]
      >)
    : null;
  const actionKind = writebackEvidenceRemediationActionKinds.includes(
    actionKindParam as NonNullable<
      CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["filters"]["actionKind"]
    >
  )
    ? (actionKindParam as NonNullable<
        CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["filters"]["actionKind"]
      >)
    : null;
  const allowedAdapters: CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["filters"]["adapter"][] =
    [
      "github_comment",
      "github_label",
      "github_status_check",
      "slack_thread_reply",
      "other",
    ];
  const adapter = allowedAdapters.includes(
    adapterParam as NonNullable<
      CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["filters"]["adapter"]
    >
  )
    ? (adapterParam as NonNullable<
        CompanyBrainWritebackEvidenceRemediationSuggestionsResponse["filters"]["adapter"]
      >)
    : null;
  const data = listAll();
  const reviews = new Map(
    data.externalActionProposals.map((proposal) => [
      proposal.id,
      buildWritebackExecutionReview(proposal),
    ])
  );
  return c.json({
    data: buildWritebackEvidenceRemediationSuggestionsResponse({
      data,
      reviews,
      severity,
      gapKind,
      actionKind,
      adapter,
      proposalId,
      limit: Number.isFinite(limitParam) ? limitParam : 50,
    }),
  });
});

app.get("/external-action-proposals/:id/evidence-packet", (c) => {
  const id = c.req.param("id");
  const proposal = getDb()
    .select()
    .from(cbExternalActionProposals)
    .where(eq(cbExternalActionProposals.id, id))
    .get();
  if (!proposal) {
    return c.json(
      { error: "not_found", message: "external action proposal not found" },
      404
    );
  }
  const packet = buildWritebackEvidencePacket(proposal);
  const format = c.req.query("format")?.trim().toLowerCase() ?? "";
  if (format === "markdown" || c.req.query("markdown") === "1") {
    return new Response(writebackEvidencePacketMarkdown(packet), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename=aios-writeback-evidence-${proposal.id}.md`,
      },
    });
  }
  if (c.req.query("download") === "1") {
    return new Response(JSON.stringify(packet, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename=aios-writeback-evidence-${proposal.id}.json`,
      },
    });
  }
  return c.json({ data: packet });
});

app.post("/external-action-proposals/from-guidance", async (c) => {
  try {
    const db = getDb();
    const body = await c.req.json<CreateExternalActionProposalRequest>();
    const guidanceItemId = requireText(body.guidanceItemId, "guidanceItemId");
    const guidance = db
      .select()
      .from(cbGuidanceItems)
      .where(eq(cbGuidanceItems.id, guidanceItemId))
      .get();
    if (!guidance) throw new Error("guidance item not found");
    if (guidance.status !== "accepted" && guidance.feedbackStatus !== "accepted") {
      throw new Error("writeback proposals require accepted guidance");
    }

    const requestedDestination = body.destinationType;
    const requestedAction = body.actionType;
    const destinationType: ExternalActionDestination =
      requestedDestination ??
      (requestedAction && isSlackThreadReplyAction(requestedAction)
        ? "slack"
        : requestedAction === "draft"
          ? "internal"
          : "github");
    const actionType: ExternalActionKind =
      requestedAction ??
      (destinationType === "slack"
        ? "thread_reply"
        : destinationType === "internal"
          ? "draft"
          : "comment");
    const riskClass = body.riskClass ?? "B";
    const actionPolicy = body.actionPolicy ?? "request_human";
    const visibility: Visibility = body.visibility ?? guidance.visibility;
    const workItem = guidance.workItemId
      ? db
          .select()
          .from(cbWorkItems)
          .where(eq(cbWorkItems.id, guidance.workItemId))
          .get()
      : null;
    const signal = guidance.signalId
      ? db.select().from(cbSignals).where(eq(cbSignals.id, guidance.signalId)).get()
      : null;
    const explicitDestinationRef = body.destinationRef?.trim() || null;
    const destinationRef =
      explicitDestinationRef ??
      workItem?.externalUrl ??
      signal?.rawRef ??
      guidance.provenance?.rawRef ??
      null;
    const idempotencyKey =
      body.idempotencyKey?.trim() ||
      `writeback:${guidance.id}:${destinationType}:${actionType}:${stableHash(
        destinationRef ?? "none"
      ).slice(0, 16)}`;

    const existing = db
      .select()
      .from(cbExternalActionProposals)
      .where(eq(cbExternalActionProposals.idempotencyKey, idempotencyKey))
      .get();
    if (existing) {
      return c.json({ data: existing });
    }

    const timestamp = now();
    const policy = externalActionPolicy({
      destinationType,
      actionType,
      riskClass,
      actionPolicy,
    });
    const payload =
      body.payload && Object.keys(body.payload).length
        ? body.payload
        : defaultExternalActionPayload({
            actionType,
            guidanceAction: guidance.action,
          });
    const requestedBy = body.requestedBy?.trim() || null;
    const row: ExternalActionProposal = {
      id: nanoid(12),
      guidanceItemId: guidance.id,
      signalId: guidance.signalId,
      findingId: guidance.findingId,
      workItemId: guidance.workItemId,
      workflowRunId: guidance.workflowRunId,
      title: body.title?.trim() || `Writeback proposal: ${guidance.title}`,
      rationale: body.rationale?.trim() || guidance.action,
      destinationType,
      destinationRef,
      actionType,
      payload,
      riskClass,
      actionPolicy,
      policySummary: policy.policySummary,
      approvalStatus: policy.approvalStatus,
      approvalRequired: policy.approvalRequired,
      requestedBy,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      executionStatus: policy.executionStatus,
      externalId: null,
      externalUrl: null,
      errorSummary: null,
      rollbackRef: null,
      idempotencyKey,
      auditTrail: [
        {
          at: timestamp,
          actor: requestedBy,
          event: "proposal_created",
          note: "Generated from accepted GuidanceItem. External execution is disabled in Writeback Governance v0.",
          metadata: {
            guidanceItemId: guidance.id,
            destinationType,
            destinationRef,
            actionType,
            riskClass,
            actionPolicy,
            approvalStatus: policy.approvalStatus,
            executionStatus: policy.executionStatus,
            payload,
          },
        },
      ],
      visibility,
      provenance: {
        rawRef: guidance.id,
        artifactId: guidance.provenance?.artifactId,
        createdFrom: "writeback_governance:guidance_item",
        confidence: guidance.provenance?.confidence ?? 1,
        extractedAt: timestamp,
        humanReviewStatus:
          policy.approvalStatus === "blocked" ? "rejected" : "pending",
        visibility,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    db.insert(cbExternalActionProposals).values(row).run();
    return c.json({ data: row }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.put("/external-action-proposals/:id", async (c) => {
  try {
    const db = getDb();
    const id = c.req.param("id");
    const body = await c.req.json<UpdateExternalActionProposalRequest>();
    const existing = db
      .select()
      .from(cbExternalActionProposals)
      .where(eq(cbExternalActionProposals.id, id))
      .get();
    if (!existing) throw new Error("external action proposal not found");

    const timestamp = now();
    const actor = body.actor?.trim() || null;

    if (body.approvalStatus === "approved") {
      if (!actor) {
        throw new Error("actor is required to approve writeback proposals");
      }
      const approvalNote = body.note?.trim();
      if (!approvalNote) {
        throw new Error("approval note is required to approve writeback proposals");
      }
      if (existing.approvalStatus === "blocked" || existing.riskClass === "C") {
        throw new Error(
          "proposal is blocked by Writeback Governance v0 and cannot be approved"
        );
      }
      const auditTrail = appendAuditEvent(existing.auditTrail ?? [], {
        actor,
        event: "approved",
        note: approvalNote,
        metadata: {
          destinationType: existing.destinationType,
          destinationRef: existing.destinationRef,
          actionType: existing.actionType,
          payload: existing.payload,
          payloadHash: stablePayloadHash(existing.payload),
          idempotencyKey: existing.idempotencyKey,
          executionStatus: "not_started",
          externalId: existing.externalId,
          errorSummary: existing.errorSummary,
          rollbackRef: existing.rollbackRef,
        },
      });
      const update = {
        approvalStatus: "approved" as const,
        approvedBy: actor,
        approvedAt: timestamp,
        rejectionReason: null,
        executionStatus: "not_started" as const,
        errorSummary: null,
        auditTrail,
        updatedAt: timestamp,
      };
      db.update(cbExternalActionProposals)
        .set(update)
        .where(eq(cbExternalActionProposals.id, id))
        .run();
      return c.json({ data: { ...existing, ...update } });
    }

    if (body.approvalStatus === "rejected") {
      const rejectionReason = body.rejectionReason?.trim() || body.note?.trim() || null;
      if (!actor) {
        throw new Error("actor is required to reject writeback proposals");
      }
      if (!rejectionReason) {
        throw new Error("rejection reason is required to reject writeback proposals");
      }
      const auditTrail = appendAuditEvent(existing.auditTrail ?? [], {
        actor,
        event: "rejected",
        note: rejectionReason,
        metadata: {
          destinationType: existing.destinationType,
          destinationRef: existing.destinationRef,
          actionType: existing.actionType,
          payload: existing.payload,
          payloadHash: stablePayloadHash(existing.payload),
          idempotencyKey: existing.idempotencyKey,
          previousExecutionStatus: existing.executionStatus,
          externalId: existing.externalId,
          errorSummary: existing.errorSummary,
          rollbackRef: existing.rollbackRef,
        },
      });
      const update = {
        approvalStatus: "rejected" as const,
        approvedBy: null,
        approvedAt: null,
        rejectionReason,
        executionStatus: "cancelled" as const,
        auditTrail,
        updatedAt: timestamp,
      };
      db.update(cbExternalActionProposals)
        .set(update)
        .where(eq(cbExternalActionProposals.id, id))
        .run();
      return c.json({ data: { ...existing, ...update } });
    }

    throw new Error("approvalStatus must be approved or rejected");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "update_failed", message }, 400);
  }
});

app.post("/external-action-proposals/:id/github-comment/preview", async (c) => {
  try {
    const db = getDb();
    const id = c.req.param("id");
    const body = (await c.req
      .json<ExecuteExternalActionProposalRequest>()
      .catch(() => ({}))) as ExecuteExternalActionProposalRequest;
    const existing = db
      .select()
      .from(cbExternalActionProposals)
      .where(eq(cbExternalActionProposals.id, id))
      .get();
    if (!existing) throw new Error("external action proposal not found");

    const { target, marker, body: commentBody } = validateGitHubCommentWritebackProposal(
      existing
    );
    const actor = body.actor?.trim() || null;
    const auditTrail = appendAuditEvent(existing.auditTrail ?? [], {
      actor,
      event: "github_comment_previewed",
      note: "Dry-run generated the GitHub issue/PR comment body without calling GitHub.",
      metadata: {
        request: {
          proposalId: existing.id,
          destinationRef: existing.destinationRef,
          target,
          idempotencyKey: existing.idempotencyKey,
          payloadHash: stablePayloadHash(existing.payload),
          bodyLength: commentBody.length,
          bodyHash: stableHash(commentBody),
        },
        response: {
          dryRun: true,
          externalCall: false,
        },
      },
    });
    const update = {
      executionStatus: "dry_run" as const,
      errorSummary: null,
      auditTrail,
      updatedAt: now(),
    };
    db.update(cbExternalActionProposals)
      .set(update)
      .where(eq(cbExternalActionProposals.id, id))
      .run();

    const proposal = { ...existing, ...update };
    const result: GitHubCommentWritebackResponse = {
      proposal,
      target,
      body: commentBody,
      marker,
      idempotencyKey: proposal.idempotencyKey,
      dryRun: true,
      status: "dry_run",
      reusedExisting: false,
      externalId: proposal.externalId,
      externalUrl: proposal.externalUrl,
    };
    return c.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "preview_failed", message }, 400);
  }
});

app.post("/external-action-proposals/:id/github-label/preview", async (c) => {
  try {
    const db = getDb();
    const id = c.req.param("id");
    const body = (await c.req
      .json<ExecuteExternalActionProposalRequest>()
      .catch(() => ({}))) as ExecuteExternalActionProposalRequest;
    const existing = db
      .select()
      .from(cbExternalActionProposals)
      .where(eq(cbExternalActionProposals.id, id))
      .get();
    if (!existing) throw new Error("external action proposal not found");

    const preview = validateGitHubLabelProposalPreview(existing);
    const actor = body.actor?.trim() || null;
    const timestamp = now();
    const auditTrail = appendAuditEvent(existing.auditTrail ?? [], {
      actor,
      event: "github_label_previewed",
      note:
        "Dry-run generated the GitHub label plan without calling GitHub write APIs.",
      metadata: {
        request: {
          proposalId: existing.id,
          destinationRef: existing.destinationRef,
          target: preview.target,
          labels: preview.labels,
          mode: preview.mode,
          riskClass: existing.riskClass,
          actionPolicy: existing.actionPolicy,
          idempotencyKey: existing.idempotencyKey,
          payloadHash: stablePayloadHash(existing.payload),
        },
        response: {
          dryRun: true,
          previewOnly: preview.status === "preview_only",
          executionBlocked: preview.executionBlocked,
        },
      },
    });
    const update = {
      executionStatus:
        existing.executionStatus === "blocked"
          ? ("blocked" as const)
          : ("dry_run" as const),
      errorSummary: null,
      auditTrail,
      updatedAt: timestamp,
    };
    db.update(cbExternalActionProposals)
      .set(update)
      .where(eq(cbExternalActionProposals.id, id))
      .run();
    const proposal = { ...existing, ...update };
    const result: GitHubLabelProposalPreviewResponse = {
      proposal,
      ...preview,
      policySummary:
        preview.executionBlocked
          ? "GitHub label proposal preview is blocked from execution until Risk B, writeback_allowed, approval and Retry Safety gates pass."
          : "Dry-run GitHub label proposal. The v0 executor supports only allowlisted mode=add with current-label read before any write.",
    };
    return c.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "preview_failed", message }, 400);
  }
});

app.post("/external-action-proposals/:id/github-label/execute", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const body = (await c.req
    .json<ExecuteExternalActionProposalRequest>()
    .catch(() => ({}))) as ExecuteExternalActionProposalRequest;
  const actor = body.actor?.trim() || null;
  const existing = db
    .select()
    .from(cbExternalActionProposals)
    .where(eq(cbExternalActionProposals.id, id))
    .get();
  if (!existing) {
    return c.json(
      { error: "execution_failed", message: "external action proposal not found" },
      404
    );
  }

  try {
    if (["completed", "executed"].includes(existing.executionStatus)) {
      const preview = buildGitHubLabelProposalPreview(existing);
      const result: GitHubLabelWritebackResponse = {
        proposal: existing,
        ...preview,
        currentLabels: [],
        missingLabels: [],
        dryRun: false,
        status: "already_completed",
        executionBlocked: false,
        mutationAttempted: false,
        externalId: existing.externalId,
        externalUrl: existing.externalUrl,
        policySummary:
          "GitHub label proposal is already completed; no label writeback was attempted again.",
      };
      return c.json({ data: result });
    }

    const preview = validateGitHubLabelWritebackProposal(existing);
    const executionReview = assertWritebackExecutionReview({
      proposal: existing,
      retryRationale: body.retryRationale,
    });
    if (!actor) {
      throw new WritebackExecutionReviewError(
        "actor is required to execute GitHub label writeback",
        executionReview
      );
    }

    const currentLabelsBefore = await fetchGitHubIssueLabels(preview.target);
    const currentLabelSet = new Set(
      currentLabelsBefore.map(normalizedGitHubLabelName)
    );
    const missingLabels = preview.labels.filter(
      (label) => !currentLabelSet.has(normalizedGitHubLabelName(label))
    );
    const completedNoop = missingLabels.length === 0;
    let currentLabelsAfter = currentLabelsBefore;
    if (!completedNoop) {
      await assertGitHubRepoLabelsExist(preview.target, missingLabels);
      const labelsAfterWrite = await addGitHubIssueLabels(preview.target, missingLabels);
      currentLabelsAfter = labelsAfterWrite.map((label) => label.name);
    }

    const timestamp = now();
    const externalId = githubLabelExternalId(preview.target, preview.labels);
    const auditTrail = appendAuditEvent(existing.auditTrail ?? [], {
      actor,
      event: completedNoop ? "github_label_completed_noop" : "github_label_added",
      note: completedNoop
        ? "GitHub issue/PR already had the approved label; no write API call was made."
        : "Added the approved GitHub label to the issue/PR.",
      metadata: {
        request: {
          proposalId: existing.id,
          destinationRef: existing.destinationRef,
          target: preview.target,
          labels: preview.labels,
          mode: preview.mode,
          missingLabels,
          idempotencyKey: existing.idempotencyKey,
          executionReview,
          retryRationale: body.retryRationale?.trim() || null,
          payloadHash: stablePayloadHash(existing.payload),
        },
        response: {
          reusedExisting: completedNoop,
          completedNoop,
          mutationAttempted: !completedNoop,
          currentLabelsBefore,
          currentLabelsAfter,
          externalId,
          externalUrl: preview.target.url,
        },
      },
    });
    const update = {
      executionStatus: "completed" as const,
      externalId,
      externalUrl: preview.target.url,
      errorSummary: null,
      auditTrail,
      updatedAt: timestamp,
    };
    db.update(cbExternalActionProposals)
      .set(update)
      .where(eq(cbExternalActionProposals.id, id))
      .run();
    const proposal = { ...existing, ...update };
    const result: GitHubLabelWritebackResponse = {
      proposal,
      ...preview,
      currentLabels: currentLabelsAfter,
      missingLabels,
      dryRun: false,
      status: completedNoop ? "completed_noop" : "completed",
      executionBlocked: false,
      mutationAttempted: !completedNoop,
      externalId: proposal.externalId,
      externalUrl: proposal.externalUrl,
      policySummary: completedNoop
        ? "GitHub label already existed on the issue/PR; the executor completed idempotently without a write call."
        : "GitHub label add completed after approval, preview, allowlist, current-label read and Retry Safety gates.",
    };
    return c.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const retryRequired = err instanceof WritebackRetryApprovalRequiredError;
    const reviewBlocked = err instanceof WritebackExecutionReviewError;
    const executionReview = reviewBlocked
      ? err.review
      : buildWritebackExecutionReview(existing);
    const previewRequired =
      reviewBlocked && executionReview.status === "needs_preview";
    const governanceBlocked =
      retryRequired ||
      previewRequired ||
      reviewBlocked ||
      executionReview.status === "blocked" ||
      executionReview.status === "needs_reapproval";
    const auditTrail = appendAuditEvent(existing.auditTrail ?? [], {
      actor,
      event: retryRequired
        ? "github_label_retry_required"
        : previewRequired
          ? "github_label_preview_required"
          : governanceBlocked
            ? "github_label_execution_blocked"
            : "github_label_failed",
      note: message,
      metadata: {
        request: {
          proposalId: existing.id,
          destinationRef: existing.destinationRef,
          actionType: existing.actionType,
          riskClass: existing.riskClass,
          actionPolicy: existing.actionPolicy,
          approvalStatus: existing.approvalStatus,
          executionStatus: existing.executionStatus,
          idempotencyKey: existing.idempotencyKey,
          executionReview,
        },
        response: {
          error: message,
        },
      },
    });
    const update = {
      executionStatus:
        governanceBlocked ? existing.executionStatus : ("failed" as const),
      errorSummary: message,
      auditTrail,
      updatedAt: now(),
    };
    db.update(cbExternalActionProposals)
      .set(update)
      .where(eq(cbExternalActionProposals.id, id))
      .run();
    return c.json({ error: "execution_failed", message }, 400);
  }
});

app.post("/external-action-proposals/:id/github-status-check/preview", async (c) => {
  try {
    const db = getDb();
    const id = c.req.param("id");
    const body = (await c.req
      .json<ExecuteExternalActionProposalRequest>()
      .catch(() => ({}))) as ExecuteExternalActionProposalRequest;
    const existing = db
      .select()
      .from(cbExternalActionProposals)
      .where(eq(cbExternalActionProposals.id, id))
      .get();
    if (!existing) throw new Error("external action proposal not found");

    const preview = validateGitHubStatusCheckProposalPreview(existing);
    const actor = body.actor?.trim() || null;
    const timestamp = now();
    const auditTrail = appendAuditEvent(existing.auditTrail ?? [], {
      actor,
      event: "github_status_check_previewed",
      note:
        preview.executionBlocked
          ? "Preview-only generated the GitHub status/check plan without calling GitHub write APIs."
          : "Dry-run generated the GitHub commit status plan without calling GitHub write APIs.",
      metadata: {
        request: {
          proposalId: existing.id,
          destinationRef: existing.destinationRef,
          target: preview.target,
          actionType: existing.actionType,
          contextName: preview.contextName,
          state: preview.state,
          conclusion: preview.conclusion,
          title: preview.title,
          summary: preview.summary,
          description: preview.description,
          targetUrl: preview.targetUrl,
          rationale: preview.rationale,
          riskClass: existing.riskClass,
          actionPolicy: existing.actionPolicy,
          idempotencyKey: existing.idempotencyKey,
          payloadHash: preview.payloadHash,
          riskRationale: preview.riskRationale,
        },
        response: {
          dryRun: true,
          previewOnly: preview.status === "preview_only",
          executionBlocked: preview.executionBlocked,
        },
      },
    });
    const update = {
      executionStatus:
        existing.executionStatus === "blocked"
          ? ("blocked" as const)
          : ("dry_run" as const),
      errorSummary: null,
      auditTrail,
      updatedAt: timestamp,
    };
    db.update(cbExternalActionProposals)
      .set(update)
      .where(eq(cbExternalActionProposals.id, id))
      .run();
    const proposal = { ...existing, ...update };
    const result: GitHubStatusCheckProposalPreviewResponse = {
      proposal,
      ...preview,
      policySummary: preview.executionBlocked
        ? "Preview-only GitHub status/check proposal. Check-run writeback and non-allowlisted status writeback remain blocked."
        : "Dry-run GitHub commit status proposal. The v0 executor supports only allowlisted success status on explicit SHA with Retry Safety gates.",
    };
    return c.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "preview_failed", message }, 400);
  }
});

app.post("/external-action-proposals/:id/github-status-check/execute", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const body = (await c.req
    .json<ExecuteExternalActionProposalRequest>()
    .catch(() => ({}))) as ExecuteExternalActionProposalRequest;
  const actor = body.actor?.trim() || null;
  const existing = db
    .select()
    .from(cbExternalActionProposals)
    .where(eq(cbExternalActionProposals.id, id))
    .get();
  if (!existing) {
    return c.json(
      { error: "execution_failed", message: "external action proposal not found" },
      404
    );
  }

  try {
    if (["completed", "executed"].includes(existing.executionStatus)) {
      const preview = buildGitHubStatusCheckProposalPreview(existing);
      const result: GitHubStatusCheckWritebackResponse = {
        proposal: existing,
        ...preview,
        dryRun: false,
        status: "already_completed",
        executionBlocked: false,
        mutationAttempted: false,
        externalId: existing.externalId,
        externalUrl: existing.externalUrl,
        policySummary:
          "GitHub commit status proposal is already completed; no status writeback was attempted again.",
      };
      return c.json({ data: result });
    }

    const preview = validateGitHubStatusWritebackProposal(existing);
    const executionReview = assertWritebackExecutionReview({
      proposal: existing,
      retryRationale: body.retryRationale,
    });
    if (!actor) {
      throw new WritebackExecutionReviewError(
        "actor is required to execute GitHub status writeback",
        executionReview
      );
    }

    const repo = await assertGitHubStatusRepoPrivate(preview.target);
    const statuses = await fetchGitHubCommitStatuses(preview.target);
    const priorStatus = statuses.find((status) =>
      isCompatibleGitHubCommitStatus(status, preview)
    );
    const status = priorStatus ?? (await createGitHubCommitStatus(preview));
    const completedNoop = Boolean(priorStatus);
    const externalUrl = status.target_url ?? gitHubStatusExternalUrl(preview);
    const timestamp = now();
    const auditTrail = appendAuditEvent(existing.auditTrail ?? [], {
      actor,
      event: completedNoop ? "github_status_completed_noop" : "github_status_set",
      note: completedNoop
        ? "GitHub commit already had a compatible status; no write API call was made."
        : "Created the approved GitHub commit status.",
      metadata: {
        request: {
          proposalId: existing.id,
          destinationRef: existing.destinationRef,
          target: preview.target,
          contextName: preview.contextName,
          state: preview.state,
          description: preview.description,
          targetUrl: preview.targetUrl,
          idempotencyKey: existing.idempotencyKey,
          executionReview,
          retryRationale: body.retryRationale?.trim() || null,
          payloadHash: stablePayloadHash(existing.payload),
        },
        response: {
          reusedExisting: completedNoop,
          completedNoop,
          duplicateDetected: completedNoop,
          mutationAttempted: !completedNoop,
          allowlistMatched: true,
          existingStatusesRead: true,
          existingStatusesReadCount: statuses.length,
          statusId: String(status.id),
          statusUrl: status.url,
          externalUrl,
          creator: status.creator?.login ?? null,
          createdAt: status.created_at ?? null,
          updatedAt: status.updated_at ?? null,
          repoPrivate: repo.private,
        },
      },
    });
    const update = {
      executionStatus: "completed" as const,
      externalId: String(status.id),
      externalUrl,
      errorSummary: null,
      auditTrail,
      updatedAt: timestamp,
    };
    db.update(cbExternalActionProposals)
      .set(update)
      .where(eq(cbExternalActionProposals.id, id))
      .run();
    const proposal = { ...existing, ...update };
    const result: GitHubStatusCheckWritebackResponse = {
      proposal,
      ...preview,
      dryRun: false,
      status: completedNoop ? "completed_noop" : "completed",
      executionBlocked: false,
      mutationAttempted: !completedNoop,
      externalId: proposal.externalId,
      externalUrl: proposal.externalUrl,
      policySummary: completedNoop
        ? "GitHub commit status already existed on the approved SHA; the executor completed idempotently without a write call."
        : "GitHub commit status completed after approval, preview, private repo allowlist, explicit SHA and Retry Safety gates.",
    };
    return c.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const retryRequired = err instanceof WritebackRetryApprovalRequiredError;
    const reviewBlocked = err instanceof WritebackExecutionReviewError;
    const executionReview = reviewBlocked
      ? err.review
      : buildWritebackExecutionReview(existing);
    const previewRequired =
      reviewBlocked && executionReview.status === "needs_preview";
    const governanceBlocked =
      retryRequired ||
      previewRequired ||
      reviewBlocked ||
      executionReview.status === "blocked" ||
      executionReview.status === "needs_reapproval";
    const auditTrail = appendAuditEvent(existing.auditTrail ?? [], {
      actor,
      event: retryRequired
        ? "github_status_retry_required"
        : previewRequired
          ? "github_status_preview_required"
          : governanceBlocked
            ? "github_status_execution_blocked"
            : "github_status_failed",
      note: message,
      metadata: {
        request: {
          proposalId: existing.id,
          destinationRef: existing.destinationRef,
          actionType: existing.actionType,
          riskClass: existing.riskClass,
          actionPolicy: existing.actionPolicy,
          approvalStatus: existing.approvalStatus,
          executionStatus: existing.executionStatus,
          idempotencyKey: existing.idempotencyKey,
          executionReview,
        },
        response: {
          error: message,
        },
      },
    });
    const update = {
      executionStatus:
        governanceBlocked ? existing.executionStatus : ("failed" as const),
      errorSummary: message,
      auditTrail,
      updatedAt: now(),
    };
    db.update(cbExternalActionProposals)
      .set(update)
      .where(eq(cbExternalActionProposals.id, id))
      .run();
    return c.json({ error: "execution_failed", message }, 400);
  }
});

app.post("/external-action-proposals/:id/github-comment/execute", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const body = (await c.req
    .json<ExecuteExternalActionProposalRequest>()
    .catch(() => ({}))) as ExecuteExternalActionProposalRequest;
  const actor = body.actor?.trim() || null;
  const existing = db
    .select()
    .from(cbExternalActionProposals)
    .where(eq(cbExternalActionProposals.id, id))
    .get();
  if (!existing) {
    return c.json(
      { error: "execution_failed", message: "external action proposal not found" },
      404
    );
  }

  try {
    if (
      ["completed", "executed"].includes(existing.executionStatus)
    ) {
      const { target, marker, body: commentBody } =
        buildGitHubCommentWritebackPreview(existing);
      const result: GitHubCommentWritebackResponse = {
        proposal: existing,
        target,
        body: commentBody,
        marker,
        idempotencyKey: existing.idempotencyKey,
        dryRun: false,
        status: "already_completed",
        reusedExisting: true,
        externalId: existing.externalId,
        externalUrl: existing.externalUrl,
      };
      return c.json({ data: result });
    }

    const { target, marker, body: commentBody } =
      validateGitHubCommentWritebackProposal(existing);
    const executionReview = assertWritebackExecutionReview({
      proposal: existing,
      retryRationale: body.retryRationale,
    });
    const comments = await fetchGitHubIssueComments(target);
    const priorComment = comments.find((comment) => comment.body?.includes(marker));
    const comment =
      priorComment ??
      (await githubApiRequest<GitHubIssueCommentPayload>(
        `/repos/${target.owner}/${target.repo}/issues/${target.number}/comments`,
        {
          method: "POST",
          requireToken: true,
          body: { body: commentBody },
        }
      ));
    const timestamp = now();
    const auditTrail = appendAuditEvent(existing.auditTrail ?? [], {
      actor,
      event: priorComment ? "github_comment_reused" : "github_comment_posted",
      note: priorComment
        ? "Found an existing GitHub comment with the proposal idempotency marker; no duplicate was posted."
        : "Posted approved GitHub issue/PR comment.",
      metadata: {
        request: {
          proposalId: existing.id,
          destinationRef: existing.destinationRef,
          target,
          idempotencyKey: existing.idempotencyKey,
          executionReview,
          retryRationale: body.retryRationale?.trim() || null,
          bodyLength: commentBody.length,
          bodyHash: stableHash(commentBody),
        },
        response: {
          reusedExisting: Boolean(priorComment),
          commentId: String(comment.id),
          commentUrl: comment.html_url,
          user: comment.user?.login ?? null,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
        },
      },
    });
    const update = {
      executionStatus: "completed" as const,
      externalId: String(comment.id),
      externalUrl: comment.html_url,
      errorSummary: null,
      auditTrail,
      updatedAt: timestamp,
    };
    db.update(cbExternalActionProposals)
      .set(update)
      .where(eq(cbExternalActionProposals.id, id))
      .run();
    const proposal = { ...existing, ...update };
    const result: GitHubCommentWritebackResponse = {
      proposal,
      target,
      body: commentBody,
      marker,
      idempotencyKey: proposal.idempotencyKey,
      dryRun: false,
      status: "completed",
      reusedExisting: Boolean(priorComment),
      externalId: proposal.externalId,
      externalUrl: proposal.externalUrl,
    };
    return c.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const retryRequired = err instanceof WritebackRetryApprovalRequiredError;
    const reviewBlocked = err instanceof WritebackExecutionReviewError;
    const executionReview = reviewBlocked
      ? err.review
      : buildWritebackExecutionReview(existing);
    const previewRequired =
      reviewBlocked && executionReview.status === "needs_preview";
    const governanceBlocked =
      retryRequired ||
      previewRequired ||
      reviewBlocked ||
      executionReview.status === "blocked" ||
      executionReview.status === "needs_reapproval";
    const auditTrail = appendAuditEvent(existing.auditTrail ?? [], {
      actor,
      event: retryRequired
        ? "github_comment_retry_required"
        : previewRequired
          ? "github_comment_preview_required"
          : governanceBlocked
            ? "github_comment_execution_blocked"
            : "github_comment_failed",
      note: message,
      metadata: {
        request: {
          proposalId: existing.id,
          destinationRef: existing.destinationRef,
          actionType: existing.actionType,
          riskClass: existing.riskClass,
          actionPolicy: existing.actionPolicy,
          approvalStatus: existing.approvalStatus,
          executionStatus: existing.executionStatus,
          idempotencyKey: existing.idempotencyKey,
          executionReview,
        },
        response: {
          error: message,
        },
      },
    });
    const update = {
      executionStatus:
        governanceBlocked ? existing.executionStatus : ("failed" as const),
      errorSummary: message,
      auditTrail,
      updatedAt: now(),
    };
    db.update(cbExternalActionProposals)
      .set(update)
      .where(eq(cbExternalActionProposals.id, id))
      .run();
    return c.json({ error: "execution_failed", message }, 400);
  }
});

app.post("/external-action-proposals/:id/slack-thread-reply/preview", async (c) => {
  try {
    const db = getDb();
    const id = c.req.param("id");
    const body = (await c.req
      .json<ExecuteExternalActionProposalRequest>()
      .catch(() => ({}))) as ExecuteExternalActionProposalRequest;
    const existing = db
      .select()
      .from(cbExternalActionProposals)
      .where(eq(cbExternalActionProposals.id, id))
      .get();
    if (!existing) throw new Error("external action proposal not found");

    const { target, marker, body: replyBody } =
      validateSlackThreadReplyWritebackProposal(existing);
    const actor = body.actor?.trim() || null;
    const auditTrail = appendAuditEvent(existing.auditTrail ?? [], {
      actor,
      event: "slack_thread_reply_previewed",
      note:
        "Dry-run generated the Slack thread reply body without calling Slack write APIs.",
      metadata: {
        request: {
          proposalId: existing.id,
          destinationRef: existing.destinationRef,
          target,
          idempotencyKey: existing.idempotencyKey,
          payloadHash: stablePayloadHash(existing.payload),
          bodyLength: replyBody.length,
          bodyHash: stableHash(replyBody),
        },
        response: {
          dryRun: true,
          externalCall: false,
        },
      },
    });
    const update = {
      executionStatus: "dry_run" as const,
      errorSummary: null,
      auditTrail,
      updatedAt: now(),
    };
    db.update(cbExternalActionProposals)
      .set(update)
      .where(eq(cbExternalActionProposals.id, id))
      .run();

    const proposal = { ...existing, ...update };
    const result: SlackThreadReplyWritebackResponse = {
      proposal,
      target,
      body: replyBody,
      marker,
      idempotencyKey: proposal.idempotencyKey,
      dryRun: true,
      status: "dry_run",
      reusedExisting: false,
      externalId: proposal.externalId,
      externalUrl: proposal.externalUrl,
    };
    return c.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "preview_failed", message }, 400);
  }
});

app.post("/external-action-proposals/:id/slack-thread-reply/execute", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const body = (await c.req
    .json<ExecuteExternalActionProposalRequest>()
    .catch(() => ({}))) as ExecuteExternalActionProposalRequest;
  const actor = body.actor?.trim() || null;
  const existing = db
    .select()
    .from(cbExternalActionProposals)
    .where(eq(cbExternalActionProposals.id, id))
    .get();
  if (!existing) {
    return c.json(
      { error: "execution_failed", message: "external action proposal not found" },
      404
    );
  }

  try {
    if (
      ["completed", "executed"].includes(existing.executionStatus)
    ) {
      const { target, marker, body: replyBody } =
        buildSlackThreadReplyWritebackPreview(existing);
      const result: SlackThreadReplyWritebackResponse = {
        proposal: existing,
        target,
        body: replyBody,
        marker,
        idempotencyKey: existing.idempotencyKey,
        dryRun: false,
        status: "already_completed",
        reusedExisting: true,
        externalId: existing.externalId,
        externalUrl: existing.externalUrl,
      };
      return c.json({ data: result });
    }

    const { target, marker, body: replyBody } =
      validateSlackThreadReplyWritebackProposal(existing);
    const executionReview = assertWritebackExecutionReview({
      proposal: existing,
      retryRationale: body.retryRationale,
    });
    const token = slackBotTokenForWriteback();
    const replies = await fetchSlackThreadReplies(token, target);
    assertExistingSlackThread(replies, target);
    const priorReply = replies.find(
      (message) =>
        message.ts &&
        message.ts !== target.threadTs &&
        typeof message.text === "string" &&
        message.text.includes(marker)
    );
    const posted = priorReply
      ? null
      : await slackApiPost<SlackChatPostMessageResponse>(token, "chat.postMessage", {
          channel: target.channelId,
          thread_ts: target.threadTs,
          text: replyBody,
          unfurl_links: false,
          unfurl_media: false,
        });
    const channelId = priorReply?.thread_ts
      ? target.channelId
      : posted?.channel ?? target.channelId;
    const replyTs = priorReply?.ts ?? posted?.ts;
    if (!replyTs) {
      throw new Error("Slack thread reply did not return a message timestamp");
    }
    const permalink = await fetchSlackPermalink(token, channelId, replyTs);
    const externalUrl = permalink ?? `slack://${channelId}/${replyTs}`;
    const timestamp = now();
    const auditTrail = appendAuditEvent(existing.auditTrail ?? [], {
      actor,
      event: priorReply ? "slack_thread_reply_reused" : "slack_thread_reply_posted",
      note: priorReply
        ? "Found an existing Slack thread reply with the proposal idempotency marker; no duplicate was posted."
        : "Posted approved Slack reply in an existing thread.",
      metadata: {
        request: {
          proposalId: existing.id,
          destinationRef: existing.destinationRef,
          target,
          idempotencyKey: existing.idempotencyKey,
          executionReview,
          retryRationale: body.retryRationale?.trim() || null,
          bodyLength: replyBody.length,
          bodyHash: stableHash(replyBody),
        },
        response: {
          reusedExisting: Boolean(priorReply),
          channelId,
          ts: replyTs,
          externalUrl,
        },
      },
    });
    const update = {
      executionStatus: "completed" as const,
      externalId: `${channelId}:${replyTs}`,
      externalUrl,
      errorSummary: null,
      auditTrail,
      updatedAt: timestamp,
    };
    db.update(cbExternalActionProposals)
      .set(update)
      .where(eq(cbExternalActionProposals.id, id))
      .run();
    const proposal = { ...existing, ...update };
    const result: SlackThreadReplyWritebackResponse = {
      proposal,
      target,
      body: replyBody,
      marker,
      idempotencyKey: proposal.idempotencyKey,
      dryRun: false,
      status: "completed",
      reusedExisting: Boolean(priorReply),
      externalId: proposal.externalId,
      externalUrl: proposal.externalUrl,
    };
    return c.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const retryRequired = err instanceof WritebackRetryApprovalRequiredError;
    const reviewBlocked = err instanceof WritebackExecutionReviewError;
    const executionReview = reviewBlocked
      ? err.review
      : buildWritebackExecutionReview(existing);
    const previewRequired =
      reviewBlocked && executionReview.status === "needs_preview";
    const governanceBlocked =
      retryRequired ||
      previewRequired ||
      reviewBlocked ||
      executionReview.status === "blocked" ||
      executionReview.status === "needs_reapproval";
    const auditTrail = appendAuditEvent(existing.auditTrail ?? [], {
      actor,
      event: retryRequired
        ? "slack_thread_reply_retry_required"
        : previewRequired
          ? "slack_thread_reply_preview_required"
          : governanceBlocked
            ? "slack_thread_reply_execution_blocked"
            : "slack_thread_reply_failed",
      note: message,
      metadata: {
        request: {
          proposalId: existing.id,
          destinationRef: existing.destinationRef,
          actionType: existing.actionType,
          riskClass: existing.riskClass,
          actionPolicy: existing.actionPolicy,
          approvalStatus: existing.approvalStatus,
          executionStatus: existing.executionStatus,
          idempotencyKey: existing.idempotencyKey,
          executionReview,
        },
        response: {
          error: message,
        },
      },
    });
    const update = {
      executionStatus:
        governanceBlocked ? existing.executionStatus : ("failed" as const),
      errorSummary: message,
      auditTrail,
      updatedAt: now(),
    };
    db.update(cbExternalActionProposals)
      .set(update)
      .where(eq(cbExternalActionProposals.id, id))
      .run();
    return c.json({ error: "execution_failed", message }, 400);
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

app.post("/agent-contexts/daily-handoff", async (c) => {
  try {
    const body = (await c.req
      .json<GenerateDailyAgentHandoffRequest>()
      .catch(() => ({}))) as GenerateDailyAgentHandoffRequest;
    const db = getDb();
    const timestamp = now();
    const data = listAll();
    const briefing = buildLastBriefing(data);
    const gateClosureRitual = buildGateClosureRitual(data);
    const operatingCadence = buildOperatingCadence(data);
    const sourceHealthReport = buildSourceHealthReport(data);
    const guidanceItems = data.guidanceItems.filter((item) =>
      ["new", "open"].includes(item.status)
    );
    const decisions = data.decisions.filter((decision) => decision.status === "proposed");
    const targetAgent = body.targetAgent?.trim() || "codex";
    const title =
      body.title ??
      `Daily Agent Handoff ${new Date(timestamp).toISOString().slice(0, 10)}`;

    const sourceArtifactIds = briefing?.artifactId ? [briefing.artifactId] : [];
    const guidanceItemIds = guidanceItems.slice(0, 8).map((item) => item.id);
    const workItemIds = uniqueStrings(
      gateClosureRitual.items
        .map((item) => item.workItemId)
        .filter((id): id is string => !!id)
    ).slice(0, 8);
    const priorityIds = uniqueStrings(
      gateClosureRitual.items
        .map((item) => item.priorityId)
        .filter((id): id is string => !!id)
    ).slice(0, 8);
    const goalIds = uniqueStrings(
      gateClosureRitual.items
        .map((item) => item.goalId)
        .filter((id): id is string => !!id)
    ).slice(0, 8);
    const decisionIds = decisions.slice(0, 6).map((decision) => decision.id);
    const sourceKnowledgeIds = [
      ...sourceArtifactIds.map((id) => `artifact:${id}`),
      ...guidanceItemIds.map((id) => `guidance:${id}`),
      ...workItemIds.map((id) => `work_item:${id}`),
      ...priorityIds.map((id) => `priority:${id}`),
      ...goalIds.map((id) => `goal:${id}`),
      ...decisionIds.map((id) => `decision:${id}`),
      "summary:operating_cadence",
      "summary:gate_closure_ritual",
      "summary:source_health",
    ];
    const content = buildDailyAgentHandoffContent({
      title,
      targetAgent,
      generatedAt: timestamp,
      briefing,
      gateClosureRitual,
      operatingCadence,
      sourceHealthReport,
      guidanceItems,
      decisions,
    });

    const row = {
      id: nanoid(12),
      title,
      targetAgent,
      contextType: "briefing" as const,
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
        rawRef: briefing?.rawRef ?? "aios://company-brain/daily-handoff",
        artifactId: briefing?.artifactId,
        createdFrom: "company_brain:daily_agent_handoff",
        confidence: 0.9,
        extractedAt: timestamp,
        humanReviewStatus: "needs_review" as const,
        visibility: body.visibility ?? "internal",
        notes:
          "derived_from=briefing,gate_closure,operating_cadence,source_health,open_guidance",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.insert(cbAgentContexts).values(row).run();
    const response: GenerateDailyAgentHandoffResponse = {
      agentContext: row,
      briefing,
      gateClosureRitual,
      operatingCadence,
      sourceHealthReport,
      openGuidanceCount: guidanceItems.length,
    };
    return c.json({ data: response }, 201);
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
    const triggerContext = normalizeTriggerContext({
      watcherId: watcher.id,
      triggerSource: body.triggerSource,
      scheduleId: body.scheduleId,
      scheduledAt: body.scheduledAt,
    });
    if (watcher.id === AIOS_BRIEFING_WATCHER_ID) {
      const data = runAiosBriefingWatcher({
        watcher,
        startedAt,
        runId,
        triggerSource: triggerContext.triggerSource,
        scheduleId: triggerContext.scheduleId,
        scheduledAt: triggerContext.scheduledAt,
      });
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
      `${triggerContext.triggerSource === "schedule" ? "Scheduled" : "Manual"} watcher run for ${watcher.title}. Policy: ${watcher.actionPolicy}.`;
    const artifactId = nanoid(12);
    const runTriggerRef = scheduleTriggerRef(triggerContext, runId) ?? rawRef;
    const provenance = {
      sourceId,
      rawRef,
      createdFrom:
        triggerContext.triggerSource === "schedule"
          ? `watcher:${watcher.id}:scheduled`
          : `watcher:${watcher.id}`,
      confidence: 1,
      extractedAt: startedAt,
      humanReviewStatus: "approved" as const,
      visibility: watcher.visibility,
      notes: `action_policy=${watcher.actionPolicy}; risk_class=${watcher.riskClass}; ${triggerNotes(triggerContext)}`,
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
        triggerSource: triggerContext.triggerSource,
        scheduleId: triggerContext.scheduleId,
        scheduledAt: triggerContext.scheduledAt,
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
      triggerRef: runTriggerRef,
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
        rawRef: runTriggerRef,
        createdFrom:
          triggerContext.triggerSource === "schedule"
            ? `watcher:${watcher.id}:scheduled_run`
            : `watcher:${watcher.id}:run`,
      },
      createdAt: startedAt,
      updatedAt: finishedAt,
    };
    db.insert(cbWatcherRuns).values(run).run();
    db.update(cbWatchers)
      .set({
        lastRunAt: finishedAt,
        nextRunAt:
          triggerContext.triggerSource === "schedule"
            ? nextCadenceRunAt(watcher, finishedAt)
            : watcher.nextRunAt,
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
