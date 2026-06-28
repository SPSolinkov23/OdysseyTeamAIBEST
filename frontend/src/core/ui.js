import { I18n } from "./i18n.js";

const months = {
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    bg: ["Яну", "Фев", "Мар", "Апр", "Май", "Юни", "Юли", "Авг", "Сеп", "Окт", "Ное", "Дек"],
};
const monthsFull = {
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    bg: ["Януари", "Февруари", "Март", "Април", "Май", "Юни", "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"],
};

const CATEGORIES = {
    "Workshop": { icon: "fa-laptop-code", color: "sky" },
    "Lecture": { icon: "fa-chalkboard-user", color: "violet" },
    "Club": { icon: "fa-robot", color: "indigo" },
    "Sports": { icon: "fa-basketball", color: "amber" },
    "Seminar": { icon: "fa-lightbulb", color: "emerald" },
    "Hackathon": { icon: "fa-code", color: "blue" },
    "Trip": { icon: "fa-bus", color: "rose" },
};

const REG_STATUS = {
    CONFIRMED: { labelKey: "reg.confirmed", color: "emerald", icon: "fa-circle-check" },
    WAITLISTED: { labelKey: "reg.waitlist", color: "amber", icon: "fa-hourglass-half" },
    CANCELLED: { labelKey: "reg.cancelled", color: "slate", icon: "fa-ban" },
};

const EVENT_STATUS = {
    DRAFT: { labelKey: "event.draft", color: "slate", icon: "fa-pen-ruler" },
    PUBLISHED: { labelKey: "event.published", color: "sky", icon: "fa-tower-broadcast" },
    CANCELLED: { labelKey: "event.cancelled", color: "rose", icon: "fa-ban" },
};

let toastifyLib = null;
let swalLib = null;
let dayjsLib = null;

async function initDates() {
    try {
        dayjsLib = (await import("dayjs")).default;
        const relativeTime = (await import("dayjs/plugin/relativeTime")).default;
        dayjsLib.extend(relativeTime);
        try {
            const bg = (await import("dayjs/locale/bg")).default;
            if (bg) dayjsLib.locale("bg", bg, true);
        } catch (e) { }
    } catch (e) {
        dayjsLib = null;
    }
}

async function getToastify() {
    if (!toastifyLib) toastifyLib = (await import("toastify-js")).default;
    return toastifyLib;
}

async function getSwal() {
    if (!swalLib) swalLib = (await import("sweetalert2")).default;
    return swalLib;
}

