import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { hitlRequests } from "../db/schema.js";

const app = new Hono();

// List HITL requests
app.get("/", (c) => {
  const status = c.req.query("status") ?? undefined;
  const db = getDb();
  let rows = db
    .select()
    .from(hitlRequests)
    .orderBy(desc(hitlRequests.createdAt))
    .limit(50)
    .all();

  if (status) {
    rows = rows.filter((r) => r.status === status);
  }

  return c.json({ data: rows, total: rows.length });
});

// Get single HITL request
app.get("/:id", (c) => {
  const db = getDb();
  const row = db
    .select()
    .from(hitlRequests)
    .where(eq(hitlRequests.id, c.req.param("id") ?? ""))
    .get();
  if (!row) return c.json({ error: "not_found", message: "HITL request not found" }, 404);
  return c.json({ data: row });
});

// Respond to HITL request
app.post("/:id/respond", async (c) => {
  const db = getDb();
  const id = c.req.param("id") ?? "";
  const row = db.select().from(hitlRequests).where(eq(hitlRequests.id, id)).get();

  if (!row) return c.json({ error: "not_found", message: "HITL request not found" }, 404);
  if (row.status !== "pending") {
    return c.json({ error: "already_responded", message: "Request already responded" }, 400);
  }

  const body = await c.req.json<{ response: string }>();
  if (!body.response?.trim()) {
    return c.json({ error: "bad_request", message: "response is required" }, 400);
  }

  db.update(hitlRequests)
    .set({
      status: "responded",
      response: body.response.trim(),
      respondedAt: Date.now(),
    })
    .where(eq(hitlRequests.id, id))
    .run();

  return c.json({ data: { responded: true } });
});

export default app;
