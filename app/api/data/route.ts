import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'

export async function GET() {
  try {
    const [kpiRes, qaRes, summaryRes, avgRes] = await Promise.all([
      supabaseAdmin
        .from('kpi_data')
        .select('*')
        .order('month_order', { ascending: true }),

      supabaseAdmin
        .from('qa_evaluations')
        .select('*')
        .order('contact_date', { ascending: false }),

      supabaseAdmin
        .from('qa_summary')
        .select('*'),

      supabaseAdmin
        .from('qa_monthly_averages')
        .select('*'),
    ])

    if (kpiRes.error) throw new Error(kpiRes.error.message)
    if (qaRes.error) throw new Error(qaRes.error.message)
    if (summaryRes.error) throw new Error(summaryRes.error.message)

    return NextResponse.json({
      kpi: kpiRes.data ?? [],
      qa: qaRes.data ?? [],
      summary: summaryRes.data ?? [],
      qa_averages: avgRes.data ?? [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/data]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
