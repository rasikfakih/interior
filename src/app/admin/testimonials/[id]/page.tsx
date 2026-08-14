import { ensureMigrated, pgOne } from "@/lib/pg";
import AdminTestimonialForm, {
  type TestimonialFormInitial,
} from "@/components/admin/AdminTestimonialForm";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { getAdminIdentity } from "../../identity";

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
  const { email, role } = await getAdminIdentity();
  let initial: TestimonialFormInitial | undefined = undefined;

  if (!isNew) {
    const numericId = Number(id);
    if (Number.isFinite(numericId)) {
      await ensureMigrated();
      const row = await pgOne<TestimonialFormInitial>(
        `SELECT id, name, role, quote, photo, is_published
         FROM testimonials WHERE id = $1 LIMIT 1`,
        [numericId]
      );
      if (!row) {
        return (
          <AdminPageShell email={email} role={role}>
            <p className="text-ink-mute">Testimonial not found.</p>
          </AdminPageShell>
        );
      }
      initial = row;
    }
  }

  return (
    <AdminPageShell email={email} role={role}>
      <AdminTestimonialForm initial={initial} />
    </AdminPageShell>
  );
}
