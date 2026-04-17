import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { parseQualityXlsx } from '@/lib/parser'

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Only .xlsx files are accepted' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const { kpiRows, qaRows, summaryRows } = parseQualityXlsx(buffer)

    // ── Upsert KPI data ───────────────────────────────────────────────────────
    const { error: kpiError } = await supabaseAdmin
      .from('kpi_data')
      .upsert(kpiRows, { onConflict: 'month' })

    if (kpiError) throw new Error(`KPI upsert failed: ${kpiError.message}`)

    // ── Delete existing QA rows for affected months, then insert fresh ────────
    // (safer than upsert because there's no unique key per evaluation)
    const affectedMonths = [...new Set(qaRows.map(r => r.month))]

    if (affectedMonths.length > 0) {
      const { error: delError } = await supabaseAdmin
        .from('qa_evaluations')
        .delete()
        .in('month', affectedMonths)

      if (delError) throw new Error(`QA delete failed: ${delError.message}`)
    }

    if (qaRows.length > 0) {
      const { error: qaError } = await supabaseAdmin
        .from('qa_evaluations')
        .insert(qaRows)

      if (qaError) throw new Error(`QA insert failed: ${qaError.message}`)
    }

    // ── Upsert QA summary ─────────────────────────────────────────────────────
    if (summaryRows.length > 0) {
      const { error: sumError } = await supabaseAdmin
        .from('qa_summary')
        .upsert(summaryRows, { onConflict: 'month' })

      if (sumError) throw new Error(`QA summary upsert failed: ${sumError.message}`)
    }

    // ── Log the upload ────────────────────────────────────────────────────────
    await supabaseAdmin.from('upload_log').insert({
      filename: file.name,
      rows_kpi: kpiRows.length,
      rows_qa: qaRows.length,
      rows_summary: summaryRows.length,
      status: 'success',
    })

    return NextResponse.json({
      ok: true,
      counts: {
        kpi: kpiRows.length,
        qa: qaRows.length,
        summary: summaryRows.length,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/upload]', message)

    // Log failure
    try {
      await supabaseAdmin.from('upload_log').insert({
        filename: 'unknown',
        status: 'error',
        error_msg: message,
      })
    } catch (_) { }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
