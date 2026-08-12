"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

type Tab =
  | "pages"
  | "media"
  | "license"
  | "projects"
  | "journal"
  | "testimonials"
  | "team"
  | "settings"
  | "site-identity"
  | "theme"
  | "menus"
  | "forms"
  | "redirects"
  | "users"
  | "export-import"
  | "newsletter"
  | "install";

const ADMIN_NAV: { key: Tab; label: string; sub: string }[] = [
  { key: "pages", label: "Pages", sub: "Block builder, drag-reorder" },
  { key: "media", label: "Media library", sub: "DB-backed assets" },
  { key: "projects", label: "Projects", sub: "Selected work" },
  { key: "journal", label: "Journal", sub: "Field notes" },
  { key: "testimonials", label: "Testimonials", sub: "Client voices" },
  { key: "team", label: "Team", sub: "Studio members" },
  { key: "theme", label: "Theme", sub: "Palette, type, motion" },
  { key: "menus", label: "Menus", sub: "Primary navigation" },
  { key: "forms", label: "Forms", sub: "Builder + submissions" },
  { key: "redirects", label: "Redirects", sub: "301/302 rules" },
  { key: "users", label: "Users", sub: "Team & roles" },
  { key: "export-import", label: "Export / Import", sub: "JSON backup & restore" },
  { key: "settings", label: "Settings", sub: "Site & contact" },
  { key: "site-identity", label: "Site identity", sub: "Brand & accent" },
  { key: "newsletter", label: "Newsletter", sub: "Subscriber viewer" },
  { key: "install", label: "Install", sub: "Stamp & HMAC" },
  { key: "license", label: "License", sub: "Envato key" },
];

function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2400);
    return () => clearTimeout(t);
  }, [msg]);
  return { msg, setMsg };
}

export default function AdminShell({
  email,
  role,
}: {
  email: string;
  role: string;
}) {
  const [tab, setTab] = useState<Tab>("pages");
  const { msg } = useToast();
  return (
    <section className="pt-24 md:pt-28 pb-24">
      <div className="container-page">
        <header className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-end mb-12">
          <div className="md:col-span-8">
            <p className="chrome-pill mb-6 inline-flex">Dashboard</p>
            <h1 className="text-4xl md:text-6xl tracking-tighter">
              <em className="text-accent not-italic font-medium">
                {email.split("@")[0]}
              </em>
              , good morning.
            </h1>
          </div>
          <div className="md:col-span-4 flex md:justify-end gap-3">
            <a href="/" className="btn-ghost">
              View site
            </a>
            <button onClick={() => signOut()} className="btn-primary">
              Sign out
            </button>
          </div>
        </header>

        {msg && (
          <div
            role="status"
            className="surface-elevated px-4 py-3 mb-6 text-sm text-accent rounded-[var(--radius-card)]"
          >
            {msg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10">
          <aside className="md:col-span-3">
            <div className="flex md:flex-col gap-2 md:gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {ADMIN_NAV.map((item) => {
                const active = tab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setTab(item.key)}
                    className={`text-left px-4 py-3 md:p-3 rounded-[var(--radius-control)] transition-colors ${
                      active
                        ? "bg-canvas border hairline-strong"
                        : "border border-transparent hover:bg-[var(--surface)]"
                    }`}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                      {item.sub}
                    </p>
                    <p className="text-base mt-1">{item.label}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="md:col-span-9">
            <TabPanel tab={tab} role={role} />
          </main>
        </div>
      </div>
    </section>
  );
}

function TabPanel({ tab, role }: { tab: Tab; role: string }) {
  if (tab === "pages") return <PagesPanel />;
  if (tab === "media") return <Dynamic mount="/admin/media" />;
  if (tab === "license") return <Dynamic mount="/admin/license" />;
  if (tab === "projects") return <ProjectsRoutePanel />;
  if (tab === "journal") return <JournalRoutePanel />;
  if (tab === "testimonials") return <TestimonialsRoutePanel />;
  if (tab === "team") return <TeamRoutePanel />;
  if (tab === "theme") return <ThemeRoutePanel />;
  if (tab === "menus") return <MenusRoutePanel />;
  if (tab === "forms") return <FormsRoutePanel role={role} />;
  if (tab === "redirects") return <RedirectsRoutePanel role={role} />;
  if (tab === "users") return <UsersRoutePanel role={role} />;
  if (tab === "export-import") return <ExportImportRoutePanel role={role} />;
  if (tab === "settings") return <SettingsRoutePanel />;
  if (tab === "site-identity") return <SiteIdentityRoutePanel />;
  if (tab === "newsletter") return <NewsletterRoutePanel />;
  if (tab === "install") return <InstallRoutePanel />;
  return null;
}

// SiteIdentityRoutePanel: probe /api/site-identity; on 200 push
// to /admin/site-identity which mounts AdminSiteIdentity.
function SiteIdentityRoutePanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    let alive = true;
    async function probe() {
      try {
        const r = await fetch("/api/site-identity", {
          credentials: "include",
        });
        if (!alive) return;
        if (r.ok) {
          router.push("/admin/site-identity");
          return;
        }
      } catch {}
      if (alive) {
        setErrored(true);
        setBusy(false);
      }
    }
    probe();
    return () => {
      alive = false;
    };
  }, [router]);
  return (
    <div className="surface-tile p-6 rounded-[var(--radius-card)] min-h-[200px]">
      <p className="chrome-pill mb-3 inline-flex">Site identity</p>
      <p className="text-sm text-ink-mute">
        {busy ? "Opening editor…" : errored ? "Could not reach /api/site-identity." : ""}
      </p>
      {errored && (
        <button
          type="button"
          onClick={() => router.push("/admin/site-identity")}
          className="btn-ghost text-xs h-9 px-3 mt-3"
        >
          Open editor
        </button>
      )}
    </div>
  );
}

