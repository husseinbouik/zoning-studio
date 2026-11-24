import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Edges, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { ArticleLayout, Design, Finish } from '../lib/design';
import { makeWoodTexture } from '../lib/texture';

interface SceneProps {
  design: Design;
  layout: ArticleLayout;
  finish: Finish;
  onSelectColumn: (index: number) => void;
}

const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

/* ------------------------------------------------------------------ */
/* Damped layout animation (P0-1)                                      */
/*                                                                     */
/* The article's millimetre layout is mirrored into a mutable ref;     */
/* every frame each value is damped toward the engine's target so      */
/* panels glide instead of teleporting. Reduced-motion snaps. On a     */
/* formula error the App keeps passing the last valid layout, so the   */
/* scene simply holds still.                                           */
/* ------------------------------------------------------------------ */

interface AnimZone {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface AnimColumn {
  x: number;
  width: number;
  zones: AnimZone[];
}
interface AnimState {
  width: number;
  height: number;
  thickness: number;
  columns: AnimColumn[];
}

function snapshot(layout: ArticleLayout, design: Design): AnimState {
  return {
    width: design.width,
    height: design.height,
    thickness: design.thickness,
    columns: layout.columns.map((c) => ({
      x: c.x,
      width: c.width,
      zones: c.zones.map((z) => ({ x: z.x, y: z.y, width: z.width, height: z.height })),
    })),
  };
}

const LAMBDA = 11; // damping rate — ~250–300ms settle feel
const SNAP = 0.02; // mm — below this, jump straight to the target

function dampTo(cur: number, target: number, delta: number, snap: boolean): number {
  if (snap || Math.abs(target - cur) < SNAP) return target;
  return THREE.MathUtils.damp(cur, target, LAMBDA, delta);
}

function stepToward(cur: AnimState, target: AnimState, delta: number, snap: boolean) {
  cur.width = dampTo(cur.width, target.width, delta, snap);
  cur.height = dampTo(cur.height, target.height, delta, snap);
  cur.thickness = dampTo(cur.thickness, target.thickness, delta, snap);

  // Columns: damp the shared prefix; new columns are born at their target,
  // removed columns vanish — geometry stays valid at every frame.
  const shared = Math.min(cur.columns.length, target.columns.length);
  for (let i = 0; i < shared; i++) {
    const c = cur.columns[i];
    const t = target.columns[i];
    c.x = dampTo(c.x, t.x, delta, snap);
    c.width = dampTo(c.width, t.width, delta, snap);
    const zShared = Math.min(c.zones.length, t.zones.length);
    for (let j = 0; j < zShared; j++) {
      const z = c.zones[j];
      const tz = t.zones[j];
      z.x = dampTo(z.x, tz.x, delta, snap);
      z.y = dampTo(z.y, tz.y, delta, snap);
      z.width = dampTo(z.width, tz.width, delta, snap);
      z.height = dampTo(z.height, tz.height, delta, snap);
    }
    if (c.zones.length < t.zones.length) {
      for (let j = c.zones.length; j < t.zones.length; j++) c.zones.push({ ...t.zones[j] });
    } else if (c.zones.length > t.zones.length) {
      c.zones.length = t.zones.length;
    }
  }
  if (cur.columns.length < target.columns.length) {
    for (let i = cur.columns.length; i < target.columns.length; i++) {
      const t = target.columns[i];
      cur.columns.push({ x: t.x, width: t.width, zones: t.zones.map((z) => ({ ...z })) });
    }
  } else if (cur.columns.length > target.columns.length) {
    cur.columns.length = target.columns.length;
  }
}

/* ------------------------------------------------------------------ */

interface ArticleProps {
  design: Design;
  layout: ArticleLayout;
  panelMaterial: THREE.Material;
  selectedPanelMaterial: THREE.Material;
  frameMaterial: THREE.Material;
  backMaterial: THREE.Material;
  onSelectColumn: (index: number) => void;
}

function AnimatedArticle({
  design,
  layout,
  panelMaterial,
  selectedPanelMaterial,
  frameMaterial,
  backMaterial,
  onSelectColumn,
}: ArticleProps) {
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const anim = useRef<AnimState>(snapshot(layout, design));
  const [, setTick] = useState(0);

  useFrame((_, delta) => {
    const target = snapshot(layout, design);
    const before = JSON.stringify(anim.current);
    stepToward(anim.current, target, Math.min(delta, 0.05), reducedMotion);
    if (JSON.stringify(anim.current) !== before) setTick((n) => n + 1);
  });

  const a = anim.current;
  const scale = 3.4 / Math.max(a.width, a.height);
  const W = a.width * scale;
  const H = a.height * scale;
  const T = Math.max(a.thickness * scale, 0.012);
  const depth = 0.16;

  const toX = (mm: number) => -W / 2 + mm * scale;
  const toY = (mm: number) => -H / 2 + mm * scale;

  return (
    <>
      <group position={[0, 0.12, 0]}>
        {/* Backing board — exactly the article's overall size. */}
        <mesh position={[0, 0, -depth / 2 - 0.015]} material={backMaterial} receiveShadow>
          <boxGeometry args={[W, H, 0.03]} />
        </mesh>

        {a.columns.map((col, ci) => {
          const colCenterX = toX(col.x + col.width / 2);
          const isSelected = design.selectedColumn === ci;
          return (
            <group key={ci}>
              {col.zones.map((zone, zi) => {
                const zw = Math.max(zone.width * scale, 0.001);
                const zh = Math.max(zone.height * scale, 0.001);
                const cx = toX(zone.x + zone.width / 2);
                const cy = toY(zone.y + zone.height / 2);
                const showLabel = zw > 0.42 && zh > 0.24;
                // Label text comes from the target layout (exact mm); only the
                // geometry glides toward it.
                const tz = layout.columns[ci]?.zones[zi];
                return (
                  <group key={zi}>
                    <mesh
                      position={[cx, cy, 0]}
                      material={isSelected ? selectedPanelMaterial : panelMaterial}
                      castShadow
                      receiveShadow
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectColumn(ci);
                      }}
                      onPointerOver={(e) => {
                        e.stopPropagation();
                        document.body.style.cursor = 'pointer';
                      }}
                      onPointerOut={() => {
                        document.body.style.cursor = 'auto';
                      }}
                    >
                      <boxGeometry args={[zw, zh, depth]} />
                    </mesh>
                    {showLabel && (
                      <Html
                        position={[cx, cy, depth / 2 + 0.02]}
                        center
                        zIndexRange={[10, 0]}
                        style={{ pointerEvents: 'none' }}
                      >
                        <div className="zone-label" aria-hidden="true">
                          {tz ? `${fmt(tz.width)} × ${fmt(tz.height)}` : ''}
                        </div>
                      </Html>
                    )}
                  </group>
                );
              })}

              {/* Horizontal rails between this column's rows. */}
              {col.zones.slice(0, -1).map((zone, zi) => (
                <mesh
                  key={`rail-${zi}`}
                  position={[colCenterX, toY(zone.y) - T / 2, 0.01]}
                  material={frameMaterial}
                  castShadow
                >
                  <boxGeometry args={[Math.max(col.width * scale, 0.001), T, depth + 0.02]} />
                </mesh>
              ))}

              {/* Selection: designed Edges outline + glow pass (P0-2). */}
              {isSelected && (
                <mesh position={[colCenterX, 0, 0]}>
                  <boxGeometry
                    args={[Math.max(col.width * scale, 0.01) + 0.035, H + 0.035, depth + 0.05]}
                  />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                  <Edges color="#ffb454" />
                  <Edges scale={1.045} color="#ffb454" transparent opacity={0.35} />
                </mesh>
              )}
            </group>
          );
        })}

