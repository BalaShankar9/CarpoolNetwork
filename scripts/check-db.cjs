const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// SECURITY: Service role key must be provided via environment variable
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('ERROR: Missing required environment variables');
    console.error('Required: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nUsage: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/check-db.cjs');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testAndRun() {
    // Test connection
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    console.log('Connection test:', error ? 'FAILED - ' + error.message : 'SUCCESS');

    // Check if friend functions exist
    const { data: funcs, error: funcErr } = await supabase.rpc('accept_friend_request', { p_request_id: '00000000-0000-0000-0000-000000000000' });

    if (funcErr && funcErr.message.includes('does not exist')) {
        console.log('\\nFunction accept_friend_request does NOT exist - migration needed');
    } else if (funcErr && funcErr.message.includes('not found')) {
        console.log('\\nFunction accept_friend_request EXISTS (got expected error for invalid ID)');
        console.log('The friend system functions are already deployed!');
    } else {
        console.log('\\nFunction check result:', funcErr ? funcErr.message : 'OK');
    }

    // Check if social_groups table exists
    const { data: groups, error: groupsErr } = await supabase.from('social_groups').select('id').limit(1);
    if (groupsErr && groupsErr.message.includes('does not exist')) {
        console.log('\\nTable social_groups does NOT exist - migration needed');
    } else {
        console.log('\\nTable social_groups EXISTS');
    }
}

testAndRun().catch(console.error);
