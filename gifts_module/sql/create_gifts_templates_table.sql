-- ================================================================
-- Candy Club System — Gifts Module
-- Table: gifts_templates
-- Purpose: Store quick bouquet templates for reuse in the builder
-- Run this in your Supabase SQL Editor (supabase.com/dashboard)
-- ================================================================

CREATE TABLE IF NOT EXISTS gifts_templates (
    id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    template_name   TEXT        NOT NULL,
    items           JSONB       NOT NULL DEFAULT '[]',
    estimated_price NUMERIC     NOT NULL DEFAULT 0,
    created_by      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast filtering by name
CREATE INDEX IF NOT EXISTS idx_gifts_templates_name
    ON gifts_templates (template_name);

-- Index for ordering by creation date
CREATE INDEX IF NOT EXISTS idx_gifts_templates_created_at
    ON gifts_templates (created_at DESC);

-- Enable Row Level Security
ALTER TABLE gifts_templates ENABLE ROW LEVEL SECURITY;

-- Policy: allow all operations (adjust based on your auth setup)
CREATE POLICY "allow_all_gifts_templates"
    ON gifts_templates
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ================================================================
-- Done! After running this, your templates will sync across
-- all devices automatically via the gifts module.
-- ================================================================
