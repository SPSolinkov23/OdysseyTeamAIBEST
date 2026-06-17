let aos = null;

export async function initAos() {
    try {
        aos = (await import("aos")).default;
        aos.init({ duration: 650, easing: "ease-out-cubic", once: true, offset: 40, mirror: false });
    } catch (e) {
        aos = null;
    }
}

export function refreshAos() {
    if (aos && aos.refreshHard) aos.refreshHard();
}