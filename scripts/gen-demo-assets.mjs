#!/usr/bin/env node
/**
 * Generate demo JPGs from procedural SVG via sharp.
 * No third-party image calls; deterministic; one SVG per scene.
 * Output: 1280x853 (3:2), JPEG quality 80, ~80-130 KB each.
 */
import sharp from "sharp";
import path from "path";
import fs from "fs";

const OUT_DIR = path.join(process.cwd(), "public", "demo");
const UP_DIR = path.join(process.cwd(), "public", "uploads", "images");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(UP_DIR)) fs.mkdirSync(UP_DIR, { recursive: true });

const W = 1280;
const H = 853;

const FONT = "'Cabinet Grotesk', 'Geist', system-ui, sans-serif";
const SERIF = "'PP Editorial New', 'Tiempos Headline', serif";

const PALETTES = {
  living: {
    floor: "#cbb29a", floorShade: "#a68a6b",
    wall: "#e8dfce", wallShade: "#c8bda4",
    wood: "#8a5d3b", woodShade: "#5f3f25",
    stone: "#bcae9a", stoneShade: "#91866f",
    accent: "#3a2b1f", text: "#f5ece0",
  },
  kitchen: {
    floor: "#d8cdb6", floorShade: "#a89a7c",
    wall: "#efe6d2", wallShade: "#cdc1a8",
    wood: "#a06b3c", woodShade: "#6e4825",
    stone: "#5a5a59", stoneShade: "#3a3a39",
    accent: "#22221f", text: "#f6efde",
  },
  bedroom: {
    floor: "#dcd2c0", floorShade: "#b0a48b",
    wall: "#efe9dc", wallShade: "#d2c8b0",
    linen: "#cbd2c0", linenShade: "#9ba898",
    sun: "#e8c98a", sunShade: "#c8a960",
    accent: "#34402f", text: "#f5efe0",
  },
  bathroom: {
    floor: "#e6dfd0", floorShade: "#b8b09e",
    wall: "#efeae0", wallShade: "#cfc6b1",
    metal: "#bdbab2", metalShade: "#8e8a82",
    shadow: "#a39b87", accent: "#4d443a", text: "#352f28",
  },
  entry: {
    floor: "#a96b50", floorShade: "#7e4a35",
    wall: "#e7d3b6", wallShade: "#bda587",
    shadow: "#5b3a2a", accent: "#3a261c", text: "#f7e9d2",
  },
  stair: {
    floor: "#efe9de", floorShade: "#c7bfae",
    wall: "#f5f0e5", wallShade: "#d5cdbc",
    stair: "#dad1be", stairShade: "#a99e88",
    accent: "#50483b", text: "#3a3328",
  },
  outdoor: {
    floor: "#5e6f48", floorShade: "#3f4d2f",
    wall: "#9eb079", wallShade: "#6f8552",
    leaf: "#3f5530", leafShade: "#29381f",
    sun: "#d6c08a", sunShade: "#a88c59",
    accent: "#20281a", text: "#eee6cf",
  },
  process: {
    floor: "#e0d4ba", floorShade: "#b6a888",
    wall: "#efe8d5", wallShade: "#d0c5ad",
    ink: "#2a2620", inkShade: "#15130f",
    paper: "#f6efd9", paperShade: "#cdc3a6",
    accent: "#1a1814", text: "#2a2620",
  },
};

