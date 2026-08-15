import type { MetadataRoute } from "next";

/**
 * Studio OS PWA manifest (Module 7). Mirrors public/manifest.json so
 * the app has a static file for non-Next clients and a typed route
 * for Next's <link rel="manifest"> auto-injection.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Studio OS",
    short_name: "StudioOS",
    description:
      "Site diary, snags, boards, BOQ and the full studio pipeline.",
    start_url: "/admin",
    display: "standalone",
    background_color: "#ECECE6",
    theme_color: "#122A20",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
