# PWA Icons for Lumina

## Required Icon Sizes

The following icon files are referenced by `manifest.json` and need to be created:

- `icon-72.png` - 72x72px
- `icon-96.png` - 96x96px
- `icon-128.png` - 128x128px
- `icon-144.png` - 144x144px
- `icon-152.png` - 152x152px
- `icon-192.png` - 192x192px
- `icon-384.png` - 384x384px
- `icon-512.png` - 512x512px

## Design Guidelines

**Brand Colors:**
- Primary: `#4F46E5` (Indigo 600)
- Background: `#F8FAFC` (Slate 50)

**Icon Design:**
- Simple, recognizable logo/symbol
- Works well at small sizes (72px)
- High contrast for visibility
- Can be the Lumina "L" lettermark or a sun/light symbol

## Quick Generation Using ImageMagick

If you have ImageMagick installed, you can generate placeholder icons:

```bash
cd /home/hcfdc/Desktop/Lumina/frontend/public

# Create a simple gradient placeholder (replace with actual logo)
convert -size 512x512 \
  -define gradient:angle=135 \
  gradient:'#4F46E5'-'#818CF8' \
  -gravity center \
  -pointsize 280 \
  -fill white \
  -annotate +0+0 'L' \
  icon-512.png

# Generate other sizes
convert icon-512.png -resize 384x384 icon-384.png
convert icon-512.png -resize 192x192 icon-192.png
convert icon-512.png -resize 152x152 icon-152.png
convert icon-512.png -resize 144x144 icon-144.png
convert icon-512.png -resize 128x128 icon-128.png
convert icon-512.png -resize 96x96 icon-96.png
convert icon-512.png -resize 72x72 icon-72.png
```

## Alternative: Online Icon Generators

1. **PWA Asset Generator**: https://www.pwabuilder.com/imageGenerator
   - Upload a 512x512 source image
   - Generates all required sizes

2. **RealFaviconGenerator**: https://realfavicongenerator.net/
   - Comprehensive favicon and PWA icon generator

3. **Favicon.io**: https://favicon.io/
   - Simple text-to-icon generator

## For Production

Create a professional icon with:
- Vector graphics software (Figma, Illustrator, Inkscape)
- Export at 512x512 with transparent background
- Use icon generator to create all sizes
- Test on actual devices (iOS, Android)

## Temporary Placeholder

For development, you can:
1. Copy any existing icon/logo to `icon-512.png`
2. Use ImageMagick to resize to all required sizes
3. Replace with professional icons before v1.0 release
