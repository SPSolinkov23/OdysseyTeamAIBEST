const TOKEN_KEY = "odyssey_school_events_localstorage_key";

let currentUser = null;
let notifications = [];
let unread = 0;

export const Store = {
    getToken() {
        return localStorage.getItem(TOKEN_KEY);
    },
    setToken(token) {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
    },

    getUser() {
        return currentUser;
    },
    setUser(user) {
        currentUser = user || null;
    },

    getNotifications() {
        return notifications;
    },
    setNotifications(list) {
        notifications = Array.isArray(list) ? list : [];
        unread = notifications.filter((n) => !n.read).length;
    },
    unreadCount() {
        return unread;
    },

    clear() {
        currentUser = null;
        notifications = [];
        unread = 0;
        this.setToken(null);
    },
};