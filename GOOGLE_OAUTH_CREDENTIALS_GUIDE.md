# How to Get Google OAuth Client ID and Client Secret

Follow these steps to create Google OAuth credentials for your Finance 2 application.

## Step 1: Go to Google Cloud Console

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account

## Step 2: Create or Select a Project

1. Click on the project dropdown at the top of the page
2. Either:
   - **Select an existing project** (if you have one)
   - **Click "New Project"** to create a new one
     - Enter project name: "Finance 2" (or any name you prefer)
     - Click "Create"
     - Wait for the project to be created, then select it

## Step 3: Enable Google+ API (if needed)

1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for "Google+ API" or "Google Identity"
3. Click on it and click **Enable** (if not already enabled)

## Step 4: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type (unless you have a Google Workspace account)
3. Click **Create**
4. Fill in the required information:
   - **App name**: "Finance 2" (or your preferred name)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **Save and Continue**
6. On the **Scopes** page:
   - Click **Add or Remove Scopes**
   - Select: `userinfo.email` and `userinfo.profile`
   - Click **Update**
   - Click **Save and Continue**
7. On the **Test users** page (if in testing mode):
   - Add your email address as a test user
   - Click **Save and Continue**
8. Review and click **Back to Dashboard**

## Step 5: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** at the top
3. Select **OAuth client ID**

## Step 6: Configure OAuth Client

1. **Application type**: Select **Web application**
2. **Name**: Enter "Finance 2 Web Client" (or any name)
3. **Authorized JavaScript origins**: 
   - Click **+ Add URI**
   - Add: `https://ggpxsxanqpapwyqnfivv.supabase.co`
   - For local development, also add: `http://localhost:8080`
4. **Authorized redirect URIs**:
   - Click **+ Add URI**
   - Add: `https://ggpxsxanqpapwyqnfivv.supabase.co/auth/v1/callback`
   - For local development, also add: `http://localhost:8080/auth/v1/callback`
5. Click **Create**

## Step 7: Copy Your Credentials

After clicking Create, a popup will appear with:
- **Your Client ID** - Copy this (looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
- **Your Client Secret** - Copy this (looks like: `GOCSPX-xxxxxxxxxxxxxxxxxxxxx`)

⚠️ **Important**: Copy these immediately! You won't be able to see the Client Secret again after closing the popup.

## Step 8: Add Credentials to Supabase

1. Go back to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers** → **Google**
3. Paste your **Client ID** in the "Client IDs" field
4. Paste your **Client Secret** in the "Client Secret (for OAuth)" field
5. Make sure "Enable Sign in with Google" toggle is **ON**
6. Click **Save**

## Step 9: Verify the Setup

1. The **Callback URL** in Supabase should match:
   ```
   https://ggpxsxanqpapwyqnfivv.supabase.co/auth/v1/callback
   ```
2. Make sure this exact URL is added in Google Cloud Console under "Authorized redirect URIs"

## Troubleshooting

### "Redirect URI mismatch" Error
- Ensure the redirect URI in Google Cloud Console **exactly matches** the one in Supabase
- Check for trailing slashes or typos
- Make sure you're using `https://` (not `http://`) for production

### "Invalid Client" Error
- Verify the Client ID is copied correctly (no extra spaces)
- Make sure the Client Secret is correct
- Check that the OAuth consent screen is configured

### Can't See Client Secret
- If you closed the popup, you'll need to:
  1. Go to **Credentials** in Google Cloud Console
  2. Click on your OAuth 2.0 Client ID
  3. You can reset the secret, but you cannot view the old one
  4. If you reset it, update it in Supabase

## Quick Reference

**Google Cloud Console**: https://console.cloud.google.com/
**Supabase Dashboard**: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/auth/providers

**Required Redirect URI**:
```
https://ggpxsxanqpapwyqnfivv.supabase.co/auth/v1/callback
```

**Required Scopes**:
- `userinfo.email`
- `userinfo.profile`


