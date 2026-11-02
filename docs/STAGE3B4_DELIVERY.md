# Stage 3B and 4 delivery

Date: 2 November 2026. Author of fork additions: Oğuzhan Gül / OG.
Original application and CALPHAD calculation: acarcemal/faz-atlasi.
New source files: MIT. No original licences or data notices were removed.

## Stage 3B — shared 2D section

`web/mikroyapi/kesit2d.js` is a plain ES module, with no package dependencies or
build step. It renders the exact maps returned by `model.slice()`. There is no
second morphology generator in the 2D renderer.

Exports:

- `renderSlice(canvas, model, options)` — UI / cube texture / PNG canvas adapter.
- `renderSlicePixels(slice, options)` — deterministic pure RGBA rendering and
  identity maps for independent tests and offline generation.
- `saveSlicePNG(canvas, filename)` — download the already-rendered PNG, including
  its information strip when `info` was enabled during rendering.
- `SLICE_STRINGS`, `registerSliceTranslations(sozlukEkle)` — Turkish and English
  strings. No runtime translations are fetched from another server.

Options include `axis`, `depth`, `resolution`, `extent`, `mode`, `magnification`,
`effects`, `info`, `lang`, `carbon`, `temperature`, `eutectoidTemperature`.
Modes are `phases`, `constituents`, `grains` and `etched`.

For exact, unzoomed cube textures use `magnification:'low', info:false,
effects:false`. Low magnification maps every output pixel to the identical
source pixel. Medium and high magnification crop the **same** map at relative
factors 1.35 and 2.5. `sourceIndices` is returned so that a visual pixel remains
traceable to the original 3D section. Neither magnification is a physical
microscope calibration.

The etched mode shows illustrative light ferrite, bright cementite and dark
pearlitic regions. At low magnification pearlite lamellae are unresolved; higher
magnifications distinguish their existing α/θ identities. Deterministic grain
contrast, fine surface noise, thin grain edges and a mild vignette change RGB
values only. Effects do not move, add, or remove any phase or constituent label.
Scratches, inclusions and other false defect imagery are not manufactured.

Above the eutectoid temperature, or whenever residual γ is present at an exact
invariant, etched mode falls back to phase colours with a bilingual hot-state
warning. This is not a simulated hot etching process or a quench prediction.
Unresolved / unavailable model states display an unavailable message.

The PNG information strip includes composition, temperature, the assumed slow
equilibrium cooling history and “schematic / unscaled / not a measured
micrograph”. Its height is computed from the actual wrapped text. This also
prevents long English warnings being clipped in small PNG exports.

### Acceptance correction: cut area and bulk mass

The original plan requested both exact cube–cut identity and an area fraction
equal to every constituent's global mass fraction on every cut. Those two
requirements cannot both hold for arbitrary sections of a nonuniform 3D field.
The accepted correction prioritises exact cube–cut identity: voxel budgets are
an illustrative representation of mass budgets, not physical volume fractions;
an individual cut's area shares may differ. No relabelling is performed to force
a visually convenient area fraction. Effects preserve the sampled identities.

## Stage 4 — reproducible introductory animation

The final assets are in `web/gorseller/`:

- `mikroyapi-sogume.mp4` / `mikroyapi-sogume-en.mp4`
- `mikroyapi-sogume-poster.webp` / `mikroyapi-sogume-en-poster.webp`
- `mikroyapi-sogume.manifest.json`
- `kesit-paftasi.png` — 7 compositions × 3 modes × 3 magnifications.

The intro is a 1200 × 780, 12 fps isometric presentation of three exact faces of
the shared 3D model. It uses 56 solver-derived states at 0.45 wt% C: 900 °C down
to the eutectoid, 17 ξ steps at the exact invariant, then down to 650 °C. The three
faces are the z=1, x=0 and y=0 sections. An affine projection and illumination
change presentation only; the geometry/phase maps are the runtime model's own.
There are no independent painted structures or AI-generated micrographs.

The playback time is explanatory and is not physical cooling time. The loop
resets by a fade; a reversed animation is not presented as a heating simulation.
The manifest records every thermodynamic state, phase and constituent budget,
seed, model quality, resolution and face planes.

Reproduce from repository root:

```sh
node hesap/animasyon/kareleri-uret.mjs
python hesap/animasyon/animasyonu-uret.py
node hesap/animasyon/kesit-paftasi.mjs
python hesap/animasyon/kesit-paftasi.py
```

The Python presentation scripts require Pillow plus ffmpeg in PATH, an explicit
`--ffmpeg` argument, or the installed `imageio_ffmpeg` package. These are optional
offline authoring dependencies; the deployed web app does not need them.
Intermediate RGBA files stay under ignored `private/`, not in the repository.

## Scientific and visual review boundaries

The contact sheet was generated from the same runtime renderer and visually
inspected. It demonstrates ferrite–pearlite, secondary cementite, transformed
ledeburite and primary cementite schematic appearances at 650 °C. It is not
experimental or quantitative microscopy validation. Grain sizes, lamellar
spacings and the apparent etching response are not physical predictions.

Reference context (not image assets embedded into the app):

- H. K. D. H. Bhadeshia, [Interpretation of steel microstructure](https://www.phase-trans.msm.cam.ac.uk/2008/Steel_Microstructure/SM.html).
- M. A. Yescas-Gonzalez and H. K. D. H. Bhadeshia,
  [Cast irons](https://www.phase-trans.msm.cam.ac.uk/2001/adi/cast.iron.html).

Independent code tests and actual browser acceptance are recorded by the
independent acceptance agent / main integrator, separately from this delivery.
