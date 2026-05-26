-- Migration: Add missing columns to debts table and resolve naming discrepancies

-- 1. Rename amount_paid to paid if it exists, or create paid column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'debts' 
      AND column_name = 'amount_paid'
  ) THEN
    ALTER TABLE public.debts RENAME COLUMN amount_paid TO paid;
  ELSE
    ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS paid DECIMAL(15, 2) DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- 2. Add counterpart column
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS counterpart TEXT;

-- 3. Add notes column
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Add account_id column referencing financial_accounts
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL;
