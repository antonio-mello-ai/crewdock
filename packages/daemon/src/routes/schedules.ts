import { Hono } from "hono";
import {
  listSchedules,
  runSchedule,
  setScheduleEnabled,
  createSchedule,
  deleteSchedule,
  getScheduleLogs,
} from "../schedules/schedule-manager.js";

const app = new Hono();

app.get("/", (c) => {
  try {
    const data = listSchedules();
    return c.json({ data, total: data.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "list_failed", message }, 500);
  }
});

app.post("/", async (c) => {
  try {
    const body = await c.req.json<{
      name: string;
      description: string;
      command: string;
      onCalendar: string;
    }>();
    if (!body.name || !body.command || !body.onCalendar) {
      return c.json(
        { error: "bad_request", message: "name, command, onCalendar are required" },
        400
      );
    }
    const data = createSchedule({
      name: body.name,
      description: body.description ?? body.name,
      command: body.command,
      onCalendar: body.onCalendar,
    });
    return c.json({ data }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "create_failed", message }, 400);
  }
});

app.delete("/:name", (c) => {
  try {
    deleteSchedule(c.req.param("name") ?? "");
    return c.json({ data: { deleted: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "delete_failed", message }, 400);
  }
});

app.get("/:name/logs", (c) => {
  try {
    const lines = Number(c.req.query("lines")) || 200;
    const data = getScheduleLogs(c.req.param("name") ?? "", lines);
    return c.json({ data: { lines: data } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "logs_failed", message }, 400);
  }
});

app.post("/:name/run", (c) => {
  try {
    runSchedule(c.req.param("name") ?? "");
    return c.json({ data: { triggered: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "run_failed", message }, 400);
  }
});

app.post("/:name/enable", (c) => {
  try {
    setScheduleEnabled(c.req.param("name") ?? "", true);
    return c.json({ data: { enabled: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "enable_failed", message }, 400);
  }
});

app.post("/:name/disable", (c) => {
  try {
    setScheduleEnabled(c.req.param("name") ?? "", false);
    return c.json({ data: { enabled: false } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: "disable_failed", message }, 400);
  }
});

export default app;
