'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type SiteCursorProps = {
  targetSelector?: string;
  accent?: string;
  hideDefaultCursor?: boolean;
};

/**
 * Site cursor — a live "blueprint reticle":
 *  - an accent dot pinned to the pointer,
 *  - a dashed ring that trails on a spring and never stops rotating,
 *    carrying a small satellite dot with it,
 *  - the ring swells and its label chip blurs in over tagged elements,
 *  - every click leaves a sonar ripple behind.
 * Fine pointers only; touch devices keep their native behaviour.
 */
export default function SiteCursor({
  targetSelector = '.cursor-target',
  accent = '#ffffff',
  hideDefaultCursor = true,
}: SiteCursorProps) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const reticleRef = useRef<HTMLSpanElement>(null);
  const rippleLayerRef = useRef<HTMLSpanElement>(null);
  const labelWrapRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setHost(finePointer.matches ? document.body : null);
    update();
    finePointer.addEventListener('change', update);
    return () => finePointer.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const dot = dotRef.current;
    const reticle = reticleRef.current;
    const rippleLayer = rippleLayerRef.current;
    const labelWrap = labelWrapRef.current;
    const label = labelRef.current;
    const layer = layerRef.current;
    if (!host || !dot || !reticle || !rippleLayer || !labelWrap || !label) return undefined;

    // Native <dialog> modals render in the browser's top layer, which paints
    // above every z-index — this cursor layer included. Promoting the layer to
    // the top layer as well (Popover API) keeps the cursor visible over open
    // dialogs; a dialog opening or closing triggers a re-promotion so the
    // cursor always sits above the newest top-layer entry.
    const canPopover = !!layer && typeof layer.showPopover === 'function';
    const dialogSignature = () =>
      [...document.querySelectorAll('dialog[open]')]
        .map((dialog) => dialog.getAttribute('aria-label') || '')
        .join('|');
    const promote = () => {
      if (!canPopover || !layer) return;
      try {
        if (layer.matches(':popover-open')) layer.hidePopover();
      } catch { /* not currently in the top layer */ }
      try {
        layer.showPopover();
      } catch { /* popover API unavailable for this element */ }
    };
    let dialogSig = dialogSignature();
    promote();
    const layerObserver = new MutationObserver(() => {
      const sig = dialogSignature();
      if (sig !== dialogSig) {
        dialogSig = sig;
        promote();
      }
    });
    layerObserver.observe(document.body, { childList: true, subtree: true, attributeFilter: ['open'] });

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const style = document.createElement('style');
    document.head.appendChild(style);

    const baseCss = `
      @keyframes site-cursor-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes site-cursor-ripple {
        from { transform: translate(-50%, -50%) scale(0.35); opacity: 0.5; }
        to { transform: translate(-50%, -50%) scale(3.4); opacity: 0; }
      }
      .site-cursor-spin { animation: site-cursor-spin 5s linear infinite; transform-origin: center; }
      .site-cursor-ripple {
        position: absolute;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 1.5px solid ${accent};
        pointer-events: none;
        animation: site-cursor-ripple 480ms ease-out forwards;
      }
      .site-cursor-label {
        display: inline-block;
        white-space: nowrap;
        border-radius: 999px;
        background: ${accent};
        color: #000;
        padding: 5px 10px;
        font-size: 9px;
        line-height: 1;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        opacity: 0;
        filter: blur(6px);
        transform: scale(0.85);
        transform-origin: top left;
        transition: opacity 180ms ease, transform 260ms cubic-bezier(0.16, 1, 0.3, 1), filter 220ms ease;
      }
      .site-cursor-label[data-on='1'] {
        opacity: 1;
        filter: blur(0);
        transform: scale(1);
      }
      @media (prefers-reduced-motion: reduce) {
        .site-cursor-spin { animation: none; }
        .site-cursor-ripple { animation: none; opacity: 0; }
      }
    `;
    const setCss = (hideSystem: boolean) => {
      const css = hideSystem ? `${baseCss} html, html * { cursor: none !important; }` : baseCss;
      if (style.textContent !== css) style.textContent = css;
    };
    setCss(false);

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, inside: false, pressed: false };
    const caught = { x: pointer.x, y: pointer.y };
    let reticleScale = 1;
    let target: Element | null = null;
    let lastLabel = '';
    let raf = 0;
    let last = 0;

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;

      // A softer, slower trail than the dot — the reticle "chases" the pointer.
      const follow = reduce ? 1 : 1 - Math.exp(-dt * 9);
      caught.x += (pointer.x - caught.x) * follow;
      caught.y += (pointer.y - caught.y) * follow;

      const scaleTarget = pointer.pressed ? 0.82 : target ? 1.5 : 1;
      reticleScale += (scaleTarget - reticleScale) * (1 - Math.exp(-dt * 13));

      dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`;
      reticle.style.transform = `translate3d(${caught.x.toFixed(2)}px, ${caught.y.toFixed(2)}px, 0) translate(-50%, -50%) scale(${reticleScale.toFixed(3)})`;

      const text = target ? target.getAttribute('data-cursor-label') || '' : '';
      if (text !== lastLabel) {
        label.textContent = text;
        lastLabel = text;
      }
      label.dataset.on = text ? '1' : '0';
      labelWrap.style.transform = `translate3d(${Math.round(pointer.x + 20)}px, ${Math.round(pointer.y + 22)}px, 0)`;

      const settling =
        Math.abs(pointer.x - caught.x) + Math.abs(pointer.y - caught.y) > 0.4 ||
        Math.abs(reticleScale - scaleTarget) > 0.005;
      if (pointer.inside || settling) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    const show = (visible: boolean) => {
      const value = visible ? '1' : '0';
      dot.style.opacity = value;
      reticle.style.opacity = value;
      if (!visible) label.dataset.on = '0';
    };

    const spawnRipple = (x: number, y: number) => {
      while (rippleLayer.children.length > 5) rippleLayer.firstElementChild?.remove();
      const ripple = document.createElement('span');
      ripple.className = 'site-cursor-ripple';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.addEventListener('animationend', () => ripple.remove());
      rippleLayer.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 700);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!pointer.inside) {
        pointer.inside = true;
        caught.x = pointer.x;
        caught.y = pointer.y;
        setCss(hideDefaultCursor);
        show(true);
      }
      target = (event.target as Element | null)?.closest?.(targetSelector) ?? null;
      wake();
    };
    const onDown = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      pointer.pressed = true;
      if (!reduce) spawnRipple(event.clientX, event.clientY);
      wake();
    };
    const onUp = () => {
      pointer.pressed = false;
      wake();
    };
    const onLeave = () => {
      pointer.inside = false;
      pointer.pressed = false;
      target = null;
      setCss(false);
      show(false);
    };
    const onScroll = () => {
      if (!pointer.inside) return;
      const el = document.elementFromPoint(pointer.x, pointer.y);
      target = el?.closest(targetSelector) ?? null;
      wake();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      layerObserver.disconnect();
      try {
        layer?.hidePopover();
      } catch { /* already closed */ }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('scroll', onScroll, { capture: true });
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      setCss(false);
      style.remove();
    };
  }, [host, targetSelector, accent, hideDefaultCursor]);

  if (!host) return null;

  return createPortal(
    <div
      ref={layerRef}
      popover="manual"
      className="pointer-events-none fixed inset-0 z-[2147483647]"
      style={{
        mixBlendMode: 'difference',
        margin: 0,
        border: 'none',
        padding: 0,
        background: 'transparent',
        width: '100vw',
        height: '100vh',
        maxWidth: 'none',
        maxHeight: 'none',
        overflow: 'visible',
      }}
      aria-hidden="true"
    >
      <span ref={rippleLayerRef} className="absolute inset-0 overflow-hidden" />
      <span
        ref={reticleRef}
        className="absolute top-0 left-0 opacity-0 will-change-transform"
        style={{ width: 46, height: 46 }}
      >
        <svg className="site-cursor-spin" width="46" height="46" viewBox="0 0 46 46" fill="none">
          <circle cx="23" cy="23" r="18" stroke={accent} strokeWidth="1.4" strokeDasharray="3 8" strokeLinecap="round" opacity="0.9" />
          <circle cx="23" cy="5" r="2.3" fill={accent} />
        </svg>
      </span>
      <span
        ref={dotRef}
        className="absolute top-0 left-0 rounded-full opacity-0 will-change-transform"
        style={{ width: 5, height: 5, backgroundColor: accent }}
      />
      <span ref={labelWrapRef} className="absolute top-0 left-0 will-change-transform">
        <span ref={labelRef} className="site-cursor-label" data-on="0" />
      </span>
    </div>,
    host
  );
}
