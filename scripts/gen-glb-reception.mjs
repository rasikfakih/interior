#!/usr/bin/env node
/**
 * Generate a real GLB (a textured room) into public/models/seed/reception-room.glb.
 * Output is a valid GLB binary. Single textured cube with PBR material,
 * generated procedurally + baked into a small PNG via sharp.
 *
 * Goal: real GLB data the home-page 3D viewer can load. Not the 369-byte stub.
 */
import sharp from "sharp";
import path from "path";
import fs from "fs";

const OUT = path.join(process.cwd(), "public", "models", "seed", "reception-room.glb");

// Layout: 6-face textured cube representing a room interior.
// Each face has its own normalized UV (0..1). Quaternion-free.
// Indexed cube: 24 vertices (4 per face), 12 triangles.

// PNG dimensions for inpainted textures (downsampled for size cap)
const TEX_W = 512;
const TEX_H = 512;

function procSvg(palette, layers) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TEX_W} ${TEX_H}" width="${TEX_W}" height="${TEX_H}">${layers.join('\n')}</svg>`;
  return Buffer.from(svg);
}

async function makePng(palette, layers) {
  const svg = procSvg(palette, layers);
  return sharp(svg).png({ compressionLevel: 6, paletteQuantization: true }).toBuffer();
}

// Room palette: warm walnut floor, bone walls, soft sunlit windows, dark accent wall
const PAL = {
  floor: "#8a5d3b",
  floorShade: "#5f3f25",
  wall: "#efe6d2",
  wallShade: "#bbb09a",
  ceil: "#dccfb8",
  ceilShade: "#b6a98c",
  window: "#e8c98a",
  windowShade: "#c8a960",
  accent: "#2a2418",
  accentShade: "#1a160e",
};

// Floor texture: wood grain
async function floorPng() {
  const layers = [
    `<rect width="100%" height="100%" fill="${PAL.floor}"/>`,
    `<rect x="0" y="0" width="100%" height="100%" fill="url(#g)"/>`,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PAL.floor}" stop-opacity="0"/><stop offset="1" stop-color="${PAL.floorShade}" stop-opacity="0.4"/></linearGradient></defs>`,
    // Planks
    ...Array.from({ length: 8 }, (_, i) => {
      const y = (i / 8) * TEX_H;
      return `<line x1="0" y1="${y}" x2="${TEX_W}" y2="${y}" stroke="${PAL.floorShade}" stroke-width="2" opacity="0.5"/>`;
    }),
  ];
  return await makePng(PAL, layers);
}

// Walls texture: subtle plaster grain + window light
async function wallPng() {
  const layers = [
    `<rect width="100%" height="100%" fill="${PAL.wall}"/>`,
    `<rect width="100%" height="100%" fill="url(#noise)"/>`,
    `<defs>
      <filter id="grain"><feTurbulence baseFrequency="0.9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0"/></filter>
      <radialGradient id="window-cast" cx="50%" cy="35%" r="35%"><stop offset="0" stop-color="#fbe6b8" stop-opacity="0.55"/><stop offset="1" stop-color="#fbe6b8" stop-opacity="0"/></radialGradient>
    </defs>`,
    `<rect width="100%" height="100%" filter="url(#grain)"/>`,
    `<rect width="100%" height="100%" fill="url(#window-cast)"/>`,
  ];
  return await makePng(PAL, layers);
}

// Ceiling texture: soft warm
async function ceilPng() {
  const layers = [
    `<rect width="100%" height="100%" fill="${PAL.ceil}"/>`,
    `<rect width="100%" height="100%" fill="url(#shade)"/>`,
    `<defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PAL.ceilShade}" stop-opacity="0.4"/><stop offset="1" stop-color="${PAL.ceilShade}" stop-opacity="0"/></linearGradient></defs>`,
  ];
  return await makePng(PAL, layers);
}

// Accent wall (back wall near camera): deeper colour
async function accentPng() {
  const layers = [
    `<rect width="100%" height="100%" fill="${PAL.accent}"/>`,
    `<rect width="100%" height="${TEX_H*0.55}" fill="${PAL.accentShade}"/>`,
    // Decorative element
    `<rect x="${TEX_W*0.10}" y="${TEX_H*0.20}" width="${TEX_W*0.30}" height="${TEX_H*0.40}" fill="none" stroke="${PAL.wallShade}" stroke-width="2" opacity="0.7"/>`,
    `<rect x="${TEX_W*0.60}" y="${TEX_H*0.30}" width="${TEX_W*0.22}" height="${TEX_H*0.30}" fill="none" stroke="${PAL.wallShade}" stroke-width="2" opacity="0.7"/>`,
  ];
  return await makePng(PAL, layers);
}

function alignTo4(buf) {
  const pad = (4 - (buf.length % 4)) % 4;
  return pad === 0 ? buf : Buffer.concat([buf, Buffer.alloc(pad)]);
}

