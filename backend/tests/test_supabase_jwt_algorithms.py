"""Supabase can sign access tokens two ways, and this project switched.

On 2026-09-23 every JWT-authenticated endpoint — key creation, entitlement,
Stripe checkout, notification preferences — answered

    401 invalid token: The specified alg value is not allowed

against perfectly valid sessions. The project had moved to asymmetric JWT
signing keys (ES256, published at /auth/v1/.well-known/jwks.json) while this
module still permitted HS256 alone. Nothing had changed in our code, which is
why it read as "the API is broken" rather than as an auth configuration event.

These tests pin both schemes, because the migration is not instantaneous:
tokens signed with the legacy secret stay in circulation until they expire.
"""

from __future__ import annotations

import asyncio
import base64
import json
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException

from services import supabase_jwt
from services.supabase_jwt import verify_supabase_jwt

UID = "11111111-2222-3333-4444-555555555555"
EMAIL = "owner@example.com"
SECRET = "legacy-shared-secret-long-enough-for-hmac-sha256"
KID = "219a1a33-67a8-448e-84db-bb7df3d2b383"


def _b64(value: int, length: int) -> str:
    return base64.urlsafe_b64encode(value.to_bytes(length, "big")).rstrip(b"=").decode()


@pytest.fixture
def es256_key(monkeypatch):
    """An ES256 keypair whose public half is served as the project's JWKS.

    PyJWKClient's own fetch is patched rather than the client replaced, so the
    `kid` lookup and key parsing under test are the real ones — only the
    network call is not.
    """
    private = ec.generate_private_key(ec.SECP256R1())
    numbers = private.public_key().public_numbers()
    jwks = {
        "keys": [
            {
                "kty": "EC",
                "crv": "P-256",
                "kid": KID,
                "alg": "ES256",
                "use": "sig",
                "x": _b64(numbers.x, 32),
                "y": _b64(numbers.y, 32),
            }
        ]
    }

    monkeypatch.setattr(jwt.PyJWKClient, "fetch_data", lambda self: jwks)
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    # The module memoises one client per URL; a client built by an earlier test
    # would still be holding that test's keys.
    supabase_jwt._jwks_client = None
    supabase_jwt._jwks_client_url = None
    return private


def _claims(**overrides):
    now = int(time.time())
    claims = {
        "sub": UID,
        "email": EMAIL,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": now,
        "exp": now + 600,
    }
    claims.update(overrides)
    return claims


def _verify(token: str):
    return asyncio.run(verify_supabase_jwt(request=None, authorization=f"Bearer {token}"))


def test_an_es256_token_is_accepted(es256_key):
    """The failing case, stated directly."""
    token = jwt.encode(_claims(), es256_key, algorithm="ES256", headers={"kid": KID})

    auth = _verify(token)

    assert auth["user_id"] == UID
    assert auth["email"] == EMAIL


def test_the_legacy_secret_still_works(monkeypatch):
    """Tokens signed before the migration stay valid until they expire.

    Dropping HS256 the moment the project switched would have signed out every
    open session, which is a second outage to fix the first one.
    """
    monkeypatch.setenv("SUPABASE_JWT_SECRET", SECRET)
    token = jwt.encode(_claims(), SECRET, algorithm="HS256")

    assert _verify(token)["user_id"] == UID


def test_a_token_signed_by_someone_else_is_rejected(es256_key):
    """A well-formed ES256 token from a different keypair must not verify."""
    stranger = ec.generate_private_key(ec.SECP256R1())
    token = jwt.encode(_claims(), stranger, algorithm="ES256", headers={"kid": KID})

    with pytest.raises(HTTPException) as exc:
        _verify(token)
    assert exc.value.status_code == 401


def test_an_unknown_kid_is_rejected(es256_key):
    """Naming a key the project does not publish is the caller's problem, 401."""
    token = jwt.encode(_claims(), es256_key, algorithm="ES256", headers={"kid": "not-a-key"})

    with pytest.raises(HTTPException) as exc:
        _verify(token)
    assert exc.value.status_code == 401


def test_alg_none_is_rejected(es256_key):
    """The oldest JWT attack there is, spelled out so nobody widens the list.

    The algorithm is read from the header to decide WHICH key to use, so the
    allowlist is the only thing standing between that read and a forged token.
    """
    header = base64.urlsafe_b64encode(
        json.dumps({"alg": "none", "typ": "JWT"}).encode()
    ).rstrip(b"=")
    payload = base64.urlsafe_b64encode(json.dumps(_claims()).encode()).rstrip(b"=")
    token = (header + b"." + payload + b".").decode()

    with pytest.raises(HTTPException) as exc:
        _verify(token)
    assert exc.value.status_code == 401
    assert "unsupported token algorithm" in exc.value.detail


def test_an_unreachable_key_server_is_503_not_401(monkeypatch, es256_key):
    """The distinction that cost three days on a different bug.

    401 tells the user their session is invalid. If the JWKS endpoint is
    unreachable the session may be perfectly good and this server simply cannot
    check it — which is a server fault, and must not send anyone to re-login.
    """
    def _boom(self):
        raise RuntimeError("connection reset")

    monkeypatch.setattr(jwt.PyJWKClient, "fetch_data", _boom)
    supabase_jwt._jwks_client = None
    supabase_jwt._jwks_client_url = None

    token = jwt.encode(_claims(), es256_key, algorithm="ES256", headers={"kid": KID})

    with pytest.raises(HTTPException) as exc:
        _verify(token)
    assert exc.value.status_code == 503


def test_an_expired_token_still_says_so(es256_key):
    """The message matters: 'expired' is actionable, 'invalid' is not."""
    token = jwt.encode(
        _claims(exp=int(time.time()) - 60), es256_key, algorithm="ES256", headers={"kid": KID}
    )

    with pytest.raises(HTTPException) as exc:
        _verify(token)
    assert exc.value.status_code == 401
    assert exc.value.detail == "token expired"
