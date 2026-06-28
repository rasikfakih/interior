import { ensureMigrated, pgOne } from "@/lib/pg";
import AdminTestimonialForm from "@/components/admin/AdminTestimonialForm";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Testimonial - Edit",
  robots: { index: false },
};

export default async function AdminTestimonialEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isNew = id === "new";
  let initial: any = undefined;

  if (!isNew) {
    const numericId = Number(id);
    if (Number.isFinite(numericId)) {
      await ensureMigrated();
      const row = await pgOne(
        `SELECT id, name, role, quote, photo, is_published
         FROM testimonials WHERE id = $1 LIMIT 1`,
        [numericId]
      );
      if (!row) {
        return (
          <div className="container-page py-24 text-ink-mute">
            Testimonial not found.
          </div>
        );
      }
      initial = row;
    }
  }

  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <AdminTestimonialForm initial={initial} />
      </div>
    </section>
  );
}
