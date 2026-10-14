import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import lottie from "lottie-web";
import type { AnimationItem } from "lottie-web";
import pushLoaderRaw from "./assets/push-loader.json?raw";

/* ------------------------------------------------------------------ */
/*  The original huyml.co "push loader": Huy Phan's character is a     */
/*  Lottie animation ("Ava - push_lottie"). He is glued to the edge    */
/*  of a black panel and shoves it across the screen; the panel's      */
/*  progress scrubs the Lottie frames, so his legs only step while     */
/*  the panel actually moves — exactly like the original.              */
/*                                                                     */
/*  Timeline stops, frame mapping and colours are taken from the       */
/*  original PushLoaderReveal component on huyml.co.                   */
/* ------------------------------------------------------------------ */

const PUSH_DATA = JSON.parse(pushLoaderRaw);
// Note: the JSON's in-point is frame 30, but lottie-web's goToAndStop
// counts frames relative to that in-point — so we scrub 0 → 100.

// baseStops from the original loader
const STOPS = [
  { progress: 0.3, move: 0.65, hold: 0.16 },
  { progress: 0.6, move: 0.72, hold: 0.2 },
  { progress: 1.28, move: 1.46, hold: 0 },
];
const FINAL_PROGRESS = 1.28;

const power2InOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const power3In = (t: number) => t * t * t * t; // GSAP power3 = quart

interface Segment {
  from: number;
  to: number;
  start: number;
  move: number;
  hold: number;
  ease: (t: number) => number;
}

const SEGMENTS: Segment[] = (() => {
  let time = 0;
  let prev = 0;
  return STOPS.map((s, i) => {
    const seg: Segment = {
      from: prev,
      to: s.progress,
      start: time,
      move: s.move,
      hold: s.hold,
      ease: i === STOPS.length - 1 ? power3In : power2InOut,
    };
    time += s.move + s.hold;
    prev = s.progress;
    return seg;
  });
})();

const PUSH_SECONDS =
  SEGMENTS[SEGMENTS.length - 1].start +
  SEGMENTS[SEGMENTS.length - 1].move +
  SEGMENTS[SEGMENTS.length - 1].hold;

/** Panel progress at time t (seconds), with the original's heave-and-hold rhythm. */
function progressAt(t: number): number {
  for (const s of SEGMENTS) {
    if (t <= s.start + s.move) {
      const k = Math.min(Math.max((t - s.start) / s.move, 0), 1);
      return s.from + (s.to - s.from) * s.ease(k);
    }
    if (t <= s.start + s.move + s.hold) return s.to;
  }
  return FINAL_PROGRESS;
}

/** Progress → Lottie frame, mirroring the original's scrub mapping. */
const FRAME_POINTS: Array<[number, number]> = [
  [0, 0],
  [0.3, 30],
  [0.6, 60],
  [1.28, 100],
];

function frameAt(p: number): number {
  for (let i = 1; i < FRAME_POINTS.length; i++) {
    const [p1, f1] = FRAME_POINTS[i];
    if (p <= p1) {
      const [p0, f0] = FRAME_POINTS[i - 1];
      return f0 + ((p - p0) / (p1 - p0)) * (f1 - f0);
    }
  }
  return 100;
}

// The character's real bounds inside the square Lottie stage
// (measured from the artwork): hands reach 88.5% across, he spans
// 56.7% of the width and his centre sits at 52.2% of the height.
const CHAR_WIDTH_FRAC = 0.567;

const HOLD_AFTER_PUSH_MS = 600; // the original's PANEL_EXIT_DELAY
const EXIT_MS = 950;

