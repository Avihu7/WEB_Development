// REGISTER
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const inputs = registerForm.querySelectorAll("input");
        const [username, email, age, password, confirm, image] =
            Array.from(inputs).map(i => i.value.trim());

        if (!username || !email || !age || !password || !confirm) {
            alert("כל השדות חובה");
            return;
        }

        if (password !== confirm) {
            alert("סיסמאות לא זהות");
            return;
        }

        if (password.length < 6) {
            alert("סיסמה חייבת לפחות 6 תווים");
            return;
        }

        if (!(/\d/.test(password) && /\W/.test(password))) {
            alert("סיסמה חייבת לכלול ספרה ותו מיוחד");
            return;
        }

        const users = getUsers();
        if (users.some(u => u.username === username)) {
            alert("שם משתמש כבר קיים");
            return;
        }

        users.push({
            username,
            email,
            age,
            password,
            image,
            playlists: []
        });

        saveUsers(users);
        window.location.href = "login.html";
    });
}

// LOGIN
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const inputs = loginForm.querySelectorAll("input");
        const username = inputs[0].value.trim();
        const password = inputs[1].value.trim();

        const users = getUsers();
        const user = users.find(
            u => u.username === username && u.password === password
        );

        if (!user) {
            alert("פרטי התחברות שגויים");
            return;
        }

        setCurrentUser(username);
        window.location.href = "search.html";
    });
}
