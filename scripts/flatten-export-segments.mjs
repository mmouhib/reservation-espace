/**
 * Works around a Next.js static-export bug on Windows: segment prefetch files are
 * meant to be flat (`__next.!KGFwcCk.notifications.__PAGE__.txt`), but `next build`
 * joins the segment path with `\` there, producing nested folders
 * (`__next.!KGFwcCk/notifications/__PAGE__.txt`) that the client never requests.
 * Does nothing on builds that are already flat (Linux/macOS).
 *
 *   node scripts/flatten-export-segments.mjs apps/web/out
 */
import { readdir, rename, rm, mkdir } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";

const outDir = process.argv[2];
if (!outDir) throw new Error("Usage: node scripts/flatten-export-segments.mjs <outDir>");

async function filesUnder(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => (e.isDirectory() ? filesUnder(join(dir, e.name)) : [join(dir, e.name)])),
  );
  return nested.flat();
}

let moved = 0;
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = join(dir, entry.name);
    if (!entry.name.startsWith("__next.")) {
      await walk(full);
      continue;
    }
    for (const file of await filesUnder(full)) {
      const flatName = `${entry.name}.${relative(full, file).split(sep).join(".")}`;
      const dest = join(dirname(full), flatName);
      await mkdir(dirname(dest), { recursive: true });
      await rename(file, dest);
      moved += 1;
    }
    await rm(full, { recursive: true, force: true });
  }
}

await walk(outDir);
console.log(moved ? `Flattened ${moved} segment prefetch file(s).` : "Segment prefetch files already flat.");
