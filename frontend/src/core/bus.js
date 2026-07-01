const listeners = {};

export const Bus = {
    on(evt, fn) {
        (listeners[evt] = listeners[evt] || []).push(fn);
    },
    emit(evt, payload) {
        (listeners[evt] || []).forEach((fn) => fn(payload));
    },
};
