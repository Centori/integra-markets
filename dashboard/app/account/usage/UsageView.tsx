// Presentational half of the Usage page. Server component — no interactivity
// here, so no "use client" and no JS shipped for it.
//
// Every section checks its own `available` flag before rendering numbers. That
// is the whole reason the flags exist: api_key_usage is read through three
// separate RPCs, and one failing must produce "couldn't load this section"
// rather than a confident 0. A Usage page that under-reports is worse than the
// "Soon" placeholder it replaces — a customer would read it as their
// integration being dead.

import type { UsageSummary } from "@/lib/api";

function num(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toLocaleString();
}

function ms(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value} ms`;
}

function Unavailable({ what }: { what: string }) {
  return (
    <div className="rounded-lg border border-accent-warning/40 bg-bg-secondary p-4 text-sm text-text-secondary">
      Couldn&apos;t read {what} just now. This is a reporting failure, not a sign
      your requests aren&apos;t going through — enforcement and logging are
      separate paths.
    </div>
  );
}

/** Quota bar. Colour is semantic, not decorative: it encodes proximity to a
 *  hard refusal, which is the one thing on this page a customer must not miss. */
function QuotaBar({ percent }: { percent: number }) {
  const band =
    percent >= 100 ? "bg-accent-negative"
    : percent >= 80 ? "bg-accent-warning"
    : "bg-accent-positive";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-bg-tertiary">
      <div
        className={`h-full rounded-full ${band}`}
        style={{ width: `${Math.min(100, Math.max(percent, percent > 0 ? 1.5 : 0))}%` }}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-divider bg-bg-secondary p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">{value}</p>
      {hint ? <p className="mt-1 text-xs text-text-secondary">{hint}</p> : null}
    </div>
  );
}

/**
 * Daily requests, drawn as an inline SVG rather than with a charting library.
 *
 * Thirty bars and one baseline do not justify shipping a chart bundle, and the
 * Artifact-style CSP on the dashboard makes every added CDN dependency a thing
 * that can silently fail to load. Errors are stacked on top of requests in the
 * negative colour so a bad day is visible at a glance instead of requiring the
 * table below.
 */
function DailyChart({
  rows,
  windowDays,
}: {
  rows: UsageSummary["daily"]["rows"];
  windowDays: number;
}) {
  const peak = Math.max(1, ...rows.map((r) => r.requests));
  const width = 100;
  const height = 34;
  const slot = width / Math.max(rows.length, 1);
  const barWidth = Math.max(slot * 0.62, 0.6);

  return (
    <div className="rounded-lg border border-divider bg-bg-secondary p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
          Requests / day · last {windowDays} days
        </p>
        <p className="text-xs tabular-nums text-text-secondary">peak {peak.toLocaleString()}</p>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Daily API requests over the last ${windowDays} days, peaking at ${peak}`}
        className="mt-3 h-24 w-full"
      >
        {rows.map((row, i) => {
          const total = (row.requests / peak) * (height - 1);
          const bad = (Math.min(row.errors, row.requests) / peak) * (height - 1);
          const good = Math.max(0, total - bad);
          const x = i * slot + (slot - barWidth) / 2;
          return (
            <g key={row.day}>
              {good > 0 ? (
                <rect
                  x={x}
                  y={height - total}
                  width={barWidth}
                  height={good}
                  fill="#4ECCA3"
                  rx={0.3}
                />
              ) : null}
              {bad > 0 ? (
                <rect
                  x={x}
                  y={height - bad}
                  width={barWidth}
                  height={bad}
                  fill="#FF6B6B"
                  rx={0.3}
                />
              ) : null}
            </g>
          );
        })}
        <line x1="0" y1={height} x2={width} y2={height} stroke="#222222" strokeWidth="0.4" />
      </svg>

      <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
        <span>{rows[0]?.day ?? ""}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-accent-positive" /> served
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-accent-negative" /> errors
          </span>
        </span>
        <span>{rows[rows.length - 1]?.day ?? ""}</span>
      </div>
    </div>
  );
}

