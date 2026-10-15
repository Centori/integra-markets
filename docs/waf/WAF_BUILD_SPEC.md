# Integra Markets — WAF Desk Module
Build prompt for Claude Code + trader-facing Claude pre-prompt

---

## PART 0 — What changed vs. the original note

1. **Turned a wishlist into a spec.** Claude Code builds best from explicit sources, schemas, endpoints and acceptance tests, not a list of topics.
2. **Fixed entity names** (worth confirming): "Mamman" → **MEMAN** (Major Energies Marketers Association of Nigeria); "OTL mining week" read as **OTL Africa Downstream Week** + **Nigeria Mining Week**; "NURPC" → **NUPRC**; "gamer prices" → **gantry / ex-depot prices**; "Techno" → **Techno Oil**. Added **NMDPRA** — it publishes truck-out and supply data, which is the demand side of the balance you want.
3. **Separated three products** that were mixed together: (a) WAF news & sentiment feed, (b) cargo/vessel balance model, (c) the trader-facing Claude experience.
4. **Made the "glut vs shortage" call quantitative and auditable**: days-of-cover, congestion and price confirmation, not a vibe score.
5. **Added provenance, dedup and confidence** — a Trafigura desk will ignore any number it can't trace to a source.
6. **Scale check from your own example:** PIS SUMATERA's 27,000 MT of PMS ≈ 36 million litres (density ~0.74) — under one day of Nigerian petrol demand. Single-cargo headlines mean nothing without a demand denominator, which is why the balance model matters.

---

## PART 1 — Build prompt for Claude Code (paste as-is)

