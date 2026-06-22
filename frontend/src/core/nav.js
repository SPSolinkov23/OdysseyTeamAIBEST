import { Store } from "./store.js";
import { Auth } from "./auth.js";
import { API } from "./api.js";
import { UI } from "./ui.js";
import { Bus } from "./bus.js";
import { Router } from "./router.js";
import { Tour } from "../features/tour.js";
import { refreshNotifications } from "./notifications.js";

const NOTIF_META = {
    RegistrationConfirmed: { icon: "fa-circle-check", color: "emerald" },
    RegistrationWaitlisted: { icon: "fa-hourglass-half", color: "amber" },
    WaitlistPromoted: { icon: "fa-arrow-up-right-dots", color: "sky" },
    RegistrationCancelled: { icon: "fa-circle-minus", color: "slate" },
    EventCancelled: { icon: "fa-calendar-xmark", color: "rose" },
    AccountWelcome: { icon: "fa-hand-sparkles", color: "brand" },
};

function notifMeta(type) {
    return NOTIF_META[type] || { icon: "fa-bell", color: "brand" };
}

function isActive(href, cur) {
    if (href === "/events") return cur === "/events" || cur.indexOf("/events/") === 0;
    if (href === "/organizer") return cur === "/organizer" || cur.indexOf("/organizer/events") === 0;
    return cur === href;
}

function navLink(href, icon, label, cur) {
    const base = "relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-brand-50 hover:text-brand-700";
    const state = isActive(href, cur) ? "bg-brand-50 text-brand-700" : "text-slate-600";
    return '<a href="' + href + '" class="' + base + ' ' + state + '"><i class="fa-solid ' + icon + '"></i> ' + label + "</a>";
}

function bellBadge(n) {
    if (n <= 0) return "";
    return '<span data-bell-badge class="pointer-events-none absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">' + (n > 9 ? "9+" : n) + "</span>";
}

function bell() {
    const n = API.unreadCount();
    return (
        '<div class="relative" id="notif-wrap">' +
        '<button id="bell-btn" type="button" aria-label="Notifications" aria-haspopup="true" class="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-brand-50 hover:text-brand-600">' +
        '<i class="fa-solid fa-bell text-lg"></i>' + bellBadge(n) +
        '</button>' +
        '<div id="notif-panel" class="hidden absolute right-0 top-full z-50 mt-2 w-[calc(100vw-1rem)] max-w-sm sm:w-96 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">' +
        '<div class="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">' +
        '<div class="flex items-center gap-2">' +
        '<span class="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><i class="fa-solid fa-bell text-sm"></i></span>' +
        '<h3 class="font-display text-sm font-bold text-slate-800">Notifications</h3>' +
        '</div>' +
        '<button id="notif-mark-read" type="button" class="hidden inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 transition hover:bg-brand-50">' +
        '<i class="fa-solid fa-check-double"></i> Mark all as read' +
        '</button>' +
        '</div>' +
        '<div id="notif-list" class="max-h-[28rem] overflow-y-auto"></div>' +
        '</div>' +
        '</div>'
    );
}

function notifItem(n) {
    const m = notifMeta(n.type);
    return (
        '<div class="flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 transition hover:bg-slate-50 ' + (n.read ? "" : "bg-brand-50/40") + '">' +
        '<span class="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-' + m.color + "-100 text-" + m.color + '-600"><i class="fa-solid ' + m.icon + '"></i></span>' +
        '<div class="min-w-0 flex-1">' +
        '<p class="text-sm leading-snug text-slate-700">' + UI.escape(n.message) + '</p>' +
        '<p class="mt-0.5 text-xs text-slate-400"><i class="fa-regular fa-clock mr-1"></i>' + UI.escape(UI.fmtRelative(n.createdAt)) + '</p>' +
        '</div>' +
        (n.read ? "" : '<span class="mt-1.5 h-2 w-2 flex-none rounded-full bg-brand-500" aria-label="Unread"></span>') +
        '</div>'
    );
}

