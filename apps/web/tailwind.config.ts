import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9f4",
          100: "#d9f0e3",
          200: "#b5e1ca",
          300: "#84cba8",
          400: "#51af82",
          500: "#2f9468",
          600: "#1f7753",
          700: "#196044",
          800: "#174d38",
          900: "#143f2f",
          950: "#0a231a",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
