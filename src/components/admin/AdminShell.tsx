"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

type Tab =
  | "pages"
  | "media"
  | "license"
  | "projects"
  | "journal"
  | "testimonials"
  | "team"
  | "settings";

const ADMIN_NAV: { key: Tab; label: string; sub: string }[] = [
  { key: "pages", label: "Pages", sub: "Block builder, drag-reorder" },
  { key: "media", label: "Media library", sub: "DB-backed assets" },
  { key: "projects", label: "Projects", sub: "Selected work" },
  { key: "journal", label: "Journal", sub: "Field notes" },
  { key: "testimonials", label: "Testimonials", sub: "Client voices" },
  { key: "team", label: "Team", sub: "Studio members" },
  { key: "settings", label: "Settings", sub: "Site & contact" },
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
}: {
  email: string;
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
            <TabPanel tab={tab} />
          </main>
        </div>
      </div>
    </section>
  );
}

function TabPanel({ tab }: { tab: Tab }) {
  if (tab === "pages") return <PagesPanel />;
  if (tab === "media") return <Dynamic mount="/admin/media" />;
  if (tab === "license") return <Dynamic mount="/admin/license" />;
  if (tab === "projects") return <ProjectsPanel />;
  if (tab === "journal") return <CrudPanel kind="journal" />;
  if (tab === "testimonials") return <CrudPanel kind="testimonials" />;
  if (tab === "team") return <CrudPanel kind="team" />;
  if (tab === "settings") return <SettingsPanel />;
  return null;
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

function ProjectsPanel() {
  const ProjectForm = require("@/components/admin/AdminProjectForm").default;
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    fetch("/api/pages").then(async () => {
      const r = await fetch("/api/admin/projects");
      if (r.ok) setList(await r.json());
    });
  }, []);
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <h2 className="text-3xl tracking-tighter">Projects</h2>
        <button className="btn-primary" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : "New project"}
        </button>
      </div>
      {open && <ProjectForm onSaved={() => setOpen(false)} />}
      {list.length === 0 ? (
        <p className="text-ink-mute">No projects yet.</p>
      ) : (
        <div className="divide-y hairline">
          {list.map((p: any) => (
            <article key={p.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 py-4 items-center">
              <p className="md:col-span-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                /{p.slug}
              </p>
              <p className="md:col-span-6">{p.title}</p>
              <p className="md:col-span-3 text-right text-xs font-mono uppercase tracking-[0.18em] text-ink-mute">
                {p.isPublished ? "Published" : "Draft"}
              </p>
            </article>
          ))}
        </div>
      )}
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

function SettingsPanel() {
  const rows = [
    { label: "Studio note", default: "Every project supervised on-site. No remote hand-offs." },
    { label: "Studio base", default: "Kalyan, MH" },
    { label: "CALENDLY_URL", default: "https://calendly.com/etihadinteriors/intro" },
    { label: "CONTACT_PHONE", default: "+91 99999 99999" },
    { label: "CONTACT_EMAIL", default: "studio@etihadinteriors.com" },
  ];
  return (
    <div className="surface-tile p-6 rounded-[var(--radius-card)]">
      <p className="chrome-pill mb-3 inline-flex">Settings</p>
      <p className="text-ink-mute text-sm mb-4">
        Edit these in <code className="font-mono text-xs">/admin</code> via the live API,
        or use <code className="font-mono text-xs">/.env.local</code> for env-tied keys.
      </p>
      <div className="divide-y hairline">
        {rows.map((r: any) => (
          <div key={r.label} className="py-3 grid grid-cols-1 md:grid-cols-12 gap-2">
            <p className="md:col-span-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              {r.label}
            </p>
            <p className="md:col-span-9 text-sm">{r.default}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
