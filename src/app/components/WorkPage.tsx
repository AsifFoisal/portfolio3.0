"use client";

/**
 * app/page.tsx  (Next.js App Router)
 *
 * Install:  npm i three gsap lenis   &&   npm i -D @types/three
 * Assets:   put logo-dim.png and logo-fill.png in /public
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import {
  BehanceIcon,
  CloseIcon,
  GrokIcon,
  InstagramIcon,
  LinkedInIcon,
  OpenAIIcon,
  PerplexityIcon,
  WhatsApp3DIcon,
} from "./Icons";
import { useSiteContent } from "../data/content-context";
import { downloadResume } from "../utils/downloadResume";
import SiteFooter from "./SiteFooter";
import { HamburgerIcon } from "./Icons";
import TargetCursor from "./TargetCursor";
import type { WorkProject } from "../data/content-types";
import {
  deliverySrcSet,
  isCloudinaryDeliveryUrl,
  resizedDeliveryUrl,
} from "@/lib/cloudinary-url";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

/**
 * Delivery widths per usage. Cards render at 35–46vw (92vw on phones) and hero
 * thumbnails at 3–10vw, so shipping one 2400px render to every viewport wastes
 * bandwidth and delays the first paint that actually matters.
 */
const CARD_WIDTHS = [640, 960, 1280, 1600, 2000] as const;
const CARD_MAX_WIDTH = 1600;
const HERO_THUMB_WIDTH = 900;

type Align = "l" | "r" | "c";
type ArtKey = keyof typeof ART;

interface Project {
  title: string;
  desc: string;
  art: ArtKey;
  image: string;
  url: string;
  align: Align;
  width: number;
}

const LAY: [Align, number][] = [["l", 40.6], ["r", 35.4], ["l", 40.6], ["c", 45.6], ["r", 40.7], ["l", 35.7], ["c", 45.7]];
const FB: ArtKey[] = ["work", "pulse", "loft", "dfz", "domus", "rev", "fin"];

const isAlign = (value: string | undefined): value is Align => value === "l" || value === "r" || value === "c";
const isArtKey = (value: string | undefined): value is ArtKey => !!value && value in ART;

