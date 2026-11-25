import { BarChart } from '../ds';
import { formatNairaShort } from '../mock/format';

export function EarningsExpensesChart({ trend = [], height = 180 }: { trend?: Array<{ month: string; earnings: number; expenses: number }>; height?: number }) {
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
