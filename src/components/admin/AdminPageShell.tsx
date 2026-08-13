"use client";

import { AdminTopbar } from "./AdminTopbar";

/** Console frame for standalone /admin/* editor pages: same topbar as
 *  the /admin shell, then the editor content in the page container.
 *  The <main> element is required: the shell's Dynamic tab fetches
 *  these pages and injects their <main> inline. */
export function AdminPageShell({
  email,
  role,
  children,
}: {
  email: string;
  role: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-dvh bg-canvas">
      <AdminTopbar email={email} role={role} />
      <div className="container-page py-8 md:py-10">
        <main>{children}</main>
      </div>
    </section>
  );
}
