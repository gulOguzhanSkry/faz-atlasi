# Optional OG equilibrium research tools

These tools are an isolated, portable port of the portfolio research scripts.
They are **not** a new accepted data source for the runtime atlas. The comparison
and decision belong to [the Stage 5 report](../rapor/og/TRACE_COMPARISON.md).
No tool writes `web/veri/fe_c.json`, `web/veri/fe_c.js`, or any other file beneath
`web/`. Outputs under the web directory are explicitly refused.

New code is MIT; the source assessments and archived numerical results retain
their source attribution. No TDB database is redistributed by this addition.

## Paths and environment

All defaults are derived from this file's repository location, not the shell's
working directory or a developer's private folder:

- Raw numerical inputs: `hesap/rapor/og/ham/`.
- Candidate exports and optional fresh audit outputs: `hesap/rapor/og/kandidat/`.
- Source TDB: `cfe_broshe.tdb` from the installed pycalphad test database, or pass
  an explicit `--database /path/to/cfe_broshe.tdb` if the distribution omits it.
- Reference TDB: `hesap/tdb/iron4cd.TDB`, or pass `--database`.

The original trace environment used Python 3.13.15, pycalphad 0.11.2, NumPy
2.5.4 and SciPy 1.18.1. `requirements.txt` records those versions. Provision a
separate virtual environment explicitly if rerunning calculations; none is
created automatically, and none is required by the web app.

Every script implements `--help` before importing optional scientific packages.
`package-traced-equilibrium.py` needs only NumPy in addition to the standard
library; it consumes completed traces and does not invoke pycalphad.

## Reproduce the completed trace-based candidate

From repository root:

```sh
python hesap/og/package-traced-equilibrium.py
```

This writes a **candidate**, by default
`hesap/rapor/og/kandidat/equilibrium-r01.json`, and a reference-discrepancy table.
To choose another isolated destination:

```sh
python hesap/og/package-traced-equilibrium.py \
  --raw-dir hesap/rapor/og/ham \
  --output path/to/review/equilibrium-r01.json \
  --comparison-output path/to/review/scoped-comparison.json
```

The supplied numeric inputs are the previously completed 8/4/2 K source maps,
the reference map, the source/reference pure-iron roots, and 110 source-query
points for the optional fresh-solver audit. Their sizes and SHA-256 hashes are
recorded in `ham/SHA256SUMS.json`. No private paths, authentication material or
personal records are included. The pure-iron roots are frozen research inputs,
not independently validated measurements; the four ported tools do not claim to
reproduce their original free-energy root-finding audit.

The packaging reproduction check produced **969 boundary points**. Its envelope
is twice the sampled inter-map discrepancy, with conservative excluded regions;
it is an empirical numerical screening device, not a rigorous interpolation
proof, a physical uncertainty bound, or independent experimental validation.
The evidence field intentionally remains `pending-independent-physical-validation`.

## Optional mapping reruns

Mapping is deliberately not run as part of tests, web builds or deployment.
It may be slow and depends on the exact database/solver environment.

```sh
python hesap/og/map-equilibrium-reference.py --name source --step 8
python hesap/og/map-equilibrium-reference.py --name source --step 4
python hesap/og/map-equilibrium-reference.py --name source --step 2
python hesap/og/map-equilibrium-reference.py --name reference --step 8 \
  --database path/to/iron4cd.TDB
```

Default destinations use the archive's naming scheme: `source-map.json`,
`source-map-4.json`, `source-map-2.json` and `reference-map.json`. Pass `--output`
to keep a rerun separate from the archived evidence. Iteration and wall-time
budgets are configurable. A wall-time check occurs between mapping iterations;
it cannot interrupt a long-running native solver call within one iteration.
Budget exhaustion raises an error and does not mark the map accepted.

## Experimental adaptive refinement — NOT ACCEPTED

`build-equilibrium-pack.py` is preserved as a research method, **not** the method
that produced the accepted-at-project-level traced candidate. The original
attempt stalled near dilute α/γ and γ/δ endpoints and did not complete all
endpoint validation. It must not be described as a successfully completed
adaptive calculation.

The script refuses to run without `--experimental`, and has direct-call and
recursion-depth budgets:

```sh
python hesap/og/build-equilibrium-pack.py --experimental --name source \
  --max-calls 3000 --max-depth 12
```

Running it later does not grant scientific acceptance. Its candidate metadata
stays `experimental-not-accepted`, and unresolved/budget failures are fatal.
The originally stalled run was **not** restarted during this port.

## Optional fresh-solver consistency audit

```sh
python hesap/og/verify-phase-solver.py \
  --input hesap/rapor/og/ham/solver-input.json \
  --output hesap/rapor/og/kandidat/solver-check.json
```

The same assessed TDB is solved with pycalphad and compared to archived source
queries. This checks a query/interpolation implementation against a fresh solver
run. It cannot establish the physical validity of the common database. The
fresh-solver calculation was not rerun as part of the tool port.

## Sources and licences

- Original atlas and source data generation:
  [acarcemal/faz-atlasi](https://github.com/acarcemal/faz-atlasi), original MIT
  notice and `NOTICE` remain in the repository.
- Source thermodynamic assessment: Fei & Brosh (2014), `cfe_broshe.tdb`, as
  distributed in pycalphad's test databases. See original atlas method/source
  notes. pycalphad is credited to R. Otis and Z.-K. Liu.
- Reference: Hallstedt `iron4cd.TDB` in
  [OpenCalphad at the recorded revision](https://github.com/sundmanbo/opencalphad/blob/351e0771b02683976606fb2b4a57af28bd668847/examples/macros/iron4cd.TDB),
  with its CC BY 4.0 data attribution. This uses Gustafson-related assessed
  ancestry; agreement is not independent experimental validation.

## Port checks

```sh
python -m compileall -q hesap/og
python hesap/og/map-equilibrium-reference.py --help
python hesap/og/build-equilibrium-pack.py --help
python hesap/og/package-traced-equilibrium.py --help
python hesap/og/verify-phase-solver.py --help
```

These syntax/help checks and the lightweight existing-trace packaging were
performed. No large new equilibrium calculation, database replacement or physical
acceptance is asserted by this delivery.
