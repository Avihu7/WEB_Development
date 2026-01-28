const path = require("path");
const fs = require("fs");
const express = require("express");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth");
const playlistsRoutes = require("./routes/playlists");

const app = express();
const PORT = 3000;

// middlewares
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// static client
// שים את תיקיית ה-Client כאן: ../client
const clientPath = path.join(__dirname, "..", "client");
app.use(express.static(clientPath));

// uploads (לבונוס MP3 בהמשך)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API routes
app.use("/api", authRoutes);
app.use("/api", playlistsRoutes);

// fallback (למי שנכנס לנתיב שלא קיים) - מחזיר 404 פשוט
app.use((req, res) => {
  res.status(404).send("Not Found");
});


app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});
