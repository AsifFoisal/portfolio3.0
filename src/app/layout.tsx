import type { Metadata, Viewport } from "next";
import { Bai_Jamjuree, Inter } from "next/font/google";
import "./globals.css";
import { getContent } from "./data/content-store";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});


const jamjuree = Bai_Jamjuree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jamjuree",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const content = await getContent();
  return {
    title: content.meta.title,
    description: content.meta.description,
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

/*
 * Dev-only unstyled-content guard. `next dev` streams the HTML shell before
 * the compiled stylesheet chunk resolves, so a reload can flash the raw page.
 * The gate hides <body> until globals.css is provably applied (the :root
 * --accent variable exists), then reveals it — with a failsafe that force-
 * reveals after 4s so the site can never stay hidden. Production serves
 * render-blocking CSS, where the first poll clears the gate immediately.
 */
const foucGateScript = `(function () {
  var h = document.documentElement;
  var tries = 0;
  function clear() { h.classList.add('fouc-clear'); h.classList.remove('fouc-gate'); }
  function ready() {
    try { return getComputedStyle(h).getPropertyValue('--accent').trim().length > 0; }
    catch (e) { return true; }
  }
  (function poll() {
    if (ready()) return clear();
    if (++tries > 240) return clear();
    setTimeout(poll, 16);
  })();
})();`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`fouc-gate ${inter.variable} ${jamjuree.variable}`} suppressHydrationWarning>
      <body>
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html.fouc-gate > body{visibility:hidden !important}html.fouc-gate.fouc-clear>body{visibility:visible !important}",
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: foucGateScript }} />
        {children}
      </body>
    </html>
  );
}
