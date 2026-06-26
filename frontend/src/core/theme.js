import { Bus } from "./bus.js";

const STORAGE_KEY = "odyssey_school_events_theme";
const AVAILABLE = ["light", "dark"];
let current = null;

function read() {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        return AVAILABLE.indexOf(v) !== -1 ? v : "light";
    } catch (e) {
        return "light";
    }
}

function get() {
    if (current == null) current = read();
    return current;
}

function apply(theme) {
    document.documentElement.classList.toggle("dark", theme === "dark");
}

function set(theme) {
    const next = AVAILABLE.indexOf(theme) !== -1 ? theme : "light";
    current = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
    apply(next);
    Bus.emit("theme", next);
}

export const Theme = { get, set, apply };
