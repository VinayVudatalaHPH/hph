import type { Config } from "tailwindcss";

// Centralized theme: every color/spacing/radius token the app uses is defined
// once here (backed by CSS custom properties in src/styles/theme.css) so
// components never hardcode a hex value or an ad-hoc Tailwind color.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        hph: {
          blue: {
            DEFAULT: "var(--color-hph-blue)",
            0: "var(--color-blue-00)",
            1: "var(--color-blue-01)",
            2: "var(--color-blue-02)",
            3: "var(--color-blue-03)",
            4: "var(--color-blue-04)",
            5: "var(--color-blue-05)",
            6: "var(--color-blue-06)",
            7: "var(--color-blue-07)",
            8: "var(--color-blue-08)",
            9: "var(--color-blue-09)",
            10: "var(--color-blue-10)",
          },
          violet: {
            DEFAULT: "var(--color-hph-violet)",
            0: "var(--color-violet-00)",
            1: "var(--color-violet-01)",
            2: "var(--color-violet-02)",
            3: "var(--color-violet-03)",
            4: "var(--color-violet-04)",
            5: "var(--color-violet-05)",
            6: "var(--color-violet-06)",
            7: "var(--color-violet-07)",
            8: "var(--color-violet-08)",
            9: "var(--color-violet-09)",
            10: "var(--color-violet-10)",
          },
          neutral: {
            0: "var(--color-neutral-00)",
            1: "var(--color-neutral-01)",
            2: "var(--color-neutral-02)",
            3: "var(--color-neutral-03)",
            4: "var(--color-neutral-04)",
            5: "var(--color-neutral-05)",
            6: "var(--color-neutral-06)",
            7: "var(--color-neutral-07)",
            8: "var(--color-neutral-08)",
            9: "var(--color-neutral-09)",
            10: "var(--color-neutral-10)",
            11: "var(--color-neutral-11)",
          },
          magenta: "var(--color-hph-magenta)",
          crimson: "var(--color-hph-crimson)",
          orange: "var(--color-hph-orange)",
        },
        brand: {
          50: "var(--color-brand-50)",
          100: "var(--color-brand-100)",
          200: "var(--color-brand-200)",
          300: "var(--color-brand-300)",
          400: "var(--color-brand-400)",
          500: "var(--color-brand-500)",
          600: "var(--color-brand-600)",
          700: "var(--color-brand-700)",
          800: "var(--color-brand-800)",
          900: "var(--color-brand-900)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          muted: "var(--color-surface-muted)",
          inset: "var(--color-surface-inset)",
        },
        border: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
        },
        content: {
          primary: "var(--color-content-primary)",
          secondary: "var(--color-content-secondary)",
          muted: "var(--color-content-muted)",
          inverted: "var(--color-content-inverted)",
        },
        success: {
          DEFAULT: "var(--color-success)",
          bg: "var(--color-success-bg)",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          bg: "var(--color-danger-bg)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          bg: "var(--color-warning-bg)",
        },
        chart: {
          kairon: "var(--color-chart-kairon)",
          manual: "var(--color-chart-manual)",
          target: "var(--color-chart-target)",
          productive: "var(--color-chart-productive)",
          downtime: "var(--color-chart-downtime)",
          idle: "var(--color-chart-idle)",
          meeting: "var(--color-chart-meeting)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        popover: "var(--shadow-popover)",
      },
    },
  },
  plugins: [],
} satisfies Config;
