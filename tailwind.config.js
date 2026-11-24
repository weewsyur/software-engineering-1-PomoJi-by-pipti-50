/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Mirrors constants/colors.ts — keep in sync.
        primary: "#FF6B35",
        primaryLight: "#FF8A65",
        primaryLightDark: "#FF7043",
        primaryMuted: "#FDE3DC",
        primaryMutedDark: "#4A241C",
        canvas: "#F5F3EE",
        canvasDark: "#1A1A1A",
        card: "#FFFFFF",
        cardDark: "#2D2D2D",
        warm: "#FAFAF7",
        warmDark: "#252525",
        ink: "#1A1A1A",
        inkDark: "#FFFFFF",
        ink2: "#6B6B6B",
        ink2Dark: "#B0B0B0",
        ink3: "#ABABAB",
        ink3Dark: "#6B6B6B",
        line: "#EBEBEB",
        lineDark: "#3D3D3D",
        track: "#D4D4D4",
        trackDark: "#4D4D4D",
      },
    },
  },
  plugins: [],
};
