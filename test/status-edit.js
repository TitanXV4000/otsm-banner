// Test of "Status in case lists" (README). Needs qmon test/api-poc/common.js; run like shot.js.
// WRITES to test case 11068961 only: on SMAX's case list, the first row is re-pointed at 11068961 (its item-id class),
// then its Status cell is clicked and "Pending Internal" picked. Afterwards the case is set back to Closed.
const { puppeteer, BASE, TENANT, log, login, sleep, get } = require('/poc/common.js');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1600, height: 900 });
  page.on('pageerror', e => console.log('pageerror ' + e.message));
  const bulk = []; page.on('request', q => { if (/ems\/bulk/.test(q.url())) bulk.push(q.postData()); });
  try {
    if (!await login(page)) { log('login failed'); return; }
    await page.goto(`${BASE}/saw/Requests?TENANTID=${TENANT}`, { waitUntil: 'networkidle2', timeout: 120000 }); await sleep(7000);
    await page.addStyleTag({ path: '/ext/banner.css' });
    await page.evaluate(() => { window.OTSMB_TEST_SETTINGS = { statusEdit: true }; });
    await page.addScriptTag({ path: '/ext/settings.js' }); await page.addScriptTag({ path: '/ext/banner.js' }); await sleep(1500);
    // the status column index, and re-point the first row at the test case
    const idx = await page.evaluate(() => {
      const heads = [...document.querySelectorAll('.slick-header-columns .slick-header-column')];
      const i = heads.findIndex(h => /\dStatus$/.test(h.id));
      const row = document.querySelector('.slick-row');
      row.className = row.className.replace(/item-id-\d+/, 'item-id-11068961');
      return i;
    });
    console.log('status column ' + idx);
    const cell = await page.$(`.slick-row.item-id-11068961 .slick-cell.l${idx}`);
    await cell.hover(); await sleep(300);
    console.log('hover class: ' + await cell.evaluate(n => n.className));
    await cell.click(); await sleep(800);
    console.log('menu: ' + await page.$eval('.otsmb-float', n => n.innerText.replace(/\n+/g, ' | ')));
    await page.screenshot({ path: '/out/st5-menu.png' });
    await page.evaluate(() => [...document.querySelectorAll('.otsmb-statusopt')].find(b => b.textContent === 'Pending Internal').click());
    await sleep(5000);
    console.log('menu open after save: ' + !!(await page.$('.otsmb-float')) + (await page.$('.otsmb-err') ? ' ERR ' + await page.$eval('.otsmb-err', n => n.textContent) : ''));
    console.log('bulk requests: ' + bulk.length + ' ' + (bulk[0] || '').replace(/"LastUpdateTime":\d+/, '"LastUpdateTime":…'));
    const r = await get(page, `${BASE}/rest/${TENANT}/ems/Request/11068961?layout=Id,Status,PhaseId`);
    console.log('case now: ' + JSON.stringify(r.json.entities[0].properties));
    // set it back to Closed
    const back = await page.evaluate(async T => {
      const cur = (await (await fetch(`/rest/${T}/ems/Request/11068961?layout=Id,Status,LastUpdateTime`, { credentials: 'include' })).json()).entities[0].properties;
      const x = decodeURIComponent((document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/) || [])[1] || '');
      const res = await fetch(`/rest/${T}/ems/bulk`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': x },
        body: JSON.stringify({ entities: [{ entity_type: 'Request', properties: { Id: '11068961', LastUpdateTime: cur.LastUpdateTime, Status: 'RequestStatusClosed_c' } }], operation: 'UPDATE' }) });
      return (await res.json()).entity_result_list[0].completion_status;
    }, TENANT);
    const r2 = await get(page, `${BASE}/rest/${TENANT}/ems/Request/11068961?layout=Id,Status,PhaseId`);
    console.log('reverted: ' + back + ' ' + JSON.stringify(r2.json.entities[0].properties));
  } catch (e) { log('error ' + e.stack); } finally { await browser.close(); }
})();
