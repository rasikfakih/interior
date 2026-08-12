"use client";

import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Environment,
  ContactShadows,
  useProgress,
} from "@react-three/drei";
import * as THREE from "three";

interface Props {
  modelUrl: string;
  posterUrl?: string;
  reducedMotion: boolean;
  onReady: () => void;
}

type CameraPreset = "front" | "three-quarter" | "top" | "detail";

const PRESETS: Record<
  CameraPreset,
  { label: string; position: [number, number, number]; target: [number, number, number] }
> = {
  front: { label: "Front", position: [0, 0.9, 5.2], target: [0, 0.7, 0] },
  "three-quarter": {
    label: "3/4",
    position: [4.2, 2.4, 4.2],
    target: [0, 0.7, 0],
  },
  top: { label: "Top", position: [0.001, 5.6, 0.001], target: [0, 0.7, 0] },
  detail: { label: "Detail", position: [0, 1.1, 2.3], target: [0, 1.0, 0] },
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function ThreeRuntime({
  modelUrl,
  posterUrl,
  reducedMotion,
  onReady,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [preset, setPreset] = useState<CameraPreset>("front");
  const [fullscreen, setFullscreen] = useState(false);
  const [failed, setFailed] = useState(false);
  // drei's useProgress reads a module-level store, so it works
  // outside the Canvas for a DOM progress bar.
  const { progress, active } = useProgress();

  function toggleFullscreen() {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }

  useEffect(() => {
    function onFs() {
      setFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Phase 6 usage analytics: one model_3d_load event per successful
  // load. progress === 100 && !active means drei finished fetching;
  // reduced-motion users still count (the event is a fetch, no motion).
  const firedLoad = useRef(false);
  useEffect(() => {
    if (firedLoad.current) return;
    if (!active && progress >= 100 && !failed) {
      firedLoad.current = true;
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 3000);
      fetch("/api/usage/record", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "model_3d_load",
          path: window.location.pathname,
          host: window.location.host,
        }),
        signal: ctl.signal,
        keepalive: true,
      }).catch(() => {});
      return () => clearTimeout(t);
    }
  }, [progress, active, failed]);

  return (
    <div
      ref={wrapRef}
      className={`relative w-full overflow-hidden rounded-[var(--radius-card)] ${
        fullscreen ? "fixed inset-0 z-[999] rounded-none bg-[#0b0f0a]" : ""
      }`}
      style={fullscreen ? { height: "100dvh" } : undefined}
    >
      {posterUrl && failed && (
        <img
          src={posterUrl}
          alt="Project spatial preview"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{ position: PRESETS.front.position, fov: 45 }}
        onCreated={() => onReady()}
      >
        <Suspense fallback={null}>
          <SceneContent
            modelUrl={modelUrl}
            reducedMotion={reducedMotion}
            preset={preset}
            onFail={() => setFailed(true)}
          />
        </Suspense>
      </Canvas>

      {!failed && active && progress < 100 && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10 pointer-events-none">
          <div
            className="h-full bg-white/70 transition-[width] duration-200"
            style={{ width: `${Math.round(progress)}%` }}
          />
        </div>
      )}

      {!failed && (
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-3 pointer-events-none">
          <div className="flex gap-1.5 pointer-events-auto">
            {(Object.keys(PRESETS) as CameraPreset[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                aria-pressed={preset === p}
                className={`font-mono text-[9px] uppercase tracking-[0.18em] px-2.5 h-7 rounded-full border transition-colors ${
                  preset === p
                    ? "bg-white/15 text-white border-white/40"
                    : "bg-black/35 text-white/70 border-white/15 hover:text-white hover:border-white/35"
                }`}
              >
                {PRESETS[p].label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="font-mono text-[9px] uppercase tracking-[0.18em] px-2.5 h-7 rounded-full border border-white/15 bg-black/35 text-white/70 hover:text-white hover:border-white/35 pointer-events-auto"
          >
            {fullscreen ? "Exit" : "Fullscreen"}
          </button>
        </div>
      )}

      {!failed && (
        <p className="absolute bottom-2.5 left-3 font-mono text-[9px] uppercase tracking-[0.18em] text-white/40 pointer-events-none">
          Drag to orbit · scroll to zoom
        </p>
      )}

      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-elev rounded-[var(--radius-card)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            Could not load this model
          </p>
        </div>
      )}
    </div>
  );
}

function SceneContent({
  modelUrl,
  reducedMotion,
  preset,
  onFail,
}: {
  modelUrl: string;
  reducedMotion: boolean;
  preset: CameraPreset;
  onFail: () => void;
}) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls> | null>(null);
  return (
    <>
      <ModelErrorBoundary onFail={onFail}>
        <Suspense fallback={null}>
          <AutoFitModel url={modelUrl} onFail={onFail} />
        </Suspense>
      </ModelErrorBoundary>

      <ContactShadows position={[0, -1.45, 0]} opacity={0.35} blur={2.4} scale={7} far={3} />

      {/* Lighting rig: soft key with shadows, cool fill, warm rim */}
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[5, 8, 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-6, 2, -4]} intensity={0.35} color="#cfe0d8" />
      <directionalLight position={[0, 3, -7]} intensity={0.5} color="#e8d9b8" />

      <Environment preset="apartment" environmentIntensity={0.55} />

      <CameraRig preset={preset} controlsRef={controlsRef} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        autoRotate={!reducedMotion}
        autoRotateSpeed={1.6}
        minDistance={1.6}
        maxDistance={10}
        enablePan={false}
        target={[0, 0.7, 0]}
      />
    </>
  );
}

function AutoFitModel({ url, onFail }: { url: string; onFail: () => void }) {
  const { scene } = useGLTF(url);
  // Pure computation keyed on the loaded scene: normalize any GLB to a
  // ~2.6-unit bounding box centered on the origin so the camera rig and
  // contact shadows hold regardless of the model's authored scale.
  const fit = useMemo(() => {
    if (!scene) return null;
    try {
      const box = new THREE.Box3().setFromObject(scene);
      if (box.isEmpty()) {
        return { scale: 1, offset: [0, 0, 0] as [number, number, number] };
      }
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 2.6 / maxDim;
      return {
        scale,
        offset: [
          -center.x * scale,
          -center.y * scale,
          -center.z * scale,
        ] as [number, number, number],
      };
    } catch {
      onFail();
      return null;
    }
  }, [scene, onFail]);

  if (!fit) return null;
  return (
    <group position={fit.offset} scale={fit.scale}>
      <primitive object={scene} />
    </group>
  );
}

class ModelErrorBoundary extends Component<
  { onFail: () => void; children: ReactNode },
  { errored: boolean }
> {
  state = { errored: false };
  static getDerivedStateFromError() {
    return { errored: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    if (this.state.errored) return null;
    return this.props.children;
  }
}

function CameraRig({
  preset,
  controlsRef,
}: {
  preset: CameraPreset;
  controlsRef: React.RefObject<ComponentRef<typeof OrbitControls> | null>;
}) {
  const camera = useThree((s) => s.camera);
  const from = useRef<{ pos: THREE.Vector3; tgt: THREE.Vector3 } | null>(null);
  const t = useRef(1);
  const to = useMemo(() => {
    const p = PRESETS[preset];
    return {
      pos: new THREE.Vector3(...p.position),
      tgt: new THREE.Vector3(...p.target),
    };
  }, [preset]);

  useEffect(() => {
    const c = controlsRef.current;
    if (!c) return;
    from.current = {
      pos: camera.position.clone(),
      tgt: c.target.clone(),
    };
    t.current = 0;
  }, [preset, camera, controlsRef]);

  useFrame((_, delta) => {
    const c = controlsRef.current;
    if (!c || !from.current) return;
    if (t.current < 1) {
      t.current = Math.min(1, t.current + delta / 0.8);
      const e = easeInOutCubic(t.current);
      camera.position.lerpVectors(from.current.pos, to.pos, e);
      c.target.lerpVectors(from.current.tgt, to.tgt, e);
      c.update();
    }
  });

  return null;
}
