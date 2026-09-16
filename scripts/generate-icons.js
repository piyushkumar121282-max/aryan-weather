import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function createPng(width, height, drawFn) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  const rawScanlines = [];
  for (let y = 0; y < height; y++) {
    const line = Buffer.alloc(1 + width * 4);
    line[0] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const offset = 1 + x * 4;
      line[offset] = r;
      line[offset + 1] = g;
      line[offset + 2] = b;
      line[offset + 3] = a;
    }
    rawScanlines.push(line);
  }

  const rawBuffer = Buffer.concat(rawScanlines);
  const compressed = zlib.deflateSync(rawBuffer);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function drawWeatherIcon(x, y, width, height, isMaskable = false) {
  const cx = width / 2;
  const cy = height / 2;
  const r = (width / 2) * (isMaskable ? 0.95 : 0.85);

  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background dark circular squircle
  if (dist > r && !isMaskable) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Base dark background: pure black with deep indigo/cyan gradient
  const bgGrad = (y / height);
  let rBase = Math.floor(10 + bgGrad * 12);
  let gBase = Math.floor(12 + bgGrad * 18);
  let bBase = Math.floor(20 + bgGrad * 35);

  // Draw Sun at top-right
  const sunX = cx + width * 0.12;
  const sunY = cy - height * 0.12;
  const sunR = width * 0.22;
  const dSun = Math.sqrt((x - sunX) * (x - sunX) + (y - sunY) * (y - sunY));

  if (dSun <= sunR) {
    // Warm golden amber sun
    const glow = 1 - (dSun / sunR);
    return [
      Math.floor(255),
      Math.floor(180 + glow * 50),
      Math.floor(50 + glow * 40),
      255
    ];
  }

  // Draw Cloud
  // Main cloud body: 3 overlapping circles + base
  const cloud1X = cx - width * 0.15;
  const cloud1Y = cy + height * 0.08;
  const cloud1R = width * 0.18;

  const cloud2X = cx + width * 0.08;
  const cloud2Y = cy + height * 0.05;
  const cloud2R = width * 0.22;

  const cloud3X = cx - width * 0.02;
  const cloud3Y = cy - height * 0.02;
  const cloud3R = width * 0.20;

  const d1 = Math.sqrt((x - cloud1X) * (x - cloud1X) + (y - cloud1Y) * (y - cloud1Y));
  const d2 = Math.sqrt((x - cloud2X) * (x - cloud2X) + (y - cloud2Y) * (y - cloud2Y));
  const d3 = Math.sqrt((x - cloud3X) * (x - cloud3X) + (y - cloud3Y) * (y - cloud3Y));

  const inCloudBase = (y >= cy + height * 0.02 && y <= cy + height * 0.22 && x >= cx - width * 0.28 && x <= cx + width * 0.26);

  if (d1 <= cloud1R || d2 <= cloud2R || d3 <= cloud3R || inCloudBase) {
    // Elegant bright white to soft cyan cloud
    const cloudShade = Math.min(255, Math.floor(230 + (y / height) * 25));
    return [cloudShade - 10, cloudShade, 255, 255];
  }

  // Draw subtle rain accents below cloud
  if (y > cy + height * 0.24 && y < cy + height * 0.35) {
    const rainX1 = cx - width * 0.12;
    const rainX2 = cx;
    const rainX3 = cx + width * 0.12;
    if (Math.abs(x - rainX1) < 2 || Math.abs(x - rainX2) < 2 || Math.abs(x - rainX3) < 2) {
      return [56, 189, 248, 220]; // Light sky blue
    }
  }

  return [rBase, gBase, bBase, 255];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 180x180 apple-touch-icon
const appleIcon = createPng(180, 180, (x, y, w, h) => drawWeatherIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

// Generate 192x192 PWA icon
const pwa192 = createPng(192, 192, (x, y, w, h) => drawWeatherIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);

// Generate 512x512 PWA icon
const pwa512 = createPng(512, 512, (x, y, w, h) => drawWeatherIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);

// Generate 512x512 maskable icon
const pwaMaskable = createPng(512, 512, (x, y, w, h) => drawWeatherIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);

console.log('Successfully generated all PWA icons in /public!');
