-- 1. Helper Function
CREATE OR REPLACE FUNCTION current_recruiter_tier() RETURNS recruiter_tier_enum AS $$
  SELECT tier FROM recruiters WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Auth Trigger for new recruiters
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.recruiters (id, email, name, tier)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'tier_1'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- 3. RLS Policies

-- recruiters: own row SELECT, tier_3 SELECT all
CREATE POLICY "recruiters_select_own" ON recruiters FOR SELECT
  USING (id = auth.uid());
CREATE POLICY "recruiters_select_tier3" ON recruiters FOR SELECT
  USING (current_recruiter_tier() = 'tier_3');
  
-- candidates: authenticated SELECT only
CREATE POLICY "candidates_select_auth" ON candidates FOR SELECT
  TO authenticated USING (true);
  
-- candidate_experience: authenticated SELECT only
CREATE POLICY "candidate_experience_select_auth" ON candidate_experience FOR SELECT
  TO authenticated USING (true);
  
-- candidate_scores: authenticated SELECT only
CREATE POLICY "candidate_scores_select_auth" ON candidate_scores FOR SELECT
  TO authenticated USING (true);
  
-- shortlists: own CRUD, tier_3 SELECT all
CREATE POLICY "shortlists_select_own" ON shortlists FOR SELECT
  USING (recruiter_id = auth.uid());
CREATE POLICY "shortlists_select_tier3" ON shortlists FOR SELECT
  USING (current_recruiter_tier() = 'tier_3');
CREATE POLICY "shortlists_insert_own" ON shortlists FOR INSERT
  WITH CHECK (recruiter_id = auth.uid());
CREATE POLICY "shortlists_update_own" ON shortlists FOR UPDATE
  USING (recruiter_id = auth.uid());
CREATE POLICY "shortlists_delete_own" ON shortlists FOR DELETE
  USING (recruiter_id = auth.uid());
  
-- shortlist_candidates: via join to shortlists ownership
CREATE POLICY "shortlist_candidates_select_own" ON shortlist_candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shortlists s
      WHERE s.id = shortlist_id AND (s.recruiter_id = auth.uid() OR current_recruiter_tier() = 'tier_3')
    )
  );
CREATE POLICY "shortlist_candidates_insert_own" ON shortlist_candidates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shortlists s
      WHERE s.id = shortlist_id AND s.recruiter_id = auth.uid()
    )
  );
CREATE POLICY "shortlist_candidates_update_own" ON shortlist_candidates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shortlists s
      WHERE s.id = shortlist_id AND s.recruiter_id = auth.uid()
    )
  );
CREATE POLICY "shortlist_candidates_delete_own" ON shortlist_candidates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM shortlists s
      WHERE s.id = shortlist_id AND s.recruiter_id = auth.uid()
    )
  );
