import { Auth } from "../core/auth.js";
import { UI } from "../core/ui.js";
import { Bus } from "../core/bus.js";
import { Router } from "../core/router.js";
import { I18n } from "../core/i18n.js";

function brandPanel() {
    return (
        '<div class="relative hidden overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-sky-500 p-10 text-white lg:flex lg:flex-col lg:justify-between">' +
        '<div class="pointer-events-none absolute inset-0 bg-mesh opacity-70"></div>' +
        '<div class="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"></div>' +
        '<div class="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl"></div>' +
        '<div class="relative">' +
        '<div class="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 ring-1 ring-white/30"><i class="fa-solid fa-graduation-cap text-lg"></i><span class="font-display text-sm font-semibold tracking-wide">Team Odyssey</span></div>' +
        '<h2 class="mt-8 font-display text-4xl font-bold leading-tight text-balance">' + I18n.t("auth.brandTitle") + '</h2>' +
        '<p class="mt-4 max-w-sm text-white/80">' + I18n.t("auth.brandSubtitle") + '</p>' +
        "</div>" +
        '<div class="relative mt-10 space-y-3">' +
        feature("fa-calendar-check", I18n.t("auth.feature1")) +
        feature("fa-people-arrows", I18n.t("auth.feature2")) +
        feature("fa-bell", I18n.t("auth.feature3")) +
        "</div></div>"
    );
}

function feature(icon, text) {
    return (
        '<div class="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur">' +
        '<span class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20"><i class="fa-solid ' + icon + '"></i></span>' +
        '<span class="text-sm font-medium text-white/90">' + text + "</span></div>"
    );
}

const ROLE_BASE = "role-card flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition";
const ROLE_ON = "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200 dark:border-brand-600 dark:bg-brand-900/30 dark:text-brand-400";
const ROLE_OFF = "border-slate-200 text-slate-600 hover:border-brand-300 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:border-brand-600 dark:hover:bg-slate-700";

function roleCard(value, icon, label, active) {
    return '<button type="button" data-role="' + value + '" class="' + ROLE_BASE + " " + (active ? ROLE_ON : ROLE_OFF) + '"><i class="fa-solid ' + icon + '"></i>' + label + "</button>";
}

export function auth(mode) {
    const isLogin = mode !== "register";
    const html =
        '<section class="container-app py-10 lg:py-16"><div class="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">' +
        '<div data-aos="fade-right">' + brandPanel() + "</div>" +
        '<div class="flex items-center" data-aos="fade-left">' +
        '<div class="card w-full p-7 sm:p-9">' +
        '<div class="mb-6 lg:hidden"><div class="inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"><i class="fa-solid fa-graduation-cap"></i><span class="font-display font-semibold">Team Odyssey</span></div></div>' +
        '<h1 class="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">' + (isLogin ? I18n.t("auth.signInTitle") : I18n.t("auth.createTitle")) + "</h1>" +
        '<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">' + (isLogin ? I18n.t("auth.signInSub") : I18n.t("auth.createSub")) + "</p>" +
        '<form id="auth-form" class="mt-6 space-y-4" novalidate>' +
        (isLogin
            ? ""
            : '<div><label class="label" for="f-name">' + I18n.t("auth.fullName") + '</label><input id="f-name" name="name" class="input" placeholder="' + I18n.t("auth.fullNamePlaceholder") + '" autocomplete="name"></div>') +
        (isLogin
            ? ""
            : '<div><label class="label">' + I18n.t("auth.registerAs") + '</label><div class="grid grid-cols-2 gap-3">' +
              roleCard("student", "fa-user-graduate", I18n.t("auth.student"), true) +
              roleCard("organizer", "fa-user-tie", I18n.t("auth.organizer"), false) +
              '</div><input type="hidden" name="role" id="f-role" value="student">' +
              '<p class="mt-1.5 text-xs text-slate-400">' + I18n.t("auth.organizerNote") + '</p></div>') +
        '<div><label class="label" for="f-email">' + I18n.t("auth.email") + '</label><input id="f-email" type="email" name="email" class="input" placeholder="' + I18n.t("auth.emailPlaceholder") + '" autocomplete="email"></div>' +
        '<div><label class="label" for="f-pass">' + I18n.t("auth.password") + '</label><div class="relative"><input id="f-pass" type="password" name="password" class="input pr-11" placeholder="••••••" autocomplete="' + (isLogin ? "current-password" : "new-password") + '"><button type="button" id="toggle-pass" class="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-brand-600"><i class="fa-solid fa-eye"></i></button></div>' +
        (isLogin ? "" : '<div id="pass-meter" class="mt-2 hidden"><div class="flex gap-1">' +
            '<span class="pass-seg h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700"></span><span class="pass-seg h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700"></span><span class="pass-seg h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700"></span><span class="pass-seg h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700"></span>' +
            '</div><p id="pass-label" class="mt-1 text-xs font-medium text-slate-400"></p></div>') +
        (isLogin ? "" : '<p class="mt-1 text-xs text-slate-400">' + I18n.t("auth.passwordHint") + '</p>') +
        "</div>" +
        '<button type="submit" class="btn-primary w-full"><i class="fa-solid ' + (isLogin ? "fa-right-to-bracket" : "fa-user-plus") + '"></i>' + (isLogin ? I18n.t("auth.signInBtn") : I18n.t("auth.signUpBtn")) + "</button>" +
        "</form>" +
        '<p class="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">' +
        (isLogin
            ? I18n.t("auth.noAccount") + ' <a href="/register" class="font-semibold text-brand-600 hover:text-brand-700">' + I18n.t("auth.createOne") + "</a>"
            : I18n.t("auth.haveAccount") + ' <a href="/login" class="font-semibold text-brand-600 hover:text-brand-700">' + I18n.t("auth.signInBtn") + "</a>") +
        "</p></div></div></div></section>";

    return { html: html, onMount: (root) => bind(root, isLogin) };
}

