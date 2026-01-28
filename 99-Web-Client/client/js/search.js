import { requireAuthOrRedirect, logoutAndRedirect, formatDuration } from "./utils.js";

const YOUTUBE_API_KEY = "AIzaSyCS38Q-Whjei_46d6bmlOgGCI6MXunE5Xk";

document.addEventListener("DOMContentLoaded", async () => {
    const user = await requireAuthOrRedirect();
    if (!user) return;

    document.getElementById("welcome").textContent = `שלום ${user.username}`;
    document.getElementById("logoutBtn").addEventListener("click", logoutAndRedirect);

    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");
    const resultsEl = document.getElementById("results");

    // Video modal elements
    const videoModal = document.getElementById("videoModal");
    const modalClose = document.getElementById("modalClose");
    const videoPlayer = document.getElementById("videoPlayer");
    const modalTitle = document.getElementById("modalTitle");
    const modalChannel = document.getElementById("modalChannel");
    const modalViews = document.getElementById("modalViews");
    const modalDuration = document.getElementById("modalDuration");
    const addToFavBtn = document.getElementById("addToFavBtn");

    // Add to favorites modal elements
    const addToFavModal = document.getElementById("addToFavModal");
    const favModalClose = document.getElementById("favModalClose");
    const playlistSelect = document.getElementById("playlistSelect");
    const newPlaylistName = document.getElementById("newPlaylistName");
    const confirmAddFav = document.getElementById("confirmAddFav");
    const favOptionRadios = document.querySelectorAll('input[name="favOption"]');

    // Toast elements
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    const toastLink = document.getElementById("toastLink");

    let lastResults = [];
    let selectedVideo = null;
    let userPlaylists = [];
    let userVideoIds = new Set(); // All videoIds in any of user's playlists

    // Initialize
    await loadUserPlaylists();

    // Toast functions
    function showToast(message, showLink = false, playlistId = null) {
        toastMessage.textContent = message;
        if (showLink && playlistId) {
            toastLink.href = `playlists.html?id=${playlistId}`;
            toastLink.classList.remove("hidden");
        } else if (showLink) {
            toastLink.href = "playlists.html";
            toastLink.classList.remove("hidden");
        } else {
            toastLink.classList.add("hidden");
        }
        toast.classList.remove("hidden");
        setTimeout(() => {
            toast.classList.add("hidden");
            toastLink.classList.add("hidden");
        }, 4000);
    }

    // Video modal functions
    function openVideoModal(video) {
        selectedVideo = video;
        videoPlayer.src = `https://www.youtube.com/embed/${video.videoId}?autoplay=1`;
        modalTitle.textContent = video.title;
        modalChannel.textContent = `ערוץ: ${video.channelTitle}`;
        modalViews.textContent = `צפיות: ${video.viewCount.toLocaleString()}`;
        modalDuration.textContent = video.duration ? `אורך: ${video.duration}` : "";

        // Update add to favorites button state
        if (userVideoIds.has(video.videoId)) {
            addToFavBtn.textContent = "✓ נוסף למועדפים";
            addToFavBtn.classList.add("added");
            addToFavBtn.disabled = true;
        } else {
            addToFavBtn.textContent = "הוסף למועדפים";
            addToFavBtn.classList.remove("added");
            addToFavBtn.disabled = false;
        }

        videoModal.classList.remove("hidden");
    }

    function closeVideoModal() {
        videoModal.classList.add("hidden");
        videoPlayer.src = "";
        selectedVideo = null;
    }

    modalClose.addEventListener("click", closeVideoModal);
    videoModal.addEventListener("click", (e) => {
        if (e.target === videoModal) closeVideoModal();
    });

    // Add to favorites modal functions
    function openAddToFavModal() {
        if (!selectedVideo) return;

        // Populate dropdown
        playlistSelect.innerHTML = '<option value="">-- בחר פלייליסט --</option>';
        userPlaylists.forEach(p => {
            const option = document.createElement("option");
            option.value = p.id;
            option.textContent = p.name;
            playlistSelect.appendChild(option);
        });

        // Reset form
        favOptionRadios[0].checked = true;
        playlistSelect.disabled = false;
        newPlaylistName.disabled = true;
        newPlaylistName.value = "";

        addToFavModal.classList.remove("hidden");
    }

    function closeAddToFavModal() {
        addToFavModal.classList.add("hidden");
    }

    favModalClose.addEventListener("click", closeAddToFavModal);
    addToFavModal.addEventListener("click", (e) => {
        if (e.target === addToFavModal) closeAddToFavModal();
    });

    // Toggle between existing/new playlist
    favOptionRadios.forEach(radio => {
        radio.addEventListener("change", () => {
            if (radio.value === "existing") {
                playlistSelect.disabled = false;
                newPlaylistName.disabled = true;
            } else {
                playlistSelect.disabled = true;
                newPlaylistName.disabled = false;
            }
        });
    });

    addToFavBtn.addEventListener("click", () => {
        if (!selectedVideo || userVideoIds.has(selectedVideo.videoId)) return;
        openAddToFavModal();
    });

    confirmAddFav.addEventListener("click", async () => {
        if (!selectedVideo) return;

        const selectedOption = document.querySelector('input[name="favOption"]:checked').value;
        let targetPlaylist = null;

        if (selectedOption === "existing") {
            const playlistId = playlistSelect.value;
            if (!playlistId) {
                alert("יש לבחור פלייליסט");
                return;
            }
            targetPlaylist = userPlaylists.find(p => p.id === playlistId);
        } else {
            const name = newPlaylistName.value.trim();
            if (!name) {
                alert("יש להזין שם לפלייליסט");
                return;
            }
            targetPlaylist = await createPlaylist(name);
            if (!targetPlaylist) {
                alert("שגיאה ביצירת פלייליסט");
                return;
            }
        }

        const success = await addVideoToPlaylist(targetPlaylist.id, selectedVideo);
        if (success) {
            userVideoIds.add(selectedVideo.videoId);
            await loadUserPlaylists(); // Refresh

            // Update button state
            addToFavBtn.textContent = "✓ נוסף למועדפים";
            addToFavBtn.classList.add("added");
            addToFavBtn.disabled = true;

            // Update card button if visible
            updateCardButton(selectedVideo.videoId);

            closeAddToFavModal();
            showToast("הסרטון נוסף בהצלחה!", true, targetPlaylist.id);
        } else {
            alert("שגיאה בהוספה למועדפים");
        }
    });

    // YouTube API functions
    async function ytSearch(query) {
        const url = new URL("https://www.googleapis.com/youtube/v3/search");
        url.searchParams.set("part", "snippet");
        url.searchParams.set("type", "video");
        url.searchParams.set("maxResults", "12");
        url.searchParams.set("q", query);
        url.searchParams.set("key", YOUTUBE_API_KEY);

        const res = await fetch(url.toString());
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error?.message || "YouTube search failed");
        return (data.items || []).map(item => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails?.medium?.url || ""
        }));
    }

    async function ytGetDetails(videoIds) {
        if (!videoIds.length) return new Map();

        const url = new URL("https://www.googleapis.com/youtube/v3/videos");
        url.searchParams.set("part", "statistics,contentDetails");
        url.searchParams.set("id", videoIds.join(","));
        url.searchParams.set("key", YOUTUBE_API_KEY);

        const res = await fetch(url.toString());
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error?.message || "YouTube videos failed");

        const map = new Map();
        (data.items || []).forEach(v => {
            map.set(v.id, {
                viewCount: Number(v.statistics?.viewCount || 0),
                duration: formatDuration(v.contentDetails?.duration || "")
            });
        });
        return map;
    }

    // Playlist API functions
    async function loadUserPlaylists() {
        try {
            const res = await fetch("/api/playlists");
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.ok) {
                userPlaylists = [];
                userVideoIds = new Set();
                return;
            }
            userPlaylists = data.playlists || [];

            // Build set of all video IDs
            userVideoIds = new Set();
            userPlaylists.forEach(p => {
                (p.videos || []).forEach(v => {
                    userVideoIds.add(v.videoId);
                });
            });
        } catch (err) {
            userPlaylists = [];
            userVideoIds = new Set();
        }
    }

    async function createPlaylist(name) {
        const res = await fetch("/api/playlists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) return null;
        return data.playlist;
    }

    async function addVideoToPlaylist(playlistId, video) {
        const res = await fetch(`/api/playlists/${playlistId}/videos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                videoId: video.videoId,
                title: video.title,
                thumbnail: video.thumbnail,
                channelTitle: video.channelTitle,
                viewCount: video.viewCount,
                duration: video.duration
            })
        });
        const data = await res.json().catch(() => ({}));
        return res.ok && data.ok;
    }

    // Render functions
    function updateCardButton(videoId) {
        const card = document.querySelector(`.video-card[data-video-id="${videoId}"]`);
        if (card) {
            const btn = card.querySelector(".add-fav-btn");
            if (btn) {
                btn.textContent = "✓ נוסף";
                btn.classList.add("added");
                btn.disabled = true;
            }
        }
    }

    function renderResults(videos) {
        resultsEl.innerHTML = "";
        videos.forEach(video => {
            const card = document.createElement("div");
            card.className = "video-card";
            card.dataset.videoId = video.videoId;

            const img = document.createElement("img");
            img.src = video.thumbnail;
            img.alt = "thumbnail";

            const title = document.createElement("h4");
            title.className = "video-title";
            title.textContent = video.title;
            title.title = `${video.title}\nערוץ: ${video.channelTitle}\nצפיות: ${video.viewCount.toLocaleString()}${video.duration ? '\nאורך: ' + video.duration : ''}`;

            const meta = document.createElement("p");
            meta.className = "video-meta";
            meta.textContent = `${video.channelTitle} • ${video.viewCount.toLocaleString()} צפיות`;
            if (video.duration) {
                meta.textContent += ` • ${video.duration}`;
            }

            const btn = document.createElement("button");
            btn.className = "add-fav-btn";

            if (userVideoIds.has(video.videoId)) {
                btn.textContent = "✓ נוסף";
                btn.classList.add("added");
                btn.disabled = true;
            } else {
                btn.textContent = "הוסף למועדפים";
            }

            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (userVideoIds.has(video.videoId)) return;
                selectedVideo = video;
                openAddToFavModal();
            });

            card.appendChild(img);
            card.appendChild(title);
            card.appendChild(meta);
            card.appendChild(btn);

            card.addEventListener("click", () => openVideoModal(video));
            resultsEl.appendChild(card);
        });
    }

    async function doSearch() {
        const q = searchInput.value.trim();
        if (!q) return;

        resultsEl.innerHTML = '<div class="loading">טוען...</div>';
        try {
            const base = await ytSearch(q);
            const detailsMap = await ytGetDetails(base.map(v => v.videoId));

            lastResults = base.map(v => ({
                ...v,
                viewCount: detailsMap.get(v.videoId)?.viewCount ?? 0,
                duration: detailsMap.get(v.videoId)?.duration ?? ""
            }));

            renderResults(lastResults);
        } catch (err) {
            resultsEl.innerHTML = "";
            alert(err.message || "שגיאה בחיפוש");
        }
    }

    searchBtn.addEventListener("click", doSearch);
    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") doSearch();
    });
});
