import { processLindiv } from '../engine/processLinDiv';
import { EvaluationErrors } from '../engine/types';

/**
 * Zoning Studio design model.
 *
 * Everything dimensional in this app is computed by Hussein Bouik's own
 * linear-division engine (`src/engine`, vendored from his `linear-zone-divider`
 * library). This module only adapts the engine's 1D output (an array of clear
 * openings in millimetres) into a 2D article layout:
 *
 *   - the vertical formula divides the article WIDTH into columns;
 *   - each column then runs the engine again on the article HEIGHT with its
 *     own row formula, producing that column's stacked zones.
 *
 * The engine returns *clear openings*: divider/panel thickness sits between
 * zones, so sum(zones) + (count - 1) * thickness === total length.
 */

export interface ColumnDesign {
  /** Linear-division formula dividing the article height inside this column. */
  rowFormula: string;
}

export interface Design {
  /** Overall article width in mm. */
  width: number;
  /** Overall article height in mm. */
  height: number;
  /** Panel / divider thickness in mm (the engine's dividerThickness). */
  thickness: number;
  /** Linear-division formula dividing the width into columns. */
  verticalFormula: string;
  /** One entry per column produced by the vertical formula. */
  columns: ColumnDesign[];
  /** Selected wood finish id. */
  finishId: string;
  /** Index of the column currently selected for row editing. */
  selectedColumn: number;
}

export interface ZoneLayout {
  /** Width of the clear opening in mm. */
  width: number;
  /** Height of the clear opening in mm. */
  height: number;
  /** Distance from the article's left edge to this zone's left edge, mm. */
  x: number;
  /** Distance from the article's bottom edge to this zone's bottom edge, mm. */
  y: number;
}

export interface ColumnLayout {
  index: number;
  /** Clear opening width of this column in mm. */
  width: number;
  /** Distance from the article's left edge to this column's left edge, mm. */
  x: number;
  rowFormula: string;
  zones: ZoneLayout[];
  error?: string;
}

export interface ArticleLayout {
  columns: ColumnLayout[];
  /** Error from the vertical formula, if any. */
  error?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Run the engine and normalise its result to { values } or { error }. */
function runEngine(
  formula: string,
  totalLength: number,
  dividerThickness: number,
): { values: number[] } | { error: string } {
  const result = processLindiv(formula, totalLength, dividerThickness);
  if (result instanceof EvaluationErrors) {
    return { error: result.message.replace(/^Evaluation Error:\s*/, '') };
  }
  if (!Array.isArray(result)) {
    return { error: 'The engine did not return a division.' };
  }
  return { values: result.map(round2) };
}

/** Compute the full 2D layout for a design. Never throws. */
export function computeLayout(design: Design): ArticleLayout {
  const vertical = runEngine(design.verticalFormula, design.width, design.thickness);
  if ('error' in vertical) {
    return { columns: [], error: vertical.error };
  }

  const columns: ColumnLayout[] = [];
  let x = 0;
  vertical.values.forEach((colWidth, i) => {
    const spec = design.columns[i] ?? { rowFormula: '1' };
    const horizontal = runEngine(spec.rowFormula, design.height, design.thickness);
    const zones: ZoneLayout[] = [];
    let error: string | undefined;
    if ('error' in horizontal) {
      error = horizontal.error;
    } else {
      // Engine works top-down in formula order; we lay out bottom-up so the
      // first formula section is the TOP zone, like a real elevation drawing.
      let y = design.height;
      horizontal.values.forEach((h) => {
        y -= h;
        zones.push({ width: colWidth, height: h, x, y: round2(y) });
        y -= design.thickness;
      });
    }
    columns.push({ index: i, width: colWidth, x: round2(x), rowFormula: spec.rowFormula, zones, error });
    x += colWidth + design.thickness;
  });

  return { columns };
}

/** Build an equal-ratio formula with `count` sections, e.g. 3 -> "1:1:1". */
export function equalFormula(count: number): string {
  return Array.from({ length: Math.max(1, count) }, () => '1').join(':');
}

/**
 * Split a formula into its top-level sections (colons outside of {}, ()
 * and [] groups) so sections can be added/removed safely even when the
 * formula uses repetition groups such as 2{1:2}.
 */
export function splitTopLevel(formula: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of formula) {
    if (ch === '{' || ch === '(' || ch === '[') depth++;
    if (ch === '}' || ch === ')' || ch === ']') depth--;
    if (ch === ':' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/** Keep the per-column specs in sync with however many zones a formula makes. */
export function syncColumns(columns: ColumnDesign[], count: number): ColumnDesign[] {
  const next = columns.slice(0, count);
  while (next.length < count) next.push({ rowFormula: '1' });
  return next;
}

/* ------------------------------------------------------------------ */
/* Wood finishes                                                       */
/* ------------------------------------------------------------------ */

export interface Finish {
  id: string;
  name: string;
  /** Base panel colour. */
  base: string;
  /** Darker grain streak colour used by the procedural texture. */
  grain: string;
  /** Frame / divider colour. */
  frame: string;
  roughness: number;
  swatch: string;
}

export const FINISHES: Finish[] = [
  { id: 'oak', name: 'Natural Oak', base: '#c49a63', grain: '#a67c4a', frame: '#4a3826', roughness: 0.55, swatch: '#c49a63' },
  { id: 'walnut', name: 'Smoked Walnut', base: '#7a5138', grain: '#5d3c27', frame: '#2e2019', roughness: 0.6, swatch: '#7a5138' },
  { id: 'nordic', name: 'Nordic White', base: '#e9e2d4', grain: '#cfc3ab', frame: '#5c554b', roughness: 0.5, swatch: '#e9e2d4' },
  { id: 'ebony', name: 'Graphite Ebony', base: '#3b3631', grain: '#292522', frame: '#17140f', roughness: 0.45, swatch: '#3b3631' },
];

/* ------------------------------------------------------------------ */
/* JSON export                                                         */
/* ------------------------------------------------------------------ */

export interface ArticleExport {
  article: {
    name: string;
    designedWith: string;
    author: string;
    unit: 'mm';
    width: number;
    height: number;
    panelThickness: number;
    finish: string;
    verticalDivisionFormula: string;
    columns: Array<{
      index: number;
      x: number;
      width: number;
      rowDivisionFormula: string;
      zones: Array<{
        index: number;
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
    }>;
  };
}

export function buildExport(design: Design, layout: ArticleLayout): ArticleExport {
  const finish = FINISHES.find((f) => f.id === design.finishId) ?? FINISHES[0];
  return {
    article: {
      name: 'Partition Article',
      designedWith: 'Zoning Studio — linear-division engine by Hussein Bouik',
      author: 'Hussein Bouik',
      unit: 'mm',
      width: design.width,
      height: design.height,
      panelThickness: design.thickness,
      finish: finish.name,
      verticalDivisionFormula: design.verticalFormula,
      columns: layout.columns.map((col) => ({
        index: col.index,
        x: col.x,
        width: col.width,
        rowDivisionFormula: col.rowFormula,
        zones: col.zones.map((z, zi) => ({
          index: zi,
          x: z.x,
          y: z.y,
          width: z.width,
          height: z.height,
        })),
      })),
    },
  };
}
