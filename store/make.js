// Chrome Web Store images: the extension icon (extension/icons/), the 440x280 promo tile and 1280x800 screenshots
// built from the fake-data web page screenshots (site/img/, made by test/demo.js). Run test/demo.js first, then:
// docker run --rm -v /root/source/otsm-banner:/b -v /usr/share/fonts/truetype/DejaVuSans.ttf:/usr/share/fonts/dejavu/DejaVuSans.ttf:ro \
//   tsanford/smexporter node /b/store/make.js   -> extension/icons/icon-*.png, store/img/*.png
const puppeteer = require('/usr/src/apps/smexporter/node_modules/puppeteer');
const fs = require('fs');
const B = '/b', OUT = B + '/store/img';
fs.mkdirSync(OUT, { recursive: true });

// Navy tile (OTSM's header colour), a blue banner across the top and three lines of "case page" below it
const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect x="12" y="12" width="104" height="104" rx="18" fill="#00264b"/>
  <rect x="24" y="30" width="80" height="24" rx="5" fill="#1a73e8"/>
  <rect x="31" y="39" width="38" height="6" rx="3" fill="#fff"/>
  <rect x="24" y="66" width="80" height="8" rx="4" fill="#9db4cc"/>
  <rect x="24" y="82" width="62" height="8" rx="4" fill="#9db4cc"/>
  <rect x="24" y="98" width="70" height="8" rx="4" fill="#9db4cc"/>
</svg>`;
fs.writeFileSync(B + '/store/icon.svg', ICON + '\n');
const icon = 'data:image/svg+xml;base64,' + Buffer.from(ICON).toString('base64');
const img = f => 'data:image/png;base64,' + fs.readFileSync(B + '/site/img/' + f).toString('base64');
const FONT = "font-family: 'Segoe UI', Roboto, 'DejaVu Sans', Arial, sans-serif;";

// Each shot: file name, heading, line below it, then rows of [image, width in px]
const SHOTS = [
  ['1-banner', 'Every case\'s key facts in one line', 'Number, title, priority, status, contact, account, owner, dates, Product Dev ID and FTS at the top of each OTSM case.',
    [[['banner.png', 1180]], [['contact-card.png', 377], ['cases.png', 740]]]],
  ['2-status', 'Change a status straight from your case lists', 'Click the Status in a case list and pick the new one. No need to open the case.', [[['status-list.png', 1180]]]],
  ['3-cards', 'Contact and account at a glance', 'Phone (with Jabber), email, local time, support team and special handling notes.', [[['contact-card.png', 470], ['account-card.png', 640]]]],
  ['4-cases', 'Other cases and entitlements', 'The contact\'s and the account\'s other cases, followed cases, and the account\'s entitlements.',
    [[['cases.png', 700]], [['entitlements.png', 812]]]],
  ['5-settings', 'Show what you need, in your colours', 'Pick the fields, their order and the colours. Settings sync with your browser.', [[['settings.png', 720]]]],
];

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const shot = async (html, w, h, file, transparent) => {
    await page.setViewport({ width: w, height: h });
    await page.setContent(`<!doctype html><html><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;${transparent ? 'background:transparent' : ''}">${html}</body></html>`);
    await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
    await page.screenshot({ path: file, omitBackground: !!transparent, clip: { x: 0, y: 0, width: w, height: h } });
  };
  for (const s of [16, 32, 48, 128]) await shot(`<img src="${icon}" width="${s}" height="${s}" style="display:block">`, s, s, `${B}/extension/icons/icon-${s}.png`, true);

  await shot(`<div style="${FONT}width:440px;height:280px;box-sizing:border-box;padding:0 24px 0 10px;background:#eef1f4;color:#00264b;display:flex;align-items:center;gap:8px">
    <img src="${icon}" width="150" height="150" style="flex:none">
    <div><div style="font-size:27px;font-weight:700;white-space:nowrap">OTSM case banner</div>
    <div style="font-size:15px;color:#4a5562;margin-top:10px;line-height:1.35">The key facts of every OTSM case in one line at the top of the page</div></div></div>`, 440, 280, `${OUT}/promo-440x280.png`);

  for (const [name, title, sub, rows] of SHOTS) {
    const html = rows.map(r => `<div style="display:flex;align-items:flex-start;justify-content:center;gap:40px">${r.map(([f, w]) =>
      `<img src="${img(f)}" width="${w}" style="display:block;border-radius:6px;box-shadow:0 6px 24px rgba(0,0,0,.18);background:#fff">`).join('')}</div>`).join('');
    await shot(`<div style="${FONT}width:1280px;height:800px;box-sizing:border-box;padding:44px 50px;background:#eef1f4;color:#1d2733;display:flex;flex-direction:column">
      <div style="font-size:36px;font-weight:700;color:#00264b">${title}</div>
      <div style="font-size:19px;color:#4a5562;margin-top:8px">${sub}</div>
      <div style="flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;gap:28px;margin-top:20px">${html}</div></div>`, 1280, 800, `${OUT}/${name}.png`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
