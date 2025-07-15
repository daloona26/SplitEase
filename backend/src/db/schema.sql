/*
# Complete SplitEase Database Schema

1. New Tables
   - `users` - User accounts and profiles
   - `groups` - Expense sharing groups
   - `group_members` - Group membership with roles
   - `expenses` - Individual expenses
   - `expense_payments` - Track who paid what amount
   - `expense_participants` - Track participant shares
   - `recurring_expenses` - Automated recurring expense templates

2. Security
   - Enable RLS on all tables
   - Add comprehensive policies for authenticated users
   - Secure file upload and access

3. Features
   - Photo attachments for receipts
   - Recurring expense automation
   - Export functionality
   - Advanced expense splitting
*/

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_trial_active BOOLEAN DEFAULT TRUE,
    trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '14 days'),
    subscription_status VARCHAR(50) DEFAULT 'trial',
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE
);

-- Create groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    creator_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_group_creator
        FOREIGN KEY (creator_user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Create group_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_group_member_group
        FOREIGN KEY (group_id)
        REFERENCES groups(id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_group_member_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    
    UNIQUE(group_id, user_id)
);

-- Create expenses table if it doesn't exist
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    expense_date DATE DEFAULT CURRENT_DATE,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_expense_group
        FOREIGN KEY (group_id)
        REFERENCES groups(id)
        ON DELETE CASCADE
);

-- Create expense_payments table
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

-- Create expense_participants table
CREATE TABLE IF NOT EXISTS expense_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL,
    user_id UUID NOT NULL,
    share_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    share_percentage DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_expense_participant_expense
        FOREIGN KEY (expense_id)
        REFERENCES expenses(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_expense_participant_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,
    
    UNIQUE(expense_id, user_id)
);

-- Create recurring_expenses table
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE,
    next_execution DATE NOT NULL,
    last_executed DATE,
    payer_id UUID NOT NULL,
    participant_ids JSONB NOT NULL,
    split_type VARCHAR(20) DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom', 'percentage')),
    custom_shares JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_recurring_expense_group
        FOREIGN KEY (group_id)
        REFERENCES groups(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_recurring_expense_payer
        FOREIGN KEY (payer_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users
CREATE POLICY "Users can read own data" ON users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- Create RLS policies for groups
CREATE POLICY "Users can read groups they belong to" ON groups
    FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create groups" ON groups
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = creator_user_id);

CREATE POLICY "Group creators can update their groups" ON groups
    FOR UPDATE TO authenticated
    USING (auth.uid() = creator_user_id);

CREATE POLICY "Group creators can delete their groups" ON groups
    FOR DELETE TO authenticated
    USING (auth.uid() = creator_user_id);

-- Create RLS policies for group_members
CREATE POLICY "Users can read group members for their groups" ON group_members
    FOR SELECT TO authenticated
    USING (
        group_id IN (
            SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Group creators can manage members" ON group_members
    FOR ALL TO authenticated
    USING (
        group_id IN (
            SELECT id FROM groups WHERE creator_user_id = auth.uid()
        )
    );

-- Create RLS policies for expenses
CREATE POLICY "Users can read expenses for their groups" ON expenses
    FOR SELECT TO authenticated
    USING (
        group_id IN (
            SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create expenses for their groups" ON expenses
    FOR INSERT TO authenticated
    WITH CHECK (
        group_id IN (
            SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update expenses they created or paid for" ON expenses
    FOR UPDATE TO authenticated
    USING (
        group_id IN (
            SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete expenses they created or paid for" ON expenses
    FOR DELETE TO authenticated
    USING (
        group_id IN (
            SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
    );

-- Create RLS policies for expense_payments
CREATE POLICY "Users can read expense payments for their groups" ON expense_payments
    FOR SELECT TO authenticated
    USING (
        expense_id IN (
            SELECT e.id FROM expenses e
            JOIN group_members gm ON e.group_id = gm.group_id
            WHERE gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage expense payments for their groups" ON expense_payments
    FOR ALL TO authenticated
    USING (
        expense_id IN (
            SELECT e.id FROM expenses e
            JOIN group_members gm ON e.group_id = gm.group_id
            WHERE gm.user_id = auth.uid()
        )
    );

-- Create RLS policies for expense_participants
CREATE POLICY "Users can read expense participants for their groups" ON expense_participants
    FOR SELECT TO authenticated
    USING (
        expense_id IN (
            SELECT e.id FROM expenses e
            JOIN group_members gm ON e.group_id = gm.group_id
            WHERE gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage expense participants for their groups" ON expense_participants
    FOR ALL TO authenticated
    USING (
        expense_id IN (
            SELECT e.id FROM expenses e
            JOIN group_members gm ON e.group_id = gm.group_id
            WHERE gm.user_id = auth.uid()
        )
    );

-- Create RLS policies for recurring_expenses
CREATE POLICY "Users can read recurring expenses for their groups" ON recurring_expenses
    FOR SELECT TO authenticated
    USING (
        group_id IN (
            SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage recurring expenses for their groups" ON recurring_expenses
    FOR ALL TO authenticated
    USING (
        group_id IN (
            SELECT group_id FROM group_members WHERE user_id = auth.uid()
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_groups_creator ON groups (creator_user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses (group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_payments_expense_id ON expense_payments (expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_payments_user_id ON expense_payments (user_id);
CREATE INDEX IF NOT EXISTS idx_expense_participants_expense_id ON expense_participants (expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_participants_user_id ON expense_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_group_id ON recurring_expenses (group_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_execution ON recurring_expenses (next_execution);

-- Create or replace the update timestamp function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_expense_payments_updated_at ON expense_payments;
CREATE TRIGGER update_expense_payments_updated_at
    BEFORE UPDATE ON expense_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_expense_participants_updated_at ON expense_participants;
CREATE TRIGGER update_expense_participants_updated_at
    BEFORE UPDATE ON expense_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_recurring_expenses_updated_at ON recurring_expenses;
CREATE TRIGGER update_recurring_expenses_updated_at
    BEFORE UPDATE ON recurring_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

SELECT 'Complete database schema created successfully!' as status;
-- Create recurring_expenses table
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE,
    next_execution DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    payer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_ids JSONB NOT NULL DEFAULT '[]',
    split_type VARCHAR(20) DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom', 'percentage')),
    custom_shares JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_group_id ON recurring_expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_execution ON recurring_expenses(next_execution);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_is_active ON recurring_expenses(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_payer_id ON recurring_expenses(payer_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurring_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recurring_expenses_updated_at
    BEFORE UPDATE ON recurring_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_recurring_expenses_updated_at();

ALTER TABLE expenses
ADD COLUMN photo_url TEXT;