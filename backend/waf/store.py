"""Supabase reads and writes for the WAF module. The only file that knows table names.

Reads that feed an aggregate go through services.pagination.fetch_all and return
`truncated`, so a capped answer is labelled rather than presented as complete.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple

from services.archive_writer import ACTIVE_MODEL_NAME, ACTIVE_MODEL_VERSION
from services.pagination import fetch_all
from waf.taxonomy import Tags
from waf.vessels import PortPosition, TankerPosition

# Document reads go by id in chunks: 150 UUIDs keep the request URL near 6 KB.
ID_CHUNK = 150
MAX_TAG_ROWS = 50_000

_DOC_COLUMNS = (
    "id, source, url, title, content, published_at, fetched_at,"
    " waf_document_tags(tag_type, tag),"
    " sentiment_scores(sentiment, score, confidence, model_name, model_version)"
)


def known_urls(supabase: Any, source: str) -> Set[str]:
    rows, _ = fetch_all(
        lambda s, e: supabase.table("raw_documents").select("url").eq("source", source).range(s, e)
    )
    return {r["url"] for r in rows}


def document_ids(supabase: Any, source: str, urls: Sequence[str]) -> Dict[str, str]:
    """url -> raw_documents.id for documents just persisted."""
    if not urls:
        return {}
    rows = (supabase.table("raw_documents").select("id, url")
            .eq("source", source).in_("url", list(urls)).execute()).data or []
    return {r["url"]: r["id"] for r in rows}


def recent_documents(supabase: Any, since: datetime) -> Tuple[List[Dict], bool]:
    """Archive documents fetched since `since`, untagged or not — the tagger's input."""
    return fetch_all(
        lambda s, e: supabase.table("raw_documents")
        .select("id, source, url, title, content, published_at")
        .gte("fetched_at", since.isoformat()).order("fetched_at").range(s, e)
    )


def upsert_tags(supabase: Any, document_id: str, tags: Tags) -> int:
    rows = [{"document_id": document_id, "tag_type": t, "tag": v} for t, v in tags.as_rows()]
    if rows:
        supabase.table("waf_document_tags").upsert(rows, on_conflict="document_id,tag_type,tag").execute()
    return len(rows)


def tagged_documents(supabase: Any, start: datetime, end: datetime,
                     tag_type: Optional[str] = None, tag: Optional[str] = None,
                     max_rows: int = 5000) -> Tuple[List[Dict], bool]:
    """WAF-tagged documents published in [start, end), newest first. No look-ahead.

    Two steps, tags table first. The previous single query inner-joined
    raw_documents (the whole archive) to the tags and scanned every document
    in the window; over 90 days that ran past the statement timeout and the
    endpoint answered 500. Filtering on the embedded tag also trimmed each
    document's tags to the one filtered on, so a PMS query lost its grades.

    `tagged_at >= start` is a safe pre-filter: a document is tagged after it
    is published, so anything published in the window was tagged after its
    start. Backfill-tagged documents only widen the superset, never drop rows.
    """

    def ids_query(s: int, e: int):
        query = supabase.table("waf_document_tags").select("document_id").gte("tagged_at", start.isoformat())
        if tag_type:
            query = query.eq("tag_type", tag_type)
        if tag:
            query = query.eq("tag", tag)
        return query.order("tagged_at", desc=True).range(s, e)

    id_rows, truncated = fetch_all(ids_query, max_rows=MAX_TAG_ROWS)
    ids = list(dict.fromkeys(r["document_id"] for r in id_rows))
    docs: List[Dict] = []
    for i in range(0, len(ids), ID_CHUNK):
        docs.extend(
            (supabase.table("raw_documents").select(_DOC_COLUMNS).in_("id", ids[i:i + ID_CHUNK])
             .gte("published_at", start.isoformat()).lt("published_at", end.isoformat())
             .execute()).data or []
        )
        # ids are newest-tagged first, so an early stop keeps the most recent
        # documents; only list endpoints with a small limit ever trigger it.
        if len(docs) > max_rows:
            truncated = True
            break
    docs.sort(key=lambda r: r.get("published_at") or "", reverse=True)
    truncated = truncated or len(docs) > max_rows
    return [_flatten(r) for r in docs[:max_rows]], truncated


def _flatten(row: Dict) -> Dict:
    """Group tags by type and pick the active model's score; every other key kept."""
    out = dict(row)
    tags: Dict[str, List[str]] = {}
    for t in row.get("waf_document_tags") or []:
        tags.setdefault(t["tag_type"], []).append(t["tag"])
    out["tags"] = {k: sorted(v) for k, v in tags.items()}
    out.pop("waf_document_tags", None)
    scores = [s for s in row.get("sentiment_scores") or []
              if s.get("model_name") == ACTIVE_MODEL_NAME and s.get("model_version") == ACTIVE_MODEL_VERSION]
    out["sentiment"] = scores[0] if scores else None
    out.pop("sentiment_scores", None)
    return out


