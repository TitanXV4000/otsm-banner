// Lists SMAX's fixed/absolute top-level layout elements on a case page (no banner), to place the banner.
const { puppeteer, BASE, TENANT, log, login, sleep } = require('/poc/common.js');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1600, height: 900 });
  try {
    if (!await login(page)) { log('login failed'); return; }
    await page.goto(`${BASE}/saw/Request/${process.env.CASE}/general?TENANTID=${TENANT}`, { waitUntil: 'networkidle2', timeout: 120000 });
    await sleep(8000);
    await page.screenshot({ path: '/out/0-plain.png' });
    await page.evaluate(() => window.scrollTo(0, 1200)); await sleep(2500);
    await page.screenshot({ path: '/out/0-scrolled.png' });
    const info = await page.evaluate(() => {
      const d = n => { const r = n.getBoundingClientRect(), s = getComputedStyle(n); return `${n.tagName.toLowerCase()}${n.id ? '#' + n.id : ''}${n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.') : ''} pos=${s.position} top=${s.top} rect=${Math.round(r.top)},${Math.round(r.left)} ${Math.round(r.width)}x${Math.round(r.height)} ov=${s.overflow}`; };
      const fixed = [...document.querySelectorAll('body *')].filter(n => ['fixed','sticky'].includes(getComputedStyle(n).position) && n.getBoundingClientRect().height > 0).map(d);
      const out = ['FIXED:', ...fixed, 'html ' + getComputedStyle(document.documentElement).overflow, 'body ' + d(document.body)];
      for (const c of document.body.children) out.push(' ' + d(c));
      const chain = []; let n = document.elementFromPoint(800, 20); while (n && n !== document.body) { chain.push(d(n)); n = n.parentElement; }
      out.push('AT 800,20:', ...chain.slice(-6));
      const chain2 = []; n = document.elementFromPoint(800, 400); while (n && n !== document.body) { chain2.push(d(n)); n = n.parentElement; }
      out.push('AT 800,400:', ...chain2.slice(-6));
      return out.join('\n');
    });
    console.log(info);
  } catch (e) { log('error ' + e.stack); } finally { await browser.close(); }
})();
