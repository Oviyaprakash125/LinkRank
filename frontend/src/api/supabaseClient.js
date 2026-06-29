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

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase env vars. Copy frontend/.env.example to frontend/.env and fill in the values.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
