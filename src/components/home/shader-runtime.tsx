"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

const VERT = /* glsl */ `
  uniform float uStrength;
  uniform vec2 uHover;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    float d = distance(uv, uHover);
    float ripple = smoothstep(0.7, 0.0, d) * uStrength;
    vec3 pos = position;
    pos.z += ripple * 0.22;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uTex;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uTex, vUv);
    gl_FragColor = c;
  }
`;

function CoverPlane({ url }: { url: string }) {
  const tex = useTexture(url);
  const mesh = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();
  const [cover, setCover] = useState<[number, number] | null>(null);

  const mat = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: tex },
        uStrength: { value: 0 },
        uHover: { value: new THREE.Vector2(0.5, 0.5) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
    });
    return m;
  }, [tex]);

  // Cover-fit the plane to the viewport once the texture dimensions
  // are known: scale = max(vw / texAspect, vh) along the longer axis.
  useFrame(() => {
    if (cover) return;
    const img = tex.image as { width?: number; height?: number } | undefined;
    const tw = img?.width;
    const th = img?.height;
    if (!tw || !th || !mesh.current) return;
    const aspect = tw / th;
    const scale = Math.max(viewport.width, viewport.height * aspect) / 2;
    mesh.current.scale.set(scale * aspect, scale, 1);
    setCover([scale * aspect, scale]);
  });

  // Animate the hover ripple toward the pointer each frame.
  const state = useRef({ strength: 0, target: 0, hx: 0.5, hy: 0.5 });
  useFrame((_, dt) => {
    const s = state.current;
    const u = mat.uniforms;
    s.strength += (s.target - s.strength) * Math.min(1, dt * 6);
    (u.uStrength.value as number) = s.strength;
    (u.uHover.value as THREE.Vector2).lerp(new THREE.Vector2(s.hx, s.hy), Math.min(1, dt * 8));
  });

  return (
    <mesh
      ref={mesh}
      material={mat}
      onPointerEnter={() => {
        state.current.target = 1;
      }}
      onPointerLeave={() => {
        state.current.target = 0;
      }}
      onPointerMove={(e) => {
        const uv = e.uv;
        if (uv) {
          state.current.hx = uv.x;
          state.current.hy = uv.y;
        }
      }}
    >
      <planeGeometry args={[1, 1, 48, 48]} />
    </mesh>
  );
}

export default function ShaderRuntime({ url }: { url: string }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 2.6], fov: 50 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%", touchAction: "pan-y" }}
    >
      <Suspense fallback={null}>
        <CoverPlane url={url} />
      </Suspense>
    </Canvas>
  );
}
