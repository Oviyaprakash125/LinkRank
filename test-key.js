import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://illkrehfqrcrdysnisme.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsbGtyZWhmcXJjcmR5c25pc21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTAyNTUsImV4cCI6MjA5ODMyNjI1NX0.ammh4kNESe7GDvGYfvCsq4DiXY-pXSkr-TEv1rI37iY'
);

async function test() {
  console.log('Testing Supabase Auth...');
  const { data, error } = await supabase.auth.signUp({
    email: 'test@example.com',
    password: 'password123',
  });
  
  if (error) {
    console.error('Error:', error.message, error.status);
  } else {
    console.log('Success!', data);
  }
}

test();
