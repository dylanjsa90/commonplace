import vinext from "vinext";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
export default defineConfig(({ command }) => ({
  server: { host: "127.0.0.1", port: 5174 },
  plugins: [
    vinext(),
    cloudflare({
      configPath: "wrangler.jsonc",
      config: { assets: { run_worker_first: command === "build" } },
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      inspectorPort: false,
    }),
  ],
}));
