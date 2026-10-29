// Screenshots for the web page (site/): the real banner.css/banner.js on a stand-in page, with every API answer made up
// (case 11672418's title, priority, status, account and product; fake people, cases and entitlements). Safe to publish.
// docker run --rm -v /root/source/otsm-banner:/b -v /usr/share/fonts/truetype/DejaVuSans.ttf:/usr/share/fonts/dejavu/DejaVuSans.ttf:ro \
//   tsanford/smexporter node /b/test/demo.js   -> site/img/*.png   (DejaVu Sans: the image's fonts have no ✓)
const puppeteer = require('/usr/src/apps/smexporter/node_modules/puppeteer');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EXT = '/b/extension', OUT = '/b/site/img';
const T = '829453953', ORIGIN = 'https://otsm.example';
const day = s => Date.parse(s);

const COMPANY = '50001', CONTACT = '60001';
const req = {
  Id: '11672418', DisplayLabel: '[ESM] ESM tuning and performance as all Connectors Caching with status "Failed Connection Attempts"',
  Status: 'RequestStatusPending', Priority: 'HighPriority', EmsCreationTime: day('2026-10-27T09:58:03Z'), LastUpdateTime: day('2026-10-28T16:40:46Z'),
  RequestedForPerson: CONTACT, RequestToCompany: COMPANY, Entitlement: '20000003', ProductDevID_c: 'OCTIM56A621097',
  FTSHostAccount_c: 'h11672418', FTSHostPassword_c: 'example', FTSCustAccount_c: 'c11672418', FTSCustPassword_c: 'example',
};
const reqRel = { OwnedByPerson: { Name: 'Morgan, Casey' }, RequestedForPerson: { Name: 'Ellis, Jordan' }, RequestToCompany: { DisplayLabel: 'OpenText - OpenText' },
  Entitlement: { DisplayLabel: 'Premium Support' }, ProductModel_c: { DisplayLabel: 'ArcSight Enterprise Security Manager (ESM)' } };
const person = { Name: 'Ellis, Jordan', FirstName: 'Jordan', LastName: 'Ellis', Email: 'jordan.ellis@example.com', OfficePhoneNumber: '+1 555 0100',
  MobilePhoneNumber: '+1 555 0101', TimeZone: 'America/Chicago', IsVIP: false, EmployeeStatus: 'Active' };
const company = { DisplayLabel: 'OpenText - OpenText', Code: '0000123456', TimeZone: 'America/Toronto', RoutingRegion_c: 'Americas', CompanyType: 'Customer' };
const people = ['Ellis, Jordan', 'Reyes, Sam', 'Patel, Robin', 'Kim, Taylor', 'Novak, Alex'];
const owners = ['Morgan, Casey', 'Lee, Drew', 'Brooks, Jamie', 'Morgan, Casey', 'Quinn, Avery'];
const titles = [
  [req.Id, req.DisplayLabel, 'RequestStatusPending', '2026-10-27'],
  ['11650211', '[ESM] Correlation rule not triggering after upgrade to 7.8', 'RequestStatusInProgress', '2026-10-19'],
  ['11598730', '[ESM] Manager service slow to start after patch', 'RequestStatusComplete', '2026-10-02'],
  ['11544102', '[Logger] Storage group retention question', 'RequestStatusClosed_c', '2026-09-14'],
  ['11502986', '[ESM] Active list import fails with large CSV', 'RequestStatusClosed_c', '2026-08-28'],
  ['11468114', '[SmartConnector] Windows connector caching events', 'RequestStatusClosed_c', '2026-08-11'],
  ['11420530', '[ESM] License usage report shows wrong EPS', 'RequestStatusClosed_c', '2026-07-22'],
];
const cases = scope => titles.filter((_, i) => scope === 'account' || i % 2 === 0).map(([Id, DisplayLabel, Status, d], i) => ({ properties: { Id, DisplayLabel, Status, Priority: 'MediumPriority', EmsCreationTime: day(d + 'T15:00:00Z') },
  related_properties: { OwnedByPerson: { Name: owners[i % owners.length] }, RequestedForPerson: { Name: scope === 'account' ? people[i % people.length] : 'Ellis, Jordan' } } }));
const ent = (Id, plan, product, contract, start, end, phase) => ({ properties: { Id, DisplayLabel: plan, PhaseId: phase, StartDate_c: day(start + 'T00:00:00Z'), EndDate_c: day(end + 'T00:00:00Z'), OwnerCompany: COMPANY },
  related_properties: { OwnerCompany: { DisplayLabel: 'OpenText - OpenText' }, ProductModel_c: { DisplayLabel: product }, SupportPlan_c: { DisplayLabel: plan }, Contract: { DisplayLabel: contract } } });
