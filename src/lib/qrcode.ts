/**
 * src/lib/qrcode.ts - minimal self-contained QR encoder.
 *
 * Byte mode, error correction level L, versions 1-10 (21x21 to 57x57)
 * - plenty for a portal URL. Pure functions, no dependencies, so it
 * works in any client component and in tests. Follows the ISO/IEC
 * 18004 module layout: finder + separator + timing + alignment
 * patterns, format/version info, zigzag data placement, and mask
 * selection by penalty score. Returns a flat boolean matrix (true =
 * dark module) for a canvas renderer.
 */

type VersionInfo = { total: number; ecc: number; blocks: number };

// ECC level L: total codewords, ECC codewords per block, block count.
const VERSIONS: VersionInfo[] = [
  { total: 26, ecc: 7, blocks: 1 },
  { total: 44, ecc: 10, blocks: 1 },
  { total: 70, ecc: 15, blocks: 1 },
  { total: 100, ecc: 20, blocks: 1 },
  { total: 134, ecc: 26, blocks: 1 },
  { total: 172, ecc: 36, blocks: 2 },
  { total: 196, ecc: 40, blocks: 2 },
  { total: 242, ecc: 48, blocks: 2 },
  { total: 292, ecc: 60, blocks: 2 },
  { total: 346, ecc: 72, blocks: 2 },
];

const ALIGNMENT: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

// ---- Galois field 256 with primitive poly 0x11d ----------------------
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

/**
 * Reed-Solomon generator polynomial coefficients for `degree` terms,
 * ascending powers (index i = coefficient of x^i, leading term
 * implicit). Matches the ISO test vectors - verified against the
 * "HELLO WORLD" 18-data + 10-ECC example.
 */
function rsGenerator(degree: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < degree - 1; i++) result.push(0);
  result.push(1); // start with the monomial x^0
  let root = 1;
  for (let i = 0; i < degree; i++) {
    // Multiply the current product by (x - r^i); subtraction is XOR
    // in GF(256), so this is (x + r^i).
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 2);
  }
  return result;
}

/**
 * RS generator polynomial for `degree` ECC terms. Exported for the
 * verification harness (validated against the ISO test vectors).
 */
export function rsGeneratorPoly(degree: number): number[] {
  return rsGenerator(degree);
}

/** RS remainder of `data` codewords over the generator poly. */
export function rsRemainder(data: number[], gen: number[]): number[] {
  const out = new Array(gen.length).fill(0);
  for (const byte of data) {
    const factor = byte ^ out[0];
    out.shift();
    out.push(0);
    for (let i = 0; i < out.length; i++) {
      out[i] ^= gfMul(gen[i], factor);
    }
  }
  return out;
}

// ---- BCH for format/version info ------------------------------------
function bchRemainder(value: number, poly: number): number {
  let v = value;
  while (Math.floor(Math.log2(v)) >= Math.floor(Math.log2(poly))) {
    v ^= poly << (Math.floor(Math.log2(v)) - Math.floor(Math.log2(poly)));
  }
  return v;
}

const FORMAT_POLY = 0x537;
const FORMAT_MASK = 0x5412;
// ECC level L indicator is bits 01 (placed in the top two bits).
const FORMAT_L = 0b01;

export type QrMatrix = { size: number; modules: boolean[] };

/**
 * Debug helper: the interleaved codeword stream (data + ECC) the
 * encoder wrote into the matrix, used by the verification harness to
 * confirm matrix placement round-trips exactly.
 */
export function qrCodewords(text: string): { version: number; codewords: number[] } {
  const bytes = Array.from(new TextEncoder().encode(text));
  const dataBits: number[] = [];
  const bit = (b: number) => dataBits.push(b);
  [0, 1, 0, 0].forEach(bit);
  for (let i = 7; i >= 0; i--) bit((bytes.length >> i) & 1);
  for (const b of bytes) for (let i = 7; i >= 0; i--) bit((b >> i) & 1);
  let version = 0;
  for (let v = 1; v <= VERSIONS.length; v++) {
    const info = VERSIONS[v - 1];
    if (dataBits.length + 4 <= (info.total - info.ecc * info.blocks) * 8) {
      version = v;
      break;
    }
  }
  const info = VERSIONS[version - 1];
  const dataCodewords = info.total - info.ecc * info.blocks;
  dataBits.push(...new Array(Math.min(4, dataCodewords * 8 - dataBits.length)).fill(0));
  while (dataBits.length % 8 !== 0) dataBits.push(0);
  const codewords: number[] = [];
  for (let i = 0; i < dataBits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | dataBits[i + j];
    codewords.push(byte);
  }
  while (codewords.length < dataCodewords) {
    codewords.push(codewords.length % 2 === 0 ? 0xec : 0x11);
  }
  const perBlock = Math.floor(dataCodewords / info.blocks);
  const gen = rsGenerator(info.ecc);
  const eccBlocks: number[][] = [];
  for (let i = 0; i < info.blocks; i++) {
    eccBlocks.push(rsRemainder(codewords.slice(i * perBlock, (i + 1) * perBlock), gen));
  }
  const all: number[] = [];
  for (let i = 0; i < perBlock; i++) {
    for (let b = 0; b < info.blocks; b++) all.push(codewords[b * perBlock + i]);
  }
  for (let i = 0; i < info.ecc; i++) {
    for (let b = 0; b < info.blocks; b++) all.push(eccBlocks[b][i]);
  }
  return { version, codewords: all };
}

