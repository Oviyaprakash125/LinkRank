/**
 * supabaseClient.js
 *
 * Initialises the Supabase JS client for use throughout the React app.
 *
 * SECURITY NOTE:
 *   Only the ANON (public) key should ever be stored here.
 *   The anon key is safe to expose in the browser because Row-Level Security
 *   policies on the database enforce what each authenticated user can access.
 *
 *   ⚠️  NEVER put the service_role key in the frontend — it bypasses RLS
 *       and grants unrestricted database access.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = 'https://illkrehfqrcrdysnisme.supabase.co';
const supabaseKey  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsbGtyZWhmcXJjcmR5c25pc21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTAyNTUsImV4cCI6MjA5ODMyNjI1NX0.ammh4kNESe7GDvGYfvCsq4DiXY-pXSkr-TEv1rI37iY';

export const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
