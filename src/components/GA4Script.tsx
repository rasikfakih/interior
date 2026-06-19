"use client";

import Script from "next/script";

export default function GA4Script() {
  const id = process.env.NEXT_PUBLIC_GA4_ID;
  if (!id) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}', { page_path: window.location.pathname });
        `}
      </Script>
    </>
  );
}
