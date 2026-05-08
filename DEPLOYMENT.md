# Deployment Configuration for SPA

This React app uses client-side routing. The server must be configured to serve `index.html` for all routes.

## Server Configuration

### Netlify
- The `public/_redirects` file is already configured
- No additional setup needed

### Vercel
- The `public/vercel.json` file is already configured
- No additional setup needed

### Apache (.htaccess)
Create a `.htaccess` file in the `dist` folder after build:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### Nginx
Add to your nginx config:
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### Cloudflare Pages
- Go to Settings → Functions
- Add a `_redirects` file or configure in dashboard:
  - Source: `/*`
  - Destination: `/index.html`
  - Status: `200`

### AWS S3 + CloudFront
1. Configure S3 bucket for static website hosting
2. Set error document to `index.html`
3. In CloudFront, create a custom error response:
   - HTTP Error Code: `403`
   - Response Page Path: `/index.html`
   - HTTP Response Code: `200`

## Build Command
```bash
npm run build
```

The built files will be in the `dist` folder.

## Service Worker
The service worker has been updated to properly handle SPA routing:
- Navigation requests always serve `index.html`
- Static assets are cached properly
- Works offline after first visit

## Testing
After deployment:
1. Visit your domain
2. Navigate to different routes (e.g., `/dashboard`, `/categories`)
3. Refresh the page on any route - it should work
4. Test offline functionality

