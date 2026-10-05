'use client';

import { useLayoutEffect, useRef, useCallback, type ReactNode } from 'react';
import Lenis from 'lenis';
import './ScrollStack.css';

type ScrollStackItemProps = { children: ReactNode; itemClassName?: string };

export const ScrollStackItem = ({ children, itemClassName = '' }: ScrollStackItemProps) => (
  <div className={`scroll-stack-card ${itemClassName}`.trim()}>{children}</div>
);

type ScrollStackProps = {
  children: ReactNode;
  className?: string;
  itemDistance?: number;
  itemScale?: number;
  itemStackDistance?: number;
  stackPosition?: string;
  scaleEndPosition?: string;
  baseScale?: number;
  scaleDuration?: number;
  rotationAmount?: number;
  blurAmount?: number;
  /** Scale the covered card shrinks to while the next card slides over it. 1 disables. */
  zoomOutScale?: number;
  useWindowScroll?: boolean;
  onStackComplete?: () => void;
};

type CardTransform = { translateY: number; scale: number; rotation: number; blur: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const ScrollStack = ({
  children,
  className = '',
  itemDistance = 100,
  itemScale = 0.03,
  itemStackDistance = 30,
  stackPosition = '20%',
  scaleEndPosition = '10%',
  baseScale = 0.85,
  scaleDuration = 0.5,
  rotationAmount = 0,
  blurAmount = 0,
  zoomOutScale = 1,
  useWindowScroll = false,
  onStackComplete,
}: ScrollStackProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stackCompletedRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const cardsRef = useRef<HTMLElement[]>([]);
  const lastTransformsRef = useRef(new Map<number, CardTransform>());
  const isUpdatingRef = useRef(false);

  const calculateProgress = useCallback((scrollTop: number, start: number, end: number) => {
    if (scrollTop < start) return 0;
    if (scrollTop > end) return 1;
    return (scrollTop - start) / (end - start);
  }, []);

  const parsePercentage = useCallback((value: string, containerHeight: number) => {
    if (typeof value === 'string' && value.includes('%')) {
      return (parseFloat(value) / 100) * containerHeight;
    }
    return parseFloat(value);
  }, []);

  const getScrollData = useCallback(() => {
    if (useWindowScroll) {
      return {
        scrollTop: window.scrollY,
        containerHeight: window.innerHeight,
        scrollContainer: document.documentElement,
      };
    } else {
      const scroller = scrollerRef.current;
      return {
        scrollTop: scroller?.scrollTop ?? 0,
        containerHeight: scroller?.clientHeight ?? 0,
        scrollContainer: (scroller ?? document.documentElement) as HTMLElement,
      };
    }
  }, [useWindowScroll]);

  // Layout positions via the offsetTop chain — unaffected by the transforms we
  // apply, so measuring never feeds the cards' own movement back into the math.
  const getLayoutTop = useCallback(
    (element: HTMLElement) => {
      if (!useWindowScroll) return element.offsetTop;
      let top = 0;
      let current: HTMLElement | null = element;
      while (current) {
        top += current.offsetTop;
        current = current.offsetParent as HTMLElement | null;
      }
      return top;
    },
    [useWindowScroll]
  );

  // Measured fresh on every update, with ALL reads batched before any style
  // writes: batching keeps the transform math a pure function of scroll (no
  // read-after-write reflow churn, no jitter) while re-reading each frame keeps
  // the pin/release points correct when page content above the stack changes.
  const updateCardTransforms = useCallback(() => {
    if (!cardsRef.current.length || isUpdatingRef.current) return;

    isUpdatingRef.current = true;

    const { scrollTop, containerHeight } = getScrollData();
    const stackPositionPx = parsePercentage(stackPosition, containerHeight);
    const scaleEndPositionPx = parsePercentage(scaleEndPosition, containerHeight);
    const zoom = clamp(zoomOutScale, 0, 1);
    const total = cardsRef.current.length;

    // READ phase — every layout measurement happens before the first write.
    const endElement = useWindowScroll
      ? document.querySelector<HTMLElement>('.scroll-stack-end')
      : (scrollerRef.current?.querySelector('.scroll-stack-end') as HTMLElement | null);
    const endElementTop = endElement ? getLayoutTop(endElement) : 0;
    const baseTops = cardsRef.current.map((card) => (card ? getLayoutTop(card) : 0));

    // WRITE phase
    cardsRef.current.forEach((card, i) => {
      if (!card) return;

      const cardTop = baseTops[i] ?? 0;
      const triggerStart = cardTop - stackPositionPx - itemStackDistance * i;
      const triggerEnd = cardTop - scaleEndPositionPx;
      const pinStart = triggerStart;
      // Release when the end marker reaches the BOTTOM of the viewport: the
      // pinned cards then hand off to the following content exactly edge to
      // edge. (The source's -height/2 made the deck overlap the next section.)
      const pinEnd = endElementTop - containerHeight;

      const scaleProgress = calculateProgress(scrollTop, triggerStart, triggerEnd);
      const targetScale = baseScale + i * itemScale;
      let scale = 1 - scaleProgress * (1 - targetScale);
      const rotation = rotationAmount ? i * rotationAmount * scaleProgress : 0;

      if (zoom < 1 && i < total - 1) {
        // While the next card slides up to cover this one, zoom this card into
        // the background instead of stacking a visible border behind it.
        const nextBaseTop = baseTops[i + 1] ?? 0;
        const nextPinStart = nextBaseTop - stackPositionPx - itemStackDistance * (i + 1);
        const coverProgress = calculateProgress(scrollTop, nextPinStart - containerHeight, nextPinStart);
        scale = 1 - coverProgress * (1 - zoom);
      }

      let blur = 0;
      if (blurAmount) {
        let topCardIndex = 0;
        for (let j = 0; j < total; j++) {
          const jTriggerStart = (baseTops[j] ?? 0) - stackPositionPx - itemStackDistance * j;
          if (scrollTop >= jTriggerStart) {
            topCardIndex = j;
          }
        }

        if (i < topCardIndex) {
          const depthInStack = topCardIndex - i;
          blur = Math.max(0, depthInStack * blurAmount);
        }
      }

      let translateY = 0;
      const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;

      if (isPinned) {
        translateY = scrollTop - cardTop + stackPositionPx + itemStackDistance * i;
      } else if (scrollTop > pinEnd) {
        translateY = pinEnd - cardTop + stackPositionPx + itemStackDistance * i;
      }

      const newTransform: CardTransform = {
        translateY: Math.round(translateY * 100) / 100,
        scale: Math.round(scale * 1000) / 1000,
        rotation: Math.round(rotation * 100) / 100,
        blur: Math.round(blur * 100) / 100,
      };

      const lastTransform = lastTransformsRef.current.get(i);
      const hasChanged =
        !lastTransform ||
        Math.abs(lastTransform.translateY - newTransform.translateY) > 0.1 ||
        Math.abs(lastTransform.scale - newTransform.scale) > 0.001 ||
        Math.abs(lastTransform.rotation - newTransform.rotation) > 0.1 ||
        Math.abs(lastTransform.blur - newTransform.blur) > 0.1;

      if (hasChanged) {
        const transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale}) rotate(${newTransform.rotation}deg)`;
        const filter = newTransform.blur > 0 ? `blur(${newTransform.blur}px)` : '';

        card.style.transform = transform;
        card.style.filter = filter;

        lastTransformsRef.current.set(i, newTransform);
      }

      if (i === cardsRef.current.length - 1) {
        const isInView = scrollTop >= pinStart && scrollTop <= pinEnd;
        if (isInView && !stackCompletedRef.current) {
          stackCompletedRef.current = true;
          onStackComplete?.();
        } else if (!isInView && stackCompletedRef.current) {
          stackCompletedRef.current = false;
        }
      }
    });

    isUpdatingRef.current = false;
  }, [
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    rotationAmount,
    blurAmount,
    zoomOutScale,
    useWindowScroll,
    onStackComplete,
    calculateProgress,
    parsePercentage,
    getScrollData,
    getLayoutTop,
  ]);

  const handleScroll = useCallback(() => {
    updateCardTransforms();
  }, [updateCardTransforms]);

  // In container mode the stack owns its own Lenis instance. In window mode we
  // deliberately do NOT create one: the page already runs Lenis (driving the
  // native window scroll), so we simply react to the native scroll position.
  const setupLenis = useCallback(() => {
    if (useWindowScroll) return undefined;

    const scroller = scrollerRef.current;
    if (!scroller) return undefined;

    const lenis = new Lenis({
      wrapper: scroller,
      content: (scroller.querySelector('.scroll-stack-inner') as HTMLElement | null) ?? undefined,
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 2,
      infinite: false,
      gestureOrientationHandler: true,
      normalizeWheel: true,
      wheelMultiplier: 1,
      touchInertiaMultiplier: 35,
      lerp: 0.1,
      syncTouch: true,
      syncTouchLerp: 0.075,
      touchInertia: 0.6,
    } as ConstructorParameters<typeof Lenis>[0]);

    lenis.on('scroll', handleScroll);

    const raf = (time: number) => {
      lenis.raf(time);
      animationFrameRef.current = requestAnimationFrame(raf);
    };
    animationFrameRef.current = requestAnimationFrame(raf);

    lenisRef.current = lenis;
    return lenis;
  }, [handleScroll, useWindowScroll]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;

    const cards = Array.from(
      useWindowScroll
        ? document.querySelectorAll<HTMLElement>('.scroll-stack-card')
        : scroller.querySelectorAll<HTMLElement>('.scroll-stack-card')
    );

    cardsRef.current = cards;
    const transformsCache = lastTransformsRef.current;

    cards.forEach((card, i) => {
      if (i < cards.length - 1) {
        card.style.marginBottom = `${itemDistance}px`;
      }
      card.style.willChange = 'transform, filter';
      card.style.transformOrigin = 'top center';
      card.style.backfaceVisibility = 'hidden';
      card.style.transform = 'translateZ(0)';
      card.style.webkitTransform = 'translateZ(0)';
      card.style.perspective = '1000px';
      card.style.webkitPerspective = '1000px';
    });

    const handleResize = () => {
      updateCardTransforms();
    };

    let cleanupScroll: () => void;
    if (useWindowScroll) {
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleResize);
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(scroller);
      cleanupScroll = () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
      };
    } else {
      setupLenis();
      cleanupScroll = () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        if (lenisRef.current) {
          lenisRef.current.destroy();
          lenisRef.current = null;
        }
      };
    }

    updateCardTransforms();

    return () => {
      cleanupScroll();
      stackCompletedRef.current = false;
      cardsRef.current = [];
      transformsCache.clear();
      isUpdatingRef.current = false;
    };
  }, [
    itemDistance,
    itemScale,
    itemStackDistance,
    stackPosition,
    scaleEndPosition,
    baseScale,
    scaleDuration,
    rotationAmount,
    blurAmount,
    useWindowScroll,
    onStackComplete,
    setupLenis,
    updateCardTransforms,
    handleScroll,
  ]);

  return (
    <div className={`scroll-stack-scroller ${className}`.trim()} ref={scrollerRef}>
      <div className="scroll-stack-inner">
        {children}
        {/* Spacer so the last pin can release cleanly */}
        <div className="scroll-stack-end" />
      </div>
    </div>
  );
};

export default ScrollStack;
