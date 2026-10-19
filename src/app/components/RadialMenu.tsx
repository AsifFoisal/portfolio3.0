'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSiteContent } from '../data/content-context';
import './RadialMenu.css';

// Ring geometry from the Radial Concentric Navigation design. Rings fan out from
// the hub between HUB_RADIUS and OUTER_RADIUS in equal-width bands; a navigation
// with more items simply gets more (and thinner) rings. The original 7-ring
// design comes out to the same radii when there are 7 links.
const HUB_RADIUS = 70;
const OUTER_RADIUS = 375;
const RING_FILLS = ['#fff5f4', '#ffe9e8', '#ffd4d6', '#ffb9bd', '#ff969d', '#ff757f', '#ff4c4e'];

// The hub circle sits at (520, 160) inside the 680x680 canvas.
const HUB_X = 520;
const HUB_Y = 160;

function arcPath(radius: number) {
  return `M ${HUB_X},${HUB_Y} m -${radius},0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`;
}

/** Split the radius band into `count` equal concentric rings. */
function ringStyles(count: number) {
  const total = Math.max(1, count);
  const band = (OUTER_RADIUS - HUB_RADIUS) / total;
  return Array.from({ length: total }, (_, index) => {
    const innerEdge = HUB_RADIUS + band * index;
    const radius = HUB_RADIUS + band * (index + 1);
    const t = total === 1 ? 1 : index / (total - 1);
    return {
      radius,
      // Labels ride the middle of each band.
      pathRadius: (innerEdge + radius) / 2,
      fill: RING_FILLS[Math.round(t * (RING_FILLS.length - 1))],
      fontSize: 11 + t * 2,
    };
  });
}

type RadialMenuProps = {
  onClose: () => void;
  onNavigate: (href: string) => void;
};

export default function RadialMenu({ onClose, onNavigate }: RadialMenuProps) {
  const content = useSiteContent();
  const rings = useMemo(() => {
    const styles = ringStyles(content.navigation.length);
    return content.navigation.map((link, index) => ({ ...link, ...styles[index] }));
  }, [content.navigation]);

  const [open, setOpen] = useState(false);
  const closingRef = useRef(false);

  const requestClose = useCallback(
    (after?: () => void) => {
      if (closingRef.current) return;
      closingRef.current = true;
      setOpen(false);
      window.setTimeout(() => {
        if (after) after();
        else onClose();
      }, 620);
    },
    [onClose]
  );

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [requestClose]);

  // Click anywhere that is not a ring (the page behind, or the empty space the
  // menu occupies) to dismiss it.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('.ring-group')) return;
      requestClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [requestClose]);

  return (
    <div
      className={`menu-container radial-shadow ${open ? 'active' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      <svg viewBox="0 0 680 680" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <filter id="ring-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="-2" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.25" />
          </filter>
          {rings.map((ring, index) => (
            <path key={ring.href} id={`radial-path-${index}`} d={arcPath(ring.pathRadius)} />
          ))}
        </defs>

        {[...rings].reverse().map((ring, reverseIndex) => (
          <g
            key={ring.href}
            className="ring-group"
            role="link"
            tabIndex={-1}
            aria-label={ring.label}
            onClick={() => requestClose(() => onNavigate(ring.href))}
          >
            <circle cx={HUB_X} cy={HUB_Y} r={ring.radius} fill={ring.fill} filter="url(#ring-shadow)" className="ring-path" />
            <text className="ring-text" fontSize={ring.fontSize}>
              <textPath href={`#radial-path-${rings.length - 1 - reverseIndex}`} startOffset="12.5%" textAnchor="middle">
                {ring.label.toUpperCase()}
              </textPath>
            </text>
          </g>
        ))}

        <g className="ring-group" onClick={() => requestClose()}>
          <circle cx={HUB_X} cy={HUB_Y} r={HUB_RADIUS} fill="#fdf4f3" filter="url(#ring-shadow)" className="ring-path" />
          <g transform="translate(499, 146)" className="cursor-pointer">
            <rect x="0" y="0" width="30" height="5.5" rx="2.75" fill="#323b44" />
            <rect x="0" y="11" width="42" height="5.5" rx="2.75" fill="#323b44" />
            <rect x="20" y="22" width="22" height="5.5" rx="2.75" fill="#323b44" />
          </g>
        </g>
      </svg>
    </div>
  );
}
