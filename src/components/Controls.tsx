import { FINISHES, equalFormula, splitTopLevel, type ArticleLayout, type Design } from '../lib/design';

interface ControlsProps {
  design: Design;
  layout: ArticleLayout;
  onChange: (patch: Partial<Design>) => void;
  onColumnChange: (index: number, rowFormula: string) => void;
}

const VERTICAL_PRESETS: Array<{ label: string; formula: string }> = [
  { label: '1 : 2 : 1', formula: '1:2:1' },
  { label: '2 : 1 : 2', formula: '2:1:2' },
  { label: '100mm : 1 : 100mm', formula: '100mm:1:100mm' },
  { label: '50mm : 1 : 1 : 50mm', formula: '50mm:1:1:50mm' },
  { label: '1 : 200mm : 1', formula: '1:200mm:1' },
  { label: '200mm : 2 : 1 : 200mm', formula: '200mm:2:1:200mm' },
];

const ROW_PRESETS: Array<{ label: string; formula: string }> = [
  { label: 'Single', formula: '1' },
  { label: '1 : 2 : 1', formula: '1:2:1' },
  { label: '60mm : 1 : 60mm', formula: '60mm:1:60mm' },
  { label: '80mm : 1 : 1 : 80mm', formula: '80mm:1:1:80mm' },
];

export default function Controls({ design, layout, onChange, onColumnChange }: ControlsProps) {
  const sections = splitTopLevel(design.verticalFormula);
  const selected = layout.columns[design.selectedColumn];
  const selectedSpec = design.columns[design.selectedColumn] ?? { rowFormula: '1' };
  const rowCount = selected?.zones.length ?? 1;

  const setVerticalFormula = (formula: string) => onChange({ verticalFormula: formula });

  const addZone = () => setVerticalFormula(`${design.verticalFormula}:1`);
  const removeZone = () => {
    if (sections.length <= 1) return;
    setVerticalFormula(sections.slice(0, -1).join(':'));
  };

  const setRows = (count: number) => {
    const clamped = Math.min(8, Math.max(1, count));
    onColumnChange(design.selectedColumn, equalFormula(clamped));
  };

  return (
    <div className="controls">
      <section className="control-group">
        <h3>Article size</h3>
        <label className="field">
          <span>
            Width <strong>{design.width} mm</strong>
          </span>
          <input
            type="range"
            min={600}
            max={3000}
            step={10}
            value={design.width}
            onChange={(e) => onChange({ width: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>
            Height <strong>{design.height} mm</strong>
          </span>
          <input
            type="range"
            min={800}
            max={2800}
            step={10}
            value={design.height}
            onChange={(e) => onChange({ height: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>
            Panel / divider thickness <strong>{design.thickness} mm</strong>
          </span>
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={design.thickness}
            onChange={(e) => onChange({ thickness: Number(e.target.value) })}
          />
        </label>
      </section>

      <section className="control-group">
        <h3>Vertical division — width</h3>
        <label className="field">
          <span>Linear-division formula</span>
          <input
            type="text"
            className="formula-input"
            value={design.verticalFormula}
            spellCheck={false}
            onChange={(e) => setVerticalFormula(e.target.value)}
          />
        </label>
        {layout.error ? (
          <p className="formula-error">⚠ {layout.error}</p>
        ) : (
          <p className="formula-ok">
            {layout.columns.length} column{layout.columns.length === 1 ? '' : 's'} · widths{' '}
            {layout.columns.map((c) => c.width).join(' · ')} mm
          </p>
        )}
        <div className="row-between">
          <div className="chip-row" aria-label="Equal divisions">
            {[2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className="chip" onClick={() => setVerticalFormula(equalFormula(n))}>
                {n} equal
              </button>
            ))}
          </div>
          <div className="stepper">
            <button type="button" onClick={removeZone} disabled={sections.length <= 1} title="Remove last zone">
              −
            </button>
            <span>{sections.length} zones</span>
            <button type="button" onClick={addZone} title="Add a zone">
              +
            </button>
          </div>
        </div>
        <div className="chip-row">
          {VERTICAL_PRESETS.map((p) => (
            <button key={p.label} type="button" className="chip chip--ghost" onClick={() => setVerticalFormula(p.formula)}>
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section className="control-group">
        <h3>Rows in column {design.selectedColumn + 1}</h3>
        <p className="hint">Click any column in the 3D view to select it, then divide its height.</p>
        <div className="row-between">
          <div className="stepper">
            <button type="button" onClick={() => setRows(rowCount - 1)} disabled={rowCount <= 1}>
              −
            </button>
            <span>{rowCount} row{rowCount === 1 ? '' : 's'}</span>
            <button type="button" onClick={() => setRows(rowCount + 1)} disabled={rowCount >= 8}>
              +
            </button>
          </div>
          {selected && !selected.error && (
            <span className="formula-ok">heights {selected.zones.map((z) => z.height).join(' · ')} mm</span>
          )}
        </div>
        <label className="field">
          <span>Row formula (height)</span>
          <input
            type="text"
            className="formula-input"
            value={selectedSpec.rowFormula}
            spellCheck={false}
            onChange={(e) => onColumnChange(design.selectedColumn, e.target.value)}
          />
        </label>
        {selected?.error && <p className="formula-error">⚠ {selected.error}</p>}
        <div className="chip-row">
          {ROW_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="chip chip--ghost"
              onClick={() => onColumnChange(design.selectedColumn, p.formula)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section className="control-group">
        <h3>Wood finish</h3>
        <div className="finish-row">
          {FINISHES.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`finish ${design.finishId === f.id ? 'finish--active' : ''}`}
              onClick={() => onChange({ finishId: f.id })}
            >
              <span className="finish-swatch" style={{ background: f.swatch }} />
              {f.name}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
