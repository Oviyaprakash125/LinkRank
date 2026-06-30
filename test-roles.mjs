import { createClient } from '@supabase/supabase-js';

const url = 'https://illkrehfqrcrdysnisme.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsbGtyZWhmcXJjcmR5c25pc21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTAyNTUsImV4cCI6MjA5ODMyNjI1NX0.ammh4kNESe7GDvGYfvCsq4DiXY-pXSkr-TEv1rI37iY';

const supabase = createClient(url, key);

async function checkRoles() {
  const { data: scores } = await supabase.from('candidate_scores').select('target_role, candidate_id');
  console.log('All Target Roles in DB:', scores);
}

checkRoles();
