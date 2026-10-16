'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSiteContent } from '../data/content-context';
import type {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  CanvasTexture,
  Vector2,
  Vector3,
  Matrix4,
  Raycaster,
} from 'three';

interface ScrollTriggerInstance {
  progress: number;
  start: number;
  kill: () => void;
}

/* ==================== STYLES ==================== */
const styles = `
  .trionn-ribbon-root {
    --ink: #e8e8e8;
    position: relative;
    width: 99.99%;
    height: 100vh;
    background: #000;
    overflow-x: hidden; 
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    z-index: 5;
  }
  
  .trionn-ribbon-root * { margin: 0; padding: 0; box-sizing: border-box; }
  
  .trionn-ribbon-root #gl { 
    position: absolute; 
    inset: 0;
    z-index: 1000; 
  }
  
  .trionn-ribbon-root #gl canvas { display: block; }
  
  .trionn-ribbon-root .headline {
    position: absolute; 
    inset: 0; 
    z-index: 2; 
    pointer-events: none;
    display: flex; 
    flex-direction: column; 
    justify-content: center;
    align-items: center; 
    gap: 10px;
    width: 100%;
    max-width: 100vw;
  }
  
  /* Accent word in the headline ("LATEST DESIGN"): shares the muted word colour
     used by the other section headings. */
  .trionn-ribbon-root .headline h1 .accent-word { color: var(--quiet-word); }
  
  .trionn-ribbon-root .headline h1 {
    font-weight: 600; 
    line-height: .85; 
    letter-spacing: -.05em;
    color: var(--ink); 
    font-size: clamp(40px, 9vw, 140px); 
    will-change: transform; 
    white-space: nowrap; 
    mix-blend-mode: difference;
    max-width: 100%;
    overflow: hidden;
    text-overflow: clip;
  }
`;

