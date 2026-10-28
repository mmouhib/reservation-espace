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
          name: "api",
          root: "./tests/api",
          include: ["**/*.test.ts"],
          environment: "node",
          // The tests share the demo data and build on each other: run them in order.
          fileParallelism: false,
          testTimeout: 30_000,
        },
      },
    ],
  },
});
