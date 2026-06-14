import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const tempRoot = fileURLToPath(new URL("../../.tmp", import.meta.url));
const configPath = join(tempRoot, "guessrush-vitest.config.mjs");
const vitestEntry = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
const vitestConfigModule = pathToFileURL(
  fileURLToPath(new URL("../node_modules/vitest/dist/config.js", import.meta.url)),
).href;
const extraArgs = process.argv.slice(2);
const mode = extraArgs.includes("--watch") ? [] : ["run"];
const forwardedArgs = extraArgs.filter((arg) => arg !== "--watch");

mkdirSync(tempRoot, { recursive: true });
writeFileSync(
  configPath,
  `import { defineConfig } from ${JSON.stringify(vitestConfigModule)};

export default defineConfig({
  root: ${JSON.stringify(projectRoot)},
  cacheDir: ${JSON.stringify(join(tempRoot, "vite-cache"))},
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: "./src/tests/setup.ts",
    globals: true,
  },
});
`,
);

const result = spawnSync(
  process.execPath,
  [vitestEntry, ...mode, "--config", configPath, ...forwardedArgs],
  {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
