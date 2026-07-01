import { Bus } from "../core/bus.js";
import { I18n } from "../core/i18n.js";

const POLL_MS = 30000;
const TIMEOUT_MS = 6000;

const VIEW = {
    checking: { dot: "bg-slate-400", ping: "bg-slate-400", text: "text-slate-500 dark:text-slate-400", pulse: false },
    operational: { dot: "bg-emerald-500", ping: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", pulse: true },
    degraded: { dot: "bg-amber-500", ping: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", pulse: true },
    down: { dot: "bg-rose-500", ping: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", pulse: false },
};

const PART_UP = { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
const PART_DOWN = { dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" };

let state = { kind: "checking", apiUp: false, dbUp: false };
let timer = null;

function ping(path) {
    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const id = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
    return fetch("/api" + path, { headers: { Accept: "application/json" }, signal: ctrl ? ctrl.signal : undefined })
        .then((res) => res.ok)
        .catch(() => false)
        .finally(() => { if (id) clearTimeout(id); });
}

async function probe() {
    const [apiUp, dbUp] = await Promise.all([ping("/health"), ping("/health/ready")]);
    const kind = !apiUp ? "down" : dbUp ? "operational" : "degraded";
    state = { kind, apiUp, dbUp: apiUp && dbUp };
}

function part(label, icon, up) {
    const p = up ? PART_UP : PART_DOWN;
    return (
        "<div class=\"flex items-center justify-between gap-4\">" +
        "<span class=\"flex items-center gap-2 text-slate-600 dark:text-slate-300\"><i class=\"fa-solid " + icon + " w-3.5 text-center text-slate-400\"></i>" + label + "</span>" +
        "<span class=\"flex items-center gap-1.5 font-medium " + p.text + "\"><span class=\"h-1.5 w-1.5 rounded-full " + p.dot + "\"></span>" + (up ? I18n.t("status.up") : I18n.t("status.unavailable")) + "</span>" +
        "</div>"
    );
}

function render(root) {
    const v = VIEW[state.kind] || VIEW.checking;
    const label = I18n.t("status." + state.kind);
    const apiUp = state.kind === "checking" ? false : state.apiUp;
    const dbUp = state.kind === "checking" ? false : state.dbUp;

    root.innerHTML =
        "<div class=\"group relative inline-flex\">" +
        "<button type=\"button\" class=\"flex items-center gap-2 rounded-full px-2.5 py-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-700/60\">" +
        "<span class=\"relative flex h-2.5 w-2.5\">" +
        (v.pulse ? "<span class=\"absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 " + v.ping + "\"></span>" : "") +
        "<span class=\"relative inline-flex h-2.5 w-2.5 rounded-full " + v.dot + "\"></span>" +
        "</span>" +
        "<span class=\"font-semibold " + v.text + "\">" + label + "</span>" +
        "</button>" +
        "<div class=\"pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 w-64 -translate-x-1/2 translate-y-1 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-soft opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-800 sm:left-0 sm:translate-x-0\">" +
        "<p class=\"mb-2 flex items-center gap-2 font-display text-[13px] font-bold text-slate-800 dark:text-slate-100\"><i class=\"fa-solid fa-heart-pulse text-brand-500\"></i>" + I18n.t("status.heading") + "</p>" +
        "<div class=\"space-y-1.5\">" +
        part(I18n.t("status.api"), "fa-server", apiUp) +
        part(I18n.t("status.database"), "fa-database", dbUp) +
        "</div>" +
        "</div>" +
        "</div>";
}

export async function initStatus() {
    const root = document.getElementById("site-status");
    if (!root) return;

    render(root);
    Bus.on("lang", () => render(root));

    const tick = async () => {
        await probe();
        render(root);
    };

    await tick();
    if (timer) clearInterval(timer);
    timer = setInterval(tick, POLL_MS);
}
