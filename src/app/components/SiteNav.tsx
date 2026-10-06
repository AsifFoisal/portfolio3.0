'use client';

import { useEffect, useRef, useState } from 'react';
import './SiteNav.css';

export default function SiteNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const progressCircleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    // Scroll Progress Logic
    const r = 34.2;
    const c = 2 * Math.PI * r; // ~214.88

    function updateScrollProgress() {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const scrollPercent = max > 0 ? Math.min(100, Math.max(0, (el.scrollTop / max) * 100)) : 0;

      setScrollPercentage(Math.round(scrollPercent));

      if (progressCircleRef.current) {
        const offset = c - (scrollPercent / 100) * c;
        progressCircleRef.current.style.strokeDashoffset = String(offset);
      }
    }

    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    window.addEventListener('resize', updateScrollProgress);
    updateScrollProgress();

    return () => {
      window.removeEventListener('scroll', updateScrollProgress);
      window.removeEventListener('resize', updateScrollProgress);
    };
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      {/* BACKGROUND OVERLAY */}
      <div
        id="menuOverlay"
        className={menuOpen ? 'menu-overlay open' : 'menu-overlay'}
        onClick={() => setMenuOpen(false)}
      />

      {/* NAVIGATION SYSTEM WRAPPER */}
      <div className="nav-system-wrapper">

        {/* EXPANDED MENU DRAWER (SLIDES UP FROM BEHIND THE NAVBAR) */}
        <div id="menuDrawer" className={menuOpen ? 'menu-drawer open' : 'menu-drawer'}>
          {/* Top Row: Label & Close Button */}
          <div className="flex items-center justify-between mb-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Menu</span>
            <button
              id="closeMenuBtn"
              className="w-12 h-12 bg-[#222222] hover:bg-black text-white rounded-2xl flex items-center justify-center transition-colors shadow-md"
              onClick={() => setMenuOpen(false)}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" strokeWidth="1.8"></circle>
                <path d="M15 9l-6 6M9 9l6 6" strokeWidth="2" strokeLinecap="round"></path>
              </svg>
            </button>
          </div>

          {/* Main Navigation Links */}
          <div className="space-y-4 mb-8">
            <a href="#projects" className="block text-xl font-extrabold text-gray-900 hover:text-gray-500 tracking-tight transition-colors uppercase">ALL PROJECTS</a>
            <a href="#about" className="block text-xl font-extrabold text-gray-900 hover:text-gray-500 tracking-tight transition-colors uppercase">ABOUT ME</a>
            <a href="#services" className="block text-xl font-extrabold text-gray-900 hover:text-gray-500 tracking-tight transition-colors uppercase">MY SERVICES</a>
            <a href="#experience" className="block text-xl font-extrabold text-gray-900 hover:text-gray-500 tracking-tight transition-colors uppercase">EXPERIENCE</a>
          </div>

          {/* WhatsApp Pill Button */}
          <div className="flex justify-center mb-8">
            <a href="https://wa.me/" target="_blank" className="inline-flex items-center gap-3 bg-[#1e1e1e] hover:bg-black text-white px-7 py-3.5 rounded-2xl text-sm font-semibold shadow-lg transition-all transform hover:-translate-y-0.5">
              <span>Contact With Me</span>
              <div className="w-6 h-6 rounded-full bg-[#25D366] flex items-center justify-center text-white">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.705 1.754zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
              </div>
            </a>
          </div>

          <hr className="border-gray-200/80 border-dashed mb-8" />

          {/* Two-Column Footer Links */}
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Menu</span>
              <a href="#behance" className="block font-extrabold text-gray-900 hover:text-gray-500 transition-colors uppercase">BEHANCE</a>
              <a href="#linkedin" className="block font-extrabold text-gray-900 hover:text-gray-500 transition-colors uppercase">LINKEDIN</a>
              <a href="#instagram" className="block font-extrabold text-gray-900 hover:text-gray-500 transition-colors uppercase">INSTAGRAM</a>
            </div>
            <div className="space-y-5">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Drop us a line</span>
                <a href="mailto:forwork5723@gmail.com" className="font-bold text-gray-900 hover:text-gray-500 transition-colors break-all">forwork5723@gmail.com</a>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Curriculum Vitae</span>
                <a href="#" className="inline-flex items-center gap-2 font-bold text-gray-900 hover:text-gray-500 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>Download CV</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* FLOATING NAVBAR WITH NOTCH */}
        <nav className="site-nav" aria-label="Primary">
          {/* SVG NOTCH SHAPE — end-cap arcs use rx 47.25 / ry 58.5 so they render as
              perfect semicircles after the non-uniform stretch to 620x88 (preserveAspectRatio="none") */}
          <svg className="site-nav__shape" viewBox="0 0 905 159" preserveAspectRatio="none" aria-hidden="true">
            <path fill="currentColor" d="
              M 47.25 42
              H 348
              C 412 42 412 2 452.5 2
              C 493 2 493 42 557 42
              H 857.75
              A 47.25 58.5 0 0 1 905 100.5
              A 47.25 58.5 0 0 1 857.75 159
              H 47.25
              A 47.25 58.5 0 0 1 0 100.5
              A 47.25 58.5 0 0 1 47.25 42
              Z
            " />
          </svg>

          {/* CENTER TOP-SCROLL BUTTON */}
          <button id="scrollToTopBtn" className="site-nav__to-top" aria-label="Back to top" onClick={scrollToTop}>
            <svg className="site-nav__ring" viewBox="0 0 81 81" aria-hidden="true">
              <g transform="rotate(-90 40.5 40.5)">
                <circle
                  ref={progressCircleRef}
                  id="progressCircle"
                  className="progress-ring-circle"
                  cx="40.5"
                  cy="40.5"
                  r="34.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  strokeDasharray="214.88"
                  strokeDashoffset="214.88"
                />
              </g>
            </svg>
            {/* Arrow Icon */}
            <svg className="site-nav__arrow" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 19V6.5M12 6.5 6.75 11.75M12 6.5 17.25 11.75" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* CONTENT ROW */}
          <div className="site-nav__row">
            {/* BRAND / AVATAR */}
            <a className="flex items-center gap-3 text-white no-underline -translate-x-3.5" href="#top">
              <img className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover bg-slate-800" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200" alt="Seam Rahman" />
              <span className="site-nav__name font-extrabold text-sm sm:text-base tracking-wider uppercase">SEAM RAHMAN</span>
            </a>

            {/* ACTIONS */}
            <div className="flex items-center gap-3 text-white">
              <span id="scrollPercentage" className="font-bold text-sm sm:text-base min-w-[2.5ch] text-right">{scrollPercentage}%</span>
              <div className="w-[1px] h-4 bg-white/30"></div>
              <button
                id="menuToggleBtn"
                type="button"
                className="flex items-center gap-2 font-bold text-sm sm:text-base tracking-wider uppercase bg-none border-0 text-inherit cursor-pointer"
                onClick={() => setMenuOpen(true)}
              >
                <span className="site-nav__menu-label">MENU</span>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7"></line>
                  <line x1="4" y1="12" x2="20" y2="12"></line>
                  <line x1="4" y1="17" x2="20" y2="17"></line>
                </svg>
              </button>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
