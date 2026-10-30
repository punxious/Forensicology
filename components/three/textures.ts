/**
 * Procedural canvas textures, so the scenes need no image downloads.
 * Each texture is generated once and cached by key.
 */
import * as THREE from "three";

const cache = new Map<string, THREE.CanvasTexture>();

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

function make(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...repeat);
  }
  cache.set(key, tex);
  return tex;
}

export const FONT_STAMP = '"Special Elite", "Courier Prime", monospace';
export const FONT_MONO = '"Courier Prime", "Courier New", monospace';

export function woodTexture() {
  return make("wood", 1024, 512, (ctx, w, h) => {
    const r = rng(7);
    ctx.fillStyle = "#3a2618";
    ctx.fillRect(0, 0, w, h);
    const planks = 4;
    for (let p = 0; p < planks; p++) {
      const y0 = (p * h) / planks;
      const tone = 0.85 + r() * 0.3;
      ctx.fillStyle = `rgba(${Math.round(70 * tone)},${Math.round(45 * tone)},${Math.round(28 * tone)},1)`;
      ctx.fillRect(0, y0, w, h / planks);
      for (let i = 0; i < 70; i++) {
        ctx.strokeStyle = `rgba(20,10,4,${0.08 + r() * 0.18})`;
        ctx.lineWidth = 0.6 + r() * 1.6;
        ctx.beginPath();
        const y = y0 + r() * (h / planks);
        ctx.moveTo(0, y);
        for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x / (60 + r() * 80) + i) * 3);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, y0, w, 2);
    }
  });
}

export function corkTexture() {
  return make(
    "cork",
    512,
    512,
    (ctx, w, h) => {
      const r = rng(3);
      ctx.fillStyle = "#a87b47";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) {
        const d = r();
        ctx.fillStyle = d > 0.5 ? `rgba(70,40,15,${r() * 0.35})` : `rgba(230,190,130,${r() * 0.3})`;
        ctx.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
      }
    },
    [2, 2],
  );
}

export function wallTexture() {
  return make(
    "wall",
    512,
    512,
    (ctx, w, h) => {
      const r = rng(11);
      ctx.fillStyle = "#1c2420";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 5000; i++) {
        ctx.fillStyle = `rgba(255,255,255,${r() * 0.03})`;
        ctx.fillRect(r() * w, r() * h, 2, 2);
      }
      // Tiled lower wall.
      for (let y = h * 0.55; y < h; y += 32)
        for (let x = 0; x < w; x += 64) {
          ctx.strokeStyle = "rgba(0,0,0,0.35)";
          ctx.strokeRect(x + ((y / 32) % 2) * 32, y, 64, 32);
        }
    },
    [3, 1],
  );
}

export function floorTexture() {
  return make(
    "floor",
    512,
    512,
    (ctx, w, h) => {
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) {
          ctx.fillStyle = (x + y) % 2 ? "#15171b" : "#1d2026";
          ctx.fillRect((x * w) / 8, (y * h) / 8, w / 8, h / 8);
        }
    },
    [6, 6],
  );
}

/** A typed sheet of paper: header, lines of "type", optional stamp. */
export function paperTexture(seed: number, opts: { title?: string; stamp?: string; tint?: string } = {}) {
  return make(`paper-${seed}-${opts.title}-${opts.stamp}-${opts.tint}`, 512, 680, (ctx, w, h) => {
    const r = rng(seed + 1);
    ctx.fillStyle = opts.tint ?? "#f2ead6";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(120,100,60,0.08)";
    for (let i = 0; i < 400; i++) ctx.fillRect(r() * w, r() * h, 3, 3);
    let y = 70;
    if (opts.title) {
      ctx.fillStyle = "#2a251c";
      ctx.font = `34px ${FONT_STAMP}`;
      ctx.fillText(opts.title, 44, y);
      y += 40;
    }
    ctx.fillStyle = "rgba(40,34,26,0.55)";
    for (; y < h - 60; y += 26) {
      if (r() < 0.12) continue;
      ctx.fillRect(44, y, (w - 100) * (0.45 + r() * 0.55), 8);
    }
    if (opts.stamp) stamp(ctx, opts.stamp, w * 0.62, h * 0.82, -0.18, "#a3271c");
  });
}

function stamp(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, rot: number, color: string, size = 40) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `${size}px ${FONT_STAMP}`;
  const tw = ctx.measureText(text).width;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 4;
  ctx.strokeRect(-tw / 2 - 14, -size * 0.9, tw + 28, size * 1.3);
  ctx.textAlign = "center";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Manila folder face with a typed label. */
export function folderTexture(label: string, sub?: string, stampText?: string) {
  return make(`folder-${label}-${sub}-${stampText}`, 768, 512, (ctx, w, h) => {
    const r = rng(label.length * 31);
    ctx.fillStyle = "#d4b679";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1200; i++) {
      ctx.fillStyle = `rgba(110,80,30,${r() * 0.08})`;
      ctx.fillRect(r() * w, r() * h, 4, 2);
    }
    ctx.fillStyle = "#f6efdc";
    ctx.fillRect(60, 60, w - 220, 110);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.strokeRect(60, 60, w - 220, 110);
    ctx.fillStyle = "#231f18";
    ctx.font = `44px ${FONT_STAMP}`;
    ctx.fillText(label.slice(0, 24), 80, 118);
    if (sub) {
      ctx.font = `26px ${FONT_MONO}`;
      ctx.fillText(sub, 80, 156);
    }
    if (stampText) stamp(ctx, stampText, w * 0.66, h * 0.72, -0.12, "#a3271c", 52);
  });
}

