/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f5fcf7",
          100: "#ECF4E8",
          200: "#d9edd4",
          300: "#C8F3B8",
          400: "#ABE7B2",
          500: "#8fd9a0",
          600: "#6bc285",
          700: "#4fa86b",
          800: "#3d8556",
          900: "#2d6341",
        },
        accent: {
          50: "#f0f7f9",
          100: "#e1eff3",
          200: "#c5dee7",
          300: "#93BFC7",
          400: "#7aafb9",
          500: "#5d9aa5",
          600: "#4a7d8a",
          700: "#3d6571",
          800: "#34535d",
          900: "#2d454e",
        },
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
