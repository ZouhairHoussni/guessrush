export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: {
            900: "var(--color-brand-blue-900)",
            800: "var(--color-brand-blue-800)",
            700: "var(--color-brand-blue-700)",
            600: "var(--color-brand-blue-600)",
            100: "var(--color-brand-blue-100)",
          },
          yellow: {
            500: "var(--color-brand-yellow-500)",
            400: "var(--color-brand-yellow-400)",
          },
          orange: {
            500: "var(--color-brand-orange-500)",
          },
          red: {
            500: "var(--color-brand-red-500)",
          },
        },
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        paper: "var(--color-paper)",
        soft: "var(--color-soft-bg)",
        success: "var(--color-success)",
      },
      fontFamily: {
        display: ["Fredoka", "Baloo 2", "Arial Rounded MT Bold", "Inter", "system-ui", "sans-serif"],
        body: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        party: "0 20px 50px rgba(11, 46, 111, 0.18)",
        button: "0 12px 22px rgba(16, 24, 40, 0.16)",
        panel: "0 24px 70px rgba(11, 46, 111, 0.22)",
      },
    },
  },
  plugins: [],
};
