# Stage 5 — trace comparison

Decision: **retain the shipped source data**.

Numerical source-table vs traced-pack comparison; same Fei–Brosh assessment, not experimental validation.

Compared 953 paired-boundary points; 16 candidate points had no matching source pair and are individually recorded.

| Invariant | Source °C | Candidate °C | Difference °C |
| --- | ---: | ---: | ---: |
| eutectoid | 726.531982422 | 726.532538897 | 0.000556475 |
| eutectic | 1148.157958984 | 1148.160519520 | 0.002560536 |
| peritectic | 1494.614257813 | 1494.614181713 | -0.000076099 |

| Pair | Points | Maximum endpoint C difference (weight percentage points) |
| --- | ---: | ---: |
| A+C | 178 | 4.527897e-6 |
| A+G | 102 | 3.514871e-4 |
| G+C | 223 | 1.185129e-4 |
| G+L | 186 | 9.718036e-4 |
| L+C | 150 | 7.751194e-2 |
| D+L | 61 | 5.660073e-4 |
| D+G | 53 | 7.094705e-5 |

- Invariant differences are small and do not establish physical superiority.
- The L+C branch near 1223.47°C differs by up to 0.07752 weight-percentage points: the source nearest-topology-row choice is a material numerical limitation, not an accepted boundary there.
- The traced candidate explicitly excludes dilute endpoints and the lower mapping edge.
- No new independent experimental validation or complete endpoint acceptance is provided.
- Replacing the source table would desynchronise the unchanged diagram and reference calculations.

The source query is extracted from app.js with a reproducible development command and tested against the original. This does not repair the source table's nearest-topology-row choice or certify narrow phase fields. Candidate boundary discrepancies are not rigorous physical uncertainty bounds. Raw experimental evidence remains absent.

Hashes, endpoint differences and omissions are in [trace-comparison.json](trace-comparison.json). No fe_c.json or fe_c.js data was overwritten.
