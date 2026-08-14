"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { IconNav, type NavIconName } from "@/components/icons";
import { AdminTopbar } from "./AdminTopbar";
import PagesAdmin from "./PagesAdmin";

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

type NavItem = { key: Tab; label: string; icon: NavIconName };

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "Content",
    items: [
      { key: "pages", label: "Pages", icon: "pages" },
      { key: "media", label: "Media", icon: "media" },
      { key: "projects", label: "Projects", icon: "projects" },
      { key: "journal", label: "Journal", icon: "journal" },
      { key: "testimonials", label: "Testimonials", icon: "testimonials" },
      { key: "team", label: "Team", icon: "team" },
      { key: "menus", label: "Menus", icon: "menus" },
      { key: "forms", label: "Forms", icon: "forms" },
      { key: "newsletter", label: "Newsletter", icon: "newsletter" },
      { key: "redirects", label: "Redirects", icon: "redirects" },
    ],
  },
  {
    group: "Appearance",
    items: [
      { key: "theme", label: "Theme", icon: "theme" },
      { key: "site-identity", label: "Site identity", icon: "identity" },
    ],
  },
  {
    group: "System",
    items: [
      { key: "users", label: "Users", icon: "users" },
      { key: "export-import", label: "Export / Import", icon: "export" },
      { key: "settings", label: "Settings", icon: "settings" },
      { key: "install", label: "Install", icon: "install" },
      { key: "license", label: "License", icon: "license" },
    ],
  },
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
    <section className="min-h-dvh bg-canvas">
      <AdminTopbar email={email} role={role} />

      <div className="container-page grid grid-cols-1 gap-8 py-6 md:grid-cols-[232px_1fr] md:py-10">
        {/* Mobile: a horizontal chip row keeps all sections one tap
            away without stacking the full sidebar above the editor. */}
        <nav
          className="md:hidden"
          aria-label="Admin sections"
        >
          <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1">
            {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--accent-deep)] border hairline-strong"
                      : "text-ink-mute border hairline"
                  }`}
                >
                  <IconNav name={item.icon} size={13} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        <aside className="hidden md:block">
          <nav aria-label="Admin sections">
            {NAV_GROUPS.map((g) => (
              <div key={g.group}>
                <p className="admin-nav-group">{g.group}</p>
                <div className="flex flex-col gap-0.5">
                  {g.items.map((item) => {
                    const active = tab === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setTab(item.key)}
                        className={`admin-nav-item ${
                          active ? "admin-nav-item--active" : ""
                        }`}
                        aria-current={active ? "page" : undefined}
                      >
                        <IconNav
                          name={item.icon}
                          size={16}
                          className={active ? "text-accent-deep" : "text-ink-soft"}
                        />
                        <span className="truncate">{item.label}</span>
                        {active ? (
                          <span
                            className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main>
          {msg && (
            <div
              role="status"
              className="surface-elevated mb-6 rounded-[var(--radius-card)] px-4 py-3 text-sm text-accent-deep"
            >
              {msg}
            </div>
          )}
          <TabPanel tab={tab} role={role} />
        </main>
      </div>
    </section>
  );
}

function TabPanel({ tab, role }: { tab: Tab; role: string }) {
  if (tab === "pages") return <PagesPanel />;
  if (tab === "media") return <Dynamic mount="/admin/media" />;
  if (tab === "license") return <Dynamic mount="/admin/license" />;
  if (tab === "projects") return <RoutePanel title="Projects" probe="/api/projects" push="/admin/projects" />;
  if (tab === "journal") return <RoutePanel title="Journal" probe="/api/journal" push="/admin/journal" />;
  if (tab === "testimonials") return <RoutePanel title="Testimonials" probe="/api/testimonials" push="/admin/testimonials" />;
  if (tab === "team") return <RoutePanel title="Team" probe="/api/team" push="/admin/team" />;
  if (tab === "theme") return <RoutePanel title="Theme" probe="/api/theme" push="/admin/theme" />;
  if (tab === "menus") return <RoutePanel title="Menus" probe="/api/menus" push="/admin/menus" />;
  if (tab === "forms")
    return <RoutePanel title="Forms" probe="/api/forms" push="/admin/forms" note={`Your role: ${role}.`} />;
  if (tab === "redirects")
    return <RoutePanel title="Redirects" probe="/api/redirects" push="/admin/redirects" note={`Your role: ${role}.`} />;
  if (tab === "users")
    return <RoutePanel title="Users" probe="/api/users" push="/admin/users" note={`Your role: ${role}.`} />;
  if (tab === "export-import")
    return (
      <RoutePanel
        title="Export / Import"
        probe="/api/export"
        push="/admin/export-import"
        blocked={role === "editor"}
        blockedMsg="Editors cannot export or import content - ask an admin."
      />
    );
  if (tab === "settings") return <RoutePanel title="Settings" probe="/api/settings" push="/admin/settings" />;
  if (tab === "site-identity") return <RoutePanel title="Site identity" probe="/api/site-identity" push="/admin/site-identity" />;
  if (tab === "newsletter") return <RoutePanel title="Newsletter" probe="/api/newsletter-subscribers" push="/admin/newsletter" />;
  if (tab === "install") return <RoutePanel title="Install" probe="/api/install/stamp" push="/admin/install" />;
  return null;
}

/**
 * RoutePanel probes the tab's admin-gated API; on 200 it pushes the
 * operator into the dedicated editor route that owns the surface. One
 * shared component replaces the twelve near-identical per-tab probe
 * panels: same behavior, one loading/error surface.
 */
function RoutePanel({
  title,
  probe,
  push,
  blocked = false,
  blockedMsg = "This surface is not available to your role.",
  note,
}: {
  title: string;
  probe: string;
  push: string;
  blocked?: boolean;
  blockedMsg?: string;
  note?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"busy" | "errored" | "done">(
    blocked ? "done" : "busy",
  );
  useEffect(() => {
    if (blocked) return;
    let alive = true;
    async function probeIt() {
      try {
        const r = await fetch(probe, { credentials: "include" });
        if (!alive) return;
        if (r.ok) {
          router.push(push);
          return;
        }
      } catch {}
      if (alive) setPhase("errored");
    }
    probeIt();
    return () => {
      alive = false;
    };
  }, [router, probe, push, blocked]);

  return (
    <div className="surface-tile flex min-h-[220px] flex-col justify-center rounded-[var(--radius-card)] p-8">
      <p className="chrome-pill mb-3 inline-flex">{title}</p>
      <p className="text-sm text-ink-mute">
        {blocked
          ? blockedMsg
          : phase === "busy"
            ? "Opening editor…"
            : `Could not reach ${probe}.`}
      </p>
      {phase === "errored" && !blocked && (
        <button
          type="button"
          onClick={() => router.push(push)}
          className="btn-ghost mt-4 h-9 self-start px-4 text-[10px]"
        >
          Open editor
        </button>
      )}
      {note ? (
        <p className="mt-4 text-xs text-ink-mute">{note}</p>
      ) : null}
    </div>
  );
}

// PagesPanel holds the page list routed via /admin/pages/[id] via Next.js routes.
function PagesPanel() {
  return <PagesAdmin />;
}

// Each CRUD tab goes to /admin/[k] which is a server-statically-included page.
function Dynamic({ mount }: { mount: string }) {
  const [Content, setContent] = useState<ReactNode | null>(null);
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
    <div className="surface-tile min-h-[220px] rounded-[var(--radius-card)] p-8">
      {Content ?? (
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          Loading…
        </p>
      )}
    </div>
  );
}
