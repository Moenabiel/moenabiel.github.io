// verify-portfolio.mjs — console sweep + axe + screenshots (1440/390).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:4500/';
const axeSrc = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');

const browser = await chromium.launch({ headless: true });

for (const vp of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('response', (r) => r.status() >= 400 && errors.push(`http ${r.status()}: ${r.url()}`));

  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4200); // let typing + reveals settle

  // Scroll-through: exercise IntersectionObserver like a real reader.
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.75;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 180));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));
  });
  await page.waitForTimeout(900);

  // axe
  await page.evaluate(axeSrc);
  const res = await page.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }));
  const violations = res.violations.map((v) => `${v.id}(${v.nodes.length})`).join(', ');

  console.log(`[${vp.name}] violations: ${violations || 'NONE'}`);
  console.log(`[${vp.name}] errors: ${errors.length ? errors.join(' | ') : 'NONE'}`);

  await page.screenshot({ path: `shots/${vp.name}-fold.png` });
  await page.screenshot({ path: `shots/${vp.name}-full.png`, fullPage: true });
  await page.close();
}

await browser.close();
console.log('verification complete');
