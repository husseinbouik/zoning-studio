import { Component, type ReactNode } from 'react';
import { FINISHES, type ArticleLayout, type Design } from '../lib/design';

/** True when the browser can create a WebGL context at all. */
export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    );
  } catch {
    return false;
  }
}

interface BoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

/** Catches any render-time failure of the 3D scene and swaps in the fallback. */
export class SceneErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Keep the failure visible to developers; visitors get the 2D fallback.
    console.error('3D scene failed, showing 2D fallback:', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

interface FallbackProps {
  design: Design;
  layout: ArticleLayout;
}

/**
 * 2D elevation of the current design, drawn from the same millimetre layout
 * the 3D scene would render — shown when WebGL is unavailable or crashes.
 * The sidebar controls keep working, so the design stays fully editable.
 */
export function LayoutFallback2D({ design, layout }: FallbackProps) {
  const finish = FINISHES.find((f) => f.id === design.finishId) ?? FINISHES[0];
  const pad = Math.max(design.width, design.height) * 0.06;
  const viewW = design.width + pad * 2;
  const viewH = design.height + pad * 2;
  const flipY = (yMm: number, hMm: number) => design.height - yMm - hMm;

  return (
    <div className="fallback-2d" role="img" aria-label="2D elevation of the current design">
      <p className="fallback-note">
        The interactive 3D view needs WebGL, which this browser could not provide — here is the same
        design as a 2D elevation. All controls still work.
      </p>
      <svg
        viewBox={`${-pad} ${-pad} ${viewW} ${viewH}`}
        className="fallback-svg"
        aria-hidden="true"
        focusable="false"
      >
        <rect x={0} y={0} width={design.width} height={design.height} fill="#211a13" />
        {layout.columns.map((col) => (
          <g key={col.index}>
            {col.zones.map((zone, zi) => (
              <g key={zi}>
                <rect
                  x={zone.x}
                  y={flipY(zone.y, zone.height)}
                  width={zone.width}
                  height={zone.height}
                  fill={finish.base}
                  stroke={finish.frame}
                  strokeWidth={design.thickness / 2}
                />
                {zone.width > design.width * 0.14 && zone.height > design.height * 0.08 && (
                  <text
                    x={zone.x + zone.width / 2}
                    y={flipY(zone.y, zone.height) + zone.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fallback-zone-text"
                    fontSize={Math.max(design.height * 0.028, 26)}
                  >
                    {fmt(zone.width)} × {fmt(zone.height)}
                  </text>
                )}
              </g>
            ))}
            {design.selectedColumn === col.index && (
              <rect
                x={col.x - design.thickness / 2}
                y={-design.thickness / 2}
                width={col.width + design.thickness}
                height={design.height + design.thickness}
                fill="none"
                stroke="#ffb454"
                strokeWidth={Math.max(design.thickness / 1.5, 6)}
              />
            )}
          </g>
        ))}
      </svg>
      <p className="fallback-summary">
        {fmt(design.width)} × {fmt(design.height)} mm · {layout.columns.length} column
        {layout.columns.length === 1 ? '' : 's'} ({layout.columns.map((c) => fmt(c.width)).join(' · ')}{' '}
        mm) · column {Math.min(design.selectedColumn, Math.max(0, layout.columns.length - 1)) + 1}{' '}
        selected · finish: {finish.name}
      </p>
    </div>
  );
}
