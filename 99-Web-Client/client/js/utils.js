// utils.js - shared utility functions

export async function requireAuthOrRedirect() {
    // First check sessionStorage
    const storedUser = sessionStorage.getItem("currentUser");
    if (!storedUser) {
        window.location.href = "login.html";
        return null;
    }

    // Then verify with server
    try {
        const res = await fetch("/api/me", { method: "GET" });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
            sessionStorage.removeItem("currentUser");
            window.location.href = "login.html";
            return null;
        }
        return data.user;
    } catch (err) {
        sessionStorage.removeItem("currentUser");
        window.location.href = "login.html";
        return null;
    }
}

export async function logoutAndRedirect() {
    try {
        await fetch("/api/logout", { method: "POST" });
    } catch (err) {
        // Continue with logout even if server call fails
    }
    sessionStorage.removeItem("currentUser");
    window.location.href = "login.html";
}

export function formatDuration(isoDuration) {
    // Convert ISO 8601 duration (PT1H2M3S) to human readable
    if (!isoDuration) return "";

    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "";

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatViewCount(count) {
    if (!count) return "0";
    const num = Number(count);
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + "K";
    }
    return num.toLocaleString();
}
