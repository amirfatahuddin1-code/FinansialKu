-- Supabase Migration for Modifying Event Module

-- 1. Create event_incomes table
CREATE TABLE IF NOT EXISTS event_incomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Event Incomes
ALTER TABLE event_incomes ENABLE ROW LEVEL SECURITY;

-- Policies for Event Incomes
CREATE POLICY "Users can CRUD own event incomes" ON event_incomes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_incomes.event_id 
      AND events.user_id = (SELECT auth.uid())
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_event_incomes_event_id ON event_incomes(event_id);

-- 2. Add columns to event_items table
ALTER TABLE event_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15,2) DEFAULT 0;
ALTER TABLE event_items ADD COLUMN IF NOT EXISTS qty INTEGER DEFAULT 1;
