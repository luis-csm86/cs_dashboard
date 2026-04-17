'use client'

import { useEffect, useState, useCallback } from 'react'
import { KpiCard } from '@/components/KpiCard'
import { TrendChart, GroupedBarChart, QaComparisonChart } from '@/components/Charts'
import { UploadZone } from '@/components/UploadZone'
import { QaMetrics } from '@/components/QaMetrics'
import { computeDerived, minutesToDisplay, type KpiRow, GOALS } from '@/lib/metrics'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QaEval {
  id: number
  month: string
  contact_date: string
  type: string
  logging: string | null
  score: number | null
  compliant: boolean | null
  cc: number | null
  ec: number | null
  bc: number | null
  comments: string | null
}

interface QaSummaryRow {
  month: string
  strengths: string | null
  improvements: string | null
}

interface QaAvgRow {
  month: string
  avg_cc: number | null
  avg_ec: number | null
  avg_bc: number | null
  avg_score: number | null
  evaluations_count: number
  compliant_count: number
  non_compliant_count: number
}

interface DashData {
  kpi: KpiRow[]
  qa: QaEval[]
  summary: QaSummaryRow[]
  qa_averages: QaAvgRow[]
}

type Tab = 'overview' | 'charts' | 'quality' | 'upload'
type Channel = 'phone' | 'email' | 'some'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<Channel, string> = { phone: 'Phone', email: 'Email', some: 'Social Media' }

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <p className="section-title" style={{ marginBottom: 14 }}>{title}</p>
      {children}
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 14px' }}>
      <span className="section-title" style={{ margin: 0, whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--border-default)' }} />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [channel, setChannel] = useState<Channel>('phone')
  const [dark, setDark] = useState(true)
  const [month, setMonth] = useState<string>('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/data')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load data')
      setData(json)
      // Default to latest month
      if (json.kpi?.length) {
        setMonth(prev => prev || json.kpi[json.kpi.length - 1].month)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Apply dark/light class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  // ── Derived data ─────────────────────────────────────────────────────────

  const months = data?.kpi.map(r => r.month) ?? []
  const selectedRow: KpiRow | undefined = data?.kpi.find(r => r.month === month)
  const derived = selectedRow ? computeDerived(selectedRow) : null

  const prevMonth = months[months.indexOf(month) - 1] ?? null
  const prevRow = prevMonth ? data?.kpi.find(r => r.month === prevMonth) : null

  // QA averages for selected and previous month
  const qaAvg = data?.qa_averages.find(r => r.month === month) ?? null
  const prevQaAvg = prevMonth ? (data?.qa_averages.find(r => r.month === prevMonth) ?? null) : null

  // QA summary for selected month
  const qaSummary = data?.summary.find(r => r.month === month) ?? null

  // QA evals for selected month
  const qaEvals = data?.qa.filter(r => r.month === month) ?? []

  // Chart trend data
  const trendData = (data?.kpi ?? []).map(r => {
    const d = computeDerived(r)
    return {
      month: r.month,
      phone_cs: r.phone_cs,
      email_cs: r.email_cs,
      some_cs: r.some_cs,
      phone_cr: r.phone_cr,
      email_cr: r.email_cr,
      some_cr: r.some_cr,
      call_aht: r.call_aht != null ? parseFloat(r.call_aht.toFixed(2)) : null,
      email_aht: r.email_aht != null ? parseFloat(r.email_aht.toFixed(2)) : null,
      some_aht: r.some_aht != null ? parseFloat(r.some_aht.toFixed(2)) : null,
      acw: r.acw != null ? parseFloat(r.acw.toFixed(2)) : null,
      sc_pct: d.sc_pct,
      calls_answered: r.calls_answered,
      emails_answered: r.emails_answered,
      some_contacts: r.some_contacts,
      total: d.total_interactions,
      phone_efficiency: d.phone_efficiency,
      email_efficiency: d.email_efficiency,
      some_efficiency: d.some_efficiency,
      productivity: d.productivity_index,
    }
  })

  // Channel-specific column keys
  const csatKey = channel === 'phone' ? 'phone_cs' : channel === 'email' ? 'email_cs' : 'some_cs'
  const crKey = channel === 'phone' ? 'phone_cr' : channel === 'email' ? 'email_cr' : 'some_cr'
  const ahtKey = channel === 'phone' ? 'call_aht' : channel === 'email' ? 'email_aht' : 'some_aht'
  const effKey = channel === 'phone' ? 'phone_efficiency' : channel === 'email' ? 'email_efficiency' : 'some_efficiency'

  const csatGoal = GOALS[`${channel === 'some' ? 'some' : channel}_cs` as keyof typeof GOALS] as number
  const crGoal = GOALS[`${channel === 'some' ? 'some' : channel}_cr` as keyof typeof GOALS] as number

  // ── Render helpers ───────────────────────────────────────────────────────

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'charts', label: 'Charts' },
    { id: 'quality', label: 'Quality assurance' },
    { id: 'upload', label: 'Upload data' },
  ]

  // ── Sidebar / topbar layout ───────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '0.5px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 28px' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 17,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}>
            CS Dashboard
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Customer Service KPIs
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 10px' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '9px 14px',
                borderRadius: 9,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? 'var(--brand)' : 'var(--text-secondary)',
                background: tab === t.id ? 'var(--brand-light)' : 'transparent',
                marginBottom: 2,
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Controls */}
        <div style={{ padding: '20px 14px 8px', borderTop: '0.5px solid var(--border-default)' }}>
          <p className="label" style={{ marginBottom: 8 }}>Month</p>
          <select
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-raised)',
              border: '0.5px solid var(--border-strong)',
              color: 'var(--text-primary)',
              padding: '7px 10px',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 14,
              cursor: 'pointer',
            }}
          >
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <p className="label" style={{ marginBottom: 8 }}>Channel</p>
          <select
            value={channel}
            onChange={e => setChannel(e.target.value as Channel)}
            style={{
              width: '100%',
              background: 'var(--bg-raised)',
              border: '0.5px solid var(--border-strong)',
              color: 'var(--text-primary)',
              padding: '7px 10px',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 18,
              cursor: 'pointer',
            }}
          >
            {Object.entries(CHANNEL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          <button
            onClick={() => setDark(d => !d)}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 8,
              border: '0.5px solid var(--border-strong)',
              background: 'var(--bg-raised)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {dark ? '☀ Light mode' : '☾ Dark mode'}
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflowX: 'hidden', padding: '28px 32px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: 4,
            }}>
              {tab === 'overview' ? `KPI Summary — ${month}` :
                tab === 'charts' ? `Trends — ${CHANNEL_LABELS[channel]}` :
                  tab === 'quality' ? `Quality Assurance — ${month}` :
                    'Upload Data'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {tab === 'overview' && prevMonth && `vs ${prevMonth}`}
              {tab === 'charts' && `${months.length} months of data`}
              {tab === 'quality' && qaEvals.length > 0 && `${qaEvals.length} evaluations this month`}
            </p>
          </div>
          {loading && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 12px', background: 'var(--bg-surface)', borderRadius: 8, border: '0.5px solid var(--border-default)' }}>
              Loading…
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13 }}>
            {error}
          </div>
        )}

        {!loading && !error && data?.kpi.length === 0 && tab !== 'upload' && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📊</div>
            <p style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>No data yet</p>
            <p style={{ fontSize: 13 }}>Upload your quality.xlsx file to get started.</p>
            <button
              onClick={() => setTab('upload')}
              style={{
                marginTop: 20, padding: '8px 20px', borderRadius: 9,
                border: '0.5px solid var(--border-strong)',
                background: 'var(--bg-surface)', color: 'var(--brand)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Go to Upload →
            </button>
          </div>
        )}

        {/* ════ OVERVIEW TAB ════════════════════════════════════════════ */}
        {tab === 'overview' && selectedRow && (
          <div className="fade-in">

            <SectionDivider label="Customer satisfaction" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 12 }}>
              <KpiCard label="Phone CSAT" value={selectedRow.phone_cs} format="percent" goal={GOALS.phone_cs} />
              <KpiCard label="Email CSAT" value={selectedRow.email_cs} format="percent" goal={GOALS.email_cs} />
              <KpiCard label="SoMe CSAT" value={selectedRow.some_cs} format="percent" goal={GOALS.some_cs} />
              <KpiCard label="Phone CR" value={selectedRow.phone_cr} format="percent" goal={GOALS.phone_cr} />
              <KpiCard label="Email CR" value={selectedRow.email_cr} format="percent" goal={GOALS.email_cr} />
              <KpiCard label="SoMe CR" value={selectedRow.some_cr} format="percent" goal={GOALS.some_cr} />
            </div>

            <SectionDivider label="Handling times" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 12 }}>
              <KpiCard label="Phone AHT" value={selectedRow.call_aht} format="time" goal={GOALS.call_aht} lowerIsBetter accent="var(--teal)" />
              <KpiCard label="Email AHT" value={selectedRow.email_aht} format="time" goal={GOALS.email_aht} lowerIsBetter accent="var(--teal)" />
              <KpiCard label="SoMe AHT" value={selectedRow.some_aht} format="time" goal={GOALS.some_aht} lowerIsBetter accent="var(--teal)" />
              <KpiCard label="Phone ACW" value={selectedRow.acw} format="time" goal={GOALS.acw} lowerIsBetter accent="var(--amber)" />
              <KpiCard label="SoMe NRR" value={selectedRow.nrr} format="time" accent="var(--purple)" />
              <KpiCard label="Service calls (email)" value={derived?.sc_pct} format="percent" goal={GOALS.sc_pct} lowerIsBetter accent="var(--red)" />
            </div>

            <SectionDivider label="Volume & productivity" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 12 }}>
              <KpiCard label="Total interactions" value={derived?.total_interactions} format="integer" accent="var(--brand)" />
              <KpiCard label="Phone efficiency" value={derived?.phone_efficiency} format="decimal" accent="var(--brand)" />
              <KpiCard label="Email efficiency" value={derived?.email_efficiency} format="decimal" accent="var(--brand)" />
              <KpiCard label="SoMe efficiency" value={derived?.some_efficiency} format="decimal" accent="var(--brand)" />
              <KpiCard label="QA pass rate" value={selectedRow.qa_pass_rate} format="percent" goal={GOALS.qa_pass_rate} accent="var(--purple)" />
              <KpiCard label="Productivity index" value={derived?.productivity_index} format="percent" accent="var(--green)" />
            </div>

            {/* Month-on-month delta summary */}
            {prevRow && (
              <>
                <SectionDivider label={`vs ${prevMonth}`} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 12 }}>
                  {[
                    ['Phone CSAT', selectedRow.phone_cs, prevRow.phone_cs, '%'],
                    ['Email CSAT', selectedRow.email_cs, prevRow.email_cs, '%'],
                    ['Phone CR', selectedRow.phone_cr, prevRow.phone_cr, '%'],
                    ['Phone AHT', selectedRow.call_aht, prevRow.call_aht, ' min', true],
                    ['QA pass', selectedRow.qa_pass_rate, prevRow.qa_pass_rate, '%'],
                  ].map(([label, curr, prev, suf, lower]) => {
                    const c = curr as number | null
                    const p = prev as number | null
                    if (c === null || p === null) return null
                    const delta = c - p
                    const positive = (lower ? delta < 0 : delta > 0)
                    return (
                      <div key={label as string} className="card" style={{ borderTop: `3px solid ${positive ? 'var(--green)' : delta === 0 ? 'var(--border-strong)' : 'var(--red)'}` }}>
                        <div className="label" style={{ marginBottom: 6 }}>{label as string}</div>
                        <div className="value-xl">{suf === ' min' ? minutesToDisplay(c) : `${Math.round(c)}${suf}`}</div>
                        <div style={{ fontSize: 12, marginTop: 6, color: positive ? 'var(--green)' : delta === 0 ? 'var(--text-muted)' : 'var(--red)', fontWeight: 500 }}>
                          {delta > 0 ? '+' : ''}{suf === ' min' ? minutesToDisplay(Math.abs(delta)) : `${Math.round(delta)}${suf}`} vs {prevMonth}
                        </div>
                      </div>
                    )
                  }).filter(Boolean)}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════ CHARTS TAB ══════════════════════════════════════════════ */}
        {tab === 'charts' && (
          <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* key={channel} forces Recharts to fully remount when channel changes */}
            <ChartCard title={`CSAT trend — ${CHANNEL_LABELS[channel]}`}>
              <TrendChart
                key={`csat-${channel}`}
                data={trendData}
                lines={[{ key: csatKey, label: 'CSAT %', color: 'var(--c1)' }]}
                selectedMonth={month}
                yDomain={[40, 100]}
                tooltipFormatter={(v, n) => [`${v.toFixed(1)}%`, n]}
              />
            </ChartCard>

            <ChartCard title={`CR trend — ${CHANNEL_LABELS[channel]}`}>
              <TrendChart
                key={`cr-${channel}`}
                data={trendData}
                lines={[{ key: crKey, label: 'CR %', color: 'var(--c2)' }]}
                selectedMonth={month}
                yDomain={[40, 100]}
                tooltipFormatter={(v, n) => [`${v.toFixed(1)}%`, n]}
              />
            </ChartCard>

            <ChartCard title={`AHT trend — ${CHANNEL_LABELS[channel]}`}>
              <TrendChart
                key={`aht-${channel}`}
                data={trendData}
                lines={[{ key: ahtKey, label: 'AHT (min)', color: 'var(--c3)' }]}
                selectedMonth={month}
                yDomain={[0, 'auto']}
                yFormatter={(v) => minutesToDisplay(v)}
                tooltipFormatter={(v, n) => [minutesToDisplay(v), n]}
              />
            </ChartCard>

            <ChartCard title="ACW trend — phone">
              <TrendChart
                key="acw"
                data={trendData}
                lines={[{ key: 'acw', label: 'ACW (min)', color: 'var(--c4)' }]}
                selectedMonth={month}
                yDomain={[0, 'auto']}
                yFormatter={(v) => minutesToDisplay(v)}
                tooltipFormatter={(v, n) => [minutesToDisplay(v), n]}
              />
            </ChartCard>

            <ChartCard title="Service calls — email (%)">
              <TrendChart
                key="sc"
                data={trendData}
                lines={[{ key: 'sc_pct', label: 'SC %', color: 'var(--c5)' }]}
                selectedMonth={month}
                yDomain={[0, 'auto']}
                tooltipFormatter={(v, n) => [`${v?.toFixed(1)}%`, n]}
              />
            </ChartCard>

            <ChartCard title="Total interactions by month">
              <GroupedBarChart
                data={trendData}
                bars={[
                  { key: 'calls_answered', label: 'Phone', color: 'var(--c1)' },
                  { key: 'emails_answered', label: 'Email', color: 'var(--c2)' },
                  { key: 'some_contacts', label: 'Social', color: 'var(--c3)' },
                ]}
                stacked
                tooltipFormatter={(v, n) => [v.toLocaleString(), n]}
              />
            </ChartCard>

            <ChartCard title={`Efficiency trend — ${CHANNEL_LABELS[channel]}`}>
              <TrendChart
                key={`eff-${channel}`}
                data={trendData}
                lines={[{ key: effKey, label: 'int/min', color: 'var(--c3)' }]}
                selectedMonth={month}
                yDomain={[0, 'auto']}
                tooltipFormatter={(v, n) => [v.toFixed(2), n]}
              />
            </ChartCard>

            <ChartCard title="Productivity index trend">
              <TrendChart
                key="prod"
                data={trendData}
                lines={[{ key: 'productivity', label: 'Productivity %', color: 'var(--c2)' }]}
                selectedMonth={month}
                yDomain={[50, 100]}
                tooltipFormatter={(v, n) => [`${v?.toFixed(1)}%`, n]}
              />
            </ChartCard>
          </div>
        )}

        {/* ════ QUALITY ASSURANCE TAB ══════════════════════════════════ */}
        {tab === 'quality' && (
          <div className="fade-in">

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              {/* QA metrics bars */}
              <div className="card">
                <p className="section-title" style={{ marginBottom: 16 }}>QA scores — {month}</p>
                <QaMetrics
                  cc={qaAvg?.avg_cc}
                  ec={qaAvg?.avg_ec}
                  bc={qaAvg?.avg_bc}
                />
                <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--bg-raised)', borderRadius: 9, display: 'flex', gap: 20 }}>
                  <div>
                    <div className="label">Evaluations</div>
                    <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--text-primary)' }}>{qaAvg?.evaluations_count ?? 0}</div>
                  </div>
                  <div>
                    <div className="label">Compliant</div>
                    <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--green)' }}>{qaAvg?.compliant_count ?? 0}</div>
                  </div>
                  <div>
                    <div className="label">Non-compliant</div>
                    <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--red)' }}>{qaAvg?.non_compliant_count ?? 0}</div>
                  </div>
                </div>
              </div>

              {/* QA comparison chart */}
              <div className="card">
                <p className="section-title" style={{ marginBottom: 16 }}>
                  {prevMonth ? `${prevMonth} vs ${month}` : `QA comparison — ${month}`}
                </p>
                <QaComparisonChart
                  prev={prevQaAvg ? { cc: prevQaAvg.avg_cc, ec: prevQaAvg.avg_ec, bc: prevQaAvg.avg_bc } : null}
                  curr={qaAvg ? { cc: qaAvg.avg_cc, ec: qaAvg.avg_ec, bc: qaAvg.avg_bc } : null}
                  prevLabel={prevMonth ?? 'Previous'}
                  currLabel={month}
                />
              </div>

              {/* Strengths */}
              <div className="card" style={{ borderTop: '3px solid var(--green)' }}>
                <p className="section-title" style={{ marginBottom: 12 }}>Strengths — {month}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.75 }}>
                  {qaSummary?.strengths ?? 'No summary available for this month.'}
                </p>
              </div>

              {/* Improvements */}
              <div className="card" style={{ borderTop: '3px solid var(--amber)' }}>
                <p className="section-title" style={{ marginBottom: 12 }}>Areas to improve — {month}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.75 }}>
                  {qaSummary?.improvements ?? 'No improvement notes available for this month.'}
                </p>
              </div>
            </div>

            {/* Evaluated contacts table */}
            <SectionDivider label="Evaluated contacts" />
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="dash-table">
                  <thead>
                    <tr>
                      {['Date', 'Channel', 'Contact type', 'Score', 'CC', 'EC', 'BC', 'Compliant', 'Comments'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {qaEvals.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                          No evaluations found for {month}
                        </td>
                      </tr>
                    ) : qaEvals.map(row => {
                      const allPass = (row.cc ?? 0) >= GOALS.cc && (row.ec ?? 0) >= GOALS.ec && (row.bc ?? 0) >= GOALS.bc
                      return (
                        <tr key={row.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.contact_date}</td>
                          <td>{row.type}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{row.logging ?? '—'}</td>
                          <td>
                            <span style={{
                              fontWeight: 700,
                              color: (row.score ?? 0) >= 95 ? 'var(--green)' : (row.score ?? 0) >= 85 ? 'var(--amber)' : 'var(--red)',
                            }}>
                              {row.score != null ? `${row.score}%` : '—'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${(row.cc ?? 0) >= GOALS.cc ? 'badge-pass' : 'badge-fail'}`}>
                              {row.cc != null ? `${row.cc}%` : '—'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${(row.ec ?? 0) >= GOALS.ec ? 'badge-pass' : 'badge-fail'}`}>
                              {row.ec != null ? `${row.ec}%` : '—'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${(row.bc ?? 0) >= GOALS.bc ? 'badge-pass' : 'badge-fail'}`}>
                              {row.bc != null ? `${row.bc}%` : '—'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${row.compliant === true ? 'badge-pass' : row.compliant === false ? 'badge-fail' : 'badge-warn'}`}>
                              {row.compliant === true ? 'Yes' : row.compliant === false ? 'No' : '—'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row.comments ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════ UPLOAD TAB ══════════════════════════════════════════════ */}
        {tab === 'upload' && (
          <div className="fade-in">
            <UploadZone onSuccess={fetchData} />
          </div>
        )}

      </main>
    </div>
  )
}
