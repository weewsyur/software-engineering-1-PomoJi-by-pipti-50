/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#C94C3C",
        beige: "#F5F1E8",
      },
    },
  },
  plugins: [],
};
