/*
  # Remove passkey authentication system

  1. Cleanup
    - Drop passkey tables, policies, and helper function
*/

DO $$
BEGIN
  DROP FUNCTION IF EXISTS public.cleanup_expired_passkey_challenges();

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'passkey_credentials'
  ) THEN
    DROP TABLE public.passkey_credentials CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'passkey_challenges'
  ) THEN
    DROP TABLE public.passkey_challenges CASCADE;
  END IF;
END $$;
