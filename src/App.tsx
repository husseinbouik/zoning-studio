import { useEffect, useMemo, useRef, useState } from 'react';
import Scene from './components/Scene';
import Controls from './components/Controls';
import ExportPanel from './components/ExportPanel';
import HowItWorks from './components/HowItWorks';
import { LayoutFallback2D, SceneErrorBoundary, supportsWebGL } from './components/SceneFallback';
import {
  FINISHES,
  buildExport,
  computeLayout,
  syncColumns,
  type ArticleLayout,
  type Design,
} from './lib/design';

const INITIAL_DESIGN: Design = {
  width: 1800,
  height: 2100,
  thickness: 18,
  verticalFormula: '1:2:1',
  columns: [{ rowFormula: '1' }, { rowFormula: '1:1' }, { rowFormula: '1' }],
  finishId: 'oak',
  selectedColumn: 1,
};

/**
 * Embed mode (?embed=1): render ONLY the 3D scene — no header, no control
 * panels, no text overlays — for the portfolio card's playable frame.
 * Orbit + column interaction stay active; the model fills the frame.
 */
const EMBED =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('embed') === '1';

const LINKEDIN_URL = 'https://www.linkedin.com/in/hussein-bouik';
const GITHUB_URL = 'https://github.com/husseinbouik/zoning-studio';
const CV_URL = 'Hussein_Bouik_CV.pdf';

export default function App() {
  const [design, setDesign] = useState<Design>(INITIAL_DESIGN);
  const [webglOk] = useState<boolean>(() => supportsWebGL());

  const layout = useMemo(() => computeLayout(design), [design]);

  // Freeze on the last valid layout while a formula error is unresolved —
  // the 3D scene (and the 2D fallback) hold still instead of emptying.
  const lastValid = useRef<ArticleLayout>(layout);
  useEffect(() => {
    if (!layout.error) lastValid.current = layout;
  }, [layout]);
  const sceneLayout = layout.error ? lastValid.current : layout;

  // Keep one row-spec per column the formula actually produces.
  useEffect(() => {
    if (layout.error) return;
    if (design.columns.length !== layout.columns.length) {
      setDesign((d) => ({
        ...d,
        columns: syncColumns(d.columns, layout.columns.length),
        selectedColumn: Math.min(d.selectedColumn, Math.max(0, layout.columns.length - 1)),
      }));
    }
  }, [layout, design.columns.length]);

  const finish = FINISHES.find((f) => f.id === design.finishId) ?? FINISHES[0];

  const exportJson = useMemo(
    () => JSON.stringify(buildExport(design, layout), null, 2),
    [design, layout],
  );

  const patch = (p: Partial<Design>) => setDesign((d) => ({ ...d, ...p }));
  const patchColumn = (index: number, rowFormula: string) =>
    setDesign((d) => ({
      ...d,
      columns: d.columns.map((c, i) => (i === index ? { rowFormula } : c)),
    }));

  const selectedIdx = Math.min(design.selectedColumn, Math.max(0, sceneLayout.columns.length - 1));
  const designSummary =
    `A ${design.width} by ${design.height} millimetre partition in ${finish.name}, divided into ` +
    `${sceneLayout.columns.length} columns (${sceneLayout.columns.map((c) => c.width).join(', ')} mm wide). ` +
    `Column ${selectedIdx + 1} is selected.`;

  const fallback = <LayoutFallback2D design={design} layout={sceneLayout} />;

  if (EMBED) {
    return (
      <div className="embed-root">
        <section className="canvas-wrap embed-canvas" aria-label="3D article view">
          {webglOk ? (
            <SceneErrorBoundary fallback={fallback}>
              <Scene
                design={design}
                layout={sceneLayout}
                finish={finish}
                onSelectColumn={(i) => patch({ selectedColumn: i })}
              />
            </SceneErrorBoundary>
          ) : (
            fallback
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <h1>Zoning Studio</h1>
            <p className="tagline">3D Partition &amp; Division Logic</p>
          </div>
        </div>
        <div className="author">
          <span className="author-label">Configurator logic &amp; development</span>
          <span className="author-name">Hussein Bouik</span>
          <nav className="author-links" aria-label="Hussein Bouik elsewhere">
            <a className="link-btn" href={LINKEDIN_URL} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a className="link-btn" href={GITHUB_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="link-btn" href={CV_URL} target="_blank" rel="noreferrer">
              CV
            </a>
          </nav>
        </div>
      </header>

      <div className="intro">
        <p>
          Design a partition wall or cabinet front, divide it with a real linear-division formula,
          watch the zones resize in 3D — then export the finished article as JSON. Every millimetre
          below is computed live by the division engine, not hard-coded.
        </p>
        <p className="provenance">
          The engine was developed professionally for made-to-measure wood products — production
          configurator logic for cabinets, partitions and made-to-order articles.
        </p>
      </div>

      <main className="studio">
        <section className="canvas-wrap" aria-label="3D article view">
          {webglOk ? (
            <SceneErrorBoundary fallback={fallback}>
              <Scene
                design={design}
                layout={sceneLayout}
                finish={finish}
                onSelectColumn={(i) => patch({ selectedColumn: i })}
              />
            </SceneErrorBoundary>
          ) : (
            fallback
          )}
          <p id="design-summary" className="visually-hidden">
            {designSummary}
          </p>
          {webglOk && (
            <div className="canvas-hint">
              <span className="hint-mouse">Drag to orbit · Scroll to zoom · Click a column to edit its rows</span>
              <span className="hint-touch">Drag to orbit · Pinch to zoom · Tap a column to edit its rows</span>
            </div>
          )}
          <div className="column-chips" role="group" aria-label="Select a column">
            {sceneLayout.columns.map((c) => (
              <button
                key={c.index}
                type="button"
                className={`column-chip ${design.selectedColumn === c.index ? 'column-chip--active' : ''}`}
                aria-pressed={design.selectedColumn === c.index}
                aria-label={`Select column ${c.index + 1}`}
                onClick={() => patch({ selectedColumn: c.index })}
              >
                {c.index + 1}
              </button>
            ))}
            <span className="column-chips-label" aria-live="polite">
              Column {selectedIdx + 1} selected
            </span>
          </div>
          {layout.error && <div className="canvas-error">Division error: {layout.error}</div>}
        </section>
        <aside className="sidebar">
          <Controls design={design} layout={layout} onChange={patch} onColumnChange={patchColumn} />
        </aside>
      </main>

      <div className="lower-grid">
        <HowItWorks />
        <ExportPanel json={exportJson} />
      </div>

      <footer className="site-footer">
        <p>
          Zoning Studio — a portfolio showcase of 3D product-configurator logic (linear division,
          zoning, dimension calculation, JSON export) by Hussein Bouik. Built with React, Three.js
          and his own TypeScript division engine.
        </p>
        <p className="footer-cta">
          Work with Hussein:{' '}
          <a href={LINKEDIN_URL} target="_blank" rel="noreferrer">
            LinkedIn
          </a>{' '}
          ·{' '}
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            GitHub — engine source
          </a>{' '}
          ·{' '}
          <a href={CV_URL} target="_blank" rel="noreferrer">
            CV (PDF)
          </a>
        </p>
      </footer>
    </div>
  );
}
