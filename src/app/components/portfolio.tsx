'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode, type RefObject } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, animate, useInView, useMotionTemplate, useMotionValueEvent, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import Dialog from './Dialog';
import ContactForm from './ContactForm';
import TiltedCard from './TiltedCard';
import TechText from './TechText';
import FlyingPosters from './FlyingPosters';
import ScrollStack, { ScrollStackItem } from './ScrollStack';
import SiteFooter from './SiteFooter';
import SiteNav from './SiteNav';
import RadialMenu from './RadialMenu';
import { ArrowIcon, HamburgerIcon, PhoneIcon, TurnArrowIcon } from './Icons';
import { ContentProvider, SectionHeading, useSiteContent } from '../data/content-context';
import type { Project, Service, SiteContent } from '../data/content-types';
import { downloadResume } from '../utils/downloadResume';
import { cn } from '../utils/cn';
import HelixRibbon from './HelixRibbon';
import PushLoader from './PushLoader';
import SiteCursor from './SiteCursor';

type Overlay =
  | { kind: 'menu' }
  | { kind: 'contact'; intent: 'project' | 'call' }
  | { kind: 'gallery'; index: number }
  | null;

function CallButton({ children, onClick, href, icon, cursorLabel }: { children: string; onClick?: () => void; href?: string; icon?: ReactNode; cursorLabel?: string }) {
  const glyph = icon ?? <PhoneIcon />;
  if (href) {
    return <a className="call-button cursor-target" data-cursor-label={cursorLabel} href={href} target="_blank" rel="noreferrer">{children}<span className="call-button-icon">{glyph}</span></a>;
  }
  return <button className="call-button cursor-target" data-cursor-label={cursorLabel} onClick={onClick}>{children}<span className="call-button-icon">{glyph}</span></button>;
}

function VideoPoster({ rounded = false, expandOnScroll = false }: { rounded?: boolean; expandOnScroll?: boolean }) {
  const content = useSiteContent();
  const reel = content.hero.reel;
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [failed, setFailed] = useState(false);

  const { scrollYProgress: clipProgress } = useScroll({
    target: frameRef,
    offset: ['start 0.95', 'center 0.55'],
  });
  const { scrollYProgress: zoomProgress } = useScroll({
    target: frameRef,
    offset: ['start end', 'end start'],
  });
  const frameInset = useTransform(clipProgress, [0, 1], [16, 0]);
  const frameClipPath = useMotionTemplate`inset(0% ${frameInset}% 0% ${frameInset}% round var(--reel-radius, 0px))`;
  const mediaScale = useTransform(zoomProgress, [0, 1], [1.3, 1]);

  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const cursorSpringX = useSpring(cursorX, { stiffness: 400, damping: 35, mass: 0.6 });
  const cursorSpringY = useSpring(cursorY, { stiffness: 400, damping: 35, mass: 0.6 });

  function trackPointer(event: MouseEvent<HTMLDivElement>) {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    cursorX.set(event.clientX - rect.left);
    cursorY.set(event.clientY - rect.top);
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setStarted(true);
      // An explicit click is a user gesture — let this playback carry sound.
      video.muted = false;
      void video.play().catch(() => { video.muted = true; void video.play().catch(() => setFailed(true)); });
    } else {
      video.pause();
    }
  }

  // The hero reel starts playing on load. Browsers only allow that muted, so
  // it autoplays silently until the visitor explicitly plays it (which
  // unmutes). Users who prefer reduced motion get the paused first frame.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => {});
  }, [reel.videoUrl]);

  const posterUrl = (reel.poster ?? '').trim();
  // The admin may supply only the video. A video URL in the poster field can't
  // go through next/image (it would render a blank box), so in that case the
  // video mounts immediately and its first frame acts as the poster.
  const posterIsImage = !!posterUrl && !/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(posterUrl);
  const showVideo = !!reel.videoUrl;

  return (
    <motion.div
      ref={frameRef}
      className={`video-poster ${rounded ? 'video-poster-rounded' : ''} ${failed ? '' : 'cursor-hidden'}`}
      style={expandOnScroll ? { clipPath: frameClipPath } : undefined}
      role="button"
      tabIndex={0}
      aria-label={playing ? 'Pause visual story video' : 'Play visual story video'}
      onClick={togglePlay}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); togglePlay(); } }}
      onMouseEnter={(event) => { setHovering(true); trackPointer(event); }}
      onMouseMove={trackPointer}
      onMouseLeave={() => setHovering(false)}
    >
      <motion.div className="video-media" style={expandOnScroll ? { scale: mediaScale } : undefined}>
        {posterIsImage && <Image src={posterUrl} alt={reel.posterAlt} fill sizes="100vw" priority={rounded} />}
        {showVideo && (
          <video
            ref={videoRef}
            className="video-inline"
            src={reel.videoUrl}
            poster={posterIsImage ? posterUrl : undefined}
            muted
            playsInline
            preload="auto"
            onError={() => setFailed(true)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
        )}
      </motion.div>
      {failed && (
        <a className="outline-button video-inline-fallback" href={reel.videoPageUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
          Watch the film <ArrowIcon />
        </a>
      )}
      {hovering && !failed && (
        <motion.div className="video-cursor" style={{ x: cursorSpringX, y: cursorSpringY }} initial={{ opacity: 0 }} animate={{ opacity: 1, scale: playing ? 0.92 : 1 }}>
          <span>{playing ? reel.pauseLabel : reel.playLabel}</span>
        </motion.div>
      )}
    </motion.div>
  );
}

