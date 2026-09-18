"""Scheduled data-freshness check — makes silent pipeline failures loud.

Why this exists
---------------
On 2026-08-14 four independent breakages were found only because a user
noticed every news card showed the same legal disclaimer. Each had been
failing for days or weeks while every liveness signal stayed green:

  * entity_mentions upserts returned HTTP 400 on every tick (unique index
    wrapped model_version in COALESCE, which PostgREST can't match to an
    ON CONFLICT clause) -> the divergence engine had no fresh input, but the
    scheduler still logged "tick ok".
  * feedparser.parse(url) was served empty by oilprice.com/eia.gov from
    datacenter IPs and sets .bozo rather than raising -> the feed silently
    collapsed to a single source.
  * article_summarizer.py was absent from main, so SUMMARIZER_AVAILABLE was
    False and the scraping path never ran.
  * A retired EIA URL 404'd three times per tick.

`/health` returned 200 throughout. Liveness checks answer "is the process
up", not "is data still flowing" — this job asserts the latter.

Contract: matches the other jobs (run() -> dict, logged by the scheduler).
Findings are logged at ERROR so they surface in Railway logs and alerting;
the returned dict is the machine-readable form.

This job never raises: a broken health check must not take the scheduler
down with it.
"""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

# A tick is 10 min; allow generous slack so a single slow fetch isn't an alarm.
ENTITY_MENTIONS_MAX_AGE_MIN = int(os.getenv("HEALTH_ENTITY_MAX_AGE_MIN", "90"))
RAW_DOCUMENTS_MAX_AGE_MIN = int(os.getenv("HEALTH_DOCS_MAX_AGE_MIN", "90"))

# The feed collapsed to one source and nobody noticed for weeks.
MIN_FEED_SOURCES = int(os.getenv("HEALTH_MIN_FEED_SOURCES", "2"))

# "summary == title" for every article is the signature of a summarizer that
# is silently unavailable.
MIN_REAL_SUMMARY_RATIO = float(os.getenv("HEALTH_MIN_REAL_SUMMARY_RATIO", "0.15"))

# Every card rendered the Integra brand mark for weeks because the API never
# sent image_url at all. The mark is the FALLBACK; it is not supposed to be the
# only thing anyone sees. RSS media fields cover Yahoo alone, so this ratio is
# carried almost entirely by the og:image capture at ingest — if that breaks,
# coverage silently returns to zero and every card looks "fine".
MIN_CARD_IMAGE_RATIO = float(os.getenv("HEALTH_MIN_CARD_IMAGE_RATIO", "0.35"))

# Share of live cards still pointing at news.google.com. The resolver turns
# those into publisher URLs at ingest; when it stops working the ratio climbs,
# and summaries, images and key drivers degrade together because all three are
# downstream of having a real page to read.
#
# Not zero: RSS occasionally yields an item the resolver legitimately cannot
# resolve, and one of those must not page anyone. A quarter of the feed means
# the mechanism is broken, not that one article is odd.
MAX_UNRESOLVED_GNEWS_RATIO = float(os.getenv("HEALTH_MAX_GNEWS_RATIO", "0.25"))

# A summary that is a bare URL or a base64-ish slug is worse than no summary:
# it renders as unreadable junk on the card. Zero tolerance — one is a bug.
MAX_URL_JUNK_SUMMARIES = int(os.getenv("HEALTH_MAX_URL_JUNK_SUMMARIES", "0"))


def run() -> Dict[str, Any]:
    """One tick. Returns {"ok": bool, "checks": {...}, "failures": [...]}."""
    checks: Dict[str, Any] = {}
    failures: List[str] = []

    for name, fn in (
        ("entity_mentions_fresh", _check_entity_mentions),
        ("raw_documents_fresh", _check_raw_documents),
        ("feed_quality", _check_feed_quality),
        ("card_content", _check_card_content),
        ("gnews_urls_resolved", _check_gnews_resolution),
        ("summarize_endpoint", _check_summarize_endpoint),
        ("tier_depth_contract", _check_tier_depth_contract),
        ("rulebook_coverage", _check_rulebook_coverage),
        ("archive_backfill_progress", _check_backfill_progress),
        ("archive_scoring_progress", _check_scoring_progress),
        ("archive_depth", _check_archive_depth),
    ):
        try:
            ok, detail = fn()
        except Exception as exc:  # noqa: BLE001 — never take the scheduler down
            ok, detail = False, {"error": f"{type(exc).__name__}: {exc}"}
        checks[name] = detail
        if not ok:
            failures.append(name)

    if failures:
        logger.error("pipeline_health: FAILING %s | %s", failures, checks)
    else:
        logger.info("pipeline_health: ok | %s", checks)

    return {"ok": not failures, "failures": failures, "checks": checks}


