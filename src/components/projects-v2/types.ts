export type ProjectItemV2 = {
  slug: string;
  title: string;
  category: string;
  location: string;
  year: string;
  scope: string;
  image: string;
  has3D?: boolean;
  modelUrl?: string | null;
  posterUrl?: string | null;
  description?: string | null;
};

export const PROJECTS_FALLBACK =
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1600&auto=format&fit=crop";

export function projectImage(p: { before_image: string | null }): string {
  return p.before_image || PROJECTS_FALLBACK;
}