// NewsletterRoutePanel: probe /api/newsletter-subscribers; on
// 200 push to /admin/newsletter which mounts AdminNewsletterList.
function NewsletterRoutePanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    let alive = true;
    async function probe() {
      try {
        const r = await fetch("/api/newsletter-subscribers", {
          credentials: "include",
        });
        if (!alive) return;
        if (r.ok) {
          router.push("/admin/newsletter");
          return;
        }
      } catch {}
      if (alive) {
        setErrored(true);
        setBusy(false);
      }
    }
    probe();
    return () => {
      alive = false;
    };
  }, [router]);
  return (
    <div className="surface-tile p-6 rounded-[var(--radius-card)] min-h-[200px]">
      <p className="chrome-pill mb-3 inline-flex">Newsletter</p>
      <p className="text-sm text-ink-mute">
        {busy ? "Opening editor…" : errored ? "Could not reach /api/newsletter-subscribers." : ""}
      </p>
      {errored && (
        <button
          type="button"
          onClick={() => router.push("/admin/newsletter")}
          className="btn-ghost text-xs h-9 px-3 mt-3"
        >
          Open editor
        </button>
      )}
    </div>
  );
}

// InstallRoutePanel: probe /api/install/stamp; on 200 push to
// /admin/install which mounts AdminInstallView.
function InstallRoutePanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    let alive = true;
    async function probe() {
      try {
        const r = await fetch("/api/install/stamp", {
          credentials: "include",
        });
        if (!alive) return;
        if (r.ok) {
          router.push("/admin/install");
          return;
        }
      } catch {}
      if (alive) {
        setErrored(true);
        setBusy(false);
      }
    }
    probe();
    return () => {
      alive = false;
    };
  }, [router]);
  return (
    <div className="surface-tile p-6 rounded-[var(--radius-card)] min-h-[200px]">
      <p className="chrome-pill mb-3 inline-flex">Install</p>
      <p className="text-sm text-ink-mute">
        {busy ? "Opening editor…" : errored ? "Could not reach /api/install/stamp." : ""}
      </p>
      {errored && (
        <button
          type="button"
          onClick={() => router.push("/admin/install")}
          className="btn-ghost text-xs h-9 px-3 mt-3"
        >
          Open editor
        </button>
      )}
    </div>
  );
}

// ThemeRoutePanel mirrors the probe-then-push pattern. The customizer
// lives at /admin/theme, a server page mounting AdminTheme.
function ThemeRoutePanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    let alive = true;
    async function probe() {
      try {
        const r = await fetch("/api/theme", { credentials: "include" });
        if (!alive) return;
        if (r.ok) {
          router.push("/admin/theme");
          return;
        }
      } catch {}
      if (alive) {
        setErrored(true);
        setBusy(false);
      }
    }
    probe();
    return () => {
      alive = false;
    };
  }, [router]);
  return (
    <div className="surface-tile p-6 rounded-[var(--radius-card)] min-h-[200px]">
      <p className="chrome-pill mb-3 inline-flex">Theme</p>
      <p className="text-sm text-ink-mute">
        {busy ? "Opening editor…" : errored ? "Could not reach /api/theme." : ""}
      </p>
      {errored && (
        <button
          type="button"
          onClick={() => router.push("/admin/theme")}
          className="btn-ghost text-xs h-9 px-3 mt-3"
        >
          Open editor
        </button>
      )}
    </div>
  );
}

