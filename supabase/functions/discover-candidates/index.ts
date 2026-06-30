import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { discoverProfiles, normalizeProfile } from "../_shared/crustDataClient.ts";
import { computeCompositeScore } from "../_shared/scoringService.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { target_job_title, target_role, count } = await req.json();
    if (!target_job_title) {
        return new Response(JSON.stringify({ error: 'target_job_title is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const limit = parseInt(count) || 20;

    let discoveredProfiles;
    try {
      discoveredProfiles = await discoverProfiles(target_job_title, limit);
    } catch (err: any) {
      console.error('[discover] API failed:', err.message);
      return new Response(JSON.stringify({ error: `Crustdata API error: ${err.message}` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const succeeded: any[] = [];
    const failed: any[] = [];

    for (const raw of discoveredProfiles) {
      let normalized;
      try {
        normalized = normalizeProfile(raw);
        if (!normalized || !normalized.linkedin_url) {
          throw new Error('Could not extract linkedin_url from profile');
        }
      } catch (err: any) {
        failed.push({ url: raw?.linkedin_profile_url || 'unknown', reason: err.message });
        continue;
      }

      try {
        const { data: candidate, error: candidateError } = await supabase
          .from('candidates')
          .upsert({
            linkedin_url: normalized.linkedin_url,
            full_name: normalized.full_name,
            headline: normalized.headline,
            current_title: normalized.current_title,
            current_company: normalized.current_company,
            location: normalized.location,
            raw_profile_json: normalized.raw,
            enrichment_status: 'done',
            updated_at: new Date().toISOString()
          }, { onConflict: 'linkedin_url' })
          .select('id')
          .single();

        if (candidateError) throw candidateError;
        const candidateId = candidate.id;

        await supabase.from('candidate_experience').delete().eq('candidate_id', candidateId);

        if (normalized.experience && normalized.experience.length > 0) {
            const expRows = normalized.experience.map((e: any) => ({
                candidate_id: candidateId,
                company_name: e.company_name,
                title: e.title,
                start_date: e.start_date,
                end_date: e.end_date,
                description: e.description
            }));
            await supabase.from('candidate_experience').insert(expRows);
        }

        const scoreResult = computeCompositeScore(normalized, target_role || {});

        const { error: scoreErr } = await supabase.from('candidate_scores').insert({
          candidate_id: candidateId,
          target_role: target_role?.title_keywords?.join(', ') || 'general',
          experience_velocity_score: scoreResult.experience_velocity_score,
          keyword_frequency_score: scoreResult.keyword_frequency_score,
          promotion_trajectory_score: scoreResult.promotion_trajectory_score,
          composite_score: scoreResult.composite_score,
          seniority_tier: scoreResult.seniority_tier
        });

        if (scoreErr) throw scoreErr;

        succeeded.push({
          candidate_id: candidateId,
          full_name: normalized.full_name,
          composite_score: scoreResult.composite_score,
          seniority_tier: scoreResult.seniority_tier,
        });
      } catch (err: any) {
        failed.push({ url: normalized.linkedin_url, reason: err.message });
      }
    }

    return new Response(JSON.stringify({
      succeeded,
      failed,
      summary: {
        discovered: discoveredProfiles.length,
        processed: succeeded.length,
        failed: failed.length,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
