import { supabase } from './supabaseClient';

export async function loginRequest(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  
  const { data: recruiter, error: rErr } = await supabase
    .from('recruiters')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (rErr) throw rErr;
  return { token: data.session.access_token, recruiter };
}

export async function signUpRequest(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });
  if (error) throw error;
  return data;
}

export async function ingestCandidates(payload) {
  const { data, error } = await supabase.functions.invoke('ingest-candidates', {
    body: payload
  });
  if (error) throw error;
  return data;
}

export async function getCandidate(id) {
  const { data: candidate, error } = await supabase
    .from('candidates')
    .select('*, candidate_experience(*)')
    .eq('id', id)
    .single();
    
  if (error) throw error;

  const { data: score, error: sErr } = await supabase
    .from('candidate_scores')
    .select('*')
    .eq('candidate_id', id)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
    
  candidate.latest_score = score || null;
  candidate.experience = candidate.candidate_experience || [];
  return candidate;
}

export async function getLeaderboard(params) {
  let query = supabase.from('leaderboard_view').select('*', { count: 'exact' });

  if (params.target_role) {
    query = query.eq('target_role', params.target_role);
  }
  if (params.seniority_tier) {
    query = query.eq('seniority_tier', params.seniority_tier);
  }
  if (params.company) {
    query = query.ilike('current_company', `%${params.company}%`);
  }
  if (params.min_score) {
    query = query.gte('composite_score', params.min_score);
  }

  const limit = params.limit || 25;
  const offset = params.offset || 0;
  
  query = query.order('composite_score', { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    candidates: data || [],
    pagination: { total: count || 0 }
  };
}

export async function createShortlist(payload) {
  const { data, error } = await supabase.rpc('create_shortlist', {
    name: payload.name,
    target_role: payload.target_role,
    candidate_ids: payload.candidate_ids
  });
  if (error) throw error;
  
  return { id: data, name: payload.name, candidate_count: payload.candidate_ids.length };
}

export async function getShortlist(id) {
  const { data: shortlist, error } = await supabase
    .from('shortlists')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;

  const { data: candidates, error: cErr } = await supabase
    .rpc('get_shortlist_export', { p_shortlist_id: id });

  if (cErr) throw cErr;

  return { ...shortlist, candidates: candidates || [] };
}

export async function downloadShortlistExport(id, format = 'csv') {
   const { data, error } = await supabase.functions.invoke(`export-shortlist?shortlist_id=${id}&format=${format}`, {
      method: 'GET'
   });
   
   if (error) throw error;
   return data;
}

export function shortlistExportUrl(id, format = 'csv') {
  // Legacy method; replaced by downloadShortlistExport but kept to prevent undefined errors in LeaderboardPage until updated
  return '#'; 
}