function f32(arr) {
  const out = Buffer.alloc(arr.length * 4);
  for (let i = 0; i < arr.length; i++) out.writeFloatLE(arr[i], i * 4);
  return out;
}

function u16(arr) {
  const out = Buffer.alloc(arr.length * 2);
  for (let i = 0; i < arr.length; i++) out.writeUInt16LE(arr[i], i * 2);
  return out;
}

function pad4(s) {
  // Pad byte string length to 4 (for GLB JSON chunk)
  const buf = Buffer.from(s, 'utf8');
  const pad = (4 - (buf.length % 4)) % 4;
  return Buffer.concat([buf, Buffer.alloc(pad, 0x20)]);
}

async function buildGlb() {
  // Build six face textures as PNG bytes.
  const floor = await floorPng();
  const wall = await wallPng();
  const ceil = await ceilPng();
  const accent = await accentPng();

  // The 6-side cube: each face is 4 vertices with its own normal + uv.
  // Face order: +X (right), -X (left), +Y (top/ceil), -Y (bottom/floor), +Z (front/accent), -Z (back/wall)
  // For a "room" interpretation:
  //   -X = wall, +X = wall, -Z = wall (back), +Z = wall (camera-facing), -Y = floor, +Y = ceil

  // Vertices for each face (4 verts per face, 24 total)
  // Each entry: [x, y, z, nx, ny, nz, u, v]
  const N = (n) => n.join(',');

  // face vertices for a unit cube centered at origin (sz=2 so corners at +-1)
  const s = 1.5;

  const faces = [
    // 0: -X wall (left side)
    {
      // verts, uvs, colorIdx (0=floor/wall maps to wall)
      v: [
        [-s, -s, -s], [-s, +s, -s], [-s, +s, +s], [-s, -s, +s],
      ],
      n: [-1, 0, 0],
      uv: [[0, 0], [0, 1], [1, 1], [1, 0]],
      tex: 1, // wall
    },
    // 1: +X wall (right side)
    {
      v: [
        [+s, -s, +s], [+s, +s, +s], [+s, +s, -s], [+s, -s, -s],
      ],
      n: [+1, 0, 0],
      uv: [[0, 0], [0, 1], [1, 1], [1, 0]],
      tex: 1,
    },
    // 2: -Y floor
    {
      v: [
        [-s, -s, +s], [+s, -s, +s], [+s, -s, -s], [-s, -s, -s],
      ],
      n: [0, -1, 0],
      uv: [[0, 0], [0, 1], [1, 1], [1, 0]],
      tex: 0, // floor
    },
    // 3: +Y ceil
    {
      v: [
        [-s, +s, -s], [+s, +s, -s], [+s, +s, +s], [-s, +s, +s],
      ],
      n: [0, +1, 0],
      uv: [[0, 0], [0, 1], [1, 1], [1, 0]],
      tex: 2, // ceil
    },
    // 4: -Z wall (camera-facing back, accent wall - use accent tex even though name says +Z)
    {
      v: [
        [+s, -s, -s], [+s, +s, -s], [-s, +s, -s], [-s, -s, -s],
      ],
      n: [0, 0, -1],
      uv: [[0, 0], [0, 1], [1, 1], [1, 0]],
      tex: 3, // accent
    },
    // 5: +Z wall (front)
    {
      v: [
        [-s, -s, +s], [-s, +s, +s], [+s, +s, +s], [+s, -s, +s],
      ],
      n: [0, 0, +1],
      uv: [[0, 0], [0, 1], [1, 1], [1, 0]],
      tex: 1,
    },
  ];

  // Build interleaved vertex array
  const positions = [];
  const normals = [];
  const uvs = [];
  for (const f of faces) {
    for (let i = 0; i < 4; i++) {
      positions.push(...f.v[i]);
      normals.push(...f.n);
      uvs.push(...f.uv[i]);
    }
  }

  // Indices: 2 triangles per face, 6 faces = 12 triangles = 36 indices
  const indices = [];
  for (let f = 0; f < 6; f++) {
    const b = f * 4;
    indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }

  // Compose the glTF layout
  const POSITION_MIN = [-s, -s, -s];
  const POSITION_MAX = [+s, +s, +s];

  // buffers array: position, normal, uv, indices, image(wall), image(floor), image(ceil), image(accent)
  const posBuf = alignTo4(f32(positions));
  const norBuf = alignTo4(f32(normals));
  const uvBuf = alignTo4(f32(uvs));
  const idxBuf = alignTo4(u16(indices));

  const wallImg = alignTo4(wall);
  const floorImg = alignTo4(floor);
  const ceilImg = alignTo4(ceil);
  const accentImg = alignTo4(accent);

  const binChunk = Buffer.concat([posBuf, norBuf, uvBuf, idxBuf, wallImg, floorImg, ceilImg, accentImg]);
  const binPadBytes = (4 - (binChunk.length % 4)) % 4;
  if (binPadBytes > 0) binChunk = Buffer.concat([binChunk, Buffer.alloc(binPadBytes, 0)]);

  // Compute byteOffset of each buffer inside BIN
  const POS_OFF = 0;
  const POS_LEN = posBuf.length;
  const NOR_OFF = POS_OFF + POS_LEN;
  const NOR_LEN = norBuf.length;
  const UV_OFF = NOR_OFF + NOR_LEN;
  const UV_LEN = uvBuf.length;
  const IDX_OFF = UV_OFF + UV_LEN;
  const IDX_LEN = idxBuf.length;
  const WALL_IMG_OFF = IDX_OFF + IDX_LEN;
  const WALL_IMG_LEN = wallImg.length;
  const FLOOR_IMG_OFF = WALL_IMG_OFF + WALL_IMG_LEN;
  const FLOOR_IMG_LEN = floorImg.length;
  const CEIL_IMG_OFF = FLOOR_IMG_OFF + FLOOR_IMG_LEN;
  const CEIL_IMG_LEN = ceilImg.length;
  const ACCENT_IMG_OFF = CEIL_IMG_OFF + CEIL_IMG_LEN;
  const ACCENT_IMG_LEN = accentImg.length;

  const gltf = {
    asset: { version: "2.0", generator: "etihad-interiors-gen-demo-assets.mjs" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{
      primitives: [
        {
          attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
          indices: 3,
          material: 0,
          mode: 4, // TRIANGLES
        },
      ],
    }],
    materials: [{
      name: "room",
      pbrMetallicRoughness: {
        baseColorFactor: [1.0, 1.0, 1.0, 1.0],
        metallicFactor: 0.0,
        roughnessFactor: 0.85,
        baseColorTexture: { index: 0 },
      },
    }],
    textures: [
      { source: 0 },
      { source: 1 },
      { source: 2 },
      { source: 3 },
    ],
    images: [
      // Wall tex
      { mimeType: "image/png", bufferView: 4 },
      // Floor tex
      { mimeType: "image/png", bufferView: 5 },
      // Ceil tex
      { mimeType: "image/png", bufferView: 6 },
      // Accent tex
      { mimeType: "image/png", bufferView: 7 },
    ],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
    bufferViews: [
      // Positions (no stride, FLOAT)
      { buffer: 0, byteOffset: POS_OFF, byteLength: POS_LEN, target: 34962 },
      // Normals
      { buffer: 0, byteOffset: NOR_OFF, byteLength: NOR_LEN, target: 34962 },
      // UVs
      { buffer: 0, byteOffset: UV_OFF, byteLength: UV_LEN, target: 34962 },
      // Indices
      { buffer: 0, byteOffset: IDX_OFF, byteLength: IDX_LEN, target: 34963 },
      // Wall image
      { buffer: 0, byteOffset: WALL_IMG_OFF, byteLength: WALL_IMG_LEN },
      // Floor image
      { buffer: 0, byteOffset: FLOOR_IMG_OFF, byteLength: FLOOR_IMG_LEN },
      // Ceil image
      { buffer: 0, byteOffset: CEIL_IMG_OFF, byteLength: CEIL_IMG_LEN },
      // Accent image
      { buffer: 0, byteOffset: ACCENT_IMG_OFF, byteLength: ACCENT_IMG_LEN },
    ],
    buffers: [{ byteLength: binChunk.length }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 24, type: "VEC3", min: POSITION_MIN, max: POSITION_MAX },
      { bufferView: 1, componentType: 5126, count: 24, type: "VEC3" },
      { bufferView: 2, componentType: 5126, count: 24, type: "VEC2" },
      { bufferView: 3, componentType: 5123, count: 36, type: "SCALAR" },
    ],
  };

  const jsonStr = JSON.stringify(gltf);
  const jsonBytes = pad4(jsonStr);

  // GLB header
  const headerBuf = Buffer.alloc(12);
  headerBuf.writeUInt32LE(0x46546C67, 0); // magic 'glTF'
  headerBuf.writeUInt32LE(2, 4); // version
  headerBuf.writeUInt32LE(12 + 8 + jsonBytes.length + 8 + binChunk.length, 8);

  // JSON chunk header
  const jsonChunk = Buffer.alloc(8);
  jsonChunk.writeUInt32LE(jsonBytes.length, 0);
  jsonChunk.writeUInt32LE(0x4E4F534A, 4); // 'JSON'

  // BIN chunk header
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binChunk.length, 0);
  binHeader.writeUInt32LE(0x004E4942, 4); // 'BIN\0'

  if (!fs.existsSync(path.dirname(OUT))) fs.mkdirSync(path.dirname(OUT), { recursive: true });
  ws: fs.writeFileSync(OUT, Buffer.concat([headerBuf, jsonChunk, jsonBytes, binHeader, binChunk]));
  const stat = fs.statSync(OUT);
  console.log(`+ reception-room.glb  ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);
}

buildGlb().catch((e) => { console.error(e); process.exit(1); });
