
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from the root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('--- Diagnostic Script ---');
console.log(`Supabase URL: ${supabaseUrl ? 'Found' : 'MISSING'}`);
console.log(`Supabase Key: ${supabaseKey ? 'Found' : 'MISSING'}`);

if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        console.log('Testing connection to Supabase...');
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('Connection failed:', error);
        } else {
            console.log('Connection successful. Data:', data);
        }
    } catch (err) {
        console.error('Unexpected error during connection test:', err);
    }
}

async function testAuth() {
    try {
        console.log('Testing Auth Endpoint...');
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.error('Auth check failed:', error);
        } else {
            console.log('Auth check successful (session might be null):', data);
        }
    } catch (err) {
        console.error('Unexpected error during auth test:', err);
    }
}

async function run() {
    await testConnection();
    await testAuth();
}

run();
