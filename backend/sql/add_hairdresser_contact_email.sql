-- À exécuter dans Supabase → SQL Editor
ALTER TABLE hairdressers
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

CREATE INDEX IF NOT EXISTS hairdressers_contact_email_idx
  ON hairdressers (contact_email)
  WHERE contact_email IS NOT NULL;
