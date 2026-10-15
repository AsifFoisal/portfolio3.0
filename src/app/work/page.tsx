import type { Metadata } from "next";
import WorkPage from "../components/WorkPage";
import { ContentProvider } from "../data/content-context";
import { getContent } from "../data/content-store";

// Read the admin-managed content on every request so /admin edits show up here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Work — Seam Rahman",
  description:
    "Selected product, UI/UX and design work by Seam Rahman — case studies across SaaS, EdTech, fintech and more.",
};

export default async function Work() {
  const content = await getContent();
  return (
    <ContentProvider content={content}>
      <WorkPage />
    </ContentProvider>
  );
}
