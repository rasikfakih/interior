import Hero from "@/components/Hero";
import PageRenderer from "@/components/PageRenderer";
import Reveal from "@/components/Reveal";
import { getFrontPage } from "@/lib/pages";

export const revalidate = 60;

const fallbackBlocks: Array<{ id: number; type: string; data: any }> = [
  { id: 1, type: "hero", data: Hero as any },
];

export default async function Home() {
  const { page, blocks } = await getFrontPage();
  const pageBlocks = blocks.length
    ? blocks.map((b: any) => ({
        id: b.id,
        type: b.type,
        data: safeParse(b.data),
      }))
    : fallbackBlocks;

  return (
    <>
      <PageRenderer blocks={pageBlocks} />
    </>
  );
}

function safeParse(json: string) {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
