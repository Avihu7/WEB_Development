const user = getCurrentUser();
if (!user) {
    window.location.href = "login.html";
}

const users = getUsers();
const u = users.find(x => x.username === user);

const list = document.getElementById("playlistList");
const videosDiv = document.getElementById("videos");

u.playlists.forEach(pl => {
    const li = document.createElement("li");
    li.innerText = pl.name;
    li.onclick = () => showPlaylist(pl);
    list.appendChild(li);
});

function showPlaylist(pl) {
    videosDiv.innerHTML = "";
    pl.videos.forEach(v => {
        const div = document.createElement("div");
        div.innerHTML = `
            <iframe width="300" height="200"
                src="https://www.youtube.com/embed/${v.videoId}">
            </iframe>
            <p>${v.title}</p>
        `;
        videosDiv.appendChild(div);
    });
}
