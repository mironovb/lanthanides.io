"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";

// Lanthanum (Z=57) Bohr model, brand-styled.
//
// Motion design:
//  - Scroll morphs the electron shells from flat circles into a near-"star"
//    arrangement; the morph value is exponentially damped so fast or momentum
//    scrolling glides instead of snapping.
//  - The whole atom idles with a slow rotation and tilts a few degrees toward the
//    pointer (window-level listener, since the canvas ignores pointer events).
//  - Under prefers-reduced-motion the idle spin, electron orbits, and parallax
//    stop; only the scroll-driven morph remains, since it follows user input.

const PROTONS = 57;
const NEUTRONS = 82;

// Decorative electron counts per ring (more than before, not full 57)
const RING_ELECTRONS = [3, 4, 4, 5, 5, 6]; // total = 27

// Step 2 (star) is "reached" by this scroll fraction, then it stays there while page continues
const STAR_REACH = 0.42;

// Stop slightly BEFORE full star (1.0). 0.92-0.96 looks good.
const MORPH_MAX = 0.94;

// Brand palette (matches the site accent and ink tokens).
const COLOR_ELECTRON = "#e65100";
const COLOR_ELECTRON_EMISSIVE = "#8f3200";
const COLOR_PROTON = "#e65100";
const COLOR_PROTON_EMISSIVE = "#331200";
const COLOR_NEUTRON = "#54565c";
const COLOR_RING = "#141414";
const RING_BASE_OPACITY = 0.22;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
function smoothstep01(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

// deterministic RNG (stable nucleus)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function samplePointInSphere(rand: () => number, radius: number) {
  const u = rand();
  const v = rand();
  const w = rand();

  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = radius * Math.cbrt(w);

  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(
    r * sinPhi * Math.cos(theta),
    r * sinPhi * Math.sin(theta),
    r * Math.cos(phi)
  );
}

function generatePackedPoints({
  count,
  radius,
  minDist,
  seed,
}: {
  count: number;
  radius: number;
  minDist: number;
  seed: number;
}) {
  const rand = mulberry32(seed);
  const pts: THREE.Vector3[] = [];
  let attempts = 0;

  while (pts.length < count && attempts < 200000) {
    attempts++;
    const p = samplePointInSphere(rand, radius);

    let ok = true;
    for (let i = 0; i < pts.length; i++) {
      if (p.distanceToSquared(pts[i]) < minDist * minDist) {
        ok = false;
        break;
      }
    }
    if (ok) pts.push(p);
  }

  while (pts.length < count) pts.push(samplePointInSphere(rand, radius));
  return pts;
}

type MotionRefs = {
  scrollRef: React.MutableRefObject<number>;
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  animateRef: React.MutableRefObject<boolean>;
};

function Nucleus() {
  const protonRef = useRef<THREE.InstancedMesh>(null!);
  const neutronRef = useRef<THREE.InstancedMesh>(null!);

  // More cohesive/tight nucleus
  const nucleonR = 0.048;
  const nucleusR = 0.19; // tighter core

  const { protonPts, neutronPts } = useMemo(() => {
    const total = PROTONS + NEUTRONS;
    const pts = generatePackedPoints({
      count: total,
      radius: nucleusR,
      minDist: nucleonR * 1.0, // very cohesive
      seed: 57,
    });
    return {
      protonPts: pts.slice(0, PROTONS),
      neutronPts: pts.slice(PROTONS, total),
    };
  }, []);

  useEffect(() => {
    const o = new THREE.Object3D();

    for (let i = 0; i < protonPts.length; i++) {
      o.position.copy(protonPts[i]);
      o.updateMatrix();
      protonRef.current.setMatrixAt(i, o.matrix);
    }
    protonRef.current.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < neutronPts.length; i++) {
      o.position.copy(neutronPts[i]);
      o.updateMatrix();
      neutronRef.current.setMatrixAt(i, o.matrix);
    }
    neutronRef.current.instanceMatrix.needsUpdate = true;
  }, [protonPts, neutronPts]);

  return (
    <group>
      <instancedMesh ref={protonRef} args={[undefined as never, undefined as never, protonPts.length]}>
        <sphereGeometry args={[nucleonR, 20, 20]} />
        <meshStandardMaterial
          color={COLOR_PROTON}
          roughness={0.42}
          metalness={0.2}
          emissive={COLOR_PROTON_EMISSIVE}
          emissiveIntensity={0.5}
        />
      </instancedMesh>

      <instancedMesh ref={neutronRef} args={[undefined as never, undefined as never, neutronPts.length]}>
        <sphereGeometry args={[nucleonR, 20, 20]} />
        <meshStandardMaterial
          color={COLOR_NEUTRON}
          roughness={0.38}
          metalness={0.45}
          emissive="#0b0b0c"
          emissiveIntensity={0.3}
        />
      </instancedMesh>
    </group>
  );
}

