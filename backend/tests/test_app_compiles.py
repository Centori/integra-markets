"""Every backend module must at least COMPILE.

Why this exists
---------------
On 2026-08-31 a bad edit left `main.py` with an extra indent level:

    try:
        from api.market_sentiment import router as market_sentiment_router
            from api.export import router as export_router   # IndentationError
        market_sentiment_available = True
    except ImportError:
        market_sentiment_available = False

That is a SyntaxError, so `except ImportError` could not catch it and the app
could not start at all. **The full test suite passed** — nothing in it imports
`main.py` — and the breakage was only found when the Railway deploy failed and
production silently carried on serving the previous build.

`main.py` already carries a comment warning that a typo'd import silently
deletes an API surface. This is the cheapest possible guard for the class of
mistake above it: compiling a file needs no database, no network and no
environment, so it can cover modules the suite otherwise never touches.
"""
import pathlib
import py_compile
import sys
import tempfile

import pytest

BACKEND = pathlib.Path(__file__).resolve().parents[1]

# Directories that are not part of the deployed app.
_SKIP_DIRS = {"tests", "__pycache__", "venv", ".venv", "node_modules", "scripts_archive"}


def _python_files():
    for path in sorted(BACKEND.rglob("*.py")):
        if any(part in _SKIP_DIRS for part in path.relative_to(BACKEND).parts):
            continue
        yield path


@pytest.mark.parametrize("path", list(_python_files()), ids=lambda p: str(p.name))
def test_module_compiles(path):
    """Syntax only — no import side effects, so this is safe for every file."""
    with tempfile.NamedTemporaryFile(suffix=".pyc", delete=True) as out:
        try:
            py_compile.compile(str(path), cfile=out.name, doraise=True)
        except py_compile.PyCompileError as exc:
            pytest.fail(f"{path.relative_to(BACKEND)} does not compile:\n{exc}")


def test_entrypoint_compiles_specifically():
    """Belt and braces on the one file whose failure takes the whole app down.

    Kept separate from the parametrised sweep so the failure message names the
    entrypoint rather than being one row among ~200.
    """
    main = BACKEND / "main.py"
    assert main.exists(), "backend/main.py is missing"
    with tempfile.NamedTemporaryFile(suffix=".pyc", delete=True) as out:
        try:
            py_compile.compile(str(main), cfile=out.name, doraise=True)
        except py_compile.PyCompileError as exc:
            pytest.fail(f"backend/main.py does not compile — the app cannot start:\n{exc}")
