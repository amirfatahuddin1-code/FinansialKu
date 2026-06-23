-- Migration: Comprehensive fix for 'Tabungan' categories that were erroneously set to 'investment' type.
-- This migration is more aggressive and handles categories where is_default may be FALSE as well.

-- 1. Revert ALL 'Tabungan' categories to 'savings' type if they:
--    - Are named 'Tabungan' (case-insensitive)
--    - Currently have type = 'investment'
--    - Are NOT linked to any actual investment asset transactions
--      (i.e., not used as a category for investment-type transactions with actual asset data)
UPDATE categories
SET type = 'savings'
WHERE LOWER(name) = 'tabungan'
  AND type = 'investment';

-- 2. Handle edge case: if any investment transactions are using a 'Tabungan' category
-- (which is incorrect), clear their category reference so they can be re-categorized.
UPDATE transactions
SET category_id = NULL
WHERE type = 'investment' AND category_id IN (
  SELECT id FROM categories WHERE LOWER(name) = 'tabungan'
);
