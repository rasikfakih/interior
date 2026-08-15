# Awwwards reel - 30s storyboard

Format: 1440px wide, 60fps, desktop. One beat per five seconds. Record at
full scroll (no fixed header in frame), keep the browser chrome clean, and
let each interaction complete before cutting.

| Time | Shot | On screen | Notes |
| --- | --- | --- | --- |
| 0:00-0:05 | Hero reveal | Instrument Serif headline "Homes built around how you live." rises through the clip mask; the mono eyebrow and amber CTA appear behind it. | Fresh load, no scroll. Capture the clip-path stagger. Cut on the final line settling. |
| 0:05-0:10 | Horizontal projects | Vertical scroll pins the rail; project cards travel left. Card 02 passes center. | Scroll at a steady pace, ~800px over the beat. |
| 0:10-0:15 | Shader hover | Cursor crosses the Living Room card; the displacement ripple follows the pointer, then settles. | Move the mouse slowly across the full card, pause, then click through to /projects. |
| 0:15-0:20 | Kanban drag | Admin leads board: drag the "Demo - Arjun Kulkarni" card from Qualified into Site Visit. Column totals update. | Cut from the marketing site to /admin. Keep the drag smooth, no teleporting. |
| 0:20-0:25 | Board canvas | Material sidebar -> drag a stone tile onto the 2000x1500 canvas, resize a corner handle, rotate once. | The amber selection outline should be visible. |
| 0:25-0:30 | BOQ total | BOQ page: change a quantity from 12 to 14, the row amount and the amber total recalculate live. | End frame: the total, large, in Geist Mono amber. Fade to the logo mark. |

## After the cut

A 10s title card is fine but not required: "Studio OS for interior
designers - one console for the whole job." Site: ethinterior.vercel.app.
No emojis anywhere in the reel.

## Prep checklist

- [ ] Run `node scripts/seed-demo.mjs` so every screen has real data
- [ ] Log in to /admin before the Kanban beat
- [ ] Mute system audio (no UI sounds exist; the reel should stay silent)
- [ ] Record with the reduced-motion OS setting OFF
- [ ] Screen recorder at 1440p, 60fps, H.264
