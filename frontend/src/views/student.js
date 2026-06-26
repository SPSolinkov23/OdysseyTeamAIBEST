import { UI } from "../core/ui.js";
import { Auth } from "../core/auth.js";
import { API } from "../core/api.js";
import { Router } from "../core/router.js";
import { refreshNotifications } from "../core/notifications.js";
import { I18n } from "../core/i18n.js";

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
        ? I18n.t("events.capFull", { n: ev.waitlistCount })
        : I18n.t("events.capFree", { free: ev.spotsLeft, cap: ev.capacity });
    return (
        '<div class="mt-4"><div class="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500"><span><i class="fa-solid fa-users mr-1"></i>' +
        I18n.t("events.capRegistered", { c: ev.confirmedCount, cap: ev.capacity }) + "</span><span class=\"text-" + color + '-600">' + text + "</span></div>" +
        UI.progressBar(ev.confirmedCount, ev.capacity, color) + "</div>"
    );
}

function eventCard(ev, mine, i) {
    const cat = UI.categoryMeta(ev.category);
    const reg = mine[ev.id];
    let action;
    if (reg) {
        action = '<div class="flex items-center justify-between gap-2"><a href="/events/' + ev.id + '" class="btn-secondary btn-sm">' + I18n.t("events.details") + '</a>' + UI.regBadge(reg.status) + "</div>";
    } else {
        action =
            '<div class="flex items-center gap-2"><a href="/events/' + ev.id + '" class="btn-secondary btn-sm flex-1">' + I18n.t("events.details") + '</a>' +
            '<button data-register="' + ev.id + '" class="btn-primary btn-sm flex-1">' + (ev.isFull ? '<i class="fa-solid fa-hourglass-half"></i> ' + I18n.t("events.joinWaitlist") : '<i class="fa-solid fa-bolt"></i> ' + I18n.t("events.register")) + "</button></div>";
    }
    return (
        '<article class="card flex flex-col p-5 hover:-translate-y-1 hover:shadow-soft hover:border-brand-200" data-card data-title="' + UI.escape((ev.title + " " + ev.category + " " + ev.location).toLowerCase()) + '" data-cat="' + UI.escape(ev.category) + '" data-aos="' + UI.aos(i) + '" data-aos-delay="' + ((i % 4) * 70) + '">' +
        '<div class="flex items-start justify-between gap-3">' +
        '<span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-' + cat.color + "-100 text-" + cat.color + '-600 text-lg"><i class="fa-solid ' + cat.icon + '"></i></span>' +
        (ev.isFull ? '<span class="badge bg-rose-100 text-rose-700 ring-rose-200"><i class="fa-solid fa-circle-xmark"></i>' + I18n.t("events.full") + '</span>' : '<span class="badge bg-' + cat.color + "-50 text-" + cat.color + "-700 ring-" + cat.color + '-200">' + UI.escape(UI.catLabel(ev.category)) + "</span>") +
        "</div>" +
        '<h3 class="mt-4 font-display text-lg font-semibold leading-snug text-slate-800">' + UI.escape(ev.title) + "</h3>" +
        '<div class="mt-2 space-y-1.5 text-sm text-slate-500">' +
        '<p><i class="fa-regular fa-calendar mr-2 text-brand-500"></i>' + UI.escape(UI.fmtRange(ev.startsAt, ev.endsAt)) + "</p>" +
        '<p><i class="fa-solid fa-location-dot mr-2 text-brand-500"></i>' + UI.escape(ev.location || I18n.t("events.online")) + "</p>" +
        "</div>" +
        capacityLine(ev) +
        '<div class="mt-5">' + action + "</div>" +
        "</article>"
    );
}

