# Canonical Ingest Schema

Normalize all incoming items to a single schema before running sentiment. Fields not applicable to your data can be omitted.

## ArticleInput
- `id` (string, optional): client-provided unique id for idempotency.
- `source` (string, required): vendor/source name (e.g., `bloomberg`, `platts`).
- `source_id` (string, optional): vendor’s item id.
- `title` (string, optional)
- `summary` (string, optional)
- `body` (string, optional): full text; omit if license disallows storage.
- `tickers` (string[], optional): instruments/symbols.
- `topics` (string[], optional): tags like sectors, events.
- `language` (string, optional, default `en`)
- `category` (string, optional, e.g., `news|research|tweet`)
- `time_published` (string, required): ISO‑8601 UTC with `Z` (e.g., `2026-03-04T15:12:00Z`).
- `url` (string, optional)
- `meta` (object, optional): arbitrary metadata (`entitlements`, `region`, `provider`, etc.).

At least one of `title`, `summary`, or `body` must be present. `time_published` must be UTC.

## Example
```json
{
  "source": "platts",
  "source_id": "PLT-12345",
  "title": "OPEC discusses output adjustments",
  "summary": "Delegates signal cautious approach",
  "tickers": ["CL=F","XOM"],
  "topics": ["Energy","OPEC"],
  "time_published": "2026-03-04T15:12:00Z",
  "url": "https://example.com/story"
}
```

## Server Behavior
- UTC normalization: naive datetimes are treated as UTC; `Z` is enforced in responses.
- Text for analysis is constructed from available fields (e.g., `title + summary`, or `body` if present).
- Unparseable timestamps are skipped from processing.
- Deduplication uses `source+source_id` when present, otherwise a hash of `title + time_published`.