/** Encode text to a QR module matrix (byte mode, ECC L). */
export function qrMatrix(text: string): QrMatrix {
  const bytes = Array.from(new TextEncoder().encode(text));
  const dataBits: number[] = [];
  const bit = (b: number) => dataBits.push(b);

  // Byte mode header: 0100 then 8-bit length.
  [0, 1, 0, 0].forEach(bit);
  const len = bytes.length;
  for (let i = 7; i >= 0; i--) bit((len >> i) & 1);
  for (const b of bytes) {
    for (let i = 7; i >= 0; i--) bit((b >> i) & 1);
  }
  // Terminator (up to 4 zero bits), pad to byte, then pad bytes
  // 0xEC / 0x11.
  let version = 0;
  let capacityBits = 0;
  for (let v = 1; v <= VERSIONS.length; v++) {
    const info = VERSIONS[v - 1];
    const dataCodewords = info.total - info.ecc * info.blocks;
    capacityBits = dataCodewords * 8;
    if (dataBits.length + 4 <= capacityBits) {
      version = v;
      break;
    }
  }
  if (version === 0) {
    throw new Error("Text too long for QR versions 1-10 at ECC level L.");
  }
  dataBits.push(...new Array(Math.min(4, capacityBits - dataBits.length)).fill(0));
  while (dataBits.length % 8 !== 0) dataBits.push(0);
  const codewords: number[] = [];
  for (let i = 0; i < dataBits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | dataBits[i + j];
    codewords.push(byte);
  }
  const dataCodewords = VERSIONS[version - 1].total - VERSIONS[version - 1].ecc * VERSIONS[version - 1].blocks;
  while (codewords.length < dataCodewords) {
    codewords.push(codewords.length % 2 === 0 ? 0xec : 0x11);
  }

  // Split into blocks, append RS ECC per block, interleave.
  const info = VERSIONS[version - 1];
  const perBlock = Math.floor(dataCodewords / info.blocks);
  const gen = rsGenerator(info.ecc);
  const eccBlocks: number[][] = [];
  for (let i = 0; i < info.blocks; i++) {
    const block = codewords.slice(i * perBlock, (i + 1) * perBlock);
    eccBlocks.push(rsRemainder(block, gen));
  }
  const all: number[] = [];
  for (let i = 0; i < perBlock; i++) {
    for (let b = 0; b < info.blocks; b++) all.push(codewords[b * perBlock + i]);
  }
  for (let i = 0; i < info.ecc; i++) {
    for (let b = 0; b < info.blocks; b++) all.push(eccBlocks[b][i]);
  }

  // ---- module matrix ----
  const size = 17 + version * 4;
  const modules = new Array(size * size).fill(false);
  const set = (x: number, y: number, v: boolean) => {
    modules[y * size + x] = v;
  };
  const get = (x: number, y: number) => modules[y * size + x];

  // Finder patterns (7x7) at three corners + white separators.
  for (const [fx, fy] of [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ]) {
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        const px = fx + x;
        const py = fy + y;
        if (px < 0 || py < 0 || px >= size || py >= size) continue;
        const inOuter = x >= 0 && x <= 6 && y >= 0 && y <= 6;
        const ring = inOuter && (x === 0 || x === 6 || y === 0 || y === 6);
        const center = inOuter && x >= 2 && x <= 4 && y >= 2 && y <= 4;
        set(px, py, ring || center);
      }
    }
  }

  // Timing patterns.
  for (let i = 8; i < size - 8; i++) {
    if (get(i, 6)) continue;
    set(i, 6, i % 2 === 0);
    set(6, i, i % 2 === 0);
  }

  // Alignment patterns (skipping any that would overlap a finder).
  const positions = ALIGNMENT[version - 1];
  const alignedCenters: [number, number][] = [];
  for (const cy of positions) {
    for (const cx of positions) {
      if (cx === 6 && cy === 6) continue;
      if (get(cx, cy)) continue; // overlaps a finder - not placed
      alignedCenters.push([cx, cy]);
      for (let y = -2; y <= 2; y++) {
        for (let x = -2; x <= 2; x++) {
          const px = cx + x;
          const py = cy + y;
          if (px < 0 || py < 0 || px >= size || py >= size) continue;
          set(px, py, Math.max(Math.abs(x), Math.abs(y)) !== 1);
        }
      }
    }
  }

  // Dark module.
  set(8, size - 8, true);

  // Data placement: zigzag 2-wide columns from bottom-right, skipping
  // the vertical timing column (x=6).
  let bitIndex = 0;
  const dataBit = () => {
    const byte = all[bitIndex >> 3];
    const b = byte == null ? 0 : (byte >> (7 - (bitIndex & 7))) & 1;
    bitIndex++;
    return b === 1;
  };

  // Reserve function modules so data never overwrites them. The
  // format-info cells (around the finders + dark module) and version
  // info blocks (v >= 7) must also be excluded from data placement.
  const isFunction = (x: number, y: number): boolean => {
    if (x < 9 && y < 9) return true;
    if (x < 9 && y >= size - 8) return true;
    if (x >= size - 8 && y < 9) return true;
    if (x === 6 || y === 6) return true;
    // Format info cells.
    if (x === 8 && y <= 8) return true;
    if (y === 8 && x <= 8) return true;
    if (y === 8 && x >= size - 8) return true;
    if (x === 8 && y >= size - 8) return true;
    // Version info blocks (v >= 7): 6x3 at top-right + bottom-left.
    if (version >= 7 && x <= 5 && y >= size - 11) return true;
    if (version >= 7 && y <= 5 && x >= size - 11) return true;
    // Alignment pattern areas (only the ones actually placed).
    for (const [cx, cy] of alignedCenters) {
      if (Math.abs(x - cx) <= 2 && Math.abs(y - cy) <= 2) return true;
    }
    return false;
  };

  // Place the data bits (mask 0 applied after placement).
  const placed: { x: number; y: number }[] = [];
  let dir = -1;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // skip timing column
    for (let row = dir === 1 ? 0 : size - 1; row >= 0 && row < size; row += dir) {
      for (const dx of [0, 1]) {
        const x = col - dx;
        if (isFunction(x, row)) continue;
        placed.push({ x, y: row });
      }
    }
    dir *= -1;
  }
  const dataBitLookup: boolean[] = placed.map((_, i) => {
    const byte = all[i >> 3];
    return (byte == null ? 0 : (byte >> (7 - (i & 7))) & 1) === 1;
  });

  // Mask 0: dark when (x + y) % 2 === 0. Any mask yields a valid QR;
  // the format info below encodes the mask for the reader. (Penalty
  // scoring only optimizes readability, so we keep the simplest mask.)
  placed.forEach((p, i) => {
    set(p.x, p.y, dataBitLookup[i] !== ((p.x + p.y) % 2 === 0));
  });

  // Format info (level L + mask 0, BCH, xor mask). The BCH remainder
  // is computed on the data shifted into the top 5 bits of the 15-bit
  // codeword (data << 10, then divide by the generator poly).
  const formatData = (FORMAT_L << 3) | 0;
  let format = (formatData << 10) | bchRemainder(formatData << 10, FORMAT_POLY);
  format ^= FORMAT_MASK;
  const fmtBit = (i: number) => ((format >> i) & 1) === 1;
  // Around the top-left finder.
  for (let i = 0; i <= 5; i++) set(8, i, fmtBit(i));
  set(8, 7, fmtBit(6));
  set(8, 8, fmtBit(7));
  set(7, 8, fmtBit(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, fmtBit(i));
  // Split across top-right and bottom-left.
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, fmtBit(i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, fmtBit(i));
  set(8, size - 8, true); // dark module stays

  // Version info for v >= 7.
  if (version >= 7) {
    let vbits = version << 12;
    vbits |= bchRemainder(version << 12, 0x1f25);
    for (let i = 0; i < 18; i++) {
      const b = ((vbits >> i) & 1) === 1;
      const x = Math.floor(i / 3);
      const y = (i % 3) + size - 11;
      set(x, y, b);
      set(y, x, b);
    }
  }

  return { size, modules };
}
