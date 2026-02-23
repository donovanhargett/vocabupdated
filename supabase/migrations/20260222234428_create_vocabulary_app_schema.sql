/*
  # Vocabulary App Database Schema

  ## Overview
  Creates the complete database schema for a vocabulary building app with spaced repetition,
  reading list management, and user settings storage.

  ## New Tables

  ### `vocab_words`
  Stores vocabulary words with their definitions, examples, and spaced repetition data.
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `word` (text, the vocabulary word)
  - `definition` (text, AI-generated definition)
  - `example_sentence` (text, AI-generated example)
  - `ease_factor` (numeric, SM-2 algorithm ease factor, default 2.5)
  - `interval` (integer, days until next review, default 0)
  - `next_review_date` (timestamptz, when to review next)
  - `repetitions` (integer, successful review count, default 0)
  - `created_at` (timestamptz)

  ### `reading_list`
  Stores user's reading list entries.
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `author` (text)
  - `title` (text)
  - `description` (text)
  - `created_at` (timestamptz)

  ### `user_settings`
  Stores user configuration including API keys.
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users, unique)
  - `openai_api_key` (text, encrypted storage recommended)
  - `theme` (text, 'dark' or 'light', default 'dark')
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `review_history`
  Tracks all review attempts with AI feedback.
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `word_id` (uuid, foreign key to vocab_words)
  - `user_sentence` (text, user's practice sentence)
  - `ai_feedback` (text, AI's feedback on usage)
  - `ai_grade` (text, grade: 'perfect', 'good', 'awkward', 'incorrect')
  - `reviewed_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - All policies require authentication
*/

-- Create vocab_words table
CREATE TABLE IF NOT EXISTS vocab_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  word text NOT NULL,
  definition text NOT NULL,
  example_sentence text NOT NULL,
  ease_factor numeric DEFAULT 2.5 NOT NULL,
  interval integer DEFAULT 0 NOT NULL,
  next_review_date timestamptz DEFAULT now() NOT NULL,
  repetitions integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create reading_list table
CREATE TABLE IF NOT EXISTS reading_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author text DEFAULT '' NOT NULL,
  title text DEFAULT '' NOT NULL,
  description text DEFAULT '' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  openai_api_key text DEFAULT '' NOT NULL,
  theme text DEFAULT 'dark' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create review_history table
CREATE TABLE IF NOT EXISTS review_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  word_id uuid REFERENCES vocab_words(id) ON DELETE CASCADE NOT NULL,
  user_sentence text NOT NULL,
  ai_feedback text NOT NULL,
  ai_grade text NOT NULL,
  reviewed_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE vocab_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_history ENABLE ROW LEVEL SECURITY;

-- Policies for vocab_words
CREATE POLICY "Users can view own vocabulary words"
  ON vocab_words FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vocabulary words"
  ON vocab_words FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vocabulary words"
  ON vocab_words FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vocabulary words"
  ON vocab_words FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for reading_list
CREATE POLICY "Users can view own reading list"
  ON reading_list FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reading list entries"
  ON reading_list FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading list entries"
  ON reading_list FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reading list entries"
  ON reading_list FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for user_settings
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for review_history
CREATE POLICY "Users can view own review history"
  ON review_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own review history"
  ON review_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vocab_words_user_id ON vocab_words(user_id);
CREATE INDEX IF NOT EXISTS idx_vocab_words_next_review ON vocab_words(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_reading_list_user_id ON reading_list(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_review_history_user_id ON review_history(user_id);
CREATE INDEX IF NOT EXISTS idx_review_history_word_id ON review_history(word_id);
