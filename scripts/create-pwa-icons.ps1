# PowerShell script to create PWA icons from favicon
# Run this from the project root: .\scripts\create-pwa-icons.ps1

$publicDir = "public"
$favicon = Join-Path $publicDir "favicon.ico"

if (Test-Path $favicon) {
    Write-Host "Creating PWA icons from favicon..."
    
    # Note: This creates placeholder icons
    # For production, you should create proper 192x192 and 512x512 PNG icons
    Copy-Item $favicon (Join-Path $publicDir "icon-192.png") -Force
    Copy-Item $favicon (Join-Path $publicDir "icon-512.png") -Force
    
    Write-Host "✓ Icons created (using favicon as placeholder)"
    Write-Host "⚠ For production, create proper PNG icons:"
    Write-Host "  - public/icon-192.png (192x192 pixels)"
    Write-Host "  - public/icon-512.png (512x512 pixels)"
} else {
    Write-Host "⚠ Favicon not found. Please create icons manually."
    Write-Host "See public/create-icons.md for instructions"
}

