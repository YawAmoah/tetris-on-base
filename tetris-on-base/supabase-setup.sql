-- Create the scores table in Supabase
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS scores (
  id BIGSERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  score NUMERIC NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  lines_cleared INTEGER NOT NULL DEFAULT 0,
  timestamp NUMERIC NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on score for faster sorting
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);

-- Create an index on address for faster lookups
CREATE INDEX IF NOT EXISTS idx_scores_address ON scores(address);

-- Create an index on tx_hash for duplicate checking
CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_tx_hash ON scores(tx_hash);

-- Enable Row Level Security (RLS)
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read scores
CREATE POLICY "Allow public read access to scores" ON scores
  FOR SELECT
  USING (true);

-- Create a policy that allows anyone to insert scores
CREATE POLICY "Allow public insert access to scores" ON scores
  FOR INSERT
  WITH CHECK (true);

