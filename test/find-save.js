// Lists the buttons on a real SMAX case page that look like Save (read only: nothing is clicked). See test/README.md.
const { puppeteer, BASE, TENANT, log, login, sleep } = require('/poc/common.js');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  try {
    if (!await login(page)) { log('login failed'); return; }
    await page.goto(`${BASE}/saw/Request/${process.env.CASE}/general?TENANTID=${TENANT}`, { waitUntil: 'networkidle2', timeout: 120000 });
    await sleep(8000);
    log(await page.evaluate(() => [...document.querySelectorAll('button, [role=button], a.btn')]
      .filter(b => /save|close|resolve|submit/i.test([b.innerText, b.getAttribute('aria-label'), b.getAttribute('data-aid'), b.title, b.className].join(' ')))
      .map(b => JSON.stringify({ tag: b.tagName, text: b.innerText.trim().slice(0, 40), aria: b.getAttribute('aria-label'), aid: b.getAttribute('data-aid'), cls: b.className, disabled: b.disabled, visible: !!b.offsetParent }))
      .join('\n')));
  } catch (e) { log('error ' + e.message); } finally { await browser.close(); }
})();
