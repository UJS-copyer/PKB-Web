CREATE INDEX IF NOT EXISTS "Note_status_sourceUpdatedAt_idx" ON "Note" ("status", "sourceUpdatedAt");
CREATE INDEX IF NOT EXISTS "Note_status_published_idx" ON "Note" ("status", "published");
CREATE INDEX IF NOT EXISTS "Note_status_visibility_idx" ON "Note" ("status", "visibility");
CREATE INDEX IF NOT EXISTS "Note_status_type_idx" ON "Note" ("status", "type");