/** Side label of a cardboard archive box. */
export function caseBoxTexture(title: string, sub: string, classified = false) {
  return make(`box-${title}-${sub}-${classified}`, 768, 512, (ctx, w, h) => {
    const r = rng(title.length * 13 + 5);
    ctx.fillStyle = "#9b7a4c";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = `rgba(60,40,15,${r() * 0.12})`;
      ctx.fillRect(r() * w, r() * h, 6, 1);
    }
    // hand hole
    ctx.fillStyle = "#2b1d0e";
    ctx.beginPath();
    ctx.ellipse(w / 2, 70, 90, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    // label
    ctx.fillStyle = "#f3ecd8";
    ctx.fillRect(110, 170, w - 220, 230);
    ctx.fillStyle = "#231f18";
    ctx.textAlign = "center";
    if (classified) {
      ctx.font = `56px ${FONT_STAMP}`;
      ctx.fillText("CLASSIFIED", w / 2, 300);
      ctx.font = `26px ${FONT_MONO}`;
      ctx.fillText(sub, w / 2, 350);
    } else {
      const words = title.toUpperCase().split(" ");
      const lines: string[] = [];
      let line = "";
      ctx.font = `50px ${FONT_STAMP}`;
      for (const word of words) {
        const t = line ? `${line} ${word}` : word;
        if (ctx.measureText(t).width > w - 270 && line) {
          lines.push(line);
          line = word;
        } else line = t;
      }
      lines.push(line);
      lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, w / 2, 250 + i * 58));
      ctx.font = `26px ${FONT_MONO}`;
      ctx.fillText(sub, w / 2, 375);
    }
  });
}

/** A ten-print style card with whorls, for the light box and landing scene. */
export function fingerprintTexture(seed = 1) {
  return make(`fp-${seed}`, 512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#26231e";
    ctx.lineWidth = 3;
    const cx = w / 2 + (seed % 3) * 8;
    const cy = h / 2;
    for (let i = 1; i < 26; i++) {
      ctx.beginPath();
      const rr = i * 8.5;
      ctx.ellipse(cx, cy + i * 1.5, rr * 0.8, rr, 0, Math.PI * (0.05 + (i % 4) * 0.02), Math.PI * (1.95 - (i % 3) * 0.03));
      ctx.stroke();
    }
  });
}

/** Keypad face for the lockbox. */
export function keypadTexture() {
  return make("keypad", 256, 320, (ctx, w, h) => {
    ctx.fillStyle = "#1a1c20";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#0f1a12";
    ctx.fillRect(24, 20, w - 48, 50);
    ctx.fillStyle = "#8dffb0";
    ctx.font = `30px ${FONT_MONO}`;
    ctx.fillText("_ _ _ _", 60, 55);
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
    keys.forEach((k, i) => {
      const x = 30 + (i % 3) * 68;
      const y = 92 + Math.floor(i / 3) * 56;
      ctx.fillStyle = "#3a3d44";
      ctx.fillRect(x, y, 56, 44);
      ctx.fillStyle = "#e8e4da";
      ctx.font = `26px ${FONT_MONO}`;
      ctx.fillText(k, x + 20, y + 31);
    });
  });
}

/** Yellow-and-black evidence tape. */
export function tapeTexture() {
  return make(
    "tape",
    512,
    64,
    (ctx, w, h) => {
      ctx.fillStyle = "#e8c21a";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#151515";
      ctx.font = `bold 34px ${FONT_MONO}`;
      ctx.fillText("SEALED · EVIDENCE · SEALED ·", 8, 44);
    },
    [1, 1],
  );
}

/** Index cards and a clock face for the timeline wall. */
export function timelineTexture() {
  return make("timeline", 1024, 384, (ctx, w, h) => {
    ctx.fillStyle = "#e9e3d3";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#2b2a26";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(30, h / 2);
    ctx.lineTo(w - 30, h / 2);
    ctx.stroke();
    const r = rng(5);
    for (let i = 0; i < 7; i++) {
      const x = 50 + i * 138;
      const up = i % 2 === 0;
      ctx.fillStyle = "#fffdf4";
      ctx.fillRect(x, up ? 30 : h / 2 + 24, 118, 120);
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.strokeRect(x, up ? 30 : h / 2 + 24, 118, 120);
      ctx.fillStyle = "#a3271c";
      ctx.fillRect(x + 54, up ? 150 : h / 2, 6, 24);
      ctx.fillStyle = "rgba(30,30,30,0.6)";
      ctx.font = `20px ${FONT_MONO}`;
      ctx.fillText(`${(15 + i / 2) | 0}:${String((i * 17) % 60).padStart(2, "0")}`, x + 12, (up ? 30 : h / 2 + 24) + 32);
      for (let l = 0; l < 4; l++) ctx.fillRect(x + 12, (up ? 30 : h / 2 + 24) + 52 + l * 16, 60 + r() * 34, 6);
    }
  });
}
