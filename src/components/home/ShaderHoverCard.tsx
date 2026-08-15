"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType } from "react";

type ShaderRuntimeProps = { url: string };

/**
 * ShaderHoverCard: an image card whose surface bulges toward the
 * cursor via a WebGL displacement shader. The heavy three.js runtime
 * loads lazily (dynamic import, IntersectionObserver, poster <img>
 * until the canvas is ready) so the public bundle stays light - the
 * same pattern as Model3DViewer. Falls back to the plain image for
 * reduced-motion users.
 */
export default function ShaderHoverCard({
  src,
  alt,
  href,
  className = "",
}: {
  src: string;
  alt: string;
  href: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState(false);
  const [ready, setReady] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduce(mql.matches);
    const onChange = () => setReduce(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMount(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "120px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  return (
    <div ref={ref} className={`relative overflow-hidden rounded-[var(--radius-card)] ${className}`}>
      <Link href={href} className="group relative block h-full w-full" aria-label={alt}>
        {!mount || reduce ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 768px) 92vw, 44vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <LazyShader url={src} onReady={() => setReady(true)} />
        )}
        {mount && !reduce && !ready && (
          <Image
            src={src}
            alt=""
            fill
            sizes="(max-width: 768px) 92vw, 44vw"
            className="object-cover"
            aria-hidden
          />
        )}
      </Link>
    </div>
  );
}

function LazyShader({ url, onReady }: { url: string; onReady: () => void }) {
  const [Mod, setMod] = useState<ComponentType<ShaderRuntimeProps> | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("./shader-runtime")
      .then((m) => {
        if (!cancelled) setMod(() => m.default);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (Mod) onReady();
  }, [Mod, onReady]);
  if (!Mod) return null;
  return <Mod url={url} />;
}
