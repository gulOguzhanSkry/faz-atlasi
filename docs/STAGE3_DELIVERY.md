# Stage 3 — reusable 3D microstructure inspector

Date: 2 November 2026. New code MIT. Original Faz Atlası attribution remains unchanged.

## Integration

After `bilesen.js`, load `mikroyapi/bootstrap.js`; add `mikroyapi/kup.css` in the document head. The bootstrap is a small classic script. It creates the sidebar entry and lower-left dock, registers both UI languages with `sozlukEkle`, and dynamically imports `kup.js` only after the user opens the inspector. Three.js and the geometry modules are not requested on initial page load.

The selected calculation is `FazBilesenSecimi = {result, carbon, temperature, binary}`. The bootstrap consumes it on `KANCA.panel`; it does not run a competing phase solver. Alloy isopleths and active empirical alloy corrections disable the inspector. Exact invariants without selected ξ remain unresolved and are not drawn as arbitrary percentages.

`FazMikroyapi.open()` opens the inspector. `minimise()` returns its existing WebGL canvas to the lower-left dock. Native dialog focus containment and Escape are retained. The first dock illustration is a lightweight SVG; the real WebGL canvas appears after the first opening and is reused thereafter.

## Files

- `web/mikroyapi/tane-hacmi.js`: deterministic weighted Voronoi/power-cell seed geometry.
- `bilesen-yerlesimi.js`: source-amount-driven constituent placement, including lamellae, boundary constituents, eutectic islands, primary dendrite and plate reference fields.
- `faz-yerlesimi.js`: direct phase-placement fallback.
- `model.js`: shared adapter and sampling contract for cube faces and 2D sections.
- `kup.js`: renderer, texture faces, native inspector controls, cut axis/depth, camera, source-boundary thermal playback, full screen, WebGL fallback and disposal.
- `bootstrap.js`: lazy source integration, translations and floating shell.
- `atom.js`, `kristal-yapilar.js`, `karbon-yerlesimi.js`, `koordinasyon.js`: source-provenance crystal references, integer phase-carbon population and illustrative coordination volumes.
- `kup.css`: theme-aware responsive styling.
- `web/vendor/three/`: pinned Three.js 0.186.1 module/core, OrbitControls and MIT licence. No CDN.
- `development/mikroyapi/`: preserved reviewed TypeScript sources and input SHA-256 provenance.
- `scripts/port-microstructure.mjs`: optional development-only reproduction of the plain-JS ports. Pass the source portfolio checkout as its argument; runtime use does not need Node or a build step.

## Shared model contract

`createModel({seed, quality, invariants, eutectoidTemperature})` returns:

- `setState(result, carbon, temperature)` — accepts the source constituent-engine result.
- `sample([x,y,z])` → `{grain,phase,part}` at a normalized position.
- `slice(axis,depth,resolution,extent?)` → width/height, typed phase/part/grain identity maps, code/id legends, source state metadata and colours.
- source `result`, `valid`, `volume`, drawing `config` and active occupancy getters.

Coordinates are normalized to a unit cube. Cut depth defaults to **1.00**. A section at any plane uses the same model as its matching cube face. `extent={u,v}` lets side faces represent a cut rectangular remainder without rescaling the underlying field. The 2D module consumes these maps; it does not generate a second morphology.

The inspector defaults to **fine detail: 192 grains**. Drawing surface resolution follows the explicitly selected detail level. It is not automatically degraded on refresh, minimisation or reopening; the grain count, surface resolution and source phase amounts are retained. Laptop layouts reserve the full viewport height for the cube plus camera controls. The left tools and right section can scroll independently; the modal itself does not need to grow beyond the display. The section preview is a square bitmap with a small DOM caption, avoiding enlarged metadata strips at low adaptive drawing resolution. PNG export independently renders a 512² section plus its complete scientific information strip.

`model.js` keeps geometry fields separate from phase allocation. Cached surface fields survive C/T updates, while phase/constituent labels are re-evaluated from the new mass budgets. Caching does not cache thermodynamic answers. It reduces warm balanced 128² section sampling from about 150 ms to about 4–12 ms in Node on the development machine; independent acceptance records the measured range. Initial geometry allocation, six-face rasterization and actual browser/WebGL rendering are separate costs. No universal sub-60-ms browser claim is made. Drawing detail remains the user-selected level even when a particular frame exceeds the target budget. Minimise/reopen only reparents and resizes the existing renderer: it retains model, meshes, textures, cut, colour mode and camera. Repeated source-panel notifications with the same C/T/ξ inventory do not rebuild the geometry.

## Scientific limits

- Drawing voxel occupancy represents **mass fractions**, not physical volume fractions. Density conversion is absent.
- Seed size, lamellar spacing, dendrite shape and orientation are schematic, unscaled and not experimentally validated.
- Atom views are fixed crystallographic references/prototypes. Integer C population uses the selected **phase** carbon concentration and reports quantization. Placement is a spacing heuristic, not atomic-equilibrium statistics.
- α/δ: BCC; γ: FCC; cementite: AFLOW Pnma oP16 prototype, 12 Fe + 4 C per cell. Liquid is a nonperiodic positional example, not molecular dynamics.
- Coordination polyhedra and hard-sphere void references do not model the carbon atom's actual accessible volume, relaxation, diffusion or thermal expansion.
- Playback stops at source phase boundaries and uses educational speed, not seconds of heat treatment. Reduced-motion preference disables playback and drift.
- Current runtime modules use browser ES-module loading. For reliable local/offline 3D use, serve `web/` with a local HTTP server; no Internet connection is required after obtaining the repo. Opening the classic core HTML directly remains possible, but browser `file://` module restrictions can prevent the 3D extension from loading.

## Resource lifecycle

`mountCube(host, api)` returns `setState`, `open`, `close`, `dock`, `resize`, `dispose` and read-only model/renderer/destroyed/playing/depth properties. Closing stops playback and retains the model/camera; page exit aborts listeners, disconnects the observer, cancels frames and disposes controls, textures, materials, geometry and renderer. Context-loss fallback retains the independently computed 2D section.

## Acceptance evidence

See `docs/INDEPENDENT_ACCEPTANCE.md` for independent numerical, pixel-identity, reduced-motion, lifecycle and lazy-load tests. Browser screenshots and actual WebGL checks are recorded by the integration owner separately; passing DOM mocks alone is not browser visual acceptance.
