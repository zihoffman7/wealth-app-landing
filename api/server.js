const express = require("express");
const cors = require("cors");
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, "analytics.db");
let db;

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  db.run(schema);
  save();
}

function save() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

app.post("/track", (req, res) => {
  const { event, action, url } = req.body;
  db.run("INSERT INTO events (event, action, url) VALUES (?, ?, ?)", [event, action || null, url || null]);
  save();
  res.json({ ok: true });
});

app.post("/signup", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });
  try {
    db.run("INSERT OR IGNORE INTO signups (email) VALUES (?)", [email]);
    save();
  } catch (e) {}
  res.json({ ok: true });
});

app.get("/list", (req, res) => {
  const events = db.exec("SELECT * FROM events ORDER BY id DESC");
  const signups = db.exec("SELECT * FROM signups ORDER BY id DESC");
  const toObjects = (result) => {
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
  };
  res.json({ events: toObjects(events), signups: toObjects(signups) });
});

app.get("/stats", (req, res) => {
  const views = db.exec("SELECT COUNT(*) as c FROM events WHERE event = 'page_view'");
  const clicks = db.exec("SELECT action, COUNT(*) as c FROM events WHERE event = 'click' GROUP BY action");
  const signups = db.exec("SELECT COUNT(*) as c FROM signups");
  const toObjects = (result) => {
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
  };
  res.json({
    views: views.length ? views[0].values[0][0] : 0,
    clicks: toObjects(clicks),
    signups: signups.length ? signups[0].values[0][0] : 0
  });
});

const PORT = process.env.PORT || 3001;
initDb().then(() => app.listen(PORT, () => console.log(`API running on port ${PORT}`)));
