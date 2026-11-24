import { useEffect, useRef, useState } from 'react';
import { FINISHES, equalFormula, splitTopLevel, type ArticleLayout, type Design } from '../lib/design';

interface ControlsProps {
  design: Design;
  layout: ArticleLayout;
  onChange: (patch: Partial<Design>) => void;
  onColumnChange: (index: number, rowFormula: string) => void;
}

interface Preset {
  /** Plain-English outcome — the front door. */
  label: string;
  /** The formula itself, shown small beneath the label. */
  formula: string;
}

const VERTICAL_PRESETS: Preset[] = [
  { label: 'Middle twice as wide', formula: '1:2:1' },
  { label: 'Edges twice as wide', formula: '2:1:2' },
  { label: 'Fixed 100mm edges, flexible centre', formula: '100mm:1:100mm' },
  { label: 'Fixed 50mm edges, two equal middles', formula: '50mm:1:1:50mm' },
  { label: 'Fixed 200mm centre panel', formula: '1:200mm:1' },
  { label: 'Fixed 200mm edges, 2-to-1 middle', formula: '200mm:2:1:200mm' },
];

const ROW_PRESETS: Preset[] = [
  { label: 'Single panel', formula: '1' },
  { label: 'Middle row double height', formula: '1:2:1' },
  { label: 'Fixed 60mm top & bottom', formula: '60mm:1:60mm' },
  { label: 'Fixed 80mm edges, equal middles', formula: '80mm:1:1:80mm' },
];

const normalise = (f: string) => f.replace(/\s+/g, '');

/** Plain-English description of a division, e.g. "narrow · wide · narrow". */
function describeDivision(sizes: number[]): string {
  if (sizes.length === 0) return '';
  const min = Math.min(...sizes);
  const max = Math.max(...sizes);
  if (max - min < 1) return sizes.length === 1 ? 'single section' : `${sizes.length} equal sections`;
  return sizes
    .map((s) => {
      if (s <= min * 1.15) return 'narrow';
      if (s >= max * 0.85) return 'wide';
      return 'medium';
    })
    .join(' · ');
}

/* ------------------------------------------------------------------ */
/* Formula editor: preset-led, with the raw formula demoted to an      */
/* "Advanced" layer. Typing edits a local draft; the value commits     */
/* debounced (or on blur / Enter) so errors don't flash mid-keystroke. */
/* ------------------------------------------------------------------ */

interface FormulaEditorProps {
  id: string;
  value: string;
  error?: string;
  onCommit: (formula: string) => void;
}

function FormulaEditor({ id, value, error, onCommit }: FormulaEditorProps) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  // Keep the draft in sync with external changes (preset clicks, steppers)
  // without clobbering text the user is actively typing.
  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  // An error can only be fixed in the editor — open the layer when one lands.
  useEffect(() => {
    if (error) setOpen(true);
  }, [error]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const type = (text: string) => {
    setDraft(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onCommit(text), 450);
  };

  const commitNow = (text: string) => {
    window.clearTimeout(timer.current);
    onCommit(text);
  };

  return (
    <div className="formula-editor">
      <button
        type="button"
        className="advanced-toggle"
        aria-expanded={open}
        aria-controls={`${id}-body`}
        onClick={() => setOpen((o) => !o)}
      >
        Advanced: edit formula <span aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div id={`${id}-body`} className="advanced-body">
          <input
            id={id}
            type="text"
            className="formula-input"
            value={draft}
            spellCheck={false}
            aria-label="Division formula"
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              commitNow(draft);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            onChange={(e) => type(e.target.value)}
          />
          <p className="syntax-hint">
            Sections split by <code>:</code> — each is a ratio (<code>2</code>) or a fixed size (
            <code>200mm</code>). e.g. <code>100mm:1:100mm</code>
          </p>
        </div>
      )}
      {error && <p className="formula-error">⚠ {error}</p>}
    </div>
  );
}