function escape(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtDate(iso) {
    const d = new Date(iso);
    return d.getDate() + " " + (monthsFull[I18n.get()] || monthsFull.en)[d.getMonth()] + " " + d.getFullYear();
}

function fmtTime(iso) {
    const d = new Date(iso);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function fmtRange(startIso, endIso) {
    const s = new Date(startIso);
    const e = new Date(endIso || startIso);
    const sameDay = s.toDateString() === e.toDateString();
    if (sameDay) return fmtDate(startIso) + " · " + fmtTime(startIso) + "–" + fmtTime(endIso || startIso);
    return fmtDate(startIso) + " " + fmtTime(startIso) + " → " + fmtDate(endIso) + " " + fmtTime(endIso);
}

function fmtShort(iso) {
    const d = new Date(iso);
    return d.getDate() + " " + (months[I18n.get()] || months.en)[d.getMonth()];
}

function fmtRelative(iso) {
    if (dayjsLib) {
        try { return dayjsLib(iso).locale(I18n.get()).fromNow(); } catch (e) { }
    }
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.round(diff / 60000);
    if (m < 1) return I18n.t("time.justNow");
    if (m < 60) return I18n.t("time.minAgo", { n: m });
    const h = Math.round(m / 60);
    if (h < 24) return I18n.t("time.hAgo", { n: h });
    const d = Math.round(h / 24);
    return I18n.t("time.daysAgo", { n: d });
}

function categoryMeta(cat) {
    return CATEGORIES[cat] || { icon: "fa-calendar-star", color: "slate" };
}

function notifText(n) {
    const d = n.data || {};
    let key = "notif." + n.type;
    if (n.type === "RegistrationWaitlisted" && d.position == null) key = "notif.RegistrationWaitlistedNoPos";
    if (!I18n.exists(key)) return n.message || "";
    return I18n.t(key, { event: d.eventTitle, position: d.position, name: d.name });
}

function regBadge(status) {
    const m = REG_STATUS[status] || REG_STATUS.CANCELLED;
    return '<span class="badge bg-' + m.color + '-100 text-' + m.color + '-700 ring-' + m.color + '-200"><i class="fa-solid ' + m.icon + '"></i>' + I18n.t(m.labelKey) + "</span>";
}

function eventBadge(status) {
    const m = EVENT_STATUS[status] || EVENT_STATUS.DRAFT;
    return '<span class="badge bg-' + m.color + '-100 text-' + m.color + '-700 ring-' + m.color + '-200"><i class="fa-solid ' + m.icon + '"></i>' + I18n.t(m.labelKey) + "</span>";
}

function toast(message, type) {
    const palette = {
        success: "linear-gradient(135deg,#059669,#10b981)",
        error: "linear-gradient(135deg,#e11d48,#fb7185)",
        info: "linear-gradient(135deg,#2563eb,#38bdf8)",
        warn: "linear-gradient(135deg,#d97706,#fbbf24)",
    };
    const icons = { success: "fa-circle-check", error: "fa-circle-exclamation", info: "fa-circle-info", warn: "fa-triangle-exclamation" };
    const t = type || "info";
    getToastify().then((Toastify) => {
        Toastify({
            text: '<i class="fa-solid ' + (icons[t] || icons.info) + '" style="margin-right:.55rem"></i><span>' + escape(message) + "</span>",
            escapeMarkup: false,
            duration: 4200,
            gravity: "top",
            position: "right",
            close: true,
            stopOnFocus: true,
            style: {
                background: palette[t] || palette.info,
                borderRadius: "14px",
                boxShadow: "0 14px 34px -14px rgba(2,132,199,.5)",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                padding: "12px 16px",
            },
        }).showToast();
    });
}

async function confirmDialog(opts) {
    const o = opts || {};
    const Swal = await getSwal();
    return Swal.fire({
        title: o.title || I18n.t("dialog.areYouSure"),
        html: o.text || "",
        icon: o.icon || "question",
        showCancelButton: true,
        confirmButtonText: o.confirmText || I18n.t("dialog.confirm"),
        cancelButtonText: o.cancelText || I18n.t("dialog.cancel"),
        reverseButtons: true,
        buttonsStyling: false,
        customClass: {
            popup: "rounded-2xl",
            title: "!text-slate-800 dark:!text-slate-100 !font-display",
            confirmButton: o.danger ? "btn-danger mx-1" : "btn-primary mx-1",
            cancelButton: "btn-secondary mx-1",
        },
    }).then((r) => r.isConfirmed);
}

async function alertDialog(opts) {
    const o = opts || {};
    const Swal = await getSwal();
    return Swal.fire({
        title: o.title || "",
        html: o.text || "",
        icon: o.icon || "success",
        confirmButtonText: o.confirmText || I18n.t("dialog.ok"),
        buttonsStyling: false,
        customClass: { popup: "rounded-2xl", title: "!text-slate-800 dark:!text-slate-100 !font-display", confirmButton: "btn-primary" },
    });
}

function empty(o) {
    return (
        '<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-800/40" data-aos="zoom-in">' +
        '<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-2xl text-brand-500 dark:bg-brand-900/30 dark:text-brand-400"><i class="fa-solid ' + (o.icon || "fa-inbox") + '"></i></div>' +
        '<h3 class="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">' + escape(o.title || I18n.t("ui.nothingHere")) + "</h3>" +
        '<p class="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">' + escape(o.text || "") + "</p>" +
        (o.actionHtml ? '<div class="mt-5">' + o.actionHtml + "</div>" : "") +
        "</div>"
    );
}

function guard(title, text) {
    return (
        '<section class="container-app py-20"><div class="mx-auto max-w-lg rounded-2xl border border-rose-100 bg-white p-10 text-center shadow-soft dark:border-rose-900/30 dark:bg-slate-800" data-aos="flip-up">' +
        '<div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-2xl text-rose-500 dark:bg-rose-900/30"><i class="fa-solid fa-lock"></i></div>' +
        '<h2 class="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">' + escape(title) + "</h2>" +
        '<p class="mt-2 text-slate-500 dark:text-slate-400">' + escape(text) + "</p>" +
        '<a href="/" class="btn-primary mt-6"><i class="fa-solid fa-house"></i> ' + I18n.t("ui.goHome") + '</a></div></section>'
    );
}

function aos(i) {
    const palette = ["fade-up", "zoom-in-up", "flip-up", "fade-up-right", "fade-up-left", "zoom-in"];
    return palette[i % palette.length];
}

function progressBar(value, max, color) {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    const c = color || "brand";
    return (
        '<div class="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div class="h-full rounded-full bg-' + c + '-500 transition-all duration-700" style="width:' + pct + '%"></div></div>'
    );
}

export const UI = {
    initDates,
    escape,
    fmtDate,
    fmtTime,
    fmtRange,
    fmtShort,
    fmtRelative,
    categoryMeta,
    catLabel: (name) => I18n.cat(name),
    notifText,
    regBadge,
    eventBadge,
    toast,
    confirm: confirmDialog,
    alert: alertDialog,
    empty,
    guard,
    aos,
    progressBar,
};