function Ring({
  radius,
  ringIndex,
  electrons,
  morphRef,
  animateRef,
}: {
  radius: number;
  ringIndex: number;
  electrons: number;
  morphRef: React.MutableRefObject<number>;
  animateRef: React.MutableRefObject<boolean>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null!);
  const eRef = useRef<THREE.InstancedMesh>(null!);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const spinRef = useRef(0);

  const planeIndex = ringIndex % 3;

  const qCircle = useMemo(() => new THREE.Quaternion(), []);

  const qStar = useMemo(() => {
    // edge-on circle => reads like a line
    const tilt = THREE.MathUtils.degToRad(90);
    const z = THREE.MathUtils.degToRad(planeIndex * 60);
    const qTilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0));
    const qZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), z);
    return qZ.multiply(qTilt);
  }, [planeIndex]);

  const baseAngles = useMemo(() => {
    return Array.from({ length: electrons }, (_, i) => (i / electrons) * Math.PI * 2);
  }, [electrons]);

  useEffect(() => {
    for (let i = 0; i < electrons; i++) {
      const a = baseAngles[i];
      tmp.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      tmp.updateMatrix();
      eRef.current.setMatrixAt(i, tmp.matrix);
    }
    eRef.current.instanceMatrix.needsUpdate = true;
  }, [baseAngles, electrons, radius, tmp]);

  useFrame((_, delta) => {
    const p = clamp01(morphRef.current);

    // target morph reaches 1 by STAR_REACH, then stays; but we cap it below full star
    const m = Math.min(MORPH_MAX, smoothstep01(clamp01(p / STAR_REACH)));

    // Orbit plane orientation (circle -> near-star, never fully star)
    const q = qCircle.clone().slerp(qStar, m);
    groupRef.current.quaternion.copy(q);

    // keep star readable by softly fading inner rings near the star
    const ringRank = ringIndex / 5; // 0..1
    const innerFade = 0.7;
    const vis = 1 - m * innerFade * (1 - ringRank);
    ringMatRef.current.opacity = RING_BASE_OPACITY * vis;

    // Electrons orbit slowly; paused entirely under prefers-reduced-motion.
    if (animateRef.current) {
      spinRef.current += delta * (0.22 + ringIndex * 0.045);
      for (let i = 0; i < electrons; i++) {
        const a = baseAngles[i] + spinRef.current;
        tmp.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
        tmp.updateMatrix();
        eRef.current.setMatrixAt(i, tmp.matrix);
      }
      eRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Shell: ink hairline circle at low opacity */}
      <mesh>
        <torusGeometry args={[radius, 0.0085, 12, 320]} />
        <meshBasicMaterial ref={ringMatRef} color={COLOR_RING} transparent opacity={RING_BASE_OPACITY} />
      </mesh>

      {/* Electrons: brand orange, instanced */}
      <instancedMesh ref={eRef} args={[undefined as never, undefined as never, electrons]}>
        <sphereGeometry args={[0.048, 20, 20]} />
        <meshStandardMaterial
          color={COLOR_ELECTRON}
          roughness={0.28}
          metalness={0.12}
          emissive={COLOR_ELECTRON_EMISSIVE}
          emissiveIntensity={0.75}
        />
      </instancedMesh>
    </group>
  );
}

function Scene({ scrollRef, pointerRef, animateRef }: MotionRefs) {
  // Orbitals closer to the nucleus (tighter stack)
  const radii = useMemo(() => [0.78, 1.0, 1.22, 1.44, 1.66, 1.88], []);

  const groupRef = useRef<THREE.Group>(null!);
  const morphRef = useRef(0);
  const spinRef = useRef(0);

  useFrame((_, delta) => {
    // Ease the morph toward the raw scroll target so every ring reads one smooth,
    // frame-rate independent value.
    morphRef.current = THREE.MathUtils.damp(morphRef.current, scrollRef.current, 5, delta);

    // Idle rotation + gentle pointer parallax, both damped.
    if (animateRef.current) {
      spinRef.current += delta * 0.055;
    }
    const targetY = spinRef.current + (animateRef.current ? pointerRef.current.x * 0.16 : 0);
    const targetX = animateRef.current ? -pointerRef.current.y * 0.1 : 0;
    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetY, 4, delta);
    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetX, 4, delta);
  });

  return (
    <group ref={groupRef} scale={0.9} position={[0, 0.08, 0]}>
      <Nucleus />
      {radii.map((r, i) => (
        <Ring
          key={i}
          radius={r}
          ringIndex={i}
          electrons={RING_ELECTRONS[i] ?? 4}
          morphRef={morphRef}
          animateRef={animateRef}
        />
      ))}
    </group>
  );
}

export default function LanthanumBohrScroll({
  className = "",
  style,
  height = 420,
}: {
  className?: string;
  style?: React.CSSProperties;
  /** Convenience height in px, used when no explicit style/className sizing is given. */
  height?: number;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
  const animateRef = useRef(true);

  useEffect(() => {
    let raf = 0;

    const update = () => {
      const doc = document.documentElement;
      const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
      const raw = window.scrollY / maxScroll;
      scrollRef.current = clamp01(raw * 4);
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };

    // The canvas container ignores pointer events, so track the pointer at the
    // window level for the parallax tilt (normalized to -1..1 from center).
    const onPointerMove = (e: PointerEvent) => {
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotionPref = () => {
      animateRef.current = !media.matches;
    };
    applyMotionPref();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    media.addEventListener("change", applyMotionPref);
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      media.removeEventListener("change", applyMotionPref);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={className}
      role="presentation"
      aria-hidden="true"
      style={{ position: "relative", pointerEvents: "none", width: "100%", height, ...style }}
    >
      <Canvas
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5.4], fov: 40, near: 0.1, far: 100 }}
        style={{ background: "transparent", width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[6, 7, 6]} intensity={1.1} />
        <pointLight position={[-5, -2, 3]} intensity={0.55} color="#ffd9c2" />
        <pointLight position={[0, 0, 0]} intensity={0.5} distance={5} color="#ff8a50" />
        <Scene scrollRef={scrollRef} pointerRef={pointerRef} animateRef={animateRef} />
      </Canvas>
    </div>
  );
}
