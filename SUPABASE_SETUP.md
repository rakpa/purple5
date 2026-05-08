# Supabase Setup Instructions

This project uses Supabase for storing income and expense transactions.

## Project Information
- **Project Name**: Finance 2
- **Project ID**: ggpxsxanqpapwyqnfivv

## Setup Steps

### 1. Get Your Supabase Credentials

1. Go to your Supabase project: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv
2. Navigate to **Settings** → **API**
3. Copy the following values:
   - **Project URL** (e.g., `https://ggpxsxanqpapwyqnfivv.supabase.co`)
   - **anon/public key** (under Project API keys)

### 2. Create Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://ggpxsxanqpapwyqnfivv.supabase.co
   VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
   ```

### 3. Create the Database Table

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new
3. Copy and paste the contents of `supabase-setup.sql`
4. Click **Run** to execute the SQL

This will create:
- `transactions` table with all necessary columns
- Indexes for better query performance
- Row Level Security (RLS) policies
- Automatic `updated_at` timestamp trigger

### 4. Verify the Setup

After running the SQL, you should see:
- A new `transactions` table in the **Table Editor**
- The table should have columns: `id`, `type`, `amount`, `date`, `description`, `category`, `created_at`, `updated_at`

### 5. Start the Development Server

```bash
npm run dev
```

The app should now be able to:
- Add income and expense transactions
- View all transactions
- Delete transactions
- Filter transactions by type and date range

## Security Notes

The current RLS policy allows all operations. For production use, you should:
1. Implement user authentication
2. Update the RLS policy to restrict access based on user ID
3. Consider using service role key for server-side operations only

## Troubleshooting

If you encounter issues:
1. Verify your environment variables are set correctly
2. Check that the `transactions` table exists in Supabase
3. Verify RLS policies are set correctly
4. Check the browser console for error messages


