/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: {
          950: "#030305",
          900: "#07070a",
          800: "#0e0e14",
          700: "#161622",
        },
        blood: {
          DEFAULT: "#ff3b19",
          50: "#fff1ee",
          100: "#ffe0d9",
          200: "#ffc6b8",
          300: "#ff9f8a",
          400: "#ff6f52",
          500: "#ff3b19",
          600: "#f02603",
          700: "#ca1b00",
          800: "#a31904",
          900: "#7c1809",
        },
        ember: {
          DEFAULT: "#ff7700",
          glow: "#ffaa00",
          deep: "#c84b00",
          ash: "#3d1f14",
        },
        sentinel: {
          green: "#10b981",
          emerald: "#059669",
          amber: "#f59e0b",
          rose: "#f43f5e",
        },
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "system-ui", "-apple-system", "sans-serif"],
        display: ["'Space Grotesk'", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'Fira Code'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      animation: {
        "pulse-subtle": "pulseSubtle 3s ease-in-out infinite",
        "scanline": "scanline 8s linear infinite",
        "ember-float": "float 6s ease-in-out infinite",
        "flicker": "flicker 0.15s infinite",
      },
      keyframes: {
        pulseSubtle: {
          "0%, 100%": { opacity: "0.9", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.02)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-15px) rotate(3deg)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
      },
    },
  },
  plugins: [],
};
