-- supabase/migrations/20260629202000_shortlist_rpc.sql

-- For export Shortlist
CREATE OR REPLACE FUNCTION get_shortlist_export(p_shortlist_id bigint)
RETURNS TABLE (
  full_name text,
  current_title text,
  current_company text,
  composite_score decimal,
  seniority_tier seniority_tier_enum,
  rank_position integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.full_name, c.current_title, c.current_company,
         cs.composite_score, cs.seniority_tier, sc.rank_position
  FROM shortlist_candidates sc
  JOIN candidates c ON c.id = sc.candidate_id
  LEFT JOIN (
    SELECT DISTINCT ON (candidate_id) *
    FROM candidate_scores
    ORDER BY candidate_id, computed_at DESC
  ) cs ON cs.candidate_id = c.id
  WHERE sc.shortlist_id = p_shortlist_id
  ORDER BY sc.rank_position ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- For create Shortlist
CREATE OR REPLACE FUNCTION create_shortlist(name text, target_role text, candidate_ids bigint[])
RETURNS bigint AS $$
DECLARE
  new_shortlist_id bigint;
  i integer;
BEGIN
  INSERT INTO shortlists (recruiter_id, name, target_role)
  VALUES (auth.uid(), name, target_role)
  RETURNING id INTO new_shortlist_id;

  FOR i IN 1 .. array_length(candidate_ids, 1) LOOP
    INSERT INTO shortlist_candidates (shortlist_id, candidate_id, rank_position)
    VALUES (new_shortlist_id, candidate_ids[i], i);
  END LOOP;

  RETURN new_shortlist_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
