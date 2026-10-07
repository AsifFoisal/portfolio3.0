'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import Image from 'next/image';
import { motion, useAnimationFrame, useMotionValue, useSpring } from 'motion/react';
import { useSiteContent } from '../data/content-context';
import { InstagramIcon, WhatsAppIcon } from './Icons';

function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
      <path d="M13 2 4.8 13.4h4.9L10.9 22l8.3-11.4h-4.9L13 2Z" />
    </svg>
  );
}

function IconRotate() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M20.5 12a8.5 8.5 0 1 1-2.5-6" />
      <path d="M20.5 3.2v4.3h-4.3" />
    </svg>
  );
}

function IconDiagram() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="5" rx="1" />
      <rect x="2.5" y="16.5" width="6" height="5" rx="1" />
      <rect x="15.5" y="16.5" width="6" height="5" rx="1" />
      <path d="M12 7.5v4.5M5.5 16.5v-2h13v2" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function AvatarIllustration() {
  const content = useSiteContent();
  return (
    <div className="footer-avatar">
      <Image src={content.about.face} alt="" width={56} height={56} loading="lazy" />
      <Image src={content.about.faceHover} alt="" width={56} height={56} loading="lazy" className="footer-avatar-hover" />
    </div>
  );
}

/** Infinite "Let's work together" marquee — runs on its own, reverses with the
 * scroll direction, links to WhatsApp, and shows a "Let's Talk" cursor bubble
 * on hover. Motion port of the GSAP reference. */
function FooterMarquee({ whatsappUrl, marqueeText, marqueeSymbol, cursorLabel }: { whatsappUrl: string; marqueeText: string; marqueeSymbol: string; cursorLabel: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const direction = useRef(-1);
  const lastScrollY = useRef(0);
  const [hovering, setHovering] = useState(false);

  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const cursorSpringX = useSpring(cursorX, { stiffness: 400, damping: 35, mass: 0.6 });
  const cursorSpringY = useSpring(cursorY, { stiffness: 400, damping: 35, mass: 0.6 });

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastScrollY.current) > 1) {
        // Scrolling down drifts the marquee left (like the reference tween);
        // scrolling up reverses it to the right.
        direction.current = y > lastScrollY.current ? -1 : 1;
        lastScrollY.current = y;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useAnimationFrame((_, delta) => {
    const track = trackRef.current;
    if (!track) return;
    const half = track.scrollWidth / 2;
    if (!half) return;
    let current = x.get() + ((direction.current * half) / 30) * (delta / 1000);
    if (current <= -half) current += half;
    if (current > 0) current -= half;
    x.set(current);
  });

  function trackPointer(event: MouseEvent<HTMLAnchorElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    cursorX.set(event.clientX - rect.left);
    cursorY.set(event.clientY - rect.top);
  }

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Let's work together — chat on WhatsApp"
      className="group relative mt-5 block cursor-none overflow-hidden border-t border-gray-100 pt-8"
      onMouseEnter={(event) => { setHovering(true); trackPointer(event); }}
      onMouseMove={trackPointer}
      onMouseLeave={() => setHovering(false)}
    >
      <motion.div ref={trackRef} className="flex w-max will-change-transform" style={{ x }}>
        {[0, 1].map((k) => (
          <div key={k} aria-hidden={k === 1 || undefined} className="flex shrink-0 items-center">
            {Array.from({ length: 3 }).map((_, j) => (
              <span key={j} className="flex items-center">
                <span className="whitespace-nowrap px-6 text-[clamp(40px,6vw,90px)] font-extrabold uppercase leading-none tracking-wider transition-colors duration-500 group-hover:text-[#ff4c4e] lg:px-10">
                  {marqueeText}
                </span>
                <span className="shrink-0 text-[clamp(22px,3vw,44px)] leading-none text-[#ff4c4e] transition-all duration-1000 group-hover:rotate-180 group-hover:text-[#1a1a1a]">{marqueeSymbol}</span>
              </span>
            ))}
          </div>
        ))}
      </motion.div>
      {hovering && (
        <motion.div className="pointer-events-none absolute left-0 top-0 z-10" style={{ x: cursorSpringX, y: cursorSpringY }}>
          <span className="grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#ff4c4e] text-sm font-semibold uppercase text-white">{cursorLabel}</span>
        </motion.div>
      )}
    </a>
  );
}

