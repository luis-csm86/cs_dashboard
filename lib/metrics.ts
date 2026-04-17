// ─── Time helpers ────────────────────────────────────────────────────────────

/**
 * Converts a time string like "05:48:00" or "5:48" or an Excel serial float
 * into decimal minutes.
 */
export function timeToMinutes(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  // XLSX with cellDates:true + raw:true returns Date objects for time cells.
  // Excel time cells are anchored to 1899-12-30, so we extract UTC H/M/S directly.
  if (value instanceof Date) {
    const h = value.getUTCHours()
    const m = value.getUTCMinutes()
    const s = value.getUTCSeconds()
    return parseFloat((h * 60 + m + s / 60).toFixed(4))
  }
  // Excel stores times as fraction of a day (float 0–1) when raw:true but no cellDates
  if (typeof value === 'number') {
    // Guard: values > 1 are full datetimes (days since epoch), extract time portion
    const timeFraction = value % 1
    return parseFloat((timeFraction * 24 * 60).toFixed(4))
  }

  // String fallback: "05:48:00", "5:48", "0:05:48"
  const s = String(value).trim()
  const parts = s.split(':')

  if (parts.length === 1) {
    const n = parseFloat(parts[0])
    return isNaN(n) ? null : n
  }
  if (parts.length === 2) {
    const [m, sec] = parts.map(Number)
    return isNaN(m) || isNaN(sec) ? null : m + sec / 60
  }
  if (parts.length === 3) {
    const [h, m, sec] = parts.map(Number)
    return isNaN(h) || isNaN(m) || isNaN(sec) ? null : h * 60 + m + sec / 60
  }
  return null
}

/**
 * Formats decimal minutes as "mm:ss" for display.
 */
export function minutesToDisplay(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '—'
  const totalSeconds = Math.round(minutes * 60)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Percentage parser ────────────────────────────────────────────────────────

export function parsePercent(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') {
    // Normalise 0-1 fractions to 0-100
    return value <= 1 ? parseFloat((value * 100).toFixed(2)) : parseFloat(value.toFixed(2))
  }
  const s = String(value).replace('%', '').trim()
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

// ─── Month utilities ──────────────────────────────────────────────────────────

export const MONTH_ORDER: Record<string, number> = {
  January: 1, February: 2, March: 3, April: 4,
  May: 5, June: 6, July: 7, August: 8,
  September: 9, October: 10, November: 11, December: 12,
}

export function capitalizeMonth(m: unknown): string {
  return String(m).trim().charAt(0).toUpperCase() + String(m).trim().slice(1).toLowerCase()
}

// ─── Derived metrics ──────────────────────────────────────────────────────────

export interface KpiRow {
  month: string
  month_order: number
  calls_answered: number | null
  emails_answered: number | null
  some_contacts: number | null
  call_aht: number | null
  acw: number | null
  email_aht: number | null
  some_aht: number | null
  nrr: number | null
  phone_cs: number | null
  email_cs: number | null
  some_cs: number | null
  phone_cr: number | null
  email_cr: number | null
  some_cr: number | null
  phone_surveys: number | null
  email_surveys: number | null
  some_surveys: number | null
  sc: number | null
  sc_done: number | null
  qa_pass_rate: number | null
}

export interface DerivedMetrics {
  phone_fcr: number | null
  email_fcr: number | null
  some_fcr: number | null
  sc_pct: number | null          // SC / emails_answered * 100
  sc_completion: number | null   // SC_done / SC * 100
  total_interactions: number | null
  phone_efficiency: number | null
  email_efficiency: number | null
  some_efficiency: number | null
  productivity_index: number | null
}

function safePct(numerator: number | null, denominator: number | null): number | null {
  if (!numerator || !denominator || denominator === 0) return null
  return parseFloat(((numerator / denominator) * 100).toFixed(2))
}

function safeDiv(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b === 0) return null
  return parseFloat((a / b).toFixed(4))
}

function avg(...vals: (number | null)[]): number | null {
  const valid = vals.filter((v): v is number => v !== null && !isNaN(v))
  return valid.length ? parseFloat((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2)) : null
}

export function computeDerived(row: KpiRow): DerivedMetrics {
  const phoneEff = safeDiv(row.calls_answered, row.call_aht !== null && row.acw !== null ? row.call_aht + row.acw : row.call_aht)
  const emailEff = safeDiv(row.emails_answered, row.email_aht)
  const someEff = safeDiv(row.some_contacts, row.some_aht)

  const csAvg = avg(row.phone_cs, row.email_cs, row.some_cs)
  const crAvg = avg(row.phone_cr, row.email_cr, row.some_cr)
  const qa = row.qa_pass_rate

  const prodParts: number[] = []
  if (csAvg !== null) prodParts.push(csAvg / 100 * 0.35)
  if (crAvg !== null) prodParts.push(crAvg / 100 * 0.30)
  if (qa !== null) prodParts.push(qa / 100 * 0.35)

  const productivity = prodParts.length
    ? parseFloat((prodParts.reduce((a, b) => a + b, 0) * 100).toFixed(2))
    : null

  return {
    phone_fcr: safePct(row.phone_surveys, row.calls_answered),
    email_fcr: safePct(row.email_surveys, row.emails_answered),
    some_fcr: safePct(row.some_surveys, row.some_contacts),
    sc_pct: safePct(row.sc, row.emails_answered),
    sc_completion: safePct(row.sc_done, row.sc),
    total_interactions: (row.calls_answered ?? 0) + (row.emails_answered ?? 0) + (row.some_contacts ?? 0),
    phone_efficiency: phoneEff,
    email_efficiency: emailEff,
    some_efficiency: someEff,
    productivity_index: productivity,
  }
}

// ─── Goal definitions ─────────────────────────────────────────────────────────

export const GOALS = {
  phone_cs: 90,
  email_cs: 88,
  some_cs: 85,
  phone_cr: 85,
  email_cr: 82,
  some_cr: 80,
  call_aht: 6,     // minutes — lower is better
  email_aht: 8,
  some_aht: 7,
  acw: 2.5,   // minutes — lower is better
  sc_pct: 15,    // % — lower is better
  qa_pass_rate: 95,
  cc: 99.5,
  ec: 95,
  bc: 90,
} as const
