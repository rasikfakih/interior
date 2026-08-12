#!/usr/bin/env node
/**
 * scripts/generate-placeholder-rooms.mjs
 *
 * StudioOS Phase 3 - procedural placeholder room generator.
 *
 * Builds a stylized, low-poly room per room type with three.js and
 * exports a binary GLB via GLTFExporter to public/models/rooms/. These
 * are placeholder scenes so the room-by-room walkthrough UX is
 * demonstrable end to end before real per-room GLBs are uploaded by
 * tenants through the media library (zero code change to swap).
 *
 * Usage: node scripts/generate-placeholder-rooms.mjs
 * Idempotent: overwrites public/models/rooms/<slug>.glb each run.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// GLTFExporter.writeAsync reads the GLB Blob through a FileReader,
// a browser API. Polyfill it (Node 18+ has global Blob) BEFORE the
// three imports evaluate, hence the dynamic imports below.
if (!globalThis.FileReader) {
  class FileReaderPolyfill {
    onload = null;
    onloadend = null;
    onerror = null;
    result = null;
    readAsArrayBuffer(blob) {
      blob
        .arrayBuffer()
        .then((buf) => {
          this.result = buf;
          this.onload?.({ target: this });
          this.onloadend?.({ target: this });
        })
        .catch((e) => this.onerror?.(e));
    }
  }
  globalThis.FileReader = FileReaderPolyfill;
}

const THREE = await import("three");
const { GLTFExporter } = await import(
  "three/examples/jsm/exporters/GLTFExporter.js"
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "models", "rooms");

const M = {
  wood: new THREE.MeshStandardMaterial({ color: 0x8a6f52, roughness: 0.85, metalness: 0.0 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x5f4a33, roughness: 0.7, metalness: 0.0 }),
  bone: new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.9, metalness: 0.0 }),
  boneLight: new THREE.MeshStandardMaterial({ color: 0xf2eee4, roughness: 0.9, metalness: 0.0 }),
  forest: new THREE.MeshStandardMaterial({ color: 0x2f4a3c, roughness: 0.65, metalness: 0.0 }),
  forestDark: new THREE.MeshStandardMaterial({ color: 0x24392e, roughness: 0.7, metalness: 0.0 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0xc9b89a, roughness: 0.95, metalness: 0.0 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x9aa3a0, roughness: 0.35, metalness: 0.7 }),
  linen: new THREE.MeshStandardMaterial({ color: 0xd9cdb8, roughness: 0.9, metalness: 0.0 }),
  slate: new THREE.MeshStandardMaterial({ color: 0x5b615e, roughness: 0.6, metalness: 0.1 }),
};

function box(scene, w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function cyl(scene, rTop, rBottom, h, material, x, y, z, seg = 16) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBottom, h, seg),
    material
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function sphere(scene, r, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  scene.add(mesh);
  return mesh;
}

/** Shared shell: floor + three walls, room 4.4m x 3.6m x 2.8m. */
function roomShell(scene) {
  box(scene, 4.4, 0.12, 3.6, M.wood, 0, -0.06, 0); // floor
  box(scene, 4.4, 2.8, 0.12, M.bone, 0, 1.4, -1.8); // back wall
  box(scene, 0.12, 2.8, 3.6, M.bone, -2.2, 1.4, 0); // left wall
  box(scene, 0.12, 2.8, 3.6, M.bone, 2.2, 1.4, 0); // right wall
  // baseboard
  box(scene, 4.4, 0.12, 0.04, M.darkWood, 0, 0.06, -1.78);
  box(scene, 0.04, 0.12, 3.6, M.darkWood, -2.18, 0.06, 0);
  box(scene, 0.04, 0.12, 3.6, M.darkWood, 2.18, 0.06, 0);
  // ceiling slab hint (thin, near top)
  box(scene, 4.4, 0.08, 3.6, M.boneLight, 0, 2.76, 0);
}

