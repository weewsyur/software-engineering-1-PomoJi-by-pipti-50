/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        // Bricolage Grotesque is the only font family in the app. The
        // `medium`/`semibold`/`bold`/etc. keys intentionally share names with
        // Tailwind's weight utilities so font-medium etc. resolve to the
        // correct per-weight family on native (fontWeight alone is ignored
        // there) while staying correct on web.
        sans: ["BricolageGrotesque_400Regular", "sans-serif"],
        medium: ["BricolageGrotesque_500Medium", "sans-serif"],
        semibold: ["BricolageGrotesque_600SemiBold", "sans-serif"],
        bold: ["BricolageGrotesque_700Bold", "sans-serif"],
        extrabold: ["BricolageGrotesque_800ExtraBold", "sans-serif"],
        black: ["BricolageGrotesque_800ExtraBold", "sans-serif"],
        // Display aliases — same family, kept for existing class names.
        display: ["BricolageGrotesque_700Bold", "sans-serif"],
        "display-semibold": ["BricolageGrotesque_600SemiBold", "sans-serif"],
      },
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
