import { UI } from "../core/ui.js";
import { Auth } from "../core/auth.js";
import { API } from "../core/api.js";
import { Router } from "../core/router.js";
import { I18n } from "../core/i18n.js";

const CATS = ["Workshop", "Lecture", "Club", "Sports", "Seminar", "Hackathon", "Trip", "Event"];

function toLocalInput(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

export async function organizer() {
    const list = await API.listOrganizerEvents();
    const published = list.filter((e) => e.status === "PUBLISHED").length;
    const drafts = list.filter((e) => e.status === "DRAFT").length;
    const totalRegs = list.reduce((a, e) => a + e.confirmedCount + e.waitlistCount, 0);

    const stats = [
        { icon: "fa-layer-group", label: I18n.t("org.statTotal"), value: list.length, color: "brand" },
        { icon: "fa-tower-broadcast", label: I18n.t("org.statPublished"), value: published, color: "sky" },
        { icon: "fa-pen-ruler", label: I18n.t("org.statDrafts"), value: drafts, color: "slate" },
        { icon: "fa-users", label: I18n.t("org.statRegistrations"), value: totalRegs, color: "emerald" },
    ];

    const rows = list.length
        ? list.map((e, idx) => eventRow(e, idx)).join("")
        : UI.empty({ icon: "fa-calendar-plus", title: I18n.t("org.emptyTitle"), text: I18n.t("org.emptyText"), actionHtml: '<a href="/organizer/new" class="btn-primary"><i class="fa-solid fa-plus"></i> ' + I18n.t("org.newEvent") + '</a>' });

    const html =
        '<section class="bg-hero-grid bg-grid-dots border-b border-slate-200/70 bg-white"><div class="container-app py-10"><div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" data-aos="fade-right">' +
        '<div><span class="badge bg-brand-50 text-brand-700 ring-brand-200"><i class="fa-solid fa-user-tie"></i>' + I18n.t("org.badge") + '</span>' +
        '<h1 class="mt-3 font-display text-3xl font-bold text-slate-800">' + I18n.t("org.dashTitle") + '</h1>' +
        '<p class="mt-1 text-slate-500">' + I18n.t("org.dashSubtitle") + '</p></div>' +
        '<a href="/organizer/new" class="btn-primary self-start"><i class="fa-solid fa-plus"></i> ' + I18n.t("org.newEvent") + '</a></div>' +
        '<div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">' +
        stats.map((s, i) =>
            '<div class="card flex items-center gap-4 p-4" data-aos="zoom-in-up" data-aos-delay="' + i * 70 + '" data-aos-duration="500"><span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-' + s.color + "-100 text-" + s.color + '-600 text-lg"><i class="fa-solid ' + s.icon + '"></i></span><div><div class="font-display text-2xl font-bold text-slate-800">' + s.value + '</div><div class="text-xs text-slate-500">' + s.label + "</div></div></div>"
        ).join("") +
        "</div></div></section>" +
        '<section class="container-app py-8"><h2 class="mb-5 font-display text-xl font-semibold text-slate-800">' + I18n.t("org.myEvents") + '</h2><div class="space-y-4">' + rows + "</div></section>";

    return { html: html, onMount: bindDashboard };
}

function eventRow(e, idx) {
    const cat = UI.categoryMeta(e.category);
    let actions = '<a href="/organizer/events/' + e.id + '" class="btn-secondary btn-sm"><i class="fa-solid fa-users"></i> ' + I18n.t("org.registrations") + '</a>';
    if (e.status === "DRAFT") {
        actions =
            '<a href="/preview/' + e.id + '" class="btn-secondary btn-sm"><i class="fa-solid fa-eye"></i> ' + I18n.t("org.preview") + '</a>' +
            '<a href="/organizer/events/' + e.id + '/edit" class="btn-ghost btn-sm"><i class="fa-solid fa-pen"></i> ' + I18n.t("org.edit") + '</a>' +
            '<button data-publish="' + e.id + '" class="btn-primary btn-sm"><i class="fa-solid fa-paper-plane"></i> ' + I18n.t("org.publish") + '</button>';
    } else if (e.status === "PUBLISHED") {
        actions =
            '<a href="/organizer/events/' + e.id + '" class="btn-secondary btn-sm"><i class="fa-solid fa-users"></i> ' + I18n.t("org.registrations") + '</a>' +
            '<a href="/organizer/events/' + e.id + '/edit" class="btn-ghost btn-sm"><i class="fa-solid fa-pen"></i> ' + I18n.t("org.edit") + '</a>' +
            '<button data-cancel-event="' + e.id + '" class="btn-ghost btn-sm text-rose-600 hover:bg-rose-50"><i class="fa-solid fa-ban"></i> ' + I18n.t("org.cancel") + '</button>';
    }
    return (
        '<div class="card p-5" data-aos="' + UI.aos(idx) + '" data-aos-delay="' + idx * 50 + '"><div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">' +
        '<div class="flex items-start gap-4"><span class="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-' + cat.color + "-100 text-" + cat.color + '-600 text-lg"><i class="fa-solid ' + cat.icon + '"></i></span>' +
        '<div><div class="flex flex-wrap items-center gap-2"><h3 class="font-display text-base font-semibold text-slate-800">' + UI.escape(e.title) + "</h3>" + UI.eventBadge(e.status) + "</div>" +
        '<p class="mt-1 text-sm text-slate-500"><i class="fa-regular fa-calendar mr-1.5"></i>' + UI.escape(UI.fmtRange(e.startsAt, e.endsAt)) + '<span class="mx-2 text-slate-300">•</span><i class="fa-solid fa-users mr-1.5"></i>' + I18n.t("org.regCount", { c: e.confirmedCount, cap: e.capacity }) + (e.waitlistCount ? '<span class="mx-2 text-slate-300">•</span><i class="fa-solid fa-hourglass-half mr-1.5 text-amber-500"></i>' + I18n.t("org.waitingCount", { n: e.waitlistCount }) : "") + "</p></div></div>" +
        '<div class="flex flex-wrap items-center gap-2">' + actions + "</div></div></div>"
    );
}

function bindDashboard(root) {
    root.querySelectorAll("[data-publish]").forEach((b) => b.addEventListener("click", () => publish(b.getAttribute("data-publish"))));
    root.querySelectorAll("[data-cancel-event]").forEach((b) => b.addEventListener("click", () => cancelEvent(b.getAttribute("data-cancel-event"))));
}

async function publish(id) {
    const ok = await UI.confirm({ title: I18n.t("org.publishConfirmTitle"), text: I18n.t("org.publishConfirmText"), confirmText: I18n.t("org.publish"), icon: "question" });
    if (!ok) return;
    try {
        await API.publishEvent(Auth.current().id, id);
        UI.toast(I18n.t("org.publishedToast"), "success");
        Router.handle();
    } catch (e) {
        UI.toast(e.message, "error");
    }
}

async function cancelEvent(id) {
    const ok = await UI.confirm({ title: I18n.t("org.cancelConfirmTitle"), text: I18n.t("org.cancelConfirmText"), confirmText: I18n.t("org.cancelEventBtn"), danger: true, icon: "warning" });
    if (!ok) return;
    try {
        await API.cancelEvent(Auth.current().id, id);
        UI.toast(I18n.t("org.cancelledToast"), "info");
        Router.handle();
    } catch (e) {
        UI.toast(e.message, "error");
    }
}

export async function organizerForm(id) {
    const user = Auth.current();
    let ev = null;
    if (id) {
        ev = await API.getEvent(id);
        if (!ev) return { html: UI.guard(I18n.t("form.eventNotFound"), I18n.t("form.removedText")), onMount: null };
        if (ev.organizerId !== user.id) return { html: UI.guard(I18n.t("form.noAccess"), I18n.t("form.editOwnOnly")), onMount: null };
        if (ev.status === "CANCELLED") return { html: UI.guard(I18n.t("form.cancelledEvent"), I18n.t("form.cancelledCantEdit")), onMount: null };
    }
    const d = ev || { title: "", category: "Workshop", description: "", startsAt: "", endsAt: "", location: "", url: "", capacity: 20 };

    const html =
        '<section class="container-app py-8"><a href="/organizer" class="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-600"><i class="fa-solid fa-arrow-left"></i> ' + I18n.t("preview.back") + '</a>' +
        '<div class="grid gap-8 lg:grid-cols-5"><div class="lg:col-span-3" data-aos="fade-right"><div class="card p-6 sm:p-8">' +
        '<h1 class="font-display text-2xl font-bold text-slate-800">' + (ev ? I18n.t("form.editTitle") : I18n.t("form.newTitle")) + "</h1>" +
        '<p class="mt-1 text-sm text-slate-500">' + (ev ? I18n.t("form.editSub") : I18n.t("form.newSub")) + "</p>" +
        '<form id="event-form" class="mt-6 space-y-5" novalidate>' +
        field(I18n.t("form.title"), '<input id="p-title" name="title" class="input" value="' + UI.escape(d.title) + '" placeholder="' + I18n.t("form.titlePlaceholder") + '">') +
        '<div class="grid gap-5 sm:grid-cols-2">' +
        field(I18n.t("form.category"), '<select id="p-category" name="category" class="input">' + CATS.map((c) => '<option value="' + c + '"' + (c === d.category ? " selected" : "") + ">" + UI.escape(UI.catLabel(c)) + "</option>").join("") + "</select>") +
        field(I18n.t("form.capacity"), '<input id="p-capacity" name="capacity" type="number" min="1" class="input" value="' + d.capacity + '">') +
        "</div>" +
        field(I18n.t("form.description"), '<textarea id="p-description" name="description" rows="4" class="input" placeholder="' + I18n.t("form.descPlaceholder") + '">' + UI.escape(d.description) + "</textarea>") +
        '<div class="grid gap-5 sm:grid-cols-2">' +
        field(I18n.t("form.start"), '<input id="p-startsAt" name="startsAt" type="datetime-local" class="input" value="' + toLocalInput(d.startsAt) + '">') +
        field(I18n.t("form.end"), '<input id="p-endsAt" name="endsAt" type="datetime-local" class="input" value="' + toLocalInput(d.endsAt) + '">') +
        "</div>" +
        '<div class="grid gap-5 sm:grid-cols-2">' +
        field(I18n.t("form.location"), '<input id="p-location" name="location" class="input" value="' + UI.escape(d.location) + '" placeholder="' + I18n.t("form.locationPlaceholder") + '">') +
        field(I18n.t("form.link"), '<input id="p-url" name="url" class="input" value="' + UI.escape(d.url) + '" placeholder="https://...">') +
        "</div>" +
        '<div class="flex flex-wrap gap-3 pt-2"><button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> ' + (ev ? I18n.t("form.saveChanges") : I18n.t("form.saveDraft")) + "</button>" +
        '<a href="/organizer" class="btn-secondary">' + I18n.t("form.cancel") + '</a></div></form></div></div>' +
        '<div class="lg:col-span-2" data-aos="fade-left"><div class="sticky top-24"><div class="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500"><i class="fa-solid fa-eye"></i> ' + I18n.t("form.livePreview") + '</div>' +
        '<div id="live-preview"></div></div></div></div></section>';

    return { html: html, onMount: (root) => bindForm(root, user, ev) };
}

function field(label, control) {
    return '<div><label class="label">' + label + "</label>" + control + "</div>";
}

function previewCard(data) {
    const cat = UI.categoryMeta(data.category);
    const cap = parseInt(data.capacity, 10) || 0;
    const range = data.startsAt ? UI.fmtRange(data.startsAt, data.endsAt) : I18n.t("form.previewDateTime");
    return (
        '<article class="card overflow-hidden animate-pop-in">' +
        '<div class="relative flex h-28 items-end bg-gradient-to-br from-' + cat.color + "-500 to-" + cat.color + '-700 p-4 text-white"><span class="pointer-events-none absolute right-4 top-3 text-4xl text-white/20"><i class="fa-solid ' + cat.icon + '"></i></span>' +
        '<span class="badge bg-white/20 text-white ring-white/30">' + UI.escape(UI.catLabel(data.category || "Event")) + "</span></div>" +
        '<div class="p-5"><h3 class="font-display text-lg font-semibold text-slate-800">' + (UI.escape(data.title) || '<span class="text-slate-400">' + I18n.t("form.previewTitle") + '</span>') + "</h3>" +
        '<div class="mt-2 space-y-1.5 text-sm text-slate-500"><p><i class="fa-regular fa-calendar mr-2 text-brand-500"></i>' + UI.escape(range) + "</p>" +
        '<p><i class="fa-solid fa-location-dot mr-2 text-brand-500"></i>' + (UI.escape(data.location) || I18n.t("form.previewLocation")) + "</p>" +
        '<p><i class="fa-solid fa-users mr-2 text-brand-500"></i>' + I18n.t("org.regCount", { c: 0, cap: cap }) + "</p></div>" +
        '<div class="mt-4">' + UI.progressBar(0, cap, "brand") + "</div></div></article>"
    );
}

function bindForm(root, user, ev) {
    const form = root.querySelector("#event-form");
    const preview = root.querySelector("#live-preview");
    const read = () => Object.fromEntries(new FormData(form).entries());
    const render = () => (preview.innerHTML = previewCard(read()));
    render();
    import("choices.js").then(({ default: Choices }) => {
        new Choices(root.querySelector("#p-category"), { searchEnabled: false, shouldSort: false, itemSelectText: "", allowHTML: false });
    }).catch(() => { });
    form.addEventListener("input", render);
    form.addEventListener("change", render);

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submit = form.querySelector('button[type="submit"]');
        submit.disabled = true;
        const data = read();
        try {
            if (ev) {
                await API.updateEvent(user.id, ev.id, data);
                UI.toast(I18n.t("form.changesSaved"), "success");
            } else {
                await API.createEvent(user.id, data);
                UI.toast(I18n.t("form.draftCreated"), "success");
            }
            Router.navigate("/organizer");
        } catch (err) {
            UI.toast(err.message, "error");
            submit.disabled = false;
        }
    });
}

