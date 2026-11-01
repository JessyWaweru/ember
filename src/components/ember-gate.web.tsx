import { useEffect, useRef } from 'react';

// The gate before the app: an ember itching to burn. Tap the button and it's thrown into the page, which catches
// fire from the ember outwards and burns away to reveal the app underneath.
//
// Drawn on a canvas, no assets: the page is rendered to an offscreen canvas each frame, then eaten by a burn front
// shaped by fractal noise. The burn works on a coarse grid (one cell per CELL px) that is upscaled smoothly, so a
// phone does ~20k cells a frame instead of millions of pixels. On top: a white-hot edge, scorched paper just ahead
// of it, flame tongues licking up from it, and sparks.

const CELL = 6; // css px per burn cell
const EDGE = 0.035; // width of the glowing burn front, in field units
const CHAR = 0.07; // width of the scorched band ahead of it
const THROW_MS = 450; // ember flares before the page catches
const BURN_MS = 2000;
const BG = '#0B0B0D';
const FONT = "ui-rounded, 'SF Pro Rounded', -apple-system, system-ui, sans-serif";

// ── value noise ──
function makeNoise(seed: number) {
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const rnd = (x: number, y: number) => perm[(perm[x & 255] + y) & 511] / 255;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const u = smooth(x - xi);
    const v = smooth(y - yi);
    const a = rnd(xi, yi);
    const b = rnd(xi + 1, yi);
    const c = rnd(xi, yi + 1);
    const d = rnd(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  // Fractal: big lobes plus ragged detail, roughly 0–1.
  return (x: number, y: number) => value(x, y) * 0.55 + value(x * 2.1, y * 2.1) * 0.28 + value(x * 4.3, y * 4.3) * 0.17;
}

/** A soft round glow, pre-rendered once and stamped for flames and sparks. */
function sprite(inner: string, outer: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, outer);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; flame: boolean };

