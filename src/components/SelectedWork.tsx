import Link from "next/link";
import Reveal from "./Reveal";

type Project = {
  slug: string;
  title: string;
  location: string;
  year: string;
  scope: string;
  image: string;
};

const seed: Project[] = [
  {
    slug: "casa-mira",
    title: "Casa Mira",
    location: "Bandra, Mumbai",
    year: "2024",
    scope: "1,820 sq.ft · 3-bed apartment",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1600&auto=format&fit=crop",
  },
  {
    slug: "nalanda-house",
    title: "Nalanda House",
    location: "Kalyan, Maharashtra",
    year: "2024",
    scope: "4,200 sq.ft · Independent villa",
    image: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1600&auto=format&fit=crop",
  },
  {
    slug: "salt-flats",
    title: "Salt Flats",
    location: "Alibaug, Maharashtra",
    year: "2023",
    scope: "3,400 sq.ft · Coastal home",
    image: "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?q=80&w=1600&auto=format&fit=crop",
  },
];

export default function SelectedWork({
  slugs,
  title = "Selected work",
  lede = "Three recent residences. Drawings archived, photographs kept. No full client list published.",
}: {
  slugs?: string[];
  title?: string;
  lede?: string;
}) {
  const projects: Project[] = slugs?.length
    ? slugs
        .map((s) => seed.find((p) => p.slug === s))
        .filter((p): p is Project => Boolean(p))
    : seed;
  if (projects.length === 0) {
    return (
      <section className="py-24 md:py-36">
        <div className="container-page text-center text-ink-mute">
          No selected work yet.
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 md:py-36" aria-label="Selected work">
      <div className="container-page">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12 md:mb-20">
          <div>
            <h2 className="text-4xl md:text-6xl tracking-tighter">{title}</h2>
            <p className="mt-4 text-ink-mute max-w-[48ch]">{lede}</p>
          </div>
          <Link
            href="/projects"
            className="text-sm font-mono uppercase tracking-[0.18em] hairline-strong border-b pb-1"
          >
            Full archive →
          </Link>
        </div>

        <div className="space-y-20 md:space-y-32">
          {projects.map((p, i) => (
            <Reveal
              key={p.slug}
              className={`grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-end ${
                i % 2 === 1 ? "md:[direction:rtl]" : ""
              }`}
            >
              <Link
                href={`/projects/${p.slug}`}
                className="md:col-span-8 block overflow-hidden rounded-[var(--radius-card)] aspect-[16/10] relative md:[direction:ltr]"
              >
                <img
                  src={p.image}
                  alt={p.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-[1.04]"
                />
              </Link>
              <div className="md:col-span-4 md:[direction:ltr]">
                <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute">
                  {p.year}
                </p>
                <h3 className="text-3xl md:text-4xl mt-3 tracking-tight">
                  <Link
                    href={`/projects/${p.slug}`}
                    className="hover:text-accent transition-colors"
                  >
                    {p.title}
                  </Link>
                </h3>
                <p className="text-sm text-ink-mute mt-2 font-mono uppercase tracking-[0.16em]">
                  {p.location}
                </p>
                <p className="mt-4 text-ink-mute">{p.scope}</p>
                <Link
                  href={`/projects/${p.slug}`}
                  className="inline-flex items-center gap-2 mt-6 text-sm border-b hairline-strong pb-1"
                >
                  View project
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
