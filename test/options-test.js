// Opens the Options page from the extension folder (no extension APIs: defaults, saving is a no-op), ticks Product,
// moves it up with the arrow, drags Created to the top, picks Light colours, and takes screenshots.
const puppeteer = require('/usr/src/apps/smexporter/node_modules/puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1100, height: 1300 });
  page.on('pageerror', e => console.log('pageerror: ' + e.message));
  await page.goto('file:///ext/options.html'); await sleep(500);
  await page.screenshot({ path: '/out/opt-1.png', fullPage: true });
  const order = () => page.$$eval('#fields li label span:first-of-type', n => n.map(x => x.textContent + (x.closest('li').classList.contains('off') ? '(off)' : '')).join(', '));
  console.log('start:   ' + await order());
  const idx = async name => (await page.$$eval('#fields li label span:first-of-type', n => n.map(x => x.textContent))).indexOf(name);
  await (await page.$$('#fields li input[type=checkbox]'))[await idx('Product')].click();
  await (await page.$$('#fields li'))[await idx('Product')].$eval('button[title="Move up"]', b => b.click());
  console.log('product: ' + await order());
  // drag Created onto Case
  const from = (await page.$$('#fields li'))[await idx('Created')], to = (await page.$$('#fields li'))[0];
  await page.evaluate((a, b) => { const dt = new DataTransfer(); const ev = (t, n) => n.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt }));
    ev('dragstart', a); ev('dragover', b); ev('drop', b); ev('dragend', a); }, from, to);
  console.log('dragged: ' + await order());
  await page.click('input[name=colors]:nth-of-type(1)');
  const labels = await page.$$('#colors label'); await labels[1].click();
  await page.click('#fts label:nth-child(3)');
  console.log('preview: ' + await page.$eval('#otsmb', n => n.innerText.replace(/\s+/g, ' ') + ' bg=' + getComputedStyle(n).backgroundColor));
  await page.screenshot({ path: '/out/opt-2.png', fullPage: true });
  await browser.close();
})();