        {/* Vertical posts between columns. */}
        {a.columns.slice(0, -1).map((col, ci) => (
          <mesh
            key={`post-${ci}`}
            position={[toX(col.x + col.width) + T / 2, 0, 0.01]}
            material={frameMaterial}
            castShadow
          >
            <boxGeometry args={[T, H, depth + 0.02]} />
          </mesh>
        ))}

        {/* Overall dimension captions. */}
        <Html position={[0, -H / 2 - 0.32, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className="dim-label" aria-hidden="true">
            ↔ {fmt(design.width)} mm
          </div>
        </Html>
        <Html
          position={[-W / 2 - 0.42, 0, 0]}
          center
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="dim-label dim-label--vertical" aria-hidden="true">
            ↔ {fmt(design.height)} mm
          </div>
        </Html>
      </group>

      <ContactShadows
        position={[0, -H / 2 - 0.16, 0]}
        opacity={0.55}
        scale={9}
        blur={2.4}
        far={2.2}
        color="#000000"
      />
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function Scene({ design, layout, finish, onSelectColumn }: SceneProps) {
  const woodTexture = useMemo(() => makeWoodTexture(finish), [finish]);
  const panelMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: woodTexture,
        roughness: finish.roughness,
        metalness: 0.05,
      }),
    [woodTexture, finish],
  );
  // Selected column's panels get an emissive lift instead of a wireframe cage.
  const selectedPanelMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: woodTexture,
        roughness: finish.roughness,
        metalness: 0.05,
        emissive: new THREE.Color('#e0a458'),
        emissiveIntensity: 0.22,
      }),
    [woodTexture, finish],
  );
  const frameMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: finish.frame, roughness: 0.5, metalness: 0.25 }),
    [finish],
  );
  const backMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#211a13', roughness: 0.9 }),
    [],
  );

  // Dispose GPU resources when a finish change replaces them (P2-4 hygiene).
  useEffect(() => () => woodTexture.dispose(), [woodTexture]);
  useEffect(
    () => () => {
      panelMaterial.dispose();
      selectedPanelMaterial.dispose();
    },
    [panelMaterial, selectedPanelMaterial],
  );
  useEffect(() => () => frameMaterial.dispose(), [frameMaterial]);
  useEffect(() => () => backMaterial.dispose(), [backMaterial]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [2.6, 1.6, 4.6], fov: 42 }}
      style={{
        background:
          'radial-gradient(1200px 700px at 50% 30%, #2b2118 0%, #171310 55%, #100d0a 100%)',
      }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-5, 3, -2]} intensity={0.35} color="#ffd9a0" />

      <AnimatedArticle
        design={design}
        layout={layout}
        panelMaterial={panelMaterial}
        selectedPanelMaterial={selectedPanelMaterial}
        frameMaterial={frameMaterial}
        backMaterial={backMaterial}
        onSelectColumn={onSelectColumn}
      />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={2}
        maxDistance={10}
        maxPolarAngle={Math.PI * 0.62}
      />
    </Canvas>
  );
}