function PresetChips({
  presets,
  current,
  onPick,
}: {
  presets: Preset[];
  current: string;
  onPick: (formula: string) => void;
}) {
  return (
    <div className="preset-grid">
      {presets.map((p) => {
        const active = normalise(p.formula) === normalise(current);
        return (
          <button
            key={p.formula + p.label}
            type="button"
            className={`preset ${active ? 'preset--active' : ''}`}
            aria-pressed={active}
            onClick={() => onPick(p.formula)}
          >
            <span className="preset-label">{p.label}</span>
            <span className="preset-formula">{p.formula}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

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

  const columnWidths = layout.columns.map((c) => c.width);
  const rowHeights = selected && !selected.error ? selected.zones.map((z) => z.height) : [];

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
        <h3>Columns — divide the width</h3>
        <PresetChips presets={VERTICAL_PRESETS} current={design.verticalFormula} onPick={setVerticalFormula} />
        <div className="row-between">
          <div className="chip-row" aria-label="Equal divisions">
            {[2, 3, 4, 5].map((n) => {
              const active = normalise(design.verticalFormula) === equalFormula(n);
              return (
                <button
                  key={n}
                  type="button"
                  className={`chip ${active ? 'chip--active' : ''}`}
                  aria-pressed={active}
                  onClick={() => setVerticalFormula(equalFormula(n))}
                >
                  {n} equal
                </button>
              );
            })}
          </div>
          <div className="stepper">
            <button type="button" onClick={removeZone} disabled={sections.length <= 1} title="Remove last zone" aria-label="Remove last zone">
              −
            </button>
            <span>{sections.length} zones</span>
            <button type="button" onClick={addZone} title="Add a zone" aria-label="Add a zone">
              +
            </button>
          </div>
        </div>
        {!layout.error && (
          <>
            <p className="readout">
              {layout.columns.length} column{layout.columns.length === 1 ? '' : 's'}:{' '}
              {describeDivision(columnWidths)}
            </p>
            <p className="formula-nums">widths {columnWidths.join(' · ')} mm</p>
          </>
        )}
        <FormulaEditor
          id="vertical-formula"
          value={design.verticalFormula}
          error={layout.error}
          onCommit={setVerticalFormula}
        />
      </section>

      <section className="control-group">
        <h3>Rows — divide a column&rsquo;s height</h3>
        <div className="segmented" role="radiogroup" aria-label="Select a column to edit">
          {layout.columns.map((c) => {
            const active = design.selectedColumn === c.index;
            return (
              <button
                key={c.index}
                type="button"
                role="radio"
                aria-checked={active}
                className={`segment ${active ? 'segment--active' : ''}`}
                onClick={() => onChange({ selectedColumn: c.index })}
              >
                {c.index + 1}
              </button>
            );
          })}
        </div>
        <p className="hint" aria-live="polite">
          Column {design.selectedColumn + 1} selected — or click a column in the 3D view.
        </p>
        <PresetChips
          presets={ROW_PRESETS}
          current={selectedSpec.rowFormula}
          onPick={(f) => onColumnChange(design.selectedColumn, f)}
        />
        <div className="row-between">
          <div className="stepper">
            <button type="button" onClick={() => setRows(rowCount - 1)} disabled={rowCount <= 1} aria-label="Remove a row">
              −
            </button>
            <span>
              {rowCount} row{rowCount === 1 ? '' : 's'}
            </span>
            <button type="button" onClick={() => setRows(rowCount + 1)} disabled={rowCount >= 8} aria-label="Add a row">
              +
            </button>
          </div>
        </div>
        {!selected?.error && rowHeights.length > 0 && (
          <>
            <p className="readout">
              {rowHeights.length} row{rowHeights.length === 1 ? '' : 's'}: {describeDivision(rowHeights)}
            </p>
            <p className="formula-nums">heights {rowHeights.join(' · ')} mm</p>
          </>
        )}
        <FormulaEditor
          id="row-formula"
          value={selectedSpec.rowFormula}
          error={selected?.error}
          onCommit={(f) => onColumnChange(design.selectedColumn, f)}
        />
      </section>

      <section className="control-group">
        <h3>Wood finish</h3>
        <div className="finish-row">
          {FINISHES.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`finish ${design.finishId === f.id ? 'finish--active' : ''}`}
              aria-pressed={design.finishId === f.id}
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
