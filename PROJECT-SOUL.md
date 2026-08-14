# The Soul and Idea of This Project

A companion to `masterinterior.md` (the technical map). This file is the
why underneath the what: the conviction the product was built on, the
taste it refuses to compromise, and the voice it speaks in. Read it when
a decision needs more than a checklist.

---

## The idea in one line

**A studio's website should feel like the studio's work: honest,
handmade, and lived in - and any interior studio in the world should be
able to have that without writing a line of code.**

The product is a theme that carries a philosophy. The demo is a real
studio (Etihad Interiors, Kalyan, Maharashtra) whose actual way of
working became the theme's personality. The technology exists to
reproduce that personality for any buyer: one install, one palette, a
site their clients can feel.

---

## The founding conviction

Most studio websites are either (a) a template that looks like every
other template, or (b) a brochure that dies the day it launches because
nothing on it is editable. This project was built against both.

The conviction, stated plainly:

1. **A website is a live thing, not a brochure.** Every page an admin
   can edit is a page that stays true. WordPress-grade editability
   (blocks, media, menus, forms, pages) is not a feature list; it is
   the product being honest about how a real studio operates.
2. **The studio hosts the site, so the studio never touches code.**
   The operator console, license issuance, theme distribution, health
   probes, backups, login-as support - all of it exists so the buyer
   keeps designing and the studio keeps running.
3. **Craft is the brand.** The theme's aesthetic is not decoration; it
   is the same discipline the studio applies to interiors: one accent,
   one scale, real materials, things measured against each other, no
   substitutions without a conversation.

The kitchen-table line in the code says it best, and it is the thesis
of the whole product:

> "We start at the kitchen table, not the mood board."

That is how the site should feel to the buyer: less like a sales page,
more like the first conversation.

---

## The soul: the studio the theme was built from

Etihad Interiors is a residential studio in Kalyan: twenty-four weeks,
one team, drawings and materials and on-site direction from the same
hands. Every default string in the product is their working creed:

- **One team** - "Drawings, materials, and site direction from the same
  studio. No hand-offs."
- **Five phases** - "A repeat process. Watched weekly. Reported in
  writing, not in chat."
- **On-site direction** - "Weekly site visits. Snag lists with
  photographs. Final handover document."
- **No catalogue swap** - "Materials are specified against the brief.
  Substitutions need a conversation."

The hero says "Homes built around how you live." The process section
starts at the brief: "We start at the kitchen table, not the mood
board." The closing line is "A home you'll live in for twenty years.
Let's start with a kitchen table conversation."

Notice the pattern: the copy keeps returning to the kitchen table, to
hand-written reports, to photographs that show a moment versus reports
that show movement. The theme's soul is **domestic permanence** - things
built to be lived in for twenty years, not things built to be liked for
twenty seconds.

The journal seeds carry the same voice:

- "Three stone quarries outside Pune, and what they actually do" - "You'll
  never be quoted the same marble twice."
- "How a household is lived in matters more than how it looks in
  renderings."
- "Why we still write site reports by hand" - "A photograph shows one
  moment. A written report shows the movement between them."

That last line is close to the product's own philosophy: **the written,
the specified, the deliberate beats the flashy.** The theme prefers
written site reports over renders, specified materials over swaps, and
calm over noise.

---

## The design soul: Forest & Bone, and why it is not a template

The shipped look is called Forest & Bone: deep forest ink on bone paper
(`ink #122A20`, `paper #ECECE6`), a restrained soft amber accent
(`#C0964F`), and a forest-shadow muted (`#56605A`), set in the
Newsreader display serif. The palette file carries an explicit note:

> "NOT the AI-default beige/brass/oxblood family."

That note is the design soul in one sentence: **this project would
rather be wrong in a specific direction than right in a generic one.**
Forest green is not a safe choice; it is a confident one, the color of
a room you live in rather than a page you scroll past.

The aesthetic rules are the same discipline the studio applies to
rooms:

- **One accent color, locked per page.** A room with three accents is
  a room with no accent. A page with three colors fighting is a page
  with no opinion.
- **One corner-radius scale, locked per page.** Scale is a voice too;
  inconsistency is noise.
- **Real images, never fake screenshots.** The demo assets are real
  JPEGs of real rooms, generated procedurally but rendered as
  photographs. No div-based mockups. The product shows actual rooms
  because the product sells actual rooms.
- **`min-h-[100dvh]`, never `h-screen`.** Small details of respect:
  the viewport is a person's screen, not a marketing unit.
- **Reduced motion always respected.** Motion is seasoning, not the
  dish. Anyone who has asked the web to slow down is never shouted at.
