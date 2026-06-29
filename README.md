# ⚡ LinkRank

**AI-powered candidate scoring for modern recruiters.**

LinkRank enriches LinkedIn profiles via the [Crustdata API](https://crustdata.com), scores candidates against a target role using three signal dimensions, and presents a ranked leaderboard with role-based access control for three recruiter tiers.

---

## Architecture

```
linkrank/
  src/        React + Vite Frontend
  supabase/   Postgres + Supabase Edge Functions
```

## Quick Start

### 1. Database & Edge Functions (Supabase)

```bash
# Requires Docker running
npx supabase start
# Note the Studio URL provided in the output
```

### 2. Frontend

```bash
cp .env.example .env
# Edit .env — fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from Supabase Studio settings
npm install
npm run dev       # starts on http://localhost:5173
```

---

## Environment Variables

### Supabase Edge Functions (Secrets)
Set via `npx supabase secrets set <NAME>=<VALUE>`

| Variable            | Description                             |
|---------------------|-----------------------------------------|
| `CRUSTDATA_API_KEY` | Crustdata API key (from crustdata.com)  |

### Frontend (.env)

| Variable                  | Description                             |
|---------------------------|-----------------------------------------|
| `VITE_SUPABASE_URL`       | Supabase API URL                        |
| `VITE_SUPABASE_ANON_KEY`  | Supabase Anonymous API Key              |

---

## API Endpoints (Edge Functions & DB)

| Feature                       | Implementation                  | Auth           |
|-------------------------------|---------------------------------|----------------|
| Ingest Candidates             | Edge Function `ingest-candidates` | tier_2+      |
| View Candidate & Scores       | Direct Postgres SELECT (RLS)    | Any auth       |
| View Leaderboard              | Direct Postgres SELECT (RLS)    | Any auth       |
| Create Shortlist              | Postgres RPC `create_shortlist` | Any auth       |
| View Shortlist                | Direct Postgres SELECT (RLS)    | Own or tier_3  |
| Export Shortlist              | Edge Function `export-shortlist`| Own or tier_3  |

---

## Scoring Model

Three sub-scores, each 0–100, combined into a weighted composite:

| Signal                   | Weight | Description                                        |
|--------------------------|--------|----------------------------------------------------|
| Experience Velocity      | 30%    | Roles per year — tuned curve with job-hopping decay|
| Keyword Frequency        | 45%    | Word-boundary matching across titles + descriptions|
| Promotion Trajectory     | 25%    | Seniority growth detected within each company      |

To test the scoring logic, you can run Deno tests:
`deno test supabase/functions/_shared/`

---

## ⚠️ Before relying on scores

1. Run the test edge function against a real LinkedIn URL to confirm the Crustdata API response schema. Use `curl` to invoke `test-crustdata` and check raw output.
2. If fields differ, update `normalizeProfile()` in `supabase/functions/_shared/crustDataClient.ts`.
