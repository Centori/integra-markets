"""Write the committed customer-facing OpenAPI spec from a live schema dump.

    curl -s https://api.integramarkets.app/openapi.json > live_openapi.json
    python3 scripts/build_openapi_spec.py

The filtering itself no longer lives here. It moved to
`backend/services/openapi_public.py` so the API serves the same spec this script
writes — they had to agree about which paths are public, what the operation IDs
are and what the security scheme is called, and "had to agree" between a build
script and a runtime path is a drift waiting to happen. It had already drifted
once: the committed openapi.json described 29 paths, ZERO of them under /v1,
plus 21 routes that no longer existed, and both SDKs were generated from it —
which is why neither had a single method for the product being sold.

This script is now a thin wrapper kept for two reasons: it produces the
committed artifact that can be diffed in review, and it fails loudly if the
live deployment stops serving a recognisable public surface.

Idempotent with respect to the input. Filtering an already-filtered spec is a
no-op, so this works against both a deployment that serves the full schema and
one that serves the filtered one.
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from services.openapi_public import filter_to_public  # noqa: E402
from services.openapi_security import apply_security  # noqa: E402

LIVE = "live_openapi.json"
OUT = "openapi.json"

if not os.path.exists(LIVE):
    sys.exit(
        f"{LIVE} not found. Fetch it first:\n"
        f"  curl -s https://api.integramarkets.app/openapi.json > {LIVE}"
    )

with open(LIVE) as handle:
    live = json.load(handle)

incoming = len(live.get("paths") or {})

try:
    spec = apply_security(filter_to_public(live))
except ValueError as exc:
    sys.exit(str(exc))

with open(OUT, "w") as handle:
    json.dump(spec, handle, indent=2)
    handle.write("\n")

paths = spec["paths"]
print(f"wrote {OUT}")
print(f"  read:    {incoming} paths from {LIVE}")
print(f"  paths:   {len(paths)}")
print(f"  schemas: {len(spec['components']['schemas'])}")
missing = [
    f"{method.upper()} {path}"
    for path, ops in sorted(paths.items())
    for method, op in ops.items()
    if isinstance(op, dict) and method in ("get", "post", "put", "patch", "delete")
    and not op.get("operationId", "").islower()
]
for path in sorted(paths):
    print("   ", path)
if missing:
    # Not fatal: an unpinned operationId generates an ugly method name, it does
    # not break anything. Worth saying, because the fix is one line in
    # openapi_public.OPERATION_IDS and nobody will notice otherwise.
    print("\n  unpinned operationIds (add to openapi_public.OPERATION_IDS):")
    for item in missing:
        print("   ", item)
