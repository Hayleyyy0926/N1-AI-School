CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY,
  form_version INTEGER NOT NULL DEFAULT 1,
  language TEXT NOT NULL DEFAULT 'zh',
  status TEXT NOT NULL DEFAULT 'draft',
  edit_token_hash TEXT NOT NULL,
  applicant_name TEXT,
  contact_email TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  CONSTRAINT submissions_language_check CHECK (language IN ('zh', 'en')),
  CONSTRAINT submissions_status_check CHECK (status IN ('draft', 'submitted', 'under_review', 'shortlisted', 'interview', 'accepted', 'rejected', 'withdrawn'))
);

-- statement-breakpoint
CREATE INDEX IF NOT EXISTS submissions_status_idx ON submissions(status);

-- statement-breakpoint
CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON submissions(created_at DESC);

-- statement-breakpoint
CREATE INDEX IF NOT EXISTS submissions_contact_email_idx ON submissions(lower(contact_email));

-- statement-breakpoint
CREATE INDEX IF NOT EXISTS submissions_answers_gin_idx ON submissions USING GIN(answers);