function AboutParagraph({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) {
  const content = useSiteContent();
  const segments = content.about.segments;

  /** Words go from dimmed to full opacity one by one as the paragraph scrolls through the viewport. */
  const words = useMemo(() => {
    const list: Array<{ word: string; accent: boolean; spaceAfter: boolean }> = [];
    segments.forEach((segment, segmentIndex) => {
      const nextSegment = segments[segmentIndex + 1];
      const segmentWords = segment.text.split(' ').filter(Boolean);
      segmentWords.forEach((word, wordIndex) => {
        const nextSegmentStartsPunctuated = /^[,.!?;:]/.test(nextSegment?.text ?? '');
        const joinsNextSegment = wordIndex === segmentWords.length - 1 && nextSegmentStartsPunctuated;
        list.push({ word, accent: !!segment.accent, spaceAfter: !joinsNextSegment });
      });
    });
    return list;
  }, [segments]);

  /** Words go from dimmed to full opacity one by one as the section scrolls
   *  through its pinned range, finishing right as the pin releases. */
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: targetRef, offset: ['start 0.75', 'end end'] });
  const [visibleCount, setVisibleCount] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    setVisibleCount(Math.ceil(value * words.length));
  });

  return (
    <p ref={ref}>
      {words.map((item, index) => (
        <span key={index} className={cn(item.accent && 'accent-word')} style={{ color: index < visibleCount ? undefined : 'rgba(26,26,26,0.24)', transition: 'color 600ms' }}>
          {item.word}
          {item.spaceAfter ? ' ' : null}
        </span>
      ))}
    </p>
  );
}

/** Counts up from zero the first time it scrolls into view.
 *  Whole numbers render two digits ("03"), matching admin entries like "03". */
function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const format = useCallback(
    (n: number) => (decimals > 0 ? n.toFixed(decimals) : String(Math.round(n)).padStart(2, '0')),
    [decimals]
  );
  const [display, setDisplay] = useState(() => format(0));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.8,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplay(format(latest)),
    });
    return () => controls.stop();
  }, [inView, value, decimals, format]);

  return <span ref={ref}>{display}</span>;
}

function FeaturedHeading() {
  const content = useSiteContent();
  const featured = content.featured;
  return (
    <div className="featured-heading">
      <div><p className="eyebrow">{featured.eyebrow} <TurnArrowIcon /></p><h2 id="featured-title"><SectionHeading heading={featured.heading} /></h2></div>
      <Link className="view-all" href="/work" scroll={false}>{featured.viewAllLabel} <ArrowIcon /></Link>
    </div>
  );
}

