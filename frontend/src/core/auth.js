import { Store } from "./store.js";
import { API } from "./api.js";
import { I18n } from "./i18n.js";
import { Theme } from "./theme.js";

const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function afterAuth(data) {
    Store.setToken(data.token);
    const user = API.mapUser(data.user);
    Store.setUser(user);
    if (user.language && user.language !== I18n.get()) I18n.set(user.language);
    if (user.theme && user.theme !== Theme.get()) Theme.set(user.theme);
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
        if (!emailRe.test(e)) throw new Error(I18n.t("auth.err.invalidEmail"));
        if (!password) throw new Error(I18n.t("auth.err.enterPassword"));
        const data = await API.authLogin(e, password);
        return afterAuth(data);
    },

    async register(data) {
        const name = String(data.name || "").trim();
        const email = String(data.email || "").trim().toLowerCase();
        const password = String(data.password || "");
        if (!name) throw new Error(I18n.t("auth.err.nameRequired"));
        if (!emailRe.test(email)) throw new Error(I18n.t("auth.err.invalidEmail"));
        if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password))
            throw new Error(I18n.t("auth.err.passwordRules"));

        const role = data.role === "organizer" ? "organizer" : "student";

        const res = await API.authRegister({
            email: email,
            password: password,
            display_name: name,
            role: role,
            language: I18n.get(),
            theme: Theme.get(),
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
            if (user.theme && user.theme !== Theme.get()) Theme.set(user.theme);
            try { await API.refreshNotifications(); } catch (e) { }
            return user;
        } catch (e) {
            Store.clear();
            return null;
        }
    },
};