export function EmberGate({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trigger = useRef<() => void>(() => {});
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    let w = 0;
    let h = 0;

    // Offscreen layers: the page itself, and the coarse burn layers (mask, char, glow).
    const page = document.createElement('canvas');
    const pctx = page.getContext('2d')!;
    const mask = document.createElement('canvas');
    const char = document.createElement('canvas');
    const glow = document.createElement('canvas');
    let cols = 0;
    let rows = 0;
    let field = new Float32Array(0);
    let maskData: ImageData;
    let charData: ImageData;
    let glowData: ImageData;
    const noise = makeNoise(Math.floor(Math.random() * 1e6) + 1);
    const flameSprite = sprite('rgba(255,200,90,0.9)', 'rgba(255,90,20,0.35)');
    const sparkSprite = sprite('rgba(255,250,220,1)', 'rgba(255,170,60,0.6)');

    const ember = () => ({ x: w / 2, y: h * 0.38, r: Math.min(w, h) * 0.085 });
    const button = () => {
      const bw = Math.min(w - 48, 340);
      return { x: (w - bw) / 2, y: h * 0.76, w: bw, h: 58 };
    };

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      for (const c of [canvas, page]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      cols = Math.ceil(w / CELL) + 1;
      rows = Math.ceil(h / CELL) + 1;
      for (const c of [mask, char, glow]) {
        c.width = cols;
        c.height = rows;
      }
      maskData = mask.getContext('2d')!.createImageData(cols, rows);
      charData = char.getContext('2d')!.createImageData(cols, rows);
      glowData = glow.getContext('2d')!.createImageData(cols, rows);
      // Burn order: distance from the ember, roughened by noise, normalised to about 0–1.
      const e = ember();
      const far = Math.max(Math.hypot(e.x, e.y), Math.hypot(w - e.x, e.y), Math.hypot(e.x, h - e.y), Math.hypot(w - e.x, h - e.y));
      field = new Float32Array(cols * rows);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const d = Math.hypot(x * CELL - e.x, y * CELL - e.y) / far;
          field[y * cols + x] = d * 0.72 + noise(x * 0.045, y * 0.045) * 0.3;
        }
      }
    }
    resize();
    window.addEventListener('resize', resize);

    // ── the page ──
    function spaced(g: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
      const widths = [...text].map((ch) => g.measureText(ch).width);
      let cx = x - (widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1)) / 2;
      [...text].forEach((ch, i) => {
        g.fillText(ch, cx + widths[i] / 2, y);
        cx += widths[i] + spacing;
      });
    }

    function drawPage(g: CanvasRenderingContext2D, t: number, flare: number) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      g.fillStyle = BG;
      g.fillRect(0, 0, w, h);

      const e = ember();
      const flick = 0.88 + 0.08 * Math.sin(t * 7.1) + 0.04 * Math.sin(t * 13.7 + 1.3);
      const r = e.r * (1 + flare * 0.7) * (0.97 + 0.03 * Math.sin(t * 9.3));

      // warm room glow
      const room = g.createRadialGradient(e.x, e.y, 0, e.x, e.y, Math.max(w, h) * 0.75);
      room.addColorStop(0, `rgba(255,107,44,${(0.2 + flare * 0.35) * flick})`);
      room.addColorStop(0.5, `rgba(120,30,8,${0.08 * flick})`);
      room.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = room;
      g.fillRect(0, 0, w, h);

      // ember: halo, then a hot core
      g.globalCompositeOperation = 'lighter';
      const halo = g.createRadialGradient(e.x, e.y, r * 0.3, e.x, e.y, r * 3.2);
      halo.addColorStop(0, `rgba(255,120,40,${0.55 * flick})`);
      halo.addColorStop(1, 'rgba(255,60,10,0)');
      g.fillStyle = halo;
      g.beginPath();
      g.arc(e.x, e.y, r * 3.2, 0, Math.PI * 2);
      g.fill();
      g.globalCompositeOperation = 'source-over';
      const core = g.createRadialGradient(e.x, e.y - r * 0.15, 0, e.x, e.y, r);
      core.addColorStop(0, '#FFF6D5');
      core.addColorStop(0.3, '#FFC15E');
      core.addColorStop(0.65, '#FF6B2C');
      core.addColorStop(1, '#9A2A08');
      g.fillStyle = core;
      g.beginPath();
      g.arc(e.x, e.y, r, 0, Math.PI * 2);
      g.fill();

      // words fade as the ember flares
      g.globalAlpha = 1 - flare;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#FF6B2C';
      g.font = `800 13px ${FONT}`;
      spaced(g, 'EMBER', w / 2, h * 0.56, 6);
      g.fillStyle = '#F5F5F7';
      g.font = `800 ${Math.min(32, w * 0.08)}px ${FONT}`;
      g.fillText('It’s itching to burn.', w / 2, h * 0.61);
      g.fillStyle = '#9A9AA3';
      g.font = `500 15px ${FONT}`;
      g.fillText('Everything you track is fuel.', w / 2, h * 0.655);

      const b = button();
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      g.shadowColor = 'rgba(255,107,44,0.7)';
      g.shadowBlur = 18 + pulse * 14;
      const fill = g.createLinearGradient(b.x, 0, b.x + b.w, 0);
      fill.addColorStop(0, '#FF6B2C');
      fill.addColorStop(1, '#FF9A3C');
      g.fillStyle = fill;
      g.beginPath();
      g.roundRect(b.x, b.y, b.w, b.h, b.h / 2);
      g.fill();
      g.shadowBlur = 0;
      g.fillStyle = '#0B0B0D';
      g.font = `800 16px ${FONT}`;
      g.fillText('Throw the ember into the fire 🔥', w / 2, b.y + b.h / 2 + 1);
      g.globalAlpha = 1;
    }

    // ── particles ──
    const parts: Particle[] = [];
    const spawn = (x: number, y: number, flame: boolean, burst = 1) => {
      if (parts.length > 700) return;
      const a = Math.random() * Math.PI * 2;
      const sp = flame ? 20 + Math.random() * 30 : (40 + Math.random() * 160) * burst;
      const max = flame ? 0.35 + Math.random() * 0.35 : 0.6 + Math.random() * 0.9;
      parts.push({
        x, y,
        vx: flame ? (Math.random() - 0.5) * 30 : Math.cos(a) * sp,
        vy: flame ? -60 - Math.random() * 60 : Math.sin(a) * sp - 40,
        life: max, max,
        size: flame ? 18 + Math.random() * 26 : 2 + Math.random() * 3,
        flame,
      });
    };

    // ── loop ──
    let raf = 0;
    let last = performance.now();
    const start = last;
    let thrownAt: number | null = null;
    let finished = false;

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - start) / 1000;
      const since = thrownAt === null ? -1 : now - thrownAt;
      const flare = since < 0 ? 0 : Math.min(1, since / THROW_MS);
      // Burn threshold sweeps past the whole field: catches gently, then spreads at a steady pace.
      const p = since < THROW_MS ? -1 : Math.min(1, (since - THROW_MS) / BURN_MS);
      const burn = p < 0 ? -1 : -0.05 + 1.15 * (0.3 * p * p + 0.7 * p);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (burn < 0) {
        drawPage(ctx, t, flare);
        // idle sparks drifting off the ember
        const e = ember();
        if (Math.random() < 0.25 + flare) {
          spawn(e.x + (Math.random() - 0.5) * e.r, e.y - e.r * 0.5, false, 0.3);
        }
      } else {
        drawPage(pctx, t, 1);
        const m = maskData.data;
        const c = charData.data;
        const gl = glowData.data;
        for (let i = 0; i < field.length; i++) {
          const d = field[i] - burn;
          const o = i * 4;
          // page alpha: gone behind the front, solid ahead of it
          m[o + 3] = d <= -EDGE ? 0 : d >= 0 ? 255 : 255 * ((d + EDGE) / EDGE) ** 2;
          // scorch: brown-black, strongest right at the front
          const ch = d > 0 && d < CHAR ? 1 - d / CHAR : 0;
          c[o] = 26;
          c[o + 1] = 9;
          c[o + 2] = 3;
          c[o + 3] = 235 * ch * ch;
          // white-hot edge fading to orange
          const gi = Math.max(0, 1 - Math.abs(d + EDGE * 0.35) / (EDGE * 1.1));
          gl[o] = 255;
          gl[o + 1] = 70 + 180 * gi;
          gl[o + 2] = 10 + 170 * gi * gi * gi;
          gl[o + 3] = 255 * gi;
          if (gi > 0.35 && Math.random() < 0.006) {
            const x = (i % cols) * CELL;
            const y = Math.floor(i / cols) * CELL;
            spawn(x, y, Math.random() < 0.55);
          }
        }
        mask.getContext('2d')!.putImageData(maskData, 0, 0);
        char.getContext('2d')!.putImageData(charData, 0, 0);
        glow.getContext('2d')!.putImageData(glowData, 0, 0);

        pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        pctx.imageSmoothingEnabled = true;
        pctx.imageSmoothingQuality = 'high';
        pctx.drawImage(char, 0, 0, cols * CELL, rows * CELL);
        pctx.globalCompositeOperation = 'destination-in';
        pctx.drawImage(mask, 0, 0, cols * CELL, rows * CELL);
        pctx.globalCompositeOperation = 'source-over';

        // a short shake as it catches
        const shake = since - THROW_MS < 260 ? (1 - (since - THROW_MS) / 260) * 7 : 0;
        ctx.setTransform(1, 0, 0, 1, (Math.random() - 0.5) * shake * dpr, (Math.random() - 0.5) * shake * dpr);
        ctx.drawImage(page, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = 'lighter';
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(glow, 0, 0, cols * CELL, rows * CELL);
        ctx.globalAlpha = 0.6;
        ctx.drawImage(glow, -CELL, -CELL, (cols + 2) * CELL, (rows + 2) * CELL); // soft bloom
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      // particles on top
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.life -= dt;
        if (q.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        q.vy -= (q.flame ? 90 : 70) * dt;
        q.vx += (Math.random() - 0.5) * 60 * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        const k = q.life / q.max;
        const s = q.flame ? q.size * (0.6 + 0.4 * k) : q.size * (0.5 + k);
        ctx.globalAlpha = q.flame ? 0.35 * k : k;
        ctx.drawImage(q.flame ? flameSprite : sparkSprite, q.x - s, q.y - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      if (p >= 1 && parts.length === 0 && !finished) {
        finished = true;
        doneRef.current();
        return;
      }
      // past the end, let the last sparks drift a moment, then go
      if (p >= 1 && since > THROW_MS + BURN_MS + 900 && !finished) {
        finished = true;
        doneRef.current();
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    trigger.current = () => {
      if (thrownAt !== null) return;
      if (reduceMotion) {
        finished = true;
        doneRef.current();
        return;
      }
      thrownAt = performance.now();
      const e = ember();
      for (let i = 0; i < 90; i++) spawn(e.x, e.y, false, 1.6);
    };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      onPointerDown={(e) => {
        // The drawn button (with generous slop) or the ember itself throws it.
        const y = e.clientY / window.innerHeight;
        if (y > 0.7 || Math.abs(y - 0.38) < 0.1) trigger.current();
      }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, touchAction: 'none', cursor: 'pointer' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
