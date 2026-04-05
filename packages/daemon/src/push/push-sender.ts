import webpush from "web-push";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { pushSubscriptions } from "../db/schema.js";
import { config } from "../config.js";

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = config.vapidPublicKey;
  const privateKey = config.vapidPrivateKey;
  const subject = config.vapidSubject;
  if (!publicKey || !privateKey) {
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

/**
 * Send a push notification to all registered subscriptions.
 * Non-blocking — failures are logged and don't throw.
 * Subscriptions that return 404/410 (expired) are removed from the DB.
 */
export async function sendPushToAll(payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) {
    console.warn("[push] VAPID keys not configured, skipping push");
    return;
  }

  const db = getDb();
  const subs = db.select().from(pushSubscriptions).all();

  if (subs.length === 0) return;

  // Truncate body to respect 4KB payload limit (with margin for JSON overhead)
  const body = JSON.stringify({
    title: truncate(payload.title, 100),
    body: truncate(payload.body, 500),
    url: payload.url ?? "/",
    tag: payload.tag,
  });

  const toRemove: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 3600 }
        );
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        if (e.statusCode === 404 || e.statusCode === 410) {
          // Subscription expired — remove from DB
          toRemove.push(sub.endpoint);
        } else {
          console.error(
            `[push] Failed to send to ${sub.endpoint.slice(0, 60)}...:`,
            e.statusCode ?? e.message ?? err
          );
        }
      }
    })
  );

  // Clean up expired subscriptions
  for (const endpoint of toRemove) {
    db.delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .run();
  }
  if (toRemove.length > 0) {
    console.log(`[push] Removed ${toRemove.length} expired subscription(s)`);
  }
}

/**
 * Fire-and-forget wrapper. Use this when you don't want to await the push
 * (e.g., inside a request handler).
 */
export function sendPushAsync(payload: PushPayload): void {
  sendPushToAll(payload).catch((err) => {
    console.error("[push] Async send failed:", err);
  });
}
