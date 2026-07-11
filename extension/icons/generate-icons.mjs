import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const sizes = [16, 48, 128];
const SAMPLES = 4;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

const distanceToSegment = (x, y, x1, y1, x2, y2) => {
  const dx = x2 - x1; const dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
};

const quadratic = (t, p0, p1, p2) => [
  (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
  (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1],
];

function buildIcon(size) {
  const scale = 200 / size;
  const pixels = Buffer.alloc(size * size * 4);
  const paint = (x, y) => {
    const color = [0, 0, 0, 0];
    const over = (r, g, b, a = 255) => {
      const opacity = a / 255; const existing = color[3] / 255;
      const combined = opacity + existing * (1 - opacity);
      color[0] = Math.round((r * opacity + color[0] * existing * (1 - opacity)) / combined);
      color[1] = Math.round((g * opacity + color[1] * existing * (1 - opacity)) / combined);
      color[2] = Math.round((b * opacity + color[2] * existing * (1 - opacity)) / combined);
      color[3] = Math.round(combined * 255);
    };
    const rounded = x >= 6 && x <= 194 && y >= 6 && y <= 194 &&
      Math.hypot(Math.max(50 - x, 0, x - 150), Math.max(50 - y, 0, y - 150)) <= 44;
    if (rounded) { const t = (x + y - 12) / 376; over(43 * (1 - t) + 27 * t, 16 * (1 - t) + 42 * t, 85 * (1 - t) + 74 * t); }
    const stroke = (x1, y1, x2, y2, width, rgb) => { if (distanceToSegment(x, y, x1, y1, x2, y2) <= width / 2) over(...rgb); };
    // sparkle, approximated from the source SVG's four curved points
    const sparkle = [[166, 20], [169, 29], [171, 31], [180, 34], [171, 37], [169, 39], [166, 48], [163, 39], [161, 37], [152, 34], [161, 31], [163, 29]];
    let inside = false;
    for (let i = 0, j = sparkle.length - 1; i < sparkle.length; j = i++) {
      const [xi, yi] = sparkle[i]; const [xj, yj] = sparkle[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) over(245, 243, 255);
    stroke(45, 52, 85, 44, 7, [245, 243, 255]);
    stroke(78, 68, 48, 96, 9, [245, 243, 255]); stroke(48, 96, 78, 124, 9, [245, 243, 255]);
    stroke(122, 68, 152, 96, 9, [245, 243, 255]); stroke(152, 96, 122, 124, 9, [245, 243, 255]);
    const ring = Math.hypot(x - 137, y - 96); if (ring >= 35.5 && ring <= 40.5) over(251, 191, 36);
    const tail = []; for (let i = 0; i <= 16; i += 1) tail.push(quadratic(i / 16, [164, 123], [178, 140], [158, 152]));
    for (let i = 1; i < tail.length; i += 1) stroke(...tail[i - 1], ...tail[i], 4, [251, 191, 36]);
    if (Math.hypot(x - 158, y - 152) <= 4) over(251, 191, 36);
    const smile = []; for (let i = 0; i <= 24; i += 1) smile.push(quadratic(i / 24, [68, 150], [104, 168], [140, 144]));
    for (let i = 1; i < smile.length; i += 1) stroke(...smile[i - 1], ...smile[i], 9, [52, 211, 153]);
    return color;
  };
  for (let py = 0; py < size; py += 1) for (let px = 0; px < size; px += 1) {
    const sum = [0, 0, 0, 0];
    for (let sy = 0; sy < SAMPLES; sy += 1) for (let sx = 0; sx < SAMPLES; sx += 1) {
      const sample = paint((px + (sx + 0.5) / SAMPLES) * scale, (py + (sy + 0.5) / SAMPLES) * scale);
      for (let channel = 0; channel < 4; channel += 1) sum[channel] += sample[channel];
    }
    const index = (py * size + px) * 4;
    for (let channel = 0; channel < 4; channel += 1) pixels[index + channel] = Math.round(sum[channel] / (SAMPLES * SAMPLES));
  }
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let row = 0; row < size; row += 1) { raw[row * (size * 4 + 1)] = 0; pixels.copy(raw, row * (size * 4 + 1) + 1, row * size * 4, (row + 1) * size * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', Buffer.from([0, 0, 0, size, 0, 0, 0, size, 8, 6, 0, 0, 0])), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

for (const size of sizes) writeFileSync(new URL(`logo-${size}.png`, import.meta.url), buildIcon(size));
