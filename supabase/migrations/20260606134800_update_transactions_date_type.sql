-- Convert the date column in the transactions table from DATE to TIMESTAMPTZ
-- This ensures that time information is preserved when saving a transaction.

ALTER TABLE public.transactions 
  ALTER COLUMN date TYPE TIMESTAMP WITH TIME ZONE 
  USING date::TIMESTAMP WITH TIME ZONE;
