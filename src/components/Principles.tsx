import Reveal from "./Reveal";

const defaultItems = [
  { label: "One team", body: "Drawings, materials, and site direction from the same studio. No hand-offs." },
  { label: "Five phases", body: "A repeat process. Watched weekly. Reported in writing, not in chat." },
  { label: "On-site direction", body: "Weekly site visits. Snag lists with photographs. Final handover document." },
  { label: "No catalogue swap", body: "Materials are specified against the brief. Substitutions need a conversation." },
];

export default function Principles({ data }: { data?: any }) {
  const items = data?.items || defaultItems;
  const title = data?.title ?? "Four standards we hold ourselves to.";
  const lede =
    data?.lede ??
    "Drawn from the studio's first seven years. Decisions and standards, not copy.";
  return (
    <section
      className="py-20 md:py-28 bg-elev border-y hairline"
      aria-label="Studio principles"
    >
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          <div className="md:col-span-7">
            <h2 className="text-3xl md:text-5xl tracking-tighter">{title}</h2>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <p className="text-ink-mute">{lede}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--line)] border hairline rounded-[var(--radius-card)] overflow-hidden">
          {items.map((p: any, i: number) => (
            <Reveal key={i} delay={i * 60} className="bg-canvas p-6 md:p-7">
              <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-warm">
                0{i + 1}
              </p>
              <h3 className="text-xl md:text-2xl mt-3 mb-3 tracking-tight">
                {p.label}
              </h3>
              <p className="text-sm text-ink-mute leading-relaxed">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
