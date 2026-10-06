'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { navigation } from '../data/portfolio';
import './RadialMenu.css';

// Ring geometry from the Radial Concentric Navigation design, inner -> outer.
// All rings share one startOffset (the path begins at the 9 o'clock point,
// running counterclockwise) so every label is centered on the same lower-left
// radial line. Fills follow the site's red accent, lightest at the hub.
const RING_STYLES = [
  { radius: 113, fill: '#fff5f4', fontSize: 11 },
  { radius: 156, fill: '#ffe9e8', fontSize: 11 },
  { radius: 200, fill: '#ffd4d6', fontSize: 11.5 },
  { radius: 243, fill: '#ffb9bd', fontSize: 12 },
  { radius: 286, fill: '#ff969d', fontSize: 12 },
  { radius: 330, fill: '#ff757f', fontSize: 12.5 },
  { radius: 375, fill: '#ff505b', fontSize: 13 },
].map((ring) => ({ ...ring, offset: '12.5%' }));

const RINGS = navigation.map((link, index) => {
  const style = RING_STYLES[index] ?? RING_STYLES[RING_STYLES.length - 1];
  return { ...link, ...style, pathRadius: style.radius - 22 };
});

// The hub circle sits at (520, 160) inside the 680x680 canvas.
const HUB_X = 520;
const HUB_Y = 160;

function arcPath(radius: number) {
  return `M ${HUB_X},${HUB_Y} m -${radius},0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`;
}

type RadialMenuProps = {
  onClose: () => void;
  onNavigate: (href: string) => void;
};

export default function RadialMenu({ onClose, onNavigate }: RadialMenuProps) {
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
          {RINGS.map((ring, index) => (
            <path key={ring.href} id={`radial-path-${index}`} d={arcPath(ring.pathRadius)} />
          ))}
        </defs>

        {[...RINGS].reverse().map((ring, reverseIndex) => (
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
              <textPath href={`#radial-path-${RINGS.length - 1 - reverseIndex}`} startOffset={ring.offset} textAnchor="middle">
                {ring.label.toUpperCase()}
              </textPath>
            </text>
          </g>
        ))}

        <g className="ring-group" onClick={() => requestClose()}>
          <circle cx={HUB_X} cy={HUB_Y} r="70" fill="#fdf4f3" filter="url(#ring-shadow)" className="ring-path" />
          <g transform="translate(490, 132)" className="cursor-pointer">
            <rect x="0" y="0" width="30" height="5.5" rx="2.75" fill="#323b44" />
            <rect x="0" y="11" width="42" height="5.5" rx="2.75" fill="#323b44" />
            <rect x="20" y="22" width="22" height="5.5" rx="2.75" fill="#323b44" />
          </g>
        </g>
      </svg>
    </div>
  );
}