// MenusRoutePanel mirrors the probe-then-push pattern. The nav editor
// lives at /admin/menus, a server page mounting AdminMenus.
function MenusRoutePanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    let alive = true;
    async function probe() {
      try {
        const r = await fetch("/api/menus", { credentials: "include" });
        if (!alive) return;
        if (r.ok) {
          router.push("/admin/menus");
          return;
        }
      } catch {}
      if (alive) {
        setErrored(true);
        setBusy(false);
      }
    }
    probe();
    return () => {
      alive = false;
    };
  }, [router]);
  return (
    <div className="surface-tile p-6 rounded-[var(--radius-card)] min-h-[200px]">
      <p className="chrome-pill mb-3 inline-flex">Menus</p>
      <p className="text-sm text-ink-mute">
        {busy ? "Opening editor…" : errored ? "Could not reach /api/menus." : ""}
      </p>
      {errored && (
        <button
          type="button"
          onClick={() => router.push("/admin/menus")}
          className="btn-ghost text-xs h-9 px-3 mt-3"
        >
          Open editor
        </button>
      )}
    </div>
  );
}

// FormsRoutePanel mirrors the probe-then-push pattern. The forms
// manager lives at /admin/forms, a server page mounting AdminForms.
function FormsRoutePanel({ role }: { role: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    let alive = true;
    async function probe() {
      try {
        const r = await fetch("/api/forms", { credentials: "include" });
        if (!alive) return;
        if (r.ok) {
          router.push("/admin/forms");
          return;
        }
      } catch {}
      if (alive) {
        setErrored(true);
        setBusy(false);
      }
    }
    probe();
    return () => {
      alive = false;
    };
  }, [router]);
  return (
    <div className="surface-tile p-6 rounded-[var(--radius-card)] min-h-[200px]">
      <p className="chrome-pill mb-3 inline-flex">Forms</p>
      <p className="text-sm text-ink-mute">
        {busy ? "Opening editor…" : errored ? "Could not reach /api/forms." : ""}
      </p>
      {errored && (
        <button
          type="button"
          onClick={() => router.push("/admin/forms")}
          className="btn-ghost text-xs h-9 px-3 mt-3"
        >
          Open editor
        </button>
      )}
      <p className="text-xs text-ink-mute mt-4">
        Your role: <span className="font-mono text-xs">{role}</span>.
      </p>
    </div>
  );
}

// ExportImportRoutePanel probes the export route (admin-gated; editors
// get 403) then pushes to the full page at /admin/export-import.
function ExportImportRoutePanel({ role }: { role: string }) {
  const router = useRouter();
  const isEditor = role === "editor";
  // Editors never probe (the route 403s them); admins start "busy"
  // until the probe answers. Avoids a sync setState in the effect.
  const [state, setState] = useState<
    { phase: "busy" } | { phase: "errored" } | { phase: "done" }
  >(isEditor ? { phase: "done" } : { phase: "busy" });
  useEffect(() => {
    if (isEditor) return;
    let alive = true;
    async function probe() {
      try {
        const r = await fetch("/api/export", { credentials: "include" });
        if (!alive) return;
        if (r.ok) {
          router.push("/admin/export-import");
          return;
        }
      } catch {}
      if (alive) setState({ phase: "errored" });
    }
    probe();
    return () => {
      alive = false;
    };
  }, [router, isEditor]);
  return (
    <div className="surface-tile p-6 rounded-[var(--radius-card)] min-h-[200px]">
      <p className="chrome-pill mb-3 inline-flex">Export / Import</p>
      <p className="text-sm text-ink-mute">
        {isEditor
          ? "Editors cannot export or import content — ask an admin."
          : state.phase === "busy"
            ? "Opening exporter…"
            : state.phase === "errored"
              ? "Could not reach /api/export."
              : ""}
      </p>
      {state.phase === "errored" && !isEditor && (
        <button
          type="button"
          onClick={() => router.push("/admin/export-import")}
          className="btn-ghost text-xs h-9 px-3 mt-3"
        >
          Open exporter
        </button>
      )}
    </div>
  );
}

