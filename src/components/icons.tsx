import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowsLeftRight,
  BookOpen,
  ChartBar,
  CloudArrowUp,
  DownloadSimple,
  EnvelopeSimple,
  FrameCorners,
  Gauge,
  GearSix,
  IdentificationBadge,
  Image,
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
  SquaresFour,
  Stack,
  Terminal,
  TextAa,
  TextB,
  TextH,
  TextHSix,
  TextItalic,
  UserCircle,
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
  return <Image weight="duotone" {...props} />;
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
  | "install"
  | "license"
  | "tenants"
  | "health"
  | "metrics"
  | "announcements"
  | "backup"
  | "distro"
  | "rotate";

const NAV_GLYPHS: Record<NavIconName, ComponentType<IconProps>> = {
  pages: SquaresFour,
  media: Image,
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
  install: Terminal,
  license: Key,
  tenants: Stack,
  health: Gauge,
  metrics: ChartBar,
  announcements: Megaphone,
  backup: CloudArrowUp,
  distro: Palette,
  rotate: ArrowCounterClockwise,
};

/** One duotone entry point for every console nav glyph. */
export function IconNav({ name, ...props }: { name: NavIconName } & IconProps) {
  const Glyph = NAV_GLYPHS[name];
  return <Glyph weight="duotone" {...props} />;
}