/** Normalise admin-entered links so bare domains like "www.google.com" open off-site. */
function toExternalHref(value: string) {
  const url = (value ?? '').trim();
  if (!url) return '';
  if (url.startsWith('/') || url.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return `https://${url}`;
}

function ProjectLink({ label, href }: { label: string; href: string }) {
  const url = toExternalHref(href);
  return (
    <a
      className={`project-link${url ? '' : ' is-disabled'}`}
      href={url || undefined}
      target={url ? '_blank' : undefined}
      rel={url ? 'noreferrer' : undefined}
      aria-disabled={url ? undefined : true}
    >
      {label} <ArrowIcon />
    </a>
  );
}

function ProjectCaption({ project }: { project: Project }) {
  const content = useSiteContent();
  const featured = content.featured;
  return (
    <div className="project-caption">
      <h3>{project.title}</h3>
      <p>{project.description}<br className="wide-break" /></p>
      <div className="project-links">
        <ProjectLink label={featured.liveLinkLabel} href={project.liveUrl} />
        <ProjectLink label={featured.figmaLinkLabel} href={project.figmaUrl} />
      </div>
    </div>
  );
}

function ServiceCard({ service, index, isOpen, onToggle }: { service: Service; index: number; isOpen: boolean; onToggle: () => void }) {
  const [hovering, setHovering] = useState(false);
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);

  function trackPointer(event: MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    cursorX.set(event.clientX - rect.left);
    cursorY.set(event.clientY - rect.top);
  }

  return (
      <article
        className={`service-item cursor-target ${isOpen ? 'is-open' : ''} ${hovering ? 'service-item-cursor-active' : ''}`}
        data-cursor-label={service.title}
      onMouseMove={trackPointer}
      onMouseLeave={() => setHovering(false)}
    >
      <motion.span
        className="service-view-cursor"
        style={{ x: cursorX, y: cursorY }}
        aria-hidden="true"
      >
        VIEW
      </motion.span>
      <h3><button className="service-toggle" id={`service-toggle-${index}`} aria-expanded={isOpen} aria-controls={`service-panel-${index}`} onClick={onToggle}><span className="service-heading-text"><span className="service-number">0{index + 1}</span>{service.title}</span><span className="service-toggle-icon"><span /><span /></span></button></h3>
      <div className="service-panel" id={`service-panel-${index}`} role="region" aria-labelledby={`service-toggle-${index}`} inert={!isOpen}>
        <div className="service-panel-clip"><div className="service-details">
          <div className="service-description"><p>{service.description}</p><div className="service-tags">{service.tags.map((tag, tagIndex) => <span key={`${tag}-${tagIndex}`}>{tag}</span>)}</div></div>
          <div className="service-media" aria-hidden="true" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
            <div>{service.imageLeft && <Image src={service.imageLeft} alt="" width={720} height={540} sizes="(max-width: 800px) 45vw, 320px" loading="lazy" />}</div>
            <div>{service.imageRight && <Image src={service.imageRight} alt="" width={720} height={540} sizes="(max-width: 800px) 45vw, 320px" loading="lazy" />}</div>
          </div>
        </div></div>
      </div>
    </article>
  );
}

/**
 * Desktop: the heading stays stuck at the top and the number/caption block is
 * stuck on the left — number at the top, text at the bottom — while the cards
 * scroll on the right. The panel content follows the card nearest the viewport
 * center; the number slides in right-to-left, the text top-to-bottom.
 * Mobile keeps the classic per-row layout with a static heading.
 */
