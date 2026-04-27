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

interface AxisTickProps {
  x?: number;
  y?: number;
  payload?: { value: number };
}

function LeftAxisTick({ x = 0, y = 0, payload }: AxisTickProps) {
  const value = Number(payload?.value ?? 0);
  const color = value < 0 ? '#dc2626' : '#16a34a';
  return (
    <g>
      <line x1={x - 6} y1={y} x2={x} y2={y} stroke={color} strokeWidth={1.5} />
      <text x={x - 8} y={y} dy={4} textAnchor="end" fill={color} fontSize={11}>
        {fmt(value)}
      </text>
    </g>
  );
}

interface Props {
  movements: ArrMovement[];
  /** Only render this many of the most-recent periods to avoid clutter */
  maxPeriods?: number;
  selectedPeriod?: string | null;
  onSelectPeriod?: (period: string) => void;
  onHoverPeriod?: (period: string | null) => void;
}

function chartStatePeriod(state: any): string | null {
  if (typeof state?.activeLabel === 'string') return state.activeLabel;

  const payloadPeriod = state?.activePayload?.find?.((item: any) => typeof item?.payload?.period === 'string')?.payload?.period;
  if (typeof payloadPeriod === 'string') return payloadPeriod;

  const directPeriod = state?.payload?.period ?? state?.period;
  return typeof directPeriod === 'string' ? directPeriod : null;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const byKey = new Map<string, number>();
  for (const item of payload) {
    byKey.set(item.dataKey, Number(item.value ?? 0));
  }

  const rows = [
    { key: 'closingArr', label: 'Closing ARR', color: COLORS.closing },
    { key: 'new', label: 'New ARR', color: COLORS.new },
    { key: 'expansion', label: 'Expansion', color: COLORS.expansion },
    { key: 'contraction', label: 'Contraction', color: COLORS.contraction },
    { key: 'churn', label: 'Churn', color: COLORS.churn },
  ];

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontSize: 12, minWidth: 180 }}>
      <div style={{ color: 'var(--text)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {rows.map((row) => {
        const value = byKey.get(row.key);
        if (value === undefined) return null;
        return (
          <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
            <span style={{ color: row.color, fontWeight: 600 }}>{row.label}</span>
            <span style={{ color: 'var(--text)' }}>{fmt(Math.abs(value))}</span>
          </div>
        );
      })}
    </div>
  );
}

