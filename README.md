<div align="center">

<sub>OG FORK · INTERACTIVE MATERIALS EDUCATION</sub>

# Faz Atlası

### From the phase diagram to the microstructure.

Explore Fe–C equilibrium, follow the constituent budgets,<br>
and look inside the same structure — from a 3D section to an atomic reference.

[![Release v1.2.1](https://img.shields.io/badge/release-v1.2.1-526e60?style=flat-square)](https://github.com/gulOguzhanSkry/faz-atlasi/releases/tag/v1.2.1)
[![Code licence MIT](https://img.shields.io/badge/code-MIT-a77850?style=flat-square)](LICENSE)
![Languages TR and EN](https://img.shields.io/badge/languages-TR%20%2F%20EN-657f99?style=flat-square)
![Schematic research prototype](https://img.shields.io/badge/model-schematic%20prototype-85719c?style=flat-square)

**[Open the atlas ↗](https://guloguzhanskry.github.io/faz-atlasi/?lang=en)** &nbsp; · &nbsp;
[Türkçe](README.tr.md) &nbsp; · &nbsp;
[Watch the introduction](https://guloguzhanskry.github.io/faz-atlasi/gorseller/mikroyapi-sogume-en.mp4)

[![Eight source-calculated Fe–C microstructures at maximum 384-grain detail, with their cementite mass fractions](web/gorseller/readme-microstructures-en.webp)](web/gorseller/readme-microstructures-en.webp)

<sub>384 grains · 512² textures · eight source-calculated states · offline schematic renders, not UI screenshots or measured micrographs</sub>

</div>

---

## One point. Three ways to understand it.

| **01 / Equilibrium** | **02 / Microstructure** | **03 / Atomic reference** |
| :--- | :--- | :--- |
| Select carbon and temperature on the calculated Fe–Fe₃C diagram. Read the phases, their carbon contents and mass fractions. | Separate pearlite, primary/secondary cementite and ledeburite ancestry. Cut the shared 3D volume and compare its appearances. | Inspect FCC austenite, BCC ferrite and cementite reference cells. Explore illustrative interstitial carbon positions. |

**Try a complete path in four steps:** choose **0.45 wt% C**, move below the eutectoid, open **3D microstructure**, then switch the section from **phase colours** to **etched appearance**. At an exact invariant, select the reaction progress **ξ** to resolve the otherwise non-unique phase amounts.

## What this fork adds

- **Inspectable constituent budgets** — source-derived invariant compositions, per-constituent phase breakdowns and lever-rule calculations.
- **A second reading layer on the diagram** — P/S/E/C composition references and selectable slow-cooling constituent regions, distinct from phase boundaries.
- **A reusable 3D inspector** — floating dock, retained camera and selection, section planes, phase/constituent/grain colours, and an atomic reference view.
- **A shared 2D section** — the cube's own label map, relative magnification, illustrative Nital appearance, deterministic optical effects and annotated PNG export.
- **A reproducible introduction** — a short cooling sequence generated from the same source calculation and geometry, in both interface languages.

The original project already includes slow-cooling constituent estimates. This fork extends their explanation, source-state connection and visual exploration; it does not claim to have introduced those concepts.

### A wide workspace on a small screen

The mobile diagram keeps its working area instead of shrinking the plot to an unreadable thumbnail. Switch between **Pan** and **Select point**; drag to pan and pinch to zoom. **Lock view** keeps the framing still while you inspect a point. Zoom buttons, directional controls, **1:1 view** and **Fit diagram** provide explicit alternatives to gestures. Composition and temperature inputs remain outside the transformed diagram. The desktop layout stays unchanged.

<details>
<summary><strong>Explore the visual and technical evidence</strong></summary>

| Review | Contents |
| :--- | :--- |
| [Same volume, three displays](web/gorseller/readme-display-modes-en.webp) | Maximum-detail phase cubes, constituent cubes and etched sections from eight computed states. |
| [Section comparison sheet](web/gorseller/kesit-paftasi.png) | Seven compositions, three appearances and three relative magnifications. |
| [Independent acceptance](docs/INDEPENDENT_ACCEPTANCE.md) | Conservation, invariant progress, geometry, shared-section identities and remaining acceptance limits. |
| [3D inspector](docs/STAGE3_DELIVERY.md) · [Section and animation](docs/STAGE3B4_DELIVERY.md) | Architecture, controls, reproducible assets and explicitly stated scope. |
| [Source-trace comparison](hesap/rapor/og/TRACE_COMPARISON.md) | Why the shipped phase data was retained rather than silently replaced. |
| [Portfolio integration](docs/PORTFOLIO_INTEGRATION.md) | A pinned calculation source shared with the OG portfolio. |

</details>

## Read the model correctly

> **Equilibrium fractions are calculated. The spatial arrangement is schematic.**

The binary reference is **metastable Fe–Fe₃C**, 400–1600 °C, approximately 1 bar. Constituent ancestry assumes slow cooling from liquid, even when a point is reached by moving upward in temperature. Pearlite and ledeburite are microconstituents, not extra thermodynamic phases.

The model does not predict cooling kinetics, physical grain size, lamellar spacing, graphite, bainite or martensite. A section's area fraction is not forced to equal bulk mass or volume fraction; atom cells are reference illustrations. Alloy isopleths remain available in the original atlas, while the new binary microstructure layer is disabled for alloy states. Numerical conservation is not independent experimental validation. [Scope and methods →](docs/OG_ADDITIONS.md)

## Run it locally

Download or clone the repository, then serve its self-contained `web/` folder:

```sh
python -m http.server 8731 --directory web
```

Open **[localhost:8731](http://localhost:8731/?lang=en)**. No runtime build, CDN or account is required. Once the files are local, the app works without an internet connection. A local HTTP server is needed for the lazy-loaded 3D ES modules; opening an HTML file directly is not the full-featured path.

For development and automated checks only:

```sh
npm ci --ignore-scripts
npm test
```

Optional numerical research tools are documented in [hesap/og](hesap/og/README.md). Their outputs stay separate from the deployed dataset.

## Built on an openly credited foundation

**Original Faz Atlası:** [acarcemal](https://github.com/acarcemal/faz-atlasi) — the calculated diagram, steel library, alloy isopleths and original interface. **Fork additions:** Oğuzhan Gül / OG — constituent-state integration, diagram layer, shared 3D/2D inspector and research/integration tooling. The [original documentation](https://github.com/acarcemal/faz-atlasi/tree/e9b2fce0b604502b94e620104fa6533e1e78bd82) contains the upstream feature and calculation details.

- **CALPHAD:** pycalphad, R. Otis and Z.-K. Liu; binary assessment by Fei & Brosh (2014), `cfe_broshe.tdb`.
- **Alloy data:** MatCalc `mc_fe v2.062`, E. Povoden-Karadeniz and A. Jacob, TU Wien. Derived isopleth data carries the [ODbL 1.0 notice](NOTICE).
- **Metallurgical interpretation:** [Bhadeshia, steel microstructures](https://www.phase-trans.msm.cam.ac.uk/2008/Steel_Microstructure/SM.html) and [Yescas-Gonzalez & Bhadeshia, cast irons](https://www.phase-trans.msm.cam.ac.uk/2001/adi/cast.iron.html).

Code is **[MIT licensed](LICENSE)**; data terms remain distinct. Original author and third-party notices are preserved. See [NOTICE](NOTICE), the vendored Three.js licence and [the atomic-source notes](docs/STAGE3_DELIVERY.md) for attribution.

<div align="center"><sub>Built to make the calculation visible — and its limits readable.</sub></div>
