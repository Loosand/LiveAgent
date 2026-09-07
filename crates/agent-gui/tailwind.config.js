import typography from "@tailwindcss/typography";

/** @type {import("tailwindcss").Config} */
const config = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "./node_modules/streamdown/dist/*.js",
    "./node_modules/@streamdown/code/dist/*.js",
    "./node_modules/@streamdown/cjk/dist/*.js",
    "./node_modules/@streamdown/math/dist/*.js",
    "./node_modules/@streamdown/mermaid/dist/*.js",
  ],
  plugins: [typography],
};

export default config;
