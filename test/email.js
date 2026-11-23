// Opens a case's Discussions, injects the banner, clicks the first "Show email" (a long customer email's .eml) and reports
// what it shows; screenshots before and after "Show quoted text". Read-only. CASE=<case with an "Email Attachment" comment>
const { puppeteer, BASE, TENANT, log, login, sleep } = require('/poc/common.js');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1600, height: 1000 });
  page.on('console', m => { if (/error|refused|violat/i.test(m.text())) log('console: ' + m.text().slice(0, 200)); });
  page.on('pageerror', e => log('pageerror: ' + e.message));
  try {
    if (!await login(page)) { log('login failed'); return; }
    await page.goto(`${BASE}/saw/Request/${process.env.CASE}/discussions?TENANTID=${TENANT}`, { waitUntil: 'networkidle2', timeout: 120000 });
    await sleep(8000);
    await page.addStyleTag({ path: '/ext/banner.css' });
    await page.addScriptTag({ path: '/ext/settings.js' });
    await page.addScriptTag({ path: '/ext/banner.js' });
    await sleep(3000);
    const n = await page.$$eval('.otsmb-mailbtn', b => b.length);
    log(`Show email buttons: ${n}`);
    if (!n) return;
    await page.evaluate(() => { const b = document.querySelector('.otsmb-mailbtn'); b.scrollIntoView({ block: 'start' }); b.click(); });
    await sleep(5000);
    const report = () => page.evaluate(() => {
      const box = document.querySelector('.otsmb-mail'), f = box && box.querySelector('iframe'), d = f && f.contentDocument;
      return { error: box && box.querySelector('.otsmb-err') ? box.textContent : '', heads: box ? [...box.querySelectorAll('.otsmb-mailhead th')].map(t => t.textContent) : [],
        files: box && box.querySelector('.otsmb-mailfiles') ? box.querySelectorAll('.otsmb-mailfiles a').length : 0,
        frameHeight: f && f.style.height, bodyChars: d && d.body ? d.body.innerText.length : null,
        images: d ? d.querySelectorAll('img[src^="data:"]').length : 0, imagesNoSrc: d ? d.querySelectorAll('img:not([src])').length : 0,
        quotedButton: !!(box && box.querySelector('.otsmb-mailquote')), quotedChars: d && d.getElementById('otsmb-quoted') ? d.getElementById('otsmb-quoted').textContent.length : 0,
        scripts: d ? d.querySelectorAll('script').length : 0 };
    });
    log('shown: ' + JSON.stringify(await report()));
    await page.screenshot({ path: '/out/email-1.png' });
    const boxEl = await page.$('.otsmb-mail'); await boxEl.screenshot({ path: '/out/email-box.png' });
    const q = await page.$('.otsmb-mailquote');
    if (q) {
      await q.click(); await sleep(1500);
      log('quoted open: ' + JSON.stringify(await report()));
      await page.screenshot({ path: '/out/email-2.png' });
    }
    await page.click('.otsmb-mailbtn'); await sleep(500);
    log('after Hide email, box hidden: ' + await page.$eval('.otsmb-mail', b => b.hidden));
  } catch (e) { log('error ' + e.stack); } finally { await browser.close(); }
})();
