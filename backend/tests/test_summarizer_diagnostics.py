"""
Regression test for a silent-failure bug found during the 2026-07 forensic
sweep (see SYSTEM_MAP.md, "Bug 7: refresh-summary errors").

POST /api/summarize/article degrades to a {"error": ..., "fallback": true}
response whenever SUMMARIZER_AVAILABLE is False (sumy/newspaper3k failed to
import) -- confirmed live in production. But the import's `except ImportError`
block swallowed the exception with zero logging, so there was no way to tell
*why* the feature was down from Railway logs. This only checks that the
import failure is now logged; it cannot verify sumy/newspaper3k are actually
installed correctly in the deployed container (that needs a live check
against POST /api/summarize/article, or a container-level dependency audit).
"""
import os

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAIN_PATH = os.path.join(BACKEND_DIR, "main_simple_nlp.py")


def _read_main():
    with open(MAIN_PATH, "r") as f:
        return f.read()


def test_summarizer_import_failure_is_logged():
    src = _read_main()
    assert "except ImportError as _summarizer_import_error:" in src, (
        "Expected the article_summarizer import to name its exception so it "
        "can be logged, not a bare `except ImportError:`."
    )
    assert "Article summarizer unavailable" in src, (
        "Expected a logger.warning call explaining SUMMARIZER_AVAILABLE=False "
        "-- without it, this failure mode is invisible in `railway logs`."
    )


def test_summarize_endpoint_still_degrades_gracefully_when_unavailable():
    src = _read_main()
    assert "if not SUMMARIZER_AVAILABLE or not article_summarizer:" in src, (
        "The /api/summarize/article handler must keep its graceful-degradation "
        "branch -- mobile's dashboardApi.getArticleSummary depends on getting "
        "back {fallback: true} rather than a 500, so it can show an "
        "'Unavailable' message instead of a hard error."
    )
