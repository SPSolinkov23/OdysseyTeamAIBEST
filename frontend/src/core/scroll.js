let lenis = null;

export async function initScroll() {
    try {
        const Lenis = (await import("lenis")).default;
        lenis = new Lenis({
            duration: 1.05,
            smoothWheel: true,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            prevent: (node) => node && node.nodeType === 1 && typeof node.closest === "function" && !!node.closest(".choices, .choices__list, .flatpickr-calendar, #notif-panel, #mobile-menu, [data-lenis-prevent]"),
        });
        const raf = (time) => {
            lenis.raf(time);
            requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);
    } catch (e) {
        lenis = null;
    }
}

export function scrollTop() {
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo({ top: 0, behavior: "auto" });
}

export function scrollToEl(el) {
    if (lenis) lenis.scrollTo(el, { offset: -160, duration: 0.8 });
    else el.scrollIntoView({ behavior: "smooth", block: "center" });
}
