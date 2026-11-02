"""MIT — portable path policy for optional research tools, never runtime data."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW_DEFAULT = ROOT / 'hesap/rapor/og/ham'
CANDIDATE_DEFAULT = ROOT / 'hesap/rapor/og/kandidat'


def database_path(name, override=None):
    if override:
        result = Path(override).expanduser().resolve()
    elif name == 'source':
        import pycalphad
        result = Path(pycalphad.__file__).parent / 'tests/databases/cfe_broshe.tdb'
    else:
        result = ROOT / 'hesap/tdb/iron4cd.TDB'
    if not result.is_file():
        raise FileNotFoundError(f'Database not found: {result}. Pass --database; TDB files are not redistributed.')
    return result


def research_output(path):
    """Refuse every destination inside web/, including alternate data names."""
    result = Path(path).expanduser().resolve()
    try:
        result.relative_to(ROOT / 'web')
    except ValueError:
        pass
    else:
        raise ValueError('Research tools must not write into web/. Review candidate data separately.')
    result.parent.mkdir(parents=True, exist_ok=True)
    return result
