import { requireAuthOrRedirect, logoutAndRedirect } from "./utils.js";

document.addEventListener("DOMContentLoaded", async () => {
    const user = await requireAuthOrRedirect();
    if (!user) return;

    document.getElementById("welcome").textContent = `שלום ${user.username}`;
    document.getElementById("logoutBtn").addEventListener("click", logoutAndRedirect);

    const playlistList = document.getElementById("playlistList");
    const videosEl = document.getElementById("videos");
    const playlistTitle = document.getElementById("playlistTitle");
    const newPlaylistBtn = document.getElementById("newPlaylistBtn");

    // Create playlist modal elements
    const createPlaylistModal = document.getElementById("createPlaylistModal");
    const createModalClose = document.getElementById("createModalClose");
    const newPlaylistInput = document.getElementById("newPlaylistInput");
    const confirmCreatePlaylist = document.getElementById("confirmCreatePlaylist");

    // Video playback modal elements
    const videoModal = document.getElementById("videoModal");
    const modalClose = document.getElementById("modalClose");
    const videoPlayer = document.getElementById("videoPlayer");
    const modalTitle = document.getElementById("modalTitle");
    const removeVideoBtn = document.getElementById("removeVideoBtn");

    let playlists = [];
    let currentPlaylistId = null;
    let currentVideo = null;

    // Get playlist ID from URL querystring
    function getQueryPlaylistId() {
        const params = new URLSearchParams(window.location.search);
        return params.get("id");
    }

    // Create playlist modal functions
    function openCreateModal() {
        newPlaylistInput.value = "";
        createPlaylistModal.classList.remove("hidden");
        newPlaylistInput.focus();
    }

    function closeCreateModal() {
        createPlaylistModal.classList.add("hidden");
    }

    createModalClose.addEventListener("click", closeCreateModal);
    createPlaylistModal.addEventListener("click", (e) => {
        if (e.target === createPlaylistModal) closeCreateModal();
    });

    newPlaylistBtn.addEventListener("click", openCreateModal);

    confirmCreatePlaylist.addEventListener("click", async () => {
        const name = newPlaylistInput.value.trim();
        if (!name) {
            alert("יש להזין שם לפלייליסט");
            return;
        }

        const res = await fetch("/api/playlists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
            alert("שגיאה ביצירת פלייליסט");
            return;
        }

        closeCreateModal();
        await loadPlaylists();

        // Select the newly created playlist
        if (data.playlist?.id) {
            selectPlaylist(data.playlist.id);
        }
    });

    newPlaylistInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            confirmCreatePlaylist.click();
        }
    });

    // Video modal functions
    function openVideoModal(video) {
        currentVideo = video;
        videoPlayer.src = `https://www.youtube.com/embed/${video.videoId}?autoplay=1`;
        modalTitle.textContent = video.title || video.videoId;
        videoModal.classList.remove("hidden");
    }

    function closeVideoModal() {
        videoModal.classList.add("hidden");
        videoPlayer.src = "";
        currentVideo = null;
    }

    modalClose.addEventListener("click", closeVideoModal);
    videoModal.addEventListener("click", (e) => {
        if (e.target === videoModal) closeVideoModal();
    });

    removeVideoBtn.addEventListener("click", async () => {
        if (!currentVideo || !currentPlaylistId) return;

        if (!confirm("האם אתה בטוח שברצונך להסיר את הסרטון מהפלייליסט?")) {
            return;
        }

        const res = await fetch(`/api/playlists/${currentPlaylistId}/videos/${currentVideo.videoId}`, {
            method: "DELETE"
        });

        if (res.ok) {
            closeVideoModal();
            await loadPlaylists();
            selectPlaylist(currentPlaylistId);
        } else {
            alert("שגיאה בהסרת הסרטון");
        }
    });

    // Playlist loading and rendering
    async function loadPlaylists() {
        const res = await fetch("/api/playlists");
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
            window.location.href = "login.html";
            return;
        }

        playlists = data.playlists || [];
        renderPlaylistList();
    }

    function renderPlaylistList() {
        playlistList.innerHTML = "";

        playlists.forEach(p => {
            const li = document.createElement("li");
            li.className = "playlist-item";
            if (p.id === currentPlaylistId) {
                li.classList.add("active");
            }

            const nameSpan = document.createElement("span");
            nameSpan.className = "playlist-name";
            nameSpan.textContent = p.name;

            const countSpan = document.createElement("span");
            countSpan.className = "playlist-count";
            countSpan.textContent = `(${(p.videos || []).length})`;

            li.appendChild(nameSpan);
            li.appendChild(countSpan);

            li.addEventListener("click", () => {
                selectPlaylist(p.id);
                // Update URL without reload
                const newUrl = new URL(window.location);
                newUrl.searchParams.set("id", p.id);
                window.history.pushState({}, "", newUrl);
            });

            playlistList.appendChild(li);
        });
    }

    function selectPlaylist(playlistId) {
        currentPlaylistId = playlistId;
        const playlist = playlists.find(p => p.id === playlistId);

        // Update active state in list
        document.querySelectorAll(".playlist-item").forEach(li => {
            li.classList.remove("active");
        });
        const activeLi = [...document.querySelectorAll(".playlist-item")].find(li => {
            const nameSpan = li.querySelector(".playlist-name");
            return nameSpan && playlist && nameSpan.textContent === playlist.name;
        });
        if (activeLi) {
            activeLi.classList.add("active");
        }

        if (playlist) {
            playlistTitle.textContent = playlist.name;
            renderVideos(playlist.videos || []);
        } else {
            playlistTitle.textContent = "סרטונים";
            videosEl.innerHTML = '<div class="empty-message">פלייליסט לא נמצא</div>';
        }
    }

    function renderVideos(videos) {
        if (!videos || videos.length === 0) {
            videosEl.innerHTML = '<div class="empty-message">אין סרטונים בפלייליסט.</div>';
            return;
        }

        videosEl.innerHTML = "";
        videos.forEach(v => {
            const card = document.createElement("div");
            card.className = "playlist-video-card";

            if (v.thumbnail) {
                const img = document.createElement("img");
                img.src = v.thumbnail;
                img.alt = "thumbnail";
                card.appendChild(img);
            }

            const info = document.createElement("div");
            info.className = "video-info";

            const title = document.createElement("h4");
            title.className = "video-title";
            title.textContent = v.title || v.videoId;
            title.title = v.title || v.videoId;

            info.appendChild(title);

            if (v.channelTitle) {
                const channel = document.createElement("p");
                channel.className = "video-channel";
                channel.textContent = v.channelTitle;
                info.appendChild(channel);
            }

            card.appendChild(info);

            card.addEventListener("click", () => openVideoModal(v));
            videosEl.appendChild(card);
        });
    }

    // Initialize
    await loadPlaylists();

    // Check for querystring playlist ID
    const queryId = getQueryPlaylistId();
    if (queryId) {
        const exists = playlists.some(p => p.id === queryId);
        if (exists) {
            selectPlaylist(queryId);
        } else if (playlists.length > 0) {
            selectPlaylist(playlists[0].id);
        } else {
            videosEl.innerHTML = '<div class="empty-message">בחר פלייליסט מהרשימה.</div>';
        }
    } else if (playlists.length > 0) {
        // Auto-select first playlist if no querystring
        selectPlaylist(playlists[0].id);
        // Update URL
        const newUrl = new URL(window.location);
        newUrl.searchParams.set("id", playlists[0].id);
        window.history.replaceState({}, "", newUrl);
    } else {
        videosEl.innerHTML = '<div class="empty-message">אין פלייליסטים. צור פלייליסט חדש!</div>';
    }
});
