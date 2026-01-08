import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wvikkaroxhedgiutjgnq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2aWtrYXJveGhlZGdpdXRqZ25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMjMwMTAsImV4cCI6MjA3NzU5OTAxMH0._NqqMGTTxRboITtIptFqv91e9iva60-t3R77TAYb4JM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

