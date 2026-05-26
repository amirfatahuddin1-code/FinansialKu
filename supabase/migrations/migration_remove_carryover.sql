-- Migration: Remove carryover system, add destination_account_id for savings transfers

-- 1. Add destination_account_id to transactions (for savings transfers between accounts)
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS destination_account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL;

-- 2. Delete existing savings transactions (from old Kelola Saldo flow)
DELETE FROM transactions WHERE type = 'savings';

-- 3. Reset all savings target current amounts (savings transactions were deleted)
UPDATE savings SET current = 0;

-- 4. Delete the "Akumulasi Saldo" category (no longer needed)
DELETE FROM categories WHERE LOWER(name) = 'akumulasi saldo';
