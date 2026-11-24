import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls } from '@react-three/drei';
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

export default function Scene({ design, layout, finish, onSelectColumn }: SceneProps) {
  // Scene units: fit the article inside ~3.4 units on its longest side.
  const scale = 3.4 / Math.max(design.width, design.height);
  const W = design.width * scale;
  const H = design.height * scale;
  const T = Math.max(design.thickness * scale, 0.012);
  const depth = 0.16;

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
  const frameMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: finish.frame, roughness: 0.5, metalness: 0.25 }),
    [finish],
  );
  const backMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#211a13', roughness: 0.9 }),
    [],
  );
  const highlightMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ffb454', wireframe: true, transparent: true, opacity: 0.9 }),
    [],
  );

  const toX = (mm: number) => -W / 2 + mm * scale;
  const toY = (mm: number) => -H / 2 + mm * scale;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [2.6, 1.6, 4.6], fov: 42 }}
      style={{ background: 'radial-gradient(1200px 700px at 50% 30%, #2b2118 0%, #171310 55%, #100d0a 100%)' }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-5, 3, -2]} intensity={0.35} color="#ffd9a0" />

      <group position={[0, 0.12, 0]}>
        {/* Backing board — exactly the article's overall size. */}
        <mesh position={[0, 0, -depth / 2 - 0.015]} material={backMaterial} receiveShadow>
          <boxGeometry args={[W, H, 0.03]} />
        </mesh>

        {/* Zones (panels) and the dividers between them. */}
        {layout.columns.map((col) => {
          const colCenterX = toX(col.x + col.width / 2);
          const isSelected = design.selectedColumn === col.index;
          return (
            <group key={col.index}>
              {col.zones.map((zone, zi) => {
                const zw = Math.max(zone.width * scale, 0.001);
                const zh = Math.max(zone.height * scale, 0.001);
                const cx = toX(zone.x + zone.width / 2);
                const cy = toY(zone.y + zone.height / 2);
                const showLabel = zw > 0.42 && zh > 0.24;
                return (
                  <group key={zi}>
                    <mesh
                      position={[cx, cy, 0]}
                      material={panelMaterial}
                      castShadow
                      receiveShadow
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectColumn(col.index);
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
                      <Html position={[cx, cy, depth / 2 + 0.02]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
                        <div className="zone-label">
                          {fmt(zone.width)} × {fmt(zone.height)}
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

              {/* Selection outline around the whole column. */}
              {isSelected && (
                <mesh position={[colCenterX, 0, 0]} material={highlightMaterial}>
                  <boxGeometry args={[Math.max(col.width * scale, 0.01) + 0.03, H + 0.03, depth + 0.05]} />
                </mesh>
              )}
            </group>
          );
        })}

        {/* Vertical posts between columns. */}
        {layout.columns.slice(0, -1).map((col) => (
          <mesh
            key={`post-${col.index}`}
            position={[toX(col.x + col.width) + T / 2, 0, 0.01]}
            material={frameMaterial}
            castShadow
          >
            <boxGeometry args={[T, H, depth + 0.02]} />
          </mesh>
        ))}

        {/* Overall dimension captions. */}
        <Html position={[0, -H / 2 - 0.32, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className="dim-label">↔ {fmt(design.width)} mm</div>
        </Html>
        <Html position={[-W / 2 - 0.42, 0, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className="dim-label dim-label--vertical">↔ {fmt(design.height)} mm</div>
        </Html>
      </group>

      <ContactShadows position={[0, -H / 2 - 0.28, 0]} opacity={0.55} scale={9} blur={2.4} far={2.2} color="#000000" />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={2} maxDistance={10} maxPolarAngle={Math.PI * 0.62} />
    </Canvas>
  );
}
