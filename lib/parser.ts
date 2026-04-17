import * as XLSX from 'xlsx'
import {
  timeToMinutes,
  parsePercent,
  capitalizeMonth,
  MONTH_ORDER,
  type KpiRow,
} from './metrics'

export interface ParsedUpload {
  kpiRows:     KpiRow[]
  qaRows:      QaRow[]
  summaryRows: QaSummaryRow[]
}

export interface QaRow {
  month:        string
  contact_date: string   // ISO date string
  type:         string
  logging:      string | null
  score:        number | null
  compliant:    boolean | null
  cc:           number | null
  ec:           number | null
  bc:           number | null
  comments:     string | null
}

export interface QaSummaryRow {
  month:        string
  strengths:    string | null
  improvements: string | null
}

function n(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const parsed = Number(v)
  return isNaN(parsed) ? null : parsed
}

function str(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  return String(v).trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// Main parser
// ─────────────────────────────────────────────────────────────────────────────

export function parseQualityXlsx(buffer: ArrayBuffer): ParsedUpload {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })

  // ── raw_data ──────────────────────────────────────────────────────────────
  const rawSheet = wb.Sheets['raw_data']
  if (!rawSheet) throw new Error("Sheet 'raw_data' not found in workbook")

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(rawSheet, {
    defval: null,
    raw: true,
  })

  const kpiRows: KpiRow[] = rawRows
    .filter(r => r['month'] !== null && r['month'] !== undefined)
    .map(r => {
      const month = capitalizeMonth(r['month'])
      return {
        month,
        month_order: MONTH_ORDER[month] ?? 99,
        calls_answered:  n(r['calls_answered']),
        emails_answered: n(r['emails_answered']),
        // some_contacts from some_surveys column (no dedicated count column in raw_data)
        some_contacts:   n(r['some_surveys']),
        call_aht:  timeToMinutes(r['call_AHT']),
        acw:       timeToMinutes(r['ACW']),
        email_aht: timeToMinutes(r['email_AHT']),
        some_aht:  timeToMinutes(r['Some_AHT']),
        nrr:       timeToMinutes(r['NRR']),
        phone_cs:  parsePercent(r['phone_CS']),
        email_cs:  parsePercent(r['email_CS']),
        some_cs:   parsePercent(r['some_CS']),
        phone_cr:  parsePercent(r['phone_CR']),
        email_cr:  parsePercent(r['email_CR']),
        some_cr:   parsePercent(r['some_CR']),
        phone_surveys: n(r['phone_surveys']),
        email_surveys: n(r['email_surveys']),
        some_surveys:  n(r['some_surveys']),
        sc:      n(r['SC']),
        sc_done: n(r['SC_done']),
        qa_pass_rate: parsePercent(r['Q&A_pass_rate']),
      }
    })

  // ── qa_data ───────────────────────────────────────────────────────────────
  const qaSheet = wb.Sheets['qa_data']
  const qaRows: QaRow[] = []

  if (qaSheet) {
    const qaRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(qaSheet, {
      defval: null,
      raw: false,   // cellDates + raw:false gives us formatted date strings
    })

    for (const r of qaRaw) {
      const rawDate = r['contact_date']
      let isoDate: string | null = null

      if (rawDate) {
        // XLSX with cellDates:true may return a Date object or formatted string
        const d = new Date(String(rawDate))
        isoDate = isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
      }

      // Derive month from contact_date
      const month = isoDate
        ? new Date(isoDate).toLocaleString('en-US', { month: 'long' })
        : null

      if (!month) continue

      const compliantRaw = str(r['compliant'])
      const compliant = compliantRaw === null
        ? null
        : compliantRaw.toUpperCase() === 'YES'

      qaRows.push({
        month,
        contact_date: isoDate!,
        type:     str(r['type']) ?? 'Unknown',
        logging:  str(r['logging']),
        score:    n(r['score']),
        compliant,
        cc:       n(r['CC']),
        ec:       n(r['EC']),
        bc:       n(r['BC']),
        comments: str(r['comments']),
      })
    }
  }

  // ── qa_results ────────────────────────────────────────────────────────────
  const summarySheet = wb.Sheets['qa_results']
  const summaryRows: QaSummaryRow[] = []

  if (summarySheet) {
    const summaryRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(summarySheet, {
      defval: null,
    })

    for (const r of summaryRaw) {
      const month = capitalizeMonth(r['month'])
      if (!month || month === 'Undefined') continue
      summaryRows.push({
        month,
        strengths:    str(r['strengths']),
        improvements: str(r['improvements']),
      })
    }
  }

  return { kpiRows, qaRows, summaryRows }
}
