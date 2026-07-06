-- Engagement storage support
-- Adds tavern-level engagement config and visitor-level metadata buckets.

ALTER TABLE taverns
  ADD COLUMN engagement_config JSON NULL;

ALTER TABLE visitors
  ADD COLUMN metadata JSON NULL;