function emptyNotif() {
    return (
        '<div class="px-6 py-12 text-center">' +
        '<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-xl text-brand-500"><i class="fa-solid fa-bell-slash"></i></div>' +
        '<h4 class="font-display text-sm font-semibold text-slate-800">No notifications yet</h4>' +
        '<p class="mt-1 text-xs text-slate-500">Confirmations, promotions and changes will appear here.</p>' +
        '</div>'
    );
}

function loadingNotif() {
    return (
        '<div class="space-y-3 p-4">' +
        Array.from({ length: 3 }).map(() =>
            '<div class="flex items-start gap-3">' +
            '<div class="h-9 w-9 flex-none animate-pulse rounded-xl bg-slate-100"></div>' +
            '<div class="flex-1 space-y-2">' +
            '<div class="h-3 w-4/5 animate-pulse rounded bg-slate-100"></div>' +
            '<div class="h-3 w-2/5 animate-pulse rounded bg-slate-100"></div>' +
            '</div></div>'
        ).join("") +
        '</div>'
    );
}

function renderNotifList() {
    const list = document.getElementById("notif-list");
    if (!list) return;
    const items = Store.getNotifications();
    list.innerHTML = items.length ? items.map(notifItem).join("") : emptyNotif();
    const mark = document.getElementById("notif-mark-read");
    if (mark) mark.classList.toggle("hidden", API.unreadCount() === 0);
}

function avatar(user) {
    const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
    return (
        '<div class="relative" id="user-menu"><button id="user-btn" class="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition hover:bg-slate-100">' +
        '<span class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-sky-500 text-sm font-bold text-white">' + UI.escape(initials) + "</span>" +
        '<span class="hidden text-left sm:block"><span class="block text-sm font-semibold leading-tight text-slate-800">' + UI.escape(user.name.split(" ")[0]) + '</span><span class="block text-[11px] leading-tight text-slate-400">' + (user.role === "organizer" ? "Organizer" : "Student") + "</span></span>" +
        '<i class="fa-solid fa-chevron-down text-xs text-slate-400"></i></button>' +
        '<div id="user-dropdown" class="absolute right-0 z-50 mt-2 hidden w-56 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-soft">' +
        '<div class="border-b border-slate-100 px-3 py-2"><div class="text-sm font-semibold text-slate-800">' + UI.escape(user.name) + '</div><div class="truncate text-xs text-slate-500">' + UI.escape(user.email) + "</div></div>" +
        '<button id="tour-btn" class="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><i class="fa-solid fa-route w-4"></i> Replay the tour</button>' +
        '<button id="logout-btn" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"><i class="fa-solid fa-right-from-bracket w-4"></i> Sign out</button>' +
        "</div></div>"
    );
}

export function renderNav() {
    const center = document.getElementById("nav-center");
    const right = document.getElementById("nav-right");
    const mobile = document.getElementById("nav-mobile");
    if (!center || !right || !mobile) return;

    const user = Auth.current();
    const cur = location.pathname || "/";

    if (user) {
        const links =
            user.role === "organizer"
                ? [["/organizer", "fa-gauge-high", "Dashboard"], ["/organizer/new", "fa-plus", "New event"]]
                : [["/events", "fa-compass", "Events"], ["/my-registrations", "fa-ticket", "My registrations"]];
        center.innerHTML = '<nav class="hidden items-center gap-1 md:flex">' + links.map((l) => navLink(l[0], l[1], l[2], cur)).join("") + "</nav>";
        right.innerHTML = '<div class="flex items-center gap-1.5">' + bell() + avatar(user) + '<button id="burger" class="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 md:hidden"><i class="fa-solid fa-bars text-lg"></i></button></div>';
        mobile.innerHTML = '<div id="mobile-menu" class="hidden border-t border-slate-200 bg-white px-4 py-3 md:hidden"><nav class="flex flex-col gap-1">' + links.map((l) => navLink(l[0], l[1], l[2], cur)).join("") + "</nav></div>";
    } else {
        center.innerHTML = "";
        right.innerHTML = '<div class="flex items-center gap-2"><a href="/login" class="btn-ghost"><i class="fa-solid fa-right-to-bracket"></i> Sign in</a><a href="/register" class="btn-primary">Create account</a></div>';
        mobile.innerHTML = "";
    }

    wireNav();
}

