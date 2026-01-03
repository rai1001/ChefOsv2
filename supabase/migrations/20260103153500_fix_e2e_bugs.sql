-- Fix: Add 'active' column to employees
ALTER TABLE IF EXISTS employees 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Fix: Create 'schedule' table for legacy document support
CREATE TABLE IF NOT EXISTS schedule (
  id TEXT PRIMARY KEY,
  outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
  month TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON schedule
FOR ALL USING (auth.role() = 'authenticated');

-- Fix: Ensure 'staff' table exists or aliases to 'employees' if needed? 
-- If collections.ts calls it 'staff', we might need a view or rename.
-- But the error said 'employees'. This suggests the code MIGHT be using 'employees' somewhere else or I missed a re-mapping.
