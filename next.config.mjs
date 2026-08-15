/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // The demo's remote patterns. Buyers on custom domains will need to
    // add their own hostnames here OR run a Vercel deploy without
    // remote images and instead use uploaded media from the media library
    // which serves from /uploads on the local filesystem.
    // See DEPLOY.md and INSTALL.md for guidance.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "ethinterior.vercel.app" },
    ],
  },
  async redirects() {
    return [
      // Module 12: /projects-v2 was a pre-launch duplicate of /projects.
      // Canonical route is /projects; stale links and DB menu rows still work.
      {
        source: "/projects-v2/:path*",
        destination: "/projects/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default config;
