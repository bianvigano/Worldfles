// server.js
const path = require("path");
const express = require("express");
const bcrypt = require("bcrypt");
const { db } = require("./db");
const { signToken, authRequired, adminRequired } = require("./auth");

const app = express();
app.use(express.json({ limit: "20mb" }));

// =====================================================
// BASIC HEALTH CHECK
// =====================================================
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// =====================================================
// AUTH
// =====================================================

// REGISTER
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email/password required" });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    const info = db.prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'user')"
    ).run(email.toLowerCase(), hash);

    const user = db.prepare(
      "SELECT id, email, role FROM users WHERE id=?"
    ).get(info.lastInsertRowid);

    const token = signToken(user);
    res.json({ token, user });
  } catch (e) {
    if (String(e).includes("UNIQUE")) {
      return res.status(409).json({ error: "Email already used" });
    }
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email/password required" });
  }

  const user = db.prepare(
    "SELECT * FROM users WHERE email=?"
  ).get(email.toLowerCase());

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const safeUser = { id: user.id, email: user.email, role: user.role };
  const token = signToken(safeUser);
  res.json({ token, user: safeUser });
});

// CURRENT USER
app.get("/api/me", authRequired, (req, res) => {
  res.json({ user: req.user });
});

// =====================================================
// WORLDS (CORE FIX AREA)
// =====================================================

// LIST WORLDS (USER ONLY)
app.get("/api/worlds", authRequired, (req, res) => {
  const worlds = db.prepare(`
    SELECT id, name, created_at, updated_at
    FROM worlds
    WHERE user_id=?
    ORDER BY updated_at DESC
  `).all(req.user.id);

  res.json({ worlds });
});

// CREATE WORLD
app.post("/api/worlds", authRequired, (req, res) => {
  const { name, data } = req.body || {};
  if (!name || !data) {
    return res.status(400).json({ error: "name/data required" });
  }

  const info = db.prepare(`
    INSERT INTO worlds (user_id, name, data_json)
    VALUES (?, ?, ?)
  `).run(
    req.user.id,
    name,
    JSON.stringify(data)
  );

  res.json({ id: info.lastInsertRowid });
});

// GET WORLD
app.get("/api/worlds/:id", authRequired, (req, res) => {
  const row = db.prepare(`
    SELECT id, user_id, name, data_json
    FROM worlds
    WHERE id=?
  `).get(req.params.id);

  if (!row) return res.status(404).json({ error: "Not found" });

  if (row.user_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json({
    id: row.id,
    name: row.name,
    data: JSON.parse(row.data_json)
  });
});

// UPDATE WORLD (SAVE)
// 🔴 FIX: pakai PUT /api/worlds/:id (Editor.vue HARUS pakai ini)
app.put("/api/worlds/:id", authRequired, (req, res) => {
  const { data } = req.body || {};
  if (!data) {
    return res.status(400).json({ error: "data required" });
  }

  const row = db.prepare(
    "SELECT user_id FROM worlds WHERE id=?"
  ).get(req.params.id);

  if (!row) return res.status(404).json({ error: "Not found" });

  if (row.user_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  db.prepare(`
    UPDATE worlds
    SET data_json=?, updated_at=datetime('now')
    WHERE id=?
  `).run(JSON.stringify(data), req.params.id);

  res.json({ ok: true });
});

// DELETE WORLD
app.delete("/api/worlds/:id", authRequired, (req, res) => {
  const row = db.prepare(
    "SELECT user_id FROM worlds WHERE id=?"
  ).get(req.params.id);

  if (!row) return res.status(404).json({ error: "Not found" });

  if (row.user_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  db.prepare("DELETE FROM worlds WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// =====================================================
// ADMIN
// =====================================================
app.get("/api/admin/users", authRequired, adminRequired, (req, res) => {
  const users = db.prepare(
    "SELECT id, email, role, created_at FROM users ORDER BY id DESC"
  ).all();

  res.json({ users });
});

app.post("/api/admin/make-admin", authRequired, adminRequired, (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId required" });

  db.prepare("UPDATE users SET role='admin' WHERE id=?").run(userId);
  res.json({ ok: true });
});

// =====================================================
// DEV / PROD (SINGLE PORT)
// =====================================================
async function start() {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const { createServer: createViteServer } = require("vite");
    const vite = await createViteServer({
      root: path.join(__dirname, "web"),
      server: { middlewareMode: true }
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get(/^\/(?!api).*/, (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(3000, () => {
    console.log("=================================");
    console.log("✅ Server running");
    console.log("➡ http://localhost:3000");
    console.log("=================================");
  });
}

start();
