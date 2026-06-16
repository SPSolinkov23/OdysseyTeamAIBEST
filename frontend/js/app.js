(function () {
    function isActive(href, cur) {
        if (href === "#/events") return cur === "#/events" || cur.indexOf("#/events/") === 0;
        if (href === "#/organizer") return cur === "#/organizer" || cur.indexOf("#/organizer/events") === 0;
        return cur === href;
    }

    function navLink(href, icon, label, cur) {
        return '<a href="' + href + '" class="nav-link ' + (isActive(href, cur) ? "nav-link-active" : "") + '"><i class="fa-solid ' + icon + '"></i> ' + label + "</a>";
    }

    function bell(user, cur) {
        const n = window.API.unreadCount(user.id);
        return (
            '<a href="#/notifications" class="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-brand-50 hover:text-brand-600 ' + (cur === "#/notifications" ? "bg-brand-50 text-brand-600" : "") + '" aria-label="Notifications"><i class="fa-solid fa-bell text-lg"></i>' +
            (n > 0 ? '<span class="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">' + (n > 9 ? "9+" : n) + "</span>" : "") +
            "</a>"
        );
    }

    function avatar(user) {
        const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
        return (
            '<div class="relative" id="user-menu"><button id="user-btn" class="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition hover:bg-slate-100">' +
            '<span class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-sky-500 text-sm font-bold text-white">' + window.UI.escape(initials) + "</span>" +
            '<span class="hidden text-left sm:block"><span class="block text-sm font-semibold leading-tight text-slate-800">' + window.UI.escape(user.name.split(" ")[0]) + '</span><span class="block text-[11px] leading-tight text-slate-400">' + (user.role === "organizer" ? "Organizer" : "Student") + "</span></span>" +
            '<i class="fa-solid fa-chevron-down text-xs text-slate-400"></i></button>' +
            '<div id="user-dropdown" class="absolute right-0 z-50 mt-2 hidden w-56 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-soft">' +
            '<div class="border-b border-slate-100 px-3 py-2"><div class="text-sm font-semibold text-slate-800">' + window.UI.escape(user.name) + '</div><div class="truncate text-xs text-slate-500">' + window.UI.escape(user.email) + "</div></div>" +
            '<button id="tour-btn" class="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><i class="fa-solid fa-route w-4"></i> Replay the tour</button>' +
            '<button id="logout-btn" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"><i class="fa-solid fa-right-from-bracket w-4"></i> Sign out</button>' +
            "</div></div>"
        );
    }

    function renderNav() {
        const header = document.getElementById("nav");
        const user = window.Auth.current();
        const cur = location.hash || "#/";

        const brand =
            '<a href="#/" class="flex items-center gap-2.5"><span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-sky-500 text-white shadow-soft"><i class="fa-solid fa-graduation-cap"></i></span>' +
            '<span class="font-display text-base font-bold leading-tight text-slate-800">School Events<span class="block text-[11px] font-medium text-slate-400">Team Odyssey</span></span></a>';

        let center = "";
        let right = "";
        let mobile = "";

        if (user) {
            const links =
                user.role === "organizer"
                    ? [["#/organizer", "fa-gauge-high", "Dashboard"], ["#/organizer/new", "fa-plus", "New event"]]
                    : [["#/events", "fa-compass", "Events"], ["#/my-registrations", "fa-ticket", "My registrations"]];
            center = '<nav class="hidden items-center gap-1 md:flex">' + links.map((l) => navLink(l[0], l[1], l[2], cur)).join("") + "</nav>";
            right = '<div class="flex items-center gap-1.5">' + bell(user, cur) + avatar(user) + '<button id="burger" class="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 md:hidden"><i class="fa-solid fa-bars text-lg"></i></button></div>';
            mobile = '<div id="mobile-menu" class="hidden border-t border-slate-200 bg-white px-4 py-3 md:hidden"><nav class="flex flex-col gap-1">' + links.map((l) => navLink(l[0], l[1], l[2], cur)).join("") + "</nav></div>";
        } else {
            right = '<div class="flex items-center gap-2"><a href="#/login" class="btn-ghost"><i class="fa-solid fa-right-to-bracket"></i> Sign in</a><a href="#/register" class="btn-primary">Create account</a></div>';
        }

        header.innerHTML =
            '<div class="glass border-b border-slate-200/70"><div class="container-app flex h-16 items-center justify-between">' + brand + center + right + "</div>" + mobile + "</div>";

        wireNav();
    }

    function wireNav() {
        const burger = document.getElementById("burger");
        if (burger) burger.addEventListener("click", () => document.getElementById("mobile-menu").classList.toggle("hidden"));

        const userBtn = document.getElementById("user-btn");
        if (userBtn) {
            const dd = document.getElementById("user-dropdown");
            userBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                dd.classList.toggle("hidden");
            });
            document.getElementById("tour-btn").addEventListener("click", () => {
                dd.classList.add("hidden");
                const home = window.Auth.isOrganizer() ? "#/organizer" : "#/events";
                if (location.hash !== home) location.hash = home;
                setTimeout(() => window.Tour.replay(), location.hash !== home ? 400 : 0);
            });
            document.getElementById("logout-btn").addEventListener("click", async () => {
                await window.Auth.logout();
                window.UI.toast("Signed out. See you soon! \ud83d\udc4b", "info");
                window.Bus.emit("auth");
                location.hash = "#/login";
            });
        }
    }

    document.addEventListener("click", () => {
        const dd = document.getElementById("user-dropdown");
        if (dd) dd.classList.add("hidden");
    });

    // --- Notification polling -------------------------------------------------
    const seen = new Set();
    let primed = false;

    function toastIfImportant(n) {
        if (n.type === "WaitlistPromoted") window.UI.toast(n.message, "success");
        else if (n.type === "EventCancelled") window.UI.toast(n.message, "error");
    }

    async function syncNotifications() {
        const u = window.Auth.current();
        if (!u) {
            primed = false;
            seen.clear();
            return;
        }
        let list;
        try {
            list = await window.API.refreshNotifications();
        } catch (e) {
            return;
        }
        if (!primed) {
            list.forEach((n) => seen.add(n.id));
            primed = true;
        } else {
            list.forEach((n) => {
                if (!seen.has(n.id)) {
                    seen.add(n.id);
                    toastIfImportant(n);
                }
            });
        }
        window.Bus.emit("notifications");
    }

    window.App = {
        rerender() {
            window.Router.handle();
        },
        // Views call this after an action that creates a notification for the user.
        refreshNotifications: syncNotifications,
    };

    async function boot() {
        await window.Auth.restore();

        if (window.AOS) window.AOS.init({ duration: 650, easing: "ease-out-cubic", once: true, offset: 40, mirror: false });

        if (window.Lenis) {
            const lenis = new window.Lenis({ duration: 1.05, smoothWheel: true, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
            window.lenis = lenis;
            const raf = (time) => {
                lenis.raf(time);
                requestAnimationFrame(raf);
            };
            requestAnimationFrame(raf);
        }

        window.Bus.on("auth", renderNav);
        window.Bus.on("auth", syncNotifications);
        window.Bus.on("route", renderNav);
        window.Bus.on("notifications", renderNav);

        window.Bus.on("route", (hash) => {
            const u = window.Auth.current();
            if (u && (hash === "#/events" || hash === "#/organizer")) window.Tour.maybeStart(u);
        });

        window.addEventListener("hashchange", () => window.Router.handle());

        renderNav();
        if (!location.hash) location.hash = "#/";
        else await window.Router.handle();

        if (window.Auth.current()) syncNotifications();
        setInterval(syncNotifications, 30000);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();
