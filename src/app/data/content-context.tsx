'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { SiteContent } from './content-types';

const ContentContext = createContext<SiteContent | null>(null);

export function ContentProvider({ content, children }: { content: SiteContent; children: ReactNode }) {
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export function useSiteContent(): SiteContent {
  const content = useContext(ContentContext);
  if (!content) throw new Error('useSiteContent must be used within a ContentProvider');
  return content;
}

/** Renders a section heading: `{text} <span>{accent}</span> {suffix}`. */
export function SectionHeading({ heading }: { heading: { text: string; accent: string; suffix?: string } }) {
  if (!heading.accent) return <>{heading.text}</>;
  return (
    <>
      {heading.text} <span>{heading.accent}</span>
      {heading.suffix ? ` ${heading.suffix}` : ''}
    </>
  );
}
