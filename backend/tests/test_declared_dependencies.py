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
import sys
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

# The standard library, from the interpreter rather than from a hand-written
# list. The list this replaces was missing `ipaddress` (and `ssl`, `socket`,
# `ipaddress`, `hmac`, `calendar`, …), so the FIRST lazy import of any of them
# failed this test as an undeclared third-party package. A guard that cries wolf
# gets its assertion loosened, which is how it stops catching the real thing —
# and the real thing here was `stripe` missing from the deployed image.
#
# sys.stdlib_module_names is 3.10+; the image is 3.11.
_STDLIB = set(getattr(sys, "stdlib_module_names", ())) | {
    # Kept as a floor in case this ever runs on an interpreter without the
    # attribute, so the test degrades to the old behaviour rather than treating
    # every stdlib module as a missing dependency.
    "argparse", "asyncio", "base64", "collections", "contextlib", "copy", "csv",
    "dataclasses", "datetime", "decimal", "enum", "functools", "glob", "gzip",
    "hashlib", "html", "importlib", "inspect", "io", "ipaddress", "itertools",
    "json", "logging", "math", "os", "pathlib", "random", "re", "secrets",
    "shutil", "sqlite3", "statistics", "string", "subprocess", "sys",
    "tempfile", "textwrap", "threading", "time", "traceback", "typing",
    "urllib", "uuid", "warnings", "zoneinfo",
}

# Names that are not installable distributions at all, so requirements.txt can
# never satisfy them and asking it to is a category error.
_FIRST_PARTY = {
    # api/news.py does `from app.services.keyword_ml_processor import ...`. `app/`
    # is the React Native source directory at REPO ROOT, not a Python package and
    # not on sys.path in the deployed image — so this import has never resolved
    # in production. It is wrapped in try/except ImportError with an explicit
    # fallback that returns {"status": "training_unavailable"}, which is the
    # documented intent, so the behaviour is degradation by design rather than a
    # missing dependency.
    "app",
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
    """Names that `import X` would resolve to a file in this repo.

    TOP LEVEL ONLY. This used to rglob, so every .py file anywhere under
    backend/ claimed its own stem as a local module — and the one that mattered
    was api/stripe.py, which made the guard skip `import stripe` entirely. The
    package whose absence from the deployed image is this file's own motivating
    incident was therefore the one package it could not check.

    `import stripe` from api/stripe.py resolves to the installed PyPI package,
    not to the module doing the importing: a nested file is api.stripe, and only
    backend/stripe.py or backend/stripe/ could shadow the real thing.
    """
    names = {p.stem for p in BACKEND.glob("*.py")}
    names |= {p.name for p in BACKEND.iterdir() if p.is_dir()}
    return names


# Import name -> distribution name, for the packages where they differ. Only
# needed for divergences; anything not listed is assumed to match.
_IMPORT_TO_DISTRIBUTION = {
    "jwt": "pyjwt",
    "exponent_server_sdk": "exponent-server-sdk",
    "xlsxwriter": "xlsxwriter",       # declared as XlsxWriter
    "bs4": "beautifulsoup4",
    "jose": "python-jose",
    "dotenv": "python-dotenv",
    "sklearn": "scikit-learn",
    "cv2": "opencv-python",
    "yaml": "pyyaml",
}


def _normalise(name: str) -> str:
    """PEP 503 style: case-insensitive, and - / _ / . are equivalent."""
    return re.sub(r"[-_.]+", "-", name.strip().lower())


def _declared() -> set[str]:
    """The distribution names requirements.txt actually installs.

    PARSED, not substring-matched. Every assertion in this file used to be
    `"stripe" in requirements_file_text.lower()`, and the file contains a
    fourteen-line comment explaining the stripe outage — so the word "stripe"
    was present no matter what, and the test could never fail. Same for
    "pyjwt", for the same reason: the comment describing its absence satisfied
    the check for its presence.

    Both of those are the incidents this file was written for, which means the
    two named regression tests in it were decorative from the day they were
    added.
    """
    declared: set[str] = set()
    for raw in INSTALLED_REQUIREMENTS.read_text().splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or line.startswith("-"):
            continue
        # Strip extras and any version specifier: "python-jose[cryptography]==3.3.0"
        name = re.split(r"[\[<>=!~;]", line, maxsplit=1)[0]
        if name:
            declared.add(_normalise(name))
    return declared


def _is_declared(import_name: str) -> bool:
    candidate = _IMPORT_TO_DISTRIBUTION.get(import_name.lower(), import_name)
    return _normalise(candidate) in _declared()


def _lazy_third_party_imports() -> dict[str, set[str]]:
    local = _local_modules()
    found: dict[str, set[str]] = {}
    for folder in ("api", "services"):
        for path in (BACKEND / folder).rglob("*.py"):
            for match in _LAZY_IMPORT.finditer(path.read_text(errors="replace")):
                module = match.group(1)
                if module in _STDLIB or module in local or module in _FIRST_PARTY \
                        or module.startswith("_"):
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
    assert _is_declared("jwt"), (
        "PyJWT missing from requirements.txt. verify_supabase_jwt answers "
        "503 'auth library unavailable' without it, so every authenticated "
        "endpoint fails while /health still returns 200."
    )


def test_stripe_is_declared():
    """Same reasoning: its absence is invisible until someone tries to pay."""
    assert _is_declared("stripe"), (
        "stripe missing from requirements.txt. POST /api/stripe/checkout "
        "answers 503 without it, and nothing else changes."
    )


@pytest.mark.parametrize("module", sorted(_lazy_third_party_imports()))
def test_lazily_imported_package_is_installed(module: str):
    if module in _OPTIONAL:
        pytest.skip(f"{module} is a declared-optional dependency")
    importers = ", ".join(sorted(_lazy_third_party_imports()[module]))
    assert _is_declared(module), (
        f"{module} is imported at runtime by {importers} but is not in "
        f"requirements.txt — the file the deployed image installs. The app "
        f"will boot, report healthy, and fail only on the paths that need it."
    )
