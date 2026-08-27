ALTER TABLE submissions ADD COLUMN IF NOT EXISTS feishu_record_id TEXT;

-- statement-breakpoint
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS feishu_synced_at TIMESTAMPTZ;

-- statement-breakpoint
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS feishu_sync_error TEXT;

-- statement-breakpoint
CREATE INDEX IF NOT EXISTS submissions_feishu_record_id_idx ON submissions(feishu_record_id);
