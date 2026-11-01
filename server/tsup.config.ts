import { defineConfig } from "tsup";

// The shared workspace package is bundled in, so the server can be deployed (for example in a
// Docker image) without the workspaces: only the npm dependencies are installed next to it.
export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["cjs"],
  target: "node22",
  platform: "node",
  sourcemap: true,
  clean: true,
  noExternal: [/^@reservation\/shared/],
});
