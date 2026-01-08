import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://uqofmsreosfjflmgurzb.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxb2Ztc3Jlb3NmamZsbWd1cnpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc2Nzc0OCwiZXhwIjoyMDc2MzQzNzQ4fQ.SdMJqgDPPlWx7wZ7PLRoAQiJe58OSotUchYSYlKaD68'
);

const sql = `
CREATE OR REPLACE FUNCTION accept_friend_request(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_user_id uuid;
  v_to_user_id uuid;
  v_friendship_id uuid;
  v_current_user uuid;
BEGIN
  v_current_user := auth.uid();
  
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT from_user_id, to_user_id
  INTO v_from_user_id, v_to_user_id
  FROM friend_requests
  WHERE id = p_request_id AND status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;

  IF v_to_user_id != v_current_user THEN
    RAISE EXCEPTION 'Only the receiver can accept this request';
  END IF;

  UPDATE friend_requests
  SET status = 'ACCEPTED', updated_at = now()
  WHERE id = p_request_id;

  INSERT INTO friendships (user_a, user_b)
  VALUES (LEAST(v_from_user_id, v_to_user_id), GREATEST(v_from_user_id, v_to_user_id))
  ON CONFLICT (user_a, user_b) DO NOTHING
  RETURNING id INTO v_friendship_id;

  RETURN v_friendship_id;
END;
$$;
`;

async function run() {
    // Use raw postgres query via Supabase's sql tagged template
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.log('RPC error, trying direct approach...');
        // Try using the Supabase management API or another approach
        // For now, output the SQL to run manually
        console.log('\n=== Run this SQL in Supabase SQL Editor ===\n');
        console.log(sql);
        console.log('\n===========================================\n');
    } else {
        console.log('Function updated successfully!');
    }
}

run();
