import Portfolio from "./components/portfolio";
import { getContent } from "./data/content-store";

// The page reads the admin-managed content file on every request so edits
// from /admin show up immediately.
export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await getContent();
  return <Portfolio content={content} />;
}
