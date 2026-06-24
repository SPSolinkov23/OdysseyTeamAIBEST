import { UI } from "../core/ui.js";
import { API } from "../core/api.js";
import { I18n } from "../core/i18n.js";

function emptyState() {
    return UI.empty({
        icon: "fa-user-check",
        title: I18n.t("admin.noPendingTitle"),
        text: I18n.t("admin.noPendingText"),
    });
}

function row(u, i) {
    const initials = (u.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("");
    return (
        '<div class="card p-5" data-user="' + u.id + '" data-aos="' + UI.aos(i) + '" data-aos-delay="' + i * 50 + '"><div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">' +
        '<div class="flex items-center gap-4"><span class="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-sky-500 text-sm font-bold text-white">' + UI.escape(initials) + "</span>" +
        '<div><div class="flex flex-wrap items-center gap-2"><h3 class="font-display text-base font-semibold text-slate-800">' + UI.escape(u.name) + "</h3>" +
        '<span class="badge bg-amber-100 text-amber-700 ring-amber-200"><i class="fa-solid fa-user-clock"></i>' + I18n.t("admin.pending") + '</span></div>' +
        '<p class="mt-1 text-sm text-slate-500"><i class="fa-regular fa-envelope mr-1.5"></i>' + UI.escape(u.email) + '<span class="mx-2 text-slate-300">•</span><i class="fa-regular fa-clock mr-1.5"></i>' + UI.escape(I18n.t("admin.applied", { time: UI.fmtRelative(u.createdAt) })) + "</p></div></div>" +
        '<div class="flex flex-wrap items-center gap-2">' +
        '<button data-approve="' + u.id + '" class="btn-primary btn-sm"><i class="fa-solid fa-check"></i> ' + I18n.t("admin.approve") + '</button>' +
        '<button data-reject="' + u.id + '" class="btn-ghost btn-sm text-rose-600 hover:bg-rose-50"><i class="fa-solid fa-xmark"></i> ' + I18n.t("admin.reject") + '</button>' +
        "</div></div></div>"
    );
}

function listHtml(pending) {
    if (!pending.length) return emptyState();
    return pending.map((u, i) => row(u, i)).join("");
}

export async function admin() {
    const pending = await API.adminListPending();

    const html =
        '<section class="bg-hero-grid bg-grid-dots border-b border-slate-200/70 bg-white"><div class="container-app py-10" data-aos="fade-right">' +
        '<span class="badge bg-brand-50 text-brand-700 ring-brand-200"><i class="fa-solid fa-shield-halved"></i>' + I18n.t("admin.badge") + '</span>' +
        '<h1 class="mt-3 font-display text-3xl font-bold text-slate-800">' + I18n.t("admin.title") + '</h1>' +
        '<p class="mt-1 text-slate-500">' + I18n.t("admin.subtitle") + '</p></div></section>' +
        '<section class="container-app py-8"><div id="admin-list" class="space-y-4">' + listHtml(pending) + "</div></section>";

    return { html: html, onMount: bind };
}

function bind(root) {
    root.querySelectorAll("[data-approve]").forEach((b) => b.addEventListener("click", () => decide(root, b.getAttribute("data-approve"), "approve")));
    root.querySelectorAll("[data-reject]").forEach((b) => b.addEventListener("click", () => decide(root, b.getAttribute("data-reject"), "reject")));
}

async function decide(root, id, action) {
    const isApprove = action === "approve";
    const ok = await UI.confirm({
        title: isApprove ? I18n.t("admin.approveTitle") : I18n.t("admin.rejectTitle"),
        text: isApprove ? I18n.t("admin.approveText") : I18n.t("admin.rejectText"),
        confirmText: isApprove ? I18n.t("admin.approve") : I18n.t("admin.reject"),
        danger: !isApprove,
        icon: isApprove ? "question" : "warning",
    });
    if (!ok) return;

    try {
        if (isApprove) await API.adminApprove(id);
        else await API.adminReject(id);

        UI.toast(isApprove ? I18n.t("admin.approvedToast") : I18n.t("admin.rejectedToast"), isApprove ? "success" : "info");

        const card = root.querySelector('[data-user="' + id + '"]');
        if (card) card.remove();

        const list = root.querySelector("#admin-list");
        if (list && !list.querySelector("[data-user]")) list.innerHTML = emptyState();
    } catch (e) {
        UI.toast(e.message, "error");
    }
}