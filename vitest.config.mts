import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "shared",
          root: "./packages/shared",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "functions",
          root: "./functions",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "rules",
          root: "./tests/rules",
          include: ["**/*.test.ts"],
          environment: "node",
          // Rules tests share one emulator; run files sequentially to avoid clearFirestore races.
          fileParallelism: false,
          testTimeout: 20_000,
        },
      },
    ],
  },
});
