import { UI } from "../core/ui.js";
import { Auth } from "../core/auth.js";
import { API } from "../core/api.js";
import { Bus } from "../core/bus.js";
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
        action = '<div class="flex items-center justify-between gap-2"><a href="#/events/' + ev.id + '" class="btn-secondary btn-sm">Details</a>' + UI.regBadge(reg.status) + "</div>";
    } else {
        action =
            '<div class="flex items-center gap-2"><a href="#/events/' + ev.id + '" class="btn-secondary btn-sm flex-1">Details</a>' +
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

export async function events() {
    const user = Auth.current();
    const list = await API.listPublishedEvents();

    const PAGE_SIZE = 6;
    const currentPage = 1;

    const totalPages = Math.ceil(list.length / PAGE_SIZE);

    const pagedEvents = list.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const mine = await myMap();
    const cats = Array.from(new Set(list.map((e) => e.category)));

    const stats = [
        { icon: "fa-calendar-star", label: "Active events", value: list.length, color: "brand" },
        { icon: "fa-circle-check", label: "Free seats", value: list.reduce((a, e) => a + e.spotsLeft, 0), color: "emerald" },
        { icon: "fa-hourglass-half", label: "On waitlist", value: list.reduce((a, e) => a + e.waitlistCount, 0), color: "amber" },
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
        '<div class="relative w-full sm:max-w-xs"><i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i><input id="ev-search" class="input pl-10" placeholder="Search by title or place..."></div>' +
        '<div id="ev-cats" class="flex flex-wrap gap-2"><button class="chip is-active" data-cat="all">All</button>' +
        cats.map((c) => '<button class="chip" data-cat="' + UI.escape(c) + '">' + UI.escape(c) + "</button>").join("") +
        "</div></div>" +
        '<div id="ev-grid" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">' +
        pagedEvents.map((e, i) => eventCard(e, mine, i)).join("") +
        "</div>" +
        '<div id="ev-empty" class="hidden">' + UI.empty({ icon: "fa-calendar-xmark", title: "No events found", text: "Try a different word or category." }) + "</div>" +

        '<div class="mt-8 flex justify-center gap-2">' +

         Array.from({ length: totalPages }, (_, i) =>
        '<button class="btn-secondary btn-sm page-btn" data-page="' + (i + 1) + '">' + (i + 1) + '</button>').join("") +
        '</div>' + "</section>";

    return { html: html, onMount: bindEvents };
}

function bindEvents(root) {
    const search = root.querySelector("#ev-search");
    const grid = root.querySelector("#ev-grid");
    const empty = root.querySelector("#ev-empty");
    let activeCat = "all";

    root.querySelectorAll(".page-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            console.log("Page:", btn.dataset.page);
        });
    });

    function apply() {
        const q = (search.value || "").trim().toLowerCase();
        let shown = 0;
        grid.querySelectorAll("[data-card]").forEach((card) => {
            const okText = !q || card.getAttribute("data-title").includes(q);
            const okCat = activeCat === "all" || card.getAttribute("data-cat") === activeCat;
            const ok = okText && okCat;
            card.classList.toggle("hidden", !ok);
            if (ok) shown++;
        });
        empty.classList.toggle("hidden", shown !== 0);
        grid.classList.toggle("hidden", shown === 0);
    }

    search.addEventListener("input", apply);

    root.querySelectorAll("#ev-cats .chip").forEach((btn) => {
        btn.addEventListener("click", () => {
            root.querySelectorAll("#ev-cats .chip").forEach((b) => b.classList.remove("is-active"));
            btn.classList.add("is-active");
            activeCat = btn.getAttribute("data-cat");
            apply();
        });
    });

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
        '<section class="container-app py-8"><a href="#/events" class="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-600"><i class="fa-solid fa-arrow-left"></i> Back to events</a>' +
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
                    '<div><a href="#/events/' + ev.id + '" class="font-display text-base font-semibold text-slate-800 hover:text-brand-600">' + UI.escape(ev.title) + "</a>" +
                    '<p class="mt-1 text-sm text-slate-500"><i class="fa-regular fa-calendar mr-1.5"></i>' + UI.escape(UI.fmtRange(ev.startsAt, ev.endsAt)) + "</p>" +
                    '<p class="text-sm text-slate-500"><i class="fa-solid fa-location-dot mr-1.5"></i>' + UI.escape(ev.location || "Online") + "</p></div></div>" +
                    '<div class="flex items-center justify-between gap-3 sm:flex-col sm:items-end">' + UI.regBadge(i.registration.status) +
                    (isW ? '<span class="text-xs font-semibold text-amber-600">position ' + i.position + " on waitlist</span>" : "") +
                    '<button data-cancel="' + i.registration.id + '" class="btn-ghost btn-sm text-rose-600 hover:bg-rose-50"><i class="fa-solid fa-xmark"></i> Cancel</button></div></div>'
                );
            })
            .join("")
        : UI.empty({ icon: "fa-calendar-plus", title: "No registrations yet", text: "Browse the events and grab your spot.", actionHtml: '<a href="#/events" class="btn-primary"><i class="fa-solid fa-compass"></i> Browse events</a>' });

    const html =
        '<section class="container-app py-10"><div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" data-aos="fade-down">' +
        '<div><h1 class="font-display text-3xl font-bold text-slate-800">My registrations</h1><p class="mt-1 text-slate-500">' + confirmed + " confirmed · " + waiting + " on waitlist</p></div>" +
        '<a href="#/events" class="btn-secondary self-start"><i class="fa-solid fa-plus"></i> New registration</a></div>' +
        '<div class="space-y-4">' + list + "</div></section>";

    return { html: html, onMount: bindMyRegs };
}