export function updateBell() {
    const btn = document.getElementById("bell-btn");
    if (!btn) return;
    const n = API.unreadCount();
    const existing = btn.querySelector("[data-bell-badge]");
    if (n > 0) {
        if (existing) existing.outerHTML = bellBadge(n);
        else btn.insertAdjacentHTML("beforeend", bellBadge(n));
    } else if (existing) {
        existing.remove();
    }
    const panel = document.getElementById("notif-panel");
    if (panel && !panel.classList.contains("hidden")) renderNotifList();
}

async function openNotifPanel() {
    const panel = document.getElementById("notif-panel");
    const list = document.getElementById("notif-list");
    if (!panel || !list) return;
    if (Store.getNotifications().length === 0) list.innerHTML = loadingNotif();
    else renderNotifList();
    panel.classList.remove("hidden");
    try {
        await refreshNotifications();
        renderNotifList();
    } catch (e) { }
    if (API.unreadCount() > 0) {
        setTimeout(async () => {
            if (panel.classList.contains("hidden")) return;
            try {
                await API.markAllRead();
                Bus.emit("notifications");
            } catch (e) { }
        }, 1200);
    }
}

function closeNotifPanel() {
    const panel = document.getElementById("notif-panel");
    if (panel) panel.classList.add("hidden");
}

function wireNav() {
    const burger = document.getElementById("burger");
    if (burger) burger.addEventListener("click", () => document.getElementById("mobile-menu").classList.toggle("hidden"));

    const bellBtn = document.getElementById("bell-btn");
    if (bellBtn) {
        bellBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const panel = document.getElementById("notif-panel");
            const userDd = document.getElementById("user-dropdown");
            if (userDd) userDd.classList.add("hidden");
            if (panel.classList.contains("hidden")) openNotifPanel();
            else closeNotifPanel();
        });
        const mark = document.getElementById("notif-mark-read");
        if (mark) {
            mark.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (API.unreadCount() === 0) return;
                try {
                    await API.markAllRead();
                    Bus.emit("notifications");
                } catch (err) { }
            });
        }
    }

    const userBtn = document.getElementById("user-btn");
    if (userBtn) {
        const dd = document.getElementById("user-dropdown");
        userBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            closeNotifPanel();
            dd.classList.toggle("hidden");
        });
        document.getElementById("tour-btn").addEventListener("click", () => {
            dd.classList.add("hidden");
            const home = Auth.isOrganizer() ? "/organizer" : "/events";
            const elsewhere = location.pathname !== home;
            if (elsewhere) Router.navigate(home);
            setTimeout(() => Tour.replay(), elsewhere ? 400 : 0);
        });
        document.getElementById("logout-btn").addEventListener("click", async () => {
            await Auth.logout();
            UI.toast("Signed out. See you soon! 👋", "info");
            Bus.emit("auth");
            Router.navigate("/login");
        });
    }
}

document.addEventListener("click", (e) => {
    const dd = document.getElementById("user-dropdown");
    if (dd) dd.classList.add("hidden");

    const panel = document.getElementById("notif-panel");
    if (panel && !panel.classList.contains("hidden")) {
        const wrap = document.getElementById("notif-wrap");
        if (wrap && !wrap.contains(e.target)) panel.classList.add("hidden");
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const dd = document.getElementById("user-dropdown");
    if (dd) dd.classList.add("hidden");
    closeNotifPanel();
});
