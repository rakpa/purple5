# Google Authentication Setup Guide

This guide will help you set up Google OAuth authentication for your Finance 2 application.

## Prerequisites

- Supabase project with authentication enabled
- Google Cloud Console account

## Step 1: Enable Google OAuth in Supabase

1. Go to your Supabase project: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv
2. Navigate to **Authentication** → **Providers**
3. Find **Google** in the list and click **Enable**
4. You'll need to configure Google OAuth credentials (see Step 2)

## Step 2: Create Google OAuth Credentials

📖 **Detailed Guide**: See `GOOGLE_OAUTH_CREDENTIALS_GUIDE.md` for step-by-step instructions with screenshots.

**Quick Steps**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **OAuth consent screen**
   - Choose **External** user type
   - Fill in: App name, User support email, Developer contact
   - Add scopes: `userinfo.email`, `userinfo.profile`
4. Go to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **OAuth client ID**
6. Configure:
   - Application type: **Web application**
   - Name: "Finance 2 Web Client"
   - Authorized redirect URIs: 
     ```
     https://ggpxsxanqpapwyqnfivv.supabase.co/auth/v1/callback
     ```
   - For local development, also add:
     ```
     http://localhost:8080/auth/v1/callback
     ```
7. **Copy the Client ID and Client Secret immediately** (you won't see the secret again!)

## Step 3: Configure Google Provider in Supabase

1. Back in Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Paste your **Client ID** and **Client Secret** from Google Cloud Console
3. Click **Save**

## Step 4: Run Database Migration

1. Go to your Supabase SQL Editor: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new
2. Copy and paste the contents of `supabase-auth-migration.sql`
3. Click **Run** to execute the SQL

This migration will:
- Add `user_id` columns to `transactions` and `categories` tables
- Create indexes for better performance
- Update RLS policies to ensure users can only access their own data
- Set up proper foreign key relationships

## Step 5: Update Redirect URL (if needed)

If you're deploying to a custom domain, update the redirect URL in:
- Google Cloud Console OAuth credentials
- Supabase Dashboard → Authentication → URL Configuration

## Step 6: Test the Authentication

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:8080`
3. You should be redirected to the login page
4. Click "Sign in with Google"
5. Complete the Google OAuth flow
6. You should be redirected to the dashboard

## Security Features

✅ **User-specific data**: All transactions and categories are tied to the authenticated user
✅ **Row Level Security (RLS)**: Database policies ensure users can only access their own data
✅ **Protected routes**: All pages require authentication
✅ **Automatic sign-out**: Users are signed out when they close the session

## Troubleshooting

### "Redirect URI mismatch" error
- Make sure the redirect URI in Google Cloud Console exactly matches:
  `https://ggpxsxanqpapwyqnfivv.supabase.co/auth/v1/callback`

### "User not authenticated" errors
- Check that RLS policies are correctly set up
- Verify the migration SQL ran successfully
- Check browser console for detailed error messages

### Data not showing after login
- Ensure the `user_id` column was added to tables
- Verify RLS policies are active
- Check that queries include `user_id` filtering

## Next Steps

After setting up authentication:
1. Users will need to sign in before accessing any page
2. Each user will have their own isolated data
3. Categories and transactions are automatically filtered by user
4. Users can sign out from the navigation menu

