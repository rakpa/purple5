# Quick Fix: Add user_id Column Error

You're seeing the error: **"column transactions.user_id does not exist"**

This means the database migration hasn't been run yet. Follow these steps:

## Step 1: Run the Database Migration

1. Go to your Supabase SQL Editor:
   https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new

2. Copy the ENTIRE contents of the file `supabase-auth-migration.sql`

3. Paste it into the SQL Editor

4. Click **Run** (or press Ctrl+Enter)

## Step 2: Verify the Migration

After running the SQL, verify it worked:

1. Go to **Table Editor** in Supabase
2. Click on the `transactions` table
3. You should see a `user_id` column
4. Click on the `categories` table
5. You should also see a `user_id` column

## Step 3: Refresh Your App

1. Go back to your app
2. Refresh the page (F5 or Ctrl+R)
3. The error should be gone!

## If You Still See Errors

If you still see errors after running the migration:

1. Check the browser console (F12) for any error messages
2. Make sure you're signed in (check the user avatar in the top right)
3. Try signing out and signing back in

## What the Migration Does

The migration SQL will:
- ✅ Add `user_id` column to `transactions` table
- ✅ Add `user_id` column to `categories` table
- ✅ Create indexes for better performance
- ✅ Set up Row Level Security (RLS) policies
- ✅ Ensure users can only see their own data


