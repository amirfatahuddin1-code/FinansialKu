-- Migration: Revert default "Tabungan" category from 'investment' type back to 'savings' type.
-- Ensure that default savings categories are not erroneously classified as investments.

-- 1. Revert default 'Tabungan' category back to 'savings'
UPDATE categories
SET type = 'savings'
WHERE LOWER(name) = 'tabungan' AND is_default = TRUE AND type = 'investment';

-- 2. Clear category association for any investment transactions that were mistakenly linked to the default 'Tabungan' category.
-- Investment transactions should either use specific asset categories (e.g. BBCA, ANTM) or have category_id = NULL.
UPDATE transactions
SET category_id = NULL
WHERE type = 'investment' AND category_id IN (
  SELECT id FROM categories WHERE LOWER(name) = 'tabungan' AND is_default = TRUE
);