// RedirectsRoutePanel mirrors the probe-then-push pattern. The
// redirect manager lives at /admin/redirects.
function RedirectsRoutePanel({ role }: { role: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    let alive = true;
    async function probe() {
      try {
        const r = await fetch("/api/redirects", { credentials: "include" });
        if (!alive) return;
        if (r.ok) {
          router.push("/admin/redirects");
          return;
        }
      } catch {}
      if (alive) {
        setErrored(true);
        setBusy(false);
      }
    }
    probe();
    return () => {
      alive = false;
    };
  }, [router]);
  return (
    <div className="surface-tile p-6 rounded-[var(--radius-card)] min-h-[200px]">
      <p className="chrome-pill mb-3 inline-flex">Redirects</p>
      <p className="text-sm text-ink-mute">
        {busy ? "Opening editor…" : errored ? "Could not reach /api/redirects." : ""}
      </p>
      {errored && (
        <button
          type="button"
          onClick={() => router.push("/admin/redirects")}
          className="btn-ghost text-xs h-9 px-3 mt-3"
        >
          Open editor
        </button>
      )}
      <p className="text-xs text-ink-mute mt-4">
        Your role: <span className="font-mono text-xs">{role}</span>.
      </p>
    </div>
  );
}

// UsersRoutePanel mirrors the probe-then-push pattern. The team &
// roles manager lives at /admin/users.
function UsersRoutePanel({ role }: { role: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    let alive = true;
    async function probe() {
      try {
        const r = await fetch("/api/users", { credentials: "include" });
        if (!alive) return;
        if (r.ok) {
          router.push("/admin/users");
          return;
        }
      } catch {}
      if (alive) {
        setErrored(true);
        setBusy(false);
      }
    }
    probe();
    return () => {
      alive = false;
    };
  }, [router]);
  return (
    <div className="surface-tile p-6 rounded-[var(--radius-card)] min-h-[200px]">
      <p className="chrome-pill mb-3 inline-flex">Users</p>
      <p className="text-sm text-ink-mute">
        {busy ? "Opening editor…" : errored ? "Could not reach /api/users." : ""}
      </p>
      {errored && (
        <button
          type="button"
          onClick={() => router.push("/admin/users")}
          className="btn-ghost text-xs h-9 px-3 mt-3"
        >
          Open editor
        </button>
      )}
      <p className="text-xs text-ink-mute mt-4">
        Your role: <span className="font-mono text-xs">{role}</span>.
      </p>
    </div>
  );
}

// SettingsRoutePanel mirrors the projects/journal/testimonials/team
// probe-then-push pattern. The Editor lives at /admin/settings, which
// is a server-prerendered passthrough mounting AdminSettings.
function SettingsRoutePanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    let alive = true;
    async function probe() {
      try {
        const r = await fetch("/api/settings", { credentials: "include" });
        if (!alive) return;
        if (r.ok) {
          router.push("/admin/settings");
          return;
        }
      } catch {}
      if (alive) {
        setErrored(true);
        setBusy(false);
      }
    }
    probe();
    return () => {
      alive = false;
    };
  }, [router]);
  return (
    <div className="surface-tile p-6 rounded-[var(--radius-card)] min-h-[200px]">
      <p className="chrome-pill mb-3 inline-flex">Settings</p>
      <p className="text-sm text-ink-mute">
        {busy ? "Opening editor…" : errored ? "Could not reach /api/settings." : ""}
      </p>
      {errored && (
        <button
          type="button"
          onClick={() => router.push("/admin/settings")}
          className="btn-ghost text-xs h-9 px-3 mt-3"
        >
          Open editor
        </button>
      )}
    </div>
  );
}

// TestimonialsRoutePanel mirrors the projects/journal probe-then-push
// pattern. Live pulls /api/testimonials; on 200 it pushes the operator
// into /admin/testimonials where the dedicated editor owns the surface.
function TestimonialsRoutePanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    let alive = true;
    async function probe() {
      try {
        const r = await fetch("/api/testimonials", { credentials: "include" });
        if (!alive) return;
        if (r.ok) {
          router.push("/admin/testimonials");
          return;
        }
      } catch {}
      if (alive) {
        setErrored(true);
        setBusy(false);
      }
    }
    probe();
    return () => {
      alive = false;
    };
  }, [router]);
  return (
    <div className="surface-tile p-6 rounded-[var(--radius-card)] min-h-[200px]">
      <p className="chrome-pill mb-3 inline-flex">Testimonials</p>
      <p className="text-sm text-ink-mute">
        {busy ? "Opening editor…" : errored ? "Could not reach /api/testimonials." : ""}
      </p>
      {errored && (
        <button
          type="button"
          onClick={() => router.push("/admin/testimonials")}
          className="btn-ghost text-xs h-9 px-3 mt-3"
        >
          Open editor
        </button>
      )}
    </div>
  );
}

function TeamRoutePanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    let alive = true;
    async function probe() {
      try {
        const r = await fetch("/api/team", { credentials: "include" });
        if (!alive) return;
        if (r.ok) {
          router.push("/admin/team");
          return;
        }
      } catch {}
      if (alive) {
        setErrored(true);
        setBusy(false);
      }
    }
    probe();
    return () => {
      alive = false;
    };
  }, [router]);
  return (
    <div className="surface-tile p-6 rounded-[var(--radius-card)] min-h-[200px]">
      <p className="chrome-pill mb-3 inline-flex">Team</p>
      <p className="text-sm text-ink-mute">
        {busy ? "Opening editor…" : errored ? "Could not reach /api/team." : ""}
      </p>
      {errored && (
        <button
          type="button"
          onClick={() => router.push("/admin/team")}
          className="btn-ghost text-xs h-9 px-3 mt-3"
        >
          Open editor
        </button>
      )}
    </div>
  );
}

// JournalRoutePanel mirrors ProjectsRoutePanel: probe the API then push
// the tab to the dedicated editor route.
function JournalRoutePanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    let alive = true;
    async function probe() {
      try {
        const r = await fetch("/api/journal", { credentials: "include" });
        if (!alive) return;
        if (r.ok) {
          router.push("/admin/journal");
          return;
        }
      } catch {}
      if (alive) {
        setErrored(true);
        setBusy(false);
      }
    }
    probe();
    return () => {
      alive = false;
    };
  }, [router]);
  return (
    <div className="surface-tile p-6 rounded-[var(--radius-card)] min-h-[200px]">
      <p className="chrome-pill mb-3 inline-flex">Journal</p>
      <p className="text-sm text-ink-mute">
        {busy ? "Opening editor…" : errored ? "Could not reach /api/journal." : ""}
      </p>
      {errored && (
        <button
          type="button"
          onClick={() => router.push("/admin/journal")}
          className="btn-ghost text-xs h-9 px-3 mt-3"
        >
          Open editor
        </button>
      )}
    </div>
  );
}

// ProjectsRoutePanel is a thin client-side router into the dedicated
// /admin/projects index (which itself links to /admin/projects/[id]).
function ProjectsRoutePanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    async function probe() {
      try {
        const r = await fetch("/api/projects", { credentials: "include" });
        if (r.ok) {
          router.push("/admin/projects");
        } else {
          setBusy(false);
        }
      } catch {
        setBusy(false);
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBusy(true);
    probe();
  }, [router]);
  return (
    <div className="surface-tile p-6 rounded-[var(--radius-card)] min-h-[200px]">
      <p className="chrome-pill mb-3 inline-flex">Projects</p>
      <p className="text-sm text-ink-mute">
        {busy ? "Opening editor…" : "Could not reach /api/projects."}
      </p>
      {!busy && (
        <button
          type="button"
          onClick={() => router.push("/admin/projects")}
          className="btn-ghost text-xs h-9 px-3 mt-3"
        >
          Open editor
        </button>
      )}
    </div>
  );
}

// PagesPanel holds the page list routed via /admin/pages/[id] via Next.js routes.
function PagesPanel() {
  const Pages = require("@/components/admin/PagesAdmin").default;
  return <Pages />;
}

// Each CRUD tab goes to /admin/[k] which is a server-statically-included page.
function Dynamic({ mount }: { mount: string }) {
  const [Content, setContent] = useState<any>(null);
  useEffect(() => {
    fetch(mount, { headers: { Accept: "text/html" } })
      .then((r) => r.text())
      .then((html) => {
        const wrap = document.createElement("div");
        wrap.innerHTML = html;
        const next = wrap.querySelector("main") || wrap;
        setContent(<div dangerouslySetInnerHTML={{ __html: next.outerHTML }} />);
      })
      .catch(() => setContent(<p className="text-ink-mute">Loading…</p>));
  }, [mount]);
  return (
    <div className="surface-tile p-6 rounded-[var(--radius-card)] min-h-[200px]">
      {Content ?? <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">Loading…</p>}
    </div>
  );
}

function CrudPanel({ kind }: { kind: string }) {
  return (
    <div className="surface-tile p-6 rounded-[var(--radius-card)]">
      <p className="chrome-pill mb-3 inline-flex">{kind}</p>
      <p className="text-ink-mute text-sm">
        Use the existing endpoint under /api/{kind} for full CRUD. The
        editor under /admin still routes to the original component on this
        page; this panel acts as a quick reader.
      </p>
    </div>
  );
}

// SettingsPanel was the original static diagnostic surface listing a
// hard-coded contact block; superseded by SettingsRoutePanel which
// pushes the operator into /admin/settings -> AdminSettings editor.
// Removed in TS-006-A.

