// Simple script to generate PWA icons
// This creates basic placeholder icons for PWA
// For production, replace with actual app icons

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple SVG icon (purple circle with "E" for ExpenseTrack)
const createSVGIcon = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#6b21a8"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.5}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">E</text>
</svg>`;

const publicDir = path.join(__dirname, '..', 'public');

async function generateIcons() {
  try {
    // Create SVG content
    const svg192 = createSVGIcon(192);
    const svg512 = createSVGIcon(512);
    
    // Convert SVG to PNG
    await sharp(Buffer.from(svg192))
      .png()
      .toFile(path.join(publicDir, 'icon-192.png'));
    
    await sharp(Buffer.from(svg512))
      .png()
      .toFile(path.join(publicDir, 'icon-512.png'));
    
    console.log('✅ PWA icons generated successfully!');
    console.log('   - icon-192.png (192x192)');
    console.log('   - icon-512.png (512x512)');
  } catch (error) {
    console.error('Error generating icons:', error);
    console.log('\nFallback: Creating SVG icons instead...');
    
    // Fallback to SVG
    const svg192 = createSVGIcon(192);
    const svg512 = createSVGIcon(512);
    fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), svg192);
    fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), svg512);
    
    console.log('SVG icons created. Please convert to PNG for PWA:');
    console.log('   - Use https://www.pwabuilder.com/imageGenerator');
    console.log('   - Or use an image editor to create PNG versions');
  }
}

generateIcons();
