(function () {
    // Holds the auth token (persisted) plus the cached current user and the
    // cached notifications feed (so the nav bell can render synchronously).
    const TOKEN_KEY = "se_token";

    let currentUser = null;     // { id, name, email, role, createdAt }
    let notifications = [];      // [{ id, type, eventId, message, read, createdAt }]
    let unread = 0;

    const Store = {
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

    window.Store = Store;
})();
