function getUsers() {
    return JSON.parse(localStorage.getItem("users")) || [];
}

function saveUsers(users) {
    localStorage.setItem("users", JSON.stringify(users));
}

function setCurrentUser(username) {
    sessionStorage.setItem("currentUser", username);
}

function getCurrentUser() {
    return sessionStorage.getItem("currentUser");
}

function clearCurrentUser() {
    sessionStorage.removeItem("currentUser");
}