export async function eventRegistrations(id) {
    const user = Auth.current();
    const ev = await API.getEvent(id);
    if (!ev) return { html: UI.guard(I18n.t("form.eventNotFound"), I18n.t("form.removedText")), onMount: null };
    if (ev.organizerId !== user.id) return { html: UI.guard(I18n.t("form.noAccess"), I18n.t("evreg.noAccessView")), onMount: null };

    const attendees = await API.getEventAttendees(id);
    const confirmed = attendees.confirmed;
    const waitlist = attendees.waitlist;

    const html =
        '<section class="container-app py-8"><a href="/organizer" class="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-600"><i class="fa-solid fa-arrow-left"></i> ' + I18n.t("preview.back") + '</a>' +
        '<div class="card mb-6 p-6" data-aos="fade-down"><div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">' +
        '<div><div class="flex items-center gap-2">' + UI.eventBadge(ev.status) + '<span class="text-sm text-slate-500">' + UI.escape(UI.catLabel(ev.category)) + "</span></div>" +
        '<h1 class="mt-2 font-display text-2xl font-bold text-slate-800">' + UI.escape(ev.title) + "</h1>" +
        '<p class="mt-1 text-sm text-slate-500"><i class="fa-regular fa-calendar mr-1.5"></i>' + UI.escape(UI.fmtRange(ev.startsAt, ev.endsAt)) + "</p></div>" +
        '<div class="grid grid-cols-3 gap-3 text-center">' +
        statBox(ev.confirmedCount + "/" + ev.capacity, I18n.t("evreg.confirmed"), "emerald") +
        statBox(ev.waitlistCount, I18n.t("evreg.waiting"), "amber") +
        statBox(ev.spotsLeft, I18n.t("evreg.free"), "brand") +
        "</div></div></div>" +
        '<div class="mb-5 inline-flex rounded-xl bg-slate-100 p-1" data-aos="zoom-in"><button class="tab is-active" data-tab="confirmed"><i class="fa-solid fa-circle-check mr-1.5"></i>' + I18n.t("evreg.tabConfirmed", { n: confirmed.length }) + '</button><button class="tab" data-tab="waitlist"><i class="fa-solid fa-hourglass-half mr-1.5"></i>' + I18n.t("evreg.tabWaitlist", { n: waitlist.length }) + "</button></div>" +
        '<div id="tab-confirmed">' + peopleList(confirmed, false) + "</div>" +
        '<div id="tab-waitlist" class="hidden">' + peopleList(waitlist, true) + "</div></section>";

    return { html: html, onMount: bindTabs };
}

