// auth.js - handles login and register

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    // Password validation: min 6 chars, at least 1 letter and 1 digit
    function isValidPassword(password) {
        if (!password || password.length < 6) return false;
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasDigit = /\d/.test(password);
        return hasLetter && hasDigit;
    }

    // LOGIN
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const username = loginForm.querySelector("#username").value.trim();
            const password = loginForm.querySelector("#password").value;

            if (!username || !password) {
                alert("יש למלא את כל השדות");
                return;
            }

            try {
                const res = await fetch("/api/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json().catch(() => ({}));

                if (!res.ok || !data.ok) {
                    alert("שם משתמש או סיסמה שגויים");
                    return;
                }

                // Store in sessionStorage for client-side auth check
                sessionStorage.setItem("currentUser", username);
                window.location.href = "search.html";
            } catch (err) {
                alert("שגיאה בהתחברות");
            }
        });
    }

    // REGISTER
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const username = registerForm.querySelector("#username").value.trim();
            const password = registerForm.querySelector("#password").value;
            const passwordConfirm = registerForm.querySelector("#passwordConfirm").value;
            const email = registerForm.querySelector("#email").value.trim();
            const fullName = registerForm.querySelector("#fullName").value.trim();
            const image = registerForm.querySelector("#image").value.trim();

            // Validation
            if (!username || !password || !passwordConfirm || !email || !fullName || !image) {
                alert("יש למלא את כל השדות");
                return;
            }

            if (!isValidPassword(password)) {
                alert("הסיסמה חייבת להכיל לפחות 6 תווים, אות אחת וספרה אחת");
                return;
            }

            if (password !== passwordConfirm) {
                alert("אימות הסיסמה לא תואם");
                return;
            }

            try {
                const res = await fetch("/api/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username,
                        password,
                        email,
                        fullName,
                        image
                    })
                });

                const data = await res.json().catch(() => ({}));

                if (!res.ok || !data.ok) {
                    if (res.status === 409) {
                        alert("שם המשתמש כבר קיים");
                    } else if (res.status === 400) {
                        alert(data.message || "פרטים לא תקינים");
                    } else {
                        alert("שגיאה בהרשמה");
                    }
                    return;
                }

                alert("נרשמת בהצלחה! עכשיו התחבר.");
                window.location.href = "login.html";
            } catch (err) {
                alert("שגיאה בהרשמה");
            }
        });
    }
});