const ents = [
  ent('20000003', 'Premium Support', 'ArcSight Enterprise Security Manager (ESM)', 'CT-000117', '2026-01-01', '2027-12-31', 'Inuse'),
  ent('20000004', 'Premium Support', 'ArcSight Logger', 'CT-000117', '2026-01-01', '2027-12-31', 'Inuse'),
  ent('20000005', 'Standard Support', 'ArcSight SmartConnectors', 'CT-000118', '2026-03-01', '2027-02-28', 'Inuse'),
  ent('20000006', 'Standard Support', 'NetIQ Identity Manager', 'CT-000120', '2025-07-01', '2026-06-30', 'Inactive'),
  ent('20000001', 'Premium Support', 'ArcSight Enterprise Security Manager (ESM)', 'CT-000101', '2024-01-01', '2025-12-31', 'Inactive'),
];
const entitled = ents.slice(0, 2);
// The case's entitlement with its support team, a Special Handling Note, and a case the contact follows (another account's)
const caseEnt = { properties: Object.assign({}, ents[0].properties, { TechnicalAccountManager_c: '60010', SupportAccountManager_c: '60011', AssignmentGroup_c: '70001' }),
  related_properties: Object.assign({}, ents[0].related_properties, {
    TechnicalAccountManager_c: { Name: 'Rivera, Morgan', Email: 'morgan.rivera@example.com', OfficePhoneNumber: '+1 555 0142' },
    SupportAccountManager_c: { Name: 'Hart, Riley', Email: 'riley.hart@example.com', OfficePhoneNumber: '+1 555 0157' },
    AssignmentGroup_c: { Name: 'Premium Support' } }) };
const notes = [{ properties: { Id: '80001', Status_c: 'Active_c', Message_c: '<p>SAM - Riley Hart</p><p>NSE - Jesse Carter</p>' } }];
const followed = { properties: { Id: '11612007', DisplayLabel: '[ESM] Shared connector appliance drops events during peak load', Status: 'RequestStatusInProgress', Priority: 'HighPriority',
  EmsCreationTime: day('2026-10-21T15:00:00Z'), RequestedForPerson: '60099', RequestToCompany: '50077' },
  related_properties: { OwnedByPerson: { Name: 'Lee, Drew' }, RequestedForPerson: { Name: 'Shah, Parker' }, RequestToCompany: { DisplayLabel: 'Example Partner Services' } } };
