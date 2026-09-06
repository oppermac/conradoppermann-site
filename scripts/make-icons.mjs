/* Generates the hub's PWA icons from an inline SVG: four domain arcs on a dark ground. */
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const OUT = new URL("../public/hub/icons/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const COLORS = ["#4A8FF2", "#30D158", "#FF6FB5", "#FF9F0A"]; // Work, Body, Relationships, Aliveness

function arc(cx, cy, r, startDeg, endDeg) {
  const toXY = (deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const [x1, y1] = toXY(startDeg);
  const [x2, y2] = toXY(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function iconSvg(size, { padding, bg = "#0a0a0a", stroke = null }) {
  const c = size / 2;
  const r = size * (0.5 - padding);
  const w = size * 0.085;
  const gap = 22;
  const arcs = COLORS.map((color, i) => {
    const start = i * 90 + gap / 2;
    const end = (i + 1) * 90 - gap / 2;
    return `<path d="${arc(c, c, r, start, end)}" fill="none" stroke="${stroke ?? color}" stroke-width="${w}" stroke-linecap="round"/>`;
  }).join("");
  const ground = bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${ground}${arcs}</svg>`;
}

async function render(name, size, opts) {
  await sharp(Buffer.from(iconSvg(size, opts))).png().toFile(`${OUT}${name}`);
  console.log("wrote", name);
}

await render("icon-192.png", 192, { padding: 0.22 });
await render("icon-512.png", 512, { padding: 0.22 });
await render("icon-512-maskable.png", 512, { padding: 0.3 });
await render("apple-touch-icon.png", 180, { padding: 0.22 });
await render("badge-72.png", 72, { padding: 0.18, bg: null, stroke: "#ffffff" });
