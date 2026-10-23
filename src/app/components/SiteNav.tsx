'use client';

import { useEffect, useRef, useState } from 'react';
import './SiteNav.css';
import Image from 'next/image';
import Link from 'next/link';
import { useSiteContent } from '../data/content-context';

export default function SiteNav() {
  const content = useSiteContent();
  const footer = content.footer;
  const [menuOpen, setMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
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

      // Navbar is hidden on the first page / hero section, and visible when scrolled down
      const hero = document.querySelector('.hero') as HTMLElement | null;
      let shouldShow = false;
      if (hero) {
        const rect = hero.getBoundingClientRect();
        // Visible when scrolled past the hero section (hero bottom enters upper viewport)
        shouldShow = rect.bottom < window.innerHeight * 0.6;
      } else {
        shouldShow = window.scrollY > 400;
      }

      setIsVisible(shouldShow);
      if (!shouldShow) {
        setMenuOpen(false);
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
        className={menuOpen && isVisible ? 'menu-overlay open' : 'menu-overlay'}
        onClick={() => setMenuOpen(false)}
      />

      {/* NAVIGATION SYSTEM WRAPPER */}
      <div className={`nav-system-wrapper ${isVisible ? 'visible' : ''}`}>

        {/* EXPANDED MENU DRAWER (SLIDES UP FROM BEHIND THE NAVBAR) */}
        <div id="menuDrawer" className={menuOpen ? 'menu-drawer open' : 'menu-drawer'}>
          {/* Top Row: Label & Close Button */}
          <div className="flex items-center justify-between mb-8">
            <span className="text-[14px] font-medium uppercase tracking-wider text-gray-400">Menu</span>
            <button
              id="closeMenuBtn"
              className="w-12 h-12 btn-black flex items-center justify-center shadow-md cursor-pointer"
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
            {content.navigation.map((link) => (
              link.href.startsWith('/') ? (
                <Link
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  scroll={false}
                  onClick={() => setMenuOpen(false)}
                  className="block text-[20px] font-medium text-gray-900 hover:text-gray-500 tracking-tight transition-colors uppercase"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block text-[20px] font-medium text-gray-900 hover:text-gray-500 tracking-tight transition-colors uppercase"
                >
                  {link.label}
                </a>
              )
            ))}
          </div>

          {/* WhatsApp Pill Button */}
          <div className="flex justify-center mb-8">
            <a href={footer.whatsappUrl} target="_blank" rel="noreferrer" className="say-hello-btn">
              <span className="say-hello-btn__text">Contact With Me</span>
              <span className="say-hello-btn__badge">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/whatsapp-badge.png" alt="" className="say-hello-btn__icon menu-wa-logo" />
              </span>
            </a>
          </div>

          <hr className="border-gray-200/80 border-dashed mb-8" />

          {/* Two-Column Footer Links */}
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <span className="block text-[14px] font-medium uppercase tracking-wider text-gray-400">Menu</span>
              <a href="#behance" className="block text-[20px] font-medium text-gray-900 hover:text-gray-500 transition-colors uppercase">BEHANCE</a>
              <a href="#linkedin" className="block text-[20px] font-medium text-gray-900 hover:text-gray-500 transition-colors uppercase">LINKEDIN</a>
              <a href="#instagram" className="block text-[20px] font-medium text-gray-900 hover:text-gray-500 transition-colors uppercase">INSTAGRAM</a>
            </div>
            <div className="space-y-5">
              <div>
                <span className="block text-[14px] font-medium uppercase tracking-wider text-gray-400 mb-1">Drop us a line</span>
                <a href={`mailto:${footer.email}`} className="text-[18px] font-medium text-gray-900 hover:text-gray-500 transition-colors break-all">{footer.email}</a>
              </div>
              <div>
                <span className="block text-[14px] font-medium uppercase tracking-wider text-gray-400 mb-1">Curriculum Vitae</span>
                <a href="#" className="inline-flex items-center gap-2 text-[18px] font-medium text-gray-900 hover:text-gray-500 transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/download-cv.png" alt="" width={16} height={16} className="w-4 h-4" />
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
            <a className="flex items-center gap-3 text-white no-underline -translate-x-3.5 cursor-pointer" href="#home" onClick={(e) => { e.preventDefault(); scrollToTop(); }}>
              <Image width={96} height={96} className="w-[56px] h-[56px] rounded-full object-cover bg-slate-800" src="/images/designer-portrait.jpg" alt="Seam Rahman" />
              <span className="site-nav__name text-[18px] font-semibold tracking-wider uppercase">SEAM RAHMAN</span>
            </a>

            {/* ACTIONS */}
            <div className="flex items-center gap-3 text-white">
              <span id="scrollPercentage" className="text-[20px] font-medium min-w-[2.5ch] text-right">{scrollPercentage}%</span>
              <div className="w-[1px] h-4 bg-white/30"></div>
              <button
                id="menuToggleBtn"
                type="button"
                className="flex items-center gap-2 font-bold text-sm sm:text-base tracking-wider uppercase bg-none border-0 text-inherit cursor-pointer"
                onClick={() => setMenuOpen(true)}
              >
                <span className="site-nav__menu-label">MENU</span>
                <svg className="w-[31px] h-[31px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
