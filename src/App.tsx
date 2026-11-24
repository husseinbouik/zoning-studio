import { useEffect, useMemo, useState } from 'react';
import Scene from './components/Scene';
import Controls from './components/Controls';
import ExportPanel from './components/ExportPanel';
import HowItWorks from './components/HowItWorks';
import {
  FINISHES,
  buildExport,
  computeLayout,
  syncColumns,
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

export default function App() {
  const [design, setDesign] = useState<Design>(INITIAL_DESIGN);

  const layout = useMemo(() => computeLayout(design), [design]);

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
        </div>
      </header>

      <p className="intro">
        Design a partition wall or cabinet front, divide it with a real linear-division formula, watch the
        zones resize in 3D — then export the finished article as JSON. Every millimetre below is computed live
        by the division engine, not hard-coded.
      </p>

      <main className="studio">
        <section className="canvas-wrap">
          <Scene
            design={design}
            layout={layout}
            finish={finish}
            onSelectColumn={(i) => patch({ selectedColumn: i })}
          />
          <div className="canvas-hint">Drag to orbit · Scroll to zoom · Click a column to edit its rows</div>
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
        Zoning Studio — a portfolio showcase of 3D product-configurator logic (linear division, zoning,
        dimension calculation, JSON export) by Hussein Bouik. Built with React, Three.js and his own
        TypeScript division engine.
      </footer>
    </div>
  );
}
