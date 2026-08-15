import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowsLeftRight,
  BookOpen,
  Briefcase,
  ChartBar,
  Camera,
  Check,
  CheckCircle,
  Trash,
  CloudArrowUp,
  DownloadSimple,
  Download,
  Microphone,
  PencilSimple,
  WifiSlash,
  X,
  EnvelopeSimple,
  FrameCorners,
  Gauge,
  GearSix,
  IdentificationBadge,
  Image as PhosphorImage,
  Key,
  LinkSimple,
  List,
  ListBullets,
  ListNumbers,
  Megaphone,
  PaintBrush,
  Palette,
  Paragraph,
  Plus,
  Quotes,
  SignOut,
  ShippingContainer,
  Sparkle,
  SquaresFour,
  Stack,
  Star,
  Terminal,
  TextAa,
  TextB,
  TextH,
  TextHSix,
  TextItalic,
  UserCircle,
  UserFocus,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";

/**
 * Shared icon surface. Per the project directive, every glyph renders
 * Phosphor with the duotone weight - standardized in this one file so
 * no call site can drift to a different weight.
 *
 * Icons come from the package's `dist/ssr` entry (the SSRBase build
 * with no IconContext) so Next.js build-time page-data collection
 * never touches the createContext-based CSR bundle. `IconProps` is
 * typed from the root entry which re-exports it from `./lib`.
 *
 * All icons inherit the surrounding font size (Phosphor defaults to
 * 1em); pass `size` explicitly only when the glyph must not scale
 * with the text.
 */

export function IconArrowLeft(props: IconProps) {
  return <ArrowLeft weight="duotone" {...props} />;
}

export function IconArrowRight(props: IconProps) {
  return <ArrowRight weight="duotone" {...props} />;
}

export function IconArrowUpRight(props: IconProps) {
  return <ArrowUpRight weight="duotone" {...props} />;
}

export function IconArrowUp(props: IconProps) {
  return <ArrowUp weight="duotone" {...props} />;
}

export function IconArrowDown(props: IconProps) {
  return <ArrowDown weight="duotone" {...props} />;
}

// Rich-text toolbar commands.
export function IconTextBold(props: IconProps) {
  return <TextB weight="duotone" {...props} />;
}

export function IconTextItalic(props: IconProps) {
  return <TextItalic weight="duotone" {...props} />;
}

export function IconTextH2(props: IconProps) {
  return <TextH weight="duotone" {...props} />;
}

export function IconTextH3(props: IconProps) {
  return <TextHSix weight="duotone" {...props} />;
}

export function IconListBullets(props: IconProps) {
  return <ListBullets weight="duotone" {...props} />;
}

export function IconListNumbers(props: IconProps) {
  return <ListNumbers weight="duotone" {...props} />;
}

export function IconQuote(props: IconProps) {
  return <Quotes weight="duotone" {...props} />;
}

export function IconLink(props: IconProps) {
  return <LinkSimple weight="duotone" {...props} />;
}

export function IconImage(props: IconProps) {
  return <PhosphorImage weight="duotone" {...props} />;
}

export function IconParagraph(props: IconProps) {
  return <Paragraph weight="duotone" {...props} />;
}

export function IconSignOut(props: IconProps) {
  return <SignOut weight="duotone" {...props} />;
}

export function IconPlus(props: IconProps) {
  return <Plus weight="duotone" {...props} />;
}

/** Rating star (fill via weight). */
export function IconStar(props: IconProps) {
  return <Star weight="fill" {...props} />;
}

/** Confirm / saved state. */
export function IconCheck(props: IconProps) {
  return <Check weight="bold" {...props} />;
}

/** Confirmed circle state. */
export function IconCheckCircle(props: IconProps) {
  return <CheckCircle weight="duotone" {...props} />;
}

/** Delete / remove. */
export function IconTrash(props: IconProps) {
  return <Trash weight="duotone" {...props} />;
}

/** Download (PWA install affordance). */
export function IconDownload(props: IconProps) {
  return <Download weight="duotone" {...props} />;
}

/** Camera (site diary photo capture). */
export function IconCamera(props: IconProps) {
  return <Camera weight="duotone" {...props} />;
}

/** Microphone (voice transcript dictation). */
export function IconMic(props: IconProps) {
  return <Microphone weight="duotone" {...props} />;
}

/** Pencil (inline edit affordance). */
export function IconPencil(props: IconProps) {
  return <PencilSimple weight="duotone" {...props} />;
}

/** Close / dismiss. */
export function IconX(props: IconProps) {
  return <X weight="duotone" {...props} />;
}

/** Network disconnected (offline badge). */
export function IconWifiSlash(props: IconProps) {
  return <WifiSlash weight="duotone" {...props} />;
}

/** Console nav glyphs (tenant admin + operator sidebar). */
export type NavIconName =
  | "pages"
  | "media"
  | "projects"
  | "journal"
  | "testimonials"
  | "team"
  | "theme"
  | "menus"
  | "forms"
  | "redirects"
  | "users"
  | "export"
  | "settings"
  | "identity"
  | "newsletter"
  | "leads"
  | "clientProjects"
  | "materials"
  | "vendors"
  | "install"
  | "license"
  | "tenants"
  | "health"
  | "metrics"
  | "announcements"
  | "backup"
  | "distro"
  | "rotate"
  | "sparkles";

const NAV_GLYPHS: Record<NavIconName, ComponentType<IconProps>> = {
  pages: SquaresFour,
  media: PhosphorImage,
  projects: FrameCorners,
  journal: BookOpen,
  testimonials: Quotes,
  team: Users,
  theme: PaintBrush,
  menus: List,
  forms: TextAa,
  redirects: ArrowsLeftRight,
  users: UserCircle,
  export: DownloadSimple,
  settings: GearSix,
  identity: IdentificationBadge,
  newsletter: EnvelopeSimple,
  leads: UserFocus,
  clientProjects: Briefcase,
  materials: Stack,
  vendors: ShippingContainer,
  install: Terminal,
  license: Key,
  tenants: Stack,
  health: Gauge,
  metrics: ChartBar,
  announcements: Megaphone,
  backup: CloudArrowUp,
  distro: Palette,
  rotate: ArrowCounterClockwise,
  sparkles: Sparkle,
};

/** One duotone entry point for every console nav glyph. */
export function IconNav({ name, ...props }: { name: NavIconName } & IconProps) {
  const Glyph = NAV_GLYPHS[name];
  return <Glyph weight="duotone" {...props} />;
}
