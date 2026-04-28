-- Migration: 014_transaction_notes
-- Adds optional notes field to transactions table

ALTER TABLE transactions ADD COLUMN notes text;
