"""Command line entry point.

    python -m sorare_portfolio update     full refresh (what the .bat file runs)
    python -m sorare_portfolio doctor     check the queries against the schema
    python -m sorare_portfolio export     re-export and rebuild from stored data
    python -m sorare_portfolio build      rebuild the workbook only
    python -m sorare_portfolio demo       build a sample workbook, no account needed
"""

from __future__ import annotations

import argparse
import sys

from . import db
from .paths import DATA_DIR, ENV_FILE, WORKBOOK_FILE, ensure_dirs
from .pipeline import MODULES, configure_logging, run_update


def _load_env() -> None:
    """Read .env without requiring python-dotenv to be importable."""
    if not ENV_FILE.exists():
        return
    try:
        from dotenv import load_dotenv

        load_dotenv(ENV_FILE)
        return
    except ImportError:
        pass
    import os

    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def command_update(args: argparse.Namespace) -> int:
    report = run_update(
        modules=tuple(args.modules) if args.modules else MODULES,
        interactive=not args.unattended,
        rebuild_workbook=not args.no_workbook,
    )
    print()
    print(report.render())
    print()
    if report.failures:
        print("Some modules failed. The workbook still shows everything that did load.")
        print("Run  update_sorare.bat doctor  if a failure mentions an unknown field.")
        return 1
    print(f"Done. Open {WORKBOOK_FILE}")
    return 0


def command_doctor(args: argparse.Namespace) -> int:
    from .schema_doctor import SchemaDownloadError, format_report, run_doctor

    try:
        capabilities = run_doctor(refresh=getattr(args, "refresh", False))
    except SchemaDownloadError as exc:
        print(exc)
        return 2
    print(format_report(capabilities))
    failed = [name for name, result in capabilities["queries"].items() if not result["ok"]]
    if failed:
        print(f"{len(failed)} quer{'y' if len(failed) == 1 else 'ies'} need attention: {', '.join(failed)}")
        print("The other modules will still run - each one degrades on its own.")
    return 0


def command_export(_: argparse.Namespace) -> int:
    from .export.exporter import export_all

    with db.session() as connection:
        written = export_all(connection)
    print(f"Exported {len(written)} datasets.")
    from .excel.build_workbook import build_workbook

    print(f"Workbook rebuilt: {build_workbook()}")
    return 0


def command_build(_: argparse.Namespace) -> int:
    from .excel.build_workbook import build_workbook

    print(f"Workbook rebuilt: {build_workbook()}")
    return 0


def command_demo(_: argparse.Namespace) -> int:
    """A full workbook from sample data, so you can look before you connect."""
    from .demo import seed
    from .excel.build_workbook import build_workbook
    from .export.exporter import export_all

    demo_database = DATA_DIR / "demo.db"
    with db.session(demo_database) as connection:
        seed(connection)
        export_all(connection)
    path = build_workbook(WORKBOOK_FILE.with_name("Sorare_Portfolio_DEMO.xlsx"))
    print(f"Demo workbook written to {path}")
    print("This is sample data, not your account. Run 'update' for the real thing.")
    return 0


def main(argv: list[str] | None = None) -> int:
    ensure_dirs()
    _load_env()

    parser = argparse.ArgumentParser(prog="sorare_portfolio", description=__doc__)
    parser.add_argument("--verbose", action="store_true", help="debug logging")
    subparsers = parser.add_subparsers(dest="command")

    update = subparsers.add_parser("update", help="full refresh (default)")
    update.add_argument("--modules", nargs="*", choices=MODULES, help="run only these modules")
    update.add_argument("--unattended", action="store_true", help="never prompt (for Task Scheduler)")
    update.add_argument("--no-workbook", action="store_true", help="skip rebuilding the workbook")
    update.set_defaults(func=command_update)

    doctor = subparsers.add_parser("doctor", help="check the queries against Sorare's schema")
    doctor.add_argument(
        "--refresh", action="store_true", help="re-download the schema even if it is already here"
    )
    doctor.set_defaults(func=command_doctor)
    subparsers.add_parser("export", help="re-export and rebuild from stored data").set_defaults(
        func=command_export
    )
    subparsers.add_parser("build", help="rebuild the workbook only").set_defaults(func=command_build)
    subparsers.add_parser("demo", help="build a sample workbook from generated data").set_defaults(
        func=command_demo
    )

    args = parser.parse_args(argv)
    configure_logging(args.verbose)
    if not getattr(args, "func", None):
        args = parser.parse_args((argv or []) + ["update"])
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