def _supabase():
    from services._supabase import get_supabase_client

    client = get_supabase_client()
    if client is None:
        # Real condition worth alerting on in prod (missing SUPABASE_URL/KEY);
        # locally it just means the check can't run. Either way, say so
        # plainly rather than surfacing an AttributeError from the caller.
        raise RuntimeError("supabase client unavailable (SUPABASE_URL/KEY not configured)")
    return client


def _age_minutes(iso_value: str) -> float:
    parsed = datetime.fromisoformat(str(iso_value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - parsed).total_seconds() / 60.0


def _latest_timestamp(table: str, column: str):
    resp = (
        _supabase()
        .table(table)
        .select(column)
        .order(column, desc=True)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    return rows[0][column] if rows else None


def _check_entity_mentions():
    """The divergence engine's input. Was dead for weeks behind a 400."""
    newest = _latest_timestamp("entity_mentions", "extracted_at")
    if not newest:
        return False, {"newest": None, "reason": "table empty"}
    age = _age_minutes(newest)
    return age <= ENTITY_MENTIONS_MAX_AGE_MIN, {
        "newest": newest,
        "age_min": round(age, 1),
        "max_age_min": ENTITY_MENTIONS_MAX_AGE_MIN,
    }


def _check_raw_documents():
    """Ingest itself. If this stalls, everything downstream is stale."""
    newest = _latest_timestamp("raw_documents", "published_at")
    if not newest:
        return False, {"newest": None, "reason": "table empty"}
    age = _age_minutes(newest)
    return age <= RAW_DOCUMENTS_MAX_AGE_MIN, {
        "newest": newest,
        "age_min": round(age, 1),
        "max_age_min": RAW_DOCUMENTS_MAX_AGE_MIN,
    }


def _check_feed_quality():
    """Source diversity + summary quality, straight off the live pipeline.

    Catches the two failures that produced identical-looking cards: the feed
    collapsing to one publisher, and every summary degrading to its headline.
    """
    import asyncio

    from user_news_service import UserNewsService, is_usable_summary

    async def _fetch():
        service = UserNewsService()
        return await service.get_user_based_news(
            {
                "commodities": ["oil", "gold", "wheat"],
                "regions": [],
                "keywords": [],
                "websiteURLs": [],
            }
        )

    result = asyncio.run(_fetch())
    articles = result.get("news") or result.get("articles") or []
    if not articles:
        return False, {"articles": 0, "reason": "feed returned nothing"}

    sources = {a.get("source") for a in articles if a.get("source")}
    real = sum(
        1 for a in articles if is_usable_summary(a.get("summary", ""), a.get("title", ""))
    )
    ratio = real / len(articles)

    detail = {
        "articles": len(articles),
        "sources": sorted(s for s in sources if s),
        "source_count": len(sources),
        "real_summaries": real,
        "real_summary_ratio": round(ratio, 2),
    }
    ok = len(sources) >= MIN_FEED_SOURCES and ratio >= MIN_REAL_SUMMARY_RATIO
    if not ok:
        detail["reason"] = (
            f"need >={MIN_FEED_SOURCES} sources and >={MIN_REAL_SUMMARY_RATIO} "
            f"real-summary ratio"
        )
    return ok, detail


# =====================================================================
# Archive / backfill checks
#
# The live-pipeline checks above ask "is fresh data arriving". These ask
# "is the HISTORICAL archive actually being built" — a different question
# that had no coverage at all, and which failed silently for months:
#
#   * wayback re-walked 2020→2026 every run without reading its cursor,
#     re-upserting documents that already existed. Its rows_ingested
#     counters climbed into the thousands while raw_documents gained 446
#     documents in a week, of which 2 were historical.
#   * GDELT's cursor crawled at 5 days of range per day of wall-clock,
#     putting completion in late 2027, and nothing reported that.
#   * 11,385 collected documents had never been scored into
#     entity_mentions, so a six-year archive answered every history query
#     with two months of data.
#
# Each of those looked healthy from the outside. These checks make them
# say so out loud.
# =====================================================================

# GDELT walks 3 days of range per run on a 15-minute cron. If its cursor
# hasn't moved in this long, the walk has stopped.
BACKFILL_CURSOR_MAX_AGE_H = float(os.getenv("HEALTH_BACKFILL_CURSOR_MAX_AGE_H", "6"))

# The scoring backlog must be draining. Alert if it's been static across
# this many consecutive checks' worth of time without reaching zero.
SCORING_BACKLOG_MAX_AGE_H = float(os.getenv("HEALTH_SCORING_MAX_AGE_H", "3"))

# How many days of scored history the archive should span. This is the
# check that would have caught the original defect: storage was six years
# wide while every query returned two months.
ARCHIVE_MIN_SPAN_DAYS = int(os.getenv("HEALTH_ARCHIVE_MIN_SPAN_DAYS", "180"))

# Documents marked processed that yielded no entity_mentions. A handful is
# normal (genuinely empty documents); hundreds means the scorer is discarding
# its own output. Tuned above the ~200 one bad batch produces.
MARKED_UNSCORED_MAX = int(os.getenv("HEALTH_MARKED_UNSCORED_MAX", "500"))


def _check_backfill_progress():
    """Are the backfill cursors still advancing?

    Reports every source's cursor so a single stalled source is visible
    rather than averaged away. Fails if the most recently touched cursor
    is older than the threshold — meaning the runner itself has stopped.
    """
    rows = (
        _supabase()
        .table("backfill_cursors")
        .select("source, cursor_kind, cursor_value, last_run_at")
        .order("last_run_at", desc=True)
        .limit(50)
        .execute()
    ).data or []

    if not rows:
        return False, {"reason": "no backfill cursors — runner has never checkpointed"}

    newest = rows[0].get("last_run_at")
    age_h = _age_minutes(newest) / 60.0
    detail = {
        "newest_run": newest,
        "age_hours": round(age_h, 2),
        "max_age_hours": BACKFILL_CURSOR_MAX_AGE_H,
        "cursors": {f"{r['source']}:{r['cursor_kind']}": r.get("cursor_value") for r in rows},
    }
    return age_h <= BACKFILL_CURSOR_MAX_AGE_H, detail


def _check_scoring_progress():
    """Is the archive scorer draining its backlog?

    An empty backlog is the healthy steady state. A non-empty backlog is
    only healthy if entity_mentions is still gaining rows — otherwise the
    scorer is running and achieving nothing, which is exactly how the
    unscorable-document stall would have presented.
    """
    client = _supabase()
    try:
        backlog = client.rpc("unscored_document_count", {}).execute().data
    except Exception as exc:  # noqa: BLE001
        return False, {"error": f"unscored_document_count rpc failed: {exc}",
                       "hint": "migration 20260827_raw_documents_scored_at not applied?"}

    backlog = int(backlog or 0)

    # Documents the scorer marked processed that produced no entity rows.
    #
    # This is the check that catches "the job runs and achieves nothing".
    # It exists because exactly that shipped: the scorer compared the
    # scorers' UPPERCASE label against a lowercase tuple, discarded every
    # score it computed, and marked 200 documents processed while reporting
    # ok. Freshness alone could not see it — news_fetcher keeps
    # entity_mentions fresh regardless of what the scorer does.
    try:
        empty = client.rpc("marked_but_unscored_count", {}).execute().data
        empty = int(empty or 0)
    except Exception:  # noqa: BLE001 — older DB without the helper
        empty = None

    detail: Dict[str, Any] = {"backlog": backlog, "marked_but_unscored": empty}

    # Reported, never alerted on. A document can score perfectly and still
    # match no commodity or topic — about 47% of the historical archive does
    # exactly that. It is a taxonomy-coverage number, not a fault, and the
    # first version of this check conflated the two and would have alerted
    # permanently at 5,406 against a threshold of 500.
    try:
        detail["scored_without_entity"] = int(
            client.rpc("scored_without_entity_count", {}).execute().data or 0
        )
    except Exception:  # noqa: BLE001 — optional metric
        pass

    if empty is not None and empty > MARKED_UNSCORED_MAX:
        detail["reason"] = (
            f"{empty} documents marked processed produced no entity_mentions "
            f"(> {MARKED_UNSCORED_MAX}) — the scorer is running but scoring nothing"
        )
        return False, detail

    if backlog == 0:
        detail["state"] = "drained"
        return True, detail

    # Backlog is non-empty — require recent scoring activity.
    newest_scored = _latest_timestamp("entity_mentions", "extracted_at")
    if not newest_scored:
        detail["reason"] = "backlog non-empty and nothing ever scored"
        return False, detail

    age_h = _age_minutes(newest_scored) / 60.0
    detail.update({
        "last_scored": newest_scored,
        "age_hours": round(age_h, 2),
        "max_age_hours": SCORING_BACKLOG_MAX_AGE_H,
    })
    return age_h <= SCORING_BACKLOG_MAX_AGE_H, detail


def _check_archive_depth():
    """Does the scored archive actually span a useful history?

    Queries the same axis the history endpoints use (published_at). If a
    future change re-points those queries at extracted_at, or the trigger
    is dropped, this collapses to a couple of days and says so — instead
    of the archive quietly becoming unsellable again.
    """
    client = _supabase()
    oldest = (
        client.table("entity_mentions")
        .select("published_at")
        .order("published_at", desc=False)
        .limit(1)
        .execute()
    ).data or []
    newest = (
        client.table("entity_mentions")
        .select("published_at")
        .order("published_at", desc=True)
        .limit(1)
        .execute()
    ).data or []

    if not oldest or not newest:
        return False, {"reason": "entity_mentions empty"}

    o = datetime.fromisoformat(str(oldest[0]["published_at"]).replace("Z", "+00:00"))
    n = datetime.fromisoformat(str(newest[0]["published_at"]).replace("Z", "+00:00"))
    span_days = (n - o).days

    return span_days >= ARCHIVE_MIN_SPAN_DAYS, {
        "oldest": oldest[0]["published_at"],
        "newest": newest[0]["published_at"],
        "span_days": span_days,
        "min_span_days": ARCHIVE_MIN_SPAN_DAYS,
    }


# =====================================================================
# User-facing surface checks
#
# The checks above ask "is data arriving". These ask "is what a user actually
# sees intact" — a different question, and the one that has failed most often
# here, always silently:
#
#   * Every news card rendered the Integra brand mark for weeks. The mark is a
#     FALLBACK for articles with no image; it showed on 100% of cards because
#     `image_url` was never sent at all. Nothing was down, nothing logged an
#     error, and /health stayed green.
#   * /api/summarize/article — the refresh-summary button — returns
#     {"unavailable": true} with HTTP 200 on every failure path, including when
#     ArticleSummarizer failed to import at boot. A dead button and a working
#     one are indistinguishable from outside.
#
# Both are the same class of bug as the four in this module's header: the
# system reports success while the user sees something broken.

# A bare URL, or a slug/base64 token that escaped from one. `2026-09-07_dugfy`
# and `CBMiW0FVX3lxTE5C...` are the shapes that actually turn up.
_URL_IN_TEXT_RE = re.compile(r"https?://\S+", re.IGNORECASE)
_SLUG_TOKEN_RE = re.compile(r"[A-Za-z0-9_\-]{30,}")


def _looks_like_url_junk(text: str) -> bool:
    """True when a summary is a URL or a machine token rather than prose.

    Deliberately NOT a general quality judgement — `is_usable_summary` already
    covers boilerplate, length and title-echo. This asks only the narrow
    question "would a reader see obvious machine junk on the card", which is
    the failure mode that survives every other filter because such a string is
    long enough and different enough from the title to pass them.
    """
    if not text:
        return False
    if _URL_IN_TEXT_RE.search(text):
        return True
    for token in _SLUG_TOKEN_RE.findall(text):
        # Prose does not contain 30-character unbroken tokens. Hyphenated
        # compounds and long words do exist, so require the digit/underscore
        # mix that marks a slug or an encoded id.
        if any(c.isdigit() for c in token) or "_" in token:
            return True
    return False


def _live_articles():
    """One fetch of the live feed, shared by the card-content assertions."""
    import asyncio

    from user_news_service import UserNewsService

    async def _fetch():
        service = UserNewsService()
        return await service.get_user_based_news(
            {"commodities": ["oil", "gold", "wheat"], "regions": [],
             "keywords": [], "websiteURLs": []}
        )

    result = asyncio.run(_fetch())
    return result.get("news") or result.get("articles") or []


def _check_card_content():
    """What the news card actually renders: an image, and readable summary text.

    Both assertions run off one feed fetch because they answer questions about
    the same payload, and a second live fetch per tick would double the load
    for nothing.
    """
    articles = _live_articles()
    if not articles:
        return False, {"articles": 0, "reason": "feed returned nothing"}

    with_image = sum(1 for a in articles if (a.get("image_url") or "").strip())
    ratio = with_image / len(articles)

    junk = [
        {"title": (a.get("title") or "")[:60], "summary": (a.get("summary") or "")[:120]}
        for a in articles
        if _looks_like_url_junk(a.get("summary") or "")
    ]

    detail = {
        "articles": len(articles),
        "with_image": with_image,
        "image_ratio": round(ratio, 2),
        "url_junk_summaries": len(junk),
    }
    if junk:
        detail["junk_examples"] = junk[:3]

    reasons = []
    if ratio < MIN_CARD_IMAGE_RATIO:
        reasons.append(
            f"only {round(ratio * 100)}% of cards have an image "
            f"(need >={round(MIN_CARD_IMAGE_RATIO * 100)}%) — the brand mark is "
            f"a fallback, not the design"
        )
    if len(junk) > MAX_URL_JUNK_SUMMARIES:
        reasons.append(f"{len(junk)} summaries are a URL or an encoded token")
    if reasons:
        detail["reason"] = "; ".join(reasons)
        return False, detail
    return True, detail


def _check_gnews_resolution():
    """Live cards should point at publishers, not at Google News redirects.

    This is the check that will notice when Google next changes its scheme.
    The resolver fails safe — an unresolvable article keeps its original URL —
    so a total breakage produces no errors and no exceptions anywhere. It shows
    up only as this ratio climbing, and then as summaries that restate their
    title, cards with no image, and generic key drivers, all at once, because
    every one of those needs a page that can actually be fetched.
    """
    articles = _live_articles()
    if not articles:
        return False, {"articles": 0, "reason": "feed returned nothing"}

    unresolved = [a for a in articles if "news.google.com" in (a.get("url") or "")]
    ratio = len(unresolved) / len(articles)
    detail = {
        "articles": len(articles),
        "unresolved": len(unresolved),
        "unresolved_ratio": round(ratio, 2),
    }
    if ratio > MAX_UNRESOLVED_GNEWS_RATIO:
        detail["reason"] = (
            f"{round(ratio * 100)}% of cards still link to news.google.com "
            f"(allowed <={round(MAX_UNRESOLVED_GNEWS_RATIO * 100)}%) — the "
            f"resolver has probably stopped working. Summaries, images and key "
            f"drivers all degrade from this one cause."
        )
        detail["examples"] = [(a.get("title") or "")[:60] for a in unresolved[:3]]
        return False, detail
    return True, detail


def _check_summarize_endpoint():
    """The refresh-summary button, end to end.

    It answers 200 with {"unavailable": true} for every failure — a missing
    dependency, an unreachable publisher, an unusable result — so an outage is
    invisible to any liveness probe. This calls the handler directly (no HTTP
    round trip, no reliance on the service being externally reachable) with a
    real article URL taken from the live feed.
    """
    import asyncio

    try:
        from api.summarize import SummarizeRequest, _summarizer, summarize_article
    except Exception as exc:  # noqa: BLE001
        return False, {"reason": f"api.summarize not importable: {exc}"}

    if _summarizer is None:
        # This exact condition shipped to production once already: the module
        # was absent from main, so the scraping path never ran for anyone.
        return False, {
            "summarizer_loaded": False,
            "reason": "ArticleSummarizer failed to import — the refresh-summary "
                      "button returns 'unavailable' for every user",
        }

    articles = _live_articles()
    candidates = [
        a for a in articles
        if str(a.get("url") or a.get("link") or "").startswith(("http://", "https://"))
        and "news.google.com" not in str(a.get("url") or a.get("link"))
    ][:3]
    if not candidates:
        return True, {"summarizer_loaded": True, "probed": 0,
                      "note": "no directly-linked article to probe this tick"}

    results = []
    for article in candidates:
        link = article.get("url") or article.get("link")
        try:
            payload = asyncio.run(
                summarize_article(
                    SummarizeRequest(url=link, title=article.get("title") or None)
                )
            )
        except Exception as exc:  # noqa: BLE001
            results.append({"url": link[:80], "error": f"{type(exc).__name__}: {exc}"})
            continue
        summary = payload.get("summary") or ""
        results.append({
            "url": link[:80],
            "unavailable": bool(payload.get("unavailable")),
            "chars": len(summary),
            "url_junk": _looks_like_url_junk(summary),
        })

    usable = [r for r in results if not r.get("unavailable") and not r.get("error")]
    junk = [r for r in results if r.get("url_junk")]

    detail = {
        "summarizer_loaded": True,
        "probed": len(results),
        "usable": len(usable),
        "results": results,
    }

    # Individual articles legitimately fail (paywalls, hostile publishers), so
    # the bar is "at least one worked" rather than "all worked". Zero out of
    # three is the signature of a broken feature, not bad luck.
    if not usable:
        detail["reason"] = ("every probed article returned 'unavailable' — the "
                            "refresh-summary button is failing for users")
        return False, detail
    if junk:
        detail["reason"] = f"{len(junk)} summaries came back as a URL or encoded token"
        return False, detail
    return True, detail


def _check_tier_depth_contract():
    """The paid ladder still grants what it sells.

    Every gate in the depth system fails in the invisible direction: a clamp
    returns LESS data rather than erroring, so a tier quietly losing its
    allowance looks like a slow week in the market. Same shape as the four
    failures in this module's header, and as the brand mark showing on 100% of
    cards — the system reports success while the customer gets less.

    Three properties, none needing a network call:

      1. No drift. api_trial / api_basic / api_history are defined in BOTH
         tier_enforcement (drives clamp_hours_back, used by /v1/sentiment and
         the feed) and entitlement (drives the depth gates, used by export).
         Two literals for one policy is how they diverge, and which one applied
         would depend on the path a request happened to take.
      2. The ladder ascends. A paid tier must never reach less far than the one
         below it — which is what a careless env override produces.
      3. Export never exceeds query. Being able to download what you may not
         read is the two-axis split inverted.
    """
    from services.entitlement import export_depth_days, query_depth_days
    from services.tier_enforcement import limits_for

    tiers = ("api_trial", "api_basic", "api_history")
    detail = {
        t: {
            "query": query_depth_days(t),
            "export": export_depth_days(t),
            "clamp": limits_for(t).history_days,
        }
        for t in tiers
    }

    problems = []
    for t in tiers:
        d = detail[t]
        if d["clamp"] != d["query"]:
            problems.append(
                f"{t}: tier_enforcement says {d['clamp']}d, entitlement says {d['query']}d"
            )
        if d["export"] > d["query"]:
            problems.append(
                f"{t}: export depth {d['export']}d exceeds query depth {d['query']}d"
            )

    for lower, upper in zip(tiers, tiers[1:]):
        if detail[upper]["query"] < detail[lower]["query"]:
            problems.append(
                f"{upper} queries less deeply ({detail[upper]['query']}d) than "
                f"{lower} ({detail[lower]['query']}d)"
            )

# How much of the live feed the directional rulebook can actually speak about.
# Both failures this guards against are silent: an article that resolves to no
# commodity, and one that resolves but matches no rule, are scored on prose tone
# alone and look completely normal on the card.
MIN_COMMODITY_RESOLUTION = float(os.getenv("HEALTH_MIN_COMMODITY_RESOLUTION", "0.45"))
MIN_RULEBOOK_SIGNAL_RATIO = float(os.getenv("HEALTH_MIN_RULEBOOK_SIGNAL", "0.20"))


def _check_rulebook_coverage():
    """Is the directional rulebook still reaching live articles?

    Two regressions this catches, both of which degrade quietly to tone-only
    scoring rather than erroring:

      * ROUTING. `normalize_commodity` decides which rulebook runs. It once
        matched bare substrings -- "Goldman Sachs" resolved to gold, "Las Vegas"
        to gas -- and tightening it to word boundaries could equally overshoot,
        leaving articles resolving to nothing at all. Either way the card looks
        fine and the direction comes from prose tone.
      * VOCABULARY. Patterns were written in the present tense while news is
        written in the past, so "inventories rose" missed a rule matching
        "rise". An article can route to the right market and still match
        nothing.

    Also asserts the invariant that mirror pairs weigh the same, because an
    asymmetry there is a directional prior applied to every future article.
    """
    articles = _live_articles()
    if not articles:
        return False, {"articles": 0, "reason": "feed returned nothing"}

    try:
        import main_simple_nlp as nlp
    except Exception as exc:  # noqa: BLE001
        return False, {"reason": f"main_simple_nlp not importable: {exc}"}

    resolved = 0
    with_signal = 0
    markets: Dict[str, int] = {}
    for article in articles:
        text = f"{article.get('title', '')}. {article.get('summary', '')}"
        try:
            commodity = nlp.normalize_commodity(None, text)
            if not commodity:
                continue
            resolved += 1
            markets[commodity] = markets.get(commodity, 0) + 1
            fundamental = nlp.analyze_fundamental_direction(text, commodity)
            if fundamental.get("matched_signals"):
                with_signal += 1
        except Exception:  # noqa: BLE001 — one bad article must not fail the tick
            continue

    total = len(articles)
    detail = {
        "articles": total,
        "resolved_to_commodity": resolved,
        "resolution_ratio": round(resolved / total, 2),
        "with_rulebook_signal": with_signal,
        "signal_ratio": round(with_signal / total, 2),
        "markets_seen": dict(sorted(markets.items(), key=lambda kv: -kv[1])[:8]),
    }

    problems = []
    if detail["resolution_ratio"] < MIN_COMMODITY_RESOLUTION:
        problems.append(
            f"only {round(detail['resolution_ratio'] * 100)}% of articles resolve to a "
            f"commodity (need >={round(MIN_COMMODITY_RESOLUTION * 100)}%) — routing may "
            f"have overshot, and unresolved articles are scored on tone alone"
        )
    if detail["signal_ratio"] < MIN_RULEBOOK_SIGNAL_RATIO:
        problems.append(
            f"only {round(detail['signal_ratio'] * 100)}% match any rulebook signal "
            f"(need >={round(MIN_RULEBOOK_SIGNAL_RATIO * 100)}%) — the rulebook is not "
            f"reaching real articles"
        )

    unbalanced = [
        f"{a}={nlp.signal_weight(a)} vs {b}={nlp.signal_weight(b)}"
        for a, b in getattr(nlp, "_MIRROR_PAIRS", ())
        if nlp.signal_weight(a) != nlp.signal_weight(b)
    ]
    if unbalanced:
        detail["unbalanced_mirrors"] = unbalanced
        problems.append(
            f"{len(unbalanced)} mirror pair(s) weigh differently — a directional "
            f"prior applied to every future article"
        )

    if problems:
        detail["reason"] = "; ".join(problems)
        return False, detail
    return True, detail
