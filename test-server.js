const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const DIST_DIR = path.join(__dirname, 'dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);

  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback - serve index.html for all routes
        fs.readFile(path.join(DIST_DIR, 'index.html'), (fallbackErr, fallbackContent) => {
          if (fallbackErr) {
            res.writeHead(404);
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(fallbackContent, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      const headers = { 'Content-Type': contentType };

      // Add Service-Worker-Allowed header for service worker files
      if (req.url === '/service-worker.js') {
        headers['Service-Worker-Allowed'] = '/';
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      }

      // Add CORS headers for fonts and images
      if (extname === '.woff' || extname === '.woff2' || extname === '.ttf') {
        headers['Access-Control-Allow-Origin'] = '*';
      }

      res.writeHead(200, headers);
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ Local test server running at http://localhost:${PORT}`);
  console.log(`📦 Serving PWA from dist/ folder`);
  console.log(`🔍 Test PWA features in your browser`);
  console.log(`\n📋 Test Checklist:`);
  console.log(`   - Service Worker registration (check DevTools > Application > Service Workers)`);
  console.log(`   - Install prompt (Chrome: visit 3+ times, look for install icon)`);
  console.log(`   - Offline mode (DevTools > Network > Offline)`);
  console.log(`   - Timer persistence (start timer, refresh page)`);
  console.log(`   - Notifications (start session, wait for completion)`);
  console.log(`   - Focus mode (start timer, switch tabs)`);
  console.log(`\n⌨️  Press Ctrl+C to stop server`);
});
