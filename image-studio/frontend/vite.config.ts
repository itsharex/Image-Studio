import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import pkg from "./package.json";

const targetPlatform = (process.env.VITE_TARGET_PLATFORM ?? "").trim().toLowerCase();
const isAndroidWebViewTarget = targetPlatform === "android" || targetPlatform === "android-pad";

// https://vitejs.dev/config/
export default defineConfig({
  base: isAndroidWebViewTarget ? "./" : "/",
  build: isAndroidWebViewTarget
    ? {
        target: "chrome70",
      }
    : undefined,
  define: {
    "import.meta.env.PACKAGE_VERSION": JSON.stringify(pkg.version),
  },
  plugins: [react(), tailwindcss()],
});
