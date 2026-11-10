import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
export default defineConfig(({ command, mode }) => ({
 plugins: [react(), tailwindcss(), cloudflare(command === "serve" ? {
  remoteBindings: mode === "ai",
  config: { name: "muse-local", vars: { ALLOW_LOCAL: "true", MOCK_AI: mode === "ai" ? "false" : "true" } },
 } : {})],
 resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
}));
