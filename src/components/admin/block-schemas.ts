import type { BlockType } from "@/cms/blocks/registry";

export type FieldSchema = {
  kind:
    | "text"
    | "longtext"
    | "number"
    | "select"
    | "richtext"
    | "media"
    | "mediaGallery"
    | "toggle";
  label: string;
  path: string;
  placeholder?: string;
  options?: string[];
  max?: number;
};

export type ArraySchemaKind =
  | "items"
  | "phases"
  | "projectSlugs"
  | "cells"
  | "stats"
  | "images";

export type ArraySchema = {
  label: string;
  itemLabel?: (item: any, idx: number) => string;
  fields: FieldSchema[];
  defaults: () => any;
  max?: number;
};

export type BlockSchema = {
  type: BlockType;
  scalars: FieldSchema[];
  arrays: Record<string, ArraySchema>;
  defaults: () => any;
};

function scalar(
  kind: FieldSchema["kind"],
  label: string,
  path: string,
  extras: Partial<FieldSchema> = {}
): FieldSchema {
  return { kind, label, path, ...extras };
}

function arr(
  _key: string,
  label: string,
  fields: FieldSchema[],
  defaults: () => any,
  extras: Partial<ArraySchema> = {}
): ArraySchema {
  return { label, fields, defaults, ...extras };
}

