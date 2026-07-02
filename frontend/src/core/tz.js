export const TIMEZONE = "Europe/Sofia";

export function sofiaParts(input) {
    if (!input) return null;
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return null;

    const fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: TIMEZONE,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false,
    });

    const p = {};

    for (const part of fmt.formatToParts(d)) p[part.type] = part.value;

    const hour = p.hour === "24" ? 0 : Number(p.hour);

    return {
        year: Number(p.year),
        month: Number(p.month) - 1,
        day: Number(p.day),
        hour: hour,
        minute: Number(p.minute),
        second: Number(p.second),
    };
}

function sofiaOffsetMs(date) {
    const c = sofiaParts(date);
    const wallAsUtc = Date.UTC(c.year, c.month, c.day, c.hour, c.minute, c.second);

    return wallAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function sofiaInputToUtc(localValue) {
    if (!localValue) return null;

    const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(localValue);
    if (!m) {
        const d = new Date(localValue);
        return isNaN(d.getTime()) ? null : d.toISOString();
    }

    const [, y, mo, da, h, mi] = m.map(Number);
    const wallAsUtc = Date.UTC(y, mo - 1, da, h, mi);

    let offset = sofiaOffsetMs(new Date(wallAsUtc));
    let ts = wallAsUtc - offset;
    const refined = sofiaOffsetMs(new Date(ts));
    if (refined !== offset) ts = wallAsUtc - refined;

    return new Date(ts).toISOString();
}

export function utcToSofiaInput(iso) {
    const c = sofiaParts(iso);
    if (!c) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${c.year}-${pad(c.month + 1)}-${pad(c.day)}T${pad(c.hour)}:${pad(c.minute)}`;
}