export default function UsageView({ usage }: { usage: UsageSummary }) {
  const { current, plan, period } = usage;
  const percent = current.percent_used ?? 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Usage</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {period.label} · the allowance resets on the 1st, UTC. Metering counts
          calendar months, so this period is the one your limit is enforced over.
        </p>
      </div>

      {/* --- The quota, first. It is the only number that can stop a customer's
          integration working, so nothing goes above it. --- */}
      <section className="space-y-3">
        {current.available ? (
          <>
            <div className="rounded-lg border border-divider bg-bg-secondary p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-text-secondary">
                  <span className="text-xl font-semibold tabular-nums text-text-primary">
                    {num(current.requests)}
                  </span>{" "}
                  of {num(current.limit)} requests
                </p>
                <p className="text-sm tabular-nums text-text-secondary">
                  {percent.toFixed(1)}% used · {num(current.remaining)} left
                </p>
              </div>
              <div className="mt-3">
                <QuotaBar percent={percent} />
              </div>
              {percent >= 80 ? (
                <p className="mt-3 text-sm text-accent-warning">
                  {percent >= 100
                    ? "Allowance spent. Further requests are refused with 429 until the 1st."
                    : "Approaching the monthly limit. Requests are refused with 429 once it is reached."}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Stat
                label="Errors"
                value={num(current.errors)}
                hint={
                  current.error_rate === null
                    ? "No requests yet this period"
                    : `${current.error_rate}% of requests · 4xx and 5xx`
                }
              />
              <Stat
                label="Rate limited"
                value={num(current.rate_limited)}
                hint={`429s · ${plan.requests_per_second}/sec sustained per key`}
              />
              <Stat
                label="Burst"
                value={`${plan.burst_capacity}`}
                hint="Requests servable back-to-back after an idle moment"
              />
            </div>
          </>
        ) : (
          <Unavailable what="this period's totals" />
        )}
      </section>

      {/* --- Trend --- */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Trend</h2>
        {usage.daily.available ? (
          usage.daily.rows.some((r) => r.requests > 0) ? (
            <DailyChart rows={usage.daily.rows} windowDays={usage.daily.window_days} />
          ) : (
            <div className="rounded-lg border border-divider bg-bg-secondary p-4 text-sm text-text-secondary">
              No requests in the last {usage.daily.window_days} days. Once a key
              is in use, daily volume and errors appear here.
            </div>
          )
        ) : (
          <Unavailable what="the daily series" />
        )}
      </section>

      {/* --- Per key. Attribution is the point: with up to 10 keys, "which one
          is burning the quota" is unanswerable without this. --- */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">By key</h2>
        {usage.by_key.available ? (
          usage.by_key.rows.length ? (
            <div className="overflow-x-auto rounded-lg border border-divider">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="bg-bg-tertiary text-left text-[11px] uppercase tracking-[0.08em] text-text-muted">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Key</th>
                    <th className="px-4 py-2 text-right font-semibold">Requests</th>
                    <th className="px-4 py-2 text-right font-semibold">Errors</th>
                    <th className="px-4 py-2 text-right font-semibold">429s</th>
                    <th className="px-4 py-2 text-right font-semibold">p50</th>
                    <th className="px-4 py-2 text-right font-semibold">p95</th>
                  </tr>
                </thead>
                <tbody className="bg-bg-secondary">
                  {usage.by_key.rows.map((row) => (
                    <tr key={row.key_id} className="border-t border-divider">
                      <td className="px-4 py-2">
                        <span className="text-text-primary">{row.name}</span>
                        <span className="ml-2 font-mono text-xs text-text-muted">
                          {row.prefix}…
                        </span>
                        {row.revoked ? (
                          <span className="ml-2 rounded border border-bg-tertiary px-1.5 py-px text-[10px] uppercase tracking-wide text-text-muted">
                            revoked
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{num(row.requests)}</td>
                      <td className={`px-4 py-2 text-right tabular-nums ${row.errors > 0 ? "text-accent-negative" : ""}`}>
                        {num(row.errors)}
                      </td>
                      <td className={`px-4 py-2 text-right tabular-nums ${row.rate_limited > 0 ? "text-accent-warning" : ""}`}>
                        {num(row.rate_limited)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-text-secondary">{ms(row.p50_ms)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-text-secondary">{ms(row.p95_ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-divider bg-bg-secondary p-4 text-sm text-text-secondary">
              No keys yet. Create one under{" "}
              <a className="text-accent-primary underline" href="/account/api">
                API keys
              </a>
              .
            </div>
          )
        ) : (
          <Unavailable what="per-key usage" />
        )}
      </section>

      {/* --- Per endpoint --- */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">By endpoint</h2>
        {usage.by_endpoint.available ? (
          usage.by_endpoint.rows.length ? (
            <div className="overflow-x-auto rounded-lg border border-divider">
              <table className="w-full min-w-[34rem] text-sm">
                <thead className="bg-bg-tertiary text-left text-[11px] uppercase tracking-[0.08em] text-text-muted">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Endpoint</th>
                    <th className="px-4 py-2 text-right font-semibold">Requests</th>
                    <th className="px-4 py-2 text-right font-semibold">Errors</th>
                    <th className="px-4 py-2 text-right font-semibold">p95</th>
                  </tr>
                </thead>
                <tbody className="bg-bg-secondary">
                  {usage.by_endpoint.rows.map((row) => (
                    <tr key={`${row.method} ${row.endpoint}`} className="border-t border-divider">
                      <td className="px-4 py-2 font-mono text-xs">
                        <span className="text-text-muted">{row.method}</span>{" "}
                        <span className="text-text-primary">{row.endpoint}</span>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{num(row.requests)}</td>
                      <td className={`px-4 py-2 text-right tabular-nums ${row.errors > 0 ? "text-accent-negative" : ""}`}>
                        {num(row.errors)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-text-secondary">{ms(row.p95_ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-divider bg-bg-secondary px-4 py-2 text-xs text-text-muted">
                Top 20 by volume.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-divider bg-bg-secondary p-4 text-sm text-text-secondary">
              Nothing called yet this period.
            </div>
          )
        ) : (
          <Unavailable what="the endpoint breakdown" />
        )}
      </section>

      {/* --- The plan, read from enforcement. Kept last: reference, not news. --- */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Enforced limits</h2>
        <p className="text-sm text-text-secondary">
          These are read from the values the API enforces, not from a stored
          description of the plan.
        </p>
        <dl className="grid gap-px overflow-hidden rounded-lg border border-divider bg-divider sm:grid-cols-2">
          {[
            ["Requests / month", num(plan.requests_per_month)],
            ["Requests / second per key", `${plan.requests_per_second}`],
            ["Query depth", plan.query_depth_days === null ? "Full archive" : `${plan.query_depth_days} days`],
            ["Export depth", plan.export_depth_days === null ? "Full archive" : `${plan.export_depth_days} days`],
            ["Exports / month", num(plan.exports_per_month)],
            ["Rows / export", `${num(plan.export_rows_per_call)} CSV · ${num(plan.export_rows_per_call_xlsx)} XLSX`],
          ].map(([label, value]) => (
            <div key={label} className="bg-bg-secondary px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.08em] text-text-muted">{label}</dt>
              <dd className="mt-0.5 tabular-nums text-text-primary">{value}</dd>
            </div>
          ))}
        </dl>
        {plan.enforced ? null : (
          <p className="text-sm text-accent-warning">
            Enforcement is currently disabled server-side; these limits are
            reported but not applied.
          </p>
        )}
      </section>
    </div>
  );
}
