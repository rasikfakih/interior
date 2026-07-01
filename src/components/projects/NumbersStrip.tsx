import { getStudioBrand } from "@/lib/studio-brand";

type Stat = {
  label: string;
  value: string;
};

type Props = {
  projectCount: number;
};

/**
 * NumbersStrip - 4 inline mono stats with single dividers.
 *
 * Section 2 of 9 (after Hero). Taste-skill: no card containers in
 * density > 7 is moot here (density is 4) but we still avoid card
 * boxes - 1px lines separate data. font-mono for numbers (taste-
 * skill Section 7 density rule).
 *
 * No eyebrow. Pulled from studio-brand.json so white-label thread stays.
 */
export default function NumbersStrip({ projectCount }: Props) {
  const brand = getStudioBrand();
  const yearEstablished = brand.year_established || "2017";
  const residencesDelivered = brand.residences_delivered || "60+";

  const stats: Stat[] = [
    { label: "Years active", value: calculateYears(yearEstablished) },
    { label: "Residences delivered", value: residencesDelivered },
    { label: "Average build, weeks", value: "24" },
    { label: "Residences publishing", value: String(projectCount) },
  ];

  return (
    <section
      aria-label="Studio numbers"
      className="border-y hairline py-8 md:py-12 bg-canvas"
    >
      <div className="container-page">
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-y-8">
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
                {s.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function calculateYears(established: string): string {
  const start = parseInt(established, 10);
  if (Number.isNaN(start)) return "7";
  const now = new Date().getUTCFullYear();
  const computed = Math.max(1, now - start);
  return String(computed);
}
