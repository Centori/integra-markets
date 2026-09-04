"""The error envelope is a public contract; these tests are what makes it one.

Before this, every failure returned FastAPI's default ``{"detail": "..."}``.
Consistent, but carrying no stable field — a client wanting to retry on rate
limits and re-authenticate on expiry had to string-match English prose we are
free to reword. And nothing identified a request: the only id on a response was
Railway's ``x-railway-request-id``, undocumented, absent from error bodies, and
gone the day we leave Railway.

Two rules these tests exist to defend:

  * ``error.type`` values may be ADDED but never renamed. Clients branch on
    them. Renaming one is a breaking change even though no signature moves.
  * ``detail`` stays until no client reads it. The mobile app, the dashboard
    and both SDKs consume it today.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.api_errors import (  # noqa: E402
    REQUEST_ID_HEADER,
    error_body,
    error_type_for_status,
    get_request_id,
    new_request_id,
    set_request_id,
)


class TestErrorTypes:
    @pytest.mark.parametrize("status,expected", [
        (400, "invalid_request_error"),
        (401, "authentication_error"),
        (403, "permission_error"),
        (404, "not_found_error"),
        (405, "invalid_request_error"),
        (422, "invalid_request_error"),
        (429, "rate_limit_error"),
        (500, "api_error"),
        (503, "service_unavailable_error"),
    ])
    def test_status_maps_to_a_stable_type(self, status, expected):
        """These strings are the contract. Adding is fine; renaming breaks clients."""
        assert error_type_for_status(status) == expected

    def test_401_and_403_are_distinct(self):
        """'your key is invalid' and 'your plan does not cover this' are
        different problems with different fixes, and the API already
        distinguishes them by status. The envelope must not flatten that."""
        assert error_type_for_status(401) != error_type_for_status(403)

    def test_unknown_client_status_degrades_to_a_client_type(self):
        assert error_type_for_status(418) == "invalid_request_error"

    def test_unknown_server_status_degrades_to_a_server_type(self):
        assert error_type_for_status(599) == "api_error"


class TestEnvelopeShape:
    def test_has_the_documented_shape(self):
        body = error_body(429, "monthly request limit reached", request_id="req_abc")
        assert body["type"] == "error"
        assert body["error"]["type"] == "rate_limit_error"
        assert body["error"]["message"] == "monthly request limit reached"
        assert body["error"]["request_id"] == "req_abc"

    def test_legacy_detail_is_preserved(self):
        """Dropping `detail` would break the mobile app, the dashboard and both
        SDKs on the same day. It goes when nothing reads it, not before."""
        body = error_body(401, "missing or malformed API key", request_id="req_1")
        assert body["detail"] == "missing or malformed API key"

    def test_request_id_is_reachable_at_both_levels(self):
        body = error_body(500, "boom", request_id="req_z")
        assert body["request_id"] == "req_z"
        assert body["error"]["request_id"] == "req_z"

    def test_message_is_always_a_string(self):
        """FastAPI's detail is whatever the raiser passed — a 422 hands over a
        list of pydantic dicts. `message` is documented as human prose."""
        validation = [{"loc": ["body", "hours_back"], "msg": "must be > 0", "type": "value_error"}]
        body = error_body(422, validation, request_id="req_v")
        assert isinstance(body["error"]["message"], str)
        assert "hours_back" in body["error"]["message"]
        assert "must be > 0" in body["error"]["message"]

    def test_structured_detail_stays_reachable(self):
        """Flattening a validation error into prose loses which field failed."""
        validation = [{"loc": ["body", "x"], "msg": "bad", "type": "value_error"}]
        body = error_body(422, validation)
        assert body["error"]["detail"] == validation

    def test_omits_request_id_when_there_is_none(self):
        """Outside a request — a background job — there is no id to report,
        and inventing one would be worse than omitting it."""
        set_request_id(None)
        body = error_body(500, "job failed")
        assert "request_id" not in body["error"]
        assert "request_id" not in body


class TestRequestId:
    def test_ids_are_prefixed_and_unique(self):
        a, b = new_request_id(), new_request_id()
        assert a.startswith("req_") and b.startswith("req_")
        assert a != b

    def test_id_is_hex_so_it_survives_being_retyped(self):
        """No l/1/O/0 ambiguity — these get read aloud and pasted into tickets."""
        body = new_request_id().removeprefix("req_")
        assert all(c in "0123456789abcdef" for c in body)

    def test_context_var_round_trips(self):
        set_request_id("req_ctx")
        assert get_request_id() == "req_ctx"

    def test_body_falls_back_to_the_ambient_id(self):
        """Handlers that do not thread the id explicitly still get it."""
        set_request_id("req_ambient")
        assert error_body(500, "x")["error"]["request_id"] == "req_ambient"
        set_request_id(None)

    def test_header_name_is_unprefixed(self):
        """RFC 6648 deprecated `X-` for non-standard headers."""
        assert REQUEST_ID_HEADER == "request-id"
        assert not REQUEST_ID_HEADER.lower().startswith("x-")


class TestWiring:
    """Guards on how main.py registers this, since the ordering is easy to
    get wrong and the failure is invisible in a terminal."""

    @pytest.fixture(scope="class")
    def main_src(self):
        p = os.path.join(os.path.dirname(__file__), "..", "main.py")
        return open(p).read()

    def test_all_three_handlers_are_registered(self, main_src):
        for exc in ("_StarletteHTTPException", "_ValidationError", "Exception"):
            assert f"@app.exception_handler({exc})" in main_src, exc

    def test_registered_after_cors(self, main_src):
        """Starlette applies middleware in reverse registration order, so CORS
        must be registered first to stay outermost — otherwise error responses
        carry no CORS headers and are invisible in a browser."""
        assert main_src.index("CORSMiddleware,") < main_src.index("_request_id_middleware")

    def test_raiser_headers_are_preserved(self, main_src):
        """The 429 carries Retry-After and X-RateLimit-*; a handler that
        replaces headers instead of merging them silently drops the metering
        contract."""
        assert "**(exc.headers or {})" in main_src

    def test_500_does_not_leak_internals(self, main_src):
        handler = main_src[main_src.index("_unhandled_exception_handler"):]
        assert "quote the request id" in handler
        assert "str(exc)" not in handler.split("return")[0]