export default function SiteFooter() {
  const content = useSiteContent();
  const footer = content.footer;
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(footer.email);
      showToast('Email copied to clipboard!');
    } catch {
      const input = document.createElement('input');
      input.value = footer.email;
      document.body.appendChild(input);
      input.select();
      input.setSelectionRange(0, 99999);
      try {
        document.execCommand('copy');
        showToast('Email copied to clipboard!');
      } catch {
        showToast(footer.email);
      }
      input.remove();
    }
  }

  return (
    <footer className="site-footer">
      <div
        className="relative w-full overflow-hidden bg-cover bg-center min-h-265 pt-44 pb-6 sm:pb-10 sm:pt-64 md:pt-80 lg:pt-96"
        style={{ backgroundImage: `url('${footer.backgroundImage}')` }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />

        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white via-white/70 to-transparent sm:h-60" />


        <div className="relative mx-auto mt-60 w-[calc(100%-40px)] max-w-[1800px] sm:w-[calc(100%-64px)]">
          <div className="relative overflow-hidden rounded-[32px] border border-gray-100 bg-white px-6 pt-10 pb-6 shadow-2xl sm:px-10 md:px-14">
            <div className=" grid grid-cols-1 gap-8 border-b border-gray-100/80 pb-10 md:grid-cols-12 md:gap-6 lg:gap-10 lg:ml-35">
              <div className="flex flex-col justify-between space-y-6 md:col-span-5 lg:col-span-4">
                <div>
                  <h2 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{footer.name}</h2>
                  <p className="text-sm leading-relaxed font-normal text-gray-500">
                    {footer.blurb}
                  </p>
                </div>

                <div className="flex items-center space-x-3 pt-1">
                  <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full shadow-sm">
                    <AvatarIllustration />
                  </div>

                  <a
                    href={footer.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-black inline-flex cursor-pointer items-center space-x-2.5 rounded-full px-5 py-2.5 text-sm font-medium"
                  >
                    <span>{footer.sayHelloLabel}</span>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <WhatsAppIcon className="h-3 w-3" />
                    </span>
                  </a>
                </div>

                <div className="pt-2">
                  <button
                    onClick={copyEmail}
                    className="group flex items-center space-x-1.5 text-sm font-medium text-gray-700 transition hover:text-gray-900 focus:outline-none"
                  >
                    <span>{footer.email}</span>
                    <span className="text-xs text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
                      <IconCopy />
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col justify-start md:col-span-4 lg:col-span-4">
                <h3 className="mb-4 text-xl font-bold text-center text-gray-900">{footer.servicesHeading}</h3>
                <div className="mx-auto flex max-w-xs flex-col space-y-2">
                  {content.services.items.map((service) => (
                    <a key={service.title} href="#services" className="service-badge rounded-lg px-4 py-2.5 text-center text-xs font-medium text-gray-800">
                      {service.title}
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center justify-between space-y-6 text-center md:col-span-3 lg:col-span-4">
                <div className="space-y-3">
                  <p className="text-xs font-semibold tracking-wide text-gray-700">{footer.askAiLabel}</p>
                  <div className="flex items-center justify-center space-x-2.5">
                    <button className="icon-circle" title="Ask ChatGPT"><IconBolt /></button>
                    <button className="icon-circle" title="Ask Claude"><IconRotate /></button>
                    <button className="icon-circle" title="Ask Perplexity"><IconDiagram /></button>
                  </div>
                </div>

                <div>
                  <a href="#projects" className="btn-black inline-block w-full rounded-lg px-6 py-2.5 text-center text-xs font-semibold sm:w-auto">
                    View all projects
                  </a>
                </div>

                <div className="space-y-3 pt-1">
                  <p className="text-xs font-semibold tracking-wide text-gray-700">Follow me on social media</p>
                  <div className="flex items-center justify-center space-x-2.5">
                    <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="icon-circle text-xs font-bold" title="LinkedIn">in</a>
                    <a href="https://behance.net" target="_blank" rel="noreferrer" className="icon-circle text-xs font-bold" title="Behance">Be</a>
                    <a href="https://instagram.com" target="_blank" rel="noreferrer" className="icon-circle" title="Instagram"><InstagramIcon className="h-3.5 w-3.5" /></a>
                  </div>
                </div>
              </div>
            </div>

            <FooterMarquee whatsappUrl={footer.whatsappUrl} marqueeText={footer.marqueeText} marqueeSymbol={footer.marqueeSymbol} cursorLabel={footer.cursorLabel} />
          </div>
        </div>
      </div>

      <div className={`footer-toast${toast ? ' show' : ''}`} role="status">{toast}</div>
    </footer>
  );
}
