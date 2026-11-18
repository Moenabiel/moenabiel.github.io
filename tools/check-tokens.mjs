/* check-tokens.mjs — SUPER-STRICT token law.
   No hex/rgb color literals anywhere in src/ outside tokens.css.
   Reused from quality-house-v4's law. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const TOKENS = join(ROOT, 'src/styles/tokens.css');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.astro' || name === 'tools') continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(join(ROOT, 'src')).filter((f) => /\.(astro|ts|tsx|js|mjs|css|md|json)$/.test(f));
const allowed = new Set([TOKENS]);

const violations = [];
for (const f of files) {
  if (allowed.has(f)) continue;
  const text = readFileSync(f, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (/#([0-9a-fA-F]{3,8})\b/.test(line) || /rgba?\(/i.test(line) || /hsla?\(/i.test(line)) {
      violations.push(`${relative(ROOT, f)}:${i + 1}  ${line.trim().slice(0, 90)}`);
    }
  });
}

if (violations.length) {
  console.error('❌ TOKEN LAW VIOLATIONS:');
  violations.forEach((v) => console.error('  ' + v));
  process.exit(1);
} else {
  console.log('✅ TOKEN LAW: PASS — no color literals outside tokens.css (' + files.length + ' files scanned)');
}
