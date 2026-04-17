# CS Dashboard

A Next.js customer service KPI dashboard deployable to Vercel with Supabase for persistence.

---

## Quick start

### 1. Supabase setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor → New query**, paste the contents of `supabase_schema.sql`, and click **Run**
3. Go to **Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 2. Local environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your three Supabase values:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Upload your data

- Go to the **Upload data** tab
- Drop your `quality.xlsx` file
- The dashboard updates automatically

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

When prompted, add the three environment variables from your `.env.local`.

Or connect via the Vercel dashboard:
1. Push this folder to a GitHub repo
2. Import the repo in [vercel.com/new](https://vercel.com/new)
3. Add environment variables under **Settings → Environment Variables**
4. Deploy

---

## Project structure

```
app/
  page.tsx              ← Main dashboard (all tabs)
  layout.tsx            ← Fonts, metadata
  globals.css           ← Design tokens, base styles
  api/
    upload/route.ts     ← POST: parse xlsx → upsert Supabase
    data/route.ts       ← GET: fetch all data for dashboard

components/
  KpiCard.tsx           ← KPI card with goal colour coding
  Charts.tsx            ← Recharts wrappers (trend, bar, QA)
  QaMetrics.tsx         ← CC / EC / BC progress bars
  UploadZone.tsx        ← Drag-and-drop upload UI

lib/
  metrics.ts            ← Time converters, derived metrics, goals
  parser.ts             ← SheetJS Excel parser
  supabase.ts           ← Browser client (anon key)
  supabase-admin.ts     ← Server client (service-role key)
```

---

## Excel file format

The dashboard expects a file named `quality.xlsx` with three sheets:

| Sheet | Contents |
|---|---|
| `raw_data` | One row per month with all KPI columns |
| `qa_data` | One row per QA evaluation |
| `qa_results` | One row per month with strengths/improvements text |

### raw_data columns

`month`, `calls_answered`, `emails_answered`, `call_AHT`, `ACW`, `email_AHT`,
`phone_CS`, `phone_CR`, `phone_surveys`, `email_CS`, `email_CR`, `email_surveys`,
`SC`, `SC_done`, `Q&A_pass_rate`, `Some_AHT`, `NRR`, `some_CS`, `some_CR`, `some_surveys`

Time columns (`call_AHT`, `ACW`, `email_AHT`, `Some_AHT`, `NRR`) accept `HH:MM:SS` format.
Percentage columns accept 0–100 integers or 0–1 decimals.

### qa_data columns

`contact_date`, `type` (Phone / Email / Social Media), `logging`, `score`, `compliant` (YES/NO),
`CC`, `EC`, `BC`, `comments`

### qa_results columns

`month`, `strengths`, `improvements`

---

## KPI goals

| Metric | Goal | Direction |
|---|---|---|
| Phone CSAT | 90% | Higher |
| Email CSAT | 88% | Higher |
| SoMe CSAT | 85% | Higher |
| Phone CR | 85% | Higher |
| Email CR | 82% | Higher |
| SoMe CR | 80% | Higher |
| Phone AHT | 6 min | Lower |
| Email AHT | 8 min | Lower |
| SoMe AHT | 7 min | Lower |
| Phone ACW | 2.5 min | Lower |
| Service calls (email) | 15% | Lower |
| QA pass rate | 95% | Higher |
| CC score | 99.5% | Higher |
| EC score | 95% | Higher |
| BC score | 90% | Higher |

Goals can be edited in `lib/metrics.ts` → `GOALS` object.
