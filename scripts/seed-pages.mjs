#!/usr/bin/env node
/**
 * Seed the 'home' pages row with the studio's default block list,
 * matching today's static homepage so the first install renders identically.
 */
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "etihad.db");
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

function exists(rows) {
  return rows && rows.length > 0;
}

let pageRow = sqlite
  .prepare("SELECT id FROM pages WHERE slug = 'home'")
  .get();
if (!pageRow) {
  const r = sqlite
    .prepare(
      `INSERT INTO pages (slug, title, status, seo_title, seo_description, is_front, published_at)
       VALUES ('home', 'Etihad Interiors — Residential Design Studio', 'published',
               'Etihad Interiors — Residential Design Studio',
               'A residential studio shaping considered homes across Maharashtra.',
               1, ?)`
    )
    .run(new Date().toISOString());
  pageRow = { id: Number(r.lastInsertRowid) };
  console.log("+ inserted home page");
}

const blockCount = sqlite
  .prepare("SELECT COUNT(*) AS c FROM page_blocks WHERE page_id = ?")
  .get(pageRow.id);
if (blockCount.c === 0) {
  const blocks = [
    {
      type: "hero",
      data: {
        eyebrow: "Residential · Maharashtra",
        headlinePlain: "Homes built around",
        headlineItalic: "how you live",
        afterPlain: ", not how a catalogue looks",
        subtext:
          "Etihad Interiors is a residential studio in Kalyan. Twenty-four weeks. One team. Drawings, materials, and on-site direction from the same hands.",
        photoUrl:
          "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1600&auto=format&fit=crop",
        studioNote: "Every project supervised on-site. No remote hand-offs.",
        stats: [
          { label: "EST.", value: "2017" },
          { label: "Residences delivered", value: "60+" },
          { label: "Avg. project weeks", value: "24" },
          { label: "Studio base", value: "Kalyan, MH" },
        ],
      },
    },
    {
      type: "principles",
      data: {
        title: "Four standards we hold ourselves to.",
        lede: "Drawn from the studio's first seven years.",
        items: [
          { label: "One team", body: "Drawings, materials, and site direction from the same studio. No hand-offs." },
          { label: "Five phases", body: "A repeat process. Watched weekly. Reported in writing, not in chat." },
          { label: "On-site direction", body: "Weekly site visits. Snag lists with photographs. Final handover document." },
          { label: "No catalogue swap", body: "Materials are specified against the brief. Substitutions need a conversation." },
        ],
      },
    },
    {
      type: "services",
      data: {
        title: "A studio that draws, specifies, and ",
        titleEm: "builds",
        lede:
          "Four capabilities. An interior studio that doesn't farm out drawings or hand off a material board at week six and disappear.",
        cells: [
          { title: "Spatial design", body: "Plans, sections, and elevations drawn in-house.", photo: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1600&auto=format&fit=crop" },
          { title: "Material specification", body: "Stone, wood, textile, finish.", photo: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop" },
          { title: "On-site direction", body: "Weekly site visits. Written reports.", photo: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?q=80&w=1600&auto=format&fit=crop" },
          { title: "Furniture & styling", body: "Custom joinery and made-to-order soft furnishing.", photo: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1600&auto=format&fit=crop" },
        ],
      },
    },
    {
      type: "selected-work",
      data: {
        sectionTitle: "Selected work",
        lede: "Three recent residences. Drawings archived, photographs kept.",
        projectSlugs: ["casa-mira", "nalanda-house", "salt-flats"],
      },
    },
    {
      type: "spatial-walkthroughs",
      data: {
        eyebrow: "Walk through",
        title: "Spatial studies, in 3D",
        lede: "Tap a card to load the model. Reduced-motion skips animation.",
        projectSlugs: ["nalanda-house", "casa-mira", "salt-flats"],
      },
    },
    {
      type: "process",
      data: {
        eyebrow: "How we work",
        title: "Five phases. Twenty-four weeks. One team.",
        phases: [
          { number: "01", title: "Brief", body: "We start at the kitchen table.", deliverable: "Site survey, spatial brief, budget frame", duration: "Week 1-2" },
          { number: "02", title: "Spatial design", body: "Plans, sections, and elevations drawn to scale.", deliverable: "Architectural plans, furniture grids", duration: "Week 3-6" },
          { number: "03", title: "Material", body: "Stone, wood, metal, textile.", deliverable: "Material board, samples", duration: "Week 6-9" },
          { number: "04", title: "Build", body: "Site direction, weekly visits.", deliverable: "Weekly reports, snag list", duration: "Week 10-24" },
          { number: "05", title: "Handover", body: "Furniture placed, art hung, lighting tuned.", deliverable: "As-built manual, vendor contacts", duration: "Final week" },
        ],
      },
    },
    {
      type: "testimonials",
      data: {
        title: "Words from the homes.",
        lede: "Three clients, three completions.",
        items: [
          { quote: "They drew every drawing on paper. The site team worked to those drawings.", name: "Rhea D.", role: "Homeowner", location: "Casa Mira, Bandra" },
          { quote: "No surprise substitutions. No margin pad on the bill. The handover manual is a document we still open.", name: "Aravind K.", role: "Homeowner", location: "Nalanda House, Kalyan" },
          { quote: "We came in with a Pinterest folder. We left with a home and an instruction manual.", name: "Mira S.", role: "Homeowner", location: "Salt Flats, Alibaug" },
        ],
      },
    },
    {
      type: "journal-preview",
      data: {
        sectionTitle: "Studio Journal",
        sectionTitleEm: "Studio",
        lede: "Field notes from the studio.",
        count: 3,
      },
    },
    {
      type: "closing-cta",
      data: {
        text: "A home you'll live in for twenty years. Let's start with a kitchen table conversation.",
        em: "twenty years",
        buttonLabel: "Start a project",
        buttonHref: "/contact",
      },
    },
  ];
  const insert = sqlite.prepare(
    `INSERT INTO page_blocks (page_id, type, data, order_index) VALUES (?, ?, ?, ?)`
  );
  blocks.forEach((b, i) => insert.run(pageRow.id, b.type, JSON.stringify(b.data), i));
  console.log(`+ seeded ${blocks.length} home blocks`);
}

const journal = sqlite
  .prepare("SELECT id FROM pages WHERE slug = 'journal'")
  .get();
if (!journal) {
  sqlite
    .prepare(
      `INSERT INTO pages (slug, title, status, is_front, published_at)
       VALUES ('journal', 'Journal', 'published', 0, ?)`
    )
    .run(new Date().toISOString());
  console.log("+ inserted journal page");
}

const aboutPage = sqlite
  .prepare("SELECT id FROM pages WHERE slug = 'about'")
  .get();
if (!aboutPage) {
  sqlite
    .prepare(
      `INSERT INTO pages (slug, title, status, is_front, published_at)
       VALUES ('about', 'About the studio', 'published', 0, ?)`
    )
    .run(new Date().toISOString());
  console.log("+ inserted about page");
}

const contactPage = sqlite
  .prepare("SELECT id FROM pages WHERE slug = 'contact'")
  .get();
if (!contactPage) {
  sqlite
    .prepare(
      `INSERT INTO pages (slug, title, status, is_front, published_at)
       VALUES ('contact', 'Contact', 'published', 0, ?)`
    )
    .run(new Date().toISOString());
  console.log("+ inserted contact page");
}

const projectsPage = sqlite
  .prepare("SELECT id FROM pages WHERE slug = 'projects'")
  .get();
if (!projectsPage) {
  sqlite
    .prepare(
      `INSERT INTO pages (slug, title, status, is_front, published_at)
       VALUES ('projects', 'Selected work', 'published', 0, ?)`
    )
    .run(new Date().toISOString());
  console.log("+ inserted projects page");
}

sqlite.close();
console.log("Pages seed done.");
