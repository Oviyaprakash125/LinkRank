import { createClient } from '@supabase/supabase-js';

const url = 'https://illkrehfqrcrdysnisme.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsbGtyZWhmcXJjcmR5c25pc21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTAyNTUsImV4cCI6MjA5ODMyNjI1NX0.ammh4kNESe7GDvGYfvCsq4DiXY-pXSkr-TEv1rI37iY';

const supabase = createClient(url, key);

async function checkDB() {
  const { data: candidates, error: cErr } = await supabase.from('candidates').select('*');
  console.log('Candidates:', candidates?.length, cErr?.message || '');

  const { data: scores, error: sErr } = await supabase.from('candidate_scores').select('*');
  console.log('Scores:', scores?.length, sErr?.message || '');

  const { data: view, error: vErr } = await supabase.from('leaderboard_view').select('*');
  console.log('Leaderboard View:', view?.length, vErr?.message || '');
  if (view && view.length > 0) {
    console.log('First view item:', view[0]);
  }
}

checkDB();
