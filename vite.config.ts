import { defineConfig, loadEnv } from "vite";
import tailwind from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  // Use globalThis.process for compatibility in Vite config (ESM context)
  const env = loadEnv(mode, process.cwd());
  const host = env.VITE_TAURI_DEV_HOST;

  return {
    plugins: [tailwind()],
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? { protocol: "ws", host, port: 1421 }
        : undefined,
      watch: {
        ignored: ["**/src-tauri/**"],
      },
    },
  };
});
