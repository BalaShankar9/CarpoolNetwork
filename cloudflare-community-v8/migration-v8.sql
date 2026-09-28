-- Additive release migration. Existing members, bookings and audit records are untouched.
CREATE TABLE IF NOT EXISTS diagnostic_issues (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK(source IN ('browser','server','manual','scheduled')),
  code TEXT NOT NULL,
  route TEXT NOT NULL DEFAULT '',
  release TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  reporter_id TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','investigating','resolved','ignored')),
  occurrences INTEGER NOT NULL DEFAULT 1,
  first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  resolution TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_diagnostic_status_seen ON diagnostic_issues(status,last_seen DESC);


CREATE TABLE IF NOT EXISTS email_challenges (id TEXT PRIMARY KEY, code_hash TEXT NOT NULL, user_id TEXT, purpose TEXT NOT NULL CHECK(purpose IN ('signup','signin','link')), payload TEXT NOT NULL, expires_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_email_challenges_expiry ON email_challenges(expires_at);
