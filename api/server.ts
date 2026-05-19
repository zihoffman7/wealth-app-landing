import express from "express";
import cors from "cors";
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { join } from "path";

const app = express();
app.use(cors());
app.use(express.json());

const db = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN,
});

async function initDb() {
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
  await db.executeMultiple(schema);
}

app.post("/track", async (req, res) => {
  const { event, action, url } = req.body;
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.socket.remoteAddress;
  await db.execute({
    sql: "INSERT INTO events (event, action, url, ip) VALUES (?, ?, ?, ?)",
    args: [event, action ?? null, url ?? null, ip ?? null],
  });
  res.json({ ok: true });
});

app.post("/signup", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });
  await db.execute({ sql: "INSERT OR IGNORE INTO signups (email) VALUES (?)", args: [email] });
  res.json({ ok: true });
});

app.post("/clear", async (req, res) => {
  await db.executeMultiple("DELETE FROM events; DELETE FROM signups;");
  res.json({ ok: true });
});

app.get("/list", async (req, res) => {
  const [events, signups] = await Promise.all([
    db.execute("SELECT * FROM events ORDER BY id DESC"),
    db.execute("SELECT * FROM signups ORDER BY id DESC"),
  ]);
  res.json({ events: events.rows, signups: signups.rows });
});

app.get("/stats", async (req, res) => {
  const [views, clicks, signups, clicksByIp] = await Promise.all([
    db.execute("SELECT COUNT(*) as c FROM events WHERE event = 'page_view'"),
    db.execute("SELECT action, COUNT(*) as c FROM events WHERE event = 'click' GROUP BY action"),
    db.execute("SELECT COUNT(*) as c FROM signups"),
    db.execute("SELECT ip, COUNT(*) as c FROM events WHERE event = 'click' GROUP BY ip ORDER BY c DESC"),
  ]);
  res.json({
    views: views.rows[0].c,
    clicks: clicks.rows,
    clicks_by_ip: clicksByIp.rows,
    signups: signups.rows[0].c,
  });
});

const PORT = process.env.PORT || 3001;
initDb().then(() => app.listen(PORT, () => console.log(`API running on port ${PORT}`)));
