import animate from "tailwindcss-animate";
import { fontFamily } from "tailwindcss/defaultTheme";

/*******************************************
 * Tailwind configuration shared with shadcn
 *******************************************/
const config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(214, 32%, 91%)",
        input: "hsl(210, 40%, 96%)",
        ring: "hsl(199, 89%, 48%)",
        background: "#fdfefe",
        foreground: "#0f172a",
        primary: {
          DEFAULT: "#2563eb",
          foreground: "#f8fafc",
        },
        secondary: {
          DEFAULT: "#f1f5f9",
          foreground: "#0f172a",
        },
        muted: {
          DEFAULT: "#f1f5f9",
          foreground: "#64748b",
        },
        accent: {
          DEFAULT: "#dbeafe",
          foreground: "#0f172a",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.35rem",
      },
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
};

export default config;
