import { buildExport, computeLayout, splitTopLevel, type Design } from './design';

const base: Design = {
  width: 1800,
  height: 2100,
  thickness: 18,
  verticalFormula: '1:2:1',
  columns: [{ rowFormula: '1' }, { rowFormula: '1:1' }, { rowFormula: '1' }],
  finishId: 'oak',
  selectedColumn: 1,
};

describe('computeLayout (adapter over the vendored linear-zone-divider engine)', () => {
  it('divides the width by ratio and accounts for divider thickness', () => {
    const layout = computeLayout(base);
    expect(layout.error).toBeUndefined();
    expect(layout.columns.map((c) => c.width)).toEqual([441, 882, 441]);
    const total =
      layout.columns.reduce((a, c) => a + c.width, 0) +
      (layout.columns.length - 1) * base.thickness;
    expect(total).toBe(base.width);
  });

  it('nests a second engine pass per column for the rows', () => {
    const layout = computeLayout(base);
    const middle = layout.columns[1];
    expect(middle.zones.map((z) => z.height)).toEqual([1041, 1041]);
    // Zones are laid out top-first: first zone touches the top edge.
    expect(middle.zones[0].y + middle.zones[0].height).toBe(base.height);
    expect(middle.zones[1].y).toBe(0);
  });

  it('honours absolute mm sections', () => {
    const layout = computeLayout({ ...base, verticalFormula: '100mm:1:100mm' });
    expect(layout.columns.map((c) => c.width)).toEqual([100, 1564, 100]);
  });

  it('surfaces engine errors instead of throwing', () => {
    const layout = computeLayout({ ...base, verticalFormula: '2{1:2}:1' });
    expect(layout.error).toBeTruthy();
    expect(layout.columns).toEqual([]);
  });
});

describe('splitTopLevel', () => {
  it('does not split inside repetition groups', () => {
    expect(splitTopLevel('2{1:2}:1')).toEqual(['2{1:2}', '1']);
    expect(splitTopLevel('1:2:1')).toEqual(['1', '2', '1']);
  });
});

describe('buildExport', () => {
  it('exports every zone with position and size', () => {
    const layout = computeLayout(base);
    const out = buildExport(base, layout);
    expect(out.article.width).toBe(1800);
    expect(out.article.columns).toHaveLength(3);
    expect(out.article.columns[1].zones).toHaveLength(2);
    expect(out.article.columns[1].zones[0]).toMatchObject({ width: 882, height: 1041, x: 459 });
  });
});
