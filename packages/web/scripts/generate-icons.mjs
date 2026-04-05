#!/usr/bin/env node
/**
 * Generate PWA icons from src/app/icon.svg.
 *
 * Outputs:
 *   public/icons/icon-192.png
 *   public/icons/icon-512.png
 *   public/icons/icon-512-maskable.png  (with 10% padding)
 *   public/icons/apple-touch-icon.png   (180x180)
 */
import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const srcSvg = resolve(rootDir, "src/app/icon.svg");
const outDir = resolve(rootDir, "public/icons");

mkdirSync(outDir, { recursive: true });

const svg = readFileSync(srcSvg);

async function gen(size, filename, { padding = 0 } = {}) {
  const outPath = resolve(outDir, filename);
  if (padding > 0) {
    // Maskable icon: add padding so content sits in the "safe zone"
    const inner = size - padding * 2;
    const innerBuffer = await sharp(svg)
      .resize(inner, inner)
      .png()
      .toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 23, g: 23, b: 23, alpha: 1 },
      },
    })
      .composite([{ input: innerBuffer, top: padding, left: padding }])
      .png()
      .toFile(outPath);
  } else {
    await sharp(svg).resize(size, size).png().toFile(outPath);
  }
  console.log(`  ✓ ${filename} (${size}x${size})`);
}

console.log("Generating PWA icons...");
await gen(192, "icon-192.png");
await gen(512, "icon-512.png");
await gen(512, "icon-512-maskable.png", { padding: 52 }); // ~10% padding
await gen(180, "apple-touch-icon.png");

// Also copy a favicon.png for Safari
await gen(32, "favicon-32.png");

console.log("Done.");
