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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jamjuree.variable}`}>
      <body>{children}</body>
    </html>
  );
}
