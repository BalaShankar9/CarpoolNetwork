// Script to run database migrations using Supabase service role
// SECURITY: Service role key must be provided via environment variable
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('ERROR: Missing required environment variables');
    console.error('Required: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nUsage: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/run-migrations.js');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function runMigrations() {
    console.log('Running database migrations...\n');

    // Test connection by checking profiles table
    const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

    if (testError) {
        console.error('Connection test failed:', testError.message);
        return;
    }
    console.log('✓ Database connection successful\n');

    // Check if profile_public_v view exists and test it
    const { data: viewData, error: viewError } = await supabase
        .from('profile_public_v')
        .select('id, full_name')
        .limit(1);

    if (viewError) {
        console.log('✗ profile_public_v view error:', viewError.message);
        console.log('\n⚠️  The view needs to be created via Supabase SQL Editor.');
        console.log('\nPlease run the following SQL in the Supabase SQL Editor:');
        console.log('--------------------------------------------------');
        console.log(`
DROP VIEW IF EXISTS public.profile_public_v;

CREATE VIEW public.profile_public_v AS
SELECT
  id,
  full_name,
  avatar_url,
  profile_photo_url,
  created_at,
  country_of_residence,
  country,
  city,
  bio,
  languages,
  phone_verified,
  email_verified,
  photo_verified,
  id_verified,
  profile_verified,
  preferred_contact_method,
  allow_inhouse_chat,
  allow_whatsapp_chat,
  trust_score,
  average_rating,
  reliability_score,
  total_rides_offered,
  total_rides_taken,
  total_bookings,
  cancelled_bookings,
  last_minute_cancellations,
  phone_visibility,
  whatsapp_visibility,
  gender,
  date_of_birth,
  nationality,
  occupation,
  smoking_policy,
  pets_allowed,
  music_preference,
  conversation_level,
  luggage_size
FROM public.profiles;

GRANT SELECT ON public.profile_public_v TO anon, authenticated;
`);
        console.log('--------------------------------------------------');
    } else {
        console.log('✓ profile_public_v view exists and is accessible');
        if (viewData && viewData.length > 0) {
            console.log('  Sample data:', viewData[0]);
        }
    }

    // Check vehicles table for delete functionality
    const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, make, model, user_id')
        .limit(5);

    if (vehiclesError) {
        console.log('\n✗ Vehicles table error:', vehiclesError.message);
    } else {
        console.log('\n✓ Vehicles table accessible');
        console.log('  Found', vehiclesData?.length || 0, 'vehicles');
    }

    // Check for duplicate vehicles
    const { data: allVehicles, error: allVehiclesError } = await supabase
        .from('vehicles')
        .select('id, make, model, license_plate, user_id');

    if (!allVehiclesError && allVehicles) {
        const duplicates = allVehicles.filter((v, i, arr) =>
            arr.findIndex(x => x.license_plate === v.license_plate && x.user_id === v.user_id) !== i
        );
        if (duplicates.length > 0) {
            console.log('\n⚠️  Found potential duplicate vehicles:');
            duplicates.forEach(d => console.log(`  - ${d.make} ${d.model} (${d.license_plate})`));
        }
    }

    console.log('\n✓ Migration check complete');
}

runMigrations().catch(console.error);
