import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Newsreader,
  Instrument_Serif,
  Inter_Tight,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";
import { ViewTransitions } from "next-view-transitions";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/components/I18nProvider";
import { SessionProvider } from "@/components/SessionProvider";
import GA4Script from "@/components/GA4Script";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

/**
 * Display serif for the editorial-manifesto read on the public
 * marketing surfaces. Body copy stays on Geist Sans throughout.
 * Newsreader is a refined editorial humanist serif (the closest
 * Google-Fonts match to the Domaine/Reckless spirit the brand
 * brief asked for), replacing the previous Cormorant Garamond.
 * Neither Fraunces nor Instrument Serif (the LLM-default display
 * serifs) is used here.
 */
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

/**
 * Module 11 (Forest & Bone v2): Instrument Serif is the display face
 * for the Awwwards homepage - a single-weight editorial serif with
 * the drawn, slightly naive quality the brand brief asks for. It
 * carries the hero display role only; Newsreader stays the body serif
 * and Geist the UI face.
 */
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

/**
 * Customizer font tokens (Phase 1 Theme tab options). Loaded so the
 * per-tenant theme engine can emit var(--font-inter-tight) /
 * var(--font-space-grotesk) stacks; the default display/body stays
 * Newsreader + Geist regardless.
 *
 * preload: false - these two faces are only used when a tenant picks
 * them in the theme customizer. Without preload the browser only
 * downloads them when the DOM actually references the stack, which on
 * the default surfaces is never (saves ~180KB of font transfer and
 * keeps LCP out of the font stall).
 */
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter-tight",
  display: "swap",
  preload: false,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-space-grotesk",
  display: "swap",
  preload: false,
});

export const viewport: Viewport = {
  themeColor: "#122A20",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://etihadinteriors.com"),
  title: {
    default: "Etihad Interiors - Residential Interior Design Studio",
    template: "%s · Etihad Interiors",
  },
  description:
    "A residential interior studio shaping considered homes across Maharashtra. Spatial design, material specification, and on-site direction from a single team.",
  openGraph: {
    type: "website",
    title: "Etihad Interiors",
    description:
      "Residential interior design, end to end. Considered homes across Maharashtra.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${newsreader.variable} ${instrument.variable} ${interTight.variable} ${spaceGrotesk.variable}`}
    >
      <body className="font-sans antialiased bg-canvas text-ink">
        <SessionProvider>
          <ThemeProvider>
            <I18nProvider>
              {/* Phase 4: soft crossfade between routes via the View
                  Transitions API. Styling lives in globals.css under
                  ::view-transition rules with a reduced-motion guard. */}
              <ViewTransitions>{children}</ViewTransitions>
            </I18nProvider>
          </ThemeProvider>
        </SessionProvider>
        <GA4Script />
      </body>
    </html>
  );
}
