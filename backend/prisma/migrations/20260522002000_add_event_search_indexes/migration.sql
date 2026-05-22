CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS events_published_title_trgm_idx
ON events USING gin (title gin_trgm_ops)
WHERE status = 'PUBLISHED';

CREATE INDEX IF NOT EXISTS events_published_venue_trgm_idx
ON events USING gin (venue gin_trgm_ops)
WHERE status = 'PUBLISHED';

CREATE INDEX IF NOT EXISTS events_published_description_trgm_idx
ON events USING gin (description gin_trgm_ops)
WHERE status = 'PUBLISHED' AND description IS NOT NULL;
