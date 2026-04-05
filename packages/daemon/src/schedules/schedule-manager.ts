import { execFileSync } from "node:child_process";

export interface ScheduleInfo {
  name: string;           // e.g. "data-quality-check.timer"
  service: string;        // e.g. "data-quality-check.service"
  description: string;
  enabled: boolean;
  active: boolean;        // is timer currently running
  nextRun: number | null; // Unix ms
  lastRun: number | null; // Unix ms
  onCalendar: string | null;
  execStart: string | null;
}

interface SystemctlTimer {
  unit: string;
  activates: string;
  next: number | null;
  last: number | null;
}

function run(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    });
  } catch (err: unknown) {
    const e = err as { stdout?: string };
    return e.stdout ?? "";
  }
}

function microsToMs(us: number | null): number | null {
  if (us === null || us === 0) return null;
  return Math.floor(us / 1000);
}

/**
 * Reads a systemd unit file content (service or timer) via systemctl cat.
 */
function readUnitFile(unit: string): string {
  return run("systemctl", ["cat", unit]);
}

function extractField(unitText: string, key: string): string | null {
  const re = new RegExp(`^${key}=(.*)$`, "m");
  const match = unitText.match(re);
  return match ? match[1].trim() : null;
}

/**
 * A timer is considered "AIOS-owned" if its service:
 * - Runs as User=claude, OR
 * - Has ExecStart starting with /home/claude/
 * Otherwise it's a system timer (apt, logrotate, etc) and hidden from the UI.
 */
function isAiosTimer(serviceText: string): boolean {
  const user = extractField(serviceText, "User");
  const execStart = extractField(serviceText, "ExecStart");
  if (user === "claude") return true;
  if (execStart?.startsWith("/home/claude/")) return true;
  return false;
}

export function listSchedules(): ScheduleInfo[] {
  const rawJson = run("systemctl", [
    "list-timers",
    "--all",
    "--output=json",
    "--no-pager",
  ]);

  let timers: SystemctlTimer[] = [];
  try {
    timers = JSON.parse(rawJson);
  } catch {
    return [];
  }

  const schedules: ScheduleInfo[] = [];
  for (const t of timers) {
    if (!t.activates) continue;
    const serviceText = readUnitFile(t.activates);
    if (!serviceText || !isAiosTimer(serviceText)) continue;

    const timerText = readUnitFile(t.unit);
    const execStart = extractField(serviceText, "ExecStart");
    const description =
      extractField(serviceText, "Description") ??
      extractField(timerText, "Description") ??
      t.activates;
    const onCalendar = extractField(timerText, "OnCalendar");

    // is-enabled returns "enabled" / "disabled" / "static"
    const enabledOutput = run("systemctl", ["is-enabled", t.unit]).trim();
    const enabled = enabledOutput === "enabled";

    // is-active returns "active" if currently triggered
    const activeOutput = run("systemctl", ["is-active", t.unit]).trim();
    const active = activeOutput === "active";

    schedules.push({
      name: t.unit,
      service: t.activates,
      description,
      enabled,
      active,
      nextRun: microsToMs(t.next),
      lastRun: microsToMs(t.last),
      onCalendar,
      execStart,
    });
  }

  // Sort: enabled first, then by nextRun ascending
  schedules.sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    const an = a.nextRun ?? Infinity;
    const bn = b.nextRun ?? Infinity;
    return an - bn;
  });

  return schedules;
}

export function runSchedule(unitName: string): void {
  // Validate unit name to prevent injection
  if (!/^[a-zA-Z0-9@_.\-]+\.(timer|service)$/.test(unitName)) {
    throw new Error("Invalid unit name");
  }
  // Start the service (not the timer) manually. --no-block returns immediately
  // instead of waiting for oneshot services to complete (which can take hours).
  const service = unitName.endsWith(".timer")
    ? unitName.replace(/\.timer$/, ".service")
    : unitName;
  run("sudo", ["systemctl", "start", "--no-block", service]);
}

export function setScheduleEnabled(unitName: string, enabled: boolean): void {
  if (!/^[a-zA-Z0-9@_.\-]+\.timer$/.test(unitName)) {
    throw new Error("Invalid timer name");
  }
  const action = enabled ? "enable" : "disable";
  run("sudo", ["systemctl", action, "--now", unitName]);
}
