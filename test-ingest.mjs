const url = 'https://illkrehfqrcrdysnisme.supabase.co/functions/v1/ingest-candidates';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsbGtyZWhmcXJjcmR5c25pc21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTAyNTUsImV4cCI6MjA5ODMyNjI1NX0.ammh4kNESe7GDvGYfvCsq4DiXY-pXSkr-TEv1rI37iY';

async function testIngest() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      linkedin_urls: ['https://linkedin.com/in/satyanadella'],
      target_role: { title_keywords: ['CEO'] }
    })
  });
  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(`Body: ${text}`);
}

testIngest();