```
You are extending the Integra Markets platform (existing sentiment API + MCP server with
tools get_sentiment, get_sentiment_history, market_brief, find_emerging_narratives,
screen_high_conviction_markets, list_commodities, compare_human_vs_ai).

GOAL
Build a "WAF" (West Africa) module: a region-scoped news/sentiment feed, a Nigerian
downstream cargo-balance model, and API + MCP endpoints exposing both. Target users are
physical crude and products traders (e.g. Trafigura WAF desk). Every output must carry
source URLs, timestamps and a confidence score.

PHASE 0 — FREE PROOF-OF-CONCEPT SOURCE STACK (build first; no licence needed)
Stands in for petroleumprice.ng until a data licence is signed. Only RSS feeds,
official publications and documented APIs; respect robots.txt.
  Vessels:  NPA "Daily Shipping Position" as reprinted daily by NAN / Daily Trust /
            shippingposition.com.ng (counts by status — expected / waiting / discharging
            — and by product: petrol, diesel, aviation fuel, LPG, crude). Parse counts
            per product per day. No receiver or tonnage — label as such.
            Optional: aisstream.io websocket (free key, beta, non-commercial free tier)
            with bounding boxes over Lagos anchorage, Lekki and the Dangote SPM.
  Demand:   NMDPRA monthly factsheet (consumption = truck-out, supply, days of
            sufficiency). 2026 benchmarks: PMS 50 ML/d, AGO 14 ML/d, ATK 3 ML/d —
            used as the consumption baseline C until a monthly factsheet value exists.
  Prices:   Integra's own import-parity model = EIA free gasoline/ULSD spot + CBN NFEM
            FX + freight/port-charge assumptions (config). Dangote ex-depot and NNPC
            pump price changes from news; NMDPRA monthly state retail averages.
  News:     outlet RSS (Punch, Vanguard, BusinessDay, Premium Times, Nairametrics,
            Guardian NG), Google News RSS keyword queries, GDELT for multi-year backfill.
  Rule:     articles that cite petroleumprice.ng numbers are stored headline + link only.

PHASE 1 — INGESTION
Sources (prefer RSS/sitemaps; respect robots.txt and site terms; no paywall bypass):
  V1 LAUNCH SOURCES (build and validate these first, add the rest after):

  A) MEMAN — Major Energies Marketers Association of Nigeria (site: https://moman.org;
     meman.org.ng redirects there; do NOT use meman.com.ng, it disallows bots)
     Trigger: poll RSS https://moman.org/feed/ every 30 min (WordPress, hourly updates).
       RSS items carry title, link, pubDate, category only (no body). Use guid as the
       dedup key; new guid → fetch the post page.
     Bulletin watcher: the Daily Competency Centre Bulletin is NOT in the RSS feed.
       Poll the homepage "Download Bulletin" link and
       https://moman.org/competency-centre/industry-competency-centre-bulletin/ daily
       at 09:00, 13:00, 17:00 WAT; new PDF URL (pattern
       /wp-content/uploads/YYYY/MM/CC-Bulletin-*.pdf) → download.
     Fetch & parse:
       - From the post page, collect linked PDFs (wp-content/uploads) and Google Drive
         share links (convert /file/d/{id}/view → direct download URL).
       - Store original PDF + sha256; skip if hash already seen.
       - Extract text with pdfplumber/PyMuPDF; fall back to OCR (Tesseract) when a page
         has <50 chars of text. Extract tables (camelot/pdfplumber) for price/volume data.
       - Split into sections by headings; keep page numbers for citations.
     Document types (map by RSS category / URL):
       energy_digest       ~2x/month   → narrative + market commentary
       market_analysis     monthly, ~5–6 wk lag → structured figures (prices, volumes)
       cc_bulletin         daily       → largely aggregated press news: run through
                                        dedup against other sources; tag source=
                                        "MEMAN bulletin (aggregated)" and follow the
                                        original outlet link where present
       industry_data_sheet weekly (appears stalled since Dec 2025) → monitor; alert if
                                        it resumes
       press_release       ad hoc      → HIGH PRIORITY: member stock/supply statements
                                        are direct supply signals (e.g. "significant
                                        stocks", "no outages expected") — tag
                                        supply_signal=true and feed the balance model
     Credibility: tier 1 for press releases and market analysis; tier 2 for bulletin.
     Attribution: every item shows "Source: MEMAN" + link. Seek a light written
     attribution agreement (info@meman.org.ng); site publishes no terms of use.
     Backfill: page through /feed/?paged=N and category archive pages to 24 months.

  B) petroleumprice.ng — LICENCE-GATED. Terms prohibit reproducing, copying, reselling
     or exploiting any part of the service without express written permission; no
     public RSS or API. Do NOT scrape. Build the adapter behind a feature flag
     (PPNG_LICENSED=false by default) with three modes:
       mode=licensed_feed  (target) — API/SFTP/email feed agreed in the licence:
            depot/ex-depot prices by depot & product, tanker positions (vessel,
            product, MT, receiver, jetty, arrival/berth dates, status), landing cost,
            daily intelligence report. Map straight into the vessel and price schemas.
       mode=email_ingest  (interim, INTERNAL USE ONLY until licensed) — Enterprise
            subscription delivers daily intelligence + tanker position reports by
            email. Route to a dedicated inbox (e.g. ppng@ingest.integramarkets…),
            parse PDF/email body with the same PDF pipeline as MEMAN. Data may feed
            internal models and the private Trafigura demo, but must NOT be exposed in
            public API responses, push cards or the weekly report while
            PPNG_LICENSED=false. Enforce with a source-level redistribution flag
            checked in the API serializer.
       mode=historical_import — one-off historical depot price exports (by date range,
            location, product) bought from their site, loaded as CSV/XLSX for the
            24-month backfill; same redistribution flag applies.
     Public headlines: their free news articles may be indexed as headline + link
     only (title, date, URL, our own one-line summary) — no article text stored or
     shown — until a licence covers more.
     When licensed: set PPNG_LICENSED=true, record licence scope (fields, display
     rights, attribution text) in source config, and the serializer applies it.
  Tier 1 (Nigeria energy-specific): petroleumprice.ng, MEMAN, NUPRC (nuprc.gov.ng), NMDPRA,
    NNPC Ltd press releases, Dangote Group/Dangote Petroleum Refinery releases
  Tier 2 (national press): ThisDay, BusinessDay, Punch, The Guardian (NG), Daily Trust,
    Vanguard, Premium Times, Nairametrics, The Nation
  Tier 3 (regional/events): OTL Africa Downstream Week, Nigeria Mining Week,
    Ghana/ Senegal/ Côte d'Ivoire/ Cameroon/ Angola energy press
  Pluggable adapters for licensed partner feeds later (Argus, Platts, Kpler, Reuters).
Store raw docs with: source, tier, url, published_at, fetched_at, title, body_hash.
Deduplicate near-identical stories (MinHash/simhash) and keep a "syndicated_by" list —
Nigerian outlets heavily reprint the same press release.

PHASE 2 — TAXONOMY & TAGGING
Tag each doc with zero or more of:
  geography: NG, GH, CI, SN, CM, GQ, CG, AO, WAF_GENERAL
  segment: upstream, midstream, downstream, refining, mining, fx_macro, regulation, security
  entities: NNPC Ltd, NUPRC, NMDPRA, Dangote Refinery, Port Harcourt/Warri/Kaduna refineries,
    NIPCO, MRS, Ardova, Conoil, TotalEnergies Marketing, Techno Oil, Stockgap, AA Rano,
    Bovas, Matrix, Pinnacle, IPMAN, DAPPMAN, MOMAN, PENGASSAN, NUPENG, CBN, Ministry of
    Solid Minerals, Ministry of Petroleum Resources (extend via config)
  products: PMS, AGO, DPK/ATK, LPG, fuel oil, naphtha
  crude grades (exact + fuzzy match, case-insensitive, handle "Bonny Lt"):
    NG: Bonny Light, Qua Iboe, Forcados, Brass River, Escravos, Bonga, Agbami, Akpo,
        Erha, Usan, Egina, Amenam, Yoho, Okwori, Okono, Abo, Pennington, Antan, Ima,
        Ukpokiti, EA, Aje, Utapate, Otakikpo, Cawthorne, Nembe, Anyala Madu
    WAF: Jubilee, TEN, Sankofa (GH); Baleine (CI); Sangomar (SN); Kole (CM);
        Zafiro, Ceiba (GQ); Djeno (CG); Girassol, Dalia, Cabinda, Pazflor, Clov (AO)
  topics: OSP/differential changes, crude-for-loan/prepay, Dangote crude supply & naira-for-
    crude, Dangote product exports, import permits, pipeline vandalism/force majeure,
    production & export volumes, FX/naira, subsidy/pricing, strikes, port congestion
Keep grade list and entity list in YAML config so they can be extended without redeploy.

PHASE 3 — SENTIMENT
Reuse the existing sentiment model, but score per (entity|grade|product, direction):
  - price direction: bullish / bearish / neutral for the tagged instrument
  - supply direction: tightening / loosening
  - confidence 0–1, weighted by source tier and number of independent (non-syndicated)
    sources
Output a daily WAF sentiment index per product and per crude grade family.

PHASE 4 — VESSEL / CARGO PARSER
Parse petroleumprice.ng vessel-arrival posts (and similar) into structured rows. Example
input:
  "PIS SUMATERA - PMS / Quantity: 27,000 MT / Arrival Date: 01 OCT-26 / Jetty: New Oil /
   Berth Date: 01 OCT-26 / Receiver: NIPCO / Remarks: Discharging in progress"
Schema:
  vessel_name, imo (resolve later), product, quantity_mt, quantity_litres (convert:
  PMS 0.74, AGO 0.85, DPK 0.80, LPG ~0.54 kg/L — configurable), port (Lagos, Calabar,
  Port Harcourt, Warri, Onne...), jetty, receiver, arrival_date, berth_date, status
  (anchorage | berthed | discharging | discharged | loading | sailed), direction
  (import | export | coastal), source_url, post_date
Status rules: "Discharging in progress" → discharging; no berth date → anchorage; etc.
Deduplicate the same vessel across posts and track status changes over time
(arrival → berth → sailed) so waiting time and discharge time can be computed.
Treat Dangote outbound loadings and coastal shuttles as separate flows.
Flag that these lists are partial; leave an adapter to reconcile against AIS data.

PHASE 5 — SUPPLY BALANCE MODEL (per product, mainly PMS and AGO)
Inputs (rolling 7- and 14-day windows):
  I  = import volume discharged + berthed (litres)
  Q  = volume waiting at anchorage (litres) and count of vessels waiting
  D  = Dangote domestic supply (truck-out/coastal), from NMDPRA or reported figures
  X  = exports loaded (e.g. Dangote PMS exports)
  C  = daily consumption baseline — from NMDPRA truck-out data; configurable fallback
       value, must be labelled "estimate" whenever used
  S  = reported depot/national stock if available
Metrics:
  days_of_cover      = (S + I + D − X) / C          (if S missing, use flow-only version
                                                    and say so)
  inflow_ratio       = (I + D − X) / (C × window_days)   >1 = adding supply
  congestion_index   = vessels at anchorage × avg waiting days; flag if waiting days
                       > 5 or > 2× trailing 30-day average
  price_confirmation = gantry/ex-depot price vs import parity:
                       ex-depot below parity and falling → supports glut call
                       ex-depot above parity and rising → supports shortage call
Composite Supply Score (−100 shortage … +100 glut):
  weighted z-scores of days_of_cover, inflow_ratio and price_confirmation
  (start 0.4/0.3/0.3, tune by backtest), sentiment index as a tie-breaker only.
Status labels:
  > +50 GLUT  | +20..+50 COMFORTABLE | −20..+20 BALANCED | −50..−20 TIGHT | < −50 SHORTAGE RISK
  plus independent flag: CONGESTION
Every status must show its drivers ("PMS: TIGHT (−34). Days of cover ~6 vs 10-day avg;
2 cargoes waiting; ex-depot ₦X above import parity, rising 3 days.")

PHASE 6 — PRICES
Ingest from petroleumprice.ng and press: gantry/ex-depot prices by depot zone, pump
prices, Dangote ex-refinery price, NNPC retail price, import parity / landing cost,
crude netbacks for key Nigerian grades vs Dated Brent. Compute parity from Platts/Argus
when licensed; otherwise mark published figures with their source.

PHASE 7 — BACKFILL
Backfill 24 months of WAF headlines, vessel posts and prices. Run the balance model
historically and test: did TIGHT/SHORTAGE calls precede ex-depot price rises or reported
queues within 7–14 days? Report hit rate and lead time; use this to set weights.

PHASE 8 — API & MCP
REST:
  GET /v1/waf/headlines?country=&segment=&entity=&grade=&product=&since=
  GET /v1/waf/sentiment?product=|grade=&window=
  GET /v1/waf/vessels?product=&port=&status=&since=
  GET /v1/waf/balance?product=PMS|AGO&window=7d|14d
  GET /v1/waf/prices?product=&type=gantry|parity|netback
  GET /v1/waf/brief?date=          (daily structured brief, JSON)
MCP tools (add to the Integra server):
  waf_brief(date?), waf_headlines(filters), waf_vessel_balance(product, window),
  waf_grade_watch(grades[]), waf_prices(product, type)
All responses include sources[], as_of, confidence, and data_gaps[].

PHASE 9 — SCHEDULING
Ingest every 30 min 06:00–22:00 WAT; publish daily brief at 07:30 WAT before London open.

ACCEPTANCE TESTS
- Parser extracts all fields from the PIS SUMATERA example with correct litres
- Same story in Punch and ThisDay is one item with two sources
- "Bonny Lt", "BONNY LIGHT", "Bonny-Light" all map to Bonny Light
- /balance returns a status, score, drivers and data_gaps even when stock data is missing
- Backtest report generated

Work phase by phase. Before coding each phase, list assumptions and ask me only about
decisions that change the design (licensing of paid feeds, consumption baseline source).
```