function svg(palette, layers) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${layers(palette).join('\n')}</svg>`);
}

const scene = {
  "living-room-1.jpg": (p) => {
    return [
      `<rect width="100%" height="100%" fill="${p.wall}"/>`,
      `<rect y="${H*0.62}" width="100%" height="${H*0.38}" fill="${p.floor}"/>`,
      `<rect y="${H*0.62}" width="100%" height="${H*0.06}" fill="${p.floorShade}"/>`,
      `<rect x="${W*0.04}" y="${H*0.14}" width="${W*0.36}" height="${H*0.62}" fill="${p.stone}" opacity="0.95"/>`,
      `<rect x="${W*0.04}" y="${H*0.14}" width="${W*0.36}" height="6" fill="${p.stoneShade}"/>`,
      `<rect x="${W*0.04}" y="${H*0.74}" width="${W*0.36}" height="6" fill="${p.stoneShade}"/>`,
      `<rect x="${W*0.46}" y="${H*0.30}" width="${W*0.50}" height="${H*0.50}" fill="${p.wood}" opacity="0.9"/>`,
      `<rect x="${W*0.46}" y="${H*0.30}" width="${W*0.50}" height="4" fill="${p.woodShade}"/>`,
      `<rect x="${W*0.46}" y="${H*0.78}" width="${W*0.50}" height="4" fill="${p.woodShade}"/>`,
      `<rect x="${W*0.50}" y="${H*0.36}" width="${W*0.42}" height="4" fill="${p.woodShade}" opacity="0.7"/>`,
      `<circle cx="${W*0.92}" cy="${H*0.18}" r="${H*0.10}" fill="${p.text}" opacity="0.55"/>`,
      `<text x="${W*0.07}" y="${H*0.96}" font-family="${FONT}" font-size="14" letter-spacing="3" fill="${p.accent}" opacity="0.7">LIVING · CALM INTERIOR</text>`,
    ];
  },
  "kitchen-1.jpg": (p) => {
    return [
      `<rect width="100%" height="100%" fill="${p.wall}"/>`,
      `<rect y="${H*0.55}" width="100%" height="${H*0.45}" fill="${p.floor}"/>`,
      `<rect y="${H*0.55}" width="100%" height="4" fill="${p.floorShade}"/>`,
      `<rect x="0" y="${H*0.18}" width="${W}" height="${H*0.08}" fill="${p.stone}" opacity="0.9"/>`,
      `<rect x="0" y="${H*0.26}" width="${W}" height="6" fill="${p.stoneShade}"/>`,
      `<rect x="${W*0.06}" y="${H*0.40}" width="${W*0.88}" height="${H*0.20}" fill="${p.wood}" opacity="0.9"/>`,
      `<rect x="${W*0.06}" y="${H*0.40}" width="${W*0.88}" height="6" fill="${p.woodShade}"/>`,
      `<rect x="${W*0.10}" y="${H*0.46}" width="${W*0.20}" height="${H*0.12}" fill="${p.stone}" opacity="0.8"/>`,
      `<rect x="${W*0.40}" y="${H*0.46}" width="${W*0.20}" height="${H*0.12}" fill="${p.stone}" opacity="0.8"/>`,
      `<rect x="${W*0.70}" y="${H*0.46}" width="${W*0.20}" height="${H*0.12}" fill="${p.stone}" opacity="0.8"/>`,
      `<circle cx="${W*0.92}" cy="${H*0.08}" r="${H*0.06}" fill="${p.text}" opacity="0.6"/>`,
      `<text x="${W*0.07}" y="${H*0.96}" font-family="${FONT}" font-size="14" letter-spacing="3" fill="${p.accent}" opacity="0.7">KITCHEN · WARM MATERIAL</text>`,
    ];
  },
  "bedroom-1.jpg": (p) => {
    return [
      `<rect width="100%" height="100%" fill="${p.wall}"/>`,
      `<rect y="${H*0.68}" width="100%" height="${H*0.32}" fill="${p.floor}"/>`,
      `<rect y="${H*0.68}" width="100%" height="4" fill="${p.floorShade}"/>`,
      `<rect x="${W*0.10}" y="${H*0.45}" width="${W*0.80}" height="${H*0.20}" fill="${p.linen}" opacity="0.9"/>`,
      `<rect x="${W*0.12}" y="${H*0.50}" width="${W*0.18}" height="${H*0.16}" fill="${p.linenShade}" opacity="0.7"/>`,
      `<rect x="${W*0.32}" y="${H*0.50}" width="${W*0.18}" height="${H*0.16}" fill="${p.linenShade}" opacity="0.7"/>`,
      `<rect x="${W*0.52}" y="${H*0.50}" width="${W*0.18}" height="${H*0.16}" fill="${p.linenShade}" opacity="0.7"/>`,
      `<rect x="${W*0.72}" y="${H*0.50}" width="${W*0.18}" height="${H*0.16}" fill="${p.linenShade}" opacity="0.7"/>`,
      `<rect x="${W*0.04}" y="${H*0.05}" width="${W*0.18}" height="${H*0.55}" fill="${p.sun}" opacity="0.5"/>`,
      `<rect x="${W*0.04}" y="${H*0.05}" width="${W*0.18}" height="6" fill="${p.sunShade}"/>`,
      `<text x="${W*0.07}" y="${H*0.96}" font-family="${FONT}" font-size="14" letter-spacing="3" fill="${p.accent}" opacity="0.7">BEDROOM · SOFT HORIZON</text>`,
    ];
  },
  "bathroom-1.jpg": (p) => {
    return [
      `<rect width="100%" height="100%" fill="${p.wall}"/>`,
      `<rect y="${H*0.78}" width="100%" height="${H*0.22}" fill="${p.floor}"/>`,
      `<rect y="${H*0.78}" width="100%" height="4" fill="${p.floorShade}"/>`,
      `<rect x="${W*0.05}" y="${H*0.30}" width="${W*0.45}" height="${H*0.50}" fill="${p.metal}" opacity="0.85"/>`,
      `<rect x="${W*0.05}" y="${H*0.30}" width="${W*0.45}" height="6" fill="${p.metalShade}"/>`,
      `<rect x="${W*0.50}" y="${H*0.50}" width="${W*0.45}" height="${H*0.30}" fill="${p.shadow}" opacity="0.6"/>`,
      `<rect x="${W*0.50}" y="${H*0.50}" width="${W*0.45}" height="6" fill="${p.metalShade}"/>`,
      `<rect x="${W*0.55}" y="${H*0.62}" width="${W*0.34}" height="${H*0.06}" fill="${p.metalShade}" opacity="0.7"/>`,
      `<circle cx="${W*0.92}" cy="${H*0.20}" r="${H*0.08}" fill="${p.metal}" opacity="0.6"/>`,
      `<text x="${W*0.07}" y="${H*0.96}" font-family="${FONT}" font-size="14" letter-spacing="3" fill="${p.accent}" opacity="0.7">BATH · LIME PLASTER</text>`,
    ];
  },
  "entry-1.jpg": (p) => {
    return [
      `<rect width="100%" height="100%" fill="${p.wall}"/>`,
      `<rect y="${H*0.78}" width="100%" height="${H*0.22}" fill="${p.floor}"/>`,
      `<rect y="${H*0.78}" width="100%" height="6" fill="${p.floorShade}"/>`,
      `<polygon points="0,0 ${W},0 ${W},${H*0.40} 0,${H*0.55}" fill="${p.shadow}"/>`,
      `<rect x="${W*0.30}" y="${H*0.16}" width="${W*0.10}" height="${H*0.62}" fill="${p.text}" opacity="0.6"/>`,
      `<rect x="${W*0.30}" y="${H*0.16}" width="${W*0.10}" height="6" fill="${p.shadow}"/>`,
      `<circle cx="${W*0.78}" cy="${H*0.30}" r="${H*0.06}" fill="${p.text}" opacity="0.5"/>`,
      `<text x="${W*0.07}" y="${H*0.96}" font-family="${FONT}" font-size="14" letter-spacing="3" fill="${p.accent}" opacity="0.7">ENTRY · LOW CEILING</text>`,
    ];
  },
  "stair-1.jpg": (p) => {
    return [
      `<rect width="100%" height="100%" fill="${p.wall}"/>`,
      `<polygon points="0,${H*0.55} ${W},${H*0.10} ${W},${H} 0,${H}" fill="${p.stair}"/>`,
      `<rect y="${H*0.55}" width="100%" height="6" fill="${p.stairShade}"/>`,
      `<rect y="${H*0.65}" width="100%" height="4" fill="${p.stairShade}" opacity="0.7"/>`,
      `<rect y="${H*0.75}" width="100%" height="4" fill="${p.stairShade}" opacity="0.7"/>`,
      `<rect y="${H*0.85}" width="100%" height="4" fill="${p.stairShade}" opacity="0.7"/>`,
      `<rect x="${W*0.10}" y="${H*0.05}" width="${W*0.20}" height="6" fill="${p.stairShade}"/>`,
      `<rect x="${W*0.10}" y="${H*0.05}" width="6" height="${H*0.55}" fill="${p.stairShade}"/>`,
      `<text x="${W*0.07}" y="${H*0.96}" font-family="${FONT}" font-size="14" letter-spacing="3" fill="${p.accent}" opacity="0.7">STAIR · LIME RISE</text>`,
    ];
  },
  "outdoor-1.jpg": (p) => {
    return [
      `<rect width="100%" height="100%" fill="${p.wall}"/>`,
      `<rect y="${H*0.55}" width="100%" height="${H*0.45}" fill="${p.floor}"/>`,
      `<rect y="${H*0.55}" width="100%" height="6" fill="${p.floorShade}"/>`,
      `<circle cx="${W*0.85}" cy="${H*0.20}" r="${H*0.16}" fill="${p.sun}" opacity="0.85"/>`,
      `<circle cx="${W*0.85}" cy="${H*0.20}" r="${H*0.10}" fill="${p.sunShade}" opacity="0.6"/>`,
      `<rect x="${W*0.05}" y="${H*0.20}" width="${W*0.10}" height="${H*0.80}" fill="${p.leafShade}"/>`,
      `<rect x="${W*0.18}" y="${H*0.30}" width="${W*0.08}" height="${H*0.65}" fill="${p.leaf}"/>`,
      `<rect x="${W*0.75}" y="${H*0.10}" width="${W*0.08}" height="${H*0.92}" fill="${p.leaf}"/>`,
      `<rect x="${W*0.32}" y="${H*0.62}" width="${W*0.36}" height="${H*0.06}" fill="${p.leafShade}" opacity="0.8"/>`,
      `<text x="${W*0.07}" y="${H*0.96}" font-family="${FONT}" font-size="14" letter-spacing="3" fill="${p.accent}" opacity="0.7">OUTDOOR · SHADE</text>`,
    ];
  },
  "process-1.jpg": (p) => {
    return [
      `<rect width="100%" height="100%" fill="${p.wall}"/>`,
      `<rect x="${W*0.06}" y="${H*0.06}" width="${W*0.40}" height="${H*0.88}" fill="${p.paper}" opacity="0.95"/>`,
      `<rect x="${W*0.06}" y="${H*0.06}" width="${W*0.40}" height="${H*0.88}" rx="2" fill="none" stroke="${p.inkShade}" stroke-width="1"/>`,
      `<line x1="${W*0.12}" y1="${H*0.18}" x2="${W*0.40}" y2="${H*0.18}" stroke="${p.inkShade}" stroke-width="1" opacity="0.6"/>`,
      `<line x1="${W*0.12}" y1="${H*0.24}" x2="${W*0.36}" y2="${H*0.24}" stroke="${p.inkShade}" stroke-width="1" opacity="0.6"/>`,
      `<line x1="${W*0.12}" y1="${H*0.30}" x2="${W*0.38}" y2="${H*0.30}" stroke="${p.inkShade}" stroke-width="1" opacity="0.6"/>`,
      `<line x1="${W*0.12}" y1="${H*0.36}" x2="${W*0.34}" y2="${H*0.36}" stroke="${p.inkShade}" stroke-width="1" opacity="0.6"/>`,
      `<line x1="${W*0.12}" y1="${H*0.42}" x2="${W*0.40}" y2="${H*0.42}" stroke="${p.inkShade}" stroke-width="1" opacity="0.6"/>`,
      `<rect x="${W*0.52}" y="${H*0.20}" width="${W*0.42}" height="${H*0.40}" fill="${p.floor}" opacity="0.85"/>`,
      `<rect x="${W*0.52}" y="${H*0.20}" width="${W*0.42}" height="6" fill="${p.inkShade}" opacity="0.5"/>`,
      `<rect x="${W*0.56}" y="${H*0.30}" width="${W*0.16}" height="${H*0.30}" fill="${p.ink}" opacity="0.7"/>`,
      `<rect x="${W*0.78}" y="${H*0.30}" width="${W*0.12}" height="${H*0.30}" fill="${p.inkShade}" opacity="0.7"/>`,
      `<rect x="${W*0.56}" y="${H*0.65}" width="${W*0.36}" height="${H*0.18}" fill="${p.paper}" opacity="0.85"/>`,
      `<line x1="${W*0.60}" y1="${H*0.72}" x2="${W*0.86}" y2="${H*0.72}" stroke="${p.inkShade}" stroke-width="1"/>`,
      `<line x1="${W*0.60}" y1="${H*0.78}" x2="${W*0.82}" y2="${H*0.78}" stroke="${p.inkShade}" stroke-width="1"/>`,
      `<text x="${W*0.07}" y="${H*0.96}" font-family="${FONT}" font-size="14" letter-spacing="3" fill="${p.accent}" opacity="0.7">PROCESS · STUDIO DAY</text>`,
    ];
  },
};

const TASKS = [
  ["living-room-1.jpg", "living"],
  ["kitchen-1.jpg", "kitchen"],
  ["bedroom-1.jpg", "bedroom"],
  ["bathroom-1.jpg", "bathroom"],
  ["entry-1.jpg", "entry"],
  ["stair-1.jpg", "stair"],
  ["outdoor-1.jpg", "outdoor"],
  ["process-1.jpg", "process"],
];

const UPLOAD_COPIES = [
  "hero.jpg", "services-1.jpg", "services-2.jpg", "services-3.jpg", "services-4.jpg",
  "grid-1.jpg", "grid-2.jpg", "grid-3.jpg", "placeholder.jpg",
];

async function main() {
  for (const [name, kind] of TASKS) {
    const buf = svg(PALETTES[kind], scene[name]);
    const out = path.join(OUT_DIR, name);
    await sharp(buf)
      .jpeg({ quality: 80, progressive: true, mozjpeg: false })
      .toFile(out);
    const stat = fs.statSync(out);
    console.log(`+ ${name}  ${(stat.size/1024).toFixed(1)} KB`);
  }

  // Upload mirror copies - reuse the generated JPG for hero, services (rotate), grid, placeholder
  const sourceOrder = ["living-room-1.jpg", "kitchen-1.jpg", "bedroom-1.jpg", "bathroom-1.jpg", "stair-1.jpg", "outdoor-1.jpg", "entry-1.jpg", "process-1.jpg", "outdoor-1.jpg"];
  for (let i = 0; i < UPLOAD_COPIES.length; i++) {
    const src = path.join(OUT_DIR, sourceOrder[i]);
    const dst = path.join(UP_DIR, UPLOAD_COPIES[i]);
    fs.copyFileSync(src, dst);
    const stat = fs.statSync(dst);
    console.log(`+ ${UPLOAD_COPIES[i]}  ${(stat.size/1024).toFixed(1)} KB  (mirror)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
