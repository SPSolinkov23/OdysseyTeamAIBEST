import { Auth } from "./auth.js";
import { UI } from "./ui.js";
import { Bus } from "./bus.js";
import { scrollTop } from "./scroll.js";
import { refreshAos } from "./anim.js";

function home() {
    const u = Auth.current();
    if (!u) return "/login";
    return u.role === "organizer" ? "/organizer" : "/events";
}

const routes = [
    { re: /^\/$/, role: "home" },
    { re: /^\/login$/, role: "guest", view: () => import("../views/auth.js").then((m) => m.auth("login")) },
    { re: /^\/register$/, role: "guest", view: () => import("../views/auth.js").then((m) => m.auth("register")) },
    { re: /^\/events$/, role: "student", view: () => import("../views/student.js").then((m) => m.events()) },
    { re: /^\/events\/([\w-]+)$/, role: "student", view: (m) => import("../views/student.js").then((mod) => mod.eventDetail(m[1])) },
    { re: /^\/my-registrations$/, role: "student", view: () => import("../views/student.js").then((m) => m.myRegistrations()) },
    { re: /^\/organizer$/, role: "organizer", view: () => import("../views/organizer.js").then((m) => m.organizer()) },
    { re: /^\/organizer\/new$/, role: "organizer", view: () => import("../views/organizer.js").then((m) => m.organizerForm()) },
    { re: /^\/organizer\/events\/([\w-]+)\/edit$/, role: "organizer", view: (m) => import("../views/organizer.js").then((mod) => mod.organizerForm(m[1])) },
    { re: /^\/organizer\/events\/([\w-]+)$/, role: "organizer", view: (m) => import("../views/organizer.js").then((mod) => mod.eventRegistrations(m[1])) },
    { re: /^\/preview\/([\w-]+)$/, role: "organizer", view: (m) => import("../views/organizer.js").then((mod) => mod.preview(m[1])) },
    { re: /^\/admin$/, role: "admin", view: () => import("../views/admin.js").then((m) => m.admin()) },
];

function notFound() {
    return { html: UI.guard("Page not found", "The link is invalid or the content has moved."), onMount: null };
}

function loader() {
    return (
        '<section class="container-app flex items-center justify-center py-32">' +
        '<span class="inline-flex h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500"></span>' +
        "</section>"
    );
}

function navigate(path) {
    history.pushState(null, "", path);
    Router.handle();
}

export const Router = {
    navigate,

    async handle() {
        const path = location.pathname || "/";
        let producer = null;
        let match = null;

        for (const r of routes) {
            const m = path.match(r.re);
            if (!m) continue;
            match = m;

            if (r.role === "home") {
                navigate(home());
                return;
            }
            const user = Auth.current();
            if (r.role === "guest") {
                if (user) {
                    navigate(home());
                    return;
                }
            } else if (r.role === "any") {
                if (!user) {
                    navigate("/login");
                    return;
                }
            } else if (r.role === "student" || r.role === "organizer") {
                if (!user) {
                    navigate("/login");
                    return;
                }
                if (user.role !== r.role) {
                    this.render({ html: UI.guard("Wrong access", "This section is for " + (r.role === "student" ? "students" : "organizers") + " only."), onMount: null });
                    return;
                }
            } else if (r.role === "admin") {
                if (!user) {
                    navigate("/login");
                    return;
                }
                if (!user.isAdmin) {
                    this.render({ html: UI.guard("Admin only", "This area is restricted to administrators."), onMount: null });
                    return;
                }
            }
            producer = r.view;
            break;
        }

        if (!producer) {
            this.render(notFound());
            return;
        }

        const app = document.getElementById("app");
        app.innerHTML = loader();

        let view;
        try {
            view = await producer(match);
        } catch (e) {
            view = { html: UI.guard("Something went wrong", e.message || "Please try again in a moment."), onMount: null };
        }
        this.render(view);
    },

    render(view) {
        const app = document.getElementById("app");
        app.innerHTML = view.html;
        scrollTop();
        if (view.onMount) view.onMount(app);
        refreshAos();
        Bus.emit("route", location.pathname);
    },
};