---

## PART 2 — Trader-facing Claude pre-prompt
(Use as Claude Project instructions or a skill, with the Integra MCP connector enabled.)

```
You are the Integra WAF Desk analyst for physical crude and products traders covering
West Africa. Readers are professional traders: be terse, numerical, no basics explained.

On the first message of the day, or when asked for "the brief", call waf_brief and
produce:

1. HEADLINE CALLS (3–5 lines)
   One line each for PMS and AGO supply status (GLUT/COMFORTABLE/BALANCED/TIGHT/
   SHORTAGE RISK, score, main driver) and any CONGESTION flag.
2. CRUDE
   Grade-level news and sentiment (Bonny Light, Qua Iboe, Forcados, Escravos, Bonga,
   Agbami, Akpo, Erha, Egina, Usan + any WAF grade with news). Flag OSP changes, force
   majeure, loading delays, Dangote crude purchases, unsold-cargo chatter.
3. DOWNSTREAM NIGERIA
   Vessel arrivals/discharges (vessel, product, MT, receiver, port, status), Dangote
   output/exports/pricing, gantry vs import parity, NMDPRA/NNPC actions.
4. REGULATORY & MACRO
   NUPRC, NMDPRA, CBN/FX, strikes, security incidents, mining/solid-minerals items.
5. WHAT TO WATCH (next 7 days)
6. SOURCES — every claim linked; show confidence and note data gaps.

Rules:
- Never state a balance status without its drivers and the as_of time.
- If consumption or stock figures are estimates, say "est."
- Separate reported facts from Integra model outputs.
- If the user names a grade, vessel, receiver or depot, filter to it.
- If tools return nothing for an item, say so; do not fill from general knowledge.

WEEKLY MODE — triggered by any of: "WAF report", "weekly report", "rundown of the week",
"what happened in West Africa / Nigeria this week", "week in review".
Call waf_report (week=current unless the user names one; compare=previous week) and render
the WAF Weekly Report format below. For "how does this compare to last month/quarter",
call waf_report_history and describe the trend in scores and sentiment.
```

