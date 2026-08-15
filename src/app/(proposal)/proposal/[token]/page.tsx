import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ensureMigrated, pgOne, withPgTx } from "@/lib/pg";
import { fetchProposalVisuals } from "@/lib/portal";
import { getStudioBrand } from "@/lib/studio-brand";
import { resolveThemeFull, themeVarsStyle } from "@/lib/theme";
import { boqCategoryLabel } from "@/lib/boq";
import {
  formatRupees,
  parseContentJson,
  proposalDto,
  shortDate,
  type ProposalPublicDto,
} from "@/lib/proposals";
import ProposalAccept from "@/components/proposal/ProposalAccept";
import ProposalStatusBadge from "@/components/proposal/ProposalStatusBadge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: Promise<{ token: string }> };

async function fetchProposal(
  token: string,
  track = false
): Promise<{
  publicDto: ProposalPublicDto;
  createdAt: string | null;
} | null> {
  await ensureMigrated();
  const row = await pgOne<Record<string, unknown>>(
    `SELECT * FROM proposals WHERE token = $1 LIMIT 1`,
    [token]
  );
  if (!row) return null;

  if (track) {
    // View tracking happens on the render itself: increment the count,
    // stamp the first view, advance sent -> viewed, and RETURN the
    // fresh row so the page reflects the updated state. generateMetadata
    // reads with track=false so a single page load counts exactly once.
    const tracked = await withPgTx(async (client) => {
      const res = await client.query(
        `UPDATE proposals
         SET viewed_count = viewed_count + 1,
             viewed_at = CASE WHEN viewed_at IS NULL THEN CURRENT_TIMESTAMP ELSE viewed_at END,
             status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
         WHERE token = $1
         RETURNING *`,
        [token]
      );
      return res.rows?.[0];
    });
    if (tracked) Object.assign(row, tracked);
  }

  const [projectRow, leadRow, tenantRow] = await Promise.all([
    pgOne<Record<string, unknown>>(
      `SELECT * FROM client_projects WHERE id = $1 LIMIT 1`,
      [row.project_id]
    ),
    row.lead_id != null
      ? pgOne<Record<string, unknown>>(
          `SELECT id, name, phone, email FROM leads WHERE id = $1 LIMIT 1`,
          [Number(row.lead_id)]
        )
      : Promise.resolve(null),
    pgOne<{ slug: string | null; domain: string | null; studio_name: string }>(
      `SELECT slug, domain, studio_name FROM tenants WHERE id = $1 LIMIT 1`,
      [Number(row.tenant_id)]
    ),
  ]);

  let palette = { ink: "#122A20", paper: "#ECECE6", accent: "#C0964F", muted: "#56605A" };
  let distroName: string | null = null;
  try {
    const full = await resolveThemeFull(tenantRow?.domain ?? null, tenantRow?.slug ?? null);
    palette = full.palette as typeof palette;
    if (full.raw && typeof full.raw.brand_name === "string") {
      distroName = full.raw.brand_name;
    }
  } catch {
    // keep defaults
  }
  const fileBrand = getStudioBrand();
  const brandName = distroName || tenantRow?.studio_name || fileBrand.brand_name;

  const dto = proposalDto(row);
  const { tenantId: _omitTenant, ...proposal } = dto;
  proposal.content = parseContentJson(row.content_json);

  // Module 8: selected boards + linked BOQ version for the visuals.
  const boardIds = Array.isArray(proposal.content.boards)
    ? proposal.content.boards.map((b: unknown) => String(b)).filter(Boolean)
    : [];
  const visuals = await fetchProposalVisuals(
    String(row.project_id ?? ""),
    row.boq_version_id == null ? null : String(row.boq_version_id),
    boardIds,
    Number(row.tenant_id ?? 0)
  );

  return {
    createdAt: row.created_at == null ? null : String(row.created_at),
    publicDto: {
      proposal,
      project: projectRow
        ? {
            id: String(projectRow.id),
            name: String(projectRow.name ?? ""),
            clientName:
              projectRow.client_name == null ? null : String(projectRow.client_name),
            clientPhone:
              projectRow.client_phone == null ? null : String(projectRow.client_phone),
            clientEmail:
              projectRow.client_email == null ? null : String(projectRow.client_email),
            budget: projectRow.budget == null ? null : Number(projectRow.budget),
            areaSqft: projectRow.area_sqft == null ? null : Number(projectRow.area_sqft),
            address: projectRow.address == null ? null : String(projectRow.address),
            status: String(projectRow.status ?? "draft"),
            createdAt: projectRow.created_at == null ? null : String(projectRow.created_at),
          }
        : null,
      lead: leadRow
        ? {
            id: Number(leadRow.id),
            name: String(leadRow.name ?? ""),
            phone: leadRow.phone == null ? null : String(leadRow.phone),
            email: leadRow.email == null ? null : String(leadRow.email),
          }
        : null,
      brand: {
        name: brandName,
        address: fileBrand.studio_address,
        contactEmail: fileBrand.contact_email,
        contactPhone: fileBrand.contact_phone,
        palette,
      },
      boards: visuals.boards.map((b) => ({
        id: b.id,
        title: b.title,
        status: b.status,
        itemsCount: b.items.length,
        items: b.items.map((i) => ({
          id: i.id,
          x: i.x,
          y: i.y,
          w: i.w,
          h: i.h,
          rotation: i.rotation,
          zIndex: i.zIndex,
          note: i.note,
          material: i.material,
        })),
      })),
      boqVersion: visuals.boqVersion
        ? {
            id: visuals.boqVersion.id,
            versionNo: visuals.boqVersion.versionNo,
            title: visuals.boqVersion.title,
            status: visuals.boqVersion.status,
            total: visuals.boqVersion.total,
            items: visuals.boqVersion.items.map((i) => ({
              id: i.id,
              category: i.category,
              itemName: i.itemName,
              description: i.description,
              unit: i.unit,
              qty: i.qty,
              materialRate: i.materialRate,
              labourRate: i.labourRate,
              amount: i.amount,
              materialName: i.material?.name ?? null,
            })),
          }
        : null,
    },
  };
}