function statBox(value, label, color) {
    return '<div class="rounded-xl bg-' + color + '-50 px-4 py-2"><div class="font-display text-xl font-bold text-' + color + '-600">' + value + '</div><div class="text-[11px] text-slate-500">' + label + "</div></div>";
}

function peopleList(items, isWaitlist) {
    if (!items.length) {
        return UI.empty({ icon: isWaitlist ? "fa-hourglass-end" : "fa-user-slash", title: isWaitlist ? I18n.t("evreg.emptyWaitlistTitle") : I18n.t("evreg.noRegTitle"), text: isWaitlist ? I18n.t("evreg.emptyWaitlistText") : I18n.t("evreg.noRegText") });
    }
    return (
        '<div class="card divide-y divide-slate-100">' +
        items
            .map((it, idx) => {
                const u = it.user || { name: "—", email: "" };
                const initials = u.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
                return (
                    '<div class="flex items-center gap-4 p-4" data-aos="' + UI.aos(idx) + '" data-aos-delay="' + idx * 40 + '">' +
                    (isWaitlist ? '<span class="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-amber-100 text-sm font-bold text-amber-700">' + it.position + "</span>" : "") +
                    '<span class="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">' + UI.escape(initials) + "</span>" +
                    '<div class="min-w-0 flex-1"><div class="truncate font-medium text-slate-800">' + UI.escape(u.name) + '</div><div class="truncate text-sm text-slate-500">' + UI.escape(u.email) + "</div></div>" +
                    '<div class="text-right text-xs text-slate-400"><i class="fa-regular fa-clock mr-1"></i>' + UI.fmtRelative(it.registration.registeredAt) + "</div></div>"
                );
            })
            .join("") +
        "</div>"
    );
}

