# ✅ LinkRank — Local Setup Checklist

Work through each step in order. Expected output is noted after each command.

---

## Step 1 — Start Supabase & Run Migrations

```bash
# Ensure Docker is running first!
npx supabase start
```

**Expected:** Supabase services start up, migrations are automatically applied. A Studio URL (usually http://127.0.0.1:54323) is printed in the terminal.

**Common failure:** `failed to inspect service: error during connect...`
→ Fix: Docker is not running. Start Docker Desktop and try again.

**Common failure:** Port conflicts
→ Fix: Stop any local postgres or other services on ports 5432, 54321-54326.

---

## Step 2 — Configure Edge Function Secrets

Get your Crustdata API key from https://crustdata.com.

```bash
npx supabase secrets set CRUSTDATA_API_KEY=your_crustdata_key
```

---

## Step 3 — Configure Frontend Environment

```bash
cp .env.example .env
```

Open `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. You can find these in the terminal output from `supabase start` (API URL and anon key), or in Supabase Studio -> Settings -> API.

---

## Step 4 — Start Frontend

```bash
npm install
npm run dev
```

**Expected:** `Local: http://localhost:5173`

Open http://localhost:5173 in your browser.

---

## Step 5 — Test Crustdata Edge Function (Optional but recommended)

Test the integration with a real profile using `curl`:

```bash
curl -i --request POST 'http://127.0.0.1:54321/functions/v1/test-crustdata' \
  --header 'Content-Type: application/json' \
  --data '{"url":"https://www.linkedin.com/in/satyanadella/"}'
```

**Expected:**
- Returns JSON with `raw` and `normalized` keys. Inspect to make sure name, company, etc. mapped correctly.
- If it returns `{"status":"pending"}`, the profile is being enriched. Wait 30 mins and retry.

---

## Step 6 — Set up Test Users

1. Open Supabase Studio (usually http://127.0.0.1:54323).
2. Go to **Authentication** -> Add User -> Create new user.
3. Create 3 users (e.g. `sourcer@linkrank.dev`, `recruiter@linkrank.dev`, `lead@linkrank.dev`).
4. Go to **Table Editor** -> `recruiters` table.
5. Notice that rows were automatically created for each user thanks to the DB trigger.
6. Edit their tiers: set one to `tier_1`, one to `tier_2`, one to `tier_3`.

---

## Step 7 — Test Tier-based UI

| Tier   | Expected UI behavior                                |
|--------|-----------------------------------------------------|
| tier_1 | "Run Sourcing" button is disabled with tooltip      |
| tier_2 | "Run Sourcing" button is active                     |
| tier_3 | Same as tier_2, plus can export any shortlist       |

Sign in as each user in the frontend, verify the top nav shows the correct tier badge.

---

## Step 8 — Full end-to-end cycle

1. **Log in** as your `tier_2` or `tier_3` user.
2. **Ingest page**: paste 2–3 LinkedIn URLs, enter title keywords (e.g. `senior engineer`) and skill keywords (e.g. `python, kubernetes`).
3. Click **Run Sourcing** — wait for the success message and auto-redirect to leaderboard.
4. **Leaderboard**: verify candidates appear ranked by score, try filtering by seniority tier and company.
5. Select 2 candidates, click **Create shortlist**, name it "Test Shortlist".
6. Click the **⬇ Download CSV** link — verify a CSV downloads via Edge Function export with name, title, company, score, tier columns.
7. **Candidate detail**: click a name to see the full profile, experience timeline, and score breakdown.

**Common failure:** Ingest returns 502 (Crustdata API error)
→ Fix: Check CRUSTDATA_API_KEY secret and that the LinkedIn URLs are valid public profiles.

**Common failure:** Score shows as 0 for all sub-scores
→ Fix: Run `deno test supabase/functions/_shared/` to verify scoring logic, and check `normalizeProfile` mapping.

**Common failure:** RLS blocking or CORS errors on Edge Functions
→ Fix: Ensure `supabase start` ran successfully, migrations are applied, and Edge Functions are using `corsHeaders`.
