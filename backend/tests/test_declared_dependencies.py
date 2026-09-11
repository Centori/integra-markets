"""Every third-party package the app imports must be declared where it installs.

This test exists because the same bug shipped twice in a week, and both times
the service reported itself healthy while a whole surface was down:

  * `stripe` was declared only in requirements-light.txt, which nothing
    installs, so POST /api/stripe/checkout answered
    503 "stripe SDK not installed on backend" — checkout, and only checkout.

  * `PyJWT` was declared in NEITHER file, so verify_supabase_jwt answered
    503 "auth library unavailable" to every authenticated request. The
    dashboard's entitlement lookup fell back to free_trial on that failure, so
    the visible symptom was an account correctly locked out of features it had
    paid for — not an outage.

The shape is always the same: a module imports a package lazily inside a
function so the app can boot without it, and nothing ever checks that the
package is there. Booting without it is the feature; shipping without it is
the bug.

Scope is deliberately narrow — imports written inside function bodies in api/
and services/, which is exactly where the lazy pattern lives. Top-level imports
need no test; they fail at startup, loudly, which is the behaviour we want and
already have.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent

# Indented import => inside a function or a try block, i.e. deferred to runtime.
_LAZY_IMPORT = re.compile(r"^[ \t]+(?:import|from)\s+([A-Za-z_][\w]*)", re.M)

# The file the deployed image installs. Railway's `backend` service sets no
# rootDirectory, so it builds the repo-root Dockerfile, which does
# `COPY backend/requirements.txt`. requirements-light.txt is not installed by
# anything, which is precisely how `stripe` went missing while looking present.
INSTALLED_REQUIREMENTS = BACKEND / "requirements.txt"

_STDLIB = {
    "argparse", "asyncio", "base64", "collections", "contextlib", "copy", "csv",
    "dataclasses", "datetime", "decimal", "enum", "functools", "glob", "gzip",
    "hashlib", "html", "importlib", "inspect", "io", "itertools", "json",
    "logging", "math", "os", "pathlib", "random", "re", "secrets", "shutil",
    "sqlite3", "statistics", "string", "subprocess", "sys", "tempfile",
    "textwrap", "threading", "time", "traceback", "typing", "urllib", "uuid",
    "warnings", "zoneinfo",
}

# Packages whose absence degrades a feature without breaking a request path.
# Each entry is a decision that this may be missing in production, not an
# oversight — anything not listed here must be installed.
_OPTIONAL = {
    # api/push_verify.py reports availability as diagnostic output and takes a
    # non-SDK path when absent; it never raises.
    "exponent_server_sdk",
}


def _local_modules() -> set[str]:
    names = {p.stem for p in BACKEND.rglob("*.py")}
    names |= {p.name for p in BACKEND.iterdir() if p.is_dir()}
    return names


def _declared() -> str:
    return INSTALLED_REQUIREMENTS.read_text().lower()


def _lazy_third_party_imports() -> dict[str, set[str]]:
    local = _local_modules()
    found: dict[str, set[str]] = {}
    for folder in ("api", "services"):
        for path in (BACKEND / folder).rglob("*.py"):
            for match in _LAZY_IMPORT.finditer(path.read_text(errors="replace")):
                module = match.group(1)
                if module in _STDLIB or module in local or module.startswith("_"):
                    continue
                found.setdefault(module, set()).add(
                    str(path.relative_to(BACKEND))
                )
    return found


def test_requirements_file_the_image_installs_exists():
    assert INSTALLED_REQUIREMENTS.exists(), (
        "requirements.txt is the file the repo-root Dockerfile copies. If it "
        "moved, this test is measuring the wrong thing and must be updated."
    )


def test_pyjwt_is_declared():
    """Pinned separately because its absence takes down every signed-in route."""
    assert "pyjwt" in _declared(), (
        "PyJWT missing from requirements.txt. verify_supabase_jwt answers "
        "503 'auth library unavailable' without it, so every authenticated "
        "endpoint fails while /health still returns 200."
    )


def test_stripe_is_declared():
    """Same reasoning: its absence is invisible until someone tries to pay."""
    assert "stripe" in _declared(), (
        "stripe missing from requirements.txt. POST /api/stripe/checkout "
        "answers 503 without it, and nothing else changes."
    )


@pytest.mark.parametrize("module", sorted(_lazy_third_party_imports()))
def test_lazily_imported_package_is_installed(module: str):
    if module in _OPTIONAL:
        pytest.skip(f"{module} is a declared-optional dependency")
    importers = ", ".join(sorted(_lazy_third_party_imports()[module]))
    assert module.lower() in _declared(), (
        f"{module} is imported at runtime by {importers} but is not in "
        f"requirements.txt — the file the deployed image installs. The app "
        f"will boot, report healthy, and fail only on the paths that need it."
    )
