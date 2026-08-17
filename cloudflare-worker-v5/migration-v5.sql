PRAGMA foreign_keys = ON;

-- v5: stronger booking safety across duplicate/overlapping ride posts.
CREATE INDEX IF NOT EXISTS idx_posts_ride_search_v5
  ON posts (status, category, journey_date, journey_time, created_at DESC);

-- A rider cannot be confirmed on two different ride offers at roughly the same time,
-- even if they accidentally created more than one "ride wanted" post.
CREATE TRIGGER IF NOT EXISTS trg_v5_rider_overlap_update
BEFORE UPDATE OF status ON ride_requests
WHEN NEW.status = 'accepted' AND OLD.status <> 'accepted'
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM ride_requests existing
    JOIN posts existing_offer ON existing_offer.id = existing.ride_offer_post_id
    JOIN posts new_offer ON new_offer.id = NEW.ride_offer_post_id
    WHERE existing.rider_id = NEW.rider_id
      AND existing.id <> NEW.id
      AND existing.status IN ('accepted','completed')
      AND existing_offer.journey_date = new_offer.journey_date
      AND ABS(
        (CAST(substr(existing_offer.journey_time,1,2) AS INTEGER) * 60 + CAST(substr(existing_offer.journey_time,4,2) AS INTEGER)) -
        (CAST(substr(new_offer.journey_time,1,2) AS INTEGER) * 60 + CAST(substr(new_offer.journey_time,4,2) AS INTEGER))
      ) < 180
  ) THEN RAISE(ABORT, 'RIDER_TIME_CONFLICT') END;

  -- A driver may carry multiple passengers on the same offer, but cannot confirm
  -- passengers onto a different ride offer that overlaps the same time window.
  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM ride_requests existing
    JOIN posts existing_offer ON existing_offer.id = existing.ride_offer_post_id
    JOIN posts new_offer ON new_offer.id = NEW.ride_offer_post_id
    WHERE existing.driver_id = NEW.driver_id
      AND existing.id <> NEW.id
      AND existing.ride_offer_post_id <> NEW.ride_offer_post_id
      AND existing.status IN ('accepted','completed')
      AND existing_offer.journey_date = new_offer.journey_date
      AND ABS(
        (CAST(substr(existing_offer.journey_time,1,2) AS INTEGER) * 60 + CAST(substr(existing_offer.journey_time,4,2) AS INTEGER)) -
        (CAST(substr(new_offer.journey_time,1,2) AS INTEGER) * 60 + CAST(substr(new_offer.journey_time,4,2) AS INTEGER))
      ) < 180
  ) THEN RAISE(ABORT, 'DRIVER_TIME_CONFLICT') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_v5_rider_overlap_insert
BEFORE INSERT ON ride_requests
WHEN NEW.status = 'accepted'
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM ride_requests existing
    JOIN posts existing_offer ON existing_offer.id = existing.ride_offer_post_id
    JOIN posts new_offer ON new_offer.id = NEW.ride_offer_post_id
    WHERE existing.rider_id = NEW.rider_id
      AND existing.status IN ('accepted','completed')
      AND existing_offer.journey_date = new_offer.journey_date
      AND ABS(
        (CAST(substr(existing_offer.journey_time,1,2) AS INTEGER) * 60 + CAST(substr(existing_offer.journey_time,4,2) AS INTEGER)) -
        (CAST(substr(new_offer.journey_time,1,2) AS INTEGER) * 60 + CAST(substr(new_offer.journey_time,4,2) AS INTEGER))
      ) < 180
  ) THEN RAISE(ABORT, 'RIDER_TIME_CONFLICT') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM ride_requests existing
    JOIN posts existing_offer ON existing_offer.id = existing.ride_offer_post_id
    JOIN posts new_offer ON new_offer.id = NEW.ride_offer_post_id
    WHERE existing.driver_id = NEW.driver_id
      AND existing.ride_offer_post_id <> NEW.ride_offer_post_id
      AND existing.status IN ('accepted','completed')
      AND existing_offer.journey_date = new_offer.journey_date
      AND ABS(
        (CAST(substr(existing_offer.journey_time,1,2) AS INTEGER) * 60 + CAST(substr(existing_offer.journey_time,4,2) AS INTEGER)) -
        (CAST(substr(new_offer.journey_time,1,2) AS INTEGER) * 60 + CAST(substr(new_offer.journey_time,4,2) AS INTEGER))
      ) < 180
  ) THEN RAISE(ABORT, 'DRIVER_TIME_CONFLICT') END;
END;

-- Free account recovery without SMS/email providers. The user keeps a private
-- recovery code; using it rotates the device token and signs in a new device.
CREATE TABLE IF NOT EXISTS account_recovery (
  user_id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_account_recovery_hash ON account_recovery (code_hash);
