# Database Setup Instructions

## Quick Setup (Recommended)

If you're setting up for the first time or getting errors, use the **complete setup script**:

### Step 1: Run Complete Setup SQL

1. Go to Supabase SQL Editor:
   https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new

2. Open the file `supabase-complete-setup.sql` in your project

3. Copy **ALL** the SQL code from that file

4. Paste it into the Supabase SQL Editor

5. Click **Run** (or press Ctrl+Enter)

6. You should see "Success. No rows returned"

### Step 2: Verify Tables Created

1. Go to **Table Editor** in Supabase
2. You should see:
   - ✅ `transactions` table with `user_id` column
   - ✅ `categories` table with `user_id` column

### Step 3: Refresh Your App

1. Go back to your app
2. Refresh the page (F5)
3. Everything should work now!

---

## Alternative: Step-by-Step Setup

If you prefer to run scripts separately:

### First: Create Transactions Table
Run `supabase-setup.sql` first

### Second: Create Categories Table  
Run `supabase-categories-setup.sql` second

### Third: Add Authentication
Run `supabase-auth-migration.sql` last

**Note**: The complete setup script does all of this in one go, which is easier!

---

## Troubleshooting

### Error: "relation does not exist"
- You need to run the complete setup SQL first
- Make sure you run `supabase-complete-setup.sql`

### Error: "column user_id does not exist"
- You need to run the auth migration
- Use `supabase-complete-setup.sql` which includes everything

### Error: "permission denied"
- Make sure you're logged into Supabase
- Check that RLS policies are set up correctly

---

## What Gets Created

✅ **transactions** table with:
- All transaction fields
- `user_id` column for user isolation
- Indexes for performance
- RLS policies for security

✅ **categories** table with:
- Category name, icon, type
- `user_id` column for user isolation
- Indexes for performance
- RLS policies for security

✅ **Security**:
- Row Level Security enabled
- Users can only see their own data
- Automatic user_id assignment


