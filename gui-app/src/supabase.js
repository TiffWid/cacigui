import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://anrdbdndxykqexfgrzjo.supabase.co'
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key Loaded:", supabaseKey ? "Yes" : "No");

if (!supabaseKey) {
    throw new Error("Supabase Key is missing. Check your .env file and restart React!");
}
export const supabase = createClient(supabaseUrl, supabaseKey);