/** Normalise admin-entered links so bare domains like "www.behance.net/x" open off-site. */
const toHref = (value: string | undefined) => {
  const url = (value ?? "").trim();
  if (!url || url === "#") return "";
  if (url.startsWith("/") || url.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return `https://${url}`;
};

/** Adapt an admin-managed WorkProject into the engine's internal shape. */
const normalize = (p: WorkProject, i: number): Project => ({
  title: p.title || "Untitled",
  desc: p.description || "",
  art: isArtKey(p.art) ? p.art : FB[i % FB.length],
  image: p.image || "",
  url: toHref(p.url || p.liveUrl || p.figmaUrl),
  align: isAlign(p.align) ? p.align : LAY[i % LAY.length][0],
  width: Number(p.width) > 0 ? Number(p.width) : LAY[i % LAY.length][1],
});

// hero thumbnails: kind, x, y (viewport fractions), width (fraction of vw), depth
const TH: [ArtKey, number, number, number, number][] = [
  ["loft", 0.033, 0.22, 0.07, 1], ["rev", 0.105, 0.26, 0.09, 0.6], ["work", 0.25, 0.345, 0.055, 1.2],
  ["fin", 0.684, 0.345, 0.082, 1], ["dark", 0.746, 0.345, 0.045, 0.7], ["pulse", 0.917, 0.345, 0.1, 1.3],
  ["pink", 0.04, 0.84, 0.064, 1], ["sunset", 0.092, 0.65, 0.05, 0.8], ["blue", 0.919, 0.68, 0.082, 1.2],
  ["purple", 0.774, 0.055, 0.068, 0.9], ["loft", 0.616, 0.92, 0.06, 1], ["pulse", 0.37, 0.93, 0.06, 0.8],
  ["dark", 0.639, 0.69, 0.04, 0.6], ["coral", 0.951, 0.26, 0.055, 1],
];

/* ------------------------------------------------------------------ */
/* Procedural canvas artwork                                           */
/* ------------------------------------------------------------------ */

type Ctx = CanvasRenderingContext2D;
type Paint = string | CanvasGradient;

const poly = (x: Ctx, c: Paint, p: number[][]) => {
  x.fillStyle = c;
  x.beginPath();
  p.forEach((a, i) => (i ? x.lineTo(a[0], a[1]) : x.moveTo(a[0], a[1])));
  x.fill();
};
const grad = (x: Ctx, a: string, b: string, v?: boolean) => {
  const g = v ? x.createLinearGradient(0, 0, 0, 545) : x.createLinearGradient(0, 0, 780, 545);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  x.fillStyle = g;
  x.fillRect(0, 0, 780, 545);
};
const rr = (x: Ctx, a: number, b: number, w: number, h: number, r: number, c: Paint) => {
  x.fillStyle = c;
  x.beginPath();
  x.moveTo(a + r, b);
  x.arcTo(a + w, b, a + w, b + h, r);
  x.arcTo(a + w, b + h, a, b + h, r);
  x.arcTo(a, b + h, a, b, r);
  x.arcTo(a, b, a + w, b, r);
  x.fill();
};
const F = (s: number, w = 500) => `${w} ${s}px "Bai Jamjuree",Helvetica,Arial,sans-serif`;

const ART = {
  work(x: Ctx) {
    grad(x, "#eef2f4", "#8c4616", true);
    const g = x.createLinearGradient(0, 0, 0, 545);
    ([[0, "#eef2f4"], [0.6, "#c3ccd2"], [0.62, "#c0691f"], [1, "#8c4616"]] as [number, string][]).forEach((a) => g.addColorStop(a[0], a[1]));
    x.fillStyle = g;
    x.fillRect(0, 0, 780, 545);
    poly(x, "#aeb6bd", [[0, 420], [80, 300], [220, 400]]);
    poly(x, "#b9c2c9", [[120, 400], [300, 310], [470, 400]]);
    poly(x, "#8f8a86", [[640, 400], [740, 270], [780, 300], [780, 400]]);
    poly(x, "#d9d9d4", [[490, 405], [515, 28], [570, 12], [650, 395]]);
    poly(x, "#c3c4bf", [[495, 400], [510, 40], [532, 30], [535, 400]]);
    poly(x, "#a9b6bf", [[110, 440], [690, 440], [760, 520], [50, 520]]);
    x.fillStyle = "#fff";
    x.font = F(128);
    x.fillText("Hi, I'm Alex.", 126, 508);
    x.fillStyle = "#3a3a3a";
    x.font = F(21);
    ["BOOST YOUR", "WORKFORCE WITH", "AI DIGITAL WORKERS"].forEach((s, i) => x.fillText(s, 132, 185 + i * 21));
    rr(x, 132, 118, 34, 28, 10, "#555");
  },
  pulse(x: Ctx) {
    x.fillStyle = "#050505";
    x.fillRect(0, 0, 780, 545);
    const g = x.createRadialGradient(330, 60, 5, 330, 230, 230);
    g.addColorStop(0, "#ff3a1c");
    g.addColorStop(0.55, "#9a1405");
    g.addColorStop(1, "rgba(0,0,0,0)");
    poly(x, g, [[300, 0], [420, 0], [560, 300], [120, 300]]);
    x.fillStyle = "#c8c8c8";
    x.fillRect(110, 296, 460, 3);
    x.fillStyle = "#111";
    x.beginPath();
    x.ellipse(335, 215, 16, 40, 0, 0, 7);
    x.fill();
    rr(x, 500, 230, 90, 60, 4, "#2b2b2b");
    x.fillStyle = "#ece6da";
    x.font = '300 41px Georgia,"Times New Roman",serif';
    x.fillText("An Independent Music ♪ Studio Shaped", 20, 395);
    x.fillText("by Sound ◎, Built to Move Culture.", 20, 444);
  },
  loft(x: Ctx) {
    grad(x, "#d9dbd9", "#7d817d", true);
    x.fillStyle = "rgba(255,255,255,.88)";
    x.font = F(122, 500);
    x.fillText("LIVE LIFE", 48, 130);
    x.fillStyle = "rgba(255,255,255,.4)";
    x.fillText("IN LUXURY", 48, 232);
    x.fillStyle = "#e8e6e1";
    x.fillRect(40, 300, 590, 14);
    poly(x, "#7a6a58", [[60, 314], [600, 314], [600, 400], [60, 400]]);
    x.fillStyle = "#8d8f88";
    x.fillRect(60, 400, 260, 90);
    x.fillStyle = "#b9b6ae";
    x.fillRect(330, 380, 270, 110);
    x.fillStyle = "#2f3d25";
    [[0, 520, 160], [200, 530, 120], [560, 510, 200], [700, 500, 120]].forEach((a) => {
      x.beginPath();
      x.ellipse(a[0], a[1], a[2], 70, 0, 0, 7);
      x.fill();
    });
    rr(x, 90, 430, 160, 70, 6, "#f4f2ee");
    rr(x, 590, 150, 100, 110, 5, "#e9e5de");
  },
  dfz(x: Ctx) {
    const g = x.createRadialGradient(390, 260, 10, 390, 260, 420);
    g.addColorStop(0, "#3c3c3c");
    g.addColorStop(1, "#050505");
    x.fillStyle = g;
    x.fillRect(0, 0, 780, 545);
    ["#cfc58a", "#d6d09a", "#1f9a52", "#d77f7b", "#c98a52"].forEach((c, i) => {
      const cx = [165, 255, 390, 520, 615][i], cy = [255, 245, 230, 245, 258][i], r = [44, 46, 62, 46, 42][i];
      x.fillStyle = "#7a7a7a";
      x.fillRect(cx - r * 0.55, cy - r - 80, r * 1.1, r * 3.2);
      x.fillStyle = "#9a9a9a";
      x.beginPath();
      x.arc(cx, cy, r + 7, 0, 7);
      x.fill();
      x.fillStyle = c;
      x.beginPath();
      x.arc(cx, cy, r, 0, 7);
      x.fill();
    });
    x.fillStyle = "#bbb";
    x.font = F(11, 400);
    x.fillText("DFZ", 365, 52);
    x.fillText("TIMEPIECE", 345, 115);
    const t = x.createLinearGradient(0, 380, 0, 545);
    t.addColorStop(0, "#8c8c8c");
    t.addColorStop(1, "rgba(40,40,40,.1)");
    x.fillStyle = t;
    x.save();
    x.scale(0.84, 1);
    x.font = F(200, 500);
    x.fillText("DFZ WATCHES", 40, 520);
    x.restore();
  },
  domus(x: Ctx) {
    const g = x.createRadialGradient(300, 230, 10, 390, 300, 520);
    g.addColorStop(0, "#8b6240");
    g.addColorStop(1, "#140e0b");
    x.fillStyle = g;
    x.fillRect(0, 0, 780, 545);
    poly(x, "rgba(255,255,255,.07)", [[0, 300], [300, 150], [780, 250], [780, 380], [300, 520], [0, 420]]);
    x.fillStyle = "#f4efe6";
    x.font = F(24, 400);
    ([["D", 16], ["O", 142], ["M", 276], ["U", 409], ["S", 532]] as [string, number][]).forEach((a) => x.fillText(a[0], a[1] + 18, 288));
    rr(x, 250, 215, 90, 130, 2, "#d8c4a6");
    rr(x, 310, 235, 80, 110, 2, "#8a5a3a");
    rr(x, 215, 250, 70, 100, 2, "#efe9df");
    rr(x, 350, 265, 60, 70, 2, "#b88a5c");
  },
  rev(x: Ctx) {
    grad(x, "#0f0d17", "#1d1428", false);
    const g = x.createRadialGradient(370, 250, 5, 390, 260, 95);
    g.addColorStop(0, "#f0a0ff");
    g.addColorStop(0.5, "#9b3fd0");
    g.addColorStop(1, "#2a0f45");
    x.fillStyle = g;
    x.beginPath();
    x.arc(390, 262, 86, 0, 7);
    x.fill();
    x.strokeStyle = "rgba(255,255,255,.18)";
    for (let i = -4; i < 5; i++) {
      x.beginPath();
      x.ellipse(390, 262, 86, Math.abs(i) * 19 + 4, 0.4, 0, 7);
      x.stroke();
    }
    ([[70, 60, 150, 100, "Premium Traffic", 200], [500, 70, 140, 96, "Brand Protection", 185], [70, 300, 150, 100, "Audience Segments", 415], [490, 330, 150, 90, "Advance Insights", 450]] as [number, number, number, number, string, number][]).forEach((a) => {
      rr(x, a[0], a[1], a[2], a[3], 6, "#2a2a38");
      x.fillStyle = "#ddd";
      x.font = F(13);
      x.fillText(a[4], a[0] + (a[2] - x.measureText(a[4]).width) / 2, a[1] + a[3] + 22);
    });
  },
  fin(x: Ctx) {
    grad(x, "#a9d6b6", "#eef5ee", false);
    rr(x, 150, 50, 480, 430, 16, "#fafafa");
    x.fillStyle = "#111";
    x.font = F(22);
    x.fillText("My cards", 172, 118);
    rr(x, 172, 135, 140, 78, 10, "#c7f05e");
    rr(x, 324, 135, 140, 78, 10, "#111");
    rr(x, 476, 135, 134, 78, 10, "#ececec");
    for (let i = 0; i < 14; i++) {
      const h = 40 + ((i * 37) % 90) + i * 5;
      rr(x, 176 + i * 21, 455 - h, 10, h, 3, i % 3 === 1 ? "#111" : "#c7f05e");
    }
    rr(x, 428, 262, 182, 110, 10, "#e8f7bd");
    rr(x, 428, 382, 182, 80, 10, "#111");
  },
  pink: (x: Ctx) => grad(x, "#f7b2d0", "#b8337f"),
  sunset: (x: Ctx) => grad(x, "#e9a37c", "#2f2433", true),
  blue: (x: Ctx) => grad(x, "#58a8ff", "#0a2a8a"),
  purple: (x: Ctx) => grad(x, "#c06cf5", "#2a1250"),
  coral: (x: Ctx) => grad(x, "#ff8a76", "#bf3838"),
  dark: (x: Ctx) => grad(x, "#3a3020", "#0a0a0a"),
};

const makeArt = (k: ArtKey, w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  x.scale(w / 780, h / 545);
  ART[k](x);
  return c;
};

/* Card artwork / image */
function CardVisual({ p, priority }: { p: Project; priority: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (p.image || !ref.current) return;
    const c = ref.current;
    c.width = 780;
    c.height = 545;
    ART[p.art](c.getContext("2d")!);
  }, [p]);

  if (p.image) {
    // `crossOrigin` matches the WebGL texture loader in the hero, so the two
    // consumers share one cached download instead of fetching the image twice.
    const src = isCloudinaryDeliveryUrl(p.image)
      ? resizedDeliveryUrl(p.image, "image", CARD_MAX_WIDTH)
      : p.image;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="vis"
        src={src}
        srcSet={deliverySrcSet(p.image, CARD_WIDTHS)}
        sizes={`(max-width: 760px) 92vw, ${p.width}vw`}
        alt={p.title}
        crossOrigin="anonymous"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
      />
    );
  }
  return <canvas ref={ref} className="vis" />;
}