/* ==================== HELPERS ==================== */
const loadedScripts: Record<string, boolean> = {};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (loadedScripts[src]) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => { loadedScripts[src] = true; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ==================== COMPONENT ==================== */
export default function TrionnRibbon() {
  const content = useSiteContent();
  const heading = content.latest.heading;
  const wordB = (heading.suffix ?? '').trim();
  const helixImages = useMemo(
    () => (content.helix?.items ?? []).map((item) => item.image ?? ''),
    [content],
  );
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const linkPreconnect = document.createElement('link');
    linkPreconnect.rel = 'preconnect';
    linkPreconnect.href = 'https://fonts.googleapis.com';

    const linkFonts = document.createElement('link');
    linkFonts.rel = 'stylesheet';
    linkFonts.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap';

    document.head.appendChild(linkPreconnect);
    document.head.appendChild(linkFonts);

    let cancelled = false;
    let cleanupFn: (() => void) | null = null;

    (async () => {
      try {
        if (cancelled || !rootRef.current) return;

        // Keep GSAP and ScrollTrigger in the bundle so initialization does not
        // depend on CDN scripts having loaded onto window first.
        gsap.registerPlugin(ScrollTrigger);

        /* ==================== CONSTANTS ==================== */
        const BACK_MODE: string = 'mirror';
        const N = 14;
        const C = 14;
        const R = 12;

        // A *wide* ring, not a small tight coil. The visible slice of a ring is
        // viewWidth / R of arc, so a big radius is what keeps neighbouring cards
        // side by side and nearly parallel instead of fanning out into a
        // scattered collage. It also has to be wide enough that cards still face
        // the camera at the edges of a wide window: a card at angle a is only
        // front-facing while sin(a) > R / camZ, so R² / camZ is the half-width of
        // usable band. With R = 12 the row fills even a 3:1 frame with front
        // faces. Camera distance and step angle scale with it, which keeps the
        // framed card size identical.
        const pitchPerRad = 0.35;
        const DIP_S = 2.0;
        const DIP_A = 0.5;
        const hoverLerpK = 0.12;

        // Scroll distance for the single pass
        const totalScroll = 3500;

        const CARD_W = 1.9;
        const CARD_H = (CARD_W * 712) / 1024;
        // Cards tile the ring edge to edge: the angular step is exactly the
        // card's own arc, so a card's side edges land on the same points as its
        // neighbours' and the surfaces stay tangent where they meet. The row then
        // reads as one continuous ribbon rather than a chain of separate tiles.
        const STEP_ANGLE = CARD_W / R;
        const STEP_ARC = CARD_W;

        /* ==================== MOTION (ONE PASS, BOTTOM -> TOP) ==================== */
        // The camera sits R + 7.8 away, so the ring's front — where the band is
        // read — is framed exactly as before; only the curvature behind it is
        // gentler.
        const CAM_Z = R + 7.8;
        const CAM_Z_CLOSE = R + 4.2;
        const FOV_DEG = 45;

        // Visible world height at the helix plane (z = 0).
        const VIEW_H = 2 * CAM_Z * Math.tan((FOV_DEG * Math.PI) / 180 / 2);
        // Angular span of the whole card row.
        const BAND_ANGLE = (C - 1) * STEP_ANGLE;

        // Angle of the ring's front point — the part of the band facing camera.
        const FRONT = Math.PI / 2;

        // The crossing is a rise of the whole band, not a climb along a steep
        // helix: that is what keeps the cards level with each other ("next to
        // each other", not stepped up and down). Sized so the row starts just
        // below the bottom edge and finishes just past the top one.
        const RISE = VIEW_H * 0.61;
        // How far the material flows along the band over the whole scroll.
        const FLOW_ANGLE = 0.6;

        // Wave centre: the dip lives at the front, so it lifts the centre of the
        // row while the row is on screen.
        const MID = FRONT;

        /* ==================== HELIX MATH ==================== */
        const dip = (a: number): number => {
          const d = (a - MID) / DIP_S;
          return DIP_A * Math.exp(-d * d);
        };

        // Vertical offset of the whole band for the current scroll progress:
        // this is what carries the row across the frame.
        let bandRise = 0;

        const helixY = (a: number): number => bandRise + a * pitchPerRad - dip(a);

        const helixDY = (a: number): number => {
          const d = (a - MID) / DIP_S;
          return pitchPerRad - DIP_A * Math.exp(-d * d) * ((-2 * d) / DIP_S);
        };

        /* ==================== SHADERS ==================== */
        const vertSrc = /* glsl */ `
          varying vec2 vUv;
          void main(){
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `;
        const fragSrc = /* glsl */ `
          precision highp float;
          uniform sampler2D map;
          uniform float uBackMode;
          uniform float uEdgeX;
          varying vec2 vUv;
          void main(){
            if (!gl_FrontFacing && uBackMode > 0.5) discard;
            vec2 w = fwidth(vUv);
            // The cards tile edge to edge, so their side edges stay hard: an
            // antialiased edge there would read as a seam between two panels.
            // Only the ribbon's long edges — and the two ends of the row, which
            // have no neighbour to hide the edge — are softened.
            float edgeX = uEdgeX > 0.5
              ? 1.0 - smoothstep(-w.x, w.x, abs(vUv.x - 0.5) - 0.5)
              : 1.0;
            float edgeY = 1.0 - smoothstep(-w.y, w.y, abs(vUv.y - 0.5) - 0.5);
            float alpha = edgeX * edgeY;
            if (alpha <= 0.0) discard;
            vec3 col = texture2D(map, vUv).rgb;
            gl_FragColor = vec4(col, alpha);
          }
        `;

        /* ==================== CANVAS TEXTURES ==================== */
        type CtxPair = readonly [HTMLCanvasElement, CanvasRenderingContext2D];
        const S = (w: number, h: number): CtxPair => {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          return [c, c.getContext('2d')!] as const;
        };

        function tex(draw: (ctx: CanvasRenderingContext2D) => void): CanvasTexture {
          const [c, x] = S(1024, 712);
          draw(x);
          const t = new THREE.CanvasTexture(c);
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          return t;
        }

        const F = (w: number, s: number): string =>
          `${w} ${s}px Inter, Helvetica, sans-serif`;
        const M = (w: number, s: number): string =>
          `${w} ${s}px "Space Mono", monospace`;

        function rr(
          x: CanvasRenderingContext2D,
          px: number, py: number, w: number, h: number, r: number
        ): void {
          x.beginPath();
          x.roundRect(px, py, w, h, r);
          x.fill();
        }

        const projectTextures: CanvasTexture[] = [
          tex((x) => {
            x.fillStyle = '#eef0ef'; x.fillRect(0, 0, 1024, 712);
            const g = x.createLinearGradient(330, 80, 690, 550);
            g.addColorStop(0, '#f65f00'); g.addColorStop(1, '#dc3c00');
            x.fillStyle = g; x.fillRect(330, 80, 360, 470);
            x.fillStyle = '#1c1c1c'; x.font = F(700, 96); x.fillText('AI', 78, 168);
            x.font = F(700, 62); x.textAlign = 'right';
            ['LOOSE', 'SKETCHES', 'TO', 'VISUALIZA-', 'TIONS'].forEach((l, i) =>
              x.fillText(l, 952, 150 + i * 66)
            );
            x.font = F(700, 120); x.fillText('©', 952, 660); x.textAlign = 'left';
            x.fillStyle = '#c93600'; x.fillRect(78, 560, 96, 120);
          }),
          tex((x) => {
            x.fillStyle = '#cfc6bd'; x.fillRect(0, 0, 1024, 712);
            const g = x.createLinearGradient(0, 0, 0, 712);
            g.addColorStop(0, '#d8cfc6'); g.addColorStop(1, '#bfb4a8');
            x.fillStyle = g; x.fillRect(600, 0, 424, 712);
            x.fillStyle = '#fff'; x.font = F(700, 64);
            ['WE BRING', 'IMAGINATION', 'TO LIFE.'].forEach((l, i) =>
              x.fillText(l, 70, 300 + i * 74)
            );
            x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(72, 560, 220, 58);
            x.font = M(400, 20); x.fillText('VIEW OUR STORY', 92, 596);
          }),
          tex((x) => {
            x.fillStyle = '#4d2f23'; x.fillRect(0, 0, 1024, 712);
            x.fillStyle = '#fff'; x.font = F(700, 148); x.textAlign = 'center';
            x.fillText('SWANK®', 512, 392);
            x.font = M(400, 22); x.fillStyle = '#d8c4b8'; x.textAlign = 'right';
            x.fillText('STYLE DRESSED', 944, 600);
            x.fillText('IN CHARACTER', 944, 632);
            x.textAlign = 'left';
          }),
          tex((x) => {
            x.fillStyle = '#f2f2f0'; x.fillRect(0, 0, 1024, 712);
            x.fillStyle = '#232323'; x.font = F(700, 56);
            x.fillText('Building the', 80, 130);
            x.fillText('future of music', 80, 192);
            const g = x.createRadialGradient(500, 470, 40, 500, 470, 330);
            g.addColorStop(0, '#d9d9d9'); g.addColorStop(1, '#9d9d9d');
            x.fillStyle = g; x.fillRect(200, 300, 620, 360);
            x.save(); x.translate(510, 470); x.rotate(-0.28);
            x.fillStyle = '#f05a00'; rr(x, -160, -62, 320, 124, 62);
            x.restore();
          }),
          tex((x) => {
            x.fillStyle = '#f2f2f0'; x.fillRect(0, 0, 1024, 712);
            const g = x.createRadialGradient(512, 760, 60, 512, 760, 520);
            g.addColorStop(0, '#8f8f8f'); g.addColorStop(1, '#5c5c5c');
            x.fillStyle = g; x.fillRect(0, 470, 1024, 242);
            x.fillStyle = '#3a3a3a';
            x.fillRect(452, 120, 120, 90);
            x.fillRect(452, 470, 120, 90);
            x.fillStyle = '#141414'; rr(x, 432, 190, 160, 300, 44);
            x.strokeStyle = '#3f3f3f'; x.lineWidth = 3;
            x.beginPath(); x.arc(512, 340, 52, 0, 7); x.stroke();
          }),
          tex((x) => {
            x.fillStyle = '#d982b8'; x.fillRect(0, 0, 1024, 712);
            const g = x.createLinearGradient(0, 0, 560, 712);
            g.addColorStop(0, '#e39cc6'); g.addColorStop(1, '#c66ba4');
            x.fillStyle = g; x.fillRect(0, 0, 560, 712);
            x.save(); x.translate(150, 400); x.rotate(-0.07);
            x.fillStyle = '#fff'; x.font = F(700, 74);
            ['NOVAGLAM', 'VINTAGE FASHION', 'STUDIO'].forEach((l, i) =>
              x.fillText(l, 0, i * 82)
            );
            x.restore();
            x.font = F(400, 88); x.fillText('↗', 900, 120);
          }),
          tex((x) => {
            x.fillStyle = '#f1f1ef'; x.fillRect(0, 0, 1024, 712);
            x.fillStyle = '#4a4a4a'; x.font = M(400, 24);
            x.fillText('MAN', 80, 90);
            x.fillText('WOMAN', 200, 90);
            x.fillText('KIDS', 360, 90);
            const g1 = x.createLinearGradient(0, 140, 0, 420);
            g1.addColorStop(0, '#e6ddd0'); g1.addColorStop(1, '#c9bda9');
            x.fillStyle = g1; x.fillRect(80, 140, 260, 280);
            const g2 = x.createLinearGradient(0, 120, 0, 440);
            g2.addColorStop(0, '#dfe0e0'); g2.addColorStop(1, '#b9bcbe');
            x.fillStyle = g2; x.fillRect(700, 120, 250, 320);
            x.fillStyle = '#232323'; x.font = F(600, 44);
            x.fillText('NEW —— TRENDS', 80, 500);
            x.font = F(700, 250); x.fillText('2026', 70, 700);
          }),
          tex((x) => {
            const g1 = x.createLinearGradient(0, 0, 1024, 712);
            g1.addColorStop(0, '#2e3335');
            g1.addColorStop(0.55, '#565e61');
            g1.addColorStop(1, '#8b9296');
            x.fillStyle = g1; x.fillRect(0, 0, 1024, 712);
            x.fillStyle = '#fff'; x.font = F(700, 62);
            x.fillText('DESIGNED FOR', 80, 170);
            x.fillText('EVERY NOTE', 80, 240);
            x.strokeStyle = '#fff'; x.lineWidth = 2;
            x.strokeRect(82, 300, 170, 54);
            x.font = M(400, 20); x.fillText('BUY NOW', 102, 334);
            const g2 = x.createLinearGradient(0, 520, 0, 712);
            g2.addColorStop(0, '#c9c4bc'); g2.addColorStop(1, '#a49e96');
            x.fillStyle = g2; x.fillRect(220, 520, 600, 192);
            x.strokeStyle = '#d6d9da'; x.lineWidth = 26;
            x.beginPath(); x.arc(700, 360, 96, Math.PI, 0); x.stroke();
            x.fillStyle = '#d6d9da';
            rr(x, 586, 330, 44, 110, 16);
            rr(x, 770, 330, 44, 110, 16);
            x.fillStyle = '#fff'; x.font = F(700, 34);
            x.fillText('SOUND', 840, 470);
            x.fillText('REDEFINED', 840, 510);
          }),
          tex((x) => {
            x.fillStyle = '#ece7df'; x.fillRect(0, 0, 1024, 712);
            x.fillStyle = '#1c1c1c'; x.font = M(400, 20);
            x.fillText('STUDIO NOTES', 70, 90);
            x.fillText('VOL. 04', 70, 116);
            x.font = F(400, 44);
            ['Process over', 'pretence.', 'Rough layouts', 'refined daily.'].forEach(
              (l, i) => x.fillText(l, 70, 200 + i * 52)
            );
            const g1 = x.createLinearGradient(300, 180, 300, 540);
            g1.addColorStop(0, '#e8b48d'); g1.addColorStop(1, '#c98d63');
            x.fillStyle = g1; x.fillRect(560, 180, 280, 180);
            const g2 = x.createLinearGradient(340, 400, 340, 580);
            g2.addColorStop(0, '#f05a00'); g2.addColorStop(1, '#c93600');
            x.fillStyle = g2; x.fillRect(600, 400, 260, 180);
            const g3 = x.createLinearGradient(100, 340, 100, 540);
            g3.addColorStop(0, '#d8d8d6'); g3.addColorStop(1, '#a9a9a7');
            x.fillStyle = g3; x.fillRect(70, 340, 160, 200);
          }),
          tex((x) => {
            x.fillStyle = '#f1efe9'; x.fillRect(0, 0, 1024, 712);
            x.fillStyle = '#f05a00'; x.font = F(700, 140);
            x.fillText('"', 70, 190);
            x.fillStyle = '#1c1c1c'; x.font = F(600, 44);
            ['Form follows', 'feeling — then', 'engineering', 'catches up.'].forEach(
              (l, i) => x.fillText(l, 70, 290 + i * 54)
            );
            x.strokeStyle = '#2e2e2e'; x.lineWidth = 2;
            x.beginPath(); x.moveTo(70, 520); x.lineTo(660, 520); x.stroke();
            const g = x.createLinearGradient(70, 580, 230, 680);
            g.addColorStop(0, '#f65f00'); g.addColorStop(1, '#c93600');
            x.fillStyle = g; x.fillRect(70, 580, 160, 100);
          }),
          tex((x) => {
            x.fillStyle = '#2a2a2a'; x.fillRect(0, 0, 1024, 712);
            x.strokeStyle = '#4a4a4a'; x.lineWidth = 1;
            for (let i = 0; i < 9; i++) {
              x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, 712); x.stroke();
            }
            for (let i = 0; i < 6; i++) {
              x.beginPath(); x.moveTo(0, i * 142); x.lineTo(1024, i * 142); x.stroke();
            }
            x.fillStyle = '#f65f00'; x.fillRect(256, 142, 256, 284);
            x.fillStyle = '#e9e0d6'; x.fillRect(512, 284, 256, 142);
            x.fillStyle = '#fff'; x.font = M(400, 16);
            x.fillText('GRID / 001', 70, 680);
            x.fillText('STRUCTURAL STUDY', 440, 680);
          }),
          tex((x) => {
            x.fillStyle = '#0a0a0f'; x.fillRect(0, 0, 1024, 712);
            x.strokeStyle = '#ff2e88'; x.lineWidth = 4;
            x.strokeRect(60, 60, 904, 592);
            x.strokeStyle = '#00e0ff'; x.lineWidth = 2;
            x.strokeRect(80, 80, 864, 552);
            x.fillStyle = '#ff2e88'; x.font = F(700, 140);
            x.fillText('NEON', 90, 260);
            x.fillStyle = '#00e0ff'; x.font = F(700, 140);
            x.fillText('DREAMS', 90, 410);
            x.fillStyle = '#fff'; x.font = M(400, 18);
            x.fillText('2026 — SERIES 02', 90, 640);
          }),
        ];

        /* ==================== SCENE ==================== */
        const host = rootRef.current.querySelector('#gl') as HTMLDivElement;
        if (!host) throw new Error('#gl container not found');

        const renderer: WebGLRenderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);

        const scene: Scene = new THREE.Scene();
        const cam: PerspectiveCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        cam.position.set(0, 0, 12);
        cam.lookAt(0, 0, 0);
        host.appendChild(renderer.domElement);

        /* ==================== BUILD CARDS ==================== */
        interface CardUserData { hoverScale: number }
        const cards: Mesh[] = [];

        // One shared, coil-shaped card. A flat plane would cut a chord across the
        // ring and meet its neighbours at a ~26° crease, so each card is built by
        // sampling the helix itself: the offsets are expressed in the frame at
        // the card's own centre, which means every shared edge lands on exactly
        // the same point as the neighbour's edge. Result: one continuous ribbon,
        // and the row still curves like paper instead of creasing like tiles.
        const planeGeo: PlaneGeometry = (() => {
          const geo = new THREE.PlaneGeometry(CARD_W, CARD_H, 32, 1);
          const L = Math.sqrt(R * R + pitchPerRad * pitchPerRad);
          const centre = new THREE.Vector3(R, 0, 0);
          const bX = new THREE.Vector3(0, -pitchPerRad, -R).normalize();
          const bY = new THREE.Vector3(0, R, -pitchPerRad).normalize();
          const bZ = new THREE.Vector3(1, 0, 0);
          const toLocal = new THREE.Matrix4().makeBasis(bX, bY, bZ).invert();
          const p = new THREE.Vector3();
          const pos = geo.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < pos.count; i++) {
            // t walks the coil. Note the leading minus: the local frame's X axis
            // (bX) runs opposite to increasing angle, so sampling +x here would
            // build every card mirrored — the artwork would read backwards and the
            // triangle winding would invert, making the outward face register as a
            // back face. Negating keeps X along the row and the faces front-facing.
            const t = -pos.getX(i) / R; // arc offset from the card centre
            const w = pos.getY(i); // offset across the band
            p.set(
              R * Math.cos(t) + (w * pitchPerRad * Math.sin(t)) / L,
              (w * R) / L,
              R * Math.sin(t) - (w * pitchPerRad * Math.cos(t)) / L
            )
              .sub(centre)
              .applyMatrix4(toLocal);
            pos.setXYZ(i, p.x, p.y, p.z);
          }
          pos.needsUpdate = true;
          return geo;
        })();

        for (let k = 0; k < N; k++) {
          const mat: ShaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
              // The row wraps past the 12 artworks, so the last cards reuse them.
              map: { value: projectTextures[k % projectTextures.length] },
              uBackMode: { value: BACK_MODE === 'transparent' ? 1.0 : 0.0 },
              // Only the ends of the row have an exposed side edge; a couple of
              // spare cards are flagged too, since culling can move the end.
              uEdgeX: { value: k < 2 || k >= N - 2 ? 1.0 : 0.0 },
            },
            vertexShader: vertSrc,
            fragmentShader: fragSrc,
            transparent: true,
            side: THREE.DoubleSide,
          });
          const m: Mesh = new THREE.Mesh(planeGeo, mat);
          (m.userData as CardUserData).hoverScale = 1.0;
          m.frustumCulled = false;
          scene.add(m);
          cards.push(m);
        }

        /* ==================== ADMIN IMAGES ==================== */
        // Cards whose image is set in /admin load a texture over the procedural
        // artwork; the rest keep the generated fallback.
        const loadedTextures: THREE.Texture[] = [];
        const imageLoader = new THREE.TextureLoader();
        imageLoader.setCrossOrigin('anonymous');
        helixImages.slice(0, projectTextures.length).forEach((src, j) => {
          const url = (src ?? '').trim();
          if (!url) return;
          imageLoader.load(
            url,
            (texture) => {
              if (cancelled) { texture.dispose(); return; }
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.anisotropy = 8;
              // Every card showing this artwork slot picks up the real image.
              cards.forEach((card, k) => {
                if (k % projectTextures.length !== j) return;
                const mat = card.material as ShaderMaterial;
                mat.uniforms.map.value = texture;
                mat.needsUpdate = true;
              });
              loadedTextures.push(texture);
            },
            undefined,
            () => { /* keep the procedural art if the image fails to load */ },
          );
        });

        /* ==================== wrapCardOnHelix ==================== */
        const _X = new THREE.Vector3();
        const _Y = new THREE.Vector3();
        const _Z = new THREE.Vector3();
        const _M = new THREE.Matrix4();

        function wrapCardOnHelix(sArcStart: number): void {
          for (let col = 0; col < C; col++) {
            const a = (sArcStart + (C - 1 - col) * STEP_ARC) / R;
            const sa = Math.sin(a);
            const ca = Math.cos(a);
            const yp = helixDY(a);

            // Stable basis vectors
            _X.set(R * sa, -yp, -R * ca).normalize();
            _Y.set(yp * sa, R, -yp * ca).normalize();
            _Z.set(ca, 0, sa);

            _M.makeBasis(_X, _Y, _Z);
            const card = cards[col];
            // Draw only cards whose face actually points at the camera. A card's
            // normal is radial, so dot(normal, toCamera) > 0 reduces to
            // sin(a) > R / camZ — and since the camera dollies, the cut moves with
            // it. This is what stops a wide window from reaching round to the
            // ring's back and drawing mirrored back faces, and it keeps the band's
            // ends out of frame at both ends of the sweep. A card crossing the cut
            // is exactly edge-on, so nothing pops.
            card.visible = Math.sin(a) > R / camZ;
            card.quaternion.setFromRotationMatrix(_M);
            card.position.set(R * ca, helixY(a), R * sa);
            card.scale.setScalar((card.userData as CardUserData).hoverScale ?? 1);
          }
        }

        /* ==================== POINTER / RAYCAST ==================== */
        const pointer = new THREE.Vector2(99, 99);
        let pointerActive = false;
        const raycaster: Raycaster = new THREE.Raycaster();
        let hoveredCard: Mesh | null = null;

        const onPointerMove = (e: PointerEvent): void => {
          const rect = host.getBoundingClientRect();
          pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          pointerActive = true;
        };
        const onPointerLeave = (): void => {
          pointerActive = false;
          hoveredCard = null;
        };
        host.addEventListener('pointermove', onPointerMove);
        host.addEventListener('pointerleave', onPointerLeave);

        /* ==================== CAMERA DOLLY (pushes in for the twist) ==================== */
        // The dolly is deepest mid-sweep, where the band is on screen and the
        // row is read close up.
        let camZ = CAM_Z;

        /* ==================== HEADLINE PARALLAX ==================== */
        // Declared before the ScrollTrigger below on purpose. A page that loads
        // already scrolled into this pinned section fires onUpdate during
        // create(), which reaches updateHeadline() straight away — if the words
        // were still uninitialised that throws and the whole effect never boots.
        const wordA = rootRef.current.querySelector('.word-a') as HTMLElement | null;
        const wordB = rootRef.current.querySelector('.word-b') as HTMLElement | null;

        function updateHeadline(): void {
          const p = scrollProgress;
          const driftMax = Math.min(window.innerWidth * 0.4, 560);
          // Both words start centered so nothing is clipped at rest, then they
          // drift apart as the section scrolls.
          const xA = p * driftMax;
          const xB = -p * driftMax;
          const yA = -p * window.innerHeight * 0.08;
          const yB = p * window.innerHeight * 0.06;
          if (wordA) wordA.style.transform = `translate3d(${xA}px, ${yA}px, 0)`;
          if (wordB) wordB.style.transform = `translate3d(${xB}px, ${yB}px, 0)`;
        }

        /* ==================== SCROLL TRIGGER ==================== */
        const section = rootRef.current;
        let scrollProgress = 0;

        ScrollTrigger.refresh();

        const st = ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: `+=${totalScroll}`,
          pin: true,
          anticipatePin: 1,
          onUpdate: (self: ScrollTriggerInstance) => {
            scrollProgress = self.progress;
            renderTick();
          },
        });

        /* ==================== renderTick ==================== */
        function renderTick(): void {
          // Push in toward the ribbon for the twist at the middle of the sweep.
          const twist = Math.sin(Math.PI * scrollProgress); // 0 -> 1 -> 0
          const targetZ = CAM_Z - (CAM_Z - CAM_Z_CLOSE) * twist;
          camZ += (targetZ - camZ) * 0.09;
          cam.position.z = camZ;

          // One sweep, bottom to top: the band starts below the bottom edge and
          // has cleared the top edge by the end of the scroll, while its cards
          // flow along the ring. Purely a function of scroll progress, so it
          // holds still whenever the page does.
          bandRise = (scrollProgress - 0.5) * RISE;
          const base =
            FRONT - BAND_ANGLE / 2 - FLOW_ANGLE / 2 + scrollProgress * FLOW_ANGLE;

          wrapCardOnHelix(base * R);

          if (pointerActive) {
            raycaster.setFromCamera(pointer, cam);
            const hits = raycaster.intersectObjects(
              cards.filter((c) => c.visible),
              false
            );
            hoveredCard = hits.length > 0 ? (hits[0].object as Mesh) : null;
          }

          for (let k = 0; k < N; k++) {
            const cur = (cards[k].userData as CardUserData).hoverScale ?? 1.0;
            const target = cards[k] === hoveredCard ? 1.12 : 1.0;
            (cards[k].userData as CardUserData).hoverScale =
              cur + (target - cur) * hoverLerpK;
          }
          updateHeadline();
        }

        /* ==================== WARM-UP ==================== */
        const wasVisible = cards.map((m) => m.visible);
        const warmUp = (): void => {
          cards.forEach((m) => { m.visible = true; });
          renderer.compile(scene, cam);
          renderer.render(scene, cam);
          cards.forEach((m, i) => { m.visible = wasVisible[i]; });
          renderer.clear();
        };

        /* ==================== MAIN RENDER LOOP ==================== */
        const tickerCb = (): void => {
          renderTick();
          renderer.render(scene, cam);
        };
        gsap.ticker.add(tickerCb);

        /* ==================== RESIZE ==================== */
        function size(): void {
          const w = host.clientWidth;
          const h = host.clientHeight;
          if (!w || !h) return;
          renderer.setSize(w, h);
          cam.aspect = w / h;
          cam.updateProjectionMatrix();
          updateHeadline();
        }
        size();

        // The first paint can still be mid-layout (the host briefly measures as a
        // thin strip), so keep the drawing buffer tied to the host rather than
        // trusting a single measurement.
        let sizeRaf = 0;
        const queueSize = (): void => {
          cancelAnimationFrame(sizeRaf);
          sizeRaf = requestAnimationFrame(() => size());
        };
        const ro = new ResizeObserver(queueSize);
        ro.observe(host);

        const onResize = (): void => {
          size();
          ScrollTrigger.refresh();
        };
        window.addEventListener('resize', onResize);

        /* ==================== BOOT ==================== */
        warmUp();
        setTimeout(() => warmUp(), 120);
        renderTick();
        setTimeout(() => ScrollTrigger.refresh(), 100);

        cleanupFn = () => {
          cancelled = true;
          window.removeEventListener('resize', onResize);
          ro.disconnect();
          cancelAnimationFrame(sizeRaf);
          host.removeEventListener('pointermove', onPointerMove);
          host.removeEventListener('pointerleave', onPointerLeave);
          gsap.ticker.remove(tickerCb);
          st.kill();
          renderer.dispose();
          planeGeo.dispose();
          cards.forEach((c) =>
            (c.material as ShaderMaterial).dispose()
          );
          projectTextures.forEach((t) => t.dispose());
          loadedTextures.forEach((t) => t.dispose());
          if (host.contains(renderer.domElement))
            host.removeChild(renderer.domElement);
        };
      } catch (err) {
        console.error('[trionn-ribbon] Failed to initialize:', err);
      }
    })();

    return () => {
      cancelled = true;
      if (cleanupFn) cleanupFn();
      if (document.head.contains(linkPreconnect))
        document.head.removeChild(linkPreconnect);
      if (document.head.contains(linkFonts))
        document.head.removeChild(linkFonts);
    };
  }, [helixImages]);

  return (
    <>
      <style>{styles}</style>
      <div ref={rootRef} className="trionn-ribbon-root">
        <div className="headline">
          <h1 className="word-a">{heading.text}{heading.accent ? <>{' '}<span className="accent-word">{heading.accent}</span></> : null}</h1>
          {wordB ? <h1 className="word-b">{wordB}</h1> : null}
        </div>
        <div id="gl" />
      </div>
    </>
  );
}
