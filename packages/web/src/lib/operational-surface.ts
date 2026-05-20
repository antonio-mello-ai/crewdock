const PUBLIC_HOSTS = new Set(["crewdock.ai", "www.crewdock.ai"]);

const OPERATIONAL_PREFIXES = [
  "/company-brain",
  "/runtime",
  "/console",
  "/terminal",
  "/jobs",
  "/schedules",
  "/costs",
  "/inbox",
  "/agents",
  "/settings",
];

export function isPublicAiosHost(hostname: string) {
  return PUBLIC_HOSTS.has(hostname) || hostname.endsWith(".crewdock.pages.dev");
}

export function isOperationalPath(pathname: string) {
  return OPERATIONAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function protectedOperationalUrl(pathname: string, search = "") {
  return `https://ai.felhen.ai${pathname}${search}`;
}
