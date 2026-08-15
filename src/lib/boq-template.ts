/**
 * src/lib/boq-template.ts
 *
 * Server-only template loader for the BOQ engine. Kept out of
 * src/lib/boq.ts because that module is imported by client components
 * (AdminBOQ), and fs must never reach the client bundle.
 */

import fs from "fs/promises";
import path from "path";

export type TemplateItem = {
  item_name: string;
  unit: string;
  qty: number;
  material_rate: number;
  labour_rate: number;
  linked_material_category?: string;
};

export type BoqTemplate = {
  name: string;
  categories: { category: string; items: TemplateItem[] }[];
};

/** Read a template file from data/boq-templates. */
export async function loadBoqTemplate(name: string): Promise<BoqTemplate> {
  const file = path.join(process.cwd(), "data", "boq-templates", `${name}.json`);
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw) as BoqTemplate;
}
