const express = require("express");
const cors = require("cors");
const { createClient } = require("@libsql/client");

const app = express();
app.use(cors());
app.use(express.json());

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      action TEXT,
      url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

app.post("/track", async (req, res) => {
  const { event, action, url } = req.body;
  await db.execute({
    sql: "INSERT INTO events (event, action, url) VALUES (?, ?, ?)",
    args: [event, action || null, url || null],
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
  const [views, clicks, signups] = await Promise.all([
    db.execute("SELECT COUNT(*) as c FROM events WHERE event = 'page_view'"),
    db.execute("SELECT action, COUNT(*) as c FROM events WHERE event = 'click' GROUP BY action"),
    db.execute("SELECT COUNT(*) as c FROM signups"),
  ]);
  res.json({
    views: views.rows[0].c,
    clicks: clicks.rows,
    signups: signups.rows[0].c,
  });
});

const PORT = process.env.PORT || 3001;
initDb().then(() => app.listen(PORT, () => console.log(`API running on port ${PORT}`)));