const json = o => ({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
const list = (entities, total) => json({ entities, meta: { total_count: total === undefined ? entities.length : total } });

function answer(u) {
  const p = decodeURIComponent(u.pathname + u.search);
  if (/\/ems\/Request\/\d+\?/.test(p)) return json({ entities: [{ properties: req, related_properties: reqRel }] });
  if (/\/ems\/Person\/\d+\/associations\/ViewCaseUsersToEntitlement/.test(p)) return list(entitled);
  if (/\/ems\/Person\/\d+\?/.test(p)) return json({ entities: [{ properties: person, related_properties: { Location: { DisplayLabel: 'Chicago, IL' } } }] });
  if (/\/ems\/Company\/\d+\/associations\//.test(p)) return list([]);
  if (/\/ems\/Company\/\d+\?/.test(p)) return json({ entities: [{ properties: company, related_properties: { Headquarters: { DisplayLabel: 'Waterloo, ON' } } }] });
  if (/\/ems\/Entitlement\/\d+\?/.test(p)) return json({ entities: [caseEnt] });
  if (/\/ems\/SpecialHandlingNotes_c\?/.test(p)) return list(notes);
  if (/\/ems\/Request\?filter=FollowedByUsers/.test(p)) return list([followed]);
  if (/\/ems\/Request\?filter=RequestToCompany/.test(p)) return list(cases('account'), 2147);
  if (/\/ems\/Request\?filter=RequestedForPerson/.test(p)) return list(cases('contact'));
  if (/\/ems\/Entitlement\?/.test(p)) return list(ents);
  console.log('unanswered ' + p); return list([]);
}

// A plain stand-in for the OTSM case page under the banner: a navy bar like OTSM's, then grey placeholder blocks
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
body { margin: 0; padding-top: 56px; background: #f1f3f5; font: 14px Arial, sans-serif; }
.navbar-fixed-top { position: fixed; top: 0; left: 0; right: 0; height: 56px; background: #00264b; color: #fff; display: flex; align-items: center; padding: 0 20px; font-size: 17px; }
.blk { background: #fff; border: 1px solid #dde2e6; border-radius: 4px; margin: 14px 20px; padding: 16px; }
.bar { height: 10px; background: #e3e7eb; border-radius: 5px; margin: 10px 0; }
h2 { font-size: 20px; color: #1d2733; margin: 0 0 10px; font-weight: 400; }
</style></head><body><div class="navbar-fixed-top">OTSM</div>
<div class="blk"><h2>11672418 · [ESM] ESM tuning and performance as all Connectors Caching…</h2><div class="bar" style="width:40%"></div></div>
<div class="blk"><div class="bar" style="width:70%"></div><div class="bar" style="width:55%"></div><div class="bar" style="width:62%"></div><div class="bar" style="width:30%"></div></div>
<div class="blk"><div class="bar" style="width:80%"></div><div class="bar" style="width:45%"></div><div class="bar" style="width:66%"></div></div>
</body></html>`;

// A stand-in for an OTSM case list (made-up cases), built like OTSM's own (SlickGrid classes and ids), so the real
// banner.js finds the Status column and draws its menu on it
const LIST_ROWS = [
  ['11672418', '[ESM] ESM tuning and performance as all Connectors Caching', 'High', 'Ellis, Jordan', 'Pending End User', '10/28/2026 10:40:46 AM', 'Hi Jordan, the connector logs show the cache filling after…'],
  ['11650211', '[ESM] Correlation rule not triggering after upgrade to 7.8', 'Medium', 'Reyes, Sam', 'In Progress', '10/29/2026 12:28:44 PM', 'Thanks Sam, the rule export helps. I can reproduce it…'],
  ['11612007', '[ESM] Shared connector appliance drops events during peak load', 'Medium', 'Shah, Parker', 'Pending Internal', '10/27/2026 4:05:12 PM', 'Sent the event counts to the connector team for review…'],
  ['11598730', '[Logger] Storage group retention question', 'Low', 'Patel, Robin', 'Pending End User', '10/23/2026 2:52:37 PM', 'Hi Robin, retention is set per storage group; see…'],
];
const LIST_COLS = [['isSelected', '', 34], ['Id', 'Id', 96], ['DisplayLabel', 'Title', 300], ['Priority', 'Priority', 100], ['RequestedForPerson', 'Requested for', 128],
  ['Status', 'Status', 150], ['LastUpdateTime', 'Updated On', 180], ['LatestComment_c', 'Latest Comment', 330]];
const listCell = (row, i) => {
  const [id, title, pri, who, st, upd, com] = row;
  return [`<input type="checkbox">`, `<a class="entity-link-id" href="/saw/Request/${id}">${id}</a>`, title,
    `<span class="pri pri-${pri.toLowerCase()}"></span>${pri}`, `<span class="av"></span>${who}`, st, upd, com][i];
};
const LIST = `<!doctype html><html><head><meta charset="utf-8"><style>
body { margin: 0; padding-top: 56px; background: #fff; font: 14px Arial, sans-serif; color: #333; }
.navbar-fixed-top { position: fixed; top: 0; left: 0; right: 0; height: 56px; background: #00264b; color: #fff; display: flex; align-items: center; padding: 0 20px; font-size: 17px; }
.tabs { background: #f1f3f5; display: flex; gap: 34px; padding: 0 20px; height: 40px; align-items: center; font-size: 14px; }
.tabs .on { color: #0b5cad; font-weight: 700; }
.tools { display: flex; gap: 26px; padding: 14px 20px; font-size: 14px; color: #333; }
.slickgrid_1 { margin: 0 20px; border-top: 1px solid #e3e7eb; }
.slick-header-columns, .slick-row { display: flex; }
.slick-header-column { font-weight: 700; padding: 10px 8px; box-sizing: border-box; }
.slick-row { border-bottom: 1px solid #e3e7eb; }
.slick-row.sel { background: #e9ecef; }
.slick-cell { padding: 10px 8px; box-sizing: border-box; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.slick-cell a { color: #0b5cad; text-decoration: none; }
.pri { display: inline-block; width: 6px; height: 14px; margin-right: 6px; vertical-align: -2px; border-left: 2px solid #f39c12; border-right: 2px solid #f39c12; }
.pri-high { border-color: #e67e22; } .pri-low { border-color: #f5c26b; }
.av { display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: #5a6470; margin-right: 6px; vertical-align: -4px; }
</style></head><body><div class="navbar-fixed-top">OTSM</div>
<div class="tabs"><span class="on">MY CASES</span><span>CLOSED</span><span>ALL ACTIVE</span><span>REQUESTED FOR</span></div>
<div class="tools"><span>New</span><span>Details</span><span>Refresh</span><span>Columns</span><span>More</span></div>
<div class="slickgrid_1"><div class="slick-header-columns">${LIST_COLS.map(([f, t, w]) => `<div class="slick-header-column" id="slickgrid_1${f}" style="width:${w}px">${t}</div>`).join('')}</div>
<div class="slick-viewport">${LIST_ROWS.map((r, ri) => `<div class="slick-row item-id-${r[0]}${ri === 0 ? ' sel' : ''}">${LIST_COLS.map(([f, t, w], i) => `<div class="slick-cell l${i} r${i}" style="width:${w}px">${listCell(r, i)}</div>`).join('')}</div>`).join('')}</div></div>
</body></html>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'] });
  const page = await browser.newPage();
  await page.emulateTimezone('America/Denver');
  await page.setViewport({ width: 1600, height: 560, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('pageerror: ' + e.message));
  await page.setRequestInterception(true);
  page.on('request', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/rest/')) r.respond(answer(u)); else r.respond({ status: 200, contentType: 'text/html', body: PAGE }); });
  await page.goto(`${ORIGIN}/saw/Request/11672418/general?TENANTID=${T}`);
  // fts: both shows the Host and Cust buttons; a stand-in chrome.runtime makes the banner show its ⚙ button
  await page.evaluate(() => { window.OTSMB_TEST_SETTINGS = { fts: 'both' }; window.chrome = { runtime: { sendMessage() {} } }; });
  await page.addStyleTag({ path: EXT + '/banner.css' });
  await page.addScriptTag({ path: EXT + '/settings.js' });
  await page.addScriptTag({ path: EXT + '/banner.js' });
  await sleep(1500);
  const shot = async (name, h) => { await page.screenshot({ path: `${OUT}/${name}.png`, clip: { x: 0, y: 0, width: 1600, height: h } }); console.log('wrote ' + name); };
  await shot('banner', 230);
  // A popup with the part of the banner above it
  const shotPopup = async name => {
    const r = await page.$eval('.otsmb-float', n => { const b = n.getBoundingClientRect(); return { l: b.left, r: b.right, b: b.bottom }; });
    const x = Math.max(0, Math.floor(r.l - 40)), w = Math.min(1600, Math.ceil(r.r + 40)) - x;
    await page.screenshot({ path: `${OUT}/${name}.png`, clip: { x, y: 0, width: w, height: Math.ceil(r.b + 24) } }); console.log('wrote ' + name);
  };
  const at = sel => page.$eval(sel, n => { const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  // contact card (hover the name)
  let [x, y] = await at('#otsmb .otsmb-col:nth-child(6) .otsmb-name, #otsmb [class*="otsmb-name"]');
  await page.mouse.move(x, y); await sleep(1200); await shotPopup('contact-card');
  await page.mouse.move(5, 500); await sleep(800);
  [x, y] = await at('#otsmb .otsmb-col:nth-child(7) .otsmb-name');
  await page.mouse.move(x, y); await sleep(1200); await shotPopup('account-card');
  await page.mouse.move(5, 500); await sleep(800);
  // other cases (click the case icon), account tab too
  const click = async sel => { await page.click(sel); await page.evaluate(() => document.activeElement && document.activeElement.blur()); };
  await click('#otsmb button[title="Contact\'s other cases"]'); await sleep(1000); await shotPopup('cases');
  await page.keyboard.press('Escape');
  await click('#otsmb button[title="Account\'s entitlements"]'); await sleep(1000); await shotPopup('entitlements');
  await page.keyboard.press('Escape');
  // a case list with the status menu open (nothing is saved: the menu is only hovered)
  const list = await browser.newPage();
  await list.setViewport({ width: 1340, height: 490, deviceScaleFactor: 1 });
  await list.setRequestInterception(true);
  list.on('request', r => r.respond({ status: 200, contentType: 'text/html', body: LIST }));
  await list.goto(`${ORIGIN}/saw/Requests?TENANTID=${T}`);
  await list.addStyleTag({ path: EXT + '/banner.css' });
  await list.addScriptTag({ path: EXT + '/settings.js' }); await list.addScriptTag({ path: EXT + '/banner.js' }); await sleep(500);
  const stCell = await list.$('.slick-row.item-id-11650211 .slick-cell.l5');
  await stCell.hover(); await sleep(200); await stCell.click(); await sleep(500);
  const opt = await list.evaluateHandle(() => [...document.querySelectorAll('.otsmb-statusopt')].find(b => b.textContent === 'Pending End User'));
  await opt.hover(); await sleep(300);
  await list.screenshot({ path: OUT + '/status-list.png', clip: { x: 0, y: 56, width: 1340, height: 420 } }); console.log('wrote status-list');
  await list.close();
  // the settings page, with its defaults (it runs from the folder without extension APIs)
  const optPage = await browser.newPage();
  await optPage.setViewport({ width: 1700, height: 900, deviceScaleFactor: 1 });
  await optPage.goto('file://' + EXT + '/options.html'); await sleep(800);
  await optPage.screenshot({ path: OUT + '/settings.png', fullPage: true }); console.log('wrote settings');
  await browser.close();
})();
