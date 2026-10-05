'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useSpring } from 'motion/react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import Dialog from './Dialog';
import ContactForm from './ContactForm';
import TiltedCard from './TiltedCard';
import TechText from './TechText';
import FlyingPosters from './FlyingPosters';
import CircularCarousel from './CircularCarousel';
import ScrollStack, { ScrollStackItem } from './ScrollStack';
import SiteFooter from './SiteFooter';
import { ArrowIcon, PhoneIcon, QuoteIcon, TurnArrowIcon } from './Icons';
import { approach, clients, experience, images, navigation, portfolioUrl, services } from '../data/portfolio';
import { downloadResume } from '../utils/downloadResume';

type Overlay =
  | { kind: 'menu' }
  | { kind: 'contact'; intent: 'project' | 'call' }
  | { kind: 'project'; index: number; mode: 'live' | 'design' }
  | { kind: 'gallery'; index: number }
  | null;

function CallButton({ children, onClick }: { children: string; onClick: () => void }) {
  return <button className="call-button" onClick={onClick}>{children}<span className="call-button-icon"><PhoneIcon /></span></button>;
}

const VIDEO_SRC = 'https://videos.pexels.com/video-files/7423593/7423593-hd_1280_720_30fps.mp4';
const VIDEO_FALLBACK = 'https://www.pexels.com/video/woman-using-a-laptop-7423593/';

// Module-level so the FlyingPosters effect doesn't re-initialise on every render.
const aboutPosters = [
  '/images/orange-sunscreen.jpg',
  '/images/story-app.jpg',
  '/images/designer-portrait.jpg',
  '/images/visual-story.jpg',
];

const carouselItems = [
  { src: images.app, alt: 'Story Creating App with colorful mobile interfaces and a friendly 3D wizard', title: 'Story Creating App', subtitle: 'Mobile design' },
  { src: images.product, alt: 'Two orange sunscreen bottles with palm-leaf shadows on a peach background', title: 'Helping Hand', subtitle: 'Product design' },
  { src: images.portrait, alt: 'Portrait of Seam Rahman', title: 'Seam Rahman', subtitle: 'Product designer' },
  { src: images.story, alt: 'A woman working on her laptop in a bright, sunlit kitchen', title: 'Visual Stories', subtitle: 'Film' },
  { src: images.cap, alt: 'A graduation cap resting on a plain surface', title: 'Milestones', subtitle: 'Journey' },
  ...Array.from({ length: 10 }, (_, i) => ({
    src: `https://picsum.photos/seed/latest-${i + 1}/900/900`,
    alt: `Dummy design ${i + 1}`,
    title: `Dummy ${i + 1}`,
    subtitle: 'Placeholder',
  })),
];

function VideoPoster({ rounded = false }: { rounded?: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [failed, setFailed] = useState(false);

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
      void video.play().catch(() => setFailed(true));
    } else {
      video.pause();
    }
  }

  return (
    <div
      ref={frameRef}
      className={`video-poster ${rounded ? 'video-poster-rounded' : ''} ${failed ? '' : 'cursor-hidden'}`}
      role="button"
      tabIndex={0}
      aria-label={playing ? 'Pause visual story video' : 'Play visual story video'}
      onClick={togglePlay}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); togglePlay(); } }}
      onMouseEnter={(event) => { setHovering(true); trackPointer(event); }}
      onMouseMove={trackPointer}
      onMouseLeave={() => setHovering(false)}
    >
      <Image src={images.story} alt="A woman working on her laptop in a bright, sunlit kitchen" fill sizes="100vw" priority={rounded} />
      {started && (
        <video
          ref={videoRef}
          className="video-inline"
          src={VIDEO_SRC}
          poster={images.story}
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      )}
      {failed && (
        <a className="outline-button video-inline-fallback" href={VIDEO_FALLBACK} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
          Watch the film <ArrowIcon />
        </a>
      )}
      {hovering && !failed && (
        <motion.div className="video-cursor" style={{ x: cursorSpringX, y: cursorSpringY }} initial={{ opacity: 0 }} animate={{ opacity: 1, scale: playing ? 0.92 : 1 }}>
          <span>{playing ? 'PAUSE' : 'PLAY'}</span>
        </motion.div>
      )}
    </div>
  );
}

