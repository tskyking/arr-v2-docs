/**
 * ArrWaterfallChart — visualizes period-over-period ARR movements.
 *
 * Shows new, expansion, contraction, and churn as stacked bars per period,
 * plus a line overlay for closing ARR to give visual continuity.
 *
 * Uses Recharts ComposedChart with custom bar stacking to approximate a
 * waterfall: positive bars above zero, negative bars below.
 */
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { ArrMovement } from '@/lib/api';

interface Props {
  movements: ArrMovement[];
  /** Only render this many of the most-recent periods to avoid clutter */
  maxPeriods?: number;
}

function fmt(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

const COLORS = {
  new: '#22c55e',         // green
  expansion: '#86efac',   // light green
  contraction: '#f97316', // orange
  churn: '#ef4444',       // red
  closing: '#6366f1',     // indigo line
};

export default function ArrWaterfallChart({ movements, maxPeriods = 24 }: Props) {
  const visible = movements.slice(-maxPeriods);

  const chartData = visible.map(m => ({
    period: m.period,
    // Positive bars
    new: m.newArr,
    expansion: m.expansionArr,
    // Negative bars (stored as negative for below-zero rendering)
    contraction: -m.contractionArr,
    churn: -m.churnArr,
    // Overlay line
    closingArr: m.closingArr,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="period"
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          angle={visible.length > 12 ? -30 : 0}
          textAnchor={visible.length > 12 ? 'end' : 'middle'}
          height={visible.length > 12 ? 44 : 24}
        />
        <YAxis
          tickFormatter={v => fmt(v)}
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          width={72}
        />
        <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1.5} />
        <Tooltip
          contentStyle={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            fontSize: 12,
          }}
          labelStyle={{ color: 'var(--text)', marginBottom: 4, fontWeight: 600 }}
          formatter={(value: number, name: string) => {
            const labels: Record<string, string> = {
              new: 'New ARR',
              expansion: 'Expansion',
              contraction: 'Contraction',
              churn: 'Churn',
              closingArr: 'Closing ARR',
            };
            return [fmt(Math.abs(value)), labels[name] ?? name];
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(value: string) => {
            const labels: Record<string, string> = {
              new: 'New',
              expansion: 'Expansion',
              contraction: 'Contraction',
              churn: 'Churn',
              closingArr: 'Closing ARR',
            };
            return labels[value] ?? value;
          }}
        />
        <Bar dataKey="new" stackId="pos" fill={COLORS.new} radius={[2, 2, 0, 0]} />
        <Bar dataKey="expansion" stackId="pos" fill={COLORS.expansion} />
        <Bar dataKey="contraction" stackId="neg" fill={COLORS.contraction} />
        <Bar dataKey="churn" stackId="neg" fill={COLORS.churn} radius={[0, 0, 2, 2]} />
        <Line
          type="monotone"
          dataKey="closingArr"
          stroke={COLORS.closing}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
