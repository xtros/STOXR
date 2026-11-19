import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env variables if running standalone
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          process.env[key] = value.trim();
        }
      });
    }
  } catch (err) {
    console.error('Failed to parse .env file:', err.message);
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tkefnviqzrkmkjvllret.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_dNymM0gyTUTHV1_hkhzL2g_j7xNcDMZ';

// Ping interval: Every 6 hours (6 * 60 * 60 * 1000 ms)
const PING_INTERVAL_MS = 6 * 60 * 60 * 1000;

console.log('='.repeat(60));
console.log('🚀 Supabase Keep-Alive Worker initialized');
console.log(`📡 Target URL: ${SUPABASE_URL}`);
console.log(`⏱️ Interval: Every 6 hours`);
console.log('='.repeat(60));

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function pingSupabase() {
  const startTime = Date.now();
  const timestamp = new Date().toLocaleString();

  try {
    // Perform database query to register real database activity
    const { data, error, status } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    const duration = Date.now() - startTime;

    if (error && status !== 200 && status !== 406) {
      console.warn(`[${timestamp}] ⚠️ Ping returned error (status ${status}): ${error.message} (${duration}ms)`);
    } else {
      console.log(`[${timestamp}] ✅ Supabase keep-alive ping SUCCESS (status ${status}, latency ${duration}ms)`);
      console.log(`[${timestamp}] ⏳ Next scheduled ping in 6 hours.`);
    }
  } catch (err) {
    console.error(`[${timestamp}] ❌ Ping failed: ${err.message}`);
  }
}

// Immediate initial ping
pingSupabase();

// Schedule recurring ping
setInterval(pingSupabase, PING_INTERVAL_MS);

// Keep process active
process.on('SIGINT', () => {
  console.log('\n🛑 Supabase Keep-Alive Worker stopped.');
  process.exit(0);
});
