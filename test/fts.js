// Clicks the banner's FTS button and reports whether SMAX's "External link navigation" warning appeared.
// Set OLD=1 to click without the banner's bypass (a plain link with SMAX's handler) for comparison.
const { puppeteer, BASE, TENANT, log, login, sleep } = require('/poc/common.js');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1600, height: 900 });
  try {
    if (!await login(page)) { log('login failed'); return; }
    await page.goto(`${BASE}/saw/Request/${process.env.CASE}/general?TENANTID=${TENANT}`, { waitUntil: 'networkidle2', timeout: 120000 });
    await sleep(8000);
    await page.addStyleTag({ path: '/ext/banner.css' });
    await page.addScriptTag({ path: '/ext/banner.js' });
    await sleep(4000);
    const warned = () => page.evaluate(() => /External link navigation/.test(document.body.innerText));
    // Control: a plain outside link SMAX sees (should warn)
    await page.evaluate(() => { const a = document.createElement('a'); a.id = 'ctl'; a.href = 'winscp-ftp://x:y@example.com/'; a.textContent = 'ctl'; document.querySelector('#mainView').prepend(a); });
    await page.click('#ctl'); await sleep(3000);
    await page.screenshot({ path: '/out/fts-ctl.png' });
    log('plain link -> SMAX warning: ' + await warned());
    await page.keyboard.press('Escape'); await page.reload({ waitUntil: 'networkidle2' }); await sleep(8000);
    await page.addStyleTag({ path: '/ext/banner.css' }); await page.addScriptTag({ path: '/ext/banner.js' }); await sleep(4000);
    await page.click('#otsmb .otsmb-btn'); await sleep(1500);
    await page.screenshot({ path: '/out/fts-banner.png' });
    log('banner FTS -> SMAX warning: ' + await warned() + ', url still ' + page.url().replace(/\?.*/, ''));
  } catch (e) { log('error ' + e.stack); } finally { await browser.close(); }
})();