function buildLiving(scene) {
  roomShell(scene);
  // rug
  box(scene, 2.2, 0.02, 1.5, M.linen, -0.2, 0.02, 0.3);
  // sofa (L): base
  box(scene, 2.2, 0.5, 0.95, M.forest, -0.1, 0.25, 0.7);
  // sofa back + arm
  box(scene, 2.2, 0.65, 0.28, M.forestDark, -0.1, 0.7, 0.45);
  box(scene, 0.28, 0.65, 0.95, M.forestDark, -1.14, 0.65, 0.7);
  // cushions
  box(scene, 0.6, 0.18, 0.6, M.fabric, -0.75, 0.6, 0.85);
  box(scene, 0.6, 0.18, 0.6, M.fabric, 0.55, 0.6, 0.85);
  // coffee table
  box(scene, 1.1, 0.35, 0.6, M.darkWood, -0.2, 0.35, 0.0);
  // TV unit along back wall
  box(scene, 1.8, 0.5, 0.4, M.darkWood, 0, 0.25, -1.5);
  box(scene, 1.4, 0.02, 0.22, M.slate, 0, 0.52, -1.5); // TV screen
  // floor lamp (left)
  cyl(scene, 0.03, 0.03, 1.3, M.metal, -1.7, 0.65, -0.9);
  sphere(scene, 0.22, M.linen, -1.7, 1.45, -0.9);
  // plant (right)
  cyl(scene, 0.18, 0.24, 0.35, M.slate, 1.7, 0.2, 0.9);
  cyl(scene, 0.02, 0.02, 0.7, M.darkWood, 1.7, 0.7, 0.9);
  sphere(scene, 0.3, M.forest, 1.7, 1.15, 0.9);
  // wall art
  box(scene, 0.5, 0.6, 0.04, M.forestDark, 1.9, 1.5, -1.78);
}

function buildKitchen(scene) {
  roomShell(scene);
  // counter along back wall
  box(scene, 3.4, 0.9, 0.6, M.darkWood, -0.3, 0.45, -1.45);
  box(scene, 3.4, 0.04, 0.6, M.slate, -0.3, 0.92, -1.45); // countertop
  // sink (recessed hint)
  box(scene, 0.7, 0.03, 0.45, M.metal, -0.9, 0.95, -1.45);
  // upper cabinets
  box(scene, 3.0, 0.7, 0.35, M.bone, -0.3, 1.85, -1.55);
  // island
  box(scene, 1.9, 0.92, 1.0, M.forest, 0.4, 0.46, 0.2);
  box(scene, 1.9, 0.05, 1.0, M.slate, 0.4, 0.95, 0.2);
  // stools
  for (const sx of [-0.35, 0.15, 0.65]) {
    cyl(scene, 0.03, 0.03, 0.6, M.metal, 0.4 + sx, 0.3, -0.75);
    box(scene, 0.36, 0.05, 0.36, M.fabric, 0.4 + sx, 0.63, -0.75);
  }
  // pendant lights
  for (const px of [-0.3, 0.4]) {
    cyl(scene, 0.12, 0.12, 0.08, M.metal, px, 2.55, 0.2);
  }
  // fridge (right corner)
  box(scene, 0.7, 1.8, 0.7, M.boneLight, 1.75, 0.9, -1.2);
}