function bindTabs(root) {
    const tabs = root.querySelectorAll(".tab");
    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("is-active"));
            tab.classList.add("is-active");
            const which = tab.getAttribute("data-tab");
            root.querySelector("#tab-confirmed").classList.toggle("hidden", which !== "confirmed");
            root.querySelector("#tab-waitlist").classList.toggle("hidden", which !== "waitlist");
        });
    });
}

export async function preview(id) {
    const user = Auth.current();
    const ev = await API.getEvent(id);
    if (!ev) return { html: UI.guard(I18n.t("form.eventNotFound"), I18n.t("form.removedText")), onMount: null };
    if (ev.organizerId !== user.id) return { html: UI.guard(I18n.t("form.noAccess"), I18n.t("preview.noAccessPreview")), onMount: null };
    const cat = UI.categoryMeta(ev.category);

    const html =
        '<div class="border-b border-amber-200 bg-amber-50"><div class="container-app flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">' +
        '<p class="flex items-center gap-2 text-sm font-medium text-amber-800"><i class="fa-solid fa-eye"></i> ' + I18n.t("preview.modeNote") + '</p>' +
        '<div class="flex gap-2"><a href="/organizer" class="btn-ghost btn-sm text-amber-800 hover:bg-amber-100"><i class="fa-solid fa-arrow-left"></i> ' + I18n.t("preview.back") + '</a>' +
        (ev.status === "DRAFT" ? '<button data-publish="' + ev.id + '" class="btn-primary btn-sm"><i class="fa-solid fa-paper-plane"></i> ' + I18n.t("preview.publish") + '</button>' : "") +
        "</div></div></div>" +
        '<section class="container-app py-8"><div class="grid gap-8 lg:grid-cols-3"><div class="lg:col-span-2" data-aos="fade-right">' +
        '<div class="overflow-hidden rounded-3xl"><div class="relative flex h-44 items-end bg-gradient-to-br from-' + cat.color + "-500 to-" + cat.color + '-700 p-6 text-white sm:h-56"><div class="pointer-events-none absolute inset-0 bg-mesh opacity-50"></div><span class="pointer-events-none absolute right-6 top-6 text-6xl text-white/20"><i class="fa-solid ' + cat.icon + '"></i></span>' +
        '<div class="relative"><span class="badge bg-white/20 text-white ring-white/30">' + UI.escape(UI.catLabel(ev.category)) + '</span><h1 class="mt-3 font-display text-2xl font-bold sm:text-3xl">' + UI.escape(ev.title) + "</h1></div></div></div>" +
        '<div class="mt-6 card p-6"><h2 class="font-display text-lg font-semibold text-slate-800">' + I18n.t("detail.description") + '</h2><p class="mt-2 whitespace-pre-line leading-relaxed text-slate-600">' + (UI.escape(ev.description) || "—") + "</p></div></div>" +
        '<aside class="lg:col-span-1" data-aos="fade-left"><div class="card p-6"><div class="flex items-baseline justify-between"><span class="font-display text-3xl font-bold text-slate-800">' + ev.confirmedCount + '<span class="text-lg text-slate-400">/' + ev.capacity + "</span></span><span class=\"text-sm text-slate-500\">" + I18n.t("preview.registered") + "</span></div>" +
        UI.progressBar(ev.confirmedCount, ev.capacity, "brand") +
        '<button class="btn-primary mt-5 w-full" disabled><i class="fa-solid fa-bolt"></i> ' + I18n.t("preview.registerNow") + '</button>' +
        '<p class="mt-2 text-center text-xs text-slate-400">' + I18n.t("preview.activeForStudents") + '</p></div></aside></div></section>';

    return { html: html, onMount: (root) => { const b = root.querySelector("[data-publish]"); if (b) b.addEventListener("click", () => publish(b.getAttribute("data-publish"))); } };
}