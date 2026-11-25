// One-off codemod: migrate all hardcoded fontFamily references to
// Bricolage Grotesque per-weight family names.
// Weight resolution: sibling fontWeight in the same style object wins;
// otherwise the weight implied by the old family name is used.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIRS = ['app', 'components'];

const TOKENS = [
  'Figtree_400Regular',
  'Figtree_500Medium',
  'Figtree_600SemiBold',
  'BricolageGrotesque_700Bold',
];
const IMPLIED = {
  Figtree_400Regular: 400,
  Figtree_500Medium: 500,
  Figtree_600SemiBold: 600,
  BricolageGrotesque_700Bold: 700,
};
const NAMES = {
  200: 'ExtraLight',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
};
const familyFor = (w) => `BricolageGrotesque_${w}${NAMES[w]}`;

const TOKEN_RE = new RegExp(
  `fontFamily:\\s*(["'])(${TOKENS.join('|')})\\1`,
  'g'
);
const WEIGHT_RE = /fontWeight:\s*['"]?(\d{3})['"]?/;

function findObjectRange(src, idx) {
  let depth = 0;
  let start = -1;
  for (let i = idx - 1; i >= 0; i--) {
    const c = src[i];
    if (c === '}') depth++;
    else if (c === '{') {
      if (depth === 0) {
        start = i;
        break;
      }
      depth--;
    }
  }
  if (start === -1) return null;
  depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return [start, i];
    }
  }
  return null;
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(entry.name)) yield p;
  }
}

let filesChanged = 0;
let replacements = 0;
const unmapped = new Set();

for (const dir of DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    const src = fs.readFileSync(file, 'utf8');
    if (!TOKENS.some((t) => src.includes(t))) continue;

    let out = '';
    let last = 0;
    let changed = false;
    TOKEN_RE.lastIndex = 0;
    let m;
    while ((m = TOKEN_RE.exec(src)) !== null) {
      const token = m[2];
      const range = findObjectRange(src, m.index);
      let weight = IMPLIED[token];
      let hasWeight = false;
      if (range) {
        const objText = src.slice(range[0], range[1] + 1);
        const wm = WEIGHT_RE.exec(objText);
        if (wm) {
          weight = parseInt(wm[1], 10);
          hasWeight = true;
        }
      }
      if (!NAMES[weight]) {
        unmapped.add(`${weight} in ${path.relative(ROOT, file)}`);
        weight = IMPLIED[token];
      }
      const newFamily = familyFor(weight);
      const prefix = hasWeight ? '' : `fontWeight: "${weight}", `;
      out += src.slice(last, m.index) + `${prefix}fontFamily: ${m[1]}${newFamily}${m[1]}`;
      last = m.index + m[0].length;
      replacements++;
      changed = true;
    }
    if (changed) {
      out += src.slice(last);
      fs.writeFileSync(file, out);
      filesChanged++;
      console.log(`updated ${path.relative(ROOT, file)}`);
    }
  }
}

console.log(`\n${replacements} replacements across ${filesChanged} files`);
if (unmapped.size) {
  console.log('UNMAPPED WEIGHTS:', [...unmapped].join(', '));
}
