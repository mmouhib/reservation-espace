// Generates the PWA icons in apps/web/public/icons from an inline SVG.
// Usage: npm run icons
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const OUT = resolve(import.meta.dirname, "../apps/web/public/icons");
const BRAND = "#1d4ed8";

// Calendar with a check mark, drawn on a 24-unit grid.
const glyph = `
  <g fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/>
    <path d="M3.5 9.5h17M8 3v4M16 3v4M8.5 14.5l2.5 2.5 4.5-4.5"/>
  </g>`;

/** @param {{ size: number, padding: number, rounded: boolean }} o */
function svg({ size, padding, rounded }) {
  const inner = size * (1 - 2 * padding);
  const scale = inner / 24;
  const offset = size * padding;
  const radius = rounded ? size * 0.22 : 0;
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="${radius}" fill="${BRAND}"/>
      <g transform="translate(${offset} ${offset}) scale(${scale})">${glyph}</g>
    </svg>`);
}

const targets = [
  { file: "icon-192.png", size: 192, padding: 0.16, rounded: true },
  { file: "icon-512.png", size: 512, padding: 0.16, rounded: true },
  // Maskable icons: full-bleed background, glyph inside the 80% safe zone.
  { file: "maskable-192.png", size: 192, padding: 0.24, rounded: false },
  { file: "maskable-512.png", size: 512, padding: 0.24, rounded: false },
  // iOS applies its own mask, so no transparency and no rounding.
  { file: "apple-touch-icon.png", size: 180, padding: 0.18, rounded: false },
  { file: "favicon-32.png", size: 32, padding: 0.08, rounded: true },
];

await mkdir(OUT, { recursive: true });
for (const t of targets) {
  await sharp(svg(t)).png().toFile(resolve(OUT, t.file));
  console.log("✓", t.file);
}

// Monochrome badge for Android notifications (white glyph on transparent background).
await sharp(
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24">${glyph}</svg>`),
)
  .png()
  .toFile(resolve(OUT, "badge-72.png"));
console.log("✓ badge-72.png");