function fmt(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

const COLORS = {
  new: '#22c55e',
  expansion: '#86efac',
  contraction: '#f97316',
  churn: '#ef4444',
  closing: '#6d28d9',
  leftAxis: '#16a34a',
  rightAxis: '#6d28d9',
};

function roundUpTo(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

function buildLeftAxisTicks(leftMin: number, leftMax: number): number[] {
  // Always include an explicit green $0 marker so the viewer can clearly see
  // where positive bars rise from and negative bars fall from.
  const ticks = new Set<number>([leftMin, 0, leftMax]);
  const negMid = Math.round(leftMin / 2 / 25_000) * 25_000;
  const posMid = Math.round(leftMax / 2 / 25_000) * 25_000;
  if (negMid !== leftMin && negMid !== 0) ticks.add(negMid);
  if (posMid !== leftMax && posMid !== 0) ticks.add(posMid);
  return [...ticks].sort((a, b) => a - b);
}

export default function ArrWaterfallChart({
  movements,
  maxPeriods = 24,
  selectedPeriod,
  onSelectPeriod,
  onHoverPeriod,
}: Props) {
  const visible = movements.slice(-maxPeriods);

  const chartData = visible.map(m => ({
    period: m.period,
    new: m.newArr,
    expansion: m.expansionArr,
    contraction: -m.contractionArr,
    churn: -m.churnArr,
    closingArr: m.closingArr,
  }));

  const maxPositiveMovement = Math.max(0, ...chartData.map(d => d.new + d.expansion));
  const maxNegativeMovement = Math.max(0, ...chartData.map(d => Math.abs(d.contraction + d.churn)));

  // Presentation-oriented movement axis:
  // - always includes $0
  // - keeps negative side close to real downside
  // - expands positive side intentionally so bars stay visually low and do not
  //   collide with the ARR line band above
  const leftMin = -Math.max(100_000, roundUpTo(maxNegativeMovement * 1.1, 25_000));
  const leftMax = Math.max(
    750_000,
    roundUpTo(maxPositiveMovement * 3.0, 100_000),
  );

  const leftTicks = buildLeftAxisTicks(leftMin, leftMax);

  const maxClosing = Math.max(0, ...chartData.map(d => d.closingArr));
  const minClosing = Math.min(...chartData.map(d => d.closingArr));
  const closingSpan = Math.max(1, maxClosing - minClosing);

  // Presentation-oriented ARR axis:
  // push the lowest ARR point into the upper band of the chart so the purple
  // line remains clearly above the movement bars even as data changes.
  const rightTopPad = Math.max(500_000, closingSpan * 0.08);
  const rightMax = roundUpTo(maxClosing + rightTopPad, 1_000_000);
  const targetTopFractionForMinLine = 0.34;
  const computedRightMin = rightMax - ((rightMax - minClosing) / targetTopFractionForMinLine);
  const minimumFloor = minClosing - Math.max(3_000_000, closingSpan * 2.0);
  const rightMin = Math.min(computedRightMin, minimumFloor);

  const commitChartPeriod = (period: string | null) => {
    if (!period || !chartData.some((entry) => entry.period === period)) return;
    onHoverPeriod?.(null);
    onSelectPeriod?.(period);
  };

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart
        data={chartData}
        margin={{ top: 10, right: 28, left: 10, bottom: 5 }}
        onClick={(state: any) => commitChartPeriod(chartStatePeriod(state))}
        onMouseMove={(state: any) => {
          onHoverPeriod?.(chartStatePeriod(state));
        }}
        onMouseLeave={() => onHoverPeriod?.(null)}
        style={{ cursor: onSelectPeriod ? 'pointer' : 'default' }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="period"
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          angle={visible.length > 12 ? -30 : 0}
          textAnchor={visible.length > 12 ? 'end' : 'middle'}
          height={visible.length > 12 ? 44 : 24}
        />
        <YAxis
          yAxisId="left"
          domain={[leftMin, leftMax]}
          ticks={leftTicks}
          tick={<LeftAxisTick />}
          axisLine={{ stroke: COLORS.leftAxis, strokeWidth: 2 }}
          tickLine={false}
          width={82}
          label={{ value: 'Movements', angle: -90, position: 'insideLeft', fill: COLORS.leftAxis, dx: -2 }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[rightMin, rightMax]}
          tickFormatter={v => fmt(v)}
          tick={{ fill: COLORS.rightAxis, fontSize: 11 }}
          axisLine={{ stroke: COLORS.rightAxis, strokeWidth: 2 }}
          tickLine={{ stroke: COLORS.rightAxis }}
          width={88}
          label={{ value: 'ARR', angle: 90, position: 'insideRight', fill: COLORS.rightAxis, dx: 2 }}
        />
        <ReferenceLine yAxisId="left" y={0} stroke="var(--border)" strokeWidth={1.5} />
        {selectedPeriod && (
          <ReferenceLine
            x={selectedPeriod}
            yAxisId="left"
            stroke="rgba(99, 102, 241, 0.7)"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        )}
        <Tooltip content={<CustomTooltip />} />
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
        <Bar yAxisId="left" dataKey="new" stackId="pos" fill={COLORS.new} radius={[2, 2, 0, 0]} onClick={(data) => commitChartPeriod(data.period)} style={{ cursor: onSelectPeriod ? 'pointer' : 'default' }} />
        <Bar yAxisId="left" dataKey="expansion" stackId="pos" fill={COLORS.expansion} onClick={(data) => commitChartPeriod(data.period)} style={{ cursor: onSelectPeriod ? 'pointer' : 'default' }} />
        <Bar yAxisId="left" dataKey="contraction" stackId="neg" fill={COLORS.contraction} onClick={(data) => commitChartPeriod(data.period)} style={{ cursor: onSelectPeriod ? 'pointer' : 'default' }} />
        <Bar yAxisId="left" dataKey="churn" stackId="neg" fill={COLORS.churn} radius={[0, 0, 2, 2]} onClick={(data) => commitChartPeriod(data.period)} style={{ cursor: onSelectPeriod ? 'pointer' : 'default' }} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="closingArr"
          stroke={COLORS.closing}
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
