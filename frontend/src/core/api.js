import { Store } from "./store.js";
import { Bus } from "./bus.js";

async function request(method, path, body) {
    const headers = { Accept: "application/json" };
    const token = Store.getToken();

    if (token) headers.Authorization = "Bearer " + token;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    let res;

    try {
        res = await fetch("/api" + path, {
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
        if (res.status === 401 && path.indexOf("/auth/") !== 0) {
            Store.clear();
            Bus.emit("auth");

            if (location.pathname !== "/login") {
                history.pushState(null, "", "/login");
                import("./router.js").then((m) => m.Router.handle());
            }
        }

        const err = (data && data.error) || {};
        let msg = err.message || "Request failed (" + res.status + ").";

        if (err.details && typeof err.details === "object") {
            const firstField = Object.keys(err.details)[0];
            const firstMsg = firstField && Array.isArray(err.details[firstField]) ? err.details[firstField][0] : null;
            if (firstMsg) msg = firstMsg;
        }

        throw new Error(msg);
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
        organizerStatus: u.organizer_status,
        isAdmin: !!u.is_admin,
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

    if (!Number.isInteger(cap) || cap < 1) throw new Error("Capacity must be a whole number ≥ 1.");
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

export const API = {
    async authLogin(email, password) {
        return request("POST", "/auth/login", { email: email, password: password });
    },

    async authRegister(payload) {
        return request("POST", "/auth/register", payload);
    },

    async logout() {
        await request("POST", "/auth/logout");
    },

    async me() {
        const data = await request("GET", "/users/me");
        return mapUser(data.user);
    },

    mapUser: mapUser,

    async listPublishedEvents() {
        const data = await request("GET", "/events");
        
        return (data.events || []).map(mapEvent);
    },

    async listOrganizerEvents() {
        const data = await request("GET", "/events?mine=true");
        const list = (data.events || []).map(mapEvent);

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

    async refreshNotifications() {
        const data = await request("GET", "/notifications");
        const list = (data.notifications || []).map(mapNotification);

        Store.setNotifications(list);

        return list;
    },
    async listNotifications() {
        return this.refreshNotifications();
    },

    unreadCount() {
        return Store.unreadCount();
    },

    async markAllRead() {
        await request("POST", "/notifications/read");
        const seen = Store.getNotifications().map((n) => Object.assign({}, n, { read: true }));
        Store.setNotifications(seen);
    },

    async adminListPending() {
        const data = await request("GET", "/admin/pending-organizers");

        return (data.pending_organizers || []).map((u) => ({
            id: u.id,
            name: u.display_name,
            email: u.email,
            createdAt: u.created_at,
        }));
    },

    async adminApprove(id) {
        return request("POST", "/admin/organizers/" + id + "/approve");
    },

    async adminReject(id) {
        return request("POST", "/admin/organizers/" + id + "/reject");
    },
};