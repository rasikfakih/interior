import type { Metadata } from "next";
import PageRenderer from "@/components/PageRenderer";
import { verifyPreviewToken } from "@/lib/revisions";
import { getPageById } from "@/lib/pages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Draft preview",
  robots: { index: false, follow: false },
};

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const pageId = token ? verifyPreviewToken(token) : null;

  if (!pageId) {
    return (
      <section className="min-h-[70dvh] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="chrome-pill mb-4 inline-flex">Preview</p>
          <h1 className="text-3xl tracking-tighter">Invalid or expired preview link.</h1>
          <p className="text-ink-mute mt-2 text-sm">
            Issue a fresh one from the page editor.
          </p>
        </div>
      </section>
    );
  }

  const { page, blocks } = await getPageById(pageId);
  if (!page) {
    return (
      <section className="min-h-[70dvh] flex items-center justify-center px-6">
        <p className="text-ink-mute">Page not found.</p>
      </section>
    );
  }

  const pageBlocks = blocks.map((b) => ({
    id: b.id,
    type: b.type,
    data: safeParse(b.data),
  }));

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[var(--z-modal)] bg-ink text-[var(--bg)]">
        <div className="container-page py-2 flex items-center justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em]">
            Draft preview · /{page.slug} · {page.status}
          </p>
          <a
            href={`/admin/pages/${page.id}`}
            className="font-mono text-[10px] uppercase tracking-[0.18em] underline"
          >
            Back to editor
          </a>
        </div>
      </div>
      <main>
        {pageBlocks.length === 0 ? (
          <section className="pt-32 pb-24 container-page">
            <p className="text-ink-mute">This page has no blocks yet.</p>
          </section>
        ) : (
          <PageRenderer blocks={pageBlocks} />
        )}
      </main>
    </>
  );
}

// PageRenderer's block contract is data: any (existing surface); the
// adapter must hand it the parsed shape, so the return is intentionally untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeParse(json: unknown): any {
  if (json == null) return {};
  if (typeof json === "object") return json;
  if (typeof json !== "string") return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
