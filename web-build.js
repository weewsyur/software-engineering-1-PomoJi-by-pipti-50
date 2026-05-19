const fs = require('fs');
const path = require('path');

console.log('🔨 Post-build PWA optimization...');

const distPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');

// Ensure dist directory exists
if (!fs.existsSync(distPath)) {
  console.error('❌ dist directory not found. Run "expo export --platform web" first.');
  process.exit(1);
}

// Copy manifest.json to dist
const manifestSource = path.join(publicPath, 'manifest.json');
const manifestDest = path.join(distPath, 'manifest.json');

if (fs.existsSync(manifestSource)) {
  fs.copyFileSync(manifestSource, manifestDest);
  console.log('✓ Copied manifest.json to dist/');
} else {
  console.warn('⚠ manifest.json not found in public/');
}

// Copy service-worker.js to dist
const swSource = path.join(publicPath, 'service-worker.js');
const swDest = path.join(distPath, 'service-worker.js');

if (fs.existsSync(swSource)) {
  fs.copyFileSync(swSource, swDest);
  console.log('✓ Copied service-worker.js to dist/');
} else {
  console.warn('⚠ service-worker.js not found in public/');
}

// Copy offline.html to dist
const offlineSource = path.join(publicPath, 'offline.html');
const offlineDest = path.join(distPath, 'offline.html');

if (fs.existsSync(offlineSource)) {
  fs.copyFileSync(offlineSource, offlineDest);
  console.log('✓ Copied offline.html to dist/');
} else {
  console.warn('⚠ offline.html not found in public/');
}

// Copy robots.txt to dist
const robotsSource = path.join(publicPath, 'robots.txt');
const robotsDest = path.join(distPath, 'robots.txt');

if (fs.existsSync(robotsSource)) {
  fs.copyFileSync(robotsSource, robotsDest);
  console.log('✓ Copied robots.txt to dist/');
} else {
  console.warn('⚠ robots.txt not found in public/');
}

// Copy app icons to dist if they exist
const iconSizes = ['192x192', '512x512'];
iconSizes.forEach(size => {
  const iconSource = path.join(publicPath, `icon-${size}.png`);
  const iconDest = path.join(distPath, `icon-${size}.png`);
  
  if (fs.existsSync(iconSource)) {
    fs.copyFileSync(iconSource, iconDest);
    console.log(`✓ Copied icon-${size}.png to dist/`);
  }
  
  const maskableSource = path.join(publicPath, `icon-maskable-${size}.png`);
  const maskableDest = path.join(distPath, `icon-maskable-${size}.png`);
  
  if (fs.existsSync(maskableSource)) {
    fs.copyFileSync(maskableSource, maskableDest);
    console.log(`✓ Copied icon-maskable-${size}.png to dist/`);
  }
});

// Add service worker registration to index.html
const indexPath = path.join(distPath, 'index.html');
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Check if service worker registration is already present
  if (!indexContent.includes('service-worker.js')) {
    // Add service worker registration script before closing body tag
    const swScript = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/service-worker.js')
            .then(registration => console.log('✓ Service Worker registered'))
            .catch(error => console.error('✗ Service Worker registration failed:', error));
        });
      }
    </script>`;
    
    indexContent = indexContent.replace('</body>', `${swScript}</body>`);
    fs.writeFileSync(indexPath, indexContent);
    console.log('✓ Added service worker registration to index.html');
  } else {
    console.log('✓ Service worker registration already present in index.html');
  }
}

// Add manifest link to index.html if not present
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  if (!indexContent.includes('manifest.json')) {
    const manifestLink = '<link rel="manifest" href="/manifest.json" />';
    indexContent = indexContent.replace('<head>', `<head>\n    ${manifestLink}`);
    fs.writeFileSync(indexPath, indexContent);
    console.log('✓ Added manifest link to index.html');
  }
}

// Add theme-color meta tag if not present
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  if (!indexContent.includes('theme-color')) {
    const themeColor = '<meta name="theme-color" content="#ef4444" />';
    indexContent = indexContent.replace('<head>', `<head>\n    ${themeColor}`);
    fs.writeFileSync(indexPath, indexContent);
    console.log('✓ Added theme-color meta tag to index.html');
  }
}

console.log('✅ PWA build optimization complete!');
console.log('📦 Ready for Firebase Hosting deployment');
