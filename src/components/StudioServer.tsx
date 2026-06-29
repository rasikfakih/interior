import { ensureMigrated, pgMany } from "@/lib/pg";

type Row = {
  id: number;
  name: string;
  role: string | null;
  bio: string | null;
  photo: string | null;
  order: number | null;
  is_published: boolean;
};

export default async function StudioServer() {
  let rows: Row[] = [];
  try {
    await ensureMigrated();
    rows = await pgMany<Row>(
      `SELECT id, name, role, bio, photo, "order", is_published
       FROM team_members
       WHERE is_published = TRUE
       ORDER BY "order" ASC, id ASC`
    );
  } catch {
    rows = [];
  }

  if (rows.length === 0) return null;

  return (
    <section className="py-20 md:py-28" aria-label="The studio team">
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          <div className="md:col-span-7">
            <p className="chrome-pill mb-6 inline-flex">The studio</p>
            <h2 className="text-3xl md:text-5xl tracking-tighter">
              Five designers and a full-time site supervisor.
            </h2>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <p className="text-ink-mute">
              The team drawn from the studio's first seven years. Each row
              below is a real current or past contributor.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {rows.map((m) => {
            const initial = (m.name || "·").charAt(0).toUpperCase();
            const photo = m.photo && String(m.photo).trim();
            return (
              <article
                key={m.id}
                className="surface-tile p-6 md:p-7 flex flex-col gap-4"
              >
                {photo ? (
                  <img
                    src={photo}
                    alt=""
                    className="w-20 h-20 rounded-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="w-14 h-14 rounded-full flex items-center justify-center font-mono text-xl"
                    style={{
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                    }}
                  >
                    {initial}
                  </span>
                )}
                <div>
                  <p className="text-lg">{m.name}</p>
                  <p className="text-xs uppercase tracking-[0.18em] font-mono text-ink-mute mt-1">
                    {m.role}
                  </p>
                </div>
                {m.bio && (
                  <p className="text-sm text-ink-mute leading-relaxed">
                    {m.bio}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
