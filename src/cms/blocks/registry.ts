import type { BlockDefinition, BlockType } from "./types";

export type { BlockDefinition, BlockType } from "./types";

export const BLOCK_REGISTRY: Record<BlockType, BlockDefinition> = {
  hero: {
    type: "hero",
    label: "Hero",
    description: "Headline + subtext + photo + stat tiles",
    defaultData: {
      eyebrow: "Studio",
      headlineItalic: "how you live",
      headlinePlain: "Homes built around",
      subtext:
        "Etihad Interiors is a residential studio in Kalyan. Twenty-four weeks. One team. Drawings, materials, and on-site direction from the same hands.",
      photoUrl: "/uploads/images/hero.jpg",
      studioNote: "Every project supervised on-site. No remote hand-offs.",
      stats: [
        { label: "EST.", value: "2017" },
        { label: "Residences delivered", value: "60+" },
        { label: "Avg. project weeks", value: "24" },
        { label: "Studio base", value: "Kalyan, MH" },
      ],
    },
  },
  principles: {
    type: "principles",
    label: "Principles",
    description: "Four standards, single-line each",
    defaultData: {
      title: "Four standards we hold ourselves to.",
      lede:
        "Drawn from the studio's first seven years. Decisions and standards, not copy.",
      items: [
        { label: "One team", body: "Drawings, materials, and site direction from the same studio. No hand-offs." },
        { label: "Five phases", body: "A repeat process. Watched weekly. Reported in writing, not in chat." },
        { label: "On-site direction", body: "Weekly site visits. Snag lists with photographs. Final handover document." },
        { label: "No catalogue swap", body: "Materials are specified against the brief. Substitutions need a conversation." },
      ],
    },
  },
  services: {
    type: "services",
    label: "Services",
    description: "Four bento cells",
    defaultData: {
      title: "A studio that draws, specifies, and ",
      titleEm: "builds",
      lede:
        "Four capabilities. An interior studio that doesn't farm out drawings or hand off a material board at week six and disappear.",
      cells: [
        { title: "Spatial design", body: "Plans, sections, and elevations drawn in-house.", photo: "/uploads/images/services-1.jpg" },
        { title: "Material specification", body: "Stone, wood, textile, finish.", photo: "/uploads/images/services-2.jpg" },
        { title: "On-site direction", body: "Weekly site visits. Written reports.", photo: "/uploads/images/services-3.jpg" },
        { title: "Furniture & styling", body: "Custom joinery and made-to-order soft furnishing.", photo: "/uploads/images/services-4.jpg" },
      ],
    },
  },
  "selected-work": {
    type: "selected-work",
    label: "Selected work",
    description: "Three recent residences",
    defaultData: {
      sectionTitle: "Selected work",
      lede: "Three recent residences. Drawings archived, photographs kept.",
      projectSlugs: ["casa-mira", "nalanda-house", "salt-flats"],
    },
  },
  process: {
    type: "process",
    label: "Process",
    description: "Five phases, scroll-pinned",
    defaultData: {
      eyebrow: "How we work",
      title: "Five phases. Twenty-four weeks. One team.",
      phases: [
        { number: "01", title: "Brief", body: "We start at the kitchen table.", deliverable: "Site survey, spatial brief, budget frame", duration: "Week 1-2" },
        { number: "02", title: "Spatial design", body: "Plans drawn to scale.", deliverable: "Architectural plans, grids", duration: "Week 3-6" },
        { number: "03", title: "Material", body: "Stone, wood, metal, textile.", deliverable: "Material board, samples", duration: "Week 6-9" },
        { number: "04", title: "Build", body: "Site direction, weekly visits.", deliverable: "Weekly reports, snag list", duration: "Week 10-24" },
        { number: "05", title: "Handover", body: "Furniture placed, art hung, lighting tuned.", deliverable: "As-built manual, vendor contacts", duration: "Final week" },
      ],
    },
  },
  testimonials: {
    type: "testimonials",
    label: "Testimonials",
    description: "Three client voices",
    defaultData: {
      title: "Words from the homes.",
      lede: "Three clients, three completions.",
      items: [
        { quote: "They drew every drawing on paper. The site team worked to those drawings.", name: "Rhea D.", role: "Homeowner", location: "Casa Mira, Bandra" },
        { quote: "No surprise substitutions. The handover manual is a document we still open.", name: "Aravind K.", role: "Homeowner", location: "Nalanda House, Kalyan" },
        { quote: "We came in with a Pinterest folder. We left with a home and an instruction manual.", name: "Mira S.", role: "Homeowner", location: "Salt Flats, Alibaug" },
      ],
    },
  },
  "journal-preview": {
    type: "journal-preview",
    label: "Journal preview",
    description: "Latest three journal entries",
    defaultData: {
      sectionTitle: "Studio Journal",
      sectionTitleEm: "Studio",
      lede: "Field notes from the studio.",
      count: 3,
    },
  },
  "spatial-walkthroughs": {
    type: "spatial-walkthroughs",
    label: "Spatial walkthroughs",
    description: "Horizontal scroll-snap with 3D previews",
    defaultData: {
      eyebrow: "Walk through",
      title: "Spatial studies, in 3D",
      lede: "Tap to load. Rotate. Reduced-motion skips animation.",
      projectSlugs: ["nalanda-house", "casa-mira", "salt-flats"],
    },
  },
  "closing-cta": {
    type: "closing-cta",
    label: "Closing CTA",
    description: "Closing line + button",
    defaultData: {
      text: "A home you'll live in for twenty years.",
      em: "twenty years",
      buttonLabel: "Start a project",
      buttonHref: "/contact",
    },
  },
  "rich-text": {
    type: "rich-text",
    label: "Rich text",
    description: "Prose block",
    defaultData: { body: "Write here…" },
  },
  image: {
    type: "image",
    label: "Image",
    description: "Full-bleed image",
    defaultData: {
      url: "/uploads/images/placeholder.jpg",
      alt: "Image",
      aspect: "16/9",
      caption: "",
    },
  },
  "image-grid": {
    type: "image-grid",
    label: "Image grid",
    description: "3-12 image grid",
    defaultData: {
      images: [
        { url: "/uploads/images/grid-1.jpg", alt: "Image 1" },
        { url: "/uploads/images/grid-2.jpg", alt: "Image 2" },
        { url: "/uploads/images/grid-3.jpg", alt: "Image 3" },
      ],
    },
  },
  divider: { type: "divider", label: "Divider", description: "Hairline rule", defaultData: {} },
  spacer: { type: "spacer", label: "Spacer", description: "Vertical space", defaultData: { size: "md" } },
};

export const BLOCK_TYPES = Object.keys(BLOCK_REGISTRY) as BlockType[];
