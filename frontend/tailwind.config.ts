import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        coditas: {
          blue: "#0052cc",
          cyan: "#00d4ff",
          navy: "#0a0e27",
          dark: "#050810",
        },
      },
      boxShadow: {
        glow: "0 0 20px rgba(0, 82, 204, 0.4)",
        "glow-cyan": "0 0 20px rgba(0, 212, 255, 0.4)",
        "glass": "0 8px 32px rgba(0, 0, 0, 0.4)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glass-panel":
          "linear-gradient(135deg, rgba(0, 82, 204, 0.08) 0%, rgba(0, 212, 255, 0.04) 100%)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0, 82, 204, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(0, 82, 204, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