export default function Portfolio() {
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [openService, setOpenService] = useState<number | null>(0);
  const [activeClient, setActiveClient] = useState(1);
  const lenisRef = useRef<Lenis | null>(null);
  const clientRefs = useRef<(HTMLButtonElement | null)[]>([]);
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
  useEffect(() => {
    if (!hasOverlay) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lenisRef.current?.stop();
    return () => {
      document.body.style.overflow = previousOverflow;
      lenisRef.current?.start();
    };
  }, [hasOverlay]);

  function navigateTo(href: string) {
    setOverlay(null);
    window.requestAnimationFrame(() => {
      lenisRef.current?.start();
      if (lenisRef.current) lenisRef.current.scrollTo(href, { offset: -32, duration: 1.3 });
      else document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
      window.history.replaceState(null, '', href);
    });
  }

  function handleClientKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % clients.length;
    else if (event.key === 'ArrowLeft') next = (index + clients.length - 1) % clients.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = clients.length - 1;
    else return;
    event.preventDefault();
    setActiveClient(next);
    clientRefs.current[next]?.focus();
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header page-width" id="home">
        <button className="cv-button" onClick={downloadResume}>Curriculum Vitae | CV</button>
        <button className="menu-button" onClick={() => setOverlay({ kind: 'menu' })} aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded={overlay?.kind === 'menu'}><span /><span /><span /></button>
      </header>

      <main id="main">
        <section className="hero page-width" aria-label="Seam Rahman, product designer">
          <div className="hero-introduction">
            <div className="hero-name"><p>Hello there,I&apos;m</p><h2>SEAM<br />RAHMAN</h2></div>
            <TiltedCard
              imageSrc={images.portrait}
              altText="Seam Rahman"
              captionText="Seam Rahman — Product Designer"
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
              <p>I help startups and businesses transform their ideas into intuitive digital products that users love. Through research, UX strategy, and modern interface design, I create experiences that improve engagement &amp; business growth.</p>
              <CallButton onClick={() => setOverlay({ kind: 'contact', intent: 'project' })}>Contact With Me</CallButton>
            </div>
          </div>
          <h1 className="hero-title">
            <TechText
              text="PRODUCT DESIGNER"
              fontWeight={550}
              fontSize={114}
              color="#222222"
              accentColor="#ff505b"
            />
          </h1>
          <div className="hero-disciplines"><span>HELPING STARTUPS SCALE</span><span>SAAS EXPERIENCE</span><span>BUILDING DIGITAL PRODUCTS</span></div>
          <VideoPoster rounded />
        </section>

        <section className="about page-width" id="about" aria-labelledby="about-title">
          <h2 className="section-title low-contrast-heading" id="about-title">ABOUT <span>ME</span></h2>
          <div className="about-layout">
            <div className="about-media"><FlyingPosters items={aboutPosters} planeWidth={250} planeHeight={280} distortion={3} /></div>
            <div className="about-copy">
              <p>I&apos;m a UI/UX &amp; Product Designer with 2.5+ years of experience, currently working with a <em>multinational company</em>, focused on solving complex product problems through simple, intuitive, and user-centered design. I&apos;ve worked across multiple digital products, including <em>Crypto currency</em> and <em>Perfect Panel</em>, combining my BBA background, <em>marketing &amp; sales knowledge</em>, and product thinking to help startups and digital businesses build better digital experiences.</p>
              <div className="about-stats">
                <div><strong>2.5<span>+</span></strong><p>Years Experience</p></div>
                <div><strong>65<span>+</span></strong><p>Projects delivered</p></div>
                <div><strong>96<span>%</span></strong><p>Returning clients</p></div>
                <Image src={images.cap} alt="" width={120} height={110} loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        <section className="featured-section" id="projects" aria-labelledby="featured-title">
          <div className="page-width side-rails featured-inner">
            <div className="featured-heading">
              <div><p className="eyebrow">PROJECT <TurnArrowIcon /></p><h2 id="featured-title">FEATURED WORKS</h2></div>
              <a className="view-all" href="#latest-works">VIEW ALL PROJECT <ArrowIcon /></a>
            </div>
            <div className="projects-list">
              {Array.from({ length: 5 }, (_, index) => (
                <article className="project-row" key={index} aria-label={`Helping hand, project ${index + 1}`}>
                  <div className="project-info">
                    <span className="project-number">0{index + 1}</span>
                    <div className="project-caption">
                      <h3>Helping hand</h3>
                      <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum<br className="wide-break" /> has been the industry&apos;s standard dummy text...</p>
                      <div className="project-links">
                        <button onClick={() => setOverlay({ kind: 'project', index, mode: 'live' })}>Live Link <ArrowIcon /></button>
                        <button onClick={() => setOverlay({ kind: 'project', index, mode: 'design' })}>Figma Link <ArrowIcon /></button>
                      </div>
                    </div>
                  </div>
                  <button className="project-image-button" onClick={() => setOverlay({ kind: 'project', index, mode: 'live' })} aria-label={`View Helping hand project ${index + 1}`}><Image src={images.product} alt="Two orange sunscreen bottles with palm-leaf shadows on a peach background" width={1024} height={1024} loading="lazy" /></button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="page-width side-rails services-and-stories">
          <section className="services-section" id="services" aria-labelledby="services-title">
            <div className="services-heading">
              <div><p className="eyebrow">MY SERVICES <TurnArrowIcon /></p><h2 className="section-title" id="services-title">SERVICES I OFFER</h2></div>
              <CallButton onClick={() => setOverlay({ kind: 'contact', intent: 'call' })}>Book a Call</CallButton>
            </div>
            <div className="service-list">
              {services.map((service, index) => {
                const isOpen = openService === index;
                return (
                  <article className={`service-item ${isOpen ? 'is-open' : ''}`} key={service.title}>
                    <h3><button className="service-toggle" id={`service-toggle-${index}`} aria-expanded={isOpen} aria-controls={`service-panel-${index}`} onClick={() => setOpenService(isOpen ? null : index)}><span className="service-heading-text"><span className="service-number">0{index + 1}</span>{service.title}</span><span className="service-toggle-icon"><span /><span /></span></button></h3>
                    <div className="service-panel" id={`service-panel-${index}`} role="region" aria-labelledby={`service-toggle-${index}`} inert={!isOpen}>
                      <div className="service-panel-clip"><div className="service-details">
                        <div className="service-description"><p>{service.description}</p><div className="service-tags">{service.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
                        <div className="service-media" aria-hidden="true"><div /><div /></div>
                      </div></div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
          <section className="stories-section" id="stories" aria-labelledby="stories-title">
            <h2 id="stories-title" className="stories-title"><span>VISUAL</span><Image src={images.story} alt="" width={314} height={112} loading="lazy" /><span>STORIES</span></h2>
            <VideoPoster />
          </section>
        </div>

        <section className="latest-section" id="latest-works" aria-labelledby="latest-title">
          <h2 id="latest-title">LATEST <span>DESIGN</span> WORKS</h2>
          <div className="latest-carousel">
            <CircularCarousel
              items={carouselItems}
              preset="cylinder"
              intro="rise"
              cardWidth={220}
              aspectRatio={1}
              speed={14}
              captions
              fadeColor="#000000"
              onItemClick={(_item, index) => setOverlay({ kind: 'gallery', index })}
            />
          </div>
        </section>

        <div className="page-width side-rails approach-and-experience">
          <section className="approach-section" id="approach" aria-labelledby="approach-title">
            <h2 className="large-heading low-contrast-heading" id="approach-title">MY PRODUCT <span>APPROACH</span></h2>
            <div className="approach-steps">{approach.map((step, index) => <article className={`approach-step approach-step-${index + 1}`} key={step.title}><Image className="approach-step-image" src={step.image} alt="" fill sizes="(max-width: 800px) 50vw, 388px" loading="lazy" /><h3>{step.title}</h3><span className="approach-number" aria-hidden="true">0{index + 1}</span><p>{step.description}</p></article>)}</div>
          </section>
          <h2 className="large-heading low-contrast-heading experience-title" id="experience">WORK <span>EXPERIENCE</span></h2>
        </div>

        <section className="experience-list" aria-labelledby="experience">
          <ScrollStack className="experience-stack" useWindowScroll itemDistance={24} baseScale={1} itemScale={0} stackPosition="0%" itemStackDistance={0} zoomOutScale={0.88}>
            {experience.map((job) => (
              <ScrollStackItem key={job.company}>
                <article className={`experience-item ${job.className}`}>
                  <div className="experience-header page-width"><div><p>{job.dates}</p><h3>{job.role}</h3></div><div className="experience-company"><p>{job.location}</p><h4>{job.company}</h4></div></div>
                  <div className="experience-detail-surface"><div className="experience-details page-width">{job.responsibilities.map((column, columnIndex) => <ol key={columnIndex}>{column.map((item) => <li key={item}>{item}</li>)}</ol>)}</div></div>
                </article>
              </ScrollStackItem>
            ))}
          </ScrollStack>
        </section>

        <section className="testimonials page-width" id="clients" aria-labelledby="clients-title">
          <h2 className="large-heading low-contrast-heading" id="clients-title">WORDS <span>FROM</span> CLIENTS</h2>
          <QuoteIcon className="quote-mark" />
          <div className="testimonial-space" id="client-panel" role="tabpanel" aria-labelledby={`client-tab-${activeClient}`} aria-live="polite"><p className="sr-only">{clients[activeClient].name}, {clients[activeClient].role}</p></div>
          <div className="client-tabs" role="tablist" aria-label="Clients">
            {clients.map((client, index) => <button className={`client-tab ${activeClient === index ? 'is-active' : ''}`} key={client.name} id={`client-tab-${index}`} role="tab" aria-selected={activeClient === index} aria-controls="client-panel" tabIndex={activeClient === index ? 0 : -1} ref={(node) => { clientRefs.current[index] = node; }} onKeyDown={(event) => handleClientKey(event, index)} onClick={() => setActiveClient(index)}><Image src={images.portrait} style={{ objectPosition: client.position }} alt="" width={44} height={44} loading="lazy" /><span><strong>{client.name}</strong><small>{client.role}</small></span></button>)}
          </div>
          <div className="client-progress" aria-hidden="true"><span style={{ '--active-client': activeClient } as CSSProperties} /></div>
        </section>
      </main>

      <SiteFooter />

      {overlay?.kind === 'menu' && <Dialog label="Navigation menu" className="navigation-dialog" onClose={closeOverlay}>
        <div className="navigation-content"><p className="dialog-eyebrow">SEAM RAHMAN</p>
          <nav aria-label="Main navigation">{navigation.map((link, index) => <a href={link.href} key={link.href} style={{ '--item-index': index } as CSSProperties} onClick={(event) => { event.preventDefault(); navigateTo(link.href); }}><span>0{index + 1}</span>{link.label}<ArrowIcon /></a>)}</nav>
          <button className="solid-button" onClick={() => setOverlay({ kind: 'contact', intent: 'project' })}>Let&apos;s work together <ArrowIcon /></button>
        </div>
      </Dialog>}
      {overlay?.kind === 'contact' && <Dialog label={overlay.intent === 'call' ? 'Book a discovery call' : 'Contact Seam Rahman'} className="contact-dialog" onClose={closeOverlay}><ContactForm intent={overlay.intent} /></Dialog>}
      {overlay?.kind === 'project' && <Dialog label={`Helping hand project ${overlay.index + 1}`} className="project-dialog" onClose={closeOverlay}>
        <div className="project-dialog-content"><Image className="project-dialog-image" src={images.product} alt="Helping hand orange sunscreen product design" width={1024} height={1024} />
          <div className="project-dialog-copy"><p className="dialog-eyebrow">PROJECT 0{overlay.index + 1} / {overlay.mode === 'design' ? 'DESIGN PREVIEW' : 'PROJECT PREVIEW'}</p><h2>Helping hand</h2><p>A closer look at the visual direction featured in this portfolio.</p>
            <dl><div><dt>Focus</dt><dd>Product presentation</dd></div><div><dt>Discipline</dt><dd>Visual design &amp; art direction</dd></div><div><dt>Palette</dt><dd><span className="palette-dot palette-orange" /><span className="palette-dot palette-peach" /><span className="palette-dot palette-black" /></dd></div></dl>
            {overlay.mode === 'design' && <p className="preview-note">The original Figma file was not included with the reference. You can explore the design artwork here.</p>}
            <a className="outline-button" href={images.product} download="helping-hand-design.jpg">Download artwork <ArrowIcon /></a><a className="text-button portfolio-link" href={portfolioUrl} target="_blank" rel="noreferrer">Explore the portfolio on Behance <ArrowIcon /></a>
          </div>
        </div>
      </Dialog>}
      {overlay?.kind === 'gallery' && <Dialog label="Story Creating App design" className="gallery-dialog" onClose={closeOverlay}>
        <div className="gallery-dialog-content"><Image src={images.app} alt="Story Creating App mobile design presentation" width={1024} height={1024} /><div className="gallery-dialog-footer"><div><p className="dialog-eyebrow">LATEST DESIGN WORK / 0{overlay.index + 1}</p><h2>Story Creating App</h2></div><a className="outline-button" href={images.app} download="story-creating-app.jpg">Download design <ArrowIcon /></a></div></div>
      </Dialog>}
    </>
  );
}
