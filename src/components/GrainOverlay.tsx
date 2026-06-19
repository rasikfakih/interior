export default function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: "var(--z-grain)" }}
    >
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04] mix-blend-multiply dark:mix-blend-screen"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="grain-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-noise)" />
      </svg>
    </div>
  );
}
