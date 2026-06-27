import { Auth } from "../core/auth.js";
import { scrollToEl } from "../core/scroll.js";
import { I18n } from "../core/i18n.js";

const TOURS_KEY = "odyssey_school_events_tours";

const STEPS = {
    student: [
        { el: '#nav a[href="/"]', placement: "bottom-start", icon: "fa-hand-sparkles", key: "tour.student.1" },
        { el: '#nav a[href="/events"]', placement: "bottom", icon: "fa-compass", key: "tour.student.2" },
        { el: "#ev-search", placement: "bottom", icon: "fa-magnifying-glass", key: "tour.student.3" },
        { el: "[data-register]", placement: "top", icon: "fa-bolt", key: "tour.student.4" },
        { el: '#nav a[href="/my-registrations"]', placement: "bottom", icon: "fa-ticket", key: "tour.student.5" },
        { el: '#nav a[href="/notifications"]', placement: "bottom-end", icon: "fa-bell", key: "tour.student.6" },
    ],
    organizer: [
        { el: '#nav a[href="/"]', placement: "bottom-start", icon: "fa-hand-sparkles", key: "tour.organizer.1" },
        { el: '#nav a[href="/organizer/new"]', placement: "bottom", icon: "fa-plus", key: "tour.organizer.2" },
        { el: "[data-publish]", placement: "top", icon: "fa-paper-plane", key: "tour.organizer.3" },
        { el: '[href^="/organizer/events/"]', placement: "top", icon: "fa-users", key: "tour.organizer.4" },
        { el: '#nav a[href="/notifications"]', placement: "bottom-end", icon: "fa-bell", key: "tour.organizer.5" },
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
        '<div class="flex items-center gap-2.5"><span class="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300"><i class="fa-solid ' + step.icon + '"></i></span>' +
        '<h4 class="font-display text-sm font-bold text-slate-800 dark:text-slate-100">' + I18n.t(step.key + ".title") + "</h4></div>" +
        '<p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">' + I18n.t(step.key + ".text") + "</p>" +
        '<div class="mt-4 flex items-center justify-between">' +
        '<button data-skip class="text-xs font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">' + I18n.t("tour.skip") + '</button>' +
        '<div class="flex items-center gap-1.5">' +
        steps.map((_, i) => '<span class="h-1.5 rounded-full transition-all ' + (i === idx ? "w-4 bg-brand-500" : "w-1.5 bg-slate-200 dark:bg-slate-600") + '"></span>').join("") +
        "</div>" +
        '<div class="flex gap-1.5">' +
        (idx > 0 ? '<button data-prev class="btn-secondary btn-sm">' + I18n.t("tour.back") + '</button>' : "") +
        '<button data-next class="btn-primary btn-sm">' + (isLast ? I18n.t("tour.done") : I18n.t("tour.next")) + "</button>" +
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