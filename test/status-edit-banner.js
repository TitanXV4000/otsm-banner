// Test of "change the status from the banner" (README), the banner counterpart of status-edit.js. Needs qmon
// test/api-poc/common.js; run like shot.js but with CASE unset (it uses the test case directly).
// WRITES to test case 11068961 only: opens that case, clicks the banner's Status pill and picks "Pending Internal",
// then sets it back to Closed.
const { puppeteer, BASE, TENANT, log, login, sleep, get } = require('/poc/common.js');
const CASE = '11068961';
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1600, height: 900 });
  page.on('pageerror', e => console.log('pageerror ' + e.message));
  const bulk = []; page.on('request', q => { if (/ems\/bulk/.test(q.url())) bulk.push(q.postData()); });
  try {
    if (!await login(page)) { log('login failed'); return; }
    await page.goto(`${BASE}/saw/Request/${CASE}/general?TENANTID=${TENANT}`, { waitUntil: 'networkidle2', timeout: 120000 });
    await sleep(8000);
    await page.addStyleTag({ path: '/ext/banner.css' });
    await page.evaluate(() => { window.OTSMB_TEST_SETTINGS = { statusEdit: true }; });
    await page.addScriptTag({ path: '/ext/settings.js' }); await page.addScriptTag({ path: '/ext/banner.js' }); await sleep(4000);
    const pill = await page.waitForSelector('#otsmb .otsmb-pill.otsmb-status-edit', { timeout: 30000 });
    console.log('banner status: ' + await pill.evaluate(n => n.textContent + ' | title=' + n.title));
    await pill.click(); await sleep(800);
    console.log('menu: ' + await page.$eval('.otsmb-statusmenu', n => n.innerText.replace(/\n+/g, ' | ')));
    await page.screenshot({ path: '/out/stb-menu.png' });
    await page.evaluate(() => [...document.querySelectorAll('.otsmb-statusopt')].find(b => b.textContent === 'Pending Internal').click());
    await sleep(6000);   // save, then the banner reloads itself (load(..., true))
    console.log('menu open after save: ' + !!(await page.$('.otsmb-float')) + (await page.$('.otsmb-err') ? ' ERR ' + await page.$eval('.otsmb-err', n => n.textContent) : ''));
    console.log('banner status now: ' + await page.$eval('#otsmb .otsmb-pill', n => n.textContent).catch(() => 'none'));
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