export function getSchema(type: BlockType): BlockSchema {
  switch (type) {
    case "hero":
      return {
        type,
        defaults: () => ({
          eyebrow: "",
          headlinePlain: "",
          headlineItalic: "",
          subtext: "",
          photoUrl: "",
          studioNote: "",
          stats: [
            { label: "EST.", value: "" },
            { label: "Residences", value: "" },
            { label: "Avg. weeks", value: "" },
            { label: "Studio base", value: "" },
          ],
        }),
        scalars: [
          scalar("text", "Eyebrow", "eyebrow", {
            placeholder: "Studio",
            max: 80,
          }),
          scalar("text", "Headline (plain)", "headlinePlain", {
            placeholder: "Homes built around",
            max: 200,
          }),
          scalar("text", "Headline (italic)", "headlineItalic", {
            placeholder: "how you live",
            max: 80,
          }),
          scalar("longtext", "Subtext", "subtext", { max: 600 }),
          scalar("media", "Hero photo", "photoUrl"),
          scalar("longtext", "Studio note", "studioNote", { max: 240 }),
        ],
        arrays: {
          stats: arr(
            "stats",
            "Stat tiles",
            [
              scalar("text", "Label", "label", { max: 40 }),
              scalar("text", "Value", "value", { max: 40 }),
            ],
            () => ({ label: "", value: "" })
          ),
        },
      };

    case "principles":
      return {
        type,
        defaults: () => ({
          title: "",
          lede: "",
          items: [{ label: "", body: "" }],
        }),
        scalars: [
          scalar("text", "Title", "title", { max: 200 }),
          scalar("longtext", "Lede", "lede", { max: 400 }),
        ],
        arrays: {
          items: arr(
            "items",
            "Items",
            [
              scalar("text", "Label", "label", { max: 80 }),
              scalar("longtext", "Body", "body", { max: 240 }),
            ],
            () => ({ label: "", body: "" })
          ),
        },
      };

    case "services":
      return {
        type,
        defaults: () => ({
          title: "",
          titleEm: "",
          lede: "",
          cells: [{ title: "", body: "", photo: "" }],
        }),
        scalars: [
          scalar("text", "Title (plain)", "title", { max: 120 }),
          scalar("text", "Title (italic)", "titleEm", { max: 60 }),
          scalar("longtext", "Lede", "lede", { max: 400 }),
        ],
        arrays: {
          cells: arr(
            "cells",
            "Service cells",
            [
              scalar("text", "Title", "title", { max: 80 }),
              scalar("longtext", "Body", "body", { max: 240 }),
              scalar("media", "Photo", "photo"),
            ],
            () => ({ title: "", body: "", photo: "" })
          ),
        },
      };

    case "selected-work":
      return {
        type,
        defaults: () => ({
          sectionTitle: "",
          lede: "",
          projectSlugs: ["casa-mira"],
        }),
        scalars: [
          scalar("text", "Section title", "sectionTitle", { max: 80 }),
          scalar("longtext", "Lede", "lede", { max: 400 }),
          scalar("media", "Default cover (optional)", "coverUrl"),
        ],
        arrays: {
          projectSlugs: arr(
            "projectSlugs",
            "Project slugs",
            [scalar("text", "Slug", "value", { max: 80 })],
            () => "new-project"
          ),
        },
      };

    case "process":
      return {
        type,
        defaults: () => ({
          eyebrow: "",
          title: "",
          phases: [
            {
              number: "01",
              title: "",
              body: "",
              deliverable: "",
              duration: "",
            },
          ],
        }),
        scalars: [
          scalar("text", "Eyebrow", "eyebrow", { max: 80 }),
          scalar("text", "Title", "title", { max: 200 }),
        ],
        arrays: {
          phases: arr(
            "phases",
            "Phases",
            [
              scalar("text", "Number", "number", { max: 4 }),
              scalar("text", "Title", "title", { max: 80 }),
              scalar("longtext", "Body", "body", { max: 240 }),
              scalar("text", "Deliverable", "deliverable", { max: 200 }),
              scalar("text", "Duration", "duration", { max: 80 }),
            ],
            () => ({
              number: "",
              title: "",
              body: "",
              deliverable: "",
              duration: "",
            })
          ),
        },
      };

    case "testimonials":
      return {
        type,
        defaults: () => ({
          title: "",
          lede: "",
          items: [{ quote: "", name: "", role: "", location: "" }],
        }),
        scalars: [
          scalar("text", "Title", "title", { max: 200 }),
          scalar("longtext", "Lede", "lede", { max: 400 }),
        ],
        arrays: {
          items: arr(
            "items",
            "Testimonials",
            [
              scalar("longtext", "Quote", "quote", { max: 500 }),
              scalar("text", "Name", "name", { max: 80 }),
              scalar("text", "Role", "role", { max: 80 }),
              scalar("text", "Location", "location", { max: 120 }),
            ],
            () => ({ quote: "", name: "", role: "", location: "" })
          ),
        },
      };

    case "journal-preview":
      return {
        type,
        defaults: () => ({
          sectionTitle: "Studio Journal",
          sectionTitleEm: "Studio",
          lede: "",
          count: 3,
        }),
        scalars: [
          scalar("text", "Section title (plain)", "sectionTitle", { max: 80 }),
          scalar("text", "Section title (italic word)", "sectionTitleEm", {
            max: 40,
          }),
          scalar("longtext", "Lede", "lede", { max: 400 }),
          scalar("number", "Posts shown", "count", { max: 12 }),
        ],
        arrays: {},
      };

    case "spatial-walkthroughs":
      return {
        type,
        defaults: () => ({
          eyebrow: "",
          title: "",
          lede: "",
          projectSlugs: ["nalanda-house"],
        }),
        scalars: [
          scalar("text", "Eyebrow", "eyebrow", { max: 80 }),
          scalar("text", "Title", "title", { max: 200 }),
          scalar("longtext", "Lede", "lede", { max: 300 }),
        ],
        arrays: {
          projectSlugs: arr(
            "projectSlugs",
            "Project slugs",
            [scalar("text", "Slug", "value", { max: 80 })],
            () => "new-project"
          ),
        },
      };

    case "closing-cta":
      return {
        type,
        defaults: () => ({
          text: "",
          em: "",
          buttonLabel: "",
          buttonHref: "",
        }),
        scalars: [
          scalar("text", "Closing text", "text", {
            placeholder: "A home you'll live in for twenty years.",
            max: 240,
          }),
          scalar("text", "Italic word", "em", { max: 60 }),
          scalar("text", "Button label", "buttonLabel", { max: 60 }),
          scalar("text", "Button href", "buttonHref", { max: 240 }),
        ],
        arrays: {},
      };

    case "rich-text":
      return {
        type,
        defaults: () => ({ body: "" }),
        scalars: [scalar("richtext", "Body", "body", { max: 32000 })],
        arrays: {},
      };

    case "image":
      return {
        type,
        defaults: () => ({
          url: "",
          alt: "",
          aspect: "16/9",
          caption: "",
        }),
        scalars: [
          scalar("media", "Image", "url"),
          scalar("text", "Alt text", "alt", { max: 200 }),
          scalar("select", "Aspect", "aspect", {
            options: ["16/9", "4/3", "3/2", "1/1", "21/9", "9/16"],
          }),
          scalar("text", "Caption", "caption", { max: 200 }),
        ],
        arrays: {},
      };

    case "image-grid":
      return {
        type,
        defaults: () => ({
          images: [{ url: "", alt: "" }, { url: "", alt: "" }, { url: "", alt: "" }],
        }),
        scalars: [],
        arrays: {
          images: arr(
            "images",
            "Images",
            [
              scalar("media", "Image", "url"),
              scalar("text", "Alt text", "alt", { max: 200 }),
            ],
            () => ({ url: "", alt: "" })
          ),
        },
      };

    case "divider":
      return {
        type,
        defaults: () => ({}),
        scalars: [],
        arrays: {},
      };

    case "spacer":
      return {
        type,
        defaults: () => ({ size: "md" }),
        scalars: [
          scalar("select", "Size", "size", {
            options: ["xs", "sm", "md", "lg", "xl"],
          }),
        ],
        arrays: {},
      };

    default:
      return {
        type,
        defaults: () => ({}),
        scalars: [],
        arrays: {},
      } as any;
  }
}
