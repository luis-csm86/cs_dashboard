'use client'

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

// ─── Shared tooltip ─────────────────────────────────────────────────────────

const TooltipStyle = {
  contentStyle: {
    background: 'var(--bg-surface)',
    border: '0.5px solid var(--border-strong)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 12,
    boxShadow: 'none',
  },
  labelStyle: { color: 'var(--text-muted)', marginBottom: 4 },
  itemStyle: { color: 'var(--text-primary)' },
}

const axisProps = {
  tick: { fill: 'var(--text-muted)', fontSize: 11 },
  axisLine: { stroke: 'var(--border-default)' },
  tickLine: false as const,
}

const gridProps = {
  strokeDasharray: '3 3',
  stroke: 'var(--border-default)',
  vertical: false,
}

// ─── Trend line ──────────────────────────────────────────────────────────────

interface TrendChartProps {
  data: Array<Record<string, unknown>>
  lines: Array<{ key: string; label: string; color: string; dashed?: boolean }>
  selectedMonth?: string
  yDomain?: [number | 'auto', number | 'auto']
  yFormatter?: (v: number) => string
  tooltipFormatter?: (v: number, name: string) => [string, string]
  height?: number
}

export function TrendChart({
  data, lines, selectedMonth,
  yDomain = ['auto', 'auto'],
  yFormatter,
  tooltipFormatter,
  height = 200,
}: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis
          domain={yDomain}
          {...axisProps}
          tickFormatter={yFormatter}
          width={42}
        />
        <Tooltip
          {...TooltipStyle}
          formatter={tooltipFormatter ?? ((v: number, name: string) => [v, name])}
        />
        {lines.length > 1 && (
          <Legend
            wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 8 }}
          />
        )}
        {selectedMonth && (
          <ReferenceLine
            x={selectedMonth}
            stroke="var(--red)"
            strokeDasharray="4 3"
            strokeWidth={1.5}
          />
        )}
        {lines.map(l => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.label}
            stroke={l.color}
            strokeWidth={2}
            strokeDasharray={l.dashed ? '5 3' : undefined}
            dot={(props: { cx: number; cy: number; payload: Record<string, string> }) => {
              const isSelected = props.payload?.month === selectedMonth
              return (
                <circle
                  key={`dot-${props.cx}-${props.cy}`}
                  cx={props.cx}
                  cy={props.cy}
                  r={isSelected ? 5 : 3}
                  fill={isSelected ? l.color : 'var(--bg-surface)'}
                  stroke={l.color}
                  strokeWidth={2}
                />
              )
            }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Grouped bar ─────────────────────────────────────────────────────────────

interface GroupedBarProps {
  data: Array<Record<string, unknown>>
  bars: Array<{ key: string; label: string; color: string }>
  yDomain?: [number | 'auto', number | 'auto']
  tooltipFormatter?: (v: number, name: string) => [string, string]
  height?: number
  stacked?: boolean
}

export function GroupedBarChart({
  data, bars, yDomain = ['auto', 'auto'],
  tooltipFormatter, height = 200, stacked = false,
}: GroupedBarProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={2}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis domain={yDomain} {...axisProps} width={42} />
        <Tooltip
          {...TooltipStyle}
          formatter={tooltipFormatter ?? ((v: number, name: string) => [v, name])}
          cursor={{ fill: 'var(--bg-overlay)', opacity: 0.5 }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 8 }} />
        {bars.map(b => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.label}
            fill={b.color}
            stackId={stacked ? 'a' : undefined}
            radius={stacked ? [0, 0, 0, 0] : [3, 3, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── QA comparison bar ───────────────────────────────────────────────────────

interface QaCompBarProps {
  prev: { cc: number | null; ec: number | null; bc: number | null } | null
  curr: { cc: number | null; ec: number | null; bc: number | null } | null
  prevLabel: string
  currLabel: string
}

export function QaComparisonChart({ prev, curr, prevLabel, currLabel }: QaCompBarProps) {
  const data = [
    {
      metric: 'CC',
      goal: 99.5,
      [prevLabel]: prev?.cc,
      [currLabel]: curr?.cc,
    },
    {
      metric: 'EC',
      goal: 95,
      [prevLabel]: prev?.ec,
      [currLabel]: curr?.ec,
    },
    {
      metric: 'BC',
      goal: 90,
      [prevLabel]: prev?.bc,
      [currLabel]: curr?.bc,
    },
  ]

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={4}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="metric" {...axisProps} />
        <YAxis domain={[80, 100]} {...axisProps} width={42} tickFormatter={v => `${v}%`} />
        <Tooltip
          {...TooltipStyle}
          formatter={(v: number, name: string) => [`${v?.toFixed(1)}%`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 8 }} />
        <ReferenceLine y={99.5} stroke="var(--text-muted)" strokeDasharray="3 3" strokeWidth={1} />
        <Bar dataKey={prevLabel} fill="var(--text-muted)" radius={[3, 3, 0, 0]} opacity={0.5} />
        <Bar dataKey={currLabel} fill="var(--brand)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
