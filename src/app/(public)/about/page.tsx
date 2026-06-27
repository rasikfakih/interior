import type { Metadata } from "next";
import { ensureMigrated, pgMany } from "@/lib/pg";

export const metadata: Metadata = {
  title: "About the studio",
  description:
    "A studio that draws, specifies, and supervises on-site. Founded in 2017 in Kalyan, Maharashtra.",
};

async function getTeam() {
  try {
    await ensureMigrated();
    return await pgMany<{ id: number; name: string; role: string | null }>(
      `SELECT id, name, role FROM team_members
       WHERE is_published = TRUE
       ORDER BY "order" ASC, id ASC`
    );
  } catch {
    return [];
  }
}

export default async function AboutPage() {
  const team = await getTeam();

  return (
    <>
      <section className="pt-24 md:pt-28 pb-16 md:pb-24">
        <div className="container-page">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
            <div className="md:col-span-7">
              <p className="chrome-pill mb-6 inline-flex">Studio · Since 2017</p>
              <h1 className="text-[clamp(2.4rem,6vw,5rem)] tracking-[-0.025em] leading-[1]">
                A small studio, working at the scale of{" "}
                <em className="text-accent not-italic font-medium">one home at a time</em>.
              </h1>
            </div>
            <div className="md:col-span-5 md:pt-3">
              <p className="text-ink-mute text-base md:text-lg leading-relaxed">
                We started in 2017 from a one-room office above a tailor's shop.
                Eight years later we are a studio of five, four designers and a
                full-time site supervisor, drawing every project to scale and
                staying through handover.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-elev">
        <div className="container-page">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-warm">
                Method
              </p>
              <h2 className="text-3xl md:text-5xl mt-3 tracking-tighter">
                No hand-offs. One desk for drawings, materials, and supervision.
              </h2>
            </div>
            <div className="md:col-span-5 md:pt-3 space-y-4 text-ink-mute">
              <p>
                A residential interior is rarely a single practice. Architects
                pass drawings to contractors. Contractors phone in substitutions.
                Substitutions become scope creep.
              </p>
              <p>
                Our studio keeps the chain short. The same person who drew the
                elevation is on site on Wednesday. Weekly written reports. A
                single document at handover.
              </p>
            </div>
          </div>
        </div>
      </section>

      {team.length > 0 && (
        <section className="py-20 md:py-28">
          <div className="container-page">
            <h2 className="text-3xl md:text-5xl tracking-tighter mb-10">
              The team
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              {team.map((m: any) => (
                <article
                  key={m.id}
                  className="surface-tile p-6 md:p-7 flex flex-col gap-3"
                >
                  <div
                    aria-hidden
                    className="w-14 h-14 rounded-full flex items-center justify-center font-mono text-xl"
                    style={{
                      background: "var(--accent-warm-soft)",
                      color: "var(--accent-warm)",
                    }}
                  >
                    {(m.name || "·").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-lg">{m.name}</p>
                    <p className="text-xs uppercase tracking-[0.18em] font-mono text-ink-mute">
                      {m.role}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
