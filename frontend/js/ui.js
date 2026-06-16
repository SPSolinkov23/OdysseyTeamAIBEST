(function () {
    const listeners = {};
    window.Bus = {
        on(evt, fn) {
            (listeners[evt] = listeners[evt] || []).push(fn);
        },
        emit(evt, payload) {
            (listeners[evt] || []).forEach((fn) => fn(payload));
        },
    };

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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
        CONFIRMED: { label: "Confirmed", color: "emerald", icon: "fa-circle-check" },
        WAITLISTED: { label: "Waitlist", color: "amber", icon: "fa-hourglass-half" },
        CANCELLED: { label: "Cancelled", color: "slate", icon: "fa-ban" },
    };

    const EVENT_STATUS = {
        DRAFT: { label: "Draft", color: "slate", icon: "fa-pen-ruler" },
        PUBLISHED: { label: "Published", color: "sky", icon: "fa-tower-broadcast" },
        CANCELLED: { label: "Cancelled", color: "rose", icon: "fa-ban" },
    };

    const UI = {
        escape(s) {
            return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
        },

        fmtDate(iso) {
            const d = new Date(iso);
            return d.getDate() + " " + monthsFull[d.getMonth()] + " " + d.getFullYear();
        },

        fmtTime(iso) {
            const d = new Date(iso);
            return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
        },

        fmtRange(startIso, endIso) {
            const s = new Date(startIso);
            const e = new Date(endIso || startIso);
            const sameDay = s.toDateString() === e.toDateString();
            if (sameDay) return this.fmtDate(startIso) + " \u00b7 " + this.fmtTime(startIso) + "\u2013" + this.fmtTime(endIso || startIso);
            return this.fmtDate(startIso) + " " + this.fmtTime(startIso) + " \u2192 " + this.fmtDate(endIso) + " " + this.fmtTime(endIso);
        },

        fmtShort(iso) {
            const d = new Date(iso);
            return d.getDate() + " " + months[d.getMonth()];
        },

        fmtRelative(iso) {
            const diff = Date.now() - new Date(iso).getTime();
            const m = Math.round(diff / 60000);
            if (m < 1) return "just now";
            if (m < 60) return m + " min ago";
            const h = Math.round(m / 60);
            if (h < 24) return h + " h ago";
            const d = Math.round(h / 24);
            return d + " days ago";
        },

        categoryMeta(cat) {
            return CATEGORIES[cat] || { icon: "fa-calendar-star", color: "slate" };
        },

        regBadge(status) {
            const m = REG_STATUS[status] || REG_STATUS.CANCELLED;
            return '<span class="badge bg-' + m.color + '-100 text-' + m.color + '-700 ring-' + m.color + '-200"><i class="fa-solid ' + m.icon + '"></i>' + m.label + "</span>";
        },

        eventBadge(status) {
            const m = EVENT_STATUS[status] || EVENT_STATUS.DRAFT;
            return '<span class="badge bg-' + m.color + '-100 text-' + m.color + '-700 ring-' + m.color + '-200"><i class="fa-solid ' + m.icon + '"></i>' + m.label + "</span>";
        },

        toast(message, type) {
            const palette = {
                success: "linear-gradient(135deg,#059669,#10b981)",
                error: "linear-gradient(135deg,#e11d48,#fb7185)",
                info: "linear-gradient(135deg,#2563eb,#38bdf8)",
                warn: "linear-gradient(135deg,#d97706,#fbbf24)",
            };
            const icons = { success: "fa-circle-check", error: "fa-circle-exclamation", info: "fa-circle-info", warn: "fa-triangle-exclamation" };
            const t = type || "info";
            Toastify({
                text: '<i class="fa-solid ' + (icons[t] || icons.info) + '" style="margin-right:.55rem"></i><span>' + this.escape(message) + "</span>",
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
        },

        confirm(opts) {
            const o = opts || {};
            return Swal.fire({
                title: o.title || "Are you sure?",
                html: o.text || "",
                icon: o.icon || "question",
                showCancelButton: true,
                confirmButtonText: o.confirmText || "Confirm",
                cancelButtonText: o.cancelText || "Cancel",
                reverseButtons: true,
                buttonsStyling: false,
                customClass: {
                    popup: "rounded-2xl",
                    title: "!text-slate-800 !font-display",
                    confirmButton: o.danger ? "btn-danger mx-1" : "btn-primary mx-1",
                    cancelButton: "btn-secondary mx-1",
                },
            }).then((r) => r.isConfirmed);
        },

        alert(opts) {
            const o = opts || {};
            return Swal.fire({
                title: o.title || "",
                html: o.text || "",
                icon: o.icon || "success",
                confirmButtonText: o.confirmText || "OK",
                buttonsStyling: false,
                customClass: { popup: "rounded-2xl", title: "!text-slate-800 !font-display", confirmButton: "btn-primary" },
            });
        },

        empty(o) {
            return (
                '<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center" data-aos="zoom-in">' +
                '<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-2xl text-brand-500"><i class="fa-solid ' + (o.icon || "fa-inbox") + '"></i></div>' +
                '<h3 class="font-display text-lg font-semibold text-slate-800">' + this.escape(o.title || "Nothing here yet") + "</h3>" +
                '<p class="mt-1 max-w-sm text-sm text-slate-500">' + this.escape(o.text || "") + "</p>" +
                (o.actionHtml ? '<div class="mt-5">' + o.actionHtml + "</div>" : "") +
                "</div>"
            );
        },

        guard(title, text) {
            return (
                '<section class="container-app py-20"><div class="mx-auto max-w-lg rounded-2xl border border-rose-100 bg-white p-10 text-center shadow-soft" data-aos="flip-up">' +
                '<div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-2xl text-rose-500"><i class="fa-solid fa-lock"></i></div>' +
                '<h2 class="font-display text-2xl font-bold text-slate-800">' + this.escape(title) + "</h2>" +
                '<p class="mt-2 text-slate-500">' + this.escape(text) + "</p>" +
                '<a href="#/" class="btn-primary mt-6"><i class="fa-solid fa-house"></i> Go home</a></div></section>'
            );
        },

        aos(i) {
            const palette = ["fade-up", "zoom-in-up", "flip-up", "fade-up-right", "fade-up-left", "zoom-in"];
            return palette[i % palette.length];
        },

        progressBar(value, max, color) {
            const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
            const c = color || "brand";
            return (
                '<div class="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-' + c + '-500 transition-all duration-700" style="width:' + pct + '%"></div></div>'
            );
        },
    };

    window.UI = UI;
})();
