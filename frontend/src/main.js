import { Bus } from "./core/bus.js";
import { Auth } from "./core/auth.js";
import { Router } from "./core/router.js";
import { renderNav, updateBell } from "./core/nav.js";
import { refreshNotifications } from "./core/notifications.js";
import { initAos } from "./core/anim.js";
import { initScroll } from "./core/scroll.js";
import { Tour } from "./features/tour.js";
import { I18n } from "./core/i18n.js";
import { Theme } from "./core/theme.js";
import { UI } from "./core/ui.js";

async function boot() {
    document.documentElement.lang = I18n.get();
    Theme.apply(Theme.get());
    await UI.initDates();
    await Auth.restore();
    await initAos();
    initScroll();

    Bus.on("auth", renderNav);
    Bus.on("auth", refreshNotifications);
    Bus.on("route", renderNav);
    Bus.on("notifications", updateBell);
    Bus.on("lang", () => {
        const run = () => { renderNav(); return Router.handle(); };
        const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (typeof document.startViewTransition === "function" && !reduce) document.startViewTransition(run);
        else run();
    });
    Bus.on("theme", renderNav);

    Bus.on("route", (path) => {
        const u = Auth.current();
        if (u && (path === "/events" || path === "/organizer")) Tour.maybeStart(u);
    });

    window.addEventListener("popstate", () => Router.handle());

    document.addEventListener("click", (e) => {
        const a = e.target.closest("a[href]");
        if (!a || a.target === "_blank" || a.origin !== location.origin) return;
        e.preventDefault();
        history.pushState(null, "", a.pathname);
        Router.handle();
    });

    renderNav();
    await Router.handle();

    if (Auth.current()) refreshNotifications();
    setInterval(refreshNotifications, 30000);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
} else {
    boot();
}