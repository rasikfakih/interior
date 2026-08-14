import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import PageRenderer from "@/components/PageRenderer";
import { getFrontPage, type BlockRow } from "@/lib/pages";

// WordPress-grade live update: every page that depends on
// admin-edited data renders dynamically. Admin writes call
// revalidatePath() in src/lib/revalidate.ts to bust the
// public cache so the next request sees the new state.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Per-page SEO (StudioOS Phase 1): the SEO panel in the page editor
// writes seo_title / seo_description / robots; this page serves them.
export async function generateMetadata(): Promise<Metadata> {
  const { page } = await getFrontPage();
  if (!page) return {};
  const title = page.seo_title || page.title || undefined;
  const description = page.seo_description || undefined;
  const noindex = page.robots ? page.robots.includes("noindex") : false;
  return {
    title: title || undefined,
    description,
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default async function Home() {
  const { blocks } = await getFrontPage();
  const pageBlocks = blocks.length
    ? blocks.map((b: BlockRow) => ({
        id: b.id,
        type: b.type,
        data: safeParse(b.data),
      }))
    : [];

  return (
    <>
      {pageBlocks.length === 0 ? (
        <Reveal>This page is empty. Open /admin to add blocks.</Reveal>
      ) : (
        <PageRenderer blocks={pageBlocks} />
      )}
    </>
  );
}

function safeParse(json: unknown): Record<string, unknown> {
  if (json == null) return {};
  if (typeof json === "object") return json as Record<string, unknown>;
  if (typeof json !== "string") return {};
  try {
    const parsed = JSON.parse(json) as unknown;
    return parsed != null && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
