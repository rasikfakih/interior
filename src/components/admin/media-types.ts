/**
 * Shared media types for the admin editor surfaces.
 *
 * The Phase 2 API surfaces the same row shape. Type-defining
 * once means the grid, picker, and project/journal editors
 * can each consume the row without re-typing.
 */

export type MediaKind = "image" | "glb" | "video" | "pdf" | "raw";

export const MEDIATYPE_LABEL: Record<MediaKind, string> = {
  image: "Image",
  glb: "3D model (GLB)",
  video: "Video",
  pdf: "PDF",
  raw: "Raw",
};

export const MAX_BYTES: Record<MediaKind, number> = {
  image: 8 * 1024 * 1024,
  glb: 25 * 1024 * 1024,
  video: 80 * 1024 * 1024,
  pdf: 25 * 1024 * 1024,
  raw: 50 * 1024 * 1024,
};

export function kindFromMime(mime: string): MediaKind {
  if (mime.startsWith("image/")) return "image";
  if (mime === "model/gltf-binary" || mime.startsWith("model/")) return "glb";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "raw";
}

export type MediaRow = {
  id: number;
  kind: MediaKind | string;
  mime: string;
  size: number;
  original_name: string;
  storage_path: string;
  url: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
  created_at: string | Date | null;
};

export type MediaListResponse = {
  rows: MediaRow[];
  nextBefore: number | null;
};

export type UploadIntent = {
  id: number;
  storagePath: string;
  uploadUrl: string;
  uploadToken: string | null;
  expiresIn: number;
  mime: string;
  size: number;
  kind: MediaKind | string;
};

export function formatBytes(n: number): string {
  if (!Number.isFinite(n)) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
