import { useMemo } from 'react';
import { processLindiv } from '../engine/processLinDiv';
import { EvaluationErrors } from '../engine/types';

interface Example {
  formula: string;
  total: number;
  thickness: number;
  note: string;
}

const EXAMPLES: Example[] = [
  { formula: '1:2:1', total: 1200, thickness: 18, note: 'Pure ratios — the free space is split in proportion.' },
  { formula: '100mm:1:100mm', total: 1200, thickness: 18, note: 'Absolute mm sections are taken first; the ratio section absorbs the rest.' },
  { formula: '50mm:1:1:50mm', total: 1800, thickness: 18, note: 'Fixed edge rails with two equal ratio zones between them — a classic partition elevation.' },
  { formula: '200mm:2:1:200mm', total: 1800, thickness: 18, note: 'Absolutes and ratios mixed freely: fixed 200 mm ends, the middle split 2-to-1.' },
];

function runExample(ex: Example): string {
  const result = processLindiv(ex.formula, ex.total, ex.thickness);
  if (result instanceof EvaluationErrors) return result.message;
  return `[ ${result.map((n) => Math.round(n * 100) / 100).join(', ')} ]`;
}

export default function HowItWorks() {
  const results = useMemo(() => EXAMPLES.map(runExample), []);
  return (
    <section className="panel how">
      <h2>How the division logic works</h2>
      <p>
        Every dimension in the studio above is calculated by a <strong>linear-division engine</strong> written by
        Hussein Bouik — the same kind of logic that drives professional woodworking CAD/CAM configurators
        (EMOS / iMOS style). You describe how a length should be divided as a compact formula, and the engine
        turns it into exact millimetre sizes for each zone.
      </p>
      <ol className="pipeline">
        <li>
          <strong>Scanner</strong> tokenises the formula — numbers, <code>mm</code> units, variables, functions,
          braces and colons.
        </li>
        <li>
          <strong>Parser</strong> builds an abstract syntax tree of sections, repetitions and expressions.
        </li>
        <li>
          <strong>Evaluator</strong> resolves each section to either an absolute millimetre value or a ratio
          weight — the formula language also defines variables, functions and repetition groups, mirroring the
          iMOS IX behaviour the engine re-creates.
        </li>
        <li>
          <strong>Calculator</strong> subtracts the divider thickness and the absolute sections from the total
          length, then distributes what remains across the ratio sections — exactly, to two decimals.
        </li>
      </ol>
      <p>
        Zoning Studio runs the engine twice: once across the width to create columns, then once down the height
        inside each column. That nesting is what turns a 1D division rule into a full 2D partition layout.
      </p>
      <div className="examples">
        {EXAMPLES.map((ex, i) => (
          <div className="example" key={ex.formula}>
            <code className="example-formula">
              processLindiv(&quot;{ex.formula}&quot;, {ex.total}, {ex.thickness})
            </code>
            <code className="example-result">→ {results[i]} mm</code>
            <span className="example-note">{ex.note}</span>
          </div>
        ))}
      </div>
      <p className="how-credit">
        Engine, formula language and zoning concept: original work by <strong>Hussein Bouik</strong>, from his
        configurator-logic experiments. This showcase reuses that engine code directly — open the Export panel
        to see the article it produces as JSON.
      </p>
    </section>
  );
}
