# Zoning Studio — 3D Partition & Division Logic

**By Hussein Bouik**

An interactive portfolio showcase of 3D product-configurator logic: design a
partition wall or cabinet-style article, divide it with a real
**linear-division formula**, watch every zone resize live in 3D, and export
the finished article as JSON.

Everything dimensional in the app is computed by Hussein's own
linear-division engine — no hard-coded sizes anywhere.

## What it does

- **3D article view** (React Three Fiber): a framed partition/cabinet front
  rendered from pure geometry — panels, vertical posts and horizontal rails —
  with orbit controls, live per-zone dimension labels (`width × height` in
  mm) and overall width/height captions.
- **Real division controls**
  - Article width / height sliders (mm) and panel/divider thickness.
  - A **vertical linear-division formula** for the width, with equal-division
    shortcuts, add/remove-zone buttons and presets.
  - Click any column in 3D to select it, then divide its **height** with its
    own row formula and row stepper.
  - Wood-finish picker (Natural Oak, Smoked Walnut, Nordic White, Graphite
    Ebony) using a procedural canvas wood texture — no image assets.
- **Export JSON**: the designed article — overall dimensions, finish, the
  formulas used, and every zone with its computed width, height and position
  — with Copy and Download buttons.
- **How it works**: a plain-language walkthrough of the engine pipeline with
  live-computed examples.

## The logic

The engine re-creates the linear-division behaviour of professional
woodworking CAD/CAM configurators (EMOS / iMOS style). A division is written
as colon-separated sections:

| Formula | Meaning |
| --- | --- |
| `1:2:1` | Pure ratios — free space is split in proportion. |
| `100mm:1:100mm` | Absolute mm sections are taken first; ratio sections absorb the rest. |
| `50mm:1:1:50mm` | Fixed edge rails with equal ratio zones between them. |
| `200mm:2:1:200mm` | Absolutes and ratios mixed freely. |

Pipeline: **Scanner** tokenises the formula → **Parser** builds an AST of
sections and expressions → **Evaluator** resolves each section to an absolute
mm value or a ratio weight → **Calculator** subtracts divider thickness and
absolute sections from the total length, then distributes the remainder
across the ratio sections. The engine returns *clear openings*, so
`sum(zones) + (zones − 1) × thickness = total length`, exactly.

Zoning Studio runs the engine twice — once across the width to create
columns, then once down the height inside each column — turning a 1D
division rule into a full 2D partition layout.

## Project structure

```
src/
  engine/            Hussein's linear-zone-divider engine, vendored verbatim
                     (Scanner, Parser, Evaluator, Calculator, processLinDiv,
                     section helpers, plus his jest test suite in __tests__/)
  lib/design.ts      Layout adapter: runs the engine for width + per-column
                     height, builds positions and the JSON export model
  lib/texture.ts     Procedural wood texture (canvas-generated)
  components/
    Scene.tsx        React Three Fiber 3D view
    Controls.tsx     Size, formula, rows and finish controls
    ExportPanel.tsx  JSON viewer with Copy / Download
    HowItWorks.tsx   Engine explainer with live examples
  App.tsx            Page shell — "Zoning Studio" by Hussein Bouik
```

### Vendoring notes

- The engine in `src/engine/` is copied **byte-for-byte** from Hussein
  Bouik's `linear-zone-divider` GitHub repository, with three disclosed
  exceptions:
  1. `utils/logger.ts`: the debug-logger singleton is disabled
     (`enabled: false`) — upstream it buffers every log line in memory and
     mirrors it to the console, which would flood an interactive app. No
     logic changes.
  2. `__tests__/*.test.ts`: import paths adjusted (`../src/X` → `../X`) to
     match the vendored folder layout. Test bodies untouched.
  3. `jest.config.cjs` lives at the project root (adapted from his original
     `jest.config.js`) and points at the vendored copy.
- The other two experiment repos (`zoning-imos-logic-app`,
  `wall-zoning-demo`) informed the concept — a nested, formula-driven zoned
  wall rendered in 3D — but their UI code was Create React App / rollup era
  and was **not** copied; the interface here is written fresh.

### A note on the engine's test suite

Hussein's library is a work-in-progress refactor, and its checked-in jest
suite does not fully pass against its checked-in source — this is true
upstream, not a vendoring artefact (the vendored files are byte-identical;
his Scanner suite passes completely). Current status when vendored:

- ✅ `Scanner.test.ts` — all passing
- ❌ 48 of 70 engine tests fail upstream, in three groups:
  - repetition groups (`2{1:2}`) — the current Parser build rejects `{` in
    section position;
  - `n*…` spreads and `a+b` binary-expression sections — the current
    Calculator build only distributes space to plain ratio sections;
  - DimRef edge-reference cases — expected zone *ordering* differs from
    what the current `processLinDiv` build returns.
- ✅ The app's own layout tests (`src/lib/design.test.ts`, 6 tests) pass.

Zoning Studio's UI deliberately only surfaces formula features the current
engine computes correctly (ratios and absolute mm sections, nested per
column) — every preset in the app was verified against the engine, and
invalid formulas surface the engine's own error message instead of
breaking the layout.

## Run it

```bash
npm install
npm run dev        # development server
npm run build      # production build (vite build)
npm test           # jest — engine suite (vendored) + layout tests
```

## Tech stack

React 18 · TypeScript · Vite · Three.js · React Three Fiber · drei ·
Jest/ts-jest for the engine tests.

## Author

**Hussein Bouik** — software engineer (.NET / React / Three.js) specialising
in 3D product-configurator logic: linear division, zoning, dimension
calculation and JSON export for made-to-measure articles.
