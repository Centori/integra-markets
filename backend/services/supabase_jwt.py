"""Supabase JWT verification dependency.

For endpoints called by the mobile app / dashboard (not by external
API customers), the right auth is the user's Supabase session JWT —
not an api_key Bearer token. This module provides the FastAPI
dependency `verify_supabase_jwt` that:

  1. Reads the Authorization: Bearer <jwt> header
  2. Validates the JWT signature against the Supabase JWT secret
  3. Returns the decoded claims, including `sub` (the user_id)

Endpoints add:

    auth = Depends(verify_supabase_jwt)
    user_id = auth["sub"]

This replaces the body-trust pattern where endpoints accepted
`user_id` as a request field with no verification.

Keys come from one of two places depending on how the Supabase project signs
its tokens — SUPABASE_JWT_SECRET for legacy HS256, or the project's published
JWKS (needing only SUPABASE_URL) for ES256/RS256. See _ALLOWED_ALGORITHMS.
"""

from __future__ import annotations

import logging
import os
import threading
from typing import Any, Dict, Optional

from fastapi import Header, HTTPException, Request

logger = logging.getLogger(__name__)


# Supabase signs access tokens one of two ways, and a project can switch.
#
#   HS256 — the legacy shared secret in SUPABASE_JWT_SECRET.
#   ES256 / RS256 — "JWT Signing Keys": the project holds a private key and
#                   publishes the public half at /auth/v1/.well-known/jwks.json.
#
# This project has switched to ES256, which is why every JWT-authenticated
# endpoint began answering
#
#     401 invalid token: The specified alg value is not allowed
#
# — PyJWT refusing a perfectly valid token because only HS256 was permitted.
# Both are accepted: the legacy secret keeps working for tokens still in the
# wild, and the algorithm is chosen from a fixed allowlist rather than trusted
# from the header, so no token can nominate a scheme this server did not offer.
# (The classic alg-confusion attack — signing HS256 with the published public
# key — does not apply, because the HS256 key here is a separate secret and
# never the public key.)
_ALLOWED_ALGORITHMS = frozenset({"HS256", "ES256", "RS256"})

# JWKS is fetched once and cached; a key rotation is picked up within the
# lifespan. PyJWKClient keys the cache by `kid`, so a token naming an unknown
# key triggers exactly one refetch rather than one per request.
_JWKS_LIFESPAN_S = 600

_jwks_client: Any = None
_jwks_client_url: Optional[str] = None
_jwks_lock = threading.Lock()


def _jwks_url() -> Optional[str]:
    base = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    return f"{base}/auth/v1/.well-known/jwks.json" if base else None


def _asymmetric_key(token: str) -> Any:
    """The public key that signed `token`, from the project's JWKS.

    Raises 503 rather than 401 when the JWKS cannot be reached: the caller's
    token may be perfectly good, and answering 401 would tell a user their
    session is invalid when the truth is that this server cannot check it.
    """
    global _jwks_client, _jwks_client_url

    import jwt  # PyJWT — already imported by the caller, cheap here.

    url = _jwks_url()
    if not url:
        logger.error("SUPABASE_URL not configured; cannot fetch JWKS for %s tokens", "ES256/RS256")
        raise HTTPException(status_code=503, detail="auth backend not configured")

    with _jwks_lock:
        if _jwks_client is None or _jwks_client_url != url:
            _jwks_client = jwt.PyJWKClient(url, cache_keys=True, lifespan=_JWKS_LIFESPAN_S)
            _jwks_client_url = url
        client = _jwks_client

    try:
        return client.get_signing_key_from_jwt(token).key
    except jwt.PyJWTError as exc:
        # A token naming a `kid` the project does not publish IS the caller's
        # problem — a revoked or foreign key — so that stays a 401.
        raise HTTPException(status_code=401, detail=f"invalid token: {exc}")
    except Exception as exc:  # noqa: BLE001  — network, DNS, TLS
        logger.warning("JWKS fetch from %s failed: %s", url, exc)
        raise HTTPException(status_code=503, detail="cannot reach the auth key server")


def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.removeprefix("Bearer ").strip()


async def verify_supabase_jwt(
    request: Request,
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    """FastAPI dependency: validate a Supabase JWT and return its claims.

    Raises 401 on missing / malformed / invalid / expired tokens.
    Raises 503 if the server is not configured with a JWT secret.
    """
    token = _extract_bearer(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="missing or malformed bearer token")

    try:
        import jwt  # PyJWT
    except ImportError:
        logger.error("PyJWT not installed; cannot verify Supabase JWTs")
        raise HTTPException(status_code=503, detail="auth library unavailable")

    try:
        alg = (jwt.get_unverified_header(token) or {}).get("alg", "")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"invalid token: {exc}")

    if alg not in _ALLOWED_ALGORITHMS:
        raise HTTPException(status_code=401, detail=f"unsupported token algorithm {alg!r}")

    if alg == "HS256":
        key: Any = os.environ.get("SUPABASE_JWT_SECRET")
        if not key:
            logger.error("SUPABASE_JWT_SECRET not configured; cannot verify HS256 JWTs")
            raise HTTPException(status_code=503, detail="auth backend not configured")
    else:
        key = _asymmetric_key(token)

    try:
        claims = jwt.decode(
            token,
            key,
            algorithms=[alg],
            audience="authenticated",
            options={"require": ["sub", "exp"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="token expired")
    except jwt.InvalidAudienceError:
        raise HTTPException(status_code=401, detail="invalid token audience")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"invalid token: {exc}")

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="token missing user_id")

    # Convenience field — mirror the api_key auth shape so callers can
    # treat both deps interchangeably where it makes sense.
    return {
        "user_id": user_id,
        "email": claims.get("email"),
        "claims": claims,
        "auth_type": "supabase_jwt",
    }


async def optional_supabase_jwt(
    request: Request,
    authorization: Optional[str] = Header(default=None),
) -> Optional[Dict[str, Any]]:
    """Soft-auth variant of verify_supabase_jwt.

    Returns the same claims dict when a valid JWT is present, or ``None``
    when the header is missing / empty. **Does not** raise on missing auth
    — the endpoint decides whether to reject or treat as anonymous.

    Used for endpoints that are usable-without-auth (e.g. /api/news/feed —
    Build 64 mobile calls this without a token; new builds will send one
    for tier enforcement).
    """
    if not authorization:
        return None
    try:
        return await verify_supabase_jwt(request=request, authorization=authorization)
    except HTTPException:
        # Malformed / expired token → treat as anonymous rather than 401.
        # This keeps the endpoint working for stale/broken tokens on old
        # builds; tier enforcement will apply the strictest limits.
        return None
