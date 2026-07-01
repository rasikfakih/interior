export type ProjectItem = {
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
