'use client'

import { minutesToDisplay } from '@/lib/metrics'

interface KpiCardProps {
  label: string
  value: number | null | undefined
  format?: 'percent' | 'time' | 'integer' | 'decimal'
  goal?: number
  lowerIsBetter?: boolean
  suffix?: string
  accent?: string
}

function formatValue(value: number | null | undefined, format: KpiCardProps['format'], suffix?: string): string {
  if (value === null || value === undefined || isNaN(value as number)) return '—'
  switch (format) {
    case 'percent':  return `${Math.round(value as number)}%`
    case 'time':     return minutesToDisplay(value as number)
    case 'integer':  return Math.round(value as number).toLocaleString()
    case 'decimal':  return (value as number).toFixed(2)
    default:         return `${value}${suffix ?? ''}`
  }
}

function goalStatus(value: number | null | undefined, goal: number | undefined, lowerIsBetter?: boolean): 'above' | 'below' | 'none' {
  if (value === null || value === undefined || goal === undefined) return 'none'
  return lowerIsBetter
    ? (value <= goal ? 'above' : 'below')
    : (value >= goal ? 'above' : 'below')
}

const STATUS_STYLES = {
  above: { bar: 'var(--green)', text: 'var(--green)', bg: 'var(--green-bg)', label: '▲ On target' },
  below: { bar: 'var(--red)',   text: 'var(--red)',   bg: 'var(--red-bg)',   label: '▼ Off target' },
  none:  { bar: 'var(--brand)', text: 'var(--brand)', bg: 'var(--brand-light)', label: '' },
}

export function KpiCard({ label, value, format = 'percent', goal, lowerIsBetter, suffix, accent }: KpiCardProps) {
  const status = goalStatus(value, goal, lowerIsBetter)
  const styles = STATUS_STYLES[status]
  const barColor = accent ?? styles.bar

  return (
    <div
      className="card fade-in"
      style={{
        position: 'relative',
        overflow: 'hidden',
        minWidth: 150,
        borderTop: `3px solid ${barColor}`,
        paddingTop: 16,
      }}
    >
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      <div className="value-xl">{formatValue(value, format, suffix)}</div>

      {goal !== undefined && status !== 'none' && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 8,
          padding: '2px 7px',
          borderRadius: 5,
          fontSize: 11,
          fontWeight: 500,
          background: styles.bg,
          color: styles.text,
        }}>
          {styles.label}
          <span style={{ fontWeight: 300, opacity: 0.7 }}>/ goal {goal}{format === 'percent' ? '%' : format === 'time' ? ' min' : ''}</span>
        </div>
      )}
    </div>
  )
}
