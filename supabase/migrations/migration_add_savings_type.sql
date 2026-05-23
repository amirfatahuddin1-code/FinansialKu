-- Migration: Add 'savings' transaction type, savings_id, and budget mode fields

-- 1. Add 'savings' to transactions.type constraint
ALTER TABLE transactions 
  DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions 
  ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('income', 'expense', 'savings'));

-- 2. Add 'savings' to categories.type constraint
ALTER TABLE categories 
  DROP CONSTRAINT IF EXISTS categories_type_check;
ALTER TABLE categories 
  ADD CONSTRAINT categories_type_check 
  CHECK (type IN ('income', 'expense', 'savings'));

-- 3. Add savings_id to transactions (nullable FK to savings)
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS savings_id UUID REFERENCES savings(id) ON DELETE SET NULL;

-- 4. Add mode & percentage to budgets (for savings budget: nominal/percentage)
ALTER TABLE budgets 
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'nominal'
  CHECK (mode IN ('nominal', 'percentage'));
ALTER TABLE budgets 
  ADD COLUMN IF NOT EXISTS percentage INTEGER;

-- 5. Update existing category "Tabungan" from expense → savings
UPDATE categories 
SET type = 'savings' 
WHERE LOWER(name) LIKE '%tabung%' AND type = 'expense';

-- 6. Update existing expense transactions with tabungan category → savings type
UPDATE transactions 
SET type = 'savings' 
WHERE type = 'expense' 
  AND category_id IN (
    SELECT id FROM categories WHERE LOWER(name) LIKE '%tabung%'
  );
