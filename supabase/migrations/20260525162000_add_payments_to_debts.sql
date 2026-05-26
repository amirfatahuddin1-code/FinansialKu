-- Migration: Add payments JSONB column to debts table
ALTER TABLE public.debts 
  ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb NOT NULL;
