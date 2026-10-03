import { defineConfig } from "tsup";

// The shared workspace package is bundled in, because Cloud Functions installs
// dependencies from npm at deploy time and cannot resolve workspace packages.
export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "lib",
  format: ["cjs"],
  target: "node22",
  platform: "node",
  sourcemap: true,
  clean: true,
  noExternal: [/^@reservation\/shared/],
});
