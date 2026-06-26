import { UI } from "../core/ui.js";
import { Auth } from "../core/auth.js";
import { API } from "../core/api.js";
import { Router } from "../core/router.js";
import { refreshNotifications } from "../core/notifications.js";

async function myMap() {
    const map = {};
    const list = await API.myRegistrations();
    list.forEach((x) => {
        map[x.registration.eventId] = { status: x.registration.status, regId: x.registration.id, position: x.position };
    });
    return map;
}

function capacityLine(ev) {
    const color = ev.isFull ? "rose" : ev.spotsLeft <= Math.max(1, Math.ceil(ev.capacity * 0.2)) ? "amber" : "emerald";
    const text = ev.isFull
        ? "Full · " + ev.waitlistCount + " on waitlist"
        : ev.spotsLeft + " of " + ev.capacity + " free";
    return (
        '<div class="mt-4"><div class="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500"><span><i class="fa-solid fa-users mr-1"></i>' +
        ev.confirmedCount + "/" + ev.capacity + " registered</span><span class=\"text-" + color + '-600">' + text + "</span></div>" +
        UI.progressBar(ev.confirmedCount, ev.capacity, color) + "</div>"
    );
}

function eventCard(ev, mine, i) {
    const cat = UI.categoryMeta(ev.category);
    const reg = mine[ev.id];
    let action;
    if (reg) {
        action = '<div class="flex items-center justify-between gap-2"><a href="/events/' + ev.id + '" class="btn-secondary btn-sm">Details</a>' + UI.regBadge(reg.status) + "</div>";
    } else {
        action =
            '<div class="flex items-center gap-2"><a href="/events/' + ev.id + '" class="btn-secondary btn-sm flex-1">Details</a>' +
            '<button data-register="' + ev.id + '" class="btn-primary btn-sm flex-1">' + (ev.isFull ? '<i class="fa-solid fa-hourglass-half"></i> Join waitlist' : '<i class="fa-solid fa-bolt"></i> Register') + "</button></div>";
    }
    return (
        '<article class="card flex flex-col p-5 hover:-translate-y-1 hover:shadow-soft hover:border-brand-200" data-card data-title="' + UI.escape((ev.title + " " + ev.category + " " + ev.location).toLowerCase()) + '" data-cat="' + UI.escape(ev.category) + '" data-aos="' + UI.aos(i) + '" data-aos-delay="' + ((i % 4) * 70) + '">' +
        '<div class="flex items-start justify-between gap-3">' +
        '<span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-' + cat.color + "-100 text-" + cat.color + '-600 text-lg"><i class="fa-solid ' + cat.icon + '"></i></span>' +
        (ev.isFull ? '<span class="badge bg-rose-100 text-rose-700 ring-rose-200"><i class="fa-solid fa-circle-xmark"></i>Full</span>' : '<span class="badge bg-' + cat.color + "-50 text-" + cat.color + "-700 ring-" + cat.color + '-200">' + UI.escape(ev.category) + "</span>") +
        "</div>" +
        '<h3 class="mt-4 font-display text-lg font-semibold leading-snug text-slate-800">' + UI.escape(ev.title) + "</h3>" +
        '<div class="mt-2 space-y-1.5 text-sm text-slate-500">' +
        '<p><i class="fa-regular fa-calendar mr-2 text-brand-500"></i>' + UI.escape(UI.fmtRange(ev.startsAt, ev.endsAt)) + "</p>" +
        '<p><i class="fa-solid fa-location-dot mr-2 text-brand-500"></i>' + UI.escape(ev.location || "Online") + "</p>" +
        "</div>" +
        capacityLine(ev) +
        '<div class="mt-5">' + action + "</div>" +
        "</article>"
    );
}

function readPageState(defaultSize) {
    const params = new URLSearchParams(location.search);
    return {
        page: Math.max(1, parseInt(params.get("page") || "1", 10) || 1),
        pageSize: defaultSize,
        q: params.get("q") || "",
        category: params.get("category") || "",
    };
}

function setPageState(page, q, category) {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", page);
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    history.pushState(null, "", "/events" + (params.toString() ? "?" + params.toString() : ""));
    Router.handle();
}

