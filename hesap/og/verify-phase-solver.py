# SPDX-License-Identifier: MIT — optional solver consistency audit.
"""Recompute selected binary points using pycalphad 0.11.2 and the SAME assessed TDB.
This checks our shipped interpolation against a fresh solver run, not the database
against independent experimental evidence. Use an explicitly provisioned research environment. Default outputs are isolated from web/.
"""
from pathlib import Path
import argparse
from _paths import ROOT, RAW_DEFAULT, CANDIDATE_DEFAULT, database_path, research_output
parser=argparse.ArgumentParser(description='Fresh pycalphad check against the SAME TDB: solver check, not experimental validation.')
parser.add_argument('--input',type=Path,default=RAW_DEFAULT/'solver-input.json')
parser.add_argument('--output',type=Path,default=CANDIDATE_DEFAULT/'solver-check.json')
parser.add_argument('--database',type=Path)
args=parser.parse_args()
import hashlib, json, importlib.metadata
import numpy as np
import pycalphad
from pycalphad import Database, equilibrium, variables as v

points = json.loads(args.input.read_text(encoding='utf-8'))
if not points: raise ValueError('No solver-check points supplied')
db_path = database_path('source',args.database)
db = Database(str(db_path))
m_c, m_fe = 12.011, 55.847
rows = []
for temperature in sorted({p['temperature'] for p in points}):
    group = [p for p in points if p['temperature'] == temperature]
    carbon = np.array([p['carbon'] for p in group])
    x_c = (carbon / m_c) / ((carbon / m_c) + (100 - carbon) / m_fe)
    eq = equilibrium(db, ['FE', 'C', 'VA'], ['BCC_A2', 'FCC_A1', 'CEMENTITE_D011', 'LIQUID'],
                     {v.X('C'): x_c, v.T: temperature + 273.15, v.P: 1e5})
    count = eq.Phase.shape[-1]
    phases = eq.Phase.values.reshape(-1, count)
    amounts = eq.NP.values.reshape(-1, count)
    compositions = eq.X.sel(component='C').values.reshape(-1, count)
    for i, point in enumerate(group):
        result = {}
        for phase, amount, c_fraction in zip(phases[i], amounts[i], compositions[i]):
            if not phase or not np.isfinite(amount) or amount < 1e-7:
                continue
            name = {'FCC_A1': 'G', 'CEMENTITE_D011': 'C', 'LIQUID': 'L'}.get(str(phase), 'A' if temperature < 1200 else 'D')
            molar_mass = float(c_fraction) * m_c + (1 - float(c_fraction)) * m_fe
            mass = float(amount) * molar_mass
            result[name] = result.get(name, 0) + mass
        total = sum(result.values())
        result = {key: mass / total for key, mass in result.items()}
        expected = {p['f']: p['oran'] for p in point['phases'] if p['oran'] > 1e-6}
        error = max(abs(expected.get(key, 0) - result.get(key, 0)) for key in expected.keys() | result.keys())
        rows.append({'carbon': point['carbon'], 'temperature': temperature, 'query': expected,
                     'freshSolver': result, 'maxFractionError': error, 'samePhaseSet': set(expected) == set(result)})
    print(f'{temperature} C: {len(group)} points solved', flush=True)
report = {'scope': 'Fresh pycalphad run using same assessed database; not experimental validation',
          'pycalphad': importlib.metadata.version('pycalphad'), 'database': db_path.name,
          'databaseSha256': hashlib.sha256(db_path.read_bytes()).hexdigest(), 'pressurePa': 100000,
          'points': len(rows), 'phaseSetMismatches': sum(not row['samePhaseSet'] for row in rows),
          'maxFractionError': max(row['maxFractionError'] for row in rows), 'rows': rows}
research_output(args.output).write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps({k: value for k, value in report.items() if k != 'rows'}, indent=2), flush=True)
