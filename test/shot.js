// Loads a real SMAX case page with the banner's CSS and JS injected, and takes screenshots (they hold real case data:
// /out is outside git). Run from the otsm-banner repo, see test/README.md.
const { puppeteer, BASE, TENANT, log, login, sleep } = require('/poc/common.js');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  page.on('console', m => { if (/otsmb|error/i.test(m.text())) log('console: ' + m.text()); });
  page.on('pageerror', e => log('pageerror: ' + e.message));
  try {
    log('chrome ' + await browser.version());
    if (!await login(page)) { log('login failed'); return; }
    await page.goto(`${BASE}/saw/Request/${process.env.CASE}/general?TENANTID=${TENANT}`, { waitUntil: 'networkidle2', timeout: 120000 });
    await sleep(8000);
    await page.addStyleTag({ path: '/ext/banner.css' });
    await page.addScriptTag({ path: '/ext/banner.js' });
    await sleep(4000);
    await page.screenshot({ path: '/out/1-banner.png' });
    log('banner text: ' + await page.$eval('#otsmb', n => n.innerText.replace(/\s+/g, ' ')).catch(e => 'none'));
    await page.hover('#otsmb .otsmb-name'); await sleep(2500);
    await page.screenshot({ path: '/out/2-person.png' });
    const names = await page.$$('#otsmb .otsmb-name'); await page.mouse.move(5, 300); await sleep(600);
    await names[1].click(); await sleep(2500);
    await page.screenshot({ path: '/out/3-company.png' });
    const icons = await page.$$('#otsmb .otsmb-icon[title]');
    const byTitle = async t => { for (const i of icons) if (await i.evaluate(n => n.title) === t) return i; };
    await (await byTitle("Customer's other cases")).click(); await sleep(3000);
    await page.screenshot({ path: '/out/4-cases.png' });
    await page.click('.otsmb-tabs button:nth-child(2)'); await sleep(3000);
    await page.screenshot({ path: '/out/5-cases-account.png' });
    await page.mouse.click(5, 500); await sleep(300);
    await (await byTitle("Account's entitlements")).click(); await sleep(3000);
    await page.screenshot({ path: '/out/6-ents.png' });
    log('ents rows: ' + await page.$$eval('.otsmb-float tr', rs => rs.map(r => [...r.cells].map(c => c.innerText.replace(/\n/g, ' / ')).join(' | ')).join('\n')));
    log('float box: ' + await page.$eval('.otsmb-float', n => JSON.stringify(n.getBoundingClientRect())));
    await page.mouse.click(5, 500); await page.evaluate(() => window.scrollTo(0, 1200)); await sleep(2500);
    await page.screenshot({ path: '/out/7-scrolled.png' });
    log('winscp: ' + await page.$eval('#otsmb .otsmb-btn', n => n.href.replace(/:[^:@/]*@/, ':***@')).catch(() => 'none'));
  } catch (e) { log('error ' + e.stack); await page.screenshot({ path: '/out/error.png' }).catch(() => {}); }
  finally { await browser.close(); }
})();
