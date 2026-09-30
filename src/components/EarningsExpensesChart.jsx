import { BarChart } from '../ds.js';
import { formatNairaShort } from '../mock/format.js';

export function EarningsExpensesChart({ trend = [], height = 180 }) {
  if (trend.length === 0) return <p className="tk-meta" style={{ margin: 0 }}>Earnings and expenses appear here once your first trip is delivered.</p>;
  return (
    <BarChart
      legend
      height={height}
      labels={trend.map((m) => m.month)}
      format={formatNairaShort}
      series={[
        { name: 'Earnings', color: 'var(--tk-blue)', points: trend.map((m) => m.earnings) },
        { name: 'Expenses', color: 'var(--tk-warning)', points: trend.map((m) => m.expenses) },
      ]}
    />
  );
}
