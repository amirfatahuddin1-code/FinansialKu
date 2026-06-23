-- Migration: Add 'investment' transaction type, update check constraints, and migrate existing investment records.

-- 1. Add 'investment' to transactions.type constraint
ALTER TABLE transactions 
  DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions 
  ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('income', 'expense', 'savings', 'investment'));

-- 2. Add 'investment' to categories.type constraint
ALTER TABLE categories 
  DROP CONSTRAINT IF EXISTS categories_type_check;
ALTER TABLE categories 
  ADD CONSTRAINT categories_type_check 
  CHECK (type IN ('income', 'expense', 'savings', 'investment'));

-- 3. Migrate existing categories used exclusively for investments (savings without savings_id)
-- Note: we only migrate categories that were actually created for investments (type='savings', but linked to transactions where savings_id IS NULL)
UPDATE categories
SET type = 'investment'
WHERE type = 'savings' AND id IN (
  SELECT DISTINCT category_id 
  FROM transactions 
  WHERE type = 'savings' AND savings_id IS NULL AND category_id IS NOT NULL
);

-- 4. Migrate existing investment transactions
UPDATE transactions
SET type = 'investment'
WHERE type = 'savings' AND savings_id IS NULL;
