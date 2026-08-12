import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://etihadinteriors.com"),
  title: {
    default: "Etihad Interiors — Residential Interior Design Studio",
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
      className={`${geist.variable} ${geistMono.variable} ${newsreader.variable}`}
    >
      <body className="font-sans antialiased bg-canvas text-ink">
        <SessionProvider>
          <ThemeProvider>
            <I18nProvider>{children}</I18nProvider>
          </ThemeProvider>
        </SessionProvider>
        <GA4Script />
      </body>
    </html>
  );
}
