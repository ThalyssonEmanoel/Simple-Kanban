/**
 * Generates PWA icon PNGs (192x192 and 512x512) using only Node.js built-in modules.
 * Creates a green background with a white "K" letter matching the app's theme.
 * Run: node scripts/generate-pwa-icons.js
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function createPNG(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = createChunk("IHDR", ihdrData);

  // IDAT - raw image data with filter bytes
  const rawData = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 3)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 3;
      const dstIdx = y * (1 + width * 3) + 1 + x * 3;
      rawData[dstIdx] = pixels[srcIdx];
      rawData[dstIdx + 1] = pixels[srcIdx + 1];
      rawData[dstIdx + 2] = pixels[srcIdx + 2];
    }
  }
  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk("IDAT", compressed);

  // IEND
  const iend = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 for PNG chunks
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 3);

  const bgR = 0x27, bgG = 0x5f, bgB = 0x30; // #275F30
  const fgR = 0xff, fgG = 0xff, fgB = 0xff; // white

  // Fill background
  for (let i = 0; i < size * size; i++) {
    pixels[i * 3] = bgR;
    pixels[i * 3 + 1] = bgG;
    pixels[i * 3 + 2] = bgB;
  }

  // Draw rounded rectangle background (subtle rounded corners)
  const radius = Math.floor(size * 0.15);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inside = true;
      // Check corners
      if (x < radius && y < radius) {
        inside = (radius - x) ** 2 + (radius - y) ** 2 <= radius ** 2;
      } else if (x >= size - radius && y < radius) {
        inside = (x - (size - radius - 1)) ** 2 + (radius - y) ** 2 <= radius ** 2;
      } else if (x < radius && y >= size - radius) {
        inside = (radius - x) ** 2 + (y - (size - radius - 1)) ** 2 <= radius ** 2;
      } else if (x >= size - radius && y >= size - radius) {
        inside = (x - (size - radius - 1)) ** 2 + (y - (size - radius - 1)) ** 2 <= radius ** 2;
      }
      if (!inside) {
        pixels[(y * size + x) * 3] = bgR;
        pixels[(y * size + x) * 3 + 1] = bgG;
        pixels[(y * size + x) * 3 + 2] = bgB;
      }
    }
  }

  // Draw "K" letter
  const margin = Math.floor(size * 0.22);
  const strokeW = Math.max(Math.floor(size * 0.12), 2);

  // Vertical bar of K
  const barX = margin;
  const barTop = margin;
  const barBottom = size - margin;
  for (let y = barTop; y < barBottom; y++) {
    for (let dx = 0; dx < strokeW; dx++) {
      const x = barX + dx;
      if (x >= 0 && x < size && y >= 0 && y < size) {
        pixels[(y * size + x) * 3] = fgR;
        pixels[(y * size + x) * 3 + 1] = fgG;
        pixels[(y * size + x) * 3 + 2] = fgB;
      }
    }
  }

  // Diagonal arms of K
  const midY = Math.floor(size / 2);
  const armStartX = barX + strokeW;
  const armEndX = size - margin;

  for (let i = 0; i <= armEndX - armStartX; i++) {
    const x = armStartX + i;
    // Upper arm (goes from middle to top-right)
    const yUp = midY - Math.floor((i / (armEndX - armStartX)) * (midY - margin));
    // Lower arm (goes from middle to bottom-right)
    const yDown = midY + Math.floor((i / (armEndX - armStartX)) * (barBottom - midY));

    for (let dy = -Math.floor(strokeW / 2); dy < Math.ceil(strokeW / 2); dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const px = x + dx;
        const pyUp = yUp + dy;
        const pyDown = yDown + dy;
        if (px >= 0 && px < size) {
          if (pyUp >= 0 && pyUp < size) {
            pixels[(pyUp * size + px) * 3] = fgR;
            pixels[(pyUp * size + px) * 3 + 1] = fgG;
            pixels[(pyUp * size + px) * 3 + 2] = fgB;
          }
          if (pyDown >= 0 && pyDown < size) {
            pixels[(pyDown * size + px) * 3] = fgR;
            pixels[(pyDown * size + px) * 3 + 1] = fgG;
            pixels[(pyDown * size + px) * 3 + 2] = fgB;
          }
        }
      }
    }
  }

  return pixels;
}

const publicDir = path.join(__dirname, "..", "public");

const sizes = [192, 512];
for (const size of sizes) {
  const pixels = drawIcon(size);
  const png = createPNG(size, size, pixels);
  const filePath = path.join(publicDir, `icon-${size}x${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Created ${filePath} (${png.length} bytes)`);
}

// Also create apple-touch-icon (180x180)
const applePixels = drawIcon(180);
const applePng = createPNG(180, 180, applePixels);
const applePath = path.join(publicDir, "apple-touch-icon.png");
fs.writeFileSync(applePath, applePng);
console.log(`Created ${applePath} (${applePng.length} bytes)`);

console.log("\nPWA icons generated successfully!");
