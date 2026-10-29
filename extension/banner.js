// OTSM case banner: shown at the top of every SMAX case page (/saw/Request/<id>/...).
// All data comes from the SMAX EMS REST API with the user's own login (same origin, so the session cookie goes along).
(() => {
  'use strict';

  const DEFAULT_TENANT = '829453953';
  const FTS_HOST = 'ftp-pro.houston.softwaregrp.com';   // used when the case has no FTS login URL
  const QUIXY = 'https://rdapps.otxlab.net/quixy/#/viewEntity/';   // + Product Dev ID

  // Labels OTSM shows for the internal values (smreportparser OTSM_LABELS)
  const STATUS = {
    RequestStatusReady: 'Ready', RequestStatusInProgress: 'In Progress', RequestStatusPending: 'Pending End User',
    RequestStatusNeedsAttention_c: 'Needs Attention', RequestStatusPendingInternal_c: 'Pending Internal',
    RequestStatusComplete: 'Resolved', RequestStatusSuspended: 'Suspended', RequestStatusClosed_c: 'Closed',
  };
  const PRIORITY = { CriticalPriority: 'Critical', HighPriority: 'High', MediumPriority: 'Medium', LowPriority: 'Low' };
  const CLOSED = ['RequestStatusComplete', 'RequestStatusClosed_c'];

  const ICON = {
    cases: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M10 4h4a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3V6a2 2 0 0 1 2-2zm0 3h4V6h-4v1zM5 9v9h14V9H5z"/></svg>',
    ents: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3zm0 2.1L6 6.4V11c0 3.9 2.5 7.4 6 8.9 3.5-1.5 6-5 6-8.9V6.4l-6-2.3zm-1 10.5l5-5 1.4 1.4-6.4 6.4-3.4-3.4L9 10.6l2 2z"/></svg>',
    gear: '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.4 2.7a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1L11 21h4l.4-2.7a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5-2.2-1.8zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M17.6 6.4A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.8-4.2L13 11h7V4l-2.4 2.4z"/></svg>',
  };

  // ---------- small helpers ----------
  const tenant = () => new URLSearchParams(location.search).get('TENANTID') || DEFAULT_TENANT;
  const caseIdFromUrl = () => (location.pathname.match(/^\/saw\/Request\/(\d+)/) || [])[1] || null;
  const recordUrl = (entity, id) => `/saw/${entity}/${id}/general?TENANTID=${tenant()}`;

  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;            // only for the fixed ICON strings
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const c of kids.flat()) { if (c !== null && c !== undefined && c !== '') n.append(c instanceof Node ? c : String(c)); }
    return n;
  }

  const dateTime = ms => ms ? new Date(+ms).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  const dateOnly = ms => ms ? new Date(+ms).toLocaleDateString('en-US', { timeZone: 'UTC' }) : '';   // OTSM DATE fields are midnight UTC
  function localTime(tz) {
    try { return new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; }
  }

  async function api(path) {
    const res = await fetch(`/rest/${tenant()}/ems/${path}`, { credentials: 'include', headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  const flat = e => Object.assign({}, e.properties, { _rel: e.related_properties || {} });
  const rel = (o, link, field) => ((o._rel || {})[link] || {})[field] || '';
  async function getOne(entity, id, layout) {
    const j = await api(`${entity}/${id}?layout=${encodeURIComponent(layout)}`);
    const e = (j.entities || [])[0];
    if (!e) throw new Error(`${entity} ${id} not found`);
    return flat(e);
  }
  async function getAssoc(entity, id, relation, layout) {
    const j = await api(`${entity}/${id}/associations/${relation}?layout=${encodeURIComponent(layout)}&size=500`);
    return (j.entities || []).map(flat);
  }
  async function getList(entity, filter, layout, order) {
    const j = await api(`${entity}?filter=${encodeURIComponent(filter)}&layout=${encodeURIComponent(layout)}` +
      (order ? `&order=${encodeURIComponent(order)}` : '') + '&size=200&meta=totalCount');
    return { rows: (j.entities || []).map(flat), total: (j.meta || {}).total_count || 0 };
  }

  // ---------- state ----------
  let bar = null;          // the banner element
  let current = null;      // { id, req, person, company, loadedAt }
  let token = 0;           // drops answers for a case we've already left
  let floating = null;     // the open popup or contact card
  let hoverTimer = null;
  let settings = OTSMB.complete();   // replaced by the saved settings before the first case loads

  // ---------- banner ----------
  function ensureBar() {
    if (bar && document.body.contains(bar)) return bar;
    bar = el('div', { id: 'otsmb', role: 'region', 'aria-label': 'Case summary' });
    document.body.prepend(bar);
    return bar;
  }

  function showBar(on) {
    document.documentElement.classList.toggle('otsmb-on', on);
    if (!on && bar) { bar.remove(); bar = null; closeFloating(); }
  }

  const ACCOUNT_MAX = 32;   // characters of the account name shown; the full name is in its tooltip
  // OTSM stores people as "Last, First"; the Names setting can turn that round
  const person = n => { const m = settings.names === 'first' && /^([^,]+),\s*(.+)$/.exec(n || ''); return m ? `${m[2]} ${m[1]}` : (n || ''); };
  const cut = (text, max) => max && text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
  const shortDate = ms => ms ? new Date(+ms).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' }) : '';

  // One column of the banner: a small label over its value (the Salesforce case header layout)
  function col(label, cls, ...value) {
    return el('div', { class: 'otsmb-col' + (cls ? ' ' + cls : '') }, el('div', { class: 'otsmb-label' }, label), el('div', { class: 'otsmb-value' }, ...value));
  }

  // Each field's column; null leaves it out (Product Dev ID when the case has none)
  const FIELD_RENDER = {
    case: r => col('Case', null, el('span', { class: 'otsmb-id', title: 'Click to copy the case number', onclick: e => copy(e.currentTarget, r.Id) }, r.Id)),
    title: r => { const t = r.DisplayLabel || ''; return col('Title', 'otsmb-grow', el('span', { class: 'otsmb-title', title: t }, cut(t, settings.titleMax))); },
    priority: r => { const p = PRIORITY[r.Priority] || r.Priority || ''; return col('Priority', null, p ? el('span', { class: 'otsmb-pill otsmb-pr-' + p.toLowerCase() }, p) : ''); },
    status: r => { const st = STATUS[r.Status] || r.Status || ''; return col('Status', null, st ? el('span', { class: 'otsmb-pill otsmb-st-' + (r.Status || '').replace(/[^A-Za-z]/g, '') }, st) : ''); },
    owner: r => col('Owner', null, person(rel(r, 'OwnedByPerson', 'Name')) || '(none)'),
    contact: r => { const n = person(rel(r, 'RequestedForPerson', 'Name'));
      return col('Contact', null, r.RequestedForPerson ? hoverName(n || '(unknown)', n, personCard) : '(none)',
        r.RequestedForPerson && iconButton('cases', "Contact's other cases", casesPopup)); },
    account: r => { const n = rel(r, 'RequestToCompany', 'DisplayLabel');
      return col('Account', null, r.RequestToCompany ? hoverName(cut(n || '(unknown)', ACCOUNT_MAX), n, companyCard) : '(none)',
        r.RequestToCompany && iconButton('ents', "Account's entitlements", entitlementsPopup)); },
    product: r => col('Product', null, rel(r, 'ProductModel_c', 'DisplayLabel') || '(none)'),
    entitlement: r => { const e = rel(r, 'Entitlement', 'DisplayLabel');
      return col('Entitlement', null, r.Entitlement ? el('a', { class: 'otsmb-link', href: recordUrl('Entitlement', r.Entitlement) }, e || r.Entitlement) : '(none)'); },
    // Product Dev ID: each ID (some cases list several) links to its Quixy page
    devid: r => { const ids = String(r.ProductDevID_c || '').split(/[\s,;]+/).filter(Boolean);
      return ids.length ? col('Product Dev ID', null, ...ids.map(id => el('a', { class: 'otsmb-link', href: QUIXY + encodeURIComponent(id), target: '_blank', rel: 'noopener',
        'skip-domain-check': '', title: `Open ${id} in Quixy` }, id))) : null; },
    created: r => col('Created', null, shortDate(r.EmsCreationTime)),
    updated: r => col('Updated', null, shortDate(r.LastUpdateTime)),
  };

  function applyColors(b) {
    const c = OTSMB.palette(settings);
    for (const k of ['bg', 'fg', 'label', 'icon', 'line']) b.style.setProperty('--otsmb-' + k, c[k]);
  }

  function render() {
    const b = ensureBar();
    applyColors(b);
    b.replaceChildren();
    const c = current;
    if (!c.req) {
      b.append(col('Case', null, el('span', { class: 'otsmb-id' }, c.id)),
        col('', 'otsmb-grow', el('span', { class: c.error ? 'otsmb-err' : 'otsmb-dim' }, c.error ? `Couldn't load the case: ${c.error}` : 'Loading…')),
        el('div', { class: 'otsmb-actions' }, refreshButton(), settingsButton()));
      return;
    }
    const r = c.req;
    b.append(...settings.fields.filter(f => f.on && FIELD_RENDER[f.id]).map(f => FIELD_RENDER[f.id](r)).filter(Boolean),
      el('div', { class: 'otsmb-actions' }, ...ftsLinks(r), refreshButton(), settingsButton()));
  }

  // The Options page can only be opened by the extension's service worker
  function settingsButton() {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) return null;
    return el('button', { class: 'otsmb-icon', type: 'button', title: 'Banner settings', html: ICON.gear, onclick: () => chrome.runtime.sendMessage({ openOptions: true }) });
  }

  function refreshButton() {
    return el('button', { class: 'otsmb-icon', type: 'button', title: 'Refresh', html: ICON.refresh, onclick: () => load(current.id, true) });
  }
  function iconButton(icon, title, open) {
    return el('button', { class: 'otsmb-icon', type: 'button', title, 'aria-label': title, html: ICON[icon],
      onclick: e => { e.stopPropagation(); toggleFloating(e.currentTarget, open, true, true); } });
  }

  // A name that shows a contact card on hover (if that setting is on); a click keeps it open
  function hoverName(text, full, build) {
    const n = el('span', { class: 'otsmb-name', tabindex: '0', title: full !== text ? full : null }, text);
    n.addEventListener('mouseenter', () => { if (!settings.cardsOnHover) return; clearTimeout(hoverTimer); hoverTimer = setTimeout(() => { if (!floating || !floating.pinned) openFloating(n, build, false); }, 250); });
    n.addEventListener('mouseleave', () => { if (!settings.cardsOnHover) return; clearTimeout(hoverTimer); hoverTimer = setTimeout(() => { if (floating && !floating.pinned && !floating.box.matches(':hover')) closeFloating(); }, 300); });
    n.addEventListener('click', e => { e.stopPropagation(); clearTimeout(hoverTimer); toggleFloating(n, build, true); });
    n.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); toggleFloating(n, build, true); } });
    return n;
  }

  // FTS accounts in WinSCP (winscp-ftp:// opens WinSCP rather than another FTP handler). skip-domain-check: SMAX's
  // "External link navigation" warning (platform.js, click handler on body) skips links with that attribute.
  function ftsLinks(r) {
    let host = FTS_HOST;
    try { if (r.FTSLogin_c) host = new URL(r.FTSLogin_c).host; } catch (e) { /* keep the default */ }
    const both = settings.fts === 'both';
    const accounts = [];
    if (settings.fts !== 'customer') accounts.push({ user: r.FTSHostAccount_c, pass: r.FTSHostPassword_c, text: both ? 'FTS host' : 'FTS', what: 'host account' });
    if (settings.fts !== 'host') accounts.push({ user: r.FTSCustAccount_c, pass: r.FTSCustPassword_c, text: both ? 'FTS customer' : 'FTS', what: 'customer account' });
    const links = accounts.filter(a => a.user && a.pass).map(a => el('a', { class: 'otsmb-btn', href: `winscp-ftp://${encodeURIComponent(a.user)}:${encodeURIComponent(a.pass)}@${host}/`,
      'skip-domain-check': '', title: `Open ${host} in WinSCP with the FTS ${a.what} ${a.user}` }, a.text));
    return links.length ? links : [el('span', { class: 'otsmb-dim', title: 'This case has no FTS account' }, 'No FTS')];
  }

  function copy(node, text) {
    navigator.clipboard.writeText(String(text)).then(() => {
      node.classList.add('otsmb-copied'); setTimeout(() => node.classList.remove('otsmb-copied'), 900);
    });
  }

  // ---------- popups and contact cards ----------
  function toggleFloating(anchor, build, pinned, closable) {
    if (floating && floating.anchor === anchor) {
      if (pinned && !floating.pinned) { floating.pinned = true; floating.box.classList.add('otsmb-pinned'); return; }
      closeFloating(); return;
    }
    openFloating(anchor, build, pinned, closable);
  }
  function openFloating(anchor, build, pinned, closable) {
    closeFloating();
    const box = el('div', { class: 'otsmb-float' + (pinned ? ' otsmb-pinned' : '') });
    box.addEventListener('click', e => e.stopPropagation());
    box.addEventListener('mouseleave', () => { if (floating && !floating.pinned) { hoverTimer = setTimeout(closeFloating, 300); } });
    box.addEventListener('mouseenter', () => clearTimeout(hoverTimer));
    if (closable) box.append(el('button', { class: 'otsmb-close', type: 'button', title: 'Close', 'aria-label': 'Close', onclick: closeFloating }, '×'));
    document.body.append(box);
    floating = { anchor, box, pinned };
    const a = anchor.getBoundingClientRect();
    box.style.top = (a.bottom + 6) + 'px';
    const place = () => { box.style.left = Math.max(8, Math.min(a.left, window.innerWidth - box.offsetWidth - 8)) + 'px'; };
    const body = el('div', { class: 'otsmb-dim' }, 'Loading…');
    box.append(body);
    place();
    Promise.resolve(build()).then(node => { if (floating && floating.box === box) { body.replaceWith(node); place(); } })
      .catch(err => { body.textContent = `Couldn't load: ${err.message}`; body.className = 'otsmb-err'; });
  }
  function closeFloating() { if (floating) { floating.box.remove(); floating = null; } }
  document.addEventListener('click', () => { if (floating) closeFloating(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeFloating(); });

  function table(head, rows) {
    return el('table', { class: 'otsmb-table' }, el('thead', null, el('tr', null, head.map(h => el('th', null, h)))), el('tbody', null, rows));
  }
  function line(label, ...value) {
    return value.some(v => v) ? el('tr', null, el('th', null, label), el('td', null, ...value)) : null;
  }
  const tel = n => n ? el('a', { href: 'tel:' + String(n).replace(/[^0-9+]/g, '') }, n) : null;
  const zone = tz => tz ? [tz, el('span', { class: 'otsmb-dim' }, ` (now ${localTime(tz)})`)] : null;

  async function personCard() {
    const id = current.req.RequestedForPerson;
    if (!current.person) current.person = await getOne('Person', id, 'Name,FirstName,LastName,Email,OfficePhoneNumber,MobilePhoneNumber,HomePhoneNumber,TimeZone,Location.DisplayLabel,IsVIP,EmployeeStatus');
    const p = current.person;
    return el('div', null,
      el('div', { class: 'otsmb-card-title' }, person(p.Name), p.IsVIP ? el('span', { class: 'otsmb-pill otsmb-vip' }, 'VIP') : null),
      el('table', { class: 'otsmb-card' }, el('tbody', null,
        line('Email', p.Email && el('a', { href: 'mailto:' + p.Email }, p.Email)),
        line('Office', tel(p.OfficePhoneNumber)),
        line('Mobile', tel(p.MobilePhoneNumber)),
        line('Home', tel(p.HomePhoneNumber)),
        line('Time zone', zone(p.TimeZone)),
        line('Location', rel(p, 'Location', 'DisplayLabel')),
        p.EmployeeStatus && p.EmployeeStatus !== 'Active' ? line('Status', p.EmployeeStatus) : null)));
  }

  async function companyCard() {
    const id = current.req.RequestToCompany;
    if (!current.company) current.company = await getOne('Company', id, 'DisplayLabel,Code,TimeZone,RoutingRegion_c,Headquarters.DisplayLabel,CompanyType');
    const co = current.company;
    return el('div', null,
      el('div', { class: 'otsmb-card-title' }, co.DisplayLabel || ''),
      el('table', { class: 'otsmb-card' }, el('tbody', null,
        line('Account #', co.Code),
        line('Region', co.RoutingRegion_c),
        line('Time zone', zone(co.TimeZone)),
        line('Headquarters', rel(co, 'Headquarters', 'DisplayLabel')),
        line('Type', co.CompanyType))));
  }

  // The contact's other cases, or the whole account's
  async function casesPopup() {
    const r = current.req;
    const wrap = el('div');
    const show = async scope => {
      const filter = scope === 'account' ? `RequestToCompany = ${r.RequestToCompany}` : `RequestedForPerson = ${r.RequestedForPerson}`;
      wrap.replaceChildren(el('div', { class: 'otsmb-dim' }, 'Loading…'));
      const { rows, total } = await getList('Request', filter,
        'Id,DisplayLabel,Status,Priority,OwnedByPerson.Name,RequestedForPerson.Name,EmsCreationTime', 'EmsCreationTime desc');
      const tabs = el('div', { class: 'otsmb-tabs' },
        ['contact', 'account'].map(s => el('button', { type: 'button', class: s === scope ? 'otsmb-on' : '', onclick: () => show(s).catch(err => wrap.replaceChildren(el('div', { class: 'otsmb-err' }, err.message))) },
          s === 'contact' ? `Contact: ${cut(person(rel(r, 'RequestedForPerson', 'Name')) || '(unknown)', 30)}` : `Account: ${cut(rel(r, 'RequestToCompany', 'DisplayLabel') || '(unknown)', 30)}`)));
      const head = ['Case', 'Title', 'Status', 'Owner'].concat(scope === 'account' ? ['Contact'] : [], ['Created']);
      const body = rows.map(x => el('tr', { class: (x.Id === r.Id ? 'otsmb-current ' : '') + (CLOSED.includes(x.Status) ? 'otsmb-closed' : '') },
        el('td', null, el('a', { href: recordUrl('Request', x.Id) }, x.Id)),
        el('td', { class: 'otsmb-wrap' }, x.DisplayLabel || ''),
        el('td', null, STATUS[x.Status] || x.Status || ''),
        el('td', null, person(rel(x, 'OwnedByPerson', 'Name'))),
        scope === 'account' ? el('td', null, person(rel(x, 'RequestedForPerson', 'Name'))) : null,
        el('td', null, x.EmsCreationTime ? new Date(+x.EmsCreationTime).toLocaleDateString('en-US') : '')));
      const open = rows.filter(x => !CLOSED.includes(x.Status)).length;
      wrap.replaceChildren(tabs,
        el('div', { class: 'otsmb-card-title' }, `${total} case${total === 1 ? '' : 's'}`, el('span', { class: 'otsmb-dim' }, ` · ${open} open` + (total > rows.length ? ` · newest ${rows.length} shown` : ''))),
        el('div', { class: 'otsmb-scroll' }, table(head, body)));
      if (floating) { const f = floating.box; f.style.left = Math.max(8, Math.min(parseFloat(f.style.left), window.innerWidth - f.offsetWidth - 8)) + 'px'; }
    };
    await show(settings.casesTab === 'account' && r.RequestToCompany ? 'account' : 'contact');
    return wrap;
  }

  // The account's entitlements (plus any another company delegated to it), the product each covers, and which of them
  // the case's contact is an entitled user on (SMAX's "Entitled users" tab: the EntitlementToViewCaseUsers relation)
  async function entitlementsPopup() {
    const r = current.req;
    const layout = 'Id,DisplayLabel,PhaseId,StartDate_c,EndDate_c,OwnerCompany,OwnerCompany.DisplayLabel,ProductModel_c.DisplayLabel,SupportPlan_c.DisplayLabel,Contract.DisplayLabel';
    const [own, delegated, mine] = await Promise.all([
      getList('Entitlement', `OwnerCompany = ${r.RequestToCompany}`, layout),
      getAssoc('Company', r.RequestToCompany, 'DelegatedCompaniesToEntitlement', layout).catch(() => []),
      r.RequestedForPerson ? getAssoc('Person', r.RequestedForPerson, 'ViewCaseUsersToEntitlement', layout).catch(() => null) : null,
    ]);
    const byId = new Map();
    for (const x of [...own.rows, ...delegated, ...(mine || [])]) if (!byId.has(x.Id)) byId.set(x.Id, x);
    // The case's own entitlement can belong to another company the account isn't delegated by: add it so it's always listed
    if (r.Entitlement && !byId.has(r.Entitlement)) { try { byId.set(r.Entitlement, await getOne('Entitlement', r.Entitlement, layout)); } catch (e) { /* not readable */ } }
    const entitled = new Set((mine || []).map(x => x.Id));
    const now = Date.now();
    const inUse = x => x.PhaseId === 'Inuse' && !(x.EndDate_c && +x.EndDate_c < now);
    const product = x => rel(x, 'ProductModel_c', 'DisplayLabel');
    // In use first, then the latest end date, then product
    const rows = [...byId.values()].sort((a, b) => (inUse(b) - inUse(a)) || ((+b.EndDate_c || 0) - (+a.EndDate_c || 0)) || product(a).localeCompare(product(b)));
    const contact = person(rel(r, 'RequestedForPerson', 'Name')) || 'the contact';
    const body = rows.map(x => {
      const expired = x.EndDate_c && +x.EndDate_c < now;
      const other = x.OwnerCompany && x.OwnerCompany !== r.RequestToCompany;
      return el('tr', { class: (x.Id === r.Entitlement ? 'otsmb-current ' : '') + (inUse(x) ? '' : 'otsmb-closed') },
        mine ? el('td', { class: 'otsmb-center', title: entitled.has(x.Id) ? `${contact} is an entitled user` : '' }, entitled.has(x.Id) ? '✓' : '') : null,
        el('td', null, el('a', { href: recordUrl('Entitlement', x.Id) }, x.Id)),
        el('td', null, product(x) || '(no product)', other ? el('div', { class: 'otsmb-dim' }, 'Owned by ' + rel(x, 'OwnerCompany', 'DisplayLabel')) : null),
        el('td', null, x.DisplayLabel || ''),
        el('td', null, rel(x, 'Contract', 'DisplayLabel')),
        el('td', null, dateOnly(x.StartDate_c)),
        el('td', null, dateOnly(x.EndDate_c)),
        el('td', null, x.PhaseId === 'Inuse' ? (expired ? 'Expired' : 'In use') : (x.PhaseId || '')));
    });
    return el('div', null,
      el('div', { class: 'otsmb-card-title' }, `${rows.length} entitlement${rows.length === 1 ? '' : 's'}`,
        el('span', { class: 'otsmb-dim' }, (mine ? ` · ✓ = ${contact} is an entitled user (${entitled.size})` : '') + (r.Entitlement ? " · this case's is highlighted" : ' · this case has no entitlement' + (r.OverrideEntitlement_c ? ' (Override Entitlement is checked)' : '')))),
      rows.length ? el('div', { class: 'otsmb-scroll' }, table((mine ? ['Contact'] : []).concat(['Entitlement', 'Product', 'Support plan', 'Contract', 'Start', 'End', 'State']), body))
        : el('div', { class: 'otsmb-dim' }, 'None found for this account.'));
  }

  // ---------- loading and page watching ----------
  const CASE_LAYOUT = 'Id,DisplayLabel,Status,Priority,EmsCreationTime,LastUpdateTime,OwnedByPerson.Name,' +
    'RequestedForPerson,RequestedForPerson.Name,RequestToCompany,RequestToCompany.DisplayLabel,Entitlement,Entitlement.DisplayLabel,' +
    'ProductModel_c.DisplayLabel,ProductDevID_c,OverrideEntitlement_c,FTSHostAccount_c,FTSHostPassword_c,FTSCustAccount_c,FTSCustPassword_c,FTSLogin_c';

  async function load(id, again) {
    const mine = ++token;
    if (!again || !current || current.id !== id) { current = { id }; closeFloating(); }
    showBar(true);
    render();
    try {
      const req = await getOne('Request', id, CASE_LAYOUT);
      if (mine !== token) return;
      current = { id, req, loadedAt: Date.now() };
    } catch (err) {
      if (mine !== token) return;
      current = { id, error: err.message, loadedAt: Date.now() };
    }
    render();
  }

  function check() {
    const id = caseIdFromUrl();
    if (!id) { if (current) { current = null; token++; showBar(false); } return; }
    if (!current || current.id !== id) load(id);
    else if (!bar || !document.body.contains(bar)) render();   // the page replaced <body> contents
  }
  OTSMB.onChange(s => { settings = s; if (current && bar) render(); });   // Options page changes show at once
  OTSMB.load().then(s => {
    settings = s;
    setInterval(check, 700);   // SMAX changes cases without reloading the page
    window.addEventListener('focus', () => { if (current && current.loadedAt && Date.now() - current.loadedAt > 60000) load(current.id, true); });
    check();
  });
})();
