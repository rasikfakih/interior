export type BlockType =
  | "hero"
  | "principles"
  | "services"
  | "selected-work"
  | "process"
  | "testimonials"
  | "journal-preview"
  | "spatial-walkthroughs"
  | "closing-cta"
  | "rich-text"
  | "image"
  | "image-grid"
  | "divider"
  | "spacer";

export type BlockDefinition<T = any> = {
  type: BlockType;
  label: string;
  description: string;
  defaultData: T;
  validate?: (data: T) => { ok: boolean; error?: string };
};
