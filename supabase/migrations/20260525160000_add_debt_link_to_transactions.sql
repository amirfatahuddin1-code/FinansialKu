-- Migration: Add debt_id foreign key link to transactions table
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS debt_id UUID REFERENCES public.debts(id) ON DELETE CASCADE;

-- Create index to improve join queries performance
CREATE INDEX IF NOT EXISTS idx_transactions_debt_id ON public.transactions(debt_id);
