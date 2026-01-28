// הגנה – רק משתמש מחובר
const currentUser = getCurrentUser();
if (!currentUser) {
    window.location.href = "login.html";
}

// DOM
const playlistListEl = document.getElementById("playlistList");
const newPlaylistBtn = document.getElementById("newPlaylistBtn");

const playlistTitleEl = document.getElementById("playlistTitle");
const filterInputEl = document.getElementById("filterInput");
const sortSelectEl = document.getElementById("sortSelect");
const videosEl = document.getElementById("videos");

// State
let selectedPlaylistId = null;
let filteredText = "";
let sortMode = "az";

// Init
initFromQueryString();
renderPlaylists();
renderSelectedPlaylist();

// Events
newPlaylistBtn.addEventListener("click", createPlaylist);

filterInputEl.addEventListener("input", (e) => {
    filteredText = e.target.value.trim().toLowerCase();
    renderSelectedPlaylist();
});

sortSelectEl.addEventListener("change", (e) => {
    sortMode = e.target.value;
    renderSelectedPlaylist();
});

// ---------- Functions ----------

function initFromQueryString() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("playlistId");
    if (id) selectedPlaylistId = id;
}

function getCurrentUserObject() {
    const users = getUsers();
    return {
        users,
        user: users.find(u => u.username === currentUser)
    };
}

function renderPlaylists() {
    playlistListEl.innerHTML = "";

    const { user } = getCurrentUserObject();
    if (!user) return;

    // אם אין שום פלייליסט – ליצור אחד כברירת מחדל (כדי שלא יהיה ריק)
    if (!user.playlists) user.playlists = [];
    if (user.playlists.length === 0) {
        user.playlists.push({
            id: Date.now().toString(),
            name: "My Playlist",
            videos: []
        });
        saveUsers(getUsers());
    }

    user.playlists.forEach(pl => {
        const li = document.createElement("li");
        li.textContent = pl.name;
        li.style.cursor = "pointer";

        // סימון נבחר
        if (pl.id === selectedPlaylistId) {
            li.style.fontWeight = "bold";
        }

        li.addEventListener("click", () => {
            selectedPlaylistId = pl.id;
            updateQueryString(pl.id);
            renderPlaylists();
            renderSelectedPlaylist();
        });

        // מחיקת פלייליסט (כפתור קטן)
        const delBtn = document.createElement("button");
        delBtn.textContent = "מחק";
        delBtn.style.marginRight = "10px";

        delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            deletePlaylist(pl.id);
        });

        li.prepend(delBtn);
        playlistListEl.appendChild(li);
    });

    // אם לא נבחר כלום – בחר אוטומטית ראשון
    if (!selectedPlaylistId && user.playlists.length > 0) {
        selectedPlaylistId = user.playlists[0].id;
        updateQueryString(selectedPlaylistId);
        renderPlaylists();
    }
}

function renderSelectedPlaylist() {
    videosEl.innerHTML = "";

    const { user } = getCurrentUserObject();
    if (!user) return;

    const playlist = user.playlists.find(pl => pl.id === selectedPlaylistId);

    if (!playlist) {
        playlistTitleEl.innerText = "בחר פלייליסט מהרשימה";
        return;
    }

    playlistTitleEl.innerText = playlist.name;

    let videos = playlist.videos || [];

    // filter
    if (filteredText) {
        videos = videos.filter(v =>
            (v.title || "").toLowerCase().includes(filteredText)
        );
    }

    // sort
    videos = videos.slice().sort((a, b) => {
        const ta = (a.title || "").toLowerCase();
        const tb = (b.title || "").toLowerCase();
        return sortMode === "az" ? ta.localeCompare(tb) : tb.localeCompare(ta);
    });

    if (videos.length === 0) {
        videosEl.innerHTML = `<p>אין סרטונים להצגה.</p>`;
        return;
    }

    videos.forEach(v => {
        const card = document.createElement("div");
        card.className = "playlist-video";

        card.innerHTML = `
            <iframe width="300" height="200"
                src="https://www.youtube.com/embed/${v.videoId}"
                allowfullscreen>
            </iframe>
            <p>${escapeHtml(v.title || "")}</p>
            <button class="removeBtn">הסר מהרשימה</button>
        `;

        card.querySelector(".removeBtn").addEventListener("click", () => {
            removeVideoFromPlaylist(playlist.id, v.videoId);
        });

        videosEl.appendChild(card);
    });
}

function createPlaylist() {
    const name = prompt("שם פלייליסט חדש:");
    if (!name) return;

    const { users, user } = getCurrentUserObject();
    if (!user) return;

    user.playlists.push({
        id: Date.now().toString(),
        name: name.trim(),
        videos: []
    });

    saveUsers(users);
    renderPlaylists();
    renderSelectedPlaylist();
}

function deletePlaylist(playlistId) {
    if (!confirm("למחוק את הפלייליסט?")) return;

    const { users, user } = getCurrentUserObject();
    if (!user) return;

    user.playlists = user.playlists.filter(pl => pl.id !== playlistId);
    saveUsers(users);

    // לבחור אחר אם מחקנו את הנבחר
    if (selectedPlaylistId === playlistId) {
        selectedPlaylistId = user.playlists[0]?.id || null;
        updateQueryString(selectedPlaylistId);
    }

    renderPlaylists();
    renderSelectedPlaylist();
}

function removeVideoFromPlaylist(playlistId, videoId) {
    const { users, user } = getCurrentUserObject();
    if (!user) return;

    const pl = user.playlists.find(p => p.id === playlistId);
    if (!pl) return;

    pl.videos = (pl.videos || []).filter(v => v.videoId !== videoId);
    saveUsers(users);
    renderSelectedPlaylist();
}

function updateQueryString(id) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("playlistId", id);
    else url.searchParams.delete("playlistId");
    window.history.replaceState({}, "", url.toString());
}

function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
