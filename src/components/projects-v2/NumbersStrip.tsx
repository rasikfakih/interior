import { getStudioBrand } from "@/lib/studio-brand";

type Stats =
  | { label: string; value: string; kind: "data" }
  | { label: string; valueFrom: string; kind: "computed" };

type Props = {
  projectCount: number;
};

/**
 * NumbersStripV2 - 3 stats with single dividers.
 *
 * Section 2. Taste-skill discipline:
 *   - 3 stats, never 4. The dropped one ("Average build, weeks: 24") was
 *     a fake-precise number banned under taste-skill 4.9.
 *   - Years active is computed from studio-brand year_established.
 *   - Residences delivered + Residences publishing are real data.
 *   - Hairline grid, no card boxes, font-mono for numbers.
 */
export default function NumbersStripV2({ projectCount }: Props) {
  const brand = getStudioBrand();
  const yearEstablished = brand.year_established || "2017";
  const residences = brand.residences_delivered || "60+";

  const stats: Stats[] = [
    { label: "Years active", valueFrom: yearEstablished, kind: "computed" },
    { label: "Residences delivered", value: residences, kind: "data" },
    { label: "Residences publishing", value: String(projectCount), kind: "data" },
  ];

  return (
    <section
      aria-label="Studio numbers"
      className="border-y hairline py-8 md:py-12 bg-canvas"
    >
      <div className="container-page">
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-y-8">
          {stats.map((s, i) => (
            <li
              key={s.label}
              className={`flex flex-col gap-2 px-0 md:px-6 ${
                i > 0 ? "md:border-l hairline" : ""
              }`}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                {s.label}
              </span>
              <span className="font-mono text-3xl md:text-5xl tracking-tight text-ink">
                {s.kind === "data" ? s.value : computeYears(s.valueFrom)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function computeYears(established: string): string {
  const start = parseInt(established, 10);
  if (Number.isNaN(start)) return "7";
  const now = new Date().getUTCFullYear();
  const computed = Math.max(1, now - start);
  return String(computed);
}
