import { Hono } from "hono";
import { nanoid } from "nanoid";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { pushSubscriptions } from "../db/schema.js";
import { sendPushToAll } from "../push/push-sender.js";

const app = new Hono();

interface SubscribeBody {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

app.post("/subscribe", async (c) => {
  try {
    const body = await c.req.json<SubscribeBody>();
    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return c.json(
        { error: "bad_request", message: "endpoint and keys are required" },
        400
      );
    }

    const db = getDb();
    const now = Date.now();

    // Upsert by endpoint: if already exists, update keys and user_agent
    db.insert(pushSubscriptions)
      .values({
        id: nanoid(12),
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: body.userAgent ?? null,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
          userAgent: body.userAgent ?? null,
        },
      })
      .run();

    return c.json({ data: { subscribed: true } }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "subscribe_failed", message }, 400);
  }
});

app.delete("/subscribe", async (c) => {
  try {
    const body = await c.req.json<{ endpoint: string }>();
    if (!body.endpoint) {
      return c.json(
        { error: "bad_request", message: "endpoint is required" },
        400
      );
    }
    const db = getDb();
    db.delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, body.endpoint))
      .run();
    return c.json({ data: { unsubscribed: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "unsubscribe_failed", message }, 400);
  }
});

/**
 * Test endpoint — sends a push to all registered subscriptions.
 * Useful for verifying the full flow after setup.
 */
app.post("/test", async (c) => {
  try {
    await sendPushToAll({
      title: "AIOS test notification",
      body: "Web Push is working! You will receive alerts for failed jobs and HITL requests.",
      url: "/",
      tag: "test",
    });
    const db = getDb();
    const count = db
      .select({ n: sql<number>`count(*)` })
      .from(pushSubscriptions)
      .get();
    return c.json({
      data: { sent: true, subscriptions: count?.n ?? 0 },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "test_failed", message }, 500);
  }
});

export default app;
