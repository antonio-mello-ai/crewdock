import { Hono } from "hono";
import {
  listSchedules,
  runSchedule,
  setScheduleEnabled,
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
