// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a SINGLE instance of the client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'facility_management' } 
});