/* Bottom-of-card link (Live / Figma). Renders as a muted, inert label when blank. */
function ProjectGo({ label, href }: { label: string; href: string }) {
  return (
    <a
      className={`go${href ? "" : " is-disabled"}`}
      href={href || undefined}
      target={href ? "_blank" : undefined}
      rel={href ? "noreferrer" : undefined}
      aria-disabled={href ? undefined : true}
    >
      {label} <i>→</i>
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ORDER = [0, 7, 3, 10, 1, 12, 5, 8, 2, 9, 4, 13, 6, 11];

export default function WorkPage() {
  // Admin-managed content (Supabase-backed, provided by app/work/page.tsx).
  const content = useSiteContent();
  const work = content.work;
  const footer = content.footer;
  const services = content.services;
  const navigation = content.navigation;

  const [projects] = useState<Project[]>(() => (work?.projects ?? []).map(normalize));
  const [menuOpen, setMenuOpen] = useState(false);
  const listRef = useRef<HTMLElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const projectsRef = useRef(projects);
  const engineRef = useRef<{ setProjects: (p: Project[]) => void; rebuild: () => void } | null>(null);

  // Always open this page from the top (the hero), even when arriving from a
  // scrolled position via client-side navigation or a restored scroll position.
  useEffect(() => {
    const previous = history.scrollRestoration;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    return () => {
      if ("scrollRestoration" in history) history.scrollRestoration = previous;
    };
  }, []);

  // Engine (three.js threads + lenis + gsap)
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    let disposed = false;
    let cleanup = () => {};

    document.fonts.ready.then(() => {
      if (disposed) return;
      const canvas = glRef.current!, logoEl = logoRef.current!, list = listRef.current!;

      const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
      lenis.scrollTo(0, { immediate: true });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (t: number) => lenis.raf(t * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const scene = new THREE.Scene();
      const cam = new THREE.OrthographicCamera(0, 1, 0, -1, 0.1, 100);
      cam.position.z = 10;
      const grp = new THREE.Group();
      scene.add(grp);

      let W = 0, H = 0, HP = 0, mx = 0, my = 0, tx = 0, ty = 0;
      const N = 90;
      type Seg = {
        lines: THREE.Line[]; pts: number[][][]; dots: THREE.Points; arcs: THREE.Line[];
        y0: number; y1: number; hero: boolean;
      };
      let segs: Seg[] = [];
      let current: Project[] = [];
      let ctx: gsap.Context | null = null;

        const thumbs = TH.map((a) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: null, transparent: true }));
        // Each thumbnail floats on layered sinusoids with per-card random
        // amplitudes, frequencies and phases. The two layers per axis use
        // incommensurate speeds, so the combined path never visibly repeats —
        // continuous, silky water-like floating with no steering.
        const a0 = Math.random() * Math.PI * 2;
        const s0 = Math.random() * Math.PI * 2;
        m.userData = {
          x: a[1], y: a[2], w: a[3], z: a[4], k: a[0],
          dp: {
            xa: 9 + Math.random() * 12,
            xf: 1.3 + Math.random() * 0.9,
            xp: a0,
            ya: 14 + Math.random() * 18,
            yf: 1.6 + Math.random() * 1.0,
            yp: s0,
            xb: 3 + Math.random() * 6,
            xf2: 2.9 + Math.random() * 1.5,
            xb2: Math.random() * Math.PI * 2,
            yb: 4 + Math.random() * 6,
            yf2: 3.2 + Math.random() * 1.6,
            yb2: Math.random() * Math.PI * 2,
            // Vanish cycle: slow and rare — long stretches afloat, then the
            // card melts fully out at its own pace and returns.
            vf: 0.15 + Math.random() * 0.2,
            vp: Math.random() * Math.PI * 2,
          },
        };
        scene.add(m);
        return m;
      });

      function build() {
        W = window.innerWidth; H = window.innerHeight;
        renderer.setSize(W, H);
        cam.right = W; cam.bottom = -H; cam.updateProjectionMatrix();
        grp.children.slice().forEach((o) => {
          grp.remove(o);
          const l = o as THREE.Line;
          l.geometry.dispose();
          (l.material as THREE.Material).dispose();
        });
        segs = [];
        const sy = lenis.scroll || 0;
        const R = [...document.querySelectorAll<HTMLElement>(".card")].map((e) => {
          const r = e.getBoundingClientRect();
          return { x: r.left, y: r.top + sy - (parseFloat(String(gsap.getProperty(e, "y"))) || 0), w: r.width, h: r.height };
        });
        for (let i = -1; i < R.length - 1; i++) {
          const f = R[i], t = R[i + 1], B = { x: t.x + t.w / 2, y: t.y - 4 };
          const dir = i < 0 ? (B.x < W / 2 ? -1 : 1) : B.x > f.x + f.w / 2 ? 1 : -1;
          const E = i < 0 ? { x: W / 2, y: H * 1.6 + 105 } : { x: dir > 0 ? f.x + f.w : f.x, y: f.y + f.h * 0.24 };
          const lines: THREE.Line[] = [], pts: number[][][] = [];
          for (let k = 0; k < 3; k++) {
            const p0 = [E.x + (i < 0 ? (k - 1) * 16 : 0), E.y + k * 13];
            const p1 = [p0[0] + dir * (300 + 110 * k), p0[1] + 90 + k * 40];
            const p2 = [B.x + dir * (190 + 95 * k), B.y - 230 - k * 45];
            const pos = new Float32Array(N * 3), arr: number[][] = [];
            for (let j = 0; j < N; j++) {
              const u = j / (N - 1), v = 1 - u;
              const a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
              const X = a * p0[0] + b * p1[0] + c * p2[0] + d * B.x;
              const Y = a * p0[1] + b * p1[1] + c * p2[1] + d * B.y;
              pos.set([X, -Y, 0], j * 3);
              arr.push([X, -Y]);
            }
            const g = new THREE.BufferGeometry();
            g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
            const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 }));
            l.frustumCulled = false;
            grp.add(l); lines.push(l); pts.push(arr);
          }
          const dg = new THREE.BufferGeometry();
          dg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3));
          const dots = new THREE.Points(dg, new THREE.PointsMaterial({ size: 3.5, sizeAttenuation: false, color: 0xbdbdc4 }));
          dots.frustumCulled = false;
          grp.add(dots);
          const arcs = [0, 1].map((n) => {
            const g = new THREE.BufferGeometry();
            g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(35 * 3), 3));
            const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: n ? 0xbfe0ff : 0x2f86ff, transparent: true, opacity: n ? 1 : 0.8 }));
            l.frustumCulled = false; l.visible = false;
            grp.add(l);
            return l;
          });
          segs.push({ lines, pts, dots, arcs, y0: E.y, y1: B.y, hero: i < 0 });
        }
      }

      function frame(t: number) {
        const sc = lenis.scroll || 0;
        mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
        const n = thumbs.length;
        let fill = 0;
        thumbs.forEach((m, i) => {
          const d = m.userData;
          const q = clamp((HP - (ORDER[i] / n) * 0.86) / 0.14), e = q * q * (3 - 2 * q);
          fill += e;
          const dv = d.dp;
          const cw = Math.min(W, 1320);
          const cl = (W - cw) / 2;
          const s = d.w * cw * 1.8 * (1 - 0.88 * e);
          // Two incommensurate sine layers per axis — a smooth primary wave
          // plus a gentle secondary harmonic, so the drift never loops.
          const ox =
            Math.sin(t * dv.xf + dv.xp) * dv.xa +
            Math.sin(t * dv.xf2 + dv.xb2) * dv.xb;
          const oy =
            Math.sin(t * dv.yf + dv.yp) * dv.ya +
            Math.sin(t * dv.yf2 + dv.yb2) * dv.yb;
          let x = cl + d.x * cw + ox + mx * d.z * 30;
          let y = d.y * H + oy + my * d.z * 20;
          x += (cl + cw / 2 - x) * e; y += (H * 0.4 - y) * e;
          x += (cl + cw / 2 - x) * e; y += (H * 0.4 - y) * e;
          x = clamp(x, cl + s / 2 + 6, cl + cw - s / 2 - 6);
          m.position.set(x, -(sc + y), 1);
          m.scale.set(s, s / 1.43, 1);
          const mat = m.material as THREE.MeshBasicMaterial;
          // Solid while afloat (0.85–1.0), then a smooth sine-backed vanish:
          // each card dips fully to transparent and returns on its own cycle.
          // Pure sine crossing means no pops — just a clean sink and rise.
          const seen = Math.max(0, Math.sin(t * dv.vf + dv.vp));
          mat.opacity = (0.85 + 0.15 * Math.sin(t * 0.9 + i * 1.7)) * Math.pow(seen, 1.35);
          m.visible = e < 0.999;
        });
        logoEl.style.setProperty("--lp", (fill / n).toFixed(4));
        segs.forEach((s) => {
          const p = s.hero ? clamp((sc - H * 1.2) / (s.y1 - H * 1.95)) : clamp((sc + H * 0.85 - s.y0) / (s.y1 - s.y0 - H * 0.1));
          const vis = p > 0;
          const dp = s.dots.geometry.attributes.position as THREE.BufferAttribute;
          s.lines.forEach((l, k) => {
            l.visible = vis;
            if (!vis) return;
            const q = clamp(p * 1.12 - k * 0.06), nn = Math.max(2, Math.round(q * (N - 1)) + 1);
            l.geometry.setDrawRange(0, nn);
            const h = s.pts[k][nn - 1];
            dp.setXYZ(k, h[0], h[1], 0);
          });
          s.dots.visible = vis;
          dp.needsUpdate = true;
          const on = p > 0.05 && p < 0.95;
          s.arcs.forEach((l, n2) => {
            l.visible = on;
            if (!on) return;
            const pos = l.geometry.attributes.position as THREE.BufferAttribute, amp = n2 ? 10 : 16;
            for (let g = 0; g < 2; g++) {
              const x0 = dp.getX(g), y0 = dp.getY(g), x1 = dp.getX(g + 1), y1 = dp.getY(g + 1);
              const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
              for (let j = 0; j < 18; j++) {
                if (g && !j) continue;
                const u = j / 17;
                const o = j === 0 || j === 17 ? 0 : (Math.random() - 0.5) * amp * Math.sin(Math.PI * u) * 2;
                pos.setXYZ(g * 17 + j, x0 + dx * u + nx * o, y0 + dy * u + ny * o, 0);
              }
            }
            pos.needsUpdate = true;
          });
        });
        cam.position.y = -sc;
        renderer.render(scene, cam);
      }

      function setProjects(ps: Project[]) {
        current = ps;
        // hero thumbnails follow the project data
        thumbs.forEach((m, i) => {
          const mat = m.material as THREE.MeshBasicMaterial;
          const p = ps.length ? ps[i % ps.length] : null;

          // Paint the project's card artwork straight away. Waiting for the
          // photo used to leave a near-black square in the hero for as long as
          // the image took to download.
          mat.map?.dispose();
          mat.map = new THREE.CanvasTexture(makeArt(p ? p.art : FB[i % FB.length], 320, 224));
          mat.color.set(0xffffff);
          mat.needsUpdate = true;

          if (p?.image) {
            const src = isCloudinaryDeliveryUrl(p.image)
              ? resizedDeliveryUrl(p.image, "image", HERO_THUMB_WIDTH)
              : p.image;
            const loader = new THREE.TextureLoader();
            loader.setCrossOrigin("anonymous");
            loader.load(src, (t) => {
              t.anisotropy = renderer.capabilities.getMaxAnisotropy();
              mat.map?.dispose();
              mat.map = t;
              mat.color.set(0xffffff);
              mat.needsUpdate = true;
            });
          }
        });
        // card reveal animations
        ctx?.revert();
        ctx = gsap.context(() => {
          document.querySelectorAll<HTMLElement>(".item").forEach((it) => {
            const card = it.querySelector<HTMLElement>(".card")!, vis = card.firstElementChild!;
            // The reveal used to start at 82% of the viewport and run for 1.4s,
            // so a card that was already downloaded still looked like it was
            // loading. Start as soon as the card enters and resolve faster.
            gsap.from(card, { opacity: 0, y: 60, filter: "brightness(.45)", duration: 0.85, ease: "power3.out", scrollTrigger: { trigger: card, start: "top 94%" } });
            gsap.fromTo(vis, { scale: 1.16 }, { scale: 1, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true } });
            gsap.from(it.querySelectorAll(".meta h3,.meta p,.go"), { opacity: 0, y: 24, duration: 0.7, stagger: 0.07, ease: "power3.out", scrollTrigger: { trigger: it.querySelector(".meta"), start: "top 96%" } });
          });
        }, list);
        requestAnimationFrame(() => { ScrollTrigger.refresh(); build(); });
      }

      engineRef.current = { setProjects, rebuild: () => { ScrollTrigger.refresh(); build(); } };

      // init
      const heroST = ScrollTrigger.create({
        trigger: ".work-hero", start: "top top", end: () => "+=" + window.innerHeight * 1.2, scrub: 0.6,
        onUpdate: (s) => { HP = s.progress; },
      });
      const h1Tween = gsap.from(".stick h1", { opacity: 0, y: 30, duration: 1.2, ease: "power3.out", delay: 0.2 });

      const onMove = (e: PointerEvent) => {
        tx = (e.clientX / window.innerWidth) * 2 - 1;
        ty = (e.clientY / window.innerHeight) * 2 - 1;
      };
      window.addEventListener("pointermove", onMove);

      const onClick = (e: MouseEvent) => {
        const a = (e.target as Element).closest('a[href="#"]');
        if (a) e.preventDefault();
      };
      document.addEventListener("click", onClick);

      gsap.ticker.add(frame);
      let rt: ReturnType<typeof setTimeout>;
      const re = () => { clearTimeout(rt); rt = setTimeout(() => { ScrollTrigger.refresh(); build(); }, 150); };
      window.addEventListener("resize", re);
      window.addEventListener("load", re);
      const ro = new ResizeObserver(re);
      ro.observe(list);

      // initial project state (already rendered by React)
      setProjects(projectsRef.current);

      cleanup = () => {
        clearTimeout(rt);
        ro.disconnect();
        window.removeEventListener("resize", re);
        window.removeEventListener("load", re);
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("click", onClick);
        gsap.ticker.remove(frame);
        gsap.ticker.remove(tick);
        ctx?.revert();
        h1Tween.kill();
        heroST.kill();
        ScrollTrigger.getAll().forEach((s) => s.kill());
        lenis.destroy();
        grp.children.forEach((o) => {
          const l = o as THREE.Line;
          l.geometry.dispose();
          (l.material as THREE.Material).dispose();
        });
        thumbs.forEach((m) => {
          (m.material as THREE.MeshBasicMaterial).map?.dispose();
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        });
        renderer.dispose();
        engineRef.current = null;
        void current;
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  // keep latest projects available to the engine, and re-sync when they change
  useEffect(() => {
    projectsRef.current = projects;
    engineRef.current?.setProjects(projects);
  }, [projects]);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div className="wk-page">
      <canvas id="gl" ref={glRef} />

      <header>
        <div className="nav">
          {/* Main-page header buttons (CV + hamburger Menu) */}
          <button
            className="cv-button cursor-target"
            type="button"
            data-cursor-label="Download CV"
            onClick={() => downloadResume(content.experience.items)}
          >
            Curriculum Vitae | CV
          </button>
          <button
            className="menu-button cursor-target"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-label="Open navigation menu"
            data-cursor-label="Menu"
            onClick={() => setMenuOpen(true)}
          >
            <HamburgerIcon className="menu-button-icon" />
          </button>
        </div>
      </header>

      {/* MENU SIDEBAR */}
      <div
        className={`wk-overlay${menuOpen ? " open" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <aside className={`wk-menu${menuOpen ? " open" : ""}`} aria-hidden={!menuOpen}>
        <div className="wk-menu__head">
          <span className="wk-menu__label">Menu</span>
          <button className="wk-menu__close" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <CloseIcon />
          </button>
        </div>

        <nav className="wk-menu__nav">
          {navigation.map((link) => (
            <Link
              key={`${link.label}-${link.href}`}
              href={link.href.startsWith("#") ? `/${link.href}` : link.href}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="wk-menu__foot">
          <a className="wk-hello wk-hello--sm" href={footer.whatsappUrl} target="_blank" rel="noreferrer">
            <span className="wk-hello__text">Contact With Me</span>
            <span className="wk-hello__badge"><WhatsApp3DIcon /></span>
          </a>
          <a className="wk-menu__mail" href={`mailto:${footer.email}`}>{footer.email}</a>
          <div className="wk-menu__socials">
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><LinkedInIcon /></a>
            <a href="https://behance.net" target="_blank" rel="noreferrer" aria-label="Behance"><BehanceIcon /></a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><InstagramIcon /></a>
          </div>
        </div>
      </aside>

      <section className="work-hero">
        <div className="stick">
          <div className="logo-big" ref={logoRef}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="dim" alt="" src={work?.heroLogoDim || "/logo-dim.png"} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="fill" alt={work?.heroLogoAlt || "Seam Rahman"} src={work?.heroLogoFill || "/logo-fill.png"} />
          </div>
          <h1>{work?.heroTitle || "ALL PROJECTS"}</h1>
        </div>
      </section>

      <main className="list" id="list" ref={listRef}>
        {projects.map((p, i) => {
          const margin =
            p.align === "l" ? "30px 0 0 4vw" : p.align === "r" ? "30px 5vw 0 auto" : "30px auto 0";
          return (
            <article className="item" key={`${p.title}-${i}`}>
              <a
                className={`card cursor-target ${p.align}`}
                href={p.url || undefined}
                data-cursor-label={p.title}
                style={{ width: `calc(var(--wk-c) * ${p.width} / 100)` }}
                {...(p.url ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                <CardVisual p={p} priority={i < 3} />
              </a>
              <div className="meta" style={{ width: `calc(var(--wk-c) * ${p.width} / 100)`, margin }}>
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
                <div className="meta-links">
                  <ProjectGo label="Explore Project" href={p.url} />
                </div>
              </div>
            </article>
          );
        })}
      </main>

      </div>
      <SiteFooter />
      <TargetCursor spinDuration={2} hideDefaultCursor parallaxOn />

      <style jsx global>{`
        :root {
          --bg: #030308;
          --fg: #e9e9e9;
          --mut: #8b8b92;
          color-scheme: dark;
        }
        .wk-page {
          position: relative;
          --wk-c: min(1320px, 100vw);
        }
        .wk-page .list {
          padding-inline: max(0px, calc((100% - 1320px) / 2));
        }
        .wk-page header {
          gap: 24px;
          padding: calc(env(safe-area-inset-top, 0px) + 22px) max(24px, calc((100% - 1320px) / 2 + 20px)) 0 max(24px, calc((100% - 1320px) / 2 + 20px));
        }
        .wk-page .nav {
          gap: 24px;
          margin-left: auto;
        }
        .wk-page .cv-button {
          padding: 0 18px;
          background: rgba(255, 76, 78, 0.14);
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
        }
        .wk-page .cv-button:hover,
        .wk-page .cv-button:focus-visible {
          background: var(--accent);
          -webkit-backdrop-filter: none;
          backdrop-filter: none;
        }
        .wk-page :where(*, *::before, *::after),
        .wk-page,
        .wk-page::before,
        .wk-page::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        html:root {
          background: var(--bg);
          scroll-padding-top: env(safe-area-inset-top, 0px);
        }
        html.lenis,
        html.lenis body {
          height: auto;
        }
        .lenis.lenis-smooth {
          scroll-behavior: auto !important;
        }
        /* Scoped so the shared SiteFooter keeps the main-page environment. */
        body:has(.wk-page) {
          background: var(--bg);
          color: var(--fg);
          font-family: "Bai Jamjuree", Helvetica, Arial, sans-serif;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }
        canvas#gl {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
        }
        /* Keep the shared footer's black texts even though this page sets its
           own body font/color. */
        footer.site-footer a:not(.say-hello-btn):not(.footer-projects-button):not(.group),
        footer.site-footer .footer-services-heading {
          color: #111827 !important;
        }

        header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: calc(env(safe-area-inset-top, 0px) + 22px) 29px 0;
          pointer-events: none;
        }
        header > * {
          pointer-events: auto;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 500;
          font-size: 19px;
          letter-spacing: -0.03em;
          color: #fff;
          text-decoration: none;
        }
        .brand sup {
          font-size: 7px;
          margin-left: 1px;
          align-self: flex-start;
          margin-top: 5px;
        }
        .nav {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .pill {
          height: 27px;
          padding: 0 14px;
          border-radius: 99px;
          font: 400 12.5px/27px "Bai Jamjuree", sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.01em;
          border: 1px solid #fff;
          color: #fff;
          background: none;
          cursor: pointer;
          transition: background 0.3s, color 0.3s;
        }
        .pill.w {
          background: #fff;
          color: #000;
        }
        .pill:hover {
          background: #fff;
          color: #000;
        }
        .pill.w:hover {
          background: #000;
          color: #fff;
        }
        .work-hero {
          height: 220vh;
          position: relative;
        }
        .stick {
          position: sticky;
          top: 0;
          height: 100vh;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .logo-big {
          position: absolute;
          left: 50%;
          top: 40%;
          width: 190px;
          transform: translate(-50%, -50%);
        }
        .logo-big img {
          display: block;
          width: 100%;
          height: auto;
          user-select: none;
          -webkit-user-drag: none;
        }
        .logo-big .dim {
          opacity: 0.5;
        }
        .logo-big .fill {
          position: absolute;
          inset: 0;
          -webkit-mask-image: linear-gradient(
            to top,
            #000 calc(var(--lp, 0) * 110% - 10%),
            transparent calc(var(--lp, 0) * 110%)
          );
          mask-image: linear-gradient(
            to top,
            #000 calc(var(--lp, 0) * 110% - 10%),
            transparent calc(var(--lp, 0) * 110%)
          );
        }
        .stick h1 {
          position: absolute;
          top: 60%;
          left: 0;
          right: 0;
          transform: translateY(-50%);
          font-family: "Bai Jamjuree", Helvetica, Arial, sans-serif;
          font-weight: 600;
          font-size: 100px;
          letter-spacing: -0.055em;
          color: #d9d9d9;
          line-height: 1;
        }
        .list {
          position: relative;
          z-index: 2;
          padding: 0 0 38vh;
          margin-top: -6vh;
        }
        .item {
          margin-top: 30vh;
        }
        .item:first-child {
          margin-top: 38vh;
        }
        .card {
          position: relative;
          display: block;
          border-radius: 6px;
          overflow: hidden;
          aspect-ratio: 780 / 545;
          cursor: none;
          /* Never a flat black hole while the artwork/image arrives. */
          background: linear-gradient(145deg, #12121a 0%, #07070b 55%, #0d0d14 100%);
        }
        .card .vis {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          will-change: transform;
        }
        .l {
          margin-left: 4vw;
        }
        .r {
          margin-left: auto;
          margin-right: 5vw;
        }
        .c {
          margin: 0 auto;
        }
        .meta {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-top: 30px;
        }
        .meta h3 {
          font-family: "Bai Jamjuree", Helvetica, Arial, sans-serif;
          font-weight: 600;
          font-size: 34px;
          letter-spacing: -0.04em;
          color: #ececec;
          line-height: 1.1;
        }
        .meta p {
          margin-top: 9px;
          font-size: 16px;
          font-weight: 500;
          line-height: 1.3;
          color: var(--mut);
          max-width: 290px;
          letter-spacing: -0.01em;
        }
        .go {
          margin-top: 6px;
          width: 185px;
          display: flex;
          justify-content: space-between;
          font: 500 16px "Bai Jamjuree", sans-serif;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: #fff;
          text-decoration: none;
          border-bottom: 1px solid #fff;
          padding-bottom: 4px;
          position: relative;
          overflow: hidden;
        }
        .go i {
          font-style: normal;
          transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .go:hover i {
          transform: translateX(5px);
        }
        .meta-links {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          align-self: flex-end;
          gap: 12px;
        }
        .meta-links .go {
          margin-top: 0;
        }
        .go.is-disabled {
          color: #fff;
          border-bottom-color: rgba(255, 255, 255, 0.18);
          cursor: not-allowed;
        }
        .go.is-disabled:hover i {
          transform: none;
        }

        /* ---------- Menu sidebar ---------- */
        .wk-overlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          background: rgba(0, 0, 0, 0.55);
          -webkit-backdrop-filter: blur(4px);
          backdrop-filter: blur(4px);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.35s ease;
        }
        .wk-overlay.open {
          opacity: 1;
          pointer-events: auto;
        }
        .wk-menu {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          z-index: 90;
          width: min(420px, 88vw);
          display: flex;
          flex-direction: column;
          gap: 26px;
          padding: 30px 30px calc(30px + env(safe-area-inset-bottom, 0px));
          background: #0a0a10;
          border-left: 1px solid rgba(255, 255, 255, 0.09);
          box-shadow: -30px 0 80px rgba(0, 0, 0, 0.6);
          transform: translateX(100%);
          opacity: 0;
          pointer-events: none;
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
        }
        .wk-menu.open {
          transform: translateX(0);
          opacity: 1;
          pointer-events: auto;
        }
        .wk-menu__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .wk-menu__label {
          font-size: 12px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--mut);
        }
        .wk-menu__close {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.04);
          color: #fff;
          transition: background 0.3s, color 0.3s, transform 0.4s;
        }
        .wk-menu__close svg {
          width: 20px;
          height: 20px;
        }
        .wk-menu__close:hover {
          background: #fff;
          color: #000;
          transform: rotate(90deg);
        }
        .wk-menu__nav {
          display: flex;
          flex-direction: column;
          margin-top: 6px;
        }
        .wk-menu__nav a {
          padding: 13px 4px;
          font-size: 30px;
          font-weight: 500;
          letter-spacing: -0.02em;
          color: #ededed;
          text-decoration: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          transition: color 0.3s, padding-left 0.35s;
        }
        .wk-menu__nav a:hover {
          color: var(--accent);
          padding-left: 14px;
        }
        .wk-menu__foot {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .wk-menu__mail {
          font-size: 14px;
          color: #c9c9d1;
          text-decoration: none;
          word-break: break-all;
        }
        .wk-menu__mail:hover {
          color: #fff;
        }
        .wk-menu__socials {
          display: flex;
          gap: 10px;
        }
        .wk-menu__socials a,
        .wk-ic {
          width: 42px;
          height: 42px;
          display: inline-grid;
          place-items: center;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.03);
          color: #e6e6e6;
          transition: background 0.3s, color 0.3s, transform 0.3s, border-color 0.3s;
        }
        .wk-menu__socials a svg,
        .wk-ic svg {
          width: 20px;
          height: 20px;
        }
        .wk-menu__socials a:hover,
        .wk-ic:hover {
          background: #fff;
          border-color: #fff;
          color: #000;
          transform: translateY(-2px);
        }

        /* ---------- Footer ---------- */
        .wk-footer {
          position: relative;
          z-index: 3;
          overflow: hidden;
          padding-top: 88px;
          background: var(--bg);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .wk-footer__grid {
          width: min(1240px, calc(100% - 48px));
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.35fr 1fr 1.05fr;
          gap: 48px;
          padding-bottom: 68px;
        }
        .wk-footer__intro h2 {
          font-size: 46px;
          font-weight: 600;
          letter-spacing: -0.03em;
          line-height: 1.05;
          color: #fff;
        }
        .wk-footer__intro > p {
          margin-top: 14px;
          max-width: 34ch;
          font-size: 15px;
          line-height: 1.5;
          color: var(--mut);
        }
        .wk-footer__cta {
          margin-top: 26px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .wk-footer__avatar {
          position: relative;
          width: 62px;
          height: 62px;
          flex-shrink: 0;
          border-radius: 50%;
          overflow: hidden;
        }
        .wk-footer__avatar .wk-footer__face {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: invert(1);
        }
        .wk-footer__avatar .wk-footer__face--hover {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 350ms;
        }
        .wk-footer__avatar:hover .wk-footer__face--hover {
          opacity: 1;
        }
        .wk-footer__mail {
          display: inline-block;
          margin-top: 22px;
          font-size: 15px;
          color: #d7d7df;
          text-decoration: none;
        }
        .wk-footer__mail:hover {
          color: var(--accent);
        }
        .wk-footer__services h3 {
          margin-bottom: 14px;
          font-size: 22px;
          font-weight: 600;
          letter-spacing: -0.02em;
          text-align: center;
          color: #fff;
        }
        .wk-footer__services ul {
          list-style: none;
          padding: 0;
          margin: 0;
          border-left: 1px dashed rgba(255, 255, 255, 0.14);
          border-right: 1px dashed rgba(255, 255, 255, 0.14);
        }
        .wk-footer__services li a {
          display: block;
          padding: 11px 18px;
          font-size: 13px;
          text-align: center;
          color: #c7c7cf;
          text-decoration: none;
          border-radius: 8px;
          transition: background 0.3s, color 0.3s;
        }
        .wk-footer__services li a:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }
        .wk-footer__tools {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 22px;
          text-align: center;
        }
        .wk-footer__cap {
          font-size: 13px;
          color: #c7c7cf;
        }
        .wk-footer__icons {
          margin-top: 12px;
          display: flex;
          justify-content: center;
          gap: 10px;
        }
        .wk-footer__projects {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 52px;
          padding: 0 34px;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 500;
          color: #fff;
          text-decoration: none;
          background: linear-gradient(175deg, #222 0%, #0d0d0d 100%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.28), 0 10px 24px -4px rgba(0, 0, 0, 0.6);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .wk-footer__projects:hover {
          transform: translateY(-2px);
        }

        /* Say Hello pill (shared by sidebar + footer) */
        .wk-hello {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 8px 10px 8px 22px;
          border-radius: 14px;
          color: #fff;
          text-decoration: none;
          background: linear-gradient(175deg, #222 0%, #0d0d0d 100%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.28), 0 10px 24px -4px rgba(0, 0, 0, 0.55);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .wk-hello:hover {
          transform: translateY(-2px);
        }
        .wk-hello__text {
          font-size: 15px;
          font-weight: 500;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }
        .wk-hello__badge {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #fff;
        }
        .wk-hello__badge svg {
          width: 32px;
          height: 32px;
        }
        .wk-hello--sm {
          align-self: flex-start;
        }
        .wk-hello--sm .wk-hello__text {
          font-size: 14px;
        }

        /* Footer marquee */
        .wk-footer__marquee {
          display: block;
          margin-top: 8px;
          padding: 24px 0 30px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
          text-decoration: none;
        }
        .wk-footer__track {
          display: flex;
          width: max-content;
          animation: wk-marquee 28s linear infinite;
        }
        .wk-footer__marquee:hover .wk-footer__track {
          animation-play-state: paused;
        }
        .wk-footer__group {
          display: flex;
          flex-shrink: 0;
        }
        .wk-footer__word {
          display: inline-flex;
          align-items: center;
          padding: 0 28px;
          font-size: clamp(40px, 6vw, 84px);
          font-weight: 600;
          letter-spacing: 0.01em;
          text-transform: uppercase;
          white-space: nowrap;
          color: transparent;
          -webkit-text-stroke: 1.4px rgba(255, 255, 255, 0.4);
          transition: -webkit-text-stroke-color 0.5s;
        }
        .wk-footer__sym {
          margin-left: 28px;
          color: var(--accent);
          -webkit-text-stroke: 0;
          transition: transform 0.8s;
        }
        .wk-footer__marquee:hover .wk-footer__word {
          -webkit-text-stroke-color: var(--accent);
        }
        .wk-footer__marquee:hover .wk-footer__sym {
          transform: rotate(180deg);
        }
        @keyframes wk-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        @media (max-width: 980px) {
          .wk-footer__grid {
            grid-template-columns: 1fr 1fr;
          }
          .wk-footer__intro {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 760px) {
          .stick h1 {
            font-size: 44px;
          }
          .card.l,
          .card.r,
          .card.c {
            width: 92vw !important;
            margin: 0 auto;
          }
          .meta {
            flex-direction: column;
            gap: 16px;
          }
          .item > * {
            width: 92vw !important;
            margin: 0 auto !important;
          }
          .card {
            cursor: auto;
          }
          .wk-footer__grid {
            grid-template-columns: 1fr;
            gap: 36px;
          }
          .wk-footer__intro h2 {
            font-size: 34px;
          }
          .wk-footer__tools {
            align-items: flex-start;
            text-align: left;
          }
          .wk-footer__icons {
            justify-content: flex-start;
          }
          .wk-menu {
            width: 92vw;
            padding: 24px 22px calc(24px + env(safe-area-inset-bottom, 0px));
          }
          .wk-menu__nav a {
            font-size: 24px;
          }
        }
      `}</style>
    </>
  );
}