function bindMyRegs(root) {
    root.querySelectorAll("[data-cancel]").forEach((btn) => btn.addEventListener("click", () => cancelReg(btn.getAttribute("data-cancel"))));
}

export async function notifications() {
    const items = await API.listNotifications();
    const meta = {
        RegistrationConfirmed: { icon: "fa-circle-check", color: "emerald" },
        RegistrationWaitlisted: { icon: "fa-hourglass-half", color: "amber" },
        WaitlistPromoted: { icon: "fa-arrow-up-right-dots", color: "sky" },
        RegistrationCancelled: { icon: "fa-circle-minus", color: "slate" },
        EventCancelled: { icon: "fa-calendar-xmark", color: "rose" },
        AccountWelcome: { icon: "fa-hand-sparkles", color: "brand" },
    };

    const list = items.length
        ? items
            .map((n, idx) => {
                const m = meta[n.type] || { icon: "fa-bell", color: "brand" };
                return (
                    '<div class="flex items-start gap-4 rounded-2xl border p-4 ' + (n.read ? "border-slate-200 bg-white" : "border-brand-200 bg-brand-50/50") + '" data-aos="' + UI.aos(idx) + '" data-aos-delay="' + idx * 40 + '">' +
                    '<span class="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-' + m.color + "-100 text-" + m.color + '-600"><i class="fa-solid ' + m.icon + '"></i></span>' +
                    '<div class="flex-1"><p class="text-sm text-slate-700">' + UI.escape(n.message) + "</p>" +
                    '<p class="mt-1 text-xs text-slate-400"><i class="fa-regular fa-clock mr-1"></i>' + UI.fmtRelative(n.createdAt) + "</p></div>" +
                    (n.read ? "" : '<span class="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-brand-500"></span>') +
                    "</div>"
                );
            })
            .join("")
        : UI.empty({ icon: "fa-bell-slash", title: "No notifications", text: "Confirmations, promotions and changes will show up here." });

    const html =
        '<section class="container-app py-10"><div class="mb-8 flex items-end justify-between" data-aos="fade-down">' +
        '<div><h1 class="font-display text-3xl font-bold text-slate-800">Notifications</h1><p class="mt-1 text-slate-500">Event-driven messages in real time.</p></div></div>' +
        '<div class="mx-auto max-w-2xl space-y-3">' + list + "</div></section>";

    return {
        html: html,
        onMount: () => {
            if (API.unreadCount() > 0) {
                setTimeout(async () => {
                    try {
                        await API.markAllRead();
                        Bus.emit("notifications");
                    } catch (e) { }
                }, 900);
            }
        },
    };
}