function pagination(meta) {
    if (meta.totalPages <= 1) return "";

    const buttons = [];
    for (let p = 1; p <= meta.totalPages; p++) {
        if (p === 1 || p === meta.totalPages || Math.abs(p - meta.page) <= 1) {
            buttons.push('<button class="chip ' + (p === meta.page ? "is-active" : "") + '" data-page="' + p + '">' + p + "</button>");
        } else if (buttons[buttons.length - 1] !== '<span class="px-1 text-slate-400">...</span>') {
            buttons.push('<span class="px-1 text-slate-400">...</span>');
        }
    }

    return (
        '<div id="ev-pagination" class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">' +
        '<p class="text-sm text-slate-500">Page ' + meta.page + " of " + meta.totalPages + " · " + meta.totalCount + " events</p>" +
        '<div class="flex flex-wrap items-center gap-2">' +
        '<button class="btn-secondary btn-sm" data-page="' + (meta.page - 1) + '"' + (!meta.hasPreviousPage ? " disabled" : "") + '><i class="fa-solid fa-chevron-left"></i> Previous</button>' +
        buttons.join("") +
        '<button class="btn-secondary btn-sm" data-page="' + (meta.page + 1) + '"' + (!meta.hasNextPage ? " disabled" : "") + '>Next <i class="fa-solid fa-chevron-right"></i></button>' +
        "</div></div>"
    );
}

export async function events() {
    const user = Auth.current();
    const state = readPageState(9);
    const page = await API.listPublishedEvents(state);
    const list = page.events;
    const mine = await myMap();
    const cats = page.categories;

    const stats = [
        { icon: "fa-calendar-star", label: "Active events", value: page.stats.totalEvents, color: "brand" },
        { icon: "fa-circle-check", label: "Free seats", value: page.stats.seatsAvailable, color: "emerald" },
        { icon: "fa-hourglass-half", label: "On waitlist", value: page.stats.waitlistCount, color: "amber" },
    ];

    const html =
        '<section class="bg-hero-grid bg-grid-dots border-b border-slate-200/70 bg-white"><div class="container-app py-10 lg:py-14">' +
        '<div class="max-w-2xl" data-aos="fade-right"><span class="badge bg-brand-50 text-brand-700 ring-brand-200"><i class="fa-solid fa-sparkles"></i>Find your event</span>' +
        '<h1 class="mt-4 font-display text-3xl font-bold text-slate-800 sm:text-4xl">Hi, ' + UI.escape(user.name.split(" ")[0]) + ' 👋</h1>' +
        '<p class="mt-2 text-slate-500">Browse upcoming school events and grab your spot.</p></div>' +
        '<div class="mt-8 grid gap-4 sm:grid-cols-3">' +
        stats.map((s, i) =>
            '<div class="card flex items-center gap-4 p-4" data-aos="zoom-in-up" data-aos-delay="' + i * 80 + '" data-aos-duration="500">' +
            '<span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-' + s.color + "-100 text-" + s.color + '-600 text-lg"><i class="fa-solid ' + s.icon + '"></i></span>' +
            '<div><div class="font-display text-2xl font-bold text-slate-800">' + s.value + "</div><div class=\"text-xs text-slate-500\">" + s.label + "</div></div></div>"
        ).join("") +
        "</div></div></section>" +
        '<section class="container-app py-8"><div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">' +
        '<div class="relative w-full sm:max-w-xs"><i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i><input id="ev-search" class="input pl-10" value="' + UI.escape(state.q) + '" placeholder="Search by title or place..."></div>' +
        '<div id="ev-cats" class="flex flex-wrap gap-2"><button class="chip ' + (!state.category ? "is-active" : "") + '" data-cat="">All</button>' +
        cats.map((c) => '<button class="chip ' + (c === state.category ? "is-active" : "") + '" data-cat="' + UI.escape(c) + '">' + UI.escape(c) + "</button>").join("") +
        "</div></div>" +
        '<div id="ev-grid" class="' + (list.length ? "grid" : "hidden") + ' gap-5 sm:grid-cols-2 lg:grid-cols-3">' +
        list.map((e, i) => eventCard(e, mine, i)).join("") +
        "</div>" +
        '<div id="ev-empty" class="' + (list.length ? "hidden" : "") + '">' + UI.empty({ icon: "fa-calendar-xmark", title: "No events found", text: "Try a different word or category." }) + "</div>" +
        pagination(page) +
        "</section>";

    return { html: html, onMount: bindEvents };
}

function bindEvents(root) {
    const search = root.querySelector("#ev-search");
    let searchTimer = null;
    const currentCategory = new URLSearchParams(location.search).get("category") || "";

    search.addEventListener("input", () => {
        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(() => setPageState(1, (search.value || "").trim(), currentCategory), 300);
    });
    root.querySelectorAll("#ev-cats .chip").forEach((btn) => {
        btn.addEventListener("click", () => {
            setPageState(1, (search.value || "").trim(), btn.getAttribute("data-cat") || "");
        });
    });

    root.querySelectorAll("#ev-pagination [data-page]").forEach((btn) => {
        btn.addEventListener("click", () => setPageState(parseInt(btn.getAttribute("data-page"), 10), (search.value || "").trim(), currentCategory));
    });

    const grid = root.querySelector("#ev-grid");
    grid.querySelectorAll("[data-register]").forEach((btn) => {
        btn.addEventListener("click", () => quickRegister(btn.getAttribute("data-register"), btn));
    });
}

