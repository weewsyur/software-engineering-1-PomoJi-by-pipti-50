// downloads Open Sans font files (400,600,700) by fetching Google Fonts CSS
// and downloading linked font files into assets/fonts/
// Usage: node scripts/download-open-sans.js

const https = require('https');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'assets', 'fonts');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const cssUrl = 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap';

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
      })
      .on('error', reject);
  });
}

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error('Failed to download ' + url + ' status: ' + res.statusCode));
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

(async () => {
  console.log('Fetching CSS from Google Fonts...');
  try {
    const res = await fetch(cssUrl);
    if (!res || !res.body) throw new Error('No CSS response');

    const css = res.body;
    // parse src: url(...) format
    const urlRegex = /url\((https:\/\/[^)]+)\) format\('woff2'\)/g;
    const urls = new Set();
    let match;
    while ((match = urlRegex.exec(css)) !== null) {
      urls.add(match[1]);
    }

    if (urls.size === 0) {
      console.error('No font URLs found in CSS. The Google Fonts CSS may have changed.');
      console.error('You can manually download fonts from https://fonts.google.com/specimen/Open+Sans');
      process.exit(1);
    }

    console.log('Found', urls.size, 'font files. Downloading...');
    let i = 0;
    for (const url of urls) {
      i++;
      try {
        const parsed = new URL(url);
        const filename = path.basename(parsed.pathname.split('?')[0]);
        const dest = path.join(outDir, filename + '.woff2');
        console.log(`[${i}/${urls.size}] Downloading ${filename} -> ${dest}`);
        await download(url, dest);
      } catch (err) {
        console.error('Failed to download', url, err.message || err);
      }
    }

    console.log('Done. Font files saved to', outDir);
    console.log('Next: reference these files with expo-font or move/rename them to OpenSans-*.woff2 as you prefer.');
  } catch (err) {
    console.error('Failed to fetch or download fonts:', err.message || err);
    process.exit(1);
  }
})();
