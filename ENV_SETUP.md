# Environment Variables Setup for Production

## Required Environment Variables

Your app needs these environment variables to work with Supabase:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## How to Set Environment Variables

### Netlify
1. Go to Site settings → Environment variables
2. Add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
3. Redeploy your site

### Vercel
1. Go to Project Settings → Environment Variables
2. Add:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
3. Redeploy your site

### Other Platforms
Set these as environment variables in your hosting platform's dashboard.

## Finding Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Click on Settings → API
3. Copy:
   - **Project URL** → use as `VITE_SUPABASE_URL`
   - **anon/public key** → use as `VITE_SUPABASE_ANON_KEY`

## Important Notes

- ⚠️ **Never commit `.env` files to git** - they contain sensitive keys
- ✅ Environment variables starting with `VITE_` are exposed to the browser
- ✅ The anon key is safe to expose (it's public)
- ⚠️ Never expose your service role key

## Testing

After setting environment variables:
1. Rebuild: `npm run build`
2. Deploy
3. Check browser console for any errors
4. Verify Supabase connection works

## Troubleshooting

If you see 404 errors:
1. Check environment variables are set correctly
2. Verify Supabase project is active
3. Check browser console for detailed error messages
4. Verify CORS is enabled in Supabase (should be by default)








