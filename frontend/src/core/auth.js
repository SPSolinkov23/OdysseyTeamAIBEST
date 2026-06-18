import { Store } from "./store.js";
import { API } from "./api.js";

const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function afterAuth(data) {
    Store.setToken(data.token);
    const user = API.mapUser(data.user);
    Store.setUser(user);
    try { await API.refreshNotifications(); } catch (e) { }
    return user;
}

export const Auth = {
    current() {
        return Store.getUser();
    },
    isAuthed() {
        return !!Store.getUser();
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
        const data = await API.authLogin(e, password);
        return afterAuth(data);
    },

    async register(data) {
        const name = String(data.name || "").trim();
        const email = String(data.email || "").trim().toLowerCase();
        const password = String(data.password || "");
        if (!name) throw new Error("Name is required.");
        if (!emailRe.test(email)) throw new Error("Enter a valid email.");
        if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password))
            throw new Error("Password must be at least 8 characters long and contain at least one uppercase letter, one number, and one special character (@$!%*?&).");

        const res = await API.authRegister({
            email: email,
            password: password,
            display_name: name,
            role: "student",
        });
        return afterAuth(res);
    },

    async logout() {
        try { await API.logout(); } catch (e) { }
        Store.clear();
    },

    async restore() {
        if (!Store.getToken()) return null;
        try {
            const user = await API.me();
            Store.setUser(user);
            try { await API.refreshNotifications(); } catch (e) { }
            return user;
        } catch (e) {
            Store.clear();
            return null;
        }
    },
};
