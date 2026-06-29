export const DEFAULT_WEIGHTS = {
  velocity:  0.30,
  keyword:   0.45,
  promotion: 0.25,
};

function velocityToScore(velocity: number) {
  const V_SLOW       = 0.3;   // below this is stagnant
  const V_STEADY     = 0.6;   // steady ramp top
  const V_HEALTHY    = 1.2;   // peak score zone top
  const V_HOPPING    = 2.0;   // beyond this is floored

  const S_STAGNANT   = 30;    // score for < V_SLOW
  const S_STEADY_TOP = 70;    // score at V_STEADY
  const S_PEAK       = 100;   // score at V_HEALTHY
  const S_FLOOR      = 50;    // score floor for extreme hopping

  if (velocity < V_SLOW) return S_STAGNANT;

  if (velocity < V_STEADY) {
    const t = (velocity - V_SLOW) / (V_STEADY - V_SLOW);
    return S_STAGNANT + t * (S_STEADY_TOP - S_STAGNANT);
  }

  if (velocity < V_HEALTHY) {
    const t = (velocity - V_STEADY) / (V_HEALTHY - V_STEADY);
    return S_STEADY_TOP + t * (S_PEAK - S_STEADY_TOP);
  }

  if (velocity < V_HOPPING) {
    const t = (velocity - V_HEALTHY) / (V_HOPPING - V_HEALTHY);
    return S_PEAK - t * (S_PEAK - S_FLOOR);
  }

  return S_FLOOR;
}

export function scoreExperienceVelocity(experience: any[]) {
  if (!experience || experience.length === 0) return 30;

  const today = new Date();

  const withDates = experience
    .map(exp => ({
      ...exp,
      _start: exp.start_date ? new Date(exp.start_date) : null,
      _end:   exp.end_date   ? new Date(exp.end_date)   : today,
    }))
    .filter(exp => exp._start && !isNaN(exp._start.getTime()));

  if (withDates.length === 0) return 30;

  const earliest = new Date(Math.min(...withDates.map(e => e._start.getTime())));
  const latest   = new Date(Math.max(...withDates.map(e => e._end.getTime())));

  const yearsExperience = (latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (yearsExperience < 0.1) return 30;

  const roles    = withDates.length;
  const velocity = roles / yearsExperience;

  return Math.round(velocityToScore(velocity) * 100) / 100;
}

function buildKeywordRegex(keyword: string) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\w])${escaped}(?![\\w])`, 'gi');
}

export function scoreKeywordFrequency(experience: any[], currentTitle: string, skillKeywords: string[]) {
  if (!skillKeywords || skillKeywords.length === 0) return 0;

  const parts = [currentTitle || ''];
  for (const exp of (experience || [])) {
    if (exp.title)       parts.push(exp.title);
    if (exp.description) parts.push(exp.description);
  }
  const text = parts.join(' ').toLowerCase();

  let distinctMatched = 0;
  let depthBonus      = 0;
  const MAX_BONUS     = 20;

  for (const kw of skillKeywords) {
    const regex = buildKeywordRegex(kw.toLowerCase().trim());
    const matches = [...text.matchAll(regex)];
    if (matches.length > 0) {
      distinctMatched++;
      if (matches.length > 1) {
        depthBonus += Math.min(5, matches.length - 1);
      }
    }
  }

  const baseScore  = (distinctMatched / skillKeywords.length) * 100;
  const bonusCap   = Math.min(depthBonus, MAX_BONUS);
  const finalScore = Math.min(100, baseScore + bonusCap);

  return Math.round(finalScore * 100) / 100;
}

const SENIORITY_PATTERNS = [
  { rank: 7, pattern: /\b(chief|cto|ceo|coo|cfo|cmo|c-suite|c level)\b/i },
  { rank: 6, pattern: /\b(vp|vice president|head of)\b/i },
  { rank: 5, pattern: /\b(principal|director)\b/i },
  { rank: 4, pattern: /\b(lead|staff|architect)\b/i },
  { rank: 3, pattern: /\b(senior|sr\.?)\b/i },
  { rank: 2, pattern: /\b(engineer|analyst|developer|manager|consultant|specialist|designer|scientist|researcher)\b/i },
  { rank: 1, pattern: /\b(junior|jr\.?|associate)\b/i },
  { rank: 0, pattern: /\b(intern|internship|trainee|apprentice)\b/i },
];

export function titleToSeniorityRank(title: string) {
  if (!title) return 2;
  for (const { rank, pattern } of SENIORITY_PATTERNS) {
    if (pattern.test(title)) return rank;
  }
  return 2;
}

export function scorePromotionTrajectory(experience: any[]) {
  if (!experience || experience.length === 0) return 50;

  const byCompany: Record<string, any[]> = {};
  for (const exp of experience) {
    const co = (exp.company_name || 'unknown').trim().toLowerCase();
    if (!byCompany[co]) byCompany[co] = [];
    byCompany[co].push(exp);
  }

  const companyScores: number[] = [];

  for (const [, roles] of Object.entries(byCompany)) {
    if (roles.length < 2) continue;

    const sorted = [...roles].sort((a, b) => {
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });

    const ranks = sorted.map(r => titleToSeniorityRank(r.title));

    let hasIncrease = false;
    let hasDecrease = false;

    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i] > ranks[i - 1]) hasIncrease = true;
      if (ranks[i] < ranks[i - 1]) hasDecrease = true;
    }

    if (hasDecrease) {
      companyScores.push(30);
    } else if (hasIncrease) {
      companyScores.push(100);
    } else {
      companyScores.push(60);
    }
  }

  if (companyScores.length === 0) {
    return 50;
  }

  const avg = companyScores.reduce((sum, s) => sum + s, 0) / companyScores.length;
  return Math.round(avg * 100) / 100;
}

export function deriveSeniorityTier(compositeScore: number, currentTitle: string) {
  const title = (currentTitle || '').toLowerCase();

  if (/\b(chief|cto|ceo|coo|cfo|cmo|vp|vice president|head of)\b/.test(title)) {
    return 'executive';
  }
  if (/\b(director|principal|staff)\b/.test(title)) {
    if (compositeScore >= 90) return 'executive';
    return 'lead';
  }

  if (compositeScore >= 90) return 'executive';
  if (compositeScore >= 80) return 'lead';
  if (compositeScore >= 65) return 'senior';
  if (compositeScore >= 40) return 'mid';
  return 'junior';
}

export function computeCompositeScore(candidate: any, targetRole: any, weights = DEFAULT_WEIGHTS) {
  const w = { ...DEFAULT_WEIGHTS, ...weights };

  const experience_velocity_score  = scoreExperienceVelocity(candidate.experience);
  const keyword_frequency_score    = scoreKeywordFrequency(
    candidate.experience,
    candidate.current_title,
    targetRole.skill_keywords || []
  );
  const promotion_trajectory_score = scorePromotionTrajectory(candidate.experience);

  const composite_score = Math.round(
    (experience_velocity_score  * w.velocity  +
     keyword_frequency_score    * w.keyword   +
     promotion_trajectory_score * w.promotion) * 100
  ) / 100;

  const seniority_tier = deriveSeniorityTier(composite_score, candidate.current_title);

  return {
    experience_velocity_score,
    keyword_frequency_score,
    promotion_trajectory_score,
    composite_score,
    seniority_tier,
  };
}
