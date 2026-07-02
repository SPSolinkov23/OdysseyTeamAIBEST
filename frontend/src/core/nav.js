import { Store } from "./store.js";
import { Auth } from "./auth.js";
import { API } from "./api.js";
import { UI } from "./ui.js";
import { Bus } from "./bus.js";
import { Router } from "./router.js";
import { Tour } from "../features/tour.js";
import { refreshNotifications } from "./notifications.js";
import { I18n } from "./i18n.js";
import { Theme } from "./theme.js";

function themeToggle() {
    const dark = Theme.get() === "dark";
    return "<button type=\"button\" id=\"theme-toggle\" aria-label=\"Toggle theme\" class=\"flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-brand-50 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-brand-400\">" +
        "<i class=\"fa-solid " + (dark ? "fa-sun" : "fa-moon") + " text-lg\"></i></button>";
}

function prefersReducedMotion() {
    return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

async function setTheme(theme, origin) {
    if (theme === Theme.get()) return;
    const applyVisual = () => Theme.set(theme);
    if (typeof document.startViewTransition === "function" && !prefersReducedMotion()) {
        const root = document.documentElement;
        const x = origin ? origin.x : window.innerWidth - 28;
        const y = origin ? origin.y : 28;
        const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        root.style.setProperty("--vt-x", x + "px");
        root.style.setProperty("--vt-y", y + "px");
        root.style.setProperty("--vt-r", r + "px");
        root.classList.add("vt-theme");
        const transition = document.startViewTransition(applyVisual);
        transition.finished.finally(() => root.classList.remove("vt-theme"));
    } else {
        applyVisual();
    }
    const u = Auth.current();
    if (u) {
        try {
            const updated = await API.updateTheme(theme);
            Store.setUser(updated);
        } catch (e) { }
    }
}

function langToggle() {
    const cur = I18n.get();
    const btn = (code) =>
        "<button type=\"button\" data-lang=\"" + code + "\" class=\"rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase transition " +
        (cur === code ? "bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200") + "\">" + code + "</button>";
    return "<div class=\"inline-flex items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-700/50\">" + btn("bg") + btn("en") + "</div>";
}

async function setLang(lang) {
    if (lang === I18n.get()) return;
    I18n.set(lang);
    const u = Auth.current();
    if (u) {
        try {
            const updated = await API.updateLanguage(lang);
            Store.setUser(updated);
        } catch (e) { }
    }
}

const NOTIF_META = {
    RegistrationConfirmed: { icon: "fa-circle-check", color: "emerald" },
    RegistrationWaitlisted: { icon: "fa-hourglass-half", color: "amber" },
    WaitlistPromoted: { icon: "fa-arrow-up-right-dots", color: "sky" },
    RegistrationCancelled: { icon: "fa-circle-minus", color: "slate" },
    EventCancelled: { icon: "fa-calendar-xmark", color: "rose" },
    AccountWelcome: { icon: "fa-hand-sparkles", color: "brand" },
    OrganizerPending: { icon: "fa-user-clock", color: "amber" },
    OrganizerApproved: { icon: "fa-user-check", color: "emerald" },
    OrganizerRejected: { icon: "fa-user-xmark", color: "rose" },
    OrganizerRequestSubmitted: { icon: "fa-user-plus", color: "brand" },
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
    const base = "relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/30 dark:hover:text-brand-400";
    const state = isActive(href, cur) ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400" : "text-slate-600 dark:text-slate-300";
    return "<a href=\"" + href + "\" class=\"" + base + " " + state + "\"><i class=\"fa-solid " + icon + "\"></i> " + label + "</a>";
}

function mobileLink(href, icon, label, cur) {
    const active = isActive(href, cur);
    const wrap = active
        ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
        : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800";
    const badge = active
        ? "bg-brand-600 text-white"
        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
    return (
        "<a href=\"" + href + "\" data-mobile-link class=\"m-link group flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-semibold transition " + wrap + "\">" +
        "<span class=\"flex h-10 w-10 flex-none items-center justify-center rounded-xl " + badge + "\"><i class=\"fa-solid " + icon + "\"></i></span>" +
        "<span class=\"flex-1\">" + label + "</span>" +
        "<i class=\"fa-solid fa-chevron-right text-xs " + (active ? "text-brand-400" : "text-slate-300 dark:text-slate-600") + "\"></i></a>"
    );
}

function bellBadge(n) {
    if (n <= 0) return "";
    return "<span data-bell-badge class=\"pointer-events-none absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white\">" + (n > 9 ? "9+" : n) + "</span>";
}

function bell() {
    const n = API.unreadCount();
    return (
        "<div class=\"relative\" id=\"notif-wrap\">" +
        "<button id=\"bell-btn\" type=\"button\" aria-label=\"Notifications\" aria-haspopup=\"true\" class=\"relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-brand-50 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-brand-400\">" +
        "<i class=\"fa-solid fa-bell text-lg\"></i>" + bellBadge(n) +
        "</button>" +
        "<div id=\"notif-panel\" class=\"hidden fixed inset-x-2 top-[4.25rem] z-50 origin-top overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 dark:border-slate-700 dark:bg-slate-800\">" +
        "<div class=\"flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700\">" +
        "<div class=\"flex items-center gap-2\">" +
        "<span class=\"flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400\"><i class=\"fa-solid fa-bell text-sm\"></i></span>" +
        "<h3 class=\"font-display text-sm font-bold text-slate-800 dark:text-slate-100\">" + I18n.t("nav.notifications") + "</h3>" +
        "</div>" +
        "<button id=\"notif-mark-read\" type=\"button\" class=\"hidden inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-slate-700\">" +
        "<i class=\"fa-solid fa-check-double\"></i> " + I18n.t("nav.markAllRead") +
        "</button>" +
        "</div>" +
        "<div id=\"notif-list\" class=\"max-h-[70vh] overflow-y-auto sm:max-h-[28rem]\"></div>" +
        "</div>" +
        "</div>"
    );
}

function notifItem(n) {
    const m = notifMeta(n.type);
    return (
        "<div class=\"flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50 " + (n.read ? "" : "bg-brand-50/40 dark:bg-brand-900/20") + "\">" +
        "<span class=\"flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-" + m.color + "-100 text-" + m.color + "-600\"><i class=\"fa-solid " + m.icon + "\"></i></span>" +
        "<div class=\"min-w-0 flex-1\">" +
        "<p class=\"text-sm leading-snug text-slate-700 dark:text-slate-200\">" + UI.escape(UI.notifText(n)) + "</p>" +
        "<p class=\"mt-0.5 text-xs text-slate-400 dark:text-slate-500\"><i class=\"fa-regular fa-clock mr-1\"></i>" + UI.escape(UI.fmtRelative(n.createdAt)) + "</p>" +
        "</div>" +
        (n.read ? "" : "<span class=\"mt-1.5 h-2 w-2 flex-none rounded-full bg-brand-500\" aria-label=\"Unread\"></span>") +
        "</div>"
    );
}

function emptyNotif() {
    return (
        "<div class=\"px-6 py-12 text-center\">" +
        "<div class=\"mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-xl text-brand-500 dark:bg-brand-900/30 dark:text-brand-400\"><i class=\"fa-solid fa-bell-slash\"></i></div>" +
        "<h4 class=\"font-display text-sm font-semibold text-slate-800 dark:text-slate-100\">" + I18n.t("nav.noNotifTitle") + "</h4>" +
        "<p class=\"mt-1 text-xs text-slate-500 dark:text-slate-400\">" + I18n.t("nav.noNotifText") + "</p>" +
        "</div>"
    );
}

function loadingNotif() {
    return (
        "<div class=\"space-y-3 p-4\">" +
        Array.from({ length: 3 }).map(() =>
            "<div class=\"flex items-start gap-3\">" +
            "<div class=\"h-9 w-9 flex-none animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700\"></div>" +
            "<div class=\"flex-1 space-y-2\">" +
            "<div class=\"h-3 w-4/5 animate-pulse rounded bg-slate-100 dark:bg-slate-700\"></div>" +
            "<div class=\"h-3 w-2/5 animate-pulse rounded bg-slate-100 dark:bg-slate-700\"></div>" +
            "</div></div>",
        ).join("") +
        "</div>"
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
        "<div class=\"relative\" id=\"user-menu\"><button id=\"user-btn\" class=\"flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-slate-700\">" +
        "<span class=\"flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-sky-500 text-sm font-bold text-white\">" + UI.escape(initials) + "</span>" +
        "<span class=\"hidden text-left sm:block\"><span class=\"block text-sm font-semibold leading-tight text-slate-800 dark:text-slate-100\">" + UI.escape(user.name.split(" ")[0]) + "</span><span class=\"block text-[11px] leading-tight text-slate-400 dark:text-slate-500\">" + (user.role === "organizer" ? I18n.t("nav.roleOrganizer") : I18n.t("nav.roleStudent")) + "</span></span>" +
        "<i class=\"fa-solid fa-chevron-down hidden text-xs text-slate-400 sm:inline-block\"></i></button>" +
        "<div id=\"user-dropdown\" class=\"absolute right-0 z-50 mt-2 hidden w-56 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-soft dark:border-slate-700 dark:bg-slate-800\">" +
        "<div class=\"border-b border-slate-100 px-3 py-2 dark:border-slate-700\"><div class=\"text-sm font-semibold text-slate-800 dark:text-slate-100\">" + UI.escape(user.name) + "</div><div class=\"truncate text-xs text-slate-500 dark:text-slate-400\">" + UI.escape(user.email) + "</div></div>" +
        "<button id=\"tour-btn\" class=\"mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700\"><i class=\"fa-solid fa-route w-4\"></i> " + I18n.t("nav.replayTour") + "</button>" +
        "<button id=\"logout-btn\" class=\"flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20\"><i class=\"fa-solid fa-right-from-bracket w-4\"></i> " + I18n.t("nav.signOut") + "</button>" +
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
                ? [["/organizer/new", "fa-plus", I18n.t("nav.newEvent")], ["/events", "fa-compass", I18n.t("nav.events")], ["/my-registrations", "fa-ticket", I18n.t("nav.myRegistrations")], ["/organizer", "fa-gauge-high", I18n.t("nav.dashboard")]]
                : [["/events", "fa-compass", I18n.t("nav.events")], ["/my-registrations", "fa-ticket", I18n.t("nav.myRegistrations")]];
        if (user.isAdmin) links.push(["/admin", "fa-shield-halved", I18n.t("nav.admin")]);
        center.innerHTML = "<nav class=\"hidden items-center gap-1 md:flex\">" + links.map((l) => navLink(l[0], l[1], l[2], cur)).join("") + "</nav>";
        right.innerHTML = "<div class=\"flex items-center gap-1 sm:gap-1.5\">" + themeToggle() + "<span class=\"hidden sm:inline-flex\">" + langToggle() + "</span>" + bell() + avatar(user) + "<button id=\"burger\" type=\"button\" aria-label=\"Menu\" aria-expanded=\"false\" aria-controls=\"mobile-menu\" class=\"flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 md:hidden\"><i class=\"fa-solid fa-bars text-lg\"></i></button></div>";
        mobile.innerHTML =
            "<div id=\"mobile-menu\" class=\"md:hidden\"><nav class=\"container-app flex flex-col gap-1 border-t border-slate-200/70 bg-white/95 pb-4 pt-3 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/95\">" +
            links.map((l) => mobileLink(l[0], l[1], l[2], cur)).join("") +
            "<div class=\"my-1.5 h-px bg-slate-100 dark:bg-slate-800\"></div>" +
            "<div class=\"flex items-center justify-between px-1.5 py-1\"><span class=\"text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500\">" + I18n.t("nav.language") + "</span>" + langToggle() + "</div>" +
            "</nav></div>";
    } else {
        center.innerHTML = "";
        right.innerHTML = "<div class=\"flex items-center gap-1.5 sm:gap-2\">" + themeToggle() + "<span class=\"hidden sm:inline-flex\">" + langToggle() + "</span><a href=\"/login\" class=\"btn-ghost hidden whitespace-nowrap sm:inline-flex\"><i class=\"fa-solid fa-right-to-bracket\"></i> " + I18n.t("nav.signIn") + "</a><a href=\"/register\" class=\"btn-primary btn-sm whitespace-nowrap sm:px-4 sm:py-2.5 sm:text-sm sm:rounded-xl\">" + I18n.t("nav.createAccount") + "</a></div>";
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

function setMobileMenu(open) {
    const menu = document.getElementById("mobile-menu");
    const burger = document.getElementById("burger");
    if (menu) menu.classList.toggle("is-open", open);
    if (burger) {
        burger.setAttribute("aria-expanded", open ? "true" : "false");
        const icon = burger.querySelector("i");
        if (icon) icon.className = "fa-solid " + (open ? "fa-xmark" : "fa-bars") + " text-lg";
    }
}

function wireNav() {
    const themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) {
        themeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const r = themeBtn.getBoundingClientRect();
            setTheme(Theme.get() === "dark" ? "light" : "dark", { x: r.left + r.width / 2, y: r.top + r.height / 2 });
        });
    }

    document.querySelectorAll("[data-lang]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            setLang(btn.getAttribute("data-lang"));
        });
    });

    const burger = document.getElementById("burger");
    if (burger) {
        burger.addEventListener("click", (e) => {
            e.stopPropagation();
            const menu = document.getElementById("mobile-menu");
            setMobileMenu(menu && !menu.classList.contains("is-open"));
        });
        document.querySelectorAll("[data-mobile-link]").forEach((a) => a.addEventListener("click", () => setMobileMenu(false)));
    }

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
            UI.toast(I18n.t("nav.signedOutToast"), "info");
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

    const menu = document.getElementById("mobile-menu");
    if (menu && menu.classList.contains("is-open")) {
        const burger = document.getElementById("burger");
        if (!menu.contains(e.target) && (!burger || !burger.contains(e.target))) setMobileMenu(false);
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const dd = document.getElementById("user-dropdown");
    if (dd) dd.classList.add("hidden");
    closeNotifPanel();
    setMobileMenu(false);
});
