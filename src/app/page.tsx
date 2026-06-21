import Reveal from "@/components/Reveal";
import PageRenderer from "@/components/PageRenderer";
import { getFrontPage } from "@/lib/pages";

export const revalidate = 60;

export default async function Home() {
  const { page, blocks } = await getFrontPage();
  const pageBlocks = blocks.length
    ? blocks.map((b: any) => ({
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

function safeParse(json: string): any {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
