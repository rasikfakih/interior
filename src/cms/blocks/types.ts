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
  | "spacer"
  | "form";

export type BlockData = Record<string, unknown>;

export type BlockDefinition<T = BlockData> = {
  type: BlockType;
  label: string;
  description: string;
  defaultData: T;
  validate?: (data: T) => { ok: boolean; error?: string };
};
