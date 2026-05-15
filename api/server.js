const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, "analytics.db"));
db.pragma("journal_mode = WAL");
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

app.post("/track", (req, res) => {
  const { event, action, url } = req.body;
  db.prepare("INSERT INTO events (event, action, url) VALUES (?, ?, ?)").run(event, action || null, url || null);
  res.json({ ok: true });
});

app.post("/signup", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });
  try {
    db.prepare("INSERT OR IGNORE INTO signups (email) VALUES (?)").run(email);
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: true });
  }
});

app.get("/stats", (req, res) => {
  const views = db.prepare("SELECT COUNT(*) as c FROM events WHERE event = 'page_view'").get().c;
  const clicks = db.prepare("SELECT action, COUNT(*) as c FROM events WHERE event = 'click' GROUP BY action").all();
  const signups = db.prepare("SELECT COUNT(*) as c FROM signups").get().c;
  res.json({ views, clicks, signups });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
