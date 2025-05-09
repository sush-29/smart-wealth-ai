import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cupjptauwuksthoarvga.supabase.co'; // Replace with your Supabase URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1cGpwdGF1d3Vrc3Rob2FydmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0MTU1MzYsImV4cCI6MjA1NDk5MTUzNn0.h9bdboRTx5FSN027f_L20PmZk8qMM3mUXG8V81upf8Q'; // Replace with your Supabase anon key

export const supabase = createClient(supabaseUrl, supabaseKey);
