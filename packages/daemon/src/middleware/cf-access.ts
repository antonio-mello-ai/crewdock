/**
 * Cloudflare Access JWT validation middleware.
 *
 * Architecture:
 * - api.crewdock.ai sits behind CF Access (self-hosted app).
 * - CF edge validates user/service-token auth, then injects
 *   `Cf-Access-Jwt-Assertion` header (JWT signed by team JWK) in every
 *   request forwarded through the Tunnel to this daemon.
 * - This middleware verifies signature, issuer, audience, algorithm and
 *   expiration (with small clock tolerance) using `jose.createRemoteJWKSet`,
 *   which transparently refreshes keys on `kid` miss.
 *
 * Bypass rules (intentional, documented):
 * - OPTIONS preflight — browsers don't carry credentials on preflight.
 * - `/api/health` — public probe, but reveals minimal info (see health.ts).
 * - Loopback (`127.0.0.1`, `::1`, `localhost`) — local debug on the CT.
 * - `AIOS_AUTH_DISABLED=true` — dev escape hatch; refuses to start in
 *   production (see config.ts validation at boot).
 * - `CF_ACCESS_SOFT_MODE=true` — logs rejections but allows through; used
 *   only during the first 24h after rollout to catch misconfig without
 *   taking the site down. Remove after validation.
 */

import type { Context, MiddlewareHandler } from "hono";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

import { config } from "../config.js";

interface CfAccessPayload extends JWTPayload {
  email?: string;
  identity_nonce?: string;
  common_name?: string; // present on service token auth
  type?: string;
}

interface CfAccessIdentity {
  email?: string;
  serviceToken?: string;
  sub?: string;
}

// Export for use in route handlers (e.g. health.ts for conditional detail)
export function getCfAccessIdentity(c: Context): CfAccessIdentity | null {
  return (c.get("cf_access") as CfAccessIdentity | undefined) ?? null;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) {
    const url = new URL(
      `https://${config.cfAccess.teamDomain}/cdn-cgi/access/certs`
    );
    jwks = createRemoteJWKSet(url, {
      cacheMaxAge: 60 * 60 * 1000, // 1h
      cooldownDuration: 30 * 1000, // min 30s between refreshes on kid miss
    });
  }
  return jwks;
}

function isLoopback(c: Context): boolean {
  // Hono doesn't expose remote address directly. `@hono/node-server` sets it
  // on `c.env.incoming.socket.remoteAddress` in the node adapter. We read
  // defensively because in non-node contexts the shape is different.
  const incoming = (c.env as any)?.incoming;
  const remote: string | undefined =
    incoming?.socket?.remoteAddress ?? incoming?.connection?.remoteAddress;
  if (!remote) return false;
  const isLocal =
    remote === "127.0.0.1" ||
    remote === "::1" ||
    remote === "::ffff:127.0.0.1" ||
    remote.startsWith("127.");
  if (!isLocal) return false;
  // IMPORTANT: cloudflared runs on the same host as the daemon, so every
  // tunneled request arrives from 127.0.0.1 too. Distinguish real local
  // debug (curl from inside the CT) from tunneled traffic by checking for
  // any Cloudflare-injected header. If any CF header is present, this is
  // NOT a loopback debug call — it's proxied from CF and must be
  // authenticated.
  const cfHeaders = [
    "cf-ray",
    "cf-connecting-ip",
    "cf-ipcountry",
    "cf-visitor",
    "cf-access-jwt-assertion",
    "cf-access-authenticated-user-email",
  ];
  for (const h of cfHeaders) {
    if (c.req.header(h)) return false;
  }
  return true;
}

function extractJwt(c: Context): string | null {
  const header = c.req.header("cf-access-jwt-assertion");
  if (header) return header;
  // Fallback: cookie (some upgrade paths forward cookie instead of header).
  // CF Access sets CF_Authorization cookie on the app hostname.
  const cookie = c.req.header("cookie");
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

async function verifyToken(token: string): Promise<CfAccessPayload> {
  const { payload } = await jwtVerify<CfAccessPayload>(token, getJwks(), {
    issuer: `https://${config.cfAccess.teamDomain}`,
    audience: config.cfAccess.audience,
    algorithms: ["RS256"],
    clockTolerance: "30s",
  });
  return payload;
}

export const cfAccessMiddleware: MiddlewareHandler = async (c, next) => {
  // 1. Hard kill switch — dev only; config.ts refuses this in production
  if (config.cfAccess.disabled) {
    c.set("cf_access", { email: "dev@localhost", sub: "dev" });
    return next();
  }

  // 2. OPTIONS preflight — must always pass for CORS to work
  if (c.req.method === "OPTIONS") return next();

  // 3. Public probe — /api/health stays reachable so monitoring works;
  //    the route itself decides what detail to return based on identity.
  const path = c.req.path;
  if (path === "/api/health" || path === "/api/health/") return next();

  // 4. Loopback bypass — debugging locally on the CT
  if (isLoopback(c)) {
    c.set("cf_access", { email: "loopback@localhost", sub: "loopback" });
    return next();
  }

  // 5. Extract and verify JWT
  const token = extractJwt(c);
  if (!token) {
    if (config.cfAccess.softMode) {
      console.warn(
        `[cf-access] SOFT_MODE allow (missing jwt) method=${c.req.method} path=${path}`
      );
      c.set("cf_access", { email: "soft-mode@unknown", sub: "soft-mode" });
      return next();
    }
    return c.json({ error: "unauthorized", reason: "missing_jwt" }, 401);
  }

  let payload: CfAccessPayload;
  try {
    payload = await verifyToken(token);
  } catch (err) {
    const reason = (err as Error).message ?? "verify_failed";
    if (config.cfAccess.softMode) {
      console.warn(
        `[cf-access] SOFT_MODE allow (invalid jwt) method=${c.req.method} path=${path} reason=${reason}`
      );
      c.set("cf_access", { email: "soft-mode@invalid", sub: "soft-mode" });
      return next();
    }
    console.warn(
      `[cf-access] reject method=${c.req.method} path=${path} reason=${reason}`
    );
    return c.json({ error: "unauthorized", reason: "invalid_jwt" }, 401);
  }

  const identity: CfAccessIdentity = {
    email: payload.email,
    serviceToken: payload.common_name, // set when authed via service token
    sub: payload.sub,
  };
  c.set("cf_access", identity);
  console.log(
    `[cf-access] ok method=${c.req.method} path=${path} identity=${identity.email ?? identity.serviceToken ?? identity.sub ?? "?"}`
  );
  return next();
};
