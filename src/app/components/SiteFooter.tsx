'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { images, services } from '../data/portfolio';
import { InstagramIcon, WhatsAppIcon } from './Icons';

const HERO_IMAGE = '/images/footer.png';
const EMAIL = 'forwork5723@gmail.com';

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
  return (
    <div className="footer-avatar">
      <Image src={images.face} alt="" width={56} height={56} loading="lazy" />
      <Image src={images.faceHover} alt="" width={56} height={56} loading="lazy" className="footer-avatar-hover" />
    </div>
  );
}

const MARQUEE_ITEMS = Array.from({ length: 4 });

export default function SiteFooter() {
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      showToast('Email copied to clipboard!');
    } catch {
      const input = document.createElement('input');
      input.value = EMAIL;
      document.body.appendChild(input);
      input.select();
      input.setSelectionRange(0, 99999);
      try {
        document.execCommand('copy');
        showToast('Email copied to clipboard!');
      } catch {
        showToast(EMAIL);
      }
      input.remove();
    }
  }

  return (
    <footer className="site-footer">
      <div
        className="relative w-full overflow-hidden bg-cover bg-center h-265 pt-44 pb-6 sm:pb-10 sm:pt-64 md:pt-80 lg:pt-96"
        style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />

        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-white via-white/70 to-transparent sm:h-60" />


        <div className="relative mx-auto mt-60 w-[calc(100%-40px)] max-w-[1800px] sm:w-[calc(100%-64px)]">
          <div className="relative overflow-hidden rounded-[32px] border border-gray-100 bg-white px-6 pt-10 pb-6 shadow-2xl sm:px-10 md:px-14">
            <div className=" grid grid-cols-1 gap-8 border-b border-gray-100/80 pb-10 md:grid-cols-12 md:gap-6 lg:gap-10 lg:ml-35">
              <div className="flex flex-col justify-between space-y-6 md:col-span-5 lg:col-span-4">
                <div>
                  <h2 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Seam RaHman</h2>
                  <p className="text-sm leading-relaxed font-normal text-gray-500">
                    From early ideas to growing products, I turn complex business problems into simple digital experiences.
                  </p>
                </div>

                <div className="flex items-center space-x-3 pt-1">
                  <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full shadow-sm">
                    <AvatarIllustration />
                  </div>

                  <a
                    href="https://wa.me/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-black inline-flex cursor-pointer items-center space-x-2.5 rounded-full px-5 py-2.5 text-sm font-medium"
                  >
                    <span>Say Hello</span>
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
                    <span>{EMAIL}</span>
                    <span className="text-xs text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
                      <IconCopy />
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col justify-start md:col-span-4 lg:col-span-4">
                <h3 className="mb-4 text-xl font-bold text-center text-gray-900">All Services</h3>
                <div className="mx-auto flex max-w-xs flex-col space-y-2">
                  {services.map((service) => (
                    <a key={service.title} href="#services" className="service-badge rounded-lg px-4 py-2.5 text-center text-xs font-medium text-gray-800">
                      {service.title}
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center justify-between space-y-6 text-center md:col-span-3 lg:col-span-4">
                <div className="space-y-3">
                  <p className="text-xs font-semibold tracking-wide text-gray-700">Ask AI about Seam RaHman</p>
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

            <div className="w-full overflow-hidden pt-5">
              <div className="footer-marquee-track">
                {[0, 1].map((group) => (
                  <div
                    key={group}
                    className="footer-marquee-group text-2xl font-extrabold tracking-wider uppercase sm:text-3xl md:text-4xl lg:text-5xl"
                    aria-hidden={group === 1 || undefined}
                  >
                    {MARQUEE_ITEMS.map((_, index) => (
                      <span key={index} className="flex items-center">
                        <span className="marquee-text">LET&apos;S WORK TOGETHER</span>
                        <span className="text-gray-300">✦</span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`footer-toast${toast ? ' show' : ''}`} role="status">{toast}</div>
    </footer>
  );
}
