/*
  # Add Driver License Status and Trust Score System

  1. Driver License Updates
    - Add status column for consistency with verification system
    - Add countries and classes fields
    
  2. Trust Score System
    - Add trust_score column to profiles
    - Create calculation function
    - Add triggers for automatic updates
    
  3. Trust Score Factors (0-100 points)
    - Email verification: 10 points
    - Phone verification: 10 points
    - Profile photo verification: 15 points
    - Driver license verification: 20 points
    - Insurance verification: 15 points
    - Completed rides: up to 15 points
    - Average rating: up to 10 points
    - Account age: up to 5 points
*/

-- Add status column to driver_licenses if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_licenses' AND column_name = 'status'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_licenses' AND column_name = 'issuing_country'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN issuing_country text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_licenses' AND column_name = 'license_class'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN license_class text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_licenses' AND column_name = 'document_path'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN document_path text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_licenses' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE driver_licenses ADD COLUMN rejection_reason text;
  END IF;
END $$;

-- Add trust_score column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'trust_score'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trust_score integer DEFAULT 0;
  END IF;
END $$;

-- Create trust score calculation function
CREATE OR REPLACE FUNCTION calculate_trust_score(user_id_param uuid)
RETURNS integer AS $$
DECLARE
  score integer := 0;
  profile_rec RECORD;
  license_verified boolean;
  insurance_active boolean;
  completed_rides integer;
  account_age_days integer;
BEGIN
  SELECT * INTO profile_rec
  FROM profiles
  WHERE id = user_id_param;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Email verification (10 points)
  IF profile_rec.is_verified THEN
    score := score + 10;
  END IF;

  -- Phone verification (10 points)
  IF profile_rec.phone IS NOT NULL AND profile_rec.phone != '' THEN
    score := score + 10;
  END IF;

  -- Profile photo verification (15 points)
  IF profile_rec.profile_verified THEN
    score := score + 15;
  END IF;

  -- Driver license verification (20 points)
  SELECT EXISTS (
    SELECT 1 FROM driver_licenses
    WHERE driver_licenses.user_id = user_id_param
    AND status = 'verified'
    AND expiry_date > CURRENT_DATE
  ) INTO license_verified;

  IF license_verified THEN
    score := score + 20;
  END IF;

  -- Insurance verification (15 points)
  SELECT EXISTS (
    SELECT 1 FROM vehicle_insurance
    WHERE vehicle_insurance.user_id = user_id_param
    AND status = 'active'
    AND expiry_date > CURRENT_DATE
  ) INTO insurance_active;

  IF insurance_active THEN
    score := score + 15;
  END IF;

  -- Completed rides (up to 15 points, 1 point per ride)
  completed_rides := profile_rec.total_rides_offered + profile_rec.total_rides_taken;
  score := score + LEAST(completed_rides, 15);

  -- Average rating (up to 10 points, 2 points per star)
  IF profile_rec.average_rating > 0 THEN
    score := score + ROUND(profile_rec.average_rating * 2)::integer;
  END IF;

  -- Account age (up to 5 points, 1 point per 30 days, max 150 days)
  account_age_days := EXTRACT(DAY FROM (CURRENT_TIMESTAMP - profile_rec.created_at));
  score := score + LEAST(FLOOR(account_age_days / 30)::integer, 5);

  -- Ensure score is between 0 and 100
  score := LEAST(GREATEST(score, 0), 100);

  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user's trust score
CREATE OR REPLACE FUNCTION update_user_trust_score(user_id_param uuid)
RETURNS void AS $$
DECLARE
  new_score integer;
BEGIN
  new_score := calculate_trust_score(user_id_param);
  
  UPDATE profiles
  SET trust_score = new_score,
      updated_at = now()
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for profiles
CREATE OR REPLACE FUNCTION trigger_profile_trust_score()
RETURNS trigger AS $$
BEGIN
  PERFORM update_user_trust_score(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for other tables
CREATE OR REPLACE FUNCTION trigger_update_trust_score()
RETURNS trigger AS $$
BEGIN
  PERFORM update_user_trust_score(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers
DROP TRIGGER IF EXISTS trigger_license_trust_score ON driver_licenses;
CREATE TRIGGER trigger_license_trust_score
AFTER INSERT OR UPDATE ON driver_licenses
FOR EACH ROW
EXECUTE FUNCTION trigger_update_trust_score();

DROP TRIGGER IF EXISTS trigger_insurance_trust_score ON vehicle_insurance;
CREATE TRIGGER trigger_insurance_trust_score
AFTER INSERT OR UPDATE ON vehicle_insurance
FOR EACH ROW
EXECUTE FUNCTION trigger_update_trust_score();

DROP TRIGGER IF EXISTS trigger_profile_trust_score ON profiles;
CREATE TRIGGER trigger_profile_trust_score
AFTER UPDATE OF is_verified, profile_verified, phone, average_rating, total_rides_offered, total_rides_taken ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_profile_trust_score();

-- Create RPC function for users
CREATE OR REPLACE FUNCTION refresh_my_trust_score()
RETURNS integer AS $$
DECLARE
  new_score integer;
BEGIN
  new_score := calculate_trust_score(auth.uid());
  
  UPDATE profiles
  SET trust_score = new_score,
      updated_at = now()
  WHERE id = auth.uid();
  
  RETURN new_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize trust scores for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM profiles LOOP
    PERFORM update_user_trust_score(user_record.id);
  END LOOP;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION calculate_trust_score IS 'Calculates trust score (0-100) based on verifications, rides, rating, and account age';
COMMENT ON FUNCTION refresh_my_trust_score IS 'RPC function allowing users to refresh their own trust score';
COMMENT ON COLUMN profiles.trust_score IS 'Calculated trust score (0-100) based on verifications and activity';
