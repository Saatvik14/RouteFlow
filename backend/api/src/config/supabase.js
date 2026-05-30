const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.DATABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Supabase URL or Key is missing in environment variables.');
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

module.exports = supabase;