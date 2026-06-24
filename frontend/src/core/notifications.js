import { API } from "./api.js";
import { Auth } from "./auth.js";
import { Bus } from "./bus.js";
import { UI } from "./ui.js";

const seen = new Set();
let primed = false;

function toastIfImportant(n) {
    if (n.type === "WaitlistPromoted") UI.toast(UI.notifText(n), "success");
    else if (n.type === "EventCancelled") UI.toast(UI.notifText(n), "error");
}

export async function refreshNotifications() {
    const u = Auth.current();
    if (!u) {
        primed = false;
        seen.clear();
        return;
    }
    let list;
    try {
        list = await API.refreshNotifications();
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
    Bus.emit("notifications");
}