(function () {
    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

    async function afterAuth(data) {
        window.Store.setToken(data.token);
        const user = window.API.mapUser(data.user);
        window.Store.setUser(user);
        try { await window.API.refreshNotifications(); } catch (e) { /* non-fatal */ }
        return user;
    }

    const Auth = {
        // Synchronous: reads the cached user populated on boot / after login.
        current() {
            return window.Store.getUser();
        },
        isAuthed() {
            return !!window.Store.getUser();
        },
        isStudent() {
            const u = this.current();
            return !!u && u.role === "student";
        },
        isOrganizer() {
            const u = this.current();
            return !!u && u.role === "organizer";
        },

        async login(email, password) {
            const e = String(email || "").trim().toLowerCase();
            if (!emailRe.test(e)) throw new Error("Enter a valid email.");
            if (!password) throw new Error("Enter your password.");
            const data = await window.API.authLogin(e, password);
            return afterAuth(data);
        },

        // Self-signup is student-only; organizer accounts are provisioned by an admin.
        async register(data) {
            const name = String(data.name || "").trim();
            const email = String(data.email || "").trim().toLowerCase();
            const password = String(data.password || "");
            if (!name) throw new Error("Name is required.");
            if (!emailRe.test(email)) throw new Error("Enter a valid email.");
            if (password.length < 8) throw new Error("Password must be at least 8 characters.");

            const res = await window.API.authRegister({
                email: email,
                password: password,
                display_name: name,
                role: "student",
            });
            return afterAuth(res);
        },

        async logout() {
            try { await window.API.logout(); } catch (e) { /* ignore */ }
            window.Store.clear();
        },

        // Called once on boot: if a token is present, load the user behind it.
        async restore() {
            if (!window.Store.getToken()) return null;
            try {
                const user = await window.API.me();
                window.Store.setUser(user);
                try { await window.API.refreshNotifications(); } catch (e) { /* non-fatal */ }
                return user;
            } catch (e) {
                window.Store.clear();
                return null;
            }
        },
    };

    window.Auth = Auth;
})();
