"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, ContactShadows } from "@react-three/drei";

interface Props {
  modelUrl: string;
  posterUrl?: string;
  reducedMotion: boolean;
  onReady: () => void;
}

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1.5} />;
}

export default function ThreeRuntime({
  modelUrl,
  posterUrl,
  reducedMotion,
  onReady,
}: Props) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 2, 5], fov: 50 }}
      onCreated={() => onReady()}
      dpr={[1, 1.75]}
    >
      <Suspense fallback={null}>
        <Model url={modelUrl} />
        <ContactShadows position={[0, -1.5, 0]} opacity={0.4} />
        <Environment preset="apartment" />
      </Suspense>
      <OrbitControls
        autoRotate={!reducedMotion}
        autoRotateSpeed={2}
        minDistance={3}
        maxDistance={8}
        enablePan={false}
      />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
    </Canvas>
  );
}
