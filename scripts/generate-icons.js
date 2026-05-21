#!/usr/bin/env node

/**
 * Icon Generation Script
 * 
 * Generates all required icon sizes from a source image for:
 * - Web (PWA): 192x192, 512x512 (regular and maskable variants)
 * - Native (iOS/Android): 192x192, 1024x1024, and more
 * 
 * Usage:
 *   npm run generate-icons
 *   npm run generate-icons -- --source=path/to/source-icon.png
 * 
 * Defaults to `assets/images/icon-source.png` if not specified.
 */

const fs = require('fs');
const path = require('path');

// Try to import sharp; provide helpful error message if not installed
let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  console.error(
    '❌ sharp is not installed. Please run:\n' +
    '   npm install --save-dev sharp\n' +
    'Then run generate-icons again.'
  );
  process.exit(1);
}

const args = process.argv.slice(2);
let sourceImagePath = path.join(__dirname, '../assets/images/icon-source.png');

// Parse --source argument
const sourceArg = args.find(arg => arg.startsWith('--source='));
if (sourceArg) {
  sourceImagePath = sourceArg.replace('--source=', '');
  if (!path.isAbsolute(sourceImagePath)) {
    sourceImagePath = path.resolve(process.cwd(), sourceImagePath);
  }
}

const projectRoot = path.join(__dirname, '..');

// Define icon generation tasks: [output_path, size, is_maskable]
const iconTasks = [
  // Web/PWA icons (goes to public/)
  [path.join(projectRoot, 'public', 'icon-192x192.png'), 192, false],
  [path.join(projectRoot, 'public', 'icon-512x512.png'), 512, false],
  [path.join(projectRoot, 'public', 'icon-maskable-192x192.png'), 192, true],
  [path.join(projectRoot, 'public', 'icon-maskable-512x512.png'), 512, true],
  
  // Native app icons (goes to assets/images/)
  [path.join(projectRoot, 'assets', 'images', 'icon-192x192.png'), 192, false],
  [path.join(projectRoot, 'assets', 'images', 'icon-512x512.png'), 512, false],
  [path.join(projectRoot, 'assets', 'images', 'icon-1024x1024.png'), 1024, false],
  
  // Splash screen (iOS/Android)
  [path.join(projectRoot, 'assets', 'images', 'splash.png'), 1200, false],
  
  // Icon for app.json (main icon reference)
  [path.join(projectRoot, 'assets', 'images', 'POMOJI.png'), 512, false],
];

async function generateIcons() {
  try {
    // Check if source exists
    if (!fs.existsSync(sourceImagePath)) {
      console.error(`❌ Source image not found: ${sourceImagePath}`);
      console.error(
        'Please provide a high-resolution icon (1024x1024 or larger) at:\n' +
        `   ${sourceImagePath}\n` +
        'Or specify a different source with:\n' +
        '   npm run generate-icons -- --source=path/to/your/icon.png'
      );
      process.exit(1);
    }

    console.log(`📦 Generating icons from: ${sourceImagePath}\n`);

    // Ensure all output directories exist
    const dirs = new Set(iconTasks.map(([outputPath]) => path.dirname(outputPath)));
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Generate each icon
    let completed = 0;
    for (const [outputPath, size, isMaskable] of iconTasks) {
      try {
        let pipeline = sharp(sourceImagePath)
          .resize(size, size, {
            fit: 'cover',
            position: 'center',
          });

        // For maskable icons, apply a slightly different style
        // (though most SVG icons work fine; this is optional enhancement)
        if (isMaskable) {
          // Keep full size for maskable (no padding), as the system handles clipping
          // Just ensure it's square
        }

        await pipeline.png().toFile(outputPath);

        const relativePath = path.relative(projectRoot, outputPath);
        const purposeLabel = isMaskable ? '🎨 (maskable)' : '🖼️ (regular)';
        console.log(`✅ ${relativePath} ${size}x${size} ${purposeLabel}`);
        completed++;
      } catch (error) {
        console.error(`❌ Failed to generate ${path.relative(projectRoot, outputPath)}: ${error.message}`);
      }
    }

    console.log(`\n✨ Icon generation complete! Generated ${completed}/${iconTasks.length} icons.`);

    // Print next steps
    console.log('\n📝 Next steps:');
    console.log('1. Review generated icons in public/ and assets/images/');
    console.log('2. Run: npm install');
    console.log('3. Run: npm run start  (to test on native/web)');
    console.log('4. Run: npm run build:web  (to build web version)');

  } catch (error) {
    console.error('❌ Icon generation failed:', error);
    process.exit(1);
  }
}

generateIcons();
