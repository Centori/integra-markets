// Load the local built bundle in headless Chrome, catch the useState error,
// then use the source map to decode the ACTUAL file/line where it happens.

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function main() {
  // Find the main (bigger) bundle file
  const jsDir = 'dist/_expo/static/js/web';
  const jsFiles = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'));
  const mainBundle = jsFiles.map((f) => ({
    f,
    size: fs.statSync(path.join(jsDir, f)).size,
  })).sort((a, b) => b.size - a.size)[0].f;

  const mapFile = path.join(jsDir, mainBundle + '.map');
  if (!fs.existsSync(mapFile)) {
    console.log('No .map for', mainBundle);
    return;
  }

  console.log('main bundle:', mainBundle);

  // Load the map
  const rawMap = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  const { SourceMapConsumer } = require('source-map');
  const consumer = await new SourceMapConsumer(rawMap);

  // Fetch the actual live page & catch pageerror stack
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const stackTraces = [];
  page.on('pageerror', (err) => stackTraces.push({ msg: err.message, stack: err.stack }));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && msg.text().includes('useState')) {
      stackTraces.push({ msg: msg.text(), stackHint: 'from console.error' });
    }
  });

  await page.goto('https://www.integramarkets.app/', { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 3000));

  await browser.close();

  console.log('--- captured errors ---');
  for (const t of stackTraces) console.log(JSON.stringify(t, null, 2));

  // Also parse the LIVE bundle for the useState error's calling location
  // by pattern-matching against the map
  const livePath = 'https://www.integramarkets.app/_expo/static/js/web/';

  // The last error we saw was at line 485:813 in the minified live bundle,
  // but our local bundle may have different line numbering. Let's search
  // our local source map for entries pointing to lines that call useState
  // at module scope.
  const sources = rawMap.sources || [];
  console.log('\ntop 10 sources in map (largest chunks):');
  console.log(sources.slice(0, 30).join('\n'));

  consumer.destroy();
}

main().catch((e) => {
  console.error('decode-crash error:', e);
});
