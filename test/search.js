// Case list: clicks the header's search (magnifier) with no banner, then with the banner shown on the list
// (one row selected), screenshots each and lists the fixed/absolute elements the search opens. Read-only.
const { puppeteer, BASE, TENANT, log, login, sleep } = require('/poc/common.js');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1500, height: 700 });
  const open = async () => {
    await page.goto(`${BASE}/saw/Requests?TENANTID=${TENANT}`, { waitUntil: 'networkidle2', timeout: 120000 });
    await page.waitForSelector('.slick-row', { timeout: 60000 }); await sleep(3000);
  };
  const describe = () => page.evaluate(() => {
    const d = n => { const r = n.getBoundingClientRect(), s = getComputedStyle(n); return `${n.tagName.toLowerCase()}${n.id ? '#' + n.id : ''}.${(typeof n.className === 'string' ? n.className : '').trim().split(/\s+/).slice(0, 4).join('.')} pos=${s.position} top=${s.top} rect=${Math.round(r.top)},${Math.round(r.left)} ${Math.round(r.width)}x${Math.round(r.height)}`; };
    const inp = [...document.querySelectorAll('input')].filter(i => /search/i.test(i.placeholder || '') && i.offsetParent);
    const out = [];
    for (const i of inp) { out.push('INPUT ' + d(i)); let n = i.parentElement; for (let k = 0; n && k < 12; k++, n = n.parentElement) out.push('  ' + d(n)); }
    return out.join('\n');
  });
  const clickSearch = async () => {
    const ok = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button, a, [role=button], i, span')].find(e => e.offsetParent && e.getBoundingClientRect().top < 160 && /search/i.test((e.getAttribute('aria-label') || '') + ' ' + (e.title || '') + ' ' + (e.getAttribute('data-aid') || '') + ' ' + (typeof e.className === 'string' ? e.className : '')) && !e.closest('#otsmb'));
      if (!b) return null; b.click(); return b.outerHTML.slice(0, 200);
    });
    log('clicked: ' + ok); await sleep(2500);
  };
  try {
    if (!await login(page)) { log('login failed'); return; }
    await open();
    log('-- no banner, before:\n' + await describe());
    await clickSearch();
    log('-- no banner, after:\n' + await describe());
    await page.screenshot({ path: '/out/search-0.png' });
    await open();
    await page.evaluate(() => { window.OTSMB_TEST_SETTINGS = { listBanner: true }; });
    await page.addStyleTag({ path: '/ext/banner.css' }); await page.addScriptTag({ path: '/ext/settings.js' }); await page.addScriptTag({ path: '/ext/banner.js' });
    await sleep(1500);
    await page.click('.slick-row .slick-cell.l4'); await sleep(3000);
    log('banner on: ' + await page.evaluate(() => document.documentElement.classList.contains('otsmb-on')));
    await page.screenshot({ path: '/out/search-1.png' });
    await clickSearch();
    log('-- banner, after:\n' + await describe());
    await page.screenshot({ path: '/out/search-2.png' });
    const pos = () => page.evaluate(() => { const g = document.querySelector('.grid-page-layout'), s = document.querySelector('.search-box-container');
      return `grid top ${g && Math.round(g.getBoundingClientRect().top)}, search bar bottom ${s && s.offsetParent ? Math.round(s.getBoundingClientRect().bottom) : 'closed'}`; });
    log('search open: ' + await pos());
    await page.click('[data-aid="main-toolbar-search-icon"]').catch(() => {}); await sleep(2000);
    const x = await page.$('.search-component [aria-label="Close"], .search-component .close, [data-aid*="close-search"]'); if (x) { await x.click(); await sleep(2000); }
    log('after closing: ' + await pos());
    await page.screenshot({ path: '/out/search-3.png' });
  } catch (e) { log('error ' + e.stack); } finally { await browser.close(); }
})();
