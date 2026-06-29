-- LinkRank Postgres Schema Migration
-- Converted from MySQL schema

-- ENUM Types
CREATE TYPE recruiter_tier_enum AS ENUM('tier_1', 'tier_2', 'tier_3');
CREATE TYPE enrichment_status_enum AS ENUM('done', 'pending_enrichment', 'failed');
CREATE TYPE seniority_tier_enum AS ENUM('junior', 'mid', 'senior', 'lead', 'executive');

-- 1. recruiters
CREATE TABLE IF NOT EXISTS recruiters (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  tier recruiter_tier_enum NOT NULL DEFAULT 'tier_1',
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- 2. candidates
CREATE TABLE IF NOT EXISTS candidates (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  linkedin_url text UNIQUE NOT NULL,
  full_name text,
  headline text,
  current_title text,
  current_company text,
  location text,
  raw_profile_json jsonb,
  enrichment_status enrichment_status_enum NOT NULL DEFAULT 'pending_enrichment',
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_candidates_linkedin_url ON candidates (linkedin_url);

-- 3. candidate_experience
CREATE TABLE IF NOT EXISTS candidate_experience (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  candidate_id bigint NOT NULL,
  company_name text,
  title text,
  seniority_rank integer,
  start_date date,
  end_date date,
  description text,
  CONSTRAINT fk_exp_candidate FOREIGN KEY (candidate_id)
    REFERENCES candidates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exp_candidate_id ON candidate_experience (candidate_id);

-- 4. candidate_scores
CREATE TABLE IF NOT EXISTS candidate_scores (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  candidate_id bigint NOT NULL,
  target_role text NOT NULL,
  experience_velocity_score decimal(5,2),
  keyword_frequency_score decimal(5,2),
  promotion_trajectory_score decimal(5,2),
  composite_score decimal(5,2),
  seniority_tier seniority_tier_enum,
  computed_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_score_candidate FOREIGN KEY (candidate_id)
    REFERENCES candidates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scores_candidate_id ON candidate_scores (candidate_id);
CREATE INDEX IF NOT EXISTS idx_scores_composite ON candidate_scores (composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_target_role ON candidate_scores (target_role);
-- Added composite index for leaderboard view as requested
CREATE INDEX IF NOT EXISTS idx_scores_leaderboard ON candidate_scores (candidate_id, target_role, computed_at);

-- 5. shortlists
CREATE TABLE IF NOT EXISTS shortlists (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recruiter_id uuid NOT NULL,
  name text NOT NULL,
  target_role text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_shortlist_recruiter FOREIGN KEY (recruiter_id)
    REFERENCES recruiters(id) ON DELETE CASCADE
);

-- 6. shortlist_candidates
CREATE TABLE IF NOT EXISTS shortlist_candidates (
  shortlist_id bigint NOT NULL,
  candidate_id bigint NOT NULL,
  rank_position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (shortlist_id, candidate_id),
  CONSTRAINT fk_sc_shortlist FOREIGN KEY (shortlist_id) REFERENCES shortlists(id) ON DELETE CASCADE,
  CONSTRAINT fk_sc_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- Leaderboard View
CREATE VIEW leaderboard_view AS
SELECT DISTINCT ON (cs.candidate_id, cs.target_role)
  cs.candidate_id, cs.target_role, cs.composite_score, cs.seniority_tier,
  cs.experience_velocity_score, cs.keyword_frequency_score,
  cs.promotion_trajectory_score, cs.computed_at,
  c.full_name, c.current_title, c.current_company, c.location, c.linkedin_url
FROM candidate_scores cs
JOIN candidates c ON c.id = cs.candidate_id
ORDER BY cs.candidate_id, cs.target_role, cs.computed_at DESC;

-- Enable RLS on every table
-- Policies will come in a later migration.
ALTER TABLE recruiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlist_candidates ENABLE ROW LEVEL SECURITY;
