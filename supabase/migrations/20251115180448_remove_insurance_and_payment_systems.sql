/*
  # Remove Insurance and Payment Systems

  1. Changes
    - Drop vehicle_insurance table
    - Drop ride_costs table
    - Drop payments table
    - Drop payment_splits table
    - Drop license_verification_attempts table
    - Drop related functions and triggers

  2. Reason
    - Platform is connection-only, not handling payments or insurance
    - Users arrange their own payment and insurance separately
*/

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_auto_calculate_payment_splits ON rides;
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
DROP TRIGGER IF EXISTS update_ride_costs_updated_at ON ride_costs;
DROP TRIGGER IF EXISTS update_vehicle_insurance_updated_at ON vehicle_insurance;

-- Drop functions
DROP FUNCTION IF EXISTS auto_calculate_payment_splits();
DROP FUNCTION IF EXISTS calculate_payment_split(uuid, uuid);

-- Drop tables
DROP TABLE IF EXISTS license_verification_attempts;
DROP TABLE IF EXISTS payment_splits;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS ride_costs;
DROP TABLE IF EXISTS vehicle_insurance;
