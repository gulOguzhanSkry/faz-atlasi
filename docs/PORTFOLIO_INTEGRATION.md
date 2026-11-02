# Stage 6 — one calculation source

The OG portfolio imports a pinned commit/tag from this fork into its vendored
directory. Its adapter retains `bilesen.js`, `bolgeler.js`, `bolgeler.css` and the
unchanged source diagram. It suppresses the fork's floating-cube bootstrap in
the iframe because the surrounding Astro page already has its own 3D inspector.

The portfolio's `ForkAtlasEngine` loads the exact committed `faz-durumu.js` and
`bilesen.js` files, translating their results into the existing render interface.
It does not introduce another lever-rule implementation. Phase and constituent
amounts consequently share the diagram's own invariant coordinates. Selection
and invariant ξ progress travel both ways through a source-window/origin/nonce
checked message bridge. The preserved portfolio geometry is an illustrative
consumer of those same mass inventories.

Source import records commit, original upstream commit, byte sizes and SHA-256
for every imported file in the portfolio's `third-party/faz-atlasi/UPSTREAM.json`.
Reimport with `node scripts/import-fork-atlas.mjs <local-fork> <tag>` and build
the adapter. This is a development operation; visitors do not need Node.

The fork's standalone 3D cube and the portfolio's Astro cube deliberately have
separate presentation code. Calculations and their TR/EN source dictionary are
shared. The r01 traced database remains research evidence and is not silently
mixed with the source diagram's coordinates.

## Accepted scope changes and verification limits

- Default detail is 192 grains. The large inspector keeps the whole cube and
  camera controls in its desktop viewport; long tools have their own scrolling.
- Minimising/reopening retains the same model, textures, camera, cut and colour
  mode. There is no silent surface-resolution downgrade.
- The small bottom-left entry is enlarged on desktop and mobile.
- An individual section's area fraction is not forced to equal bulk mass;
  exact shared 3D/2D identities take precedence. Density is not modelled.
- Same-database numerical comparison and conservation are not independent
  experimental validation. The source/candidate L+C endpoint discrepancy and
  all candidate exclusions remain documented.
- Native browser review initially displayed the actual 3D cube and source
  panel. Final laptop-fit, atom, PNG-download and mobile visual rechecks were
  prevented when browser access was disabled in Work settings. Automated
  lifecycle, layout rules, export preparation and model tests passed; they do
  not replace GPU/browser visual acceptance.
