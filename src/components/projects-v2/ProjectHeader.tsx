import Link from "next/link";
import RichTextRenderer from "@/components/RichTextRenderer";

type Props = {
  slug: string;
  title: string;
  year: string | null;
  location: string | null;
  category: string | null;
  scope: string | null;
  description: string | null;
  description_json: unknown | null;
};

/**
 * ProjectHeaderV2 - 7/5 split header for the detail page.
 *
 * Section 1 of 7 on /projects-v2/[slug]. Taste-skill §4.7
 * discipline:
 *   - min-h-[78dvh] cap, never min-h-[100dvh] on a single
 *     project page (the hero is the project, not a marketing
 *     billboard; overshooting leaves the page feeling half-
 *     empty below).
 *   - Hero stack max 4 elements per side: micro-meta row
 *     (year + category mono), h1, subtext, scope row.
 *   - 0 chrome-pill eyebrows here; budget is preserved for the
 *     From-the-homeowner section which is the editorial register
 *     this page spends the eyebrow on.
 *   - Single accent family (Forest palette, ink + amber). Mono
 *     labels use text-ink-mute, light rule hairlines below the
 *     meta row break editorial stiffness.
 *   - No em-dashes. ASCII hyphens only.
 *   - Returns null only if there is no title at all - the
 *     route already 404s in that case so this is a defensive
 *     zero check.
 */
export default function ProjectHeaderV2({
  slug: _slug,
  title,
  year,
  location,
  category,
  scope,
  description,
  description_json,
}: Props) {
  const yearLabel = year || "-";
  const categoryLabel = category || "Residential";
  const scopeLabel = scope || "Full interior direction";
  const descriptionText =
    description && description.trim().length > 0 ? description : null;
  const descriptionRich = description_json as
    | string
    | Record<string, any>
    | null
    | undefined;

  return (
    <header
      aria-label="Project header"
      className="relative pt-12 md:pt-16 pb-12 md:pb-20 min-h-[78dvh] flex items-center bg-canvas border-b hairline"
    >
      <div className="container-page w-full">
        <nav
          aria-label="Project breadcrumb"
          className="flex items-center justify-between gap-4 mb-10 md:mb-14 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute"
        >
          <Link
            href="/projects-v2"
            className="inline-flex items-center gap-2 hover:text-ink transition-colors"
          >
            <span aria-hidden>{"<-"}</span>
            <span>Selected work</span>
          </Link>
          <span className="hidden md:inline-flex items-center gap-2 truncate">
            <span aria-hidden>/</span>
            <span className="text-ink truncate">{title}</span>
          </span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
          <div className="md:col-span-7">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-5 md:mb-6 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
              <span>{yearLabel}</span>
              <span aria-hidden className="text-ink-soft">
                /
              </span>
              <span>{categoryLabel}</span>
            </div>
            <h1 className="font-display text-[clamp(2.6rem,7vw,5.6rem)] tracking-[-0.025em] leading-[0.98] pb-2 max-w-[18ch]">
              {title}
            </h1>
            <p className="mt-6 md:mt-8 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
              {location ? location : "Maharashtra"}
              {" - "}
              {scopeLabel}
            </p>
          </div>

          <div className="md:col-span-5 md:pt-3 flex flex-col gap-6">
            {descriptionRich || descriptionText ? (
              <RichTextRenderer
                json={descriptionRich as any}
                fallbackText={descriptionText}
              />
            ) : (
              <p className="text-ink-mute text-base md:text-lg leading-relaxed max-w-[42ch]">
                A residential commission drawn from the same hands as the
                joinery and the on-site direction. Pictures, scope, and
                builder log live on this page.
              </p>
            )}
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
              Scope - {scopeLabel}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
