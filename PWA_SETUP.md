# PWA Setup Instructions

This app has been configured as a Progressive Web App (PWA) for mobile devices.

## Features Added

1. **Web App Manifest** (`public/manifest.json`)
   - App name, icons, theme colors
   - Standalone display mode
   - App shortcuts

2. **Service Worker** (`public/sw.js`)
   - Offline caching
   - Faster loading on repeat visits

3. **Mobile Optimizations**
   - Viewport meta tags
   - Touch-friendly interface
   - iOS-specific optimizations
   - Safe area support for notched devices

## Required Icons

You need to create two icon files:

1. `public/icon-192.png` (192x192 pixels)
2. `public/icon-512.png` (512x512 pixels)

See `public/create-icons.md` for instructions on creating these icons.

## Testing PWA

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Preview the build**:
   ```bash
   npm run preview
   ```

3. **Test on mobile**:
   - Open the app on your mobile device
   - Look for "Add to Home Screen" prompt
   - Or manually add via browser menu

## Mobile Features

- ✅ Installable on home screen
- ✅ Works offline (cached pages)
- ✅ Fast loading
- ✅ Touch-optimized interface
- ✅ Responsive design
- ✅ Safe area support (notched devices)

## Browser Support

- ✅ Chrome/Edge (Android & Desktop)
- ✅ Safari (iOS & macOS)
- ✅ Firefox
- ✅ Samsung Internet

## Next Steps

1. Create proper app icons (see `public/create-icons.md`)
2. Test on actual mobile devices
3. Configure HTTPS (required for PWA)
4. Test offline functionality
5. Consider adding push notifications (optional)

