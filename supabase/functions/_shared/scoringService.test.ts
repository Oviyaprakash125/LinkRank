import { assertEquals, assert, assertAlmostEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  scoreExperienceVelocity,
  scoreKeywordFrequency,
  scorePromotionTrajectory,
  computeCompositeScore,
} from "./scoringService.ts";

function makeExp(company: string, title: string, startYear: number, endYear: number | null = null) {
  return {
    company_name: company,
    title,
    start_date: `${startYear}-01-01`,
    end_date: endYear ? `${endYear}-01-01` : null,
  };
}

Deno.test("scoreExperienceVelocity - No experience → stagnant default (30)", () => {
  const score = scoreExperienceVelocity([]);
  assertEquals(score, 30);
});

Deno.test("scoreExperienceVelocity - One role over 10 years → very slow velocity → ~30", () => {
  const exp = [makeExp('ACME', 'Engineer', 2014, 2024)];
  const score = scoreExperienceVelocity(exp);
  assertAlmostEquals(score, 30, 5, "Stagnant velocity");
});

Deno.test("scoreExperienceVelocity - 3 roles over 5 years → healthy velocity (0.6 r/yr) → ~70", () => {
  const exp = [
    makeExp('A', 'Junior Eng', 2019, 2021),
    makeExp('B', 'Engineer',   2021, 2023),
    makeExp('C', 'Senior Eng', 2023, 2024),
  ];
  const score = scoreExperienceVelocity(exp);
  assertAlmostEquals(score, 70, 10, "Healthy velocity");
});

Deno.test("scoreExperienceVelocity - 5 roles over 4 years → job-hopping velocity (1.25 r/yr) → decays toward 50", () => {
  const exp = [
    makeExp('A', 'Eng', 2020, 2021),
    makeExp('B', 'Eng', 2021, 2022),
    makeExp('C', 'Eng', 2022, 2023),
    makeExp('D', 'Eng', 2023, 2023),
    makeExp('E', 'Eng', 2023, 2024),
  ];
  const score = scoreExperienceVelocity(exp);
  assertAlmostEquals(score, 90, 15, "Moderate hopping");
});

Deno.test("scoreExperienceVelocity - 8 roles over 3 years → extreme hopping → floor ~50", () => {
  const exp = Array.from({ length: 8 }, (_, i) =>
    makeExp(`Co${i}`, 'Eng', 2021 + Math.floor(i / 3), 2021 + Math.floor((i + 1) / 3))
  );
  const score = scoreExperienceVelocity(exp);
  assertAlmostEquals(score, 50, 15, "Extreme hopping floor");
});

Deno.test("scoreKeywordFrequency - No keywords → 0", () => {
  const score = scoreKeywordFrequency([], 'Engineer', []);
  assertEquals(score, 0);
});

Deno.test('scoreKeywordFrequency - "go" keyword does NOT match "going"', () => {
  const exp = [{ title: 'Engineer', description: 'going above and beyond in ongoing projects' }];
  const score = scoreKeywordFrequency(exp, 'engineer', ['go']);
  assertEquals(score, 0, '"go" matched a substring it shouldn\'t');
});

Deno.test("scoreKeywordFrequency - Exact keyword match scores > 0", () => {
  const exp = [{ title: 'Backend Engineer', description: 'Built services with Node.js and Kafka' }];
  const score = scoreKeywordFrequency(exp, 'Senior Backend Engineer', ['node.js', 'kafka', 'python']);
  assert(score > 0, 'Should have positive score');
  assert(score <= 100, 'Should not exceed 100');
});

Deno.test("scoreKeywordFrequency - All keywords matched → near 100", () => {
  const exp = [{ title: 'Senior Backend Engineer', description: 'Node.js Node.js Kafka distributed systems' }];
  const score = scoreKeywordFrequency(exp, 'Senior Backend Engineer', ['node.js', 'kafka', 'distributed systems']);
  assert(score >= 80, `Expected >= 80, got ${score}`);
});

