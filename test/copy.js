// Read-only: the title copy in both formats and the copy buttons after phone numbers and emails in the contact and
// owner cards. navigator.clipboard.writeText is stubbed to record what would be copied; logs mask real contact data.
const { puppeteer, BASE, TENANT, log, login, sleep } = require('/poc/common.js');
const mask = s => String(s).replace(/[A-Za-z0-9]/g, (c, i) => i < 2 ? c : (/\d/.test(c) ? '9' : 'x'));
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1600, height: 900 });
  page.on('pageerror', e => log('pageerror: ' + e.message));
  const inject = async settings => {
    await page.goto(`${BASE}/saw/Request/${process.env.CASE}/general?TENANTID=${TENANT}`, { waitUntil: 'networkidle2', timeout: 120000 });
    await sleep(6000);
    await page.evaluate(j => { window.OTSMB_TEST_SETTINGS = j; window.copied = []; navigator.clipboard.writeText = t => { window.copied.push(t); return Promise.resolve(); }; }, settings);
    await page.addStyleTag({ path: '/ext/banner.css' }); await page.addScriptTag({ path: '/ext/settings.js' }); await page.addScriptTag({ path: '/ext/banner.js' });
    await sleep(4000);
  };
  const last = () => page.evaluate(() => window.copied[window.copied.length - 1]);
  try {
    if (!await login(page)) { log('login failed'); return; }
    for (const fmt of ['dash', 'email']) {
      await inject({ titleCopy: fmt });
      await page.click('#otsmb .otsmb-title'); await sleep(300);
      const t = await last(), title = await page.$eval('#otsmb .otsmb-title', n => n.title.split('\n')[0]);
      log(`${fmt}: copied "${t.replace(title, '<title>')}" (title intact: ${t.endsWith(title)}); tooltip: ${await page.$eval('#otsmb .otsmb-title', n => n.title.split('\n').pop())}`);
    }
    const names = await page.$$('#otsmb .otsmb-name');
    for (const [i, which] of [[0, 'owner'], [1, 'contact'], [2, 'account']]) {
      if (i < 0) continue;
      await page.mouse.click(5, 600); await sleep(300);
      await names[i].click(); await sleep(3000);
      const rows = await page.$$eval('.otsmb-float .otsmb-tel', s => s.map(x => ({ text: x.querySelector('a').textContent, btn: !!x.querySelector('.otsmb-copybtn'), title: (x.querySelector('.otsmb-copybtn') || {}).title })));
      log(`${which} card: ${rows.length} phone/email entries: ` + rows.map(r => `${mask(r.text)} [${r.btn ? r.title : 'NO BUTTON'}]`).join(', '));
      const btns = await page.$$('.otsmb-float .otsmb-copybtn');
      for (const [k, b] of btns.entries()) {
        await b.click(); await sleep(200);
        const tick = await b.evaluate(n => n.classList.contains('otsmb-done'));
        log(`  button ${k}: copied matches shown text: ${await last() === rows[k].text}, tick: ${tick}, card still open: ${!!await page.$('.otsmb-float')}`);
      }
      await page.screenshot({ path: `/out/copy-${which}.png` });
    }
    log('names on banner: ' + names.length);
  } catch (e) { log('error ' + e.stack); } finally { await browser.close(); }
})();