- **Max one eyebrow per three sections; never center a hero unless
  editorial.** The site refuses the rhythms of template marketing - the
  same way a studio refuses a catalogue swap.

These are not arbitrary "design tokens." They are the product's
temperament: **specific, measured, calm, and built to last twenty
years.**

---

## The product soul: hosted, supported, white-label

The business model is itself a philosophy: the studio hosts and
supports buyer installs. The buyer is not sold software; they are sold
a service the way a client is sold an interior - with a spec, a
timeline, and someone on site.

The demo pitch, in the walkthrough:

> "Your studio's site, live in one install, hosted and maintained for
> you - with a theme your clients can feel."

Every operator tool exists to make that sentence true:

- **License wizard** - the studio issues an HMAC-signed license and
  emails the buyer the install code. No code, no keys, no ceremony.
- **Theme distributor** - "paste a distro JSON, apply, the palette
  flips on the next request. The hosted, you-don't-touch-code pitch."
- **Health board** - "every buyer site gets a monitor." The studio runs
  a live probe against every tenant and persists the status.
- **Login-as** - "we can fix it for you without asking for passwords."
- **Backup** - every table snapshots to one JSON file on the spot.
- **Metrics** - revenue in cents, pageviews, 3D loads, form submits:
  the studio knows how its buyers are doing.

The white-labeling itself is respectful: the buyer's own brand, their
own palette, their own name in the header - with one honest line of
attribution in the footer: **"Powered by Interior Studio Theme Made By
Rasik Fakih."** Credit is built in, not hidden. The maker signs the
work the way the studio signs the handover document.

---

## The voice: rules that read as personality

The project's voice rules, and the soul behind each:

| Rule | The soul behind it |
|---|---|
| **No emojis anywhere.** | Emojis are the catalogue swap of writing - a substitute for saying something specific. |
| **No em-dashes; ASCII hyphens only.** | The em-dash is a tell of machine-generated prose. The hyphen is the handwriting of someone who actually wrote it. |
| **No `Inter` as the default font.** | Inter is the default of every template; a studio is not every template. |
| **No 3-column equal feature cards.** | Bento grids are marketing wallpaper. Rooms are not equal; neither are reasons. |
| **Report in writing, not in chat.** | The studio's own line, applied to the codebase: decisions live in docs and changelogs, not in ephemeral messages. |
| **Substitutions need a conversation.** | Material swaps and design deviations both need a reason and a conversation. |

The voice is the sound of someone who has actually been on a site: a
photo of a moment, a written report of the movement between moments.

---

## The demo story (the soul in four beats)

The buyer demo for 2026-08-15 tells the whole soul in four beats:

1. **The buyer's live site.** Open the URL, name the craft: "the palette
   is yours to recalibrate - this is the shipped default, not a
   template." Then the 3D walkthrough: "Spatial studies ship with the
   theme."
2. **The operator console.** Tenants, theme console, license wizard,
   health board, metrics, backup, login-as - the studio's side of the
   kitchen table.
3. **The install.** One command, `./install.sh --code=... --domain=...
   --tier=...`, and a new studio's site renders with projects, journal,
   testimonials, and the 3D walkthrough. "One install command,
   idempotent seeds, content is replaceable from /admin."
4. **The close.** "What would your studio's site look like? Tell me
   your palette and I'll show you."

That last line is the product in one sentence: **the palette is the
personality, and it is the buyer's to choose.**

---

## What this project refuses to be

A soul is defined by its refusals as much as its affirmations:

- Not the AI-default beige/brass/oxblood family. (Written in the
  palette file itself.)
- Not a template that looks like every other template.
- Not a brochure that cannot be edited.
- Not software that evaporates on the next cold start (the SQLite era
  is a scar the project still documents).
- Not a product that needs the buyer to touch code.
- Not a page that shouts. One accent, one scale, one voice.
- Not a substitution without a conversation.

---

## The soul checklist (use this for every decision)

When a feature, a page, a string, or a color is being decided, ask:

1. **Would this feel at home in a home built for twenty years?** If it
   is trendy, it expires.
2. **Is it specific, or is it a default?** Forest green over beige.
   Handwritten over templated. Specific over safe.
3. **Is it honest about how a studio actually works?** The site should
   be as editable as the studio is real.
4. **Does it need a conversation before it ships?** Substitutions
   require one. So do design deviations and em-dashes.
5. **Does it serve the buyer's palette, or ours?** The theme paints
   whatever the buyer chooses; the craft is in making every palette
   look like a considered room.
6. **Is the maker's signature still visible?** The credit line stays;
   the craft stays; the kitchen table stays.

If the answer to any of those is no, the feature is a catalogue swap.
Talk it through first.
