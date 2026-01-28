const express = require("express");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const DATA_FILE = path.join(__dirname, "..", "data", "users.json");

function readDB() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}
function writeDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
}

function requireAuth(req, res, next) {
  const username = req.cookies.currentUser;
  if (!username) return res.status(401).json({ ok: false, message: "Not logged in" });
  req.username = username;
  next();
}

// GET /api/playlists
router.get("/playlists", requireAuth, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.username === req.username);
  if (!user) return res.status(401).json({ ok: false });

  return res.json({ ok: true, playlists: user.playlists || [] });
});

// POST /api/playlists  { name }
router.post("/playlists", requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ ok: false, message: "Missing name" });

  const db = readDB();
  const user = db.users.find(u => u.username === req.username);
  if (!user) return res.status(401).json({ ok: false });

  if (!user.playlists) user.playlists = [];
  const newPlaylist = { id: Date.now().toString(), name: name.trim(), videos: [] };
  user.playlists.push(newPlaylist);

  writeDB(db);
  return res.json({ ok: true, playlist: newPlaylist });
});

// POST /api/playlists/:id/videos  { videoId, title, thumbnail, channelTitle, viewCount, duration }
router.post("/playlists/:id/videos", requireAuth, (req, res) => {
  const { videoId, title, thumbnail, channelTitle, viewCount, duration } = req.body;
  const playlistId = req.params.id;

  if (!videoId) return res.status(400).json({ ok: false, message: "Missing videoId" });

  const db = readDB();
  const user = db.users.find(u => u.username === req.username);
  if (!user) return res.status(401).json({ ok: false });

  const pl = (user.playlists || []).find(p => p.id === playlistId);
  if (!pl) return res.status(404).json({ ok: false, message: "Playlist not found" });

  if (!pl.videos) pl.videos = [];
  const exists = pl.videos.some(v => v.videoId === videoId);
  if (!exists) {
    pl.videos.push({
      videoId,
      title: title || "",
      thumbnail: thumbnail || "",
      channelTitle: channelTitle || "",
      viewCount: viewCount || 0,
      duration: duration || ""
    });
  }

  writeDB(db);
  return res.json({ ok: true });
});

// DELETE /api/playlists/:id/videos/:videoId
router.delete("/playlists/:id/videos/:videoId", requireAuth, (req, res) => {
  const playlistId = req.params.id;
  const videoId = req.params.videoId;

  const db = readDB();
  const user = db.users.find(u => u.username === req.username);
  if (!user) return res.status(401).json({ ok: false });

  const pl = (user.playlists || []).find(p => p.id === playlistId);
  if (!pl) return res.status(404).json({ ok: false });

  pl.videos = (pl.videos || []).filter(v => v.videoId !== videoId);

  writeDB(db);
  return res.json({ ok: true });
});

module.exports = router;
