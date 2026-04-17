-- ============================================================
-- Customer Service Dashboard — Supabase Schema
-- ============================================================
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================


-- ============================================================
-- 1. RAW KPI DATA  (from sheet: raw_data)
-- ============================================================
-- One row per month. Upserted on upload so re-uploading the
-- same month overwrites rather than duplicates.

create table if not exists kpi_data (
  id             bigint generated always as identity primary key,
  month          text        not null,   -- e.g. "January"
  month_order    smallint    not null,   -- 1-12 for sort order

  -- Volume
  calls_answered    integer,
  emails_answered   integer,
  some_contacts     integer,            -- derived from some_surveys denominator

  -- Time metrics (stored as decimal minutes for easy arithmetic)
  call_aht          numeric(6,2),       -- Phone AHT in minutes
  acw               numeric(6,2),       -- After Call Work in minutes
  email_aht         numeric(6,2),       -- Email AHT in minutes
  some_aht          numeric(6,2),       -- Social Media AHT in minutes
  nrr               numeric(6,2),       -- No Response Required time in minutes

  -- CSAT (percentage 0-100)
  phone_cs          numeric(5,2),
  email_cs          numeric(5,2),
  some_cs           numeric(5,2),

  -- Contact Resolution (percentage 0-100)
  phone_cr          numeric(5,2),
  email_cr          numeric(5,2),
  some_cr           numeric(5,2),

  -- Survey / FCR counts
  phone_surveys     integer,
  email_surveys     integer,
  some_surveys      integer,

  -- Service calls (email)
  sc                integer,            -- SC issued
  sc_done           integer,            -- SC completed

  -- QA pass rate (percentage 0-100)
  qa_pass_rate      numeric(5,2),       -- maps from "Q&A_pass_rate"

  -- Timestamps
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),

  -- Unique constraint: one record per month
  constraint kpi_data_month_unique unique (month)
);

-- Index for fast month lookups and sorted queries
create index if not exists kpi_data_month_order_idx on kpi_data (month_order);

-- Auto-update updated_at on upsert
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger kpi_data_updated_at
  before update on kpi_data
  for each row execute procedure set_updated_at();


-- ============================================================
-- 2. QA EVALUATIONS  (from sheet: qa_data)
-- ============================================================
-- One row per evaluated contact. Multiple rows per month.
-- "month" is derived from contact_date on insert.

create table if not exists qa_evaluations (
  id            bigint generated always as identity primary key,
  month         text        not null,   -- derived: "January", "February" …
  contact_date  date        not null,

  -- Channel: 'Phone' | 'Email' | 'Social Media'
  type          text        not null,

  -- Contact reason / log category (e.g. "RETURN/EXCHANGE")
  logging       text,

  -- Evaluation scores
  score         numeric(5,2),           -- Overall score 0-100
  compliant     boolean,                -- YES → true, NO → false

  -- Sub-metric scores (0-100)
  cc            numeric(5,2),           -- Compliance Critical  — goal: 99.5%
  ec            numeric(5,2),           -- End Customer Critical — goal: 95%
  bc            numeric(5,2),           -- Business Critical    — goal: 90%

  -- Free-text feedback
  comments      text,

  created_at    timestamptz default now()
);

create index if not exists qa_eval_month_idx  on qa_evaluations (month);
create index if not exists qa_eval_date_idx   on qa_evaluations (contact_date);
create index if not exists qa_eval_type_idx   on qa_evaluations (type);


-- ============================================================
-- 3. QA MONTHLY SUMMARY  (from sheet: qa_results)
-- ============================================================
-- One row per month with narrative strengths/improvements.

create table if not exists qa_summary (
  id           bigint generated always as identity primary key,
  month        text  not null,
  strengths    text,
  improvements text,

  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),

  constraint qa_summary_month_unique unique (month)
);

create trigger qa_summary_updated_at
  before update on qa_summary
  for each row execute procedure set_updated_at();


-- ============================================================
-- 4. UPLOAD LOG  (audit trail — optional but recommended)
-- ============================================================

create table if not exists upload_log (
  id           bigint generated always as identity primary key,
  filename     text        not null,
  uploaded_at  timestamptz default now(),
  rows_kpi     integer,                 -- rows upserted into kpi_data
  rows_qa      integer,                 -- rows inserted into qa_evaluations
  rows_summary integer,                 -- rows upserted into qa_summary
  status       text default 'success',  -- 'success' | 'error'
  error_msg    text                     -- populated on failure
);


-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Enable RLS on all tables. For now, allow full public read
-- (dashboard is read-only for agents). Writes go through the
-- Next.js API route using the service-role key (server-side only).

alter table kpi_data       enable row level security;
alter table qa_evaluations enable row level security;
alter table qa_summary     enable row level security;
alter table upload_log     enable row level security;

-- Public read access (anon key — safe for dashboard display)
create policy "Public read kpi_data"
  on kpi_data for select using (true);

create policy "Public read qa_evaluations"
  on qa_evaluations for select using (true);

create policy "Public read qa_summary"
  on qa_summary for select using (true);

-- Writes are blocked for anon — only the service-role key
-- used by the Next.js API route (/api/upload) can insert/upsert.
-- No insert/update/delete policies needed here for anon.


-- ============================================================
-- 6. HELPER VIEW — monthly QA averages
-- ============================================================
-- Pre-aggregates CC / EC / BC per month so the dashboard
-- can fetch one row per month instead of averaging client-side.

create or replace view qa_monthly_averages as
select
  month,
  round(avg(cc)::numeric, 2)    as avg_cc,
  round(avg(ec)::numeric, 2)    as avg_ec,
  round(avg(bc)::numeric, 2)    as avg_bc,
  round(avg(score)::numeric, 2) as avg_score,
  count(*)                       as evaluations_count,
  count(*) filter (where compliant = true)  as compliant_count,
  count(*) filter (where compliant = false) as non_compliant_count
from qa_evaluations
group by month;


-- ============================================================
-- 7. MONTH ORDER REFERENCE  (for deterministic sorting)
-- ============================================================

create table if not exists month_reference (
  month_name  text     primary key,
  month_order smallint not null
);

insert into month_reference (month_name, month_order) values
  ('January',   1), ('February',  2), ('March',     3),
  ('April',     4), ('May',        5), ('June',      6),
  ('July',      7), ('August',     8), ('September', 9),
  ('October',  10), ('November',  11), ('December', 12)
on conflict (month_name) do nothing;
