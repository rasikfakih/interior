# Sales notes

What the Etihad Interiors Theme gives buyers in 90 seconds. For sales
calls and copy-paste on landing pages.

## The one-liner

> A premium residential interior design theme with a built-in license
> tier system, multilingual support, and a page builder that runs after
> install. Buyers re-skin via `/admin` and ship on their own domain.

## Who buys it

- Solo interior designers running a 1-4 person studio.
- Small architecture firms with a residential practice.
- Agencies delivering sites to interior-design clients (Extended License).
- Existing studios who already use WordPress + Studio Pro and want a
  lighter alternative.

## What buyers love about it

- Home page renders from a block registry they can reorder.
- Admin panel is React-shaped, not page-templates, so the team can
  actually edit without a developer.
- Tiptap rich text is built into journal, project descriptions, and
  page-block rich text - no Markdown fiddling.
- Media library has alt-text and a picker. Drag-and-drop.
- 3D walkthroughs render on the home page and on project cards.
  Tied to the Business tier.
- Multilingual (EN/HI/MR) gated to Business.
- License tier system real, not a checkbox. Personal = $$, Business = $$$.

## Common buyer objections and how to answer them

| Objection | Answer |
| --- | --- |
| "Will it work on my hosting?" | Yes. Any host that runs Node.js 18+. Vercel is the documented path; we have a one-pager for it. |
| "I want a custom domain" | Yes. Vercel project attach. Same DNS flow as any Next.js project. |
| "I want to change the colors" | Yes. `/admin/site-identity` for color. Plus a `theme.distro.json` for per-tenant branding. |
| "What if I null out the license?" | Banner shows. Admin + 3D lock. Public reads keep rendering. One-click re-stamp via `/install` or `/admin/license`. |
| "I want a hosted license server" | Not yet. Roadmap item. Offline HMAC is enough for v1.1.0. Hosted server slot is reserved in env. |
| "Can you customize it for me?" | Yes - studio consulting available. Visit `/` and click **Contact** for the studio's intake form. |
| "Can my client self-host and re-sell it?" | One tenant per license, full white-label included. Per-tenant distro file. |

## Tier costs (current pricing)

Personal: $$$  
Business: $$$$  
Extended License: $$$ + the project's base price (Envato's terms apply).

This is editorial copy. See Envato for live prices.

## How a buyer finds the demo

- Envato listing shows the live URL.
- Direct: `https://ethinterior.vercel.app` then `Install` button.
- Sales outreach via the studio's contact form.

## What the studio does NOT do

- Operate the buyer's site (buyer is on their own).
- Build buyer pages for them. Out of scope for v1.1.0.
- Host the live demo beyond Vercel Hobby plan.

## Refund policy (studio's stay)

1. Demo mismatch on first deploy -> full refund.
2. Functionality regresses between Envato release versions -> refund or
   a free upgrade to the matching v1.x version.
3. Buyer misconfigures their Vercel project -> support ticket, not a
   refund.

## Lead follow-up

Every Envato signup gets the studio's operator flow:

1. Operator approves tenant within 1 business day.
2. License JSON is sent within 1 business day.
3. Buyer has 14 days to start a support thread before the support
   counter resets to 0.

## Studio pain points to highlight in the listing

- Demo is REAL: 8 demo JPGs generated from real procedural SVG, 3D GLB
  rendered. Not a styling dump over a Stripe-Connect starter.
- White-label is REAL: `theme.distro.json` is a documented schema with
  contrast checks and em-dash / hide-rules. Buyers can rebrand in
  an afternoon.
- Operator console is REAL: studio team controls all tenants from
  one panel. License issuance = one click.
