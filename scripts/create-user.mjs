import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const email = getArg('--email');
const phone = getArg('--phone');
const password = getArg('--password');
const fullName = getArg('--name');

if (!email && !phone) {
  console.error('Provide --email or --phone');
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  phone,
  password: password || undefined,
  email_confirm: !!email,
  phone_confirm: !!phone,
  user_metadata: fullName ? { full_name: fullName } : undefined,
});

if (error) {
  console.error(`Failed to create user: ${error.message}`);
  process.exit(1);
}

console.log(`Created user ${data.user?.id}`);