### Example prompts (for onboarding screen / docs)
- "Give me a rundown of what happened in West Africa and Nigeria this week."
- "WAF report for week 41 — focus on PMS and Dangote."
- "How has Bonny Light and Forcados sentiment moved over the last 8 weeks?"
- "Compare this week's PMS supply status with the same week last year."
- "Which events this week matter most for AGO cargoes into Lagos next week?"

---

## PART 2B — WAF Weekly Report module (add to the Claude Code build prompt as Phase 10)

```
PHASE 10 — WAF WEEKLY REPORT ("WAF Report")
A standalone, versioned weekly report generated every Friday, stored, exposed via API/MCP,
and pushed to app users.

SCHEDULE & DELIVERY
- Data cutoff Fri 17:00 WAT; generate + automated QA 17:00–17:45; publish Fridays
  18:00 WAT (Africa/Lagos) on web and mobile simultaneously. Time is configurable.
  Coverage window: Sat 00:00 → Fri 17:00 WAT.
- Mobile: over-the-air (OTA) push notification via APNs (iOS) / FCM (Android) at 18:00
  WAT — title "WAF Weekly Report · W41", ≤120-char teaser (top event + headline
  sentiment), deep link opening the report card in-app.
- Web: same report appears at 18:00 WAT as a pinned card at the top of the feed, with a
  browser/web-push notification for users who opted in.
- Also: email (HTML + PDF) and webhook for API clients
  (POST waf.report.published with report_id and url).
- Users can opt in/out per channel and choose product/grade focus in settings.

NEWS CARD (web + mobile, same component)
- Collapsed card: report_id + date range, overall WAF sentiment (score, arrow, w/w
  change), PMS & AGO supply status chips, top 3 summary bullets, "Read full report".
- Expanded: full report sections (below), each section collapsible.
- Actions on the card: Save (to user's saved reports, synced across web/mobile),
  Copy (plain-text summary formatted for WhatsApp/email/Bloomberg chat, with source
  links), Share (native share sheet on mobile; shareable link on web), Export PDF.
- Individual events/bullets are also copyable with their source link attached.
- Saved reports available offline on mobile.
- Older weekly cards remain in a "WAF Reports" archive tab, scrollable by week
  (backed by the backfill).
- If a critical data source failed during the week, publish anyway with a data_gaps
  banner rather than skipping the week.

REPORT STRUCTURE (JSON first; HTML/PDF/push rendered from the JSON)
1. Executive summary — 5 bullets max, one sentence each, most market-moving first.
2. Weekly WAF sentiment — composite index and per-segment (crude, PMS, AGO, LPG, FX/macro,
   mining) with week-on-week change and direction arrow; top 3 drivers of the change.
3. Supply balance — PMS and AGO status + score at week end vs prior week; vessels
   arrived / discharged / waiting; volume imported vs Dangote supply vs est. consumption;
   congestion flag; gantry vs import parity change.
4. Key market events (ranked) — up to 8. Each: what happened, date, sources,
   affected instruments (grade/product/entity), sentiment impact score, confidence.
   Ranking = impact score × source credibility × number of independent sources.
5. Crude grade watch — grades with news this week, sentiment change, OSP/differential
   moves, loading/force-majeure items.
6. Regulatory & policy — NUPRC, NMDPRA, NNPC, CBN, government.
7. Implications & outlook (next 1–2 weeks) — 3–5 conditional statements tied to the data
   ("If 3 waiting PMS cargoes discharge by Tue, cover rises to ~X days → BALANCED;
   watch ex-depot prices for confirmation"). Label clearly as model view, not advice.
8. What to watch — dated calendar items (OSP releases, strikes deadlines, Dangote
   maintenance, auctions, regulatory deadlines).
9. Sources & data gaps.

GENERATION
- Deterministic sections (scores, counts, prices) computed in code, never by the LLM.
- LLM writes summary, event narratives and implications ONLY from the week's stored
  documents and computed metrics; every sentence must map to source ids (validate:
  reject sentences with no source/metric reference and regenerate).
- Store report_id = WAF-YYYY-Www, version, generated_at, inputs snapshot hash, so any
  past report is reproducible.

BACKFILL
- Generate weekly reports for the full 24-month backfill window using only data
  available as of each week's cutoff (no look-ahead).
- Store weekly headline sets and sentiment snapshots alongside each report.
- Backtest section 7: score whether stated implications materialised the following
  week; publish a running accuracy figure in each report footer.

API
  GET  /v1/waf/report                       latest weekly report
  GET  /v1/waf/report/{report_id}           e.g. WAF-2026-W41
  GET  /v1/waf/report?from=&to=             list/historical (backfilled)
  GET  /v1/waf/report/{report_id}/headlines all headlines + sentiment for that week
  GET  /v1/waf/report/{report_id}.pdf       rendered PDF
  GET  /v1/waf/report/sentiment-series?segment=&grade=&weeks=   weekly time series
  Query params: focus=PMS,AGO,crude&country=NG
MCP tools
  waf_report(week?, focus?, compare?)       returns structured weekly report
  waf_report_history(weeks, segment?|grade?) weekly sentiment/score series
  waf_week_headlines(week, filters)

ACCEPTANCE TESTS
- Report for a backfilled week uses no documents published after that week's cutoff
- Every executive-summary bullet links to ≥1 source
- Push teaser ≤ 120 chars and deep link opens the correct report_id
- Report still publishes, with data_gaps populated, when one source adapter is down
- Re-running generation for a past week reproduces the same scores
- New MEMAN RSS guid triggers fetch; linked PDF parsed, hashed, deduped; OCR fallback
  works on a scanned page; Google Drive share link converted and downloaded
- With PPNG_LICENSED=false, no petroleumprice.ng-derived field appears in any public
  API response, push card, news card or weekly report (only headline + link)
```

---

## PART 3 — Open questions before building

1. Consumption baseline: NMDPRA truck-out data, or your own estimate? This drives every days-of-cover number.
2. Paid feeds: are Argus/Platts/Kpler partners now or later? Without them, import parity and netbacks rely on published figures.
3. Backfill depth: 24 months is suggested; petroleumprice.ng archive depth decides what's feasible for vessels.
4. Scope for v1: Nigeria products balance + crude grade news only, with Ghana/Senegal/Angola as phase 2, would get a demo to Trafigura faster.
5. Decided: weekly report publishes Fridays 18:00 WAT on web and mobile, delivered OTA push + news card (save/copy/share). V1 sources: petroleumprice.ng and MEMAN.
6. Checked: MEMAN has a public RSS feed and PDF publications, no published terms → ingest now, seek attribution agreement. petroleumprice.ng prohibits reuse without written permission and has no feed/API → needs a data licence (contact CEO Olatide Jeremiah, enquiries@petroleumprice.ng, +234 802 454 5197; both attend OTL Africa Downstream Week, 25–30 Oct 2026, Lagos). Until signed, its data is internal/demo only.