export async function events() {
    const user = Auth.current();
    const list = await API.listPublishedEvents();
    const mine = await myMap();
    const cats = Array.from(new Set(list.map((e) => e.category)));

    const stats = [
        { icon: "fa-calendar-star", label: I18n.t("events.statActive"), value: list.length, color: "brand" },
        { icon: "fa-circle-check", label: I18n.t("events.statFree"), value: list.reduce((a, e) => a + e.spotsLeft, 0), color: "emerald" },
        { icon: "fa-hourglass-half", label: I18n.t("events.statWaitlist"), value: list.reduce((a, e) => a + e.waitlistCount, 0), color: "amber" },
    ];

    const html =
        '<section class="bg-hero-grid bg-grid-dots border-b border-slate-200/70 bg-white"><div class="container-app py-10 lg:py-14">' +
        '<div class="max-w-2xl" data-aos="fade-right"><span class="badge bg-brand-50 text-brand-700 ring-brand-200"><i class="fa-solid fa-sparkles"></i>' + I18n.t("events.findBadge") + '</span>' +
        '<h1 class="mt-4 font-display text-3xl font-bold text-slate-800 sm:text-4xl">' + I18n.t("events.greeting", { name: UI.escape(user.name.split(" ")[0]) }) + '</h1>' +
        '<p class="mt-2 text-slate-500">' + I18n.t("events.subtitle") + '</p></div>' +
        '<div class="mt-8 grid gap-4 sm:grid-cols-3">' +
        stats.map((s, i) =>
            '<div class="card flex items-center gap-4 p-4" data-aos="zoom-in-up" data-aos-delay="' + i * 80 + '" data-aos-duration="500">' +
            '<span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-' + s.color + "-100 text-" + s.color + '-600 text-lg"><i class="fa-solid ' + s.icon + '"></i></span>' +
            '<div><div class="font-display text-2xl font-bold text-slate-800">' + s.value + "</div><div class=\"text-xs text-slate-500\">" + s.label + "</div></div></div>"
        ).join("") +
        "</div></div></section>" +
        '<section class="container-app py-8"><div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">' +
        '<div class="relative w-full sm:max-w-xs"><i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i><input id="ev-search" class="input pl-10" placeholder="' + I18n.t("events.searchPlaceholder") + '"></div>' +
        '<div id="ev-cats" class="flex flex-wrap gap-2"><button class="chip is-active" data-cat="all">' + I18n.t("events.all") + '</button>' +
        cats.map((c) => '<button class="chip" data-cat="' + UI.escape(c) + '">' + UI.escape(UI.catLabel(c)) + "</button>").join("") +
        "</div></div>" +
        '<div id="ev-grid" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">' +
        list.map((e, i) => eventCard(e, mine, i)).join("") +
        "</div>" +
        '<div id="ev-empty" class="hidden">' + UI.empty({ icon: "fa-calendar-xmark", title: I18n.t("events.noFoundTitle"), text: I18n.t("events.noFoundText") }) + "</div>" +
        "</section>";

    return { html: html, onMount: bindEvents };
}

