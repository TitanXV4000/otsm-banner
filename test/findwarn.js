// Searches SMAX's loaded JavaScript for the "External link navigation" warning code and prints the surrounding code.
const { puppeteer, BASE, TENANT, log, login, sleep } = require('/poc/common.js');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  const bodies = [];
  page.on('response', async r => { try { const u = r.url(); if (/\.js(\?|$)|json/.test(u) || (r.headers()['content-type'] || '').includes('javascript')) bodies.push({ u, t: await r.text() }); } catch (e) {} });
  try {
    if (!await login(page)) { log('login failed'); return; }
    await page.goto(`${BASE}/saw/Request/${process.env.CASE}/general?TENANTID=${TENANT}`, { waitUntil: 'networkidle2', timeout: 120000 });
    await sleep(8000);
    log('scripts ' + bodies.length);
    for (const b of bodies) {
      const i = b.t.indexOf('function O(){$(document.body).bind("click auxclick"');
      if (i >= 0) console.log(b.t.slice(i, i + 1800));
      const j = b.t.indexOf('S=');
    }
  } catch (e) { log('error ' + e.stack); } finally { await browser.close(); }
})();
