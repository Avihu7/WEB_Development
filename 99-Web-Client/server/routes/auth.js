const express = require("express");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const DATA_FILE = path.join(__dirname, "..", "data", "users.json");

// helpers
function readDB() {
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw);
}

function writeDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
}

function passwordValid(pw) {
  // Password must be at least 6 chars, contain at least 1 letter and 1 digit
  return (
    typeof pw === "string" &&
    pw.length >= 6 &&
    /[a-zA-Z]/.test(pw) &&
    /\d/.test(pw)
  );
}

// POST /api/register
router.post("/register", (req, res) => {
  const { username, email, password, image, fullName } = req.body;

  // All fields are required
  if (!username || !email || !password || !fullName || !image) {
    return res.status(400).json({ ok: false, message: "Missing required fields" });
  }
  if (!passwordValid(password)) {
    return res.status(400).json({ ok: false, message: "Password must be at least 6 characters with at least 1 letter and 1 digit" });
  }

  const db = readDB();
  if (db.users.some(u => u.username === username)) {
    return res.status(409).json({ ok: false, message: "Username already exists" });
  }

  db.users.push({
    username,
    fullName,
    email,
    password, // (no encryption for Phase A)
    image,
    playlists: [],
  });

  writeDB(db);
  return res.json({ ok: true });
});

// POST /api/login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ ok: false, message: "Missing credentials" });
  }

  const db = readDB();
  const user = db.users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ ok: false, message: "Invalid credentials" });
  }

  // session cookie פשוט
  res.cookie("currentUser", username, { httpOnly: true });
  return res.json({ ok: true });
});

// POST /api/logout
router.post("/logout", (req, res) => {
  res.clearCookie("currentUser");
  return res.json({ ok: true });
});

// GET /api/me
router.get("/me", (req, res) => {
  const username = req.cookies.currentUser;
  if (!username) return res.status(401).json({ ok: false });

  const db = readDB();
  const user = db.users.find(u => u.username === username);
  if (!user) return res.status(401).json({ ok: false });

  return res.json({
    ok: true,
    user: {
      username: user.username,
      fullName: user.fullName || user.firstName || "",
      image: user.image || "",
      email: user.email
    }
  });
});

module.exports = router;