function bindEvents(root) {
    const search = root.querySelector("#ev-search");
    const grid = root.querySelector("#ev-grid");
    const empty = root.querySelector("#ev-empty");
    let activeCat = "all";

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
        if (res.status === "CONFIRMED") UI.toast(I18n.t("events.toastConfirmed"), "success");
        else UI.toast(I18n.t("events.toastWaitlist", { pos: res.position }), "warn");
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
        return { html: UI.guard(I18n.t("detail.unavailableTitle"), I18n.t("detail.unavailableText")), onMount: null };
    }
    const mine = (await myMap())[ev.id];
    const cat = UI.categoryMeta(ev.category);

    let actionPanel;
    if (mine) {
        actionPanel =
            '<div class="rounded-2xl bg-' + (mine.status === "CONFIRMED" ? "emerald" : "amber") + '-50 p-4 ring-1 ring-inset ring-' + (mine.status === "CONFIRMED" ? "emerald" : "amber") + '-200">' +
            '<div class="flex items-center gap-2">' + UI.regBadge(mine.status) + (mine.status === "WAITLISTED" ? '<span class="text-sm font-semibold text-amber-700">' + I18n.t("detail.position", { n: mine.position }) + "</span>" : "") + "</div>" +
            '<p class="mt-2 text-sm text-slate-600">' + (mine.status === "CONFIRMED" ? I18n.t("detail.confirmedReserved") : I18n.t("detail.waitlistedAuto")) + "</p>" +
            '<button data-cancel="' + mine.regId + '" class="btn-danger btn-sm mt-3 w-full"><i class="fa-solid fa-xmark"></i> ' + I18n.t("detail.cancelRegistration") + '</button></div>';
    } else {
        actionPanel =
            '<button data-register="' + ev.id + '" class="btn-primary w-full">' + (ev.isFull ? '<i class="fa-solid fa-hourglass-half"></i> ' + I18n.t("detail.joinWaitlist") : '<i class="fa-solid fa-bolt"></i> ' + I18n.t("detail.registerNow")) + "</button>" +
            '<p class="mt-2 text-center text-xs text-slate-500">' + (ev.isFull ? I18n.t("detail.fullFifo") : I18n.t("detail.freeSeats", { n: ev.spotsLeft })) + "</p>";
    }

    const html =
        '<section class="container-app py-8"><a href="/events" class="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-600"><i class="fa-solid fa-arrow-left"></i> ' + I18n.t("detail.backToEvents") + '</a>' +
        '<div class="grid gap-8 lg:grid-cols-3"><div class="lg:col-span-2" data-aos="fade-right">' +
        '<div class="overflow-hidden rounded-3xl">' +
        '<div class="relative flex h-44 items-end bg-gradient-to-br from-' + cat.color + "-500 to-" + cat.color + '-700 p-6 text-white sm:h-56"><div class="pointer-events-none absolute inset-0 bg-mesh opacity-50"></div>' +
        '<span class="pointer-events-none absolute right-6 top-6 text-6xl text-white/20"><i class="fa-solid ' + cat.icon + '"></i></span>' +
        '<div class="relative"><span class="badge bg-white/20 text-white ring-white/30">' + UI.escape(UI.catLabel(ev.category)) + "</span>" +
        '<h1 class="mt-3 font-display text-2xl font-bold sm:text-3xl">' + UI.escape(ev.title) + "</h1></div></div></div>" +
        '<div class="mt-6 card p-6"><h2 class="font-display text-lg font-semibold text-slate-800">' + I18n.t("detail.description") + '</h2><p class="mt-2 whitespace-pre-line leading-relaxed text-slate-600">' + UI.escape(ev.description) + "</p>" +
        '<div class="mt-6 grid gap-4 sm:grid-cols-2">' +
        infoRow("fa-calendar-day", I18n.t("detail.when"), UI.fmtRange(ev.startsAt, ev.endsAt)) +
        infoRow("fa-location-dot", I18n.t("detail.where"), ev.location || "—") +
        infoRow("fa-user-tie", I18n.t("detail.organizer"), ev.organizerName) +
        (ev.url ? infoRow("fa-link", I18n.t("detail.link"), '<a href="' + UI.escape(ev.url) + '" target="_blank" rel="noopener" class="text-brand-600 hover:underline">' + I18n.t("detail.open") + '</a>', true) : infoRow("fa-tag", I18n.t("detail.category"), UI.catLabel(ev.category))) +
        "</div></div></div>" +
        '<aside class="lg:col-span-1" data-aos="fade-left"><div class="card sticky top-24 p-6">' +
        '<div class="flex items-baseline justify-between"><span class="font-display text-3xl font-bold text-slate-800">' + ev.confirmedCount + '<span class="text-lg text-slate-400">/' + ev.capacity + "</span></span><span class=\"text-sm text-slate-500\">" + I18n.t("detail.registered") + "</span></div>" +
        UI.progressBar(ev.confirmedCount, ev.capacity, ev.isFull ? "rose" : "brand") +
        '<div class="mt-3 grid grid-cols-2 gap-3 text-center">' +
        miniStat(ev.spotsLeft, I18n.t("detail.free"), "emerald") +
        miniStat(ev.waitlistCount, I18n.t("detail.waiting"), "amber") +
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
    const ok = await UI.confirm({ title: I18n.t("detail.cancelConfirmTitle"), text: I18n.t("detail.cancelConfirmText"), confirmText: I18n.t("detail.cancelConfirmYes"), danger: true, icon: "warning" });
    if (!ok) return;
    try {
        const res = await API.cancelRegistration(Auth.current().id, regId);
        UI.toast(I18n.t("detail.cancelledToast") + (res.promoted ? I18n.t("detail.cancelledPromoted") : ""), "info");
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
                    '<p class="text-sm text-slate-500"><i class="fa-solid fa-location-dot mr-1.5"></i>' + UI.escape(ev.location || I18n.t("events.online")) + "</p></div></div>" +
                    '<div class="flex items-center justify-between gap-3 sm:flex-col sm:items-end">' + UI.regBadge(i.registration.status) +
                    (isW ? '<span class="text-xs font-semibold text-amber-600">' + I18n.t("myreg.positionOnWaitlist", { n: i.position }) + "</span>" : "") +
                    '<button data-cancel="' + i.registration.id + '" class="btn-ghost btn-sm text-rose-600 hover:bg-rose-50"><i class="fa-solid fa-xmark"></i> ' + I18n.t("myreg.cancel") + '</button></div></div>'
                );
            })
            .join("")
        : UI.empty({ icon: "fa-calendar-plus", title: I18n.t("myreg.emptyTitle"), text: I18n.t("myreg.emptyText"), actionHtml: '<a href="/events" class="btn-primary"><i class="fa-solid fa-compass"></i> ' + I18n.t("myreg.browseEvents") + '</a>' });

    const html =
        '<section class="container-app py-10"><div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" data-aos="fade-down">' +
        '<div><h1 class="font-display text-3xl font-bold text-slate-800">' + I18n.t("myreg.title") + '</h1><p class="mt-1 text-slate-500">' + I18n.t("myreg.summary", { confirmed: confirmed, waiting: waiting }) + '</p></div>' +
        '<a href="/events" class="btn-secondary self-start"><i class="fa-solid fa-plus"></i> ' + I18n.t("myreg.newRegistration") + '</a></div>' +
        '<div class="space-y-4">' + list + "</div></section>";

    return { html: html, onMount: bindMyRegs };
}

function bindMyRegs(root) {
    root.querySelectorAll("[data-cancel]").forEach((btn) => btn.addEventListener("click", () => cancelReg(btn.getAttribute("data-cancel"))));
}