async function quickRegister(eventId, btn) {
    if (btn) btn.disabled = true;
    try {
        const res = await API.registerForEvent(Auth.current().id, eventId);
        if (res.status === "CONFIRMED") UI.toast("Your spot is confirmed! 🎉", "success");
        else UI.toast("Added to the waitlist (position " + res.position + ").", "warn");
        await refreshNotifications();
        Router.handle();
    } catch (e) {
        UI.toast(e.message, "error");
        if (btn) btn.disabled = false;
    }
}

export async function eventDetail(id) {
    const ev = await API.getEvent(id);
    if (!ev || ev.status !== "PUBLISHED") {
        return { html: UI.guard("Event unavailable", "It may be a draft, cancelled or removed."), onMount: null };
    }
    const mine = (await myMap())[ev.id];
    const cat = UI.categoryMeta(ev.category);

    let actionPanel;
    if (mine) {
        actionPanel =
            '<div class="rounded-2xl bg-' + (mine.status === "CONFIRMED" ? "emerald" : "amber") + '-50 p-4 ring-1 ring-inset ring-' + (mine.status === "CONFIRMED" ? "emerald" : "amber") + '-200">' +
            '<div class="flex items-center gap-2">' + UI.regBadge(mine.status) + (mine.status === "WAITLISTED" ? '<span class="text-sm font-semibold text-amber-700">position ' + mine.position + "</span>" : "") + "</div>" +
            '<p class="mt-2 text-sm text-slate-600">' + (mine.status === "CONFIRMED" ? "Your spot is reserved. You'll be notified of any change." : "You'll be promoted automatically when a spot opens up.") + "</p>" +
            '<button data-cancel="' + mine.regId + '" class="btn-danger btn-sm mt-3 w-full"><i class="fa-solid fa-xmark"></i> Cancel registration</button></div>';
    } else {
        actionPanel =
            '<button data-register="' + ev.id + '" class="btn-primary w-full">' + (ev.isFull ? '<i class="fa-solid fa-hourglass-half"></i> Join the waitlist' : '<i class="fa-solid fa-bolt"></i> Register now') + "</button>" +
            '<p class="mt-2 text-center text-xs text-slate-500">' + (ev.isFull ? "This event is full — we'll add you to the FIFO waitlist." : "Free seats: " + ev.spotsLeft) + "</p>";
    }

    const html =
        '<section class="container-app py-8"><a href="/events" class="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-600"><i class="fa-solid fa-arrow-left"></i> Back to events</a>' +
        '<div class="grid gap-8 lg:grid-cols-3"><div class="lg:col-span-2" data-aos="fade-right">' +
        '<div class="overflow-hidden rounded-3xl">' +
        '<div class="relative flex h-44 items-end bg-gradient-to-br from-' + cat.color + "-500 to-" + cat.color + '-700 p-6 text-white sm:h-56"><div class="pointer-events-none absolute inset-0 bg-mesh opacity-50"></div>' +
        '<span class="pointer-events-none absolute right-6 top-6 text-6xl text-white/20"><i class="fa-solid ' + cat.icon + '"></i></span>' +
        '<div class="relative"><span class="badge bg-white/20 text-white ring-white/30">' + UI.escape(ev.category) + "</span>" +
        '<h1 class="mt-3 font-display text-2xl font-bold sm:text-3xl">' + UI.escape(ev.title) + "</h1></div></div></div>" +
        '<div class="mt-6 card p-6"><h2 class="font-display text-lg font-semibold text-slate-800">Description</h2><p class="mt-2 whitespace-pre-line leading-relaxed text-slate-600">' + UI.escape(ev.description) + "</p>" +
        '<div class="mt-6 grid gap-4 sm:grid-cols-2">' +
        infoRow("fa-calendar-day", "When", UI.fmtRange(ev.startsAt, ev.endsAt)) +
        infoRow("fa-location-dot", "Where", ev.location || "—") +
        infoRow("fa-user-tie", "Organizer", ev.organizerName) +
        (ev.url ? infoRow("fa-link", "Link", '<a href="' + UI.escape(ev.url) + '" target="_blank" rel="noopener" class="text-brand-600 hover:underline">Open</a>', true) : infoRow("fa-tag", "Category", ev.category)) +
        "</div></div></div>" +
        '<aside class="lg:col-span-1" data-aos="fade-left"><div class="card sticky top-24 p-6">' +
        '<div class="flex items-baseline justify-between"><span class="font-display text-3xl font-bold text-slate-800">' + ev.confirmedCount + '<span class="text-lg text-slate-400">/' + ev.capacity + "</span></span><span class=\"text-sm text-slate-500\">registered</span></div>" +
        UI.progressBar(ev.confirmedCount, ev.capacity, ev.isFull ? "rose" : "brand") +
        '<div class="mt-3 grid grid-cols-2 gap-3 text-center">' +
        miniStat(ev.spotsLeft, "free", "emerald") +
        miniStat(ev.waitlistCount, "waiting", "amber") +
        "</div><div class=\"mt-5\">" + actionPanel + "</div></div></aside></div></section>";

    return { html: html, onMount: (r) => bindDetail(r) };
}