def upsert_port_position(supabase: Any, position: PortPosition, document_id: Optional[str]) -> None:
    row = position.as_row() | {"document_id": document_id}
    supabase.table("waf_port_positions").upsert(row, on_conflict="source_url").execute()


def port_positions(supabase: Any, start: date, end: date) -> List[PortPosition]:
    rows, _ = fetch_all(
        lambda s, e: supabase.table("waf_port_positions").select("*")
        .gte("report_date", start.isoformat()).lt("report_date", end.isoformat())
        .order("report_date").range(s, e)
    )
    return [
        PortPosition(
            report_date=date.fromisoformat(r["report_date"]) if r.get("report_date") else None,
            expected=r["expected"], waiting=r["waiting"], discharging=r["discharging"],
            products=r.get("products") or {}, product_counts=r.get("product_counts") or {},
            source_url=r["source_url"],
        )
        for r in rows
    ]


def upsert_tanker_positions(supabase: Any, positions: Iterable[TankerPosition]) -> int:
    rows = [p.as_row() for p in positions]
    if rows:
        supabase.table("waf_tanker_positions").upsert(
            rows, on_conflict="source,vessel_name,product,arrival_date").execute()
    return len(rows)


def tanker_positions(supabase: Any, since: datetime, sources: Sequence[str]) -> List[Dict]:
    if not sources:
        return []
    rows, _ = fetch_all(
        lambda s, e: supabase.table("waf_tanker_positions").select("*")
        .gte("observed_at", since.isoformat()).in_("source", list(sources))
        .order("observed_at", desc=True).range(s, e)
    )
    return rows


# --------------------------------------------------------------------- reports

def get_report(supabase: Any, report_id: str) -> Optional[Dict]:
    rows = (supabase.table("waf_reports").select("*").eq("report_id", report_id).limit(1).execute()).data
    return rows[0] if rows else None


def save_report(supabase: Any, row: Dict) -> None:
    supabase.table("waf_reports").upsert(row, on_conflict="report_id").execute()


def mark_published(supabase: Any, report_id: str, published_at: datetime, push_result: Dict) -> None:
    (supabase.table("waf_reports")
     .update({"published_at": published_at.isoformat(), "push_result": push_result})
     .eq("report_id", report_id).execute())


def record_push_result(supabase: Any, report_id: str, push_result: Dict) -> None:
    """Record a delivery decision without publishing (e.g. a withheld empty report)."""
    supabase.table("waf_reports").update({"push_result": push_result}).eq("report_id", report_id).execute()


def pipeline_counts(supabase: Any, since: datetime, waf_sources: Sequence[str]) -> Dict[str, Any]:
    """Counts for /health/waf: is anything arriving, and is anything being tagged?"""

    def count(query) -> Optional[int]:
        return query.limit(1).execute().count

    latest = (supabase.table("raw_documents").select("fetched_at")
              .order("fetched_at", desc=True).limit(1).execute()).data
    latest_tag = (supabase.table("waf_document_tags").select("tagged_at")
                  .order("tagged_at", desc=True).limit(1).execute()).data
    return {
        "archive_docs_fetched_since": count(
            supabase.table("raw_documents").select("id", count="exact").gte("fetched_at", since.isoformat())),
        "waf_source_docs_fetched_since": count(
            supabase.table("raw_documents").select("id", count="exact")
            .gte("fetched_at", since.isoformat()).in_("source", list(waf_sources))),
        "waf_tags_since": count(
            supabase.table("waf_document_tags").select("document_id", count="exact")
            .gte("tagged_at", since.isoformat())),
        "npa_positions_total": count(supabase.table("waf_port_positions").select("id", count="exact")),
        "latest_archive_fetch": latest[0]["fetched_at"] if latest else None,
        "latest_tag": latest_tag[0]["tagged_at"] if latest_tag else None,
    }


def list_reports(supabase: Any, start: Optional[datetime], end: Optional[datetime],
                 published_only: bool = True, limit: int = 52) -> List[Dict]:
    query = supabase.table("waf_reports").select("report_id, week_start, cutoff, version, published_at, payload")
    if published_only:
        query = query.not_.is_("published_at", "null")
    if start:
        query = query.gte("cutoff", start.isoformat())
    if end:
        query = query.lte("cutoff", end.isoformat())
    return (query.order("cutoff", desc=True).limit(limit).execute()).data or []