function buildBedroom(scene) {
  roomShell(scene);
  // rug
  box(scene, 2.6, 0.02, 2.0, M.linen, 0.2, 0.02, 0.2);
  // bed: frame + mattress + pillows
  box(scene, 1.7, 0.28, 2.05, M.darkWood, -0.9, 0.14, 0.2);
  box(scene, 1.55, 0.22, 1.9, M.boneLight, -0.9, 0.39, 0.2);
  box(scene, 1.4, 0.18, 0.5, M.fabric, -0.9, 0.55, -0.62);
  box(scene, 1.4, 0.18, 0.5, M.fabric, -0.9, 0.55, -0.08);
  // headboard
  box(scene, 1.7, 1.1, 0.1, M.forest, -0.9, 0.85, -0.98);
  // side tables
  box(scene, 0.45, 0.5, 0.45, M.darkWood, -1.85, 0.25, 0.5);
  box(scene, 0.45, 0.5, 0.45, M.darkWood, 0.05, 0.25, 0.5);
  // lamps
  cyl(scene, 0.04, 0.04, 0.35, M.metal, -1.85, 0.7, 0.5);
  sphere(scene, 0.1, M.linen, -1.85, 0.93, 0.5);
  cyl(scene, 0.04, 0.04, 0.35, M.metal, 0.05, 0.7, 0.5);
  sphere(scene, 0.1, M.linen, 0.05, 0.93, 0.5);
  // wardrobe
  box(scene, 1.5, 2.2, 0.6, M.forestDark, 1.45, 1.1, -1.45);
  // bench at foot
  box(scene, 1.1, 0.35, 0.4, M.fabric, -0.6, 0.18, 1.1);
}

function buildStudy(scene) {
  roomShell(scene);
  // bookshelf (back wall)
  box(scene, 2.0, 2.2, 0.4, M.darkWood, 0.3, 1.1, -1.55);
  const bookRows = [
    { y: 0.4, color: M.forest },
    { y: 1.0, color: M.fabric },
    { y: 1.6, color: M.slate },
    { y: 2.2, color: M.forestDark },
  ];
  for (const row of bookRows) {
    for (let i = -0.7; i <= 0.7; i += 0.22) {
      box(scene, 0.16, 0.28, 0.26, row.color, 0.3 + i, row.y, -1.35);
    }
  }
  // desk
  box(scene, 1.6, 0.06, 0.75, M.darkWood, -0.6, 0.73, 0.35);
  box(scene, 0.06, 0.73, 0.06, M.darkWood, -1.25, 0.37, 0.35);
  box(scene, 0.06, 0.73, 0.06, M.darkWood, 0.05, 0.37, 0.35);
  // monitor
  box(scene, 0.6, 0.4, 0.04, M.slate, -0.6, 1.02, 0.0);
  cyl(scene, 0.04, 0.04, 0.15, M.metal, -0.6, 0.87, 0.0);
  // chair
  cyl(scene, 0.03, 0.03, 0.45, M.metal, -0.6, 0.23, -0.55);
  box(scene, 0.45, 0.1, 0.45, M.forest, -0.6, 0.5, -0.55);
  box(scene, 0.45, 0.55, 0.08, M.forest, -0.6, 0.83, -0.75);
  // rug
  box(scene, 2.2, 0.02, 1.6, M.linen, -0.4, 0.02, 0.1);
  // plant corner
  cyl(scene, 0.18, 0.24, 0.35, M.slate, 1.7, 0.2, 1.2);
  sphere(scene, 0.35, M.forest, 1.7, 1.3, 1.2);
  // pendant
  cyl(scene, 0.14, 0.14, 0.06, M.metal, -0.6, 2.4, 0.35);
}

const ROOMS = [
  { slug: "living-room", label: "Living room", build: buildLiving },
  { slug: "kitchen", label: "Kitchen", build: buildKitchen },
  { slug: "bedroom", label: "Bedroom", build: buildBedroom },
  { slug: "study", label: "Study", build: buildStudy },
];

async function exportGlb(scene) {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) resolve(Buffer.from(result));
        else resolve(Buffer.from(JSON.stringify(result), "utf8"));
      },
      (err) => reject(err),
      { binary: true }
    );
  });
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const room of ROOMS) {
  const scene = new THREE.Scene();
  scene.name = room.label;
  room.build(scene);
  const glb = await exportGlb(scene);
  const out = path.join(OUT_DIR, `${room.slug}.glb`);
  fs.writeFileSync(out, glb);
  console.log(
    `+ ${room.slug}.glb (${(glb.byteLength / 1024).toFixed(1)} kB)`
  );
}

console.log(`Done. Placeholder rooms written to public/models/rooms/.`);