function FeaturedWorks() {
  const content = useSiteContent();
  const projects = content.featured.projects;
  const cardsRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: cardsRef, offset: ['start 0.5', 'end 0.5'] });

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    setActive(Math.min(projects.length - 1, Math.max(0, Math.floor(value * projects.length))));
  });

  const slideTransition = { duration: 0.4, ease: 'easeInOut' as const };
  const activeProject = projects[active] ?? projects[0];

  return (
    <div className="page-width side-rails featured-inner">
      <FeaturedHeading />
      <div className="featured-grid">
        <aside className="featured-panel">
          <span className="featured-panel-number" aria-hidden="true">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={active} initial={{ x: '110%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '-110%', opacity: 0 }} transition={slideTransition}>
                0{active + 1}
              </motion.span>
            </AnimatePresence>
          </span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={active} className="featured-panel-caption" initial={{ y: -44, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 44, opacity: 0 }} transition={slideTransition}>
              {activeProject && <ProjectCaption project={activeProject} />}
            </motion.div>
          </AnimatePresence>
        </aside>
        <div className="featured-cards" ref={cardsRef}>
          {projects.map((project, index) => (
            <article className="featured-card cursor-target" key={`${project.title}-${index}`} data-cursor-label={project.title}>
              <div className="project-image-button">
                <Image src={project.image} alt={project.title} width={1024} height={1024} loading="lazy" />
              </div>
              <div className="project-info featured-card-info">
                <span className="project-number">0{index + 1}</span>
                <ProjectCaption project={project} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

const titleCls = 'whitespace-nowrap uppercase leading-none font-semibold tracking-[-0.03em]';

/**
 * Visual stories — a scroll-scrubbed expanding video box (motion port of the
 * GSAP reference): the box grows from a small strip while the video zooms out,
 * side titles slide up once on approach, and the caption fades in near the end.
 * Mobile shows a static aspect-video box.
 */
function Stories() {
  const content = useSiteContent();
  const stories = content.stories;
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end end'] });
  const { scrollYProgress: titleProgress } = useScroll({ target: trackRef, offset: ['start 0.75', 'start 0.4'] });

  // End width over-sizes by the 60px translate shift, so the full-bleed end
  // state still covers the viewport edge to edge after the leftward move.
  const boxWidth = useTransform(scrollYProgress, [0, 1], ['22%', '100%']);
  // The leftward offset only applies to the small feed; it eases back to 0 as
  // the box expands so the big feed stays full screen and centered.
  const boxShiftX = useTransform(scrollYProgress, [0, 1], [-30, 0]);
  const boxHeight = useTransform(scrollYProgress, [0, 1], ['14vh', '100vh']);
  const boxRadius = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1.5, 1]);
  const captionOpacity = useTransform(scrollYProgress, [0.75, 0.92], [0, 1]);
  const captionY = useTransform(scrollYProgress, [0.75, 1], [40, 0]);
  const visualY = useTransform(titleProgress, [0, 0.6], ['105%', '0%']);
  const storiesY = useTransform(titleProgress, [0.15, 0.75], ['105%', '0%']);

  return (
    <section className="relative bg-white" id="stories" aria-label="Visual stories">
      <div className="stories-track relative lg:h-[280vh]" ref={trackRef}>
          <div className="stories-stage relative z-[5] flex flex-col items-center gap-6 pb-[100px] lg:sticky lg:top-0 lg:h-screen lg:justify-center lg:overflow-hidden lg:pb-0">
          <div className="overflow-hidden lg:hidden">
            <h2 className={`${titleCls} text-[clamp(64px,17vw,130px)]`}>{stories.mobileTitleTop}</h2>
          </div>

          <motion.div className="stories-box relative aspect-video w-[calc(100%-40px)] rounded-[20px] lg:aspect-auto lg:h-[14vh] lg:w-[22%]" style={{ width: boxWidth, height: boxHeight, borderRadius: boxRadius, x: boxShiftX }}>
            <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-neutral-200">
              <motion.video className="stories-video absolute inset-0 size-full object-cover" style={{ scale: videoScale }} src={stories.videoUrl} poster={stories.poster} autoPlay muted loop playsInline preload="metadata" />
              <div className="absolute inset-0 bg-black/25" />
            </div>

            <div className="absolute inset-y-0 right-[calc(100%+33.5px)] hidden items-center lg:flex">
              <div className="overflow-hidden">
                <motion.h2 className={`stories-side-title ${titleCls} text-[clamp(64px,7.2vw,110px)]`} style={{ y: visualY }}>{stories.mobileTitleTop}</motion.h2>
              </div>
            </div>
            <div className="absolute inset-y-0 story left-[calc(100%+33.5px)] hidden items-center lg:flex">
              <div className="overflow-hidden">
                <motion.h2 className={`stories-side-title ${titleCls} text-[clamp(64px,7.2vw,110px)]`} style={{ y: storiesY }}>{stories.mobileTitleBottom}</motion.h2>
              </div>
            </div>

            <motion.div className="stories-caption absolute inset-x-0 bottom-0 hidden items-end justify-between gap-10 p-12 text-white lg:flex" style={{ opacity: captionOpacity, y: captionY }}>
              <div>
                <p className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-[0.08em]">
                  <span className="size-2 rounded-full bg-[#ff4c4e]" />
                  {stories.captionEyebrow}
                </p>
                <p className={`${titleCls} mt-4 max-w-[760px] text-[clamp(40px,4.4vw,72px)]`}>{stories.captionTitle}</p>
              </div>
              <p className="max-w-[300px] text-lg leading-[1.5] text-white/80">
                {stories.captionText}
              </p>
            </motion.div>
          </motion.div>

          <div className="overflow-hidden lg:hidden">
            <h2 className={`${titleCls} text-[clamp(64px,17vw,130px)]`}>{stories.mobileTitleBottom}</h2>
          </div>
        </div>
      </div>
    </section>
  );
}

const QUOTE_DURATION = 7;

/**
 * Client reviews — auto-advancing quotes with a masked word-by-word reveal,
 * avatar pills and a progress bar (motion port of the GSAP reference).
 */
function Testimonials() {
  const content = useSiteContent();
  const testimonials = content.testimonials.items.map((testimonial) => ({
    ...testimonial,
    avatar: testimonial.name === 'Swadhin Biswas'
      ? '/images/Swadhin.png'
      : testimonial.name === 'Naimur Rahman'
        ? '/images/Naimur.png'
        : testimonial.name === 'Al Amin Mun'
          ? '/images/Mun.png'
        : testimonial.avatar,
  }));
  const rootRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(() => {
    // Every visit opens on the middle reviewer; the timer walks the rest.
    const start = testimonials.findIndex((t) => t.name === 'Al Amin Mun');
    return start >= 0 ? start : 0;
  });
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const t = testimonials[active] ?? testimonials[0];
  const words = (t?.quote ?? '').split(' ');

  return (
    <section ref={rootRef} className="testimonials page-width" id="clients" aria-labelledby="clients-title">
      <h2 className="large-heading low-contrast-heading" id="clients-title"><SectionHeading heading={content.testimonials.heading} /></h2>
      <div className="mx-auto flex max-w-[1004px] flex-col items-center text-center" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <Image aria-hidden="true" src="/images/quote-mark.png" alt="" width={64} height={46} className="mt-10 mb-10 h-[32px] w-auto lg:h-[44px]" />

        <div aria-live="polite" className="flex w-full items-start justify-center">
          <motion.blockquote key={active} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }} className="text-[32px] font-medium leading-[1.2] tracking-[-0.025em] text-balance">
            <span>“</span>
            {words.map((word, i) => (
              <span key={i}>
                <span className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
                  <motion.span className="inline-block will-change-transform" variants={{ hidden: { y: '110%' }, show: { y: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } } }}>
                    {word}
                  </motion.span>
                </span>
                {i < words.length - 1 ? ' ' : null}
              </span>
            ))}
            <span>”</span>
          </motion.blockquote>
        </div>

        <motion.p key={`author-${active}`} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }} className="testimonial-author text-[#555555]">
          <span className="font-semibold text-[#1a1a1a]">{t.name}</span> — {t.role}{t.company ? `, ${t.company}` : ''}
        </motion.p>

        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {testimonials.map((person, i) => (
            <motion.div
              key={person.name}
              initial={{ opacity: 0, y: 18 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{ duration: 0.55, delay: 0.15 + 0.12 * Math.abs(i - (testimonials.length - 1) / 2), ease: [0.16, 1, 0.3, 1] }}
            >
              <button type="button" onClick={() => setActive(i)} aria-label={`Show review from ${person.name}`} aria-pressed={i === active}
                className={cn('flex items-center gap-3 rounded-full p-1.5 transition-all duration-500 md:pr-5', i === active ? 'bg-[#f1f1f1]' : 'opacity-50 hover:opacity-100')}>
                <Image src={person.avatar} alt="" width={44} height={44} loading="lazy" style={{ objectPosition: person.position }}
                  className={cn('size-11 rounded-full object-cover ring-2 transition-all duration-500', i === active ? 'ring-[#ff4c4e]' : 'ring-transparent grayscale')} />
                <span className="hidden text-left text-[16px] font-medium leading-tight md:block">
                  {person.name}
                  <span className="block text-[14px] font-medium text-[#555555]/70">{person.company || person.role}</span>
                </span>
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 h-[2px] w-40 overflow-hidden rounded bg-[#1a1a1a]/10">
          <span key={active} className="quote-progress block h-full w-full origin-left bg-[#ff4c4e]"
            style={{ animationPlayState: inView && !paused ? 'running' : 'paused', animationDuration: `${QUOTE_DURATION}s` }}
            onAnimationEnd={() => setActive((current) => (current + 1) % testimonials.length)} />
        </div>
      </div>
    </section>
  );
}

export default function Portfolio({ content }: { content: SiteContent }) {
  const router = useRouter();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [openService, setOpenService] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);
  const lenisRef = useRef<Lenis | null>(null);
  const aboutRef = useRef<HTMLElement>(null);
  const closeOverlay = useCallback(() => setOverlay(null), []);

  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.2,
      smoothWheel: true,
      anchors: { offset: -32 },
      prevent: (node) => node.hasAttribute('data-lenis-prevent'),
    });
    lenisRef.current = lenis;
    return () => { lenis.destroy(); lenisRef.current = null; };
  }, []);

  const hasOverlay = overlay !== null;
  // The radial menu floats over the page rather than dimming it, so it leaves
  // scrolling alone; only the true dialogs lock the page.
  const locksScroll = hasOverlay && overlay.kind !== 'menu';
  useEffect(() => {
    if (!locksScroll) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lenisRef.current?.stop();
    return () => {
      document.body.style.overflow = previousOverflow;
      lenisRef.current?.start();
    };
  }, [locksScroll]);

  function navigateTo(href: string) {
    setOverlay(null);
    if (href.startsWith('/')) {
      router.push(href);
      return;
    }
    window.requestAnimationFrame(() => {
      lenisRef.current?.start();
      if (lenisRef.current) lenisRef.current.scrollTo(href, { offset: -32, duration: 1.3 });
      else document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
      window.history.replaceState(null, '', href);
    });
  }

  const galleryItem = overlay?.kind === 'gallery' ? content.latest.items[overlay.index] : null;

  return (
    <ContentProvider content={content}>
      {loading && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2147483000 }}>
          <PushLoader onFinish={() => setLoading(false)} />
        </div>
      )}
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="portfolio-rail-content">
      <header className="site-header page-width" id="home">
        <button className="cv-button cursor-target" onClick={() => downloadResume(content.experience.items)} data-cursor-label="Download CV">Curriculum Vitae | CV</button>
        <button className="menu-button cursor-target" onClick={() => setOverlay({ kind: 'menu' })} aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded={overlay?.kind === 'menu'} data-cursor-label="Menu">
          <HamburgerIcon className="menu-button-icon" />
        </button>
      </header>

      <main id="main">
        <section className="hero page-width" aria-label="Seam Rahman, product designer">
          <div className="hero-introduction">
            <div className="hero-name"><p>{content.hero.greeting}</p><h2>{content.hero.nameLines.map((line, index) => <span key={index}>{line}{index < content.hero.nameLines.length - 1 ? <br /> : null}</span>)}</h2></div>
            <TiltedCard
              imageSrc={content.hero.portrait}
              altText={content.hero.portraitAlt}
              captionText={content.hero.portraitCaption}
              containerHeight="var(--portrait-size)"
              containerWidth="var(--portrait-size)"
              imageHeight="var(--portrait-size)"
              imageWidth="var(--portrait-size)"
              rotateAmplitude={10}
              scaleOnHover={1.06}
              showMobileWarning={false}
              showTooltip
              imgProps={{ loading: 'eager', fetchPriority: 'high' }}
            />
            <div className="hero-description">
              <p>{content.hero.description}</p>
              <CallButton href={content.footer.whatsappUrl} icon={<Image src="/images/call-button-phone.png" alt="" width={12} height={12} />} cursorLabel="Chat on WhatsApp">{content.hero.ctaLabel}</CallButton>
            </div>
          </div>
          <h1 className="hero-title tech-title-frame">
            <span className="tech-title-corner tech-title-corner-tl" aria-hidden="true" />
            <span className="tech-title-corner tech-title-corner-tr" aria-hidden="true" />
            <TechText
              text={content.hero.title}
              fontWeight={550}
              fontSize={114}
              color="#222222"
              accentColor="#ff4c4e"
            />
            <span className="tech-title-corner tech-title-corner-bl" aria-hidden="true" />
            <span className="tech-title-corner tech-title-corner-br" aria-hidden="true" />
          </h1>
          <div className="hero-disciplines">{content.hero.disciplines.map((discipline) => <span key={discipline}>{discipline}</span>)}</div>
          <VideoPoster rounded expandOnScroll />
        </section>

        <section className="about page-width" id="about" ref={aboutRef} aria-labelledby="about-title">
          <div className="about-pin">
          <h2 className="section-title low-contrast-heading" id="about-title"><SectionHeading heading={content.about.heading} /></h2>
          <div className="about-layout">
            <div className="about-media"><FlyingPosters items={content.about.posters} planeWidth={content.about.planeWidth} planeHeight={content.about.planeHeight} distortion={3} /></div>
            <div className="about-copy">
              <AboutParagraph targetRef={aboutRef} />
              <div className="about-stats">
                {content.about.stats.map((stat) => (
                  <div key={stat.label}>
                    <strong><CountUp value={stat.value} decimals={stat.decimals} /><span>{stat.suffix}</span></strong>
                    <p>{stat.label}</p>
                  </div>
                ))}
                <div className="about-face">
                  <Image src={content.about.face} alt="" width={120} height={110} loading="lazy" />
                  <Image src={content.about.faceHover} alt="" width={120} height={110} loading="lazy" className="about-face-hover" />
                </div>
              </div>
            </div>
          </div>
          </div>
        </section>

        <section className="featured-section" id="projects" aria-labelledby="featured-title">
          <FeaturedWorks />
        </section>

        <div className="page-width side-rails services-and-stories">
          <section className="services-section" id="services" aria-labelledby="services-title">            <div className="services-heading">
              <div><p className="eyebrow">{content.services.eyebrow} <TurnArrowIcon /></p><h2 className="section-title" id="services-title"><SectionHeading heading={content.services.heading} /></h2></div>
              <CallButton onClick={() => setOverlay({ kind: 'contact', intent: 'call' })} cursorLabel="Book a call">{content.services.callLabel}</CallButton>
            </div>
             <div className="service-list">
               {content.services.items.map((service, index) => {
                 const isOpen = openService === index;
                 return (
                  <ServiceCard key={`${service.title}-${index}`} service={service} index={index} isOpen={isOpen} onToggle={() => setOpenService(isOpen ? null : index)} />
                 );
               })}
            </div>
          </section>
        </div>

        <Stories />

        <HelixRibbon onCarouselItemClick={(_item, index) => setOverlay({ kind: 'gallery', index })} />

        <div className="page-width side-rails approach-and-experience">
          <section className="approach-section" id="approach" aria-labelledby="approach-title">
            <h2 className="large-heading low-contrast-heading" id="approach-title"><SectionHeading heading={content.approach.heading} /></h2>
            <div className="approach-steps">{content.approach.steps.map((step, index) => <article className={`approach-step approach-step-${index + 1}`} key={`${step.title}-${index}`}><Image className="approach-step-image" src={step.image} alt="" fill sizes="(max-width: 800px) 50vw, 388px" loading="lazy" /><h3>{step.title}</h3><span className="approach-number" aria-hidden="true">0{index + 1}</span><p>{step.description}</p></article>)}</div>
          </section>
          <h2 className="large-heading low-contrast-heading experience-title" id="experience"><SectionHeading heading={content.experience.heading} /></h2>
        </div>

        <section className="experience-list" aria-labelledby="experience">
          <ScrollStack className="experience-stack" useWindowScroll stickyPinning itemDistance={24} baseScale={1} itemScale={0} stackPosition="0%" itemStackDistance={0} zoomOutScale={0.88}>
            {content.experience.items.map((job) => (
              <ScrollStackItem key={job.company}>
                <article className={`experience-item ${job.className}`}>
                  <div className="experience-header page-width"><div><p>{job.dates}</p><h3>{job.role}</h3></div><div className="experience-company"><p>{job.location}</p><h4>{job.company}</h4></div></div>
                  <div className="experience-detail-surface"><div className="experience-details page-width">{job.responsibilities.map((column, columnIndex) => <ol key={columnIndex}>{column.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}</ol>)}</div></div>
                </article>
              </ScrollStackItem>
            ))}
          </ScrollStack>
        </section>

        <Testimonials />
      </main>
      </div>

      <SiteFooter />
      <SiteNav />
      <SiteCursor />

      {overlay?.kind === 'menu' && <RadialMenu onClose={closeOverlay} onNavigate={navigateTo} />}
      {overlay?.kind === 'contact' && <Dialog label={overlay.intent === 'call' ? 'Book a discovery call' : 'Contact Seam Rahman'} className="contact-dialog" onClose={closeOverlay}><ContactForm intent={overlay.intent} /></Dialog>}
      {overlay?.kind === 'gallery' && galleryItem && <Dialog label={`${galleryItem.title} design`} className="gallery-dialog" onClose={closeOverlay}>
        <div className="gallery-dialog-content"><Image src={galleryItem.src} alt={galleryItem.alt} width={1024} height={1024} /></div>
      </Dialog>}
    </ContentProvider>
  );
}
