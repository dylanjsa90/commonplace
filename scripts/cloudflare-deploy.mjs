import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
const config = JSON.parse(await readFile("wrangler.jsonc", "utf8"));
if (
  config.vars?.AUTH_PROVIDER !== "password" ||
  config.d1_databases?.length !== 1 ||
  !config.d1_databases[0].database_id
)
  throw new Error(
    "Configure the password auth mode and a provisioned DB binding in wrangler.jsonc before deploying.",
  );
if (config.vars.JWT_SECRET)
  throw new Error(
    "JWT_SECRET must be a Cloudflare secret, not a tracked configuration variable.",
  );
const run = (args) => {
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
const wrangler = [
  "--import",
  "./scripts/sites-env.mjs",
  "./node_modules/wrangler/bin/wrangler.js",
];
run([
  ...wrangler,
  "d1",
  "migrations",
  "apply",
  "DB",
  "--remote",
  "--config",
  "wrangler.jsonc",
]);
run([
  "--import",
  "./scripts/sites-env.mjs",
  "./node_modules/vite/bin/vite.js",
  "build",
  "--config",
  "vite.config.cloudflare.ts",
  "--logLevel",
  "warn",
]);
run([...wrangler, "deploy", "--config", "dist/server/wrangler.json"]);
