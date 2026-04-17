'use client'

interface QaBarProps {
  label: string
  value: number | null | undefined
  goal: number
  color: string
}

function QaBar({ label, value, goal, color }: QaBarProps) {
  const v = value ?? 0
  const onTarget = v >= goal
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 500,
            background: onTarget ? 'var(--green-bg)' : 'var(--red-bg)',
            color: onTarget ? 'var(--green)' : 'var(--red)',
          }}>
            goal {goal}%
          </span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: onTarget ? 'var(--green)' : 'var(--red)' }}>
          {v.toFixed(1)}%
        </span>
      </div>
      <div style={{ background: 'var(--bg-overlay)', borderRadius: 5, height: 7, overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min(v, 100)}%`,
          height: '100%',
          background: onTarget ? color : 'var(--red)',
          borderRadius: 5,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

interface QaMetricsProps {
  cc: number | null | undefined
  ec: number | null | undefined
  bc: number | null | undefined
}

export function QaMetrics({ cc, ec, bc }: QaMetricsProps) {
  return (
    <div>
      <QaBar label="CC — Compliance Critical" value={cc} goal={99.5} color="var(--brand)" />
      <QaBar label="EC — End Customer Critical" value={ec} goal={95}   color="var(--purple)" />
      <QaBar label="BC — Business Critical"     value={bc} goal={90}   color="var(--teal)" />
    </div>
  )
}
