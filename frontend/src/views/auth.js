import { Auth } from "../core/auth.js";
import { UI } from "../core/ui.js";
import { Bus } from "../core/bus.js";
import { Router } from "../core/router.js";
import { I18n } from "../core/i18n.js";

const ROLE_BASE = "role-card flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition";
const ROLE_ON = "bg-white text-brand-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-700 dark:text-brand-400 dark:ring-slate-600";
const ROLE_OFF = "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200";

const TAB_ON = "rounded-lg bg-white py-2.5 text-center text-sm font-semibold text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-400";
const TAB_OFF = "rounded-lg py-2.5 text-center text-sm font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200";

function roleCard(value, icon, label, active) {
    return '<button type="button" data-role="' + value + '" class="' + ROLE_BASE + " " + (active ? ROLE_ON : ROLE_OFF) + '"><i class="fa-solid ' + icon + '"></i>' + label + "</button>";
}

function inputField(opts) {
    return (
        '<div><label class="label" for="' + opts.id + '">' + opts.label + "</label>" +
        '<div class="relative">' +
        '<i class="fa-solid ' + opts.icon + ' pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>' +
        '<input id="' + opts.id + '" name="' + opts.name + '"' + (opts.type ? ' type="' + opts.type + '"' : "") + ' class="input pl-11' + (opts.extraClass ? " " + opts.extraClass : "") + '" placeholder="' + opts.placeholder + '" autocomplete="' + opts.autocomplete + '">' +
        (opts.trailing || "") +
        "</div>" + (opts.below || "") + "</div>"
    );
}

export function auth(mode) {
    const isLogin = mode !== "register";
    const passToggle =
        '<button type="button" id="toggle-pass" class="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-brand-600"><i class="fa-solid fa-eye"></i></button>';
    const passMeter = isLogin
        ? ""
        : '<div id="pass-meter" class="mt-2 hidden"><div class="flex gap-1">' +
          '<span class="pass-seg h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700"></span><span class="pass-seg h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700"></span><span class="pass-seg h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700"></span><span class="pass-seg h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700"></span>' +
          '</div><p id="pass-label" class="mt-1 text-xs font-medium text-slate-400"></p></div>';

    const html =
        '<section class="relative isolate flex min-h-[calc(100vh-9rem)] items-center justify-center overflow-hidden px-4 py-10">' +
        '<div class="absolute inset-0 -z-10 bg-gradient-to-br from-brand-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900"></div>' +
        '<div class="absolute inset-0 -z-10 bg-hero-grid bg-grid-dots auth-grid opacity-60"></div>' +
        '<div class="auth-card card w-full max-w-md p-8" data-mode="' + (isLogin ? "login" : "register") + '">' +
        '<div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-sky-500 text-white shadow-soft"><i class="fa-solid fa-graduation-cap text-xl"></i></div>' +
        '<p class="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">' + (isLogin ? I18n.t("auth.signInSub") : I18n.t("auth.createSub")) + "</p>" +
        '<div class="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-700/50">' +
        '<a href="/login" class="' + (isLogin ? TAB_ON : TAB_OFF) + '">' + I18n.t("auth.signInBtn") + "</a>" +
        '<a href="/register" class="' + (!isLogin ? TAB_ON : TAB_OFF) + '">' + I18n.t("auth.signUpBtn") + "</a>" +
        "</div>" +
        '<form id="auth-form" class="mt-6 space-y-4" novalidate>' +
        (isLogin ? "" : inputField({ id: "f-name", name: "name", icon: "fa-user", label: I18n.t("auth.fullName"), placeholder: I18n.t("auth.fullNamePlaceholder"), autocomplete: "name" })) +
        (isLogin
            ? ""
            : '<div><label class="label">' + I18n.t("auth.registerAs") + '</label>' +
              '<div class="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-700/50">' +
              roleCard("student", "fa-user-graduate", I18n.t("auth.student"), true) +
              roleCard("organizer", "fa-user-tie", I18n.t("auth.organizer"), false) +
              '</div><input type="hidden" name="role" id="f-role" value="student">' +
              '<p class="mt-1.5 text-xs text-slate-400">' + I18n.t("auth.organizerNote") + "</p></div>") +
        inputField({ id: "f-email", name: "email", type: "email", icon: "fa-envelope", label: I18n.t("auth.email"), placeholder: I18n.t("auth.emailPlaceholder"), autocomplete: "email" }) +
        inputField({
            id: "f-pass",
            name: "password",
            type: "password",
            icon: "fa-lock",
            label: I18n.t("auth.password"),
            placeholder: "••••••",
            autocomplete: isLogin ? "current-password" : "new-password",
            extraClass: "pr-11",
            trailing: passToggle,
            below: passMeter,
        }) +
        '<button type="submit" class="btn-primary mt-1 w-full bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-700 hover:to-sky-600"><i class="fa-solid ' + (isLogin ? "fa-right-to-bracket" : "fa-arrow-right") + '"></i>' + (isLogin ? I18n.t("auth.signInBtn") : I18n.t("auth.signUpBtn")) + "</button>" +
        "</form></div></section>";

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