function infoRow(icon, label, value, raw) {
    return (
        '<div class="flex items-start gap-3"><span class="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand-50 text-brand-600"><i class="fa-solid ' + icon + '"></i></span>' +
        '<div><div class="text-xs uppercase tracking-wide text-slate-400">' + label + '</div><div class="text-sm font-medium text-slate-700">' + (raw ? value : UI.escape(value)) + "</div></div></div>"
    );
}

function miniStat(value, label, color) {
    return '<div class="rounded-xl bg-' + color + '-50 py-2"><div class="font-display text-xl font-bold text-' + color + '-600">' + value + '</div><div class="text-[11px] text-slate-500">' + label + "</div></div>";
}

function bindDetail(root) {
    const reg = root.querySelector("[data-register]");
    if (reg) reg.addEventListener("click", () => quickRegister(reg.getAttribute("data-register"), reg));
    const cancel = root.querySelector("[data-cancel]");
    if (cancel) cancel.addEventListener("click", () => cancelReg(cancel.getAttribute("data-cancel")));
}

async function cancelReg(regId) {
    const ok = await UI.confirm({ title: "Cancel this registration?", text: "Your spot will be freed for the next person in line.", confirmText: "Yes, cancel", danger: true, icon: "warning" });
    if (!ok) return;
    try {
        const res = await API.cancelRegistration(Auth.current().id, regId);
        UI.toast("Registration cancelled." + (res.promoted ? " The freed spot went to the next person on the waitlist." : ""), "info");
        await refreshNotifications();
        Router.handle();
    } catch (e) {
        UI.toast(e.message, "error");
    }
}

export async function myRegistrations() {
    const items = await API.myRegistrations();
    const confirmed = items.filter((i) => i.registration.status === "CONFIRMED").length;
    const waiting = items.length - confirmed;

    const list = items.length
        ? items
            .map((i, idx) => {
                const ev = i.event;
                const cat = UI.categoryMeta(ev.category);
                const isW = i.registration.status === "WAITLISTED";
                return (
                    '<div class="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" data-aos="' + UI.aos(idx) + '" data-aos-delay="' + idx * 60 + '">' +
                    '<div class="flex items-start gap-4"><span class="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-' + cat.color + "-100 text-" + cat.color + '-600 text-lg"><i class="fa-solid ' + cat.icon + '"></i></span>' +
                    '<div><a href="/events/' + ev.id + '" class="font-display text-base font-semibold text-slate-800 hover:text-brand-600">' + UI.escape(ev.title) + "</a>" +
                    '<p class="mt-1 text-sm text-slate-500"><i class="fa-regular fa-calendar mr-1.5"></i>' + UI.escape(UI.fmtRange(ev.startsAt, ev.endsAt)) + "</p>" +
                    '<p class="text-sm text-slate-500"><i class="fa-solid fa-location-dot mr-1.5"></i>' + UI.escape(ev.location || "Online") + "</p></div></div>" +
                    '<div class="flex items-center justify-between gap-3 sm:flex-col sm:items-end">' + UI.regBadge(i.registration.status) +
                    (isW ? '<span class="text-xs font-semibold text-amber-600">position ' + i.position + " on waitlist</span>" : "") +
                    '<button data-cancel="' + i.registration.id + '" class="btn-ghost btn-sm text-rose-600 hover:bg-rose-50"><i class="fa-solid fa-xmark"></i> Cancel</button></div></div>'
                );
            })
            .join("")
        : UI.empty({ icon: "fa-calendar-plus", title: "No registrations yet", text: "Browse the events and grab your spot.", actionHtml: '<a href="/events" class="btn-primary"><i class="fa-solid fa-compass"></i> Browse events</a>' });

    const html =
        '<section class="container-app py-10"><div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" data-aos="fade-down">' +
        '<div><h1 class="font-display text-3xl font-bold text-slate-800">My registrations</h1><p class="mt-1 text-slate-500">' + confirmed + " confirmed · " + waiting + " on waitlist</p></div>" +
        '<a href="/events" class="btn-secondary self-start"><i class="fa-solid fa-plus"></i> New registration</a></div>' +
        '<div class="space-y-4">' + list + "</div></section>";

    return { html: html, onMount: bindMyRegs };
}

function bindMyRegs(root) {
    root.querySelectorAll("[data-cancel]").forEach((btn) => btn.addEventListener("click", () => cancelReg(btn.getAttribute("data-cancel"))));
}
