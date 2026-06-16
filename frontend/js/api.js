(function () {
    // Real backend client. The SPA is served by the API, so all paths are same-origin.
    // Translates the backend's snake_case + lowercase-enum contract into the
    // camelCase / UPPERCASE shape the views were written against.

    async function request(method, path, body) {
        const headers = { Accept: "application/json" };
        const token = window.Store.getToken();
        if (token) headers.Authorization = "Bearer " + token;
        if (body !== undefined) headers["Content-Type"] = "application/json";

        let res;
        try {
            res = await fetch(path, {
                method: method,
                headers: headers,
                body: body !== undefined ? JSON.stringify(body) : undefined,
            });
        } catch (e) {
            throw new Error("Can't reach the server. Check your connection.");
        }

        const text = await res.text();
        let data = null;
        if (text) {
            try { data = JSON.parse(text); } catch (e) { data = null; }
        }

        if (!res.ok) {
            // A 401 on a normal endpoint means the session expired — drop it and
            // bounce to login. (Login/register 401s are real "wrong credentials".)
            if (res.status === 401 && path.indexOf("/auth/") !== 0) {
                window.Store.clear();
                if (window.Bus) window.Bus.emit("auth");
                if (location.hash !== "#/login") location.hash = "#/login";
            }
            const err = (data && data.error) || {};
            throw new Error(err.message || "Request failed (" + res.status + ").");
        }

        return data;
    }

    function up(s) {
        return String(s == null ? "" : s).toUpperCase();
    }

    function toIso(localValue) {
        return localValue ? new Date(localValue).toISOString() : null;
    }

    function mapUser(u) {
        if (!u) return null;
        return {
            id: u.id,
            name: u.display_name,
            email: u.email,
            role: u.role,
            createdAt: u.created_at,
        };
    }

    function mapEvent(e) {
        const confirmed = e.confirmed_count || 0;
        const seats = e.seats_available != null ? e.seats_available : Math.max(0, (e.capacity || 0) - confirmed);
        return {
            id: e.id,
            organizerId: e.organizer_id,
            organizerName: e.organizer_name || "—",
            title: e.title || "",
            description: e.description || "",
            category: e.category || "Event",
            url: e.url || "",
            startsAt: e.starts_at,
            endsAt: e.ends_at || e.starts_at,
            location: e.location || "",
            capacity: e.capacity || 0,
            status: up(e.status),
            createdAt: e.created_at,
            updatedAt: e.updated_at,
            confirmedCount: confirmed,
            waitlistCount: e.waitlist_count || 0,
            spotsLeft: Math.max(0, seats),
            isFull: seats <= 0,
            my: e.my_registration
                ? { id: e.my_registration.id, status: up(e.my_registration.status), position: e.my_registration.waitlist_position || 0 }
                : null,
        };
    }

    function mapSummary(ev) {
        if (!ev) return null;
        return {
            id: ev.id,
            title: ev.title || "",
            startsAt: ev.starts_at,
            endsAt: ev.ends_at || ev.starts_at,
            location: ev.location || "",
            category: ev.category || "Event",
            status: up(ev.status),
        };
    }

    function mapAttendee(a) {
        return {
            registration: { id: a.id, registeredAt: a.created_at },
            user: { id: a.user_id, name: a.user_name, email: a.email },
            position: a.waitlist_position || 0,
        };
    }

    function mapNotification(n) {
        return {
            id: n.id,
            type: n.type,
            eventId: n.event_id,
            message: n.message,
            read: !!n.read,
            createdAt: n.created_at,
        };
    }

    function eventBody(data) {
        if (!data.title || !data.title.trim()) throw new Error("Title is required.");
        const cap = parseInt(data.capacity, 10);
        if (!Number.isInteger(cap) || cap < 1) throw new Error("Capacity must be a whole number \u2265 1.");
        if (!data.startsAt) throw new Error("Start date and time are required.");

        const body = {
            title: data.title.trim(),
            description: (data.description || "").trim(),
            category: (data.category || "Event").trim(),
            location: (data.location || "").trim(),
            url: (data.url || "").trim(),
            capacity: cap,
            starts_at: toIso(data.startsAt),
        };
        body.ends_at = data.endsAt ? toIso(data.endsAt) : null;
        return body;
    }

    const API = {
        // --- auth (used by auth.js) ---
        async authLogin(email, password) {
            return request("POST", "/auth/login", { email: email, password: password });
        },
        async authRegister(payload) {
            return request("POST", "/auth/register", payload);
        },
        async logout() {
            try { await request("POST", "/auth/logout"); } catch (e) { /* stateless; ignore */ }
        },
        async me() {
            const data = await request("GET", "/users/me");
            return mapUser(data.user);
        },

        mapUser: mapUser,

        // --- events ---
        async listPublishedEvents() {
            const data = await request("GET", "/events");
            return (data.events || []).map(mapEvent);
        },
        async listOrganizerEvents() {
            const data = await request("GET", "/events?mine=true");
            const list = (data.events || []).map(mapEvent);
            // Dashboard wants newest-first by creation.
            return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        },
        async getEvent(id) {
            const data = await request("GET", "/events/" + id);
            return mapEvent(data.event);
        },
        async createEvent(_orgId, data) {
            const res = await request("POST", "/events", eventBody(data));
            return mapEvent(res.event);
        },
        async updateEvent(_orgId, id, data) {
            const res = await request("PATCH", "/events/" + id, eventBody(data));
            return mapEvent(res.event);
        },
        async publishEvent(_orgId, id) {
            const res = await request("POST", "/events/" + id + "/publish");
            return mapEvent(res.event);
        },
        async cancelEvent(_orgId, id) {
            const res = await request("POST", "/events/" + id + "/cancel");
            return mapEvent(res.event);
        },

        // --- registrations ---
        async registerForEvent(_userId, eventId) {
            const r = await request("POST", "/events/" + eventId + "/registrations");
            return { status: up(r.status), position: r.waitlist_position || 0 };
        },
        async cancelRegistration(_userId, regId) {
            const r = await request("DELETE", "/registrations/" + regId);
            return { promoted: !!(r && r.promoted_registration) };
        },
        async myRegistrations() {
            const data = await request("GET", "/registrations/me");
            return (data.registrations || []).map((r) => ({
                registration: { id: r.id, eventId: r.event_id, status: up(r.status) },
                event: mapSummary(r.event),
                position: r.waitlist_position || 0,
            })).filter((x) => x.event);
        },
        async getEventAttendees(eventId) {
            const data = await request("GET", "/events/" + eventId + "/registrations");
            return {
                confirmed: (data.registrations || []).map(mapAttendee),
                waitlist: (data.waitlist || []).map(mapAttendee),
            };
        },

        // --- notifications ---
        async refreshNotifications() {
            const data = await request("GET", "/notifications");
            const list = (data.notifications || []).map(mapNotification);
            window.Store.setNotifications(list);
            return list;
        },
        async listNotifications() {
            return this.refreshNotifications();
        },
        unreadCount() {
            return window.Store.unreadCount();
        },
        async markAllRead() {
            await request("POST", "/notifications/read");
            const seen = window.Store.getNotifications().map((n) => Object.assign({}, n, { read: true }));
            window.Store.setNotifications(seen);
        },
    };

    window.API = API;
})();
