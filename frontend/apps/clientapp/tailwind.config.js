const plugin = require("tailwindcss/plugin");
const path = require("node:path");
const orbitComponentsPreset = require("@kiwicom/orbit-tailwind-preset");

module.exports = {
  content: [
    "../../packages/chat/src/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{ts,tsx}",
    "./node_modules/@kiwicom/orbit-components/**/*.js",
  ],
  theme: {
    extend: {
      fontFamily: {
        base: "var(--font-base)",
      },
    },
  },
  plugins: [],
  presets: [orbitComponentsPreset({})],
};
