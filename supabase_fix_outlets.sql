-- Add missing columns to outlets table to match SupabaseOutletRepository.ts
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS auto_purchase_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS workspace_account TEXT;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS outlook_account TEXT;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'outlets';