function Loader({ onFinish }: { onFinish: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const manRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const finishedRef = useRef(false);
  const [exiting, setExiting] = useState(false);

  const beginExit = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    setExiting(true);
    const t = window.setTimeout(onFinish, EXIT_MS);
    timersRef.current.push(t);
  }, [onFinish]);

  useEffect(() => {
    let anim: AnimationItem | null = null;
    if (stageRef.current) {
      anim = lottie.loadAnimation({
        container: stageRef.current,
        renderer: "svg",
        loop: false,
        autoplay: false,
        animationData: PUSH_DATA,
      });
      anim.goToAndStop(0, true);
    }

    let lastFrame = -1;
    const start = performance.now();

    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const p = progressAt(t);

      const panel = panelRef.current;
      if (panel) {
        const vw = window.innerWidth;
        const manW = manRef.current?.offsetWidth ?? 420;
        // The character's hands (pushing edge) sit at the Lottie's far-right
        // side of the character's overall bbox. So the man peeks just off the
        // left of the panel when it starts, stays glued to the edge as it
        // moves, and exits cleanly to the right.
        const charW = manW * CHAR_WIDTH_FRAC;
        // progress 0 → panel fully covers the screen (edge at 0px left).
        // progress FINAL → panel edge at vw + charW (man fully off-screen).
        const finalEdge = vw + charW + 40;
        const edgeX = (p / FINAL_PROGRESS) * finalEdge;
        panel.style.transform = `translate3d(${edgeX}px, 0, 0)`;
      }

      // scrub the man: legs step only while the panel moves
      const frame = frameAt(p);
      if (anim && Math.abs(frame - lastFrame) > 0.04) {
        lastFrame = frame;
        anim.goToAndStop(frame, true);
      }

      if (t < PUSH_SECONDS) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        const id = window.setTimeout(beginExit, HOLD_AFTER_PUSH_MS);
        timersRef.current.push(id);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      timersRef.current.forEach(clearTimeout);
      anim?.destroy();
    };
  }, [beginExit]);

  return (
    <div
      onClick={beginExit}
      className="fixed inset-0 z-50 cursor-pointer overflow-hidden bg-white"
      style={{
        transform: exiting ? "translateY(-100%)" : "translateY(0)",
        transition: exiting
          ? `transform ${EXIT_MS}ms cubic-bezier(0.76, 0, 0.24, 1)`
          : undefined,
      }}
      role="status"
      aria-label="Loading"
    >
      {/* ——— Revealed layer: the name, waiting under the black ——— */}
      <div className="absolute inset-0 flex items-center justify-center bg-white">
        <h1
          className="font-editorial text-center font-medium text-[#FF4949] select-none"
          style={{
            fontSize: "clamp(4.6rem, 13.5vw, 12.5rem)",
            lineHeight: 0.94,
            letterSpacing: "-0.015em",
          }}
        >
          HUY
          <br />
          PHAN
        </h1>
      </div>

      {/* ——— Black panel being pushed (the man rides its left edge) ——— */}
      <div
        ref={panelRef}
        className="absolute inset-0 bg-[#050505] will-change-transform"
        style={{ transform: "translate3d(0, 0, 0)" }}
      >
        {/* the pusher — the original Lottie character, legs and all */}
        <div
          ref={manRef}
          className="absolute top-1/2"
          style={{
            right: "100%",
            width: "min(700px, 80vh, 95vw)",
            aspectRatio: "1 / 1",
            // hands land exactly on the panel edge, body centred vertically.
            // The character's hands sit at 88.5% of the stage width, so shift him
            // right by the remaining 11.5% to bring palms flush with the edge.
            transform: "translate(11.5%, -52%)",
          }}
        >
          <div ref={stageRef} className="h-full w-full [&>svg]:block" aria-hidden />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Minimal portfolio underneath, revealed when the loader slides up   */
/* ------------------------------------------------------------------ */

const PROJECTS = [
  { tag: "Photography — portfolio", title: "Mathijs Hanenkamp", note: "Bringing Mathijs's vision and personality to his portfolio." },
  { tag: "Fashion — campaign", title: "Noir Capsule", note: "Narrative-heavy campaign page with cinematic motion." },
  { tag: "Product — launch", title: "Vector Grid", note: "A launch story focused on precision, rhythm and lightweight interactions." },
  { tag: "Archive — collection", title: "Memory Atlas", note: "Infinite-style archive experience that keeps context while browsing." },
  { tag: "Agency — case study", title: "House of Noise", note: "Case-study stack designed around outcomes, process and visual evidence." },
  { tag: "Creative — direction", title: "Future Echo", note: "Art direction showcase with layered type and high-contrast hierarchy." },
];

export default function App() {
  const [loading, setLoading] = useState(true);
  const [loaderKey, setLoaderKey] = useState(0);

  const replay = useCallback(() => {
    window.scrollTo({ top: 0 });
    setLoaderKey((k) => k + 1);
    setLoading(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#f3f1ec] text-[#111]">
      {loading && <Loader key={loaderKey} onFinish={() => setLoading(false)} />}

      {/* header */}
      <header className="flex items-center justify-between px-5 py-5 sm:px-10">
        <span className="font-editorial text-lg font-semibold tracking-tight">
          HUY PHAN<sup className="align-super text-[9px]">®</sup>
        </span>
        <nav className="hidden items-center gap-8 text-[13px] font-medium text-neutral-600 sm:flex">
          <a href="#work" className="transition-colors hover:text-black">Work</a>
          <a href="#about" className="transition-colors hover:text-black">About</a>
          <a href="#contact" className="transition-colors hover:text-black">Contact</a>
        </nav>
        <span className="flex items-center gap-2 text-[13px] font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Available for work
        </span>
      </header>

      {/* hero */}
      <section id="about" className="px-5 pt-10 pb-16 sm:px-10 sm:pt-16">
        <p className="reveal-item text-[13px] font-medium tracking-wide text-neutral-500 uppercase" style={{ animationDelay: "0.05s" }}>
          Award-winning designer — folio 2026
        </p>
        <h2
          className="font-editorial reveal-item mt-4 font-medium"
          style={{ fontSize: "clamp(3rem, 9vw, 8.5rem)", lineHeight: 0.98, animationDelay: "0.12s" }}
        >
          HUY PHAN
          <br />
          <span className="text-[#FF4949] italic">designs &amp; pushes</span>
          <br />
          pixels forward.
        </h2>
        <div className="reveal-item mt-10 flex flex-wrap items-center gap-4" style={{ animationDelay: "0.2s" }}>
          <button
            onClick={replay}
            className="group flex items-center gap-2.5 rounded-full bg-black px-6 py-3.5 text-sm font-medium text-white transition-transform duration-300 hover:scale-[1.04] active:scale-95"
          >
            <RotateCcw className="h-4 w-4 transition-transform duration-500 group-hover:-rotate-180" />
            Replay the loader
          </button>
          <a href="#work" className="flex items-center gap-1.5 rounded-full border border-black/20 px-6 py-3.5 text-sm font-medium transition-colors hover:bg-black hover:text-white">
            Selected work <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* work */}
      <section id="work" className="border-t border-black/10 px-5 sm:px-10">
        {PROJECTS.map((p) => (
          <a
            key={p.title}
            href="#work"
            onClick={(e) => e.preventDefault()}
            className="group grid grid-cols-1 gap-1 border-b border-black/10 py-7 transition-colors sm:grid-cols-[1fr_1.4fr_1fr_auto] sm:items-baseline sm:gap-6 sm:py-9"
          >
            <span className="text-[12px] font-medium tracking-wide text-neutral-500 uppercase">{p.tag}</span>
            <span className="font-editorial text-3xl font-medium transition-transform duration-300 group-hover:translate-x-2 sm:text-4xl">{p.title}</span>
            <span className="max-w-sm text-sm leading-relaxed text-neutral-500">{p.note}</span>
            <ArrowUpRight className="hidden h-6 w-6 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-[#FF4949] sm:block" />
          </a>
        ))}
      </section>

      <footer id="contact" className="flex flex-wrap items-center justify-between gap-3 px-5 py-10 text-[13px] text-neutral-500 sm:px-10">
        <span>© 2026 Huy Phan — Loader recreated from huyml.co</span>
        <button onClick={replay} className="flex items-center gap-1.5 font-medium text-black hover:text-[#FF4949]">
          <RotateCcw className="h-3.5 w-3.5" /> Watch him push again
        </button>
      </footer>
    </div>
  );
}
