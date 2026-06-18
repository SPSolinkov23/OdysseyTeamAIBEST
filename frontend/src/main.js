import { Bus } from "./core/bus.js";
import { Auth } from "./core/auth.js";
import { Router } from "./core/router.js";
import { renderNav, updateBell } from "./core/nav.js";
import { refreshNotifications } from "./core/notifications.js";
import { initAos } from "./core/anim.js";
import { initScroll } from "./core/scroll.js";
import { Tour } from "./features/tour.js";

async function boot() {
    await Auth.restore();
    await initAos();
    initScroll();

    Bus.on("auth", renderNav);
    Bus.on("auth", refreshNotifications);
    Bus.on("route", renderNav);
    Bus.on("notifications", updateBell);

    Bus.on("route", (hash) => {
        const u = Auth.current();
        if (u && (hash === "#/events" || hash === "#/organizer")) Tour.maybeStart(u);
    });

    window.addEventListener("hashchange", () => Router.handle());

    renderNav();
    
    if (!location.hash) {
        location.hash = "#/";
    } else {
        await Router.handle();
    }

    if (Auth.current()) refreshNotifications();
    setInterval(refreshNotifications, 30000);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
} else {
    boot();
}