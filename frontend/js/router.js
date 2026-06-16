(function () {
    function home() {
        const u = window.Auth.current();
        if (!u) return "#/login";
        return u.role === "organizer" ? "#/organizer" : "#/events";
    }

    const routes = [
        { re: /^\/$/, role: "home" },
        { re: /^\/login$/, role: "guest", view: () => window.Views.auth("login") },
        { re: /^\/register$/, role: "guest", view: () => window.Views.auth("register") },
        { re: /^\/events$/, role: "student", view: () => window.Views.events() },
        { re: /^\/events\/([\w-]+)$/, role: "student", view: (m) => window.Views.eventDetail(m[1]) },
        { re: /^\/my-registrations$/, role: "student", view: () => window.Views.myRegistrations() },
        { re: /^\/notifications$/, role: "any", view: () => window.Views.notifications() },
        { re: /^\/organizer$/, role: "organizer", view: () => window.Views.organizer() },
        { re: /^\/organizer\/new$/, role: "organizer", view: () => window.Views.organizerForm() },
        { re: /^\/organizer\/events\/([\w-]+)\/edit$/, role: "organizer", view: (m) => window.Views.organizerForm(m[1]) },
        { re: /^\/organizer\/events\/([\w-]+)$/, role: "organizer", view: (m) => window.Views.eventRegistrations(m[1]) },
        { re: /^\/preview\/([\w-]+)$/, role: "organizer", view: (m) => window.Views.preview(m[1]) },
    ];

    function notFound() {
        return { html: window.UI.guard("Page not found", "The link is invalid or the content has moved."), onMount: null };
    }

    function loader() {
        return (
            '<section class="container-app flex items-center justify-center py-32">' +
            '<span class="inline-flex h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500"></span>' +
            "</section>"
        );
    }

    const Router = {
        async handle() {
            const path = location.hash.replace(/^#/, "") || "/";
            let producer = null;
            let match = null;

            for (const r of routes) {
                const m = path.match(r.re);
                if (!m) continue;
                match = m;

                if (r.role === "home") {
                    location.hash = home();
                    return;
                }
                const user = window.Auth.current();
                if (r.role === "guest") {
                    if (user) {
                        location.hash = home();
                        return;
                    }
                } else if (r.role === "any") {
                    if (!user) {
                        location.hash = "#/login";
                        return;
                    }
                } else if (r.role === "student" || r.role === "organizer") {
                    if (!user) {
                        location.hash = "#/login";
                        return;
                    }
                    if (user.role !== r.role) {
                        this.render({ html: window.UI.guard("Wrong access", "This section is for " + (r.role === "student" ? "students" : "organizers") + " only."), onMount: null });
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

            // Views are async (they fetch from the API); show a spinner meanwhile.
            const app = document.getElementById("app");
            app.innerHTML = loader();

            let view;
            try {
                view = await producer(match);
            } catch (e) {
                view = { html: window.UI.guard("Something went wrong", e.message || "Please try again in a moment."), onMount: null };
            }
            this.render(view);
        },

        render(view) {
            const app = document.getElementById("app");
            app.innerHTML = view.html;
            if (window.lenis) window.lenis.scrollTo(0, { immediate: true });
            else window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
            if (view.onMount) view.onMount(app);
            if (window.AOS) window.AOS.refreshHard();
            window.Bus.emit("route", location.hash);
        },
    };

    window.Router = Router;
})();