function passScore(pw) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (pw.length >= 12) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[@$!%*?&]/.test(pw)) s++;
    return s;
}

function bind(root, isLogin) {
    const form = root.querySelector("#auth-form");
    const toggle = root.querySelector("#toggle-pass");
    const roleInput = root.querySelector("#f-role");

    if (!isLogin) {
        const pass = root.querySelector("#f-pass");
        const meter = root.querySelector("#pass-meter");
        const segs = root.querySelectorAll("#pass-meter .pass-seg");
        const label = root.querySelector("#pass-label");
        const colors = ["", "bg-rose-500", "bg-amber-500", "bg-sky-500", "bg-emerald-500"];
        const texts = ["", "text-rose-500", "text-amber-500", "text-sky-500", "text-emerald-500"];
        const labels = ["", I18n.t("auth.pwWeak"), I18n.t("auth.pwFair"), I18n.t("auth.pwGood"), I18n.t("auth.pwStrong")];
        pass.addEventListener("input", () => {
            const v = pass.value;
            if (!v) { meter.classList.add("hidden"); return; }
            meter.classList.remove("hidden");
            const s = passScore(v);
            const level = s <= 1 ? 1 : s <= 3 ? 2 : s === 4 ? 3 : 4;
            segs.forEach((seg, i) => {
                seg.className = "pass-seg h-1.5 flex-1 rounded-full transition-colors " + (i < level ? colors[level] : "bg-slate-200 dark:bg-slate-700");
            });
            label.className = "mt-1 text-xs font-medium " + texts[level];
            label.textContent = labels[level];
        });
    }
    if (roleInput) {
        root.querySelectorAll(".role-card").forEach((card) => {
            card.addEventListener("click", () => {
                const val = card.getAttribute("data-role");
                roleInput.value = val;
                root.querySelectorAll(".role-card").forEach((c) => {
                    c.className = ROLE_BASE + " " + (c.getAttribute("data-role") === val ? ROLE_ON : ROLE_OFF);
                });
            });
        });
    }
    if (toggle) {
        toggle.addEventListener("click", () => {
            const input = root.querySelector("#f-pass");
            const icon = toggle.querySelector("i");
            const show = input.type === "password";
            input.type = show ? "text" : "password";
            icon.className = "fa-solid " + (show ? "fa-eye-slash" : "fa-eye");
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submit = form.querySelector('button[type="submit"]');
        submit.disabled = true;
        const data = Object.fromEntries(new FormData(form).entries());
        try {
            const user = isLogin ? await Auth.login(data.email, data.password) : await Auth.register(data);
            done(user);
        } catch (err) {
            UI.toast(err.message, "error");
            submit.disabled = false;
        }
    });
}

function done(user) {
    UI.toast(I18n.t("auth.greeting", { name: user.name.split(" ")[0] }), "success");
    Bus.emit("auth");
    Router.navigate(user.role === "organizer" ? "/organizer" : "/events");
}