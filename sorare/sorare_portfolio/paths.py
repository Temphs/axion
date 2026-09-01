"""Every path in the project, resolved from the package location.

The project is designed to be moved or copied wholesale (a non-programmer will
drag the folder somewhere), so nothing anywhere uses an absolute path.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CONFIG_DIR = ROOT / "config"
SETTINGS_FILE = CONFIG_DIR / "settings.yml"
CAPABILITIES_FILE = CONFIG_DIR / "schema_capabilities.json"
ENV_FILE = ROOT / ".env"

DATA_DIR = ROOT / "data"
DB_FILE = DATA_DIR / "sorare.db"
EXPORT_DIR = DATA_DIR / "exports"
RAW_DIR = DATA_DIR / "raw"
LOG_DIR = DATA_DIR / "logs"
TOKEN_FILE = DATA_DIR / "auth_token.json"

MANUAL_DIR = ROOT / "manual"
CASH_FLOWS_CSV = MANUAL_DIR / "cash_flows.csv"
ESSENCE_CSV = MANUAL_DIR / "essence_log.csv"
INVESTMENTS_CSV = MANUAL_DIR / "investments.csv"

WORKBOOK_DIR = ROOT / "workbook"
WORKBOOK_FILE = WORKBOOK_DIR / "Sorare_Portfolio.xlsx"

QUERY_DIR = Path(__file__).resolve().parent / "queries"


def ensure_dirs() -> None:
    for directory in (DATA_DIR, EXPORT_DIR, RAW_DIR, LOG_DIR, MANUAL_DIR, WORKBOOK_DIR):
        directory.mkdir(parents=True, exist_ok=True)
