// Read-only: opens the banner's other-cases popup on both tabs and reports the columns and how many rows have a product.
const { puppeteer, BASE, TENANT, log, login, sleep } = require('/poc/common.js');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1600, height: 900 });
  page.on('pageerror', e => log('pageerror: ' + e.message));
  try {
    if (!await login(page)) { log('login failed'); return; }
    await page.goto(`${BASE}/saw/Request/${process.env.CASE}/general?TENANTID=${TENANT}`, { waitUntil: 'networkidle2', timeout: 120000 });
    await sleep(6000);
    await page.addStyleTag({ path: '/ext/banner.css' }); await page.addScriptTag({ path: '/ext/settings.js' }); await page.addScriptTag({ path: '/ext/banner.js' });
    await sleep(4000);
    await page.click('#otsmb .otsmb-icon[title="Contact\'s other cases"]'); await sleep(3000);
    const report = () => page.evaluate(() => {
      const t = document.querySelector('.otsmb-float table'); if (!t) return document.querySelector('.otsmb-float').innerText.slice(0, 200);
      const head = [...t.querySelectorAll('th')].map(h => h.textContent), i = head.indexOf('Product'), rows = [...t.querySelectorAll('tbody tr')];
      return `columns: ${head.join(', ')}; rows ${rows.length}, with product ${rows.filter(r => r.cells[i] && r.cells[i].textContent.trim()).length}; box ${Math.round(document.querySelector('.otsmb-float').getBoundingClientRect().width)}px wide`;
    });
    log('contact tab: ' + await report());
    await page.screenshot({ path: '/out/cases-contact.png' });
    await page.click('.otsmb-tabs button:nth-child(2)'); await sleep(3000);
    log('account tab: ' + await report());
    await page.screenshot({ path: '/out/cases-account.png' });
  } catch (e) { log('error ' + e.stack); } finally { await browser.close(); }
})();
