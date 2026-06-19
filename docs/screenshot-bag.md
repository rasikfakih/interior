# Screenshot + promo video brief

This is the working brief for the visual assets that ship alongside
the product. The 8 thumbnails and 3 promo videos are the single
biggest commercial asset of this product. They exist to **make the
listing feel premium before a designer reads a single line of code**.

The Eight thumbnails.

8 of these.  Each title is both a thumbnail concept and the technical
marketing angle. Render at 1440×900 minimum, 16:10 ratio preferred,
1280×800 fallback. PNG, no chrome on top, no marketing overlays. The
studio's CMS is the rendering substrate for all of them — when
generating them, illuminate the seeded homepage with the corresponding
section in focus.

  1. **Clean Composition** — Home hero, dark chrome bar across the stat tiles. Aesthetic sells without words.
  2. **The 3D Walk-Through** — `Spatial Walkthroughs` block on home, model opened on one card, photo poster on the other two. Suggests three.js integration without saying it.
  3. **Block Builder** — `/admin/pages/[id]` with two pinned-stack cards, sidebar open. Suggests drag-to-build power.
  4. **Tiptap in the Wild** — close-up of block editing pane with bold + quote + list nodes. Suggests real writing.
  5. **Admin Map** — admin sidebar tabs (Pages / Media / License / …) collapsed but visible. Suggests scope at a glance.
  6. **License Stamp** — `/admin/license` with stamped banner. Suggests safety net for buyers.
  7. **Projects Surface** — `/projects` index showing six cards with `3D` chip on two. Indicates feature density.
  8. **Studio Journal** — `/journal` detail page with rich-text body and cover image. Suggests editorial muscle.

The Three promo videos.

30 seconds each. No voiceover the first 8 seconds. Soft ambient piano
in the rest. Each one demonstrates one product capability:

  1. **Click-and-twist** — User clicks a project card with the `3D`
     chip, modal opens, model rotates via OrbitControls, reduced-motion
     toggled on (animation freezes, poster still appears).
  2. **Page builder** — Buyer drags a Services block into position on
     `home`, real-time preview updates, hits ctrl-s, admin toast
     confirms save. Sidebar narrows for keyboard-free workflow.
  3. **License dessert** — Buyer visits `/install`, fills 3 fields,
     server stamps `data/license.json` on disk. Site transitions from
     red "Unlicensed" banner to clean canvas. Demonstrates recovery
     without reinstallation.

Dummies.

Generate clean JSON for each thumbnail: name, layout (split/bento/full-bleed),
aspect, sections to highlight, indicator text overlay (faded to chrome-pill
opacity, never more than 3 pills per image). Save as `docs/thumbs/[name].json`
so the renderer that produces final PNGs works off a single source of truth.

  ```json
  {
    "name": "thumbs-01-clean-composition",
    "layout": "split",
    "aspect": "16:10",
    "highlightSections": ["hero", "services-nozzle"],
    "pillText": ["NEXT.WORD", "ETIHAD"]
  }
  ```

When image gen is reachable: render from JSON + capture from the live
demo URL. When not: the JSON files act as an offline brief the lead
designer can produce visuals from in Figma.

The one rule: never show the WordPress default sheen (gradient blobs,
AI generated soft glows, purple accents). Every image has a single
chrome pill and the studio's forest green anchor. The look is quiet,
considered, residential.
