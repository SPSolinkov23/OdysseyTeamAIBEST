import { Auth } from "../core/auth.js";
import { scrollToEl } from "../core/scroll.js";

const TOURS_KEY = "odyssey_tours_v1";

const STEPS = {
    student: [
        { el: '#nav a[href="#/"]', placement: "bottom-start", icon: "fa-hand-sparkles", title: "Welcome! 👋", text: "This is the school events hub. Let us show you the basics in 30 seconds." },
        { el: '#nav a[href="#/events"]', placement: "bottom", icon: "fa-compass", title: "Events", text: "Browse all of the school's published events here." },
        { el: "#ev-search", placement: "bottom", icon: "fa-magnifying-glass", title: "Search & filters", text: "Quickly find an event by keyword or category." },
        { el: "[data-register]", placement: "top", icon: "fa-bolt", title: "Registration", text: "Register with one tap. If the event is full, you join a fair FIFO waitlist." },
        { el: '#nav a[href="#/my-registrations"]', placement: "bottom", icon: "fa-ticket", title: "My registrations", text: "Track your status and your position on the waitlist." },
        { el: '#bell-btn', placement: "bottom-end", icon: "fa-bell", title: "Notifications", text: "Open the bell to see real-time updates: confirmations, promotions and changes." },
    ],
    organizer: [
        { el: '#nav a[href="#/"]', placement: "bottom-start", icon: "fa-hand-sparkles", title: "Welcome! 👋", text: "Manage your events from here. Here's a quick tour." },
        { el: '#nav a[href="#/organizer/new"]', placement: "bottom", icon: "fa-plus", title: "New event", text: "Create an event as a draft with a live preview before you publish it." },
        { el: "[data-publish]", placement: "top", icon: "fa-paper-plane", title: "Publishing", text: "Publish the draft to make it visible to students." },
        { el: '[href^="#/organizer/events/"]', placement: "top", icon: "fa-users", title: "Registrations & waitlist", text: "See confirmed registrations and the ordered waitlist for each of your events." },
        { el: '#bell-btn', placement: "bottom-end", icon: "fa-bell", title: "Notifications", text: "Open the bell to see event-driven notifications in real time." },
    ],
};

let steps = [];
let idx = 0;
let active = false;
let instance = null;
let user = null;

function load() {
    try {
        return JSON.parse(localStorage.getItem(TOURS_KEY)) || {};
    } catch (e) {
        return {};
    }
}
function completed(u) {
    return !!load()[u.id];
}
function markDone(u) {
    const map = load();
    map[u.id] = true;
    localStorage.setItem(TOURS_KEY, JSON.stringify(map));
}

function visible(el) {
    return el && el.offsetParent !== null;
}

function destroy() {
    if (instance) {
        instance.destroy();
        instance = null;
    }
    document.querySelectorAll(".tour-active").forEach((e) => e.classList.remove("tour-active"));
    const ov = document.getElementById("tour-overlay");
    if (ov) ov.remove();
}

function finish() {
    destroy();
    active = false;
    if (user) markDone(user);
}

function buildContent(step) {
    const isLast = idx === steps.length - 1;
    const wrap = document.createElement("div");
    wrap.className = "w-72 p-1";
    wrap.innerHTML =
        '<div class="flex items-center gap-2.5"><span class="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-100 text-brand-600"><i class="fa-solid ' + step.icon + '"></i></span>' +
        '<h4 class="font-display text-sm font-bold text-slate-800">' + step.title + "</h4></div>" +
        '<p class="mt-2 text-sm leading-relaxed text-slate-600">' + step.text + "</p>" +
        '<div class="mt-4 flex items-center justify-between">' +
        '<button data-skip class="text-xs font-medium text-slate-400 hover:text-slate-600">Skip</button>' +
        '<div class="flex items-center gap-1.5">' +
        steps.map((_, i) => '<span class="h-1.5 rounded-full transition-all ' + (i === idx ? "w-4 bg-brand-500" : "w-1.5 bg-slate-200") + '"></span>').join("") +
        "</div>" +
        '<div class="flex gap-1.5">' +
        (idx > 0 ? '<button data-prev class="btn-secondary btn-sm">Back</button>' : "") +
        '<button data-next class="btn-primary btn-sm">' + (isLast ? "Done" : "Next") + "</button>" +
        "</div></div>";

    wrap.querySelector("[data-skip]").addEventListener("click", finish);
    const prev = wrap.querySelector("[data-prev]");
    if (prev) prev.addEventListener("click", () => go(idx - 1));
    wrap.querySelector("[data-next]").addEventListener("click", () => (isLast ? finish() : go(idx + 1)));
    return wrap;
}

function go(next) {
    destroy();
    idx = next;
    if (idx < 0 || idx >= steps.length) return finish();
    const step = steps[idx];
    const el = document.querySelector(step.el);
    if (!visible(el)) {
        if (idx >= steps.length - 1) return finish();
        return go(idx + 1);
    }
    el.classList.add("tour-active");
    const overlay = document.createElement("div");
    overlay.id = "tour-overlay";
    overlay.addEventListener("click", finish);
    document.body.appendChild(overlay);
    scrollToEl(el);

    setTimeout(() => {
        import("tippy.js").then(({ default: tippy }) => {
            if (!active) return;
            instance = tippy(el, {
                content: buildContent(step),
                allowHTML: true,
                interactive: true,
                trigger: "manual",
                placement: step.placement || "bottom",
                appendTo: document.body,
                theme: "odyssey",
                animation: "shift-away",
                offset: [0, 14],
                zIndex: 100000,
                maxWidth: "none",
                popperOptions: { strategy: "fixed", modifiers: [{ name: "preventOverflow", options: { padding: 12 } }] },
            });
            instance.show();
        });
    }, 420);
}

export const Tour = {
    start(u) {
        if (active) return;
        const list = STEPS[u.role];
        if (!list) return;
        user = u;
        steps = list;
        idx = 0;
        active = true;
        go(0);
    },
    maybeStart(u) {
        if (!u || active || completed(u)) return;
        setTimeout(() => {
            if (!completed(u)) this.start(u);
        }, 650);
    },
    replay() {
        const u = Auth.current();
        if (!u) return;
        const map = load();
        delete map[u.id];
        localStorage.setItem(TOURS_KEY, JSON.stringify(map));
        this.start(u);
    },
    isActive() {
        return active;
    },
};