-- Migration: Add payments JSONB column to debts table for payment history
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb;
