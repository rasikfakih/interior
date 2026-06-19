import Reveal from "./Reveal";

type Quote = {
  body: string;
  name: string;
  role: string;
  location: string;
  initial?: string;
  tone?: string;
};

const defaultQuotes: Quote[] = [
  {
    body:
      "They drew every drawing on paper. The site team worked to those drawings. The home we live in today looks like the drawings.",
    name: "Rhea D.",
    role: "Homeowner",
    location: "Casa Mira, Bandra",
    tone: "var(--accent)",
  },
  {
    body:
      "No surprise substitutions. No margin pad on the bill. The handover manual is a document we still open before guests arrive.",
    name: "Aravind K.",
    role: "Homeowner",
    location: "Nalanda House, Kalyan",
    tone: "var(--accent-warm)",
  },
  {
    body:
      "We came in with a Pinterest folder and a budget. We left with a home and an instruction manual. Twenty-four weeks exactly.",
    name: "Mira S.",
    role: "Homeowner",
    location: "Salt Flats, Alibaug",
    tone: "var(--accent-warm)",
  },
];

function toneFor(i: number): string {
  return i % 2 === 0 ? "var(--accent)" : "var(--accent-warm)";
}

function MonogramCircle({
  initial,
  tone,
}: {
  initial: string;
  tone: string;
}) {
  return (
    <span
      className="inline-flex items-center justify-center w-11 h-11 rounded-full font-mono text-base font-medium"
      style={{
        background: tone,
        color: "var(--bg)",
        letterSpacing: "-0.02em",
      }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

export default function Testimonials({ data }: { data?: any }) {
  const quotes: Quote[] = (data?.items || defaultQuotes).map(
    (q: Quote, i: number) => ({
      ...q,
      initial: q.initial ?? ((q.name?.charAt(0) || "·").toUpperCase()),
      tone: q.tone ?? toneFor(i),
    })
  );
  const title = data?.title ?? "Words from the homes.";
  const lede = data?.lede ?? "Three clients, three completions. Names abbreviated on request.";

  return (
    <section className="py-24 md:py-36" aria-label="Client voices">
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12 md:mb-16">
          <div className="md:col-span-7">
            <h2 className="text-4xl md:text-[3.5rem] tracking-tighter">{title}</h2>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <p className="text-ink-mute">{lede}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {quotes.map((q, i) => (
            <Reveal
              key={q.name}
              delay={i * 80}
              className="surface-tile p-7 md:p-8 flex flex-col gap-6"
              as="figure"
            >
              <span
                aria-hidden
                className="font-mono text-5xl leading-none text-warm/50 select-none"
              >
                “
              </span>
              <blockquote className="text-base md:text-lg leading-relaxed text-ink">
                {q.body}
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-3 pt-4 border-t hairline">
                <MonogramCircle initial={q.initial!} tone={q.tone!} />
                <div>
                  <p className="text-sm font-medium">{q.name}</p>
                  <p className="text-xs text-ink-mute font-mono uppercase tracking-[0.14em]">
                    {q.role} · {q.location}
                  </p>
                </div>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
