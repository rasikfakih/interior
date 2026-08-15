/**
 * Module 7 - site diary + snag list shared surface.
 *
 * Client-safe: imported by AdminDiary / AdminSnags and by the API
 * routes. Holds the whitelists, human labels, DTO mappers (photos
 * JSON that arrives as a parsed array on Postgres jsonb and as a
 * TEXT string on the SQLite fallback), and small date helpers.
 */

export const WEATHER_OPTIONS = ["sunny", "cloudy", "rainy"] as const;
export type Weather = (typeof WEATHER_OPTIONS)[number];

export const SNAG_STATUSES = ["open", "fixed", "verified"] as const;
export type SnagStatus = (typeof SNAG_STATUSES)[number];

export const SNAG_PRIORITIES = ["low", "medium", "high"] as const;
export type SnagPriority = (typeof SNAG_PRIORITIES)[number];

export function weatherLabel(w: string | null | undefined): string {
  switch (w) {
    case "sunny":
      return "Sunny";
    case "cloudy":
      return "Cloudy";
    case "rainy":
      return "Rainy";
    default:
      return "Not set";
  }
}

export function snagStatusLabel(s: string | null | undefined): string {
  switch (s) {
    case "open":
      return "Open";
    case "fixed":
      return "Fixed";
    case "verified":
      return "Verified";
    default:
      return "Open";
  }
}

export function snagPriorityLabel(p: string | null | undefined): string {
  switch (p) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    default:
      return "Medium";
  }
}

export type SiteLogDto = {
  id: string;
  tenantId: number;
  clientProjectId: string;
  logDate: string | null;
  photos: string[];
  labourCount: number;
  workDone: string | null;
  voiceTranscript: string | null;
  weather: string | null;
  createdBy: string | null;
  createdAt: string | null;
};

export type SnagDto = {
  id: string;
  tenantId: number;
  clientProjectId: string;
  siteLogId: string | null;
  logDate: string | null;
  photoUrl: string | null;
  description: string;
  status: string;
  assignedTo: string | null;
  priority: string;
  fixedAt: string | null;
  verifiedAt: string | null;
  createdAt: string | null;
};

/** photos arrives as a parsed array on Postgres jsonb, a JSON string
 * on the SQLite fallback, or a comma-ish list if a caller wrote raw. */
export function parsePhotos(photos: unknown): string[] {
  if (Array.isArray(photos)) return photos.map((p) => String(p));
  if (typeof photos === "string" && photos.trim()) {
    try {
      const parsed = JSON.parse(photos);
      if (Array.isArray(parsed)) return parsed.map((p) => String(p));
    } catch {
      /* fall through to raw string */
    }
    return [photos];
  }
  return [];
}

/**
 * Format a log_date cell as YYYY-MM-DD. Postgres returns DATE
 * columns as JS Date objects (pg's local-midnight parse), while the
 * legacy SQLite runtime returned the raw string - handle both.
 */
export function formatDateOnly(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return s;
}

export function mapSiteLogRow(r: Record<string, unknown>): SiteLogDto {
  return {
    id: String(r.id),
    tenantId: Number(r.tenant_id ?? 0),
    clientProjectId: String(r.client_project_id ?? ""),
    logDate: formatDateOnly(r.log_date),
    photos: parsePhotos(r.photos),
    labourCount: Number(r.labour_count ?? 0),
    workDone: r.work_done == null ? null : String(r.work_done),
    voiceTranscript:
      r.voice_transcript == null ? null : String(r.voice_transcript),
    weather: r.weather == null ? null : String(r.weather),
    createdBy: r.created_by == null ? null : String(r.created_by),
    createdAt: r.created_at == null ? null : String(r.created_at),
  };
}

export function mapSnagRow(r: Record<string, unknown>): SnagDto {
  return {
    id: String(r.id),
    tenantId: Number(r.tenant_id ?? 0),
    clientProjectId: String(r.client_project_id ?? ""),
    siteLogId: r.site_log_id == null ? null : String(r.site_log_id),
    logDate: formatDateOnly(r.log_date),
    photoUrl: r.photo_url == null ? null : String(r.photo_url),
    description: String(r.description ?? ""),
    status: String(r.status ?? "open"),
    assignedTo: r.assigned_to == null ? null : String(r.assigned_to),
    priority: String(r.priority ?? "medium"),
    fixedAt: r.fixed_at == null ? null : String(r.fixed_at),
    verifiedAt: r.verified_at == null ? null : String(r.verified_at),
    createdAt: r.created_at == null ? null : String(r.created_at),
  };
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-08-15" -> "15 Aug 2026" (or the raw value when unparseable). */
export function formatLogDate(d: string | null | undefined): string {
  if (!d) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (!m) return d;
  const month = Number(m[2]);
  return `${Number(m[3])} ${MONTHS[month - 1] ?? m[2]} ${m[1]}`;
}

/** Today's date as YYYY-MM-DD in the browser's local timezone. */
export function todayIso(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

/** Relative "2h ago" style timestamps for log cards. */
export function diaryRelativeTime(
  s: string | null | undefined
): string {
  if (!s) return "";
  const t = new Date(s).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatLogDate(s.slice(0, 10));
}

/** Offline queue entry shape persisted to localStorage. */
export type QueuedLog = {
  id: string;
  clientProjectId: string;
  logDate: string | null;
  labourCount: number;
  workDone: string | null;
  voiceTranscript: string | null;
  weather: string | null;
  /** Base64 data URLs of photos captured while offline. */
  photos: string[];
  queuedAt: number;
};

export function queueKey(clientProjectId: string): string {
  return `site_log_queue_${clientProjectId}`;
}
