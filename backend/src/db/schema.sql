-- Fix database schema to ensure compatibility
-- Run this script to ensure your database schema is correct

-- Ensure the expenses table doesn't have payer_user_id column
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'payer_user_id'
    ) THEN
        ALTER TABLE expenses DROP COLUMN payer_user_id;
    END IF;
END $$;

-- Ensure expense_payments table exists with correct structure
CREATE TABLE IF NOT EXISTS expense_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL,
    user_id UUID NOT NULL,
    amount_paid NUMERIC(10, 2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_expense_payment_expense
        FOREIGN KEY (expense_id)
        REFERENCES expenses(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_expense_payment_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_expense_payments_expense_id ON expense_payments (expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_payments_user_id ON expense_payments (user_id);

-- Create or replace the update timestamp function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for expense_payments updated_at
DROP TRIGGER IF EXISTS update_expense_payments_updated_at ON expense_payments;
CREATE TRIGGER update_expense_payments_updated_at
    BEFORE UPDATE ON expense_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Ensure all other tables have proper structure
-- Add any missing columns to existing tables

-- Ensure groups table has description column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'groups' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE groups ADD COLUMN description TEXT;
    END IF;
END $$;

-- Ensure group_members table has role column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'group_members' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE group_members ADD COLUMN role VARCHAR(50) DEFAULT 'member';
    END IF;
END $$;

-- Ensure expenses table has category column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE expenses ADD COLUMN category VARCHAR(100) DEFAULT 'general';
    END IF;
END $$;

-- Ensure expense_participants table has share_percentage column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expense_participants' 
        AND column_name = 'share_percentage'
    ) THEN
        ALTER TABLE expense_participants ADD COLUMN share_percentage DECIMAL(5, 2);
    END IF;
END $$;

-- Update any existing data to ensure consistency
-- Set default values for any NULL categories
UPDATE expenses SET category = 'general' WHERE category IS NULL;

-- Set default values for any NULL share_percentages
UPDATE expense_participants 
SET share_percentage = CASE 
    WHEN share_amount > 0 THEN 
        ROUND((share_amount / (SELECT amount FROM expenses WHERE id = expense_participants.expense_id)) * 100, 2)
    ELSE 0 
END 
WHERE share_percentage IS NULL;

-- Verify the schema is correct
SELECT 'Schema verification complete' as status;
ALTER TABLE users ADD COLUMN is_trial_active BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP WITH TIME ZONE;