export async function generateMetadata({
  params,
}: Params): Promise<Metadata> {
  const { token } = await params;
  if (!/^[A-Za-z0-9]{8,12}$/.test(token)) return {};
  const data = await fetchProposal(token, false);
  if (!data) return {};
  const { proposal, project, brand } = data.publicDto;
  const clientName = project?.clientName || proposal.content.clientName || "you";
  const scope = proposal.content.scope ?? [];
  const description = scope.length
    ? `${project?.name ?? "Project"} - ${scope.join(", ").slice(0, 160)}`
    : `Proposal from ${brand.name}.`;
  return {
    title: `Proposal for ${clientName} - ${brand.name}`,
    description,
    openGraph: {
      title: `Proposal for ${clientName} - ${brand.name}`,
      description,
      type: "website",
    },
  };
}

export default async function ProposalPage({ params }: Params) {
  const { token } = await params;
  if (!/^[A-Za-z0-9]{8,12}$/.test(token)) notFound();
  const data = await fetchProposal(token, true);
  if (!data) notFound();

  const { proposal, project, lead, brand, boards, boqVersion } = data.publicDto;
  const scope = proposal.content.scope ?? [];
  const clientName = project?.clientName || proposal.content.clientName || lead?.name || null;
  // The hero carries the studio-authored proposal title (default
  // "Project Proposal"); the project name reads in the story below.
  const title = proposal.title || project?.name || "Project Proposal";
  const projectName = project?.name || proposal.content.projectName || null;
  const budget = proposal.budget ?? project?.budget ?? null;
  const validUntil = data.createdAt
    ? shortDate(new Date(new Date(data.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString())
    : null;
  const terms = proposal.content.terms;
  const notes = proposal.content.notes;
  const nextSteps = notes || "We will call you to confirm the next steps and kick off the work.";
  const viewed = proposal.viewedAt != null;

  return (
    <main className="min-h-dvh bg-[var(--bg)] text-[var(--ink)]">
      <style dangerouslySetInnerHTML={{ __html: themeVarsStyle({ light: varsOf(brand.palette), dark: varsOf(brand.palette) }) }} />

      {/* Top bar: studio mark + name. */}
      <header className="border-b hairline">
        <div className="container-page h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="w-6 h-6 rounded-[3px]"
              style={{
                background:
                  "linear-gradient(135deg, #d8dad4 0%, #6a6f68 50%, #2a2e2a 100%)",
              }}
            />
            <span className="text-sm md:text-base font-medium tracking-[-0.01em]">
              {brand.name}
            </span>
          </div>
          <ProposalStatusBadge initial={proposal.status} />
        </div>
      </header>

      {/* Hero. */}
      <section className="container-page pt-16 md:pt-24 pb-10">
        <p className="chrome-pill mb-6 inline-flex">Proposal</p>
        <h1 className="font-display text-[clamp(2.6rem,6vw,3.5rem)] leading-[1.02] tracking-[-0.02em] max-w-3xl">
          {title}
        </h1>
        {clientName && (
          <p className="font-display text-xl text-[var(--ink-mute)] mt-4">
            Prepared for {clientName}
          </p>
        )}
      </section>

      <div className="container-page grid grid-cols-1 lg:grid-cols-12 gap-10 pb-20">
        {/* Left: the story. */}
        <div className="lg:col-span-7 space-y-12">
          {projectName && (
            <p className="font-display text-2xl text-[var(--ink)] tracking-[-0.01em]">
              {projectName}
            </p>
          )}
          <section className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a]">
              Scope
            </p>
            {scope.length ? (
              <ul className="space-y-2">
                {scope.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden />
                    <span className="text-[15px] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[15px] text-[var(--ink-mute)]">
                Design, specification and on-site direction for your home.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a]">
              Timeline
            </p>
            <p className="text-[15px] leading-relaxed">
              {proposal.timelineText || "24 weeks from kick-off"}
            </p>
          </section>

          <section className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a]">
              Investment
            </p>
            <div className="surface-tile rounded-lg p-5">
              <dl className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-[var(--ink-mute)]">Total investment</dt>
                <dd className="font-mono text-2xl md:text-3xl text-[#c0964f]">
                  {formatRupees(budget)}
                </dd>
              </dl>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#56605a] mt-2">
                {validUntil ? `Valid until ${validUntil}` : "Inclusive of design and execution"}
              </p>
            </div>
          </section>

          {terms && (
            <section className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a]">
                Terms
              </p>
              <p className="text-[15px] leading-relaxed whitespace-pre-line">{terms}</p>
            </section>
          )}

          <section className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a]">
              Next steps
            </p>
            <p className="text-[15px] leading-relaxed">{nextSteps}</p>
          </section>

          {boards && boards.length > 0 && (
            <section className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a]">
                Boards
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {boards.map((board) => {
                  const imgs = board.items
                    .map((i) => i.material?.imageUrl)
                    .filter((u): u is string => Boolean(u));
                  return (
                    <div
                      key={board.id}
                      className="rounded-lg border hairline bg-[rgba(214,203,179,0.35)] p-3"
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <p className="font-display text-base">{board.title}</p>
                        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#56605a]">
                          {board.itemsCount} items
                        </span>
                      </div>
                      {imgs.length > 0 ? (
                        <div className="grid grid-cols-4 gap-1">
                          {imgs.slice(0, 4).map((src, i) => (
                            <div key={i} className="relative aspect-square overflow-hidden rounded-md">
                              <Image
                                src={src}
                                alt=""
                                fill
                                sizes="120px"
                                unoptimized
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="relative h-28 w-full overflow-hidden rounded-md">
                          <Image
                            src="/demo/kitchen-1.jpg"
                            alt=""
                            fill
                            sizes="300px"
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {boqVersion && (
            <section className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a]">
                Cost estimate ({boqVersion.title})
              </p>
              <div className="rounded-lg border hairline overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b hairline text-left font-mono text-[9px] uppercase tracking-[0.16em] text-[#56605a]">
                      <th className="px-4 py-2.5 font-medium">Item</th>
                      <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boqVersion.items.map((item) => (
                      <tr key={item.id} className="border-b hairline last:border-b-0">
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#56605a] mr-2">
                            {boqCategoryLabel(item.category)}
                          </span>
                          <span className="font-display">{item.itemName}</span>
                          <span className="ml-2 font-mono text-xs text-[#56605a]">
                            {item.qty} {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {formatRupees(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-baseline justify-between gap-4 bg-[rgba(214,203,179,0.35)] px-4 py-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#56605a]">
                    Total investment
                  </span>
                  <span className="font-mono text-xl md:text-2xl text-[#c0964f]">
                    {formatRupees(boqVersion.total)}
                  </span>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right: sticky summary card. */}
        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-8 space-y-5">
            <div className="rounded-lg border hairline bg-canvas p-6 space-y-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#56605a]">
                Investment
              </p>
              <p className="font-mono text-4xl text-[#c0964f]">
                {formatRupees(budget)}
              </p>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--ink-mute)]">Timeline</dt>
                  <dd className="font-mono">{proposal.timelineText || "24 weeks"}</dd>
                </div>
                {validUntil && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--ink-mute)]">Valid until</dt>
                    <dd className="font-mono">{validUntil}</dd>
                  </div>
                )}
                {proposal.acceptedByName && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--ink-mute)]">Accepted by</dt>
                    <dd className="font-mono">{proposal.acceptedByName}</dd>
                  </div>
                )}
              </dl>
              <ProposalAccept
                token={proposal.token}
                status={proposal.status}
                brandName={brand.name}
              />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#56605a] px-1">
              {viewed ? "This proposal has been viewed" : "Unseen so far"}
            </p>
          </div>
        </aside>
      </div>

      {/* Footer. */}
      <footer className="border-t hairline">
        <div className="container-page py-8 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs text-[#56605a]">{brand.address}</p>
          <div className="flex gap-6">
            <a
              href={`mailto:${brand.contactEmail}`}
              className="font-mono text-xs uppercase tracking-[0.14em] text-[#56605a] hover:text-ink"
            >
              {brand.contactEmail}
            </a>
            <a
              href={`tel:${brand.contactPhone.replace(/\s+/g, "")}`}
              className="font-mono text-xs uppercase tracking-[0.14em] text-[#56605a] hover:text-ink"
            >
              {brand.contactPhone}
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function varsOf(palette: {
  ink: string;
  paper: string;
  accent: string;
  muted: string;
}): Record<string, string> {
  return {
    "--bg": palette.paper,
    "--ink": palette.ink,
    "--ink-mute": palette.muted,
    "--accent": palette.accent,
  };
}
