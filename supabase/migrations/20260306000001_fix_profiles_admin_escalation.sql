-- ============================================================================
-- FIX CRITICAL: Prevent self-escalation to admin via profiles update
--
-- The profiles_owner_update policy allows any user to update their own profile,
-- but does NOT restrict the is_admin and admin_role columns. This means any
-- authenticated user can run:
--   UPDATE profiles SET is_admin = true, admin_role = 'super_admin' WHERE id = auth.uid()
-- granting themselves full admin access.
--
-- Fix: Use a BEFORE UPDATE trigger to prevent non-admin users from modifying
-- admin-related columns. This is more robust than a WITH CHECK policy because
-- it works regardless of how the update is structured.
-- ============================================================================

-- Create a trigger function that prevents admin column self-modification
CREATE OR REPLACE FUNCTION public.prevent_admin_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If is_admin or admin_role is being changed
  IF (NEW.is_admin IS DISTINCT FROM OLD.is_admin) OR (NEW.admin_role IS DISTINCT FROM OLD.admin_role) THEN
    -- Only allow if the CURRENT user is already a super_admin
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
      AND admin_role = 'super_admin'
    ) THEN
      -- Silently revert the admin columns to their original values
      NEW.is_admin := OLD.is_admin;
      NEW.admin_role := OLD.admin_role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists to make this idempotent
DROP TRIGGER IF EXISTS trg_prevent_admin_escalation ON public.profiles;

-- Create the trigger
CREATE TRIGGER trg_prevent_admin_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_self_escalation();

-- Also fix: Ensure admin RPC functions check admin_role, not just is_admin
-- This prevents analyst-role admins from performing destructive actions
-- (To be applied to individual RPCs in a follow-up migration)
