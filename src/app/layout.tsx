import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/components/I18nProvider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SessionProvider } from "@/components/SessionProvider";
import SmoothScroll from "@/components/SmoothScroll";
import GrainOverlay from "@/components/GrainOverlay";
import LicenseBanner from "@/components/LicenseBanner";
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
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased bg-canvas text-ink">
        <SessionProvider>
          <ThemeProvider>
          <I18nProvider>
            <LicenseBanner />
            <SmoothScroll />
            <GrainOverlay />
            <Navbar />
            <main>{children}</main>
            <Footer />
          </I18nProvider>
          </ThemeProvider>
        </SessionProvider>
        <GA4Script />
      </body>
    </html>
  );
}
