# OG additions: stages 1–2

Date: 2 November 2026. Original project: acarcemal/faz-atlasi, e9b2fce.
New code: MIT. Original licences and data NOTICE are unchanged.

## Stage 1 — constituents

- `web/bilesen.js`: standalone classic script, `FazBilesenMotoru.create(data, solver)`. The injected solver is the atlas's real `durum()`; no second phase diagram or hard-coded textbook invariant is introduced.
- `state(C,T,xi)` resolves exact eutectoid, eutectic and peritectic states by interpolating the stoichiometrically closed limiting phase states. ξ is a reaction progress, not elapsed time. Without ξ, the phase-fraction card is hidden at the exact invariant.
- `calculate(C,T,xi)` returns status, source phase inventory, constituent mass budgets, formulas and note IDs. Each constituent contains absolute sample phase masses; the UI also shows internal normalized fractions. The sum of component inventories equals the source inventory to 1e-8.
- At ordinary points, the original phase solver is unchanged. At a selected exact invariant with ξ, a small wrapper provides the same resolved phase inventory to the original phase card and to the new constituent card.
- A fixed cooling history is assumed even when users move upwards in temperature. This is not a reconstruction of their actual processing history.
- Secondary cementite rejected by eutectic austenite remains grouped inside the eutectic ancestry. At an exact cast-iron eutectoid transformation, that ancestry can contain residual γ; the UI discloses this and shows its internal phase fractions.
- The rounded cementite endpoint in the original table can contain a numerical companion phase. Inconsistent ancestry falls back explicitly to the source phases; phase conservation does not establish experimental validation.
- Alloy isopleths and empirical alloy corrections disable the new history layer. Its explanatory card stays visible. The original final-cooling card is hidden only while the replacement binary card applies.
- No browser build step, runtime package download, CDN or additional thermodynamic data is required. Node dependencies are development-only. Both UI languages are added to `dil.js`.

## Scientific interpretation

Pearlite is an α+cementite microconstituent, not an extra equilibrium phase. Its geometrical morphology is not uniquely determined by equilibrium fractions. The calculation is a metastable white-cast-iron reference when the eutectic is involved; real slow-cooled cast iron can instead graphitize. No CCT/TTT kinetics, undercooling, bainite, martensite or graphite are inferred.

Primary educational references:

- H. K. D. H. Bhadeshia, [Interpretation of steel microstructure](https://www.phase-trans.msm.cam.ac.uk/2008/Steel_Microstructure/SM.html).
- M. A. Yescas-Gonzalez and H. K. D. H. Bhadeshia, [Cast irons](https://www.phase-trans.msm.cam.ac.uk/2001/adi/cast.iron.html).

Numerical consistency tests and browser/visual checks are recorded separately in the independent acceptance report. Passing mass balance alone is not physical model validation.
