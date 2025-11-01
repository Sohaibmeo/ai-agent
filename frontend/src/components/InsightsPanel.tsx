import type { AnalyzeResponse, CatRow } from "../types/api";
import { formatCurrency, formatNumber } from "../utils/format";
import AdviceCard from "./AdviceCard";

type InsightsPanelProps = {
  response: AnalyzeResponse | null;
  status: "idle" | "processing" | "done" | "error";
};

const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

const toPositive = (value: number) => (value < 0 ? value * -1 : value);

const buildTotals = (response: AnalyzeResponse | null) => {
  if (!response) return { income: 0, spend: 0 };
  const totals = response.insights.totalsByCategory ?? {};
  const values = Object.values(totals);
  const income = values.filter(v => v > 0);
  const spend = values.filter(v => v < 0).map(toPositive);
  return { income: sum(income), spend: sum(spend) };
};

const topSpendCategories = (response: AnalyzeResponse | null, limit = 4) => {
  if (!response) return [];
  const totals = response.insights.totalsByCategory ?? {};
  return Object.entries(totals)
    .filter(([, amount]) => amount < 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, limit);
};

const recentTransactions = (rows: CatRow[], limit = 6) =>
  [...rows]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, limit);

const InsightsPanel = ({ response, status }: InsightsPanelProps) => {
  if (status === "processing") {
    return (
      <section className="panel">
        <header className="panel__header">
          <div>
            <h2>Insights</h2>
            <p className="panel__subtitle">Crunching the numbers…</p>
          </div>
        </header>
        <div className="placeholder">
          <div className="skeleton skeleton--lg" />
          <div className="skeleton skeleton--md" />
          <div className="skeleton skeleton--sm" />
        </div>
      </section>
    );
  }

  if (!response) {
    return (
      <section className="panel">
        <header className="panel__header">
          <div>
            <h2>Insights</h2>
            <p className="panel__subtitle">Upload a CSV to see totals, anomalies, and coaching advice.</p>
          </div>
        </header>
      </section>
    );
  }

  const { insights, advice, categorized, timeWindowDays, goal, period } = response;
  const totals = buildTotals(response);
  const topCategories = topSpendCategories(response);
  const latestRows = recentTransactions(categorized ?? []);

  return (
    <section className="panel">
      <header className="panel__header">
        <div>
          <h2>Insights</h2>
          <p className="panel__subtitle">
            Period: <strong>{period}</strong> ({timeWindowDays} days) · Goal: <strong>{formatCurrency(goal)}</strong>
          </p>
        </div>
      </header>

      <div className="summary-grid">
        <div className="stat-card">
          <span className="stat-card__label">Income</span>
          <strong className="stat-card__value text-positive">{formatCurrency(totals.income)}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Spend</span>
          <strong className="stat-card__value text-negative">{formatCurrency(totals.spend)}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Categories watched</span>
          <strong className="stat-card__value">{formatNumber(Object.keys(insights.totalsByCategory ?? {}).length)}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Transactions analysed</span>
          <strong className="stat-card__value">{formatNumber(categorized?.length ?? 0)}</strong>
        </div>
      </div>

      <section className="insight-section">
        <h3>Top spend categories</h3>
        {topCategories.length === 0 ? (
          <p>No spending detected for this period.</p>
        ) : (
          <ul className="pill-list">
            {topCategories.map(([category, amount]) => (
              <li key={category} className="pill">
                <span>{category}</span>
                <strong>{formatCurrency(Math.abs(amount))}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="insight-section">
        <h3>Subscriptions</h3>
        {insights.subscriptions?.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Merchant</th>
                <th>Avg amount</th>
                <th>Cadence (days)</th>
              </tr>
            </thead>
            <tbody>
              {insights.subscriptions.map(sub => (
                <tr key={sub.merchant}>
                  <td>{sub.merchant}</td>
                  <td>{formatCurrency(sub.avgAmount)}</td>
                  <td>{formatNumber(sub.cadenceDays)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No recurring subscriptions flagged.</p>
        )}
      </section>

      <section className="insight-section">
        <h3>Anomalies</h3>
        {insights.anomalies?.length ? (
          <ul className="card-list">
            {insights.anomalies.map((anom, index) => (
              <li key={`${anom.category}-${index}`} className="mini-card">
                <header className="mini-card__header">
                  <span className="mini-card__title">{anom.category}</span>
                  <span className="badge">x{formatNumber(anom.ratio ?? 0, { maximumFractionDigits: 2 })}</span>
                </header>
                <p>
                  Last {anom.period ?? (anom.winDays === 30 ? "month" : "week")}: <strong>{formatCurrency(anom.lastN)}</strong>
                </p>
                <p>
                  Prev median: {formatCurrency(anom.medianPrev)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p>No category spikes detected.</p>
        )}
      </section>

      <section className="insight-section">
        <h3>What-if scenario</h3>
        {insights.whatIf ? (
          <div className="mini-card">
            <header className="mini-card__header">
              <span className="mini-card__title">{insights.whatIf.category}</span>
              <span className="badge">{insights.whatIf.cutPct}% cut</span>
            </header>
            <p>Potential saving: <strong>{formatCurrency(insights.whatIf.delta)}</strong></p>
            <p>New free-to-spend: <strong>{formatCurrency(insights.whatIf.newFreeToSpend)}</strong></p>
          </div>
        ) : (
          <p>No what-if opportunity calculated.</p>
        )}
      </section>

      <section className="insight-section">
        <h3>Coach advice</h3>
        {advice ? (
          <AdviceCard advice={advice} />
        ) : (
          <p>Advice will appear once a run completes.</p>
        )}
      </section>

      <section className="insight-section">
        <h3>Recent transactions</h3>
        {latestRows.length ? (
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Date</th>
                <th>Merchant</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {latestRows.map(row => (
                <tr key={`${row.date}-${row.merchant}-${row.amount}`}>
                  <td>{row.date}</td>
                  <td>{row.merchant}</td>
                  <td>{row.category}</td>
                  <td className={row.amount < 0 ? "text-negative" : "text-positive"}>
                    {formatCurrency(row.amount)}
                  </td>
                  <td>{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No transactions available.</p>
        )}
      </section>
    </section>
  );
};

export default InsightsPanel;
