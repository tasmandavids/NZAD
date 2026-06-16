"use client";

// ============================================================================
//  ParticleBackground — iris-purple glowing dust on Midnight, drifting like
//  moonlit motes and parting gently around the cursor. Raw R3F + a tiny GLSL
//  shader (additive blending) — no drei needed.
//
//  Install:  npm i three @react-three/fiber
//
//  Perf: DPR is clamped, the loop pauses when the tab is hidden, and it fully
//  freezes under prefers-reduced-motion. Drop <ParticleBackground/> behind your
//  hero (it's fixed + -z-10) and lay content on top.
// ============================================================================

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";

const COUNT = 4000;

const VERT = /* glsl */ `
  uniform float uTime;
  uniform vec2  uMouse;   // -1..1 (NDC-ish)
  uniform float uSize;
  attribute float aScale;
  attribute float aSeed;
  varying float vGlow;

  void main() {
    vec3 p = position;

    // slow fluid drift
    p.x += sin(uTime * 0.25 + aSeed)        * 0.35;
    p.y += cos(uTime * 0.20 + aSeed * 1.3)  * 0.30;

    // part around the cursor
    vec2 m = uMouse * vec2(7.0, 4.5);
    float d = distance(p.xy, m);
    float push = smoothstep(3.0, 0.0, d) * 0.7;
    p.xy += normalize(p.xy - m + 0.0001) * push;
    vGlow = push;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aScale * (uSize / -mv.z) * 0.06;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColor;     // Iris
  uniform vec3 uColorDeep; // deep iris
  varying float vGlow;

  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);          // soft round falloff
    vec3 col = mix(uColorDeep, uColor, a + vGlow);
    gl_FragColor = vec4(col, a * (0.5 + vGlow));
  }
`;

function Dust() {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const mouse = useRef(new THREE.Vector2(0, 0));
  const reduce = useReducedMotion();

  const { positions, scales, seeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const scales = new Float32Array(COUNT);
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      scales[i] = Math.random() * 1.4 + 0.3;
      seeds[i] = Math.random() * 6.283;
    }
    return { positions, scales, seeds };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uColor: { value: new THREE.Color("#6B66C9") },     // Iris
      uColorDeep: { value: new THREE.Color("#3D3A8A") }, // deep iris
      uSize: { value: 900 },
    }),
    [],
  );

  useFrame((state) => {
    const m = material.current;
    if (!m) return;
    if (!reduce) m.uniforms.uTime.value = state.clock.elapsedTime;
    mouse.current.lerp(state.pointer, 0.05); // smooth follow
    m.uniforms.uMouse.value.copy(mouse.current);
    m.uniforms.uSize.value = state.size.height;
    if (points.current && !reduce) points.current.rotation.z = state.clock.elapsedTime * 0.01;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function ParticleBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-midnight">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#1B1A38"]} />
        <Dust />
      </Canvas>
      {/* vignette for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 120% at 50% 40%, transparent 45%, rgba(0,0,0,.6) 100%)" }}
      />
    </div>
  );
}
