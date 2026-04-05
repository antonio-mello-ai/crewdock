import { execFileSync, execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

export interface CreateScheduleInput {
  name: string;         // Base name without .timer/.service suffix (e.g. "my-backup")
  description: string;  // Human-readable description
  command: string;      // Full ExecStart command (must start with /home/claude/)
  onCalendar: string;   // systemd OnCalendar expression (e.g. "daily", "*-*-* 03:00:00")
}

const SYSTEMD_DIR = "/etc/systemd/system";

/**
 * Validates that a name is a safe systemd unit basename.
 * Allows: lowercase letters, digits, hyphen, underscore. Must start with letter.
 */
function validateName(name: string): void {
  if (!/^[a-z][a-z0-9_-]{1,62}$/.test(name)) {
    throw new Error(
      "Invalid name: use 2-63 chars, lowercase letters, digits, hyphen, underscore, must start with letter"
    );
  }
}

/**
 * Validates that a command is safe to put in ExecStart.
 * Must start with /home/claude/ or /usr/bin/ or /bin/ (absolute path only).
 * No shell metacharacters that would allow injection beyond the script itself.
 */
function validateCommand(command: string): void {
  if (!command.trim()) {
    throw new Error("Command cannot be empty");
  }
  const parts = command.trim().split(/\s+/);
  const executable = parts[0] ?? "";
  if (
    !executable.startsWith("/home/claude/") &&
    !executable.startsWith("/usr/bin/") &&
    !executable.startsWith("/bin/") &&
    !executable.startsWith("/usr/local/bin/")
  ) {
    throw new Error(
      "Command must start with an absolute path in /home/claude/, /usr/bin/, /bin/, or /usr/local/bin/"
    );
  }
  // Disallow dangerous shell metacharacters in the entire command. Arguments
  // with spaces can still be passed via shell-quoted form in ExecStart.
  if (/[;&|`$<>]/.test(command)) {
    throw new Error(
      "Command contains disallowed shell metacharacters (; & | ` $ < >)"
    );
  }
}

/**
 * Validates a systemd OnCalendar expression with a permissive regex.
 * Not exhaustive but catches obvious injection attempts.
 */
function validateOnCalendar(expr: string): void {
  if (!expr.trim()) throw new Error("OnCalendar cannot be empty");
  // Allow common shortcuts (minutely, hourly, daily, weekly, monthly, yearly)
  // or calendar-style expressions with digits, *, :, -, space, comma, slash
  if (!/^[a-z]+$/.test(expr) && !/^[\d*\s:\-,/]+$/.test(expr)) {
    throw new Error("Invalid OnCalendar expression");
  }
}

/**
 * Write content to /etc/systemd/system/<filename> via sudo tee.
 * Uses a temp file to avoid shell-quoting issues with the content.
 */
function writeSystemdFile(filename: string, content: string): void {
  const tmpFile = join(tmpdir(), `aios-${Date.now()}-${filename}`);
  writeFileSync(tmpFile, content, "utf-8");
  try {
    execSync(`sudo install -m 644 -o root -g root "${tmpFile}" "${SYSTEMD_DIR}/${filename}"`, {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    });
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      // ignore cleanup errors
    }
  }
}

function removeSystemdFile(filename: string): void {
  if (!/^[a-zA-Z0-9@_.\-]+\.(timer|service)$/.test(filename)) {
    throw new Error("Invalid filename");
  }
  try {
    execSync(`sudo rm -f "${SYSTEMD_DIR}/${filename}"`, {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5_000,
    });
  } catch {
    // File may not exist — ignore
  }
}

export function createSchedule(input: CreateScheduleInput): ScheduleInfo {
  validateName(input.name);
  validateCommand(input.command);
  validateOnCalendar(input.onCalendar);
  if (input.description.length > 200) {
    throw new Error("Description too long (max 200 chars)");
  }
  // Reject characters that would break the unit file syntax
  if (/[\r\n]/.test(input.description)) {
    throw new Error("Description cannot contain newlines");
  }

  const serviceName = `${input.name}.service`;
  const timerName = `${input.name}.timer`;

  const serviceContent = `[Unit]
Description=${input.description}

[Service]
Type=oneshot
User=claude
WorkingDirectory=/home/claude
ExecStart=${input.command}
TimeoutSec=3600
Environment=HOME=/home/claude
`;

  const timerContent = `[Unit]
Description=Timer for ${input.description}

[Timer]
OnCalendar=${input.onCalendar}
Persistent=true

[Install]
WantedBy=timers.target
`;

  writeSystemdFile(serviceName, serviceContent);
  writeSystemdFile(timerName, timerContent);

  // Reload systemd and enable the timer
  run("sudo", ["systemctl", "daemon-reload"]);
  run("sudo", ["systemctl", "enable", "--now", timerName]);

  // Return the freshly created schedule
  const all = listSchedules();
  const found = all.find((s) => s.name === timerName);
  if (!found) throw new Error("Schedule created but not found in list");
  return found;
}

export function deleteSchedule(unitName: string): void {
  if (!/^[a-zA-Z0-9@_.\-]+\.timer$/.test(unitName)) {
    throw new Error("Invalid timer name");
  }
  const serviceName = unitName.replace(/\.timer$/, ".service");

  // Safety: only allow deleting AIOS-owned timers. Read the service file first.
  const serviceText = readUnitFile(serviceName);
  if (serviceText && !isAiosTimer(serviceText)) {
    throw new Error("Cannot delete non-AIOS timers (protected)");
  }

  // Stop and disable the timer
  run("sudo", ["systemctl", "disable", "--now", unitName]);
  run("sudo", ["systemctl", "stop", serviceName]);

  // Remove the files
  removeSystemdFile(unitName);
  removeSystemdFile(serviceName);

  // Reload systemd
  run("sudo", ["systemctl", "daemon-reload"]);
  run("sudo", ["systemctl", "reset-failed"]);
}

export function getScheduleLogs(unitName: string, lines = 200): string[] {
  if (!/^[a-zA-Z0-9@_.\-]+\.(timer|service)$/.test(unitName)) {
    throw new Error("Invalid unit name");
  }
  // Fetch logs for the service (not the timer — timer has no interesting output)
  const serviceName = unitName.endsWith(".timer")
    ? unitName.replace(/\.timer$/, ".service")
    : unitName;

  // Safety: only allow reading logs of AIOS-owned timers
  const serviceText = readUnitFile(serviceName);
  if (serviceText && !isAiosTimer(serviceText)) {
    throw new Error("Cannot read logs of non-AIOS units");
  }

  const out = run("journalctl", [
    "-u",
    serviceName,
    "-n",
    String(lines),
    "--no-pager",
    "--output=short-iso",
  ]);
  return out.split("\n").filter((l) => l.length > 0);
}
