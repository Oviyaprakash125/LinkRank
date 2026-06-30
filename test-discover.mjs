const url = 'https://illkrehfqrcrdysnisme.supabase.co/functions/v1/discover-candidates';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsbGtyZWhmcXJjcmR5c25pc21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTAyNTUsImV4cCI6MjA5ODMyNjI1NX0.ammh4kNESe7GDvGYfvCsq4DiXY-pXSkr-TEv1rI37iY';

async function testDiscover() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      target_job_title: 'Engineer',
      count: 2,
      target_role: { title_keywords: ['Engineer'] }
    })
  });
  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(`Body: ${text}`);
}

testDiscover();
