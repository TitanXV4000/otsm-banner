// Test of "change the status from the banner" (README), the banner counterpart of status-edit.js. Needs qmon
// test/api-poc/common.js; run like shot.js but with CASE unset (it uses the test case directly).
// WRITES to test case 11068961 only: opens that case, clicks the banner's Status pill and picks "Pending Internal",
// then sets it back to Closed.
const { puppeteer, BASE, TENANT, log, login, sleep, get } = require('/poc/common.js');
const CASE = '11068961';
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage(); await page.setViewport({ width: +(process.env.WIDTH || 1600), height: 900 });
  page.on('pageerror', e => console.log('pageerror ' + e.message));
  page.on('console', m => { if (m.text().startsWith('[otsm-banner]')) console.log('console: ' + m.text()); });
  const bulk = []; page.on('request', q => { if (/ems\/bulk/.test(q.url())) bulk.push(q.postData()); });
  try {
    if (!await login(page)) { log('login failed'); return; }
    await page.goto(`${BASE}/saw/Request/${CASE}/general?TENANTID=${TENANT}`, { waitUntil: 'networkidle2', timeout: 120000 });
    await sleep(8000);
    if (process.env.TAB) {   // open the case on General (as a user does), then go to that tab by its link
      await page.evaluate(t => { const n = [...document.querySelectorAll('.tab-panel-navigation-item-tab-text')].find(x => x.textContent.trim().toLowerCase() === t); if (n) n.click(); }, process.env.TAB);
      await sleep(5000);
    }
    await page.addStyleTag({ path: '/ext/banner.css' });
    await page.evaluate(() => { window.OTSMB_TEST_SETTINGS = { bannerStatusEdit: true }; });
    await page.addScriptTag({ path: '/ext/settings.js' }); await page.addScriptTag({ path: '/ext/banner.js' }); await sleep(4000);
    // OTSM's own Status view (outside the banner) and clicks on its Refresh button, to see that the banner syncs it
    const otsmShows = () => page.evaluate(() => { const c = document.body.cloneNode(true); c.querySelectorAll('#otsmb, .otsmb-float').forEach(n => n.remove());
      return ['Pending Internal', 'Closed'].map(l => l + ' x' + (c.innerText.match(new RegExp('\\b' + l + '\\b', 'g')) || []).length).join(', '); });
    await page.evaluate(() => { window.otsmbRefreshClicks = 0; document.addEventListener('click', e => { if (e.target.closest && e.target.closest('button[aria-label="Refresh"]')) window.otsmbRefreshClicks++; }, true); });
    console.log('OTSM shows before: ' + await otsmShows());
    const pill = await page.waitForSelector('#otsmb .otsmb-pill.otsmb-status-edit', { timeout: 30000 });
    console.log('banner status: ' + await pill.evaluate(n => n.textContent + ' | title=' + n.title));
    await pill.click(); await sleep(800);
    console.log('menu: ' + await page.$eval('.otsmb-statusmenu', n => n.innerText.replace(/\n+/g, ' | ')));
    await page.screenshot({ path: '/out/stb-menu.png' });
    await page.evaluate(() => [...document.querySelectorAll('.otsmb-statusopt')].find(b => b.textContent === 'Pending Internal').click());
    await sleep(6000);   // save, then the banner reloads itself (load(..., true))
    console.log('menu open after save: ' + !!(await page.$('.otsmb-float')) + (await page.$('.otsmb-err') ? ' ERR ' + await page.$eval('.otsmb-err', n => n.textContent) : ''));
    console.log('banner status now: ' + await page.$eval('#otsmb .otsmb-pill', n => n.textContent).catch(() => 'none'));
    console.log('OTSM Refresh clicks: ' + await page.evaluate(() => window.otsmbRefreshClicks) + '; OTSM shows after: ' + await otsmShows());
    await page.screenshot({ path: '/out/stb-after.png' });
    if (process.env.TAB && process.env.TAB !== 'general') {   // then go to General the way a user does (the tab link)
      await page.evaluate(() => { const t = [...document.querySelectorAll('.tab-panel-navigation-item-tab-text')].find(n => n.textContent.trim() === 'General'); if (t) t.click(); });
      for (const t of [4, 8, 12]) { await sleep(4000); console.log(`after going to General (${t} s): ` + await otsmShows() + ' url ' + page.url().replace(/\?.*/, '').replace(/.*Request/, '')); }
      await page.screenshot({ path: '/out/stb-general.png' });
    }
    console.log('bulk requests: ' + bulk.length + ' ' + (bulk[0] || '').replace(/"LastUpdateTime":\d+/, '"LastUpdateTime":…'));
    const r = await get(page, `${BASE}/rest/${TENANT}/ems/Request/${CASE}?layout=Id,Status,PhaseId`);
    console.log('case now: ' + JSON.stringify(r.json.entities[0].properties));
    // set it back to Closed
    const back = await page.evaluate(async (T, id) => {
      const cur = (await (await fetch(`/rest/${T}/ems/Request/${id}?layout=Id,Status,LastUpdateTime`, { credentials: 'include' })).json()).entities[0].properties;
      const x = decodeURIComponent((document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/) || [])[1] || '');
      const res = await fetch(`/rest/${T}/ems/bulk`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': x },
        body: JSON.stringify({ entities: [{ entity_type: 'Request', properties: { Id: id, LastUpdateTime: cur.LastUpdateTime, Status: 'RequestStatusClosed_c' } }], operation: 'UPDATE' }) });
      return (await res.json()).entity_result_list[0].completion_status;
    }, TENANT, CASE);
    const r2 = await get(page, `${BASE}/rest/${TENANT}/ems/Request/${CASE}?layout=Id,Status,PhaseId`);
    console.log('reverted: ' + back + ' ' + JSON.stringify(r2.json.entities[0].properties));
  } catch (e) { log('error ' + e.stack); } finally { await browser.close(); }
})();
