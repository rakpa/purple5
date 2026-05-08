# Creating PWA Icons

To create the required PWA icons, you can:

1. **Use an online tool**: Visit https://www.pwabuilder.com/imageGenerator
   - Upload a 512x512 PNG image
   - Download the generated icons

2. **Use ImageMagick** (if installed):
   ```bash
   # Create 192x192 icon
   convert your-icon.png -resize 192x192 public/icon-192.png
   
   # Create 512x512 icon
   convert your-icon.png -resize 512x512 public/icon-512.png
   ```

3. **Use any image editor**:
   - Create a 192x192 PNG and save as `public/icon-192.png`
   - Create a 512x512 PNG and save as `public/icon-512.png`

For now, you can use the existing favicon.ico as a placeholder by copying it:
- Copy `public/favicon.ico` to `public/icon-192.png`
- Copy `public/favicon.ico` to `public/icon-512.png`

Note: These are placeholders. For production, create proper app icons.

