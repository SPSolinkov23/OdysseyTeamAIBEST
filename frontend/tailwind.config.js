module.exports = {
    darkMode: 'class',
    content: ["index.html", "src/**/*.js"],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
                display: ["Poppins", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
            },
            colors: {
                brand: {
                    50: "#eff6ff",
                    100: "#dbeafe",
                    200: "#bfdbfe",
                    300: "#93c5fd",
                    400: "#60a5fa",
                    500: "#3b82f6",
                    600: "#2563eb",
                    700: "#1d4ed8",
                    800: "#1e40af",
                    900: "#1e3a8a",
                },
            },
            boxShadow: {
                soft: "0 10px 30px -12px rgba(2, 132, 199, 0.25)",
                glow: "0 0 0 4px rgba(56, 189, 248, 0.15)",
            },
            backgroundImage: {
                "hero-grid": "radial-gradient(circle at 1px 1px, rgba(37, 99, 235, 0.12) 1px, transparent 0)",
                "mesh": "radial-gradient(at 12% 18%, rgba(56, 189, 248, 0.18) 0px, transparent 50%), radial-gradient(at 88% 12%, rgba(37, 99, 235, 0.16) 0px, transparent 45%), radial-gradient(at 70% 88%, rgba(99, 102, 241, 0.14) 0px, transparent 45%)",
            },
            backgroundSize: {
                "grid-dots": "22px 22px",
            },
            keyframes: {
                floaty: {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-10px)" },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                "pop-in": {
                    "0%": { opacity: "0", transform: "scale(.96)" },
                    "100%": { opacity: "1", transform: "scale(1)" },
                },
            },
            animation: {
                floaty: "floaty 6s ease-in-out infinite",
                shimmer: "shimmer 2.2s linear infinite",
                "pop-in": "pop-in .25s ease-out both",
            },
        },
    },
    safelist: [
        {
            pattern: /(bg|text|ring|border|from|to)-(emerald|amber|slate|sky|rose|blue|indigo|violet)-(50|100|200|300|500|600|700)/,
        },
        "dark:bg-emerald-900/20", "dark:text-emerald-400", "dark:ring-emerald-800",
        "dark:bg-amber-900/20", "dark:text-amber-400", "dark:ring-amber-800",
        "dark:bg-brand-900/20", "dark:text-brand-400",
    ],
    plugins: [],
}