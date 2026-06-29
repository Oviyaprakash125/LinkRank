/**
 * crustDataClient.ts
 *
 * Wraps the Crustdata People Enrichment API.
 */

// ── Retry helper with exponential back-off ────────────────────────────────────
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastErr: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const status = err.status || err.response?.status;

      if (status === 401 || status === 403) {
        throw new Error('Invalid Crustdata API key — check CRUSTDATA_API_KEY secret');
      }

      if (status === 429) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.warn(`[CrustData] Rate limited (429). Retry ${attempt}/${maxRetries} in ${delay}ms…`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      console.error('[CrustData] HTTP error:', {
        status,
        message: err.message,
      });
      throw err;
    }
  }
  throw lastErr;
}

// ── Helper for fetch with timeout and throwing on error ────────────────────────
async function fetchWithAuth(path: string, searchParams: Record<string, string>): Promise<any> {
  const apiKey = Deno.env.get("CRUSTDATA_API_KEY");
  if (!apiKey) {
     throw new Error("Missing CRUSTDATA_API_KEY secret");
  }
  
  const url = new URL(`https://api.crustdata.com${path}`);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.append(key, value);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });

    if (!response.ok) {
       const err = new Error(`HTTP ${response.status}: ${response.statusText}`);
       (err as any).status = response.status;
       throw err;
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── enrichProfiles ────────────────────────────────────────────────────────────
export async function enrichProfiles(linkedinUrls: string[]) {
  if (!linkedinUrls || linkedinUrls.length === 0) {
    throw new Error('enrichProfiles: at least one LinkedIn URL is required');
  }

  const urlParam = linkedinUrls.join(',');

  const responseData = await withRetry(() =>
    fetchWithAuth('/screener/person/enrich', { linkedin_profile_url: urlParam })
  );

  const profileArray = Array.isArray(responseData)
    ? responseData
    : (responseData?.profiles || responseData?.data || responseData?.results || [responseData]);

  const profiles: any[] = [];
  const pending: string[] = [];

  for (const item of profileArray) {
    const isPending =
      !item ||
      item.status === 'pending' ||
      item.enrichment_status === 'pending' ||
      (!item.full_name && !item.name && !item.profile?.full_name);

    if (isPending) {
      const url = item?.linkedin_profile_url || item?.linkedin_url || linkedinUrls[profileArray.indexOf(item)] || 'unknown';
      console.log(`[CrustData] Profile pending enrichment: ${url}`);
      pending.push(url);
    } else {
      profiles.push(item);
    }
  }

  return { profiles, pending };
}

// ── fetchSocialPosts ──────────────────────────────────────────────────────────
export async function fetchSocialPosts(linkedinUrl: string, page = 1) {
  return withRetry(() =>
    fetchWithAuth('/screener/social_posts', { 
      person_linkedin_url: linkedinUrl, 
      page: String(page) 
    })
  );
}

// ── normalizeProfile ──────────────────────────────────────────────────────────
export function normalizeProfile(raw: any) {
  if (!raw) return null;

  const p = raw.profile || raw.person || raw;

  function pick(...paths: string[]) {
    for (const path of paths) {
      const parts = path.split('.');
      let val = raw;
      for (const part of parts) {
        val = val?.[part];
        if (val === undefined) break;
      }
      if (val !== undefined && val !== null && val !== '') return val;
    }
    return null;
  }

  const linkedin_url = pick(
    'linkedin_profile_url', 'linkedin_url', 'profile.linkedin_url',
    'person.linkedin_url', 'url'
  );

  const full_name = pick(
    'full_name', 'name', 'profile.full_name', 'person.full_name',
    'profile.name', 'person.name'
  );

  const headline = pick(
    'headline', 'profile.headline', 'person.headline',
    'title', 'profile.title'
  );

  const current_title = pick(
    'current_title', 'title', 'position', 'profile.current_title',
    'person.current_title', 'profile.title', 'person.title'
  );

  const current_company = pick(
    'current_company', 'company', 'organization', 'profile.current_company',
    'person.current_company', 'profile.company', 'person.company',
    'company_name'
  );

  const location = pick(
    'location', 'profile.location', 'person.location',
    'city', 'profile.city', 'person.city'
  );

  const rawExperience =
    p?.experience ||
    p?.experiences ||
    p?.work_experience ||
    raw?.experience ||
    raw?.experiences ||
    raw?.work_experience ||
    [];

  const experience = (Array.isArray(rawExperience) ? rawExperience : []).map(exp => ({
    company_name: exp?.company_name || exp?.company || exp?.organization_name || exp?.org || null,
    title:        exp?.title || exp?.position || exp?.role || null,
    start_date:   normalizeDate(exp?.start_date || exp?.starts_at || exp?.from || null),
    end_date:     normalizeDate(exp?.end_date   || exp?.ends_at   || exp?.to   || null),
    description:  exp?.description || exp?.summary || null,
  })).sort((a, b) => {
    if (!a.start_date) return 1;
    if (!b.start_date) return -1;
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
  });

  return {
    linkedin_url,
    full_name,
    headline,
    current_title,
    current_company,
    location,
    experience,
    raw,
  };
}

function normalizeDate(value: any) {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }
  if (typeof value === 'object') {
    const { year, month, day } = value;
    if (!year) return null;
    const m = String(month || 1).padStart(2, '0');
    const d = String(day || 1).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }
  return null;
}
