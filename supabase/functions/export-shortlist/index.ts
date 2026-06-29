import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

function csvEscape(val: any) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const url = new URL(req.url);
    const shortlist_id = url.searchParams.get('shortlist_id');
    const format = url.searchParams.get('format') || 'csv';

    if (!shortlist_id) {
        return new Response(JSON.stringify({ error: 'Missing shortlist_id param' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: recruiter, error: recruiterError } = await supabase
      .from('recruiters')
      .select('tier')
      .eq('id', user.id)
      .single();

    if (recruiterError || !recruiter) {
        return new Response(JSON.stringify({ error: 'Recruiter not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: shortlist, error: shortlistError } = await supabase
        .from('shortlists')
        .select('*')
        .eq('id', shortlist_id)
        .single();

    if (shortlistError || !shortlist) {
         return new Response(JSON.stringify({ error: 'Shortlist not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (recruiter.tier !== 'tier_3' && shortlist.recruiter_id !== user.id) {
      return new Response(JSON.stringify({ error: 'You can only export your own shortlists' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: rows, error: rowsError } = await supabase
      .rpc('get_shortlist_export', { p_shortlist_id: parseInt(shortlist_id) });

    if (rowsError) {
      throw rowsError;
    }

    if (format === 'json') {
      return new Response(JSON.stringify(rows), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const header = 'name,current_title,current_company,composite_score,seniority_tier';
    const csvRows = (rows || []).map((r: any) =>
      [
        csvEscape(r.full_name),
        csvEscape(r.current_title),
        csvEscape(r.current_company),
        r.composite_score ?? '',
        r.seniority_tier ?? '',
      ].join(',')
    );

    const csv = [header, ...csvRows].join('\n');
    
    return new Response(csv, {
        headers: {
            ...corsHeaders,
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="shortlist-${shortlist_id}.csv"`
        }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
