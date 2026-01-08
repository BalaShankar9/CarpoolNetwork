import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = 'https://uqofmsreosfjflmgurzb.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
});

async function runMigration(migrationFile) {
    const filePath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`Running migration: ${migrationFile}`);

    // Split by semicolons to run each statement separately
    const statements = sql
        .split(/;[\r\n]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('/*') && !s.startsWith('--'));

    for (const statement of statements) {
        if (statement.length < 5) continue;

        try {
            const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
            if (error) {
                console.log(`Statement: ${statement.substring(0, 80)}...`);
                console.error('Error:', error.message);
            }
        } catch (err) {
            // Some statements might fail if exec_sql doesn't exist
            console.log('Note: exec_sql RPC not available, trying direct approach...');
            break;
        }
    }

    console.log(`Migration ${migrationFile} complete`);
}

async function main() {
    try {
        // Test connection
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        if (error) {
            console.error('Connection test failed:', error.message);
        } else {
            console.log('Connected to Supabase successfully');
        }

        // Note: The REST API cannot execute DDL statements directly
        // You need to use the Supabase Dashboard SQL Editor or supabase CLI
        console.log('\n⚠️  The Supabase REST API cannot execute DDL statements (CREATE FUNCTION, etc.)');
        console.log('Please run the migrations manually in the Supabase SQL Editor:\n');
        console.log('1. Go to: https://supabase.com/dashboard/project/uqofmsreosfjflmgurzb/sql/new');
        console.log('2. Copy the contents of: supabase/migrations/20260116_fix_friend_system.sql');
        console.log('3. Paste and click "Run"');
        console.log('4. Then do the same for: supabase/migrations/20260116_add_social_groups.sql');

    } catch (err) {
        console.error('Error:', err.message);
    }
}

main();
