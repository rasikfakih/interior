"use client";

import { useState } from "react";
import Image from "next/image";

type Props = {
  beforeSrc: string;
  beforeAlt: string;
  afterSrc: string;
  afterAlt: string;
  caption?: string;
};

export default function BeforeAfterSlider({
  beforeSrc,
  beforeAlt,
  afterSrc,
  afterAlt,
  caption,
}: Props) {
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  return (
    <figure className="surface-elevated rounded-[var(--radius-card)] overflow-hidden select-none">
      <div
        className="relative aspect-[16/9] cursor-ew-resize touch-none"
        role="slider"
        aria-label="Before and after"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pos}
        tabIndex={0}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onPointerMove={(e) => {
          if (!dragging) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          setPos(Math.max(0, Math.min(100, x)));
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          setPos(Math.max(0, Math.min(100, x)));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
          if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
        }}
      >
        <Image
          src={afterSrc}
          alt={afterAlt}
          fill
          sizes="(min-width: 1280px) 1232px, 100vw"
          priority
          className="object-cover"
          draggable={false}
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${pos}%` }}
        >
          <Image
            src={beforeSrc}
            alt={beforeAlt}
            fill
            sizes="(min-width: 1280px) 1232px, 100vw"
            priority
            className="object-cover"
            style={{ width: `${(100 / pos) * 100}%`, maxWidth: "none" }}
            draggable={false}
          />
        </div>
        <div
          className="pointer-events-none absolute inset-y-0"
          style={{ left: `${pos}%` }}
        >
          <div className="absolute -translate-x-1/2 top-0 bottom-0 w-px bg-canvas shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" />
          <span
            aria-hidden
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-11 h-11 rounded-full bg-canvas flex items-center justify-center font-mono text-sm"
          >
            ||
          </span>
        </div>
        <span className="absolute top-3 left-3 chrome-pill pointer-events-none">Before</span>
        <span className="absolute top-3 right-3 chrome-pill pointer-events-none">After</span>
      </div>
      {caption && (
        <figcaption className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute px-4 py-3">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