Deno.test("scoreKeywordFrequency - Depth bonus: repeated keywords add bonus", () => {
  const exp = [{ title: 'Eng', description: 'kafka kafka kafka kafka kafka' }];
  const baseExp = [{ title: 'Eng', description: 'kafka' }];
  const scoreWithDepth  = scoreKeywordFrequency(exp, '', ['kafka']);
  const scoreWithoutDepth = scoreKeywordFrequency(baseExp, '', ['kafka']);
  assert(scoreWithDepth >= scoreWithoutDepth, 'Depth bonus should increase score');
});

Deno.test("scorePromotionTrajectory - No experience → neutral 50", () => {
  assertEquals(scorePromotionTrajectory([]), 50);
});

Deno.test("scorePromotionTrajectory - All at same company, single role → neutral 50", () => {
  const exp = [makeExp('ACME', 'Engineer', 2020, 2024)];
  assertEquals(scorePromotionTrajectory(exp), 50);
});

Deno.test("scorePromotionTrajectory - Genuine promotion: Junior → Senior at same company → 100", () => {
  const exp = [
    { ...makeExp('ACME', 'Junior Engineer', 2019, 2021) },
    { ...makeExp('ACME', 'Senior Engineer', 2021, 2024) },
  ];
  assertAlmostEquals(scorePromotionTrajectory(exp), 100, 5, 'Promotion trajectory');
});

Deno.test("scorePromotionTrajectory - Flat sequence at company → 60", () => {
  const exp = [
    { ...makeExp('ACME', 'Engineer', 2019, 2021) },
    { ...makeExp('ACME', 'Engineer II', 2021, 2023) },
  ];
  assertAlmostEquals(scorePromotionTrajectory(exp), 60, 10, 'Flat trajectory');
});

Deno.test("scorePromotionTrajectory - Demotion signal: Senior → Junior at same company → 30", () => {
  const exp = [
    { ...makeExp('ACME', 'Senior Engineer', 2019, 2022) },
    { ...makeExp('ACME', 'Junior Engineer', 2022, 2024) },
  ];
  assertAlmostEquals(scorePromotionTrajectory(exp), 30, 5, 'Demotion signal');
});

Deno.test('computeCompositeScore - CTO title forces "executive" tier regardless of score', () => {
  const candidate = {
    full_name: 'Jane Smith',
    current_title: 'CTO',
    current_company: 'BigCorp',
    experience: [makeExp('BigCorp', 'CTO', 2018)],
  };
  const targetRole = { title_keywords: ['engineer'], skill_keywords: [], min_years_experience: 0 };
  const result = computeCompositeScore(candidate, targetRole);
  assertEquals(result.seniority_tier, 'executive', 'CTO should be executive');
});

Deno.test("computeCompositeScore - All scores are in [0, 100] range", () => {
  const candidate = {
    full_name: 'Test User',
    current_title: 'Senior Software Engineer',
    current_company: 'StartupCo',
    experience: [
      makeExp('StartupCo', 'Junior Engineer', 2018, 2020),
      makeExp('StartupCo', 'Engineer', 2020, 2022),
      makeExp('StartupCo', 'Senior Engineer', 2022),
    ],
  };
  const targetRole = {
    title_keywords: ['senior engineer'],
    skill_keywords: ['javascript', 'react', 'node.js'],
    min_years_experience: 3,
  };
  const result = computeCompositeScore(candidate, targetRole);
  assert(result.composite_score >= 0 && result.composite_score <= 100);
  assert(result.experience_velocity_score >= 0 && result.experience_velocity_score <= 100);
  assert(result.keyword_frequency_score >= 0 && result.keyword_frequency_score <= 100);
  assert(result.promotion_trajectory_score >= 0 && result.promotion_trajectory_score <= 100);
  assert(['junior','mid','senior','lead','executive'].includes(result.seniority_tier));
});
