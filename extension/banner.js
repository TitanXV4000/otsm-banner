// OTSM case banner: shown at the top of every SMAX case page (/saw/Request/<id>/...).
// All data comes from the SMAX EMS REST API with the user's own login (same origin, so the session cookie goes along).
(() => {
  'use strict';

  const DEFAULT_TENANT = '829453953';
  const FTS_HOST = 'ftp-pro.houston.softwaregrp.com';   // used when the case has no FTS login URL

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

  function render() {
    const b = ensureBar();
    b.replaceChildren();
    const c = current;
    if (!c.req) {
      b.append(el('div', { class: 'otsmb-row' }, el('span', { class: 'otsmb-id' }, c.id),
        el('span', { class: c.error ? 'otsmb-err' : 'otsmb-dim' }, c.error ? `Couldn't load the case: ${c.error}` : 'Loading…'),
        refreshButton()));
      return;
    }
    const r = c.req;
    const status = STATUS[r.Status] || r.Status || '';
    const prio = PRIORITY[r.Priority] || r.Priority || '';

    const row1 = el('div', { class: 'otsmb-row' },
      el('span', { class: 'otsmb-id', title: 'Click to copy the case number', onclick: e => copy(e.currentTarget, r.Id) }, r.Id),
      el('span', { class: 'otsmb-title', title: r.DisplayLabel }, r.DisplayLabel || ''),
      status && el('span', { class: 'otsmb-pill otsmb-st-' + (r.Status || '').replace(/[^A-Za-z]/g, '') }, status),
      prio && el('span', { class: 'otsmb-pill otsmb-pr-' + prio.toLowerCase() }, prio),
      el('span', { class: 'otsmb-spacer' }),
      el('span', { class: 'otsmb-field' }, el('b', null, 'Owner '), rel(r, 'OwnedByPerson', 'Name') || '(none)'),
      el('span', { class: 'otsmb-field' }, el('b', null, 'Created '), dateTime(r.EmsCreationTime)),
      el('span', { class: 'otsmb-field' }, el('b', null, 'Updated '), dateTime(r.LastUpdateTime)),
      refreshButton());

    const custName = rel(r, 'RequestedForPerson', 'Name');
    const acctName = rel(r, 'RequestToCompany', 'DisplayLabel');
    const ent = rel(r, 'Entitlement', 'DisplayLabel');
    const row2 = el('div', { class: 'otsmb-row' },
      el('span', { class: 'otsmb-field' }, el('b', null, 'Customer '),
        r.RequestedForPerson ? hoverName(custName || '(unknown)', personCard) : '(none)',
        r.RequestedForPerson && iconButton('cases', "Customer's other cases", casesPopup)),
      el('span', { class: 'otsmb-field' }, el('b', null, 'Account '),
        r.RequestToCompany ? hoverName(acctName || '(unknown)', companyCard) : '(none)',
        r.RequestToCompany && iconButton('ents', "Account's entitlements", entitlementsPopup)),
      ent && el('span', { class: 'otsmb-field' }, el('b', null, 'Entitlement '),
        r.Entitlement ? el('a', { href: recordUrl('Entitlement', r.Entitlement) }, ent) : ent),
      el('span', { class: 'otsmb-spacer' }),
      winscpLink(r));

    b.append(row1, row2);
  }

  function refreshButton() {
    return el('button', { class: 'otsmb-icon', type: 'button', title: 'Refresh', html: ICON.refresh, onclick: () => load(current.id, true) });
  }
  function iconButton(icon, title, open) {
    return el('button', { class: 'otsmb-icon', type: 'button', title, 'aria-label': title, html: ICON[icon],
      onclick: e => { e.stopPropagation(); toggleFloating(e.currentTarget, open, true); } });
  }

  // A name that shows a contact card on hover; a click keeps it open
  function hoverName(text, build) {
    const n = el('span', { class: 'otsmb-name', tabindex: '0' }, text);
    n.addEventListener('mouseenter', () => { clearTimeout(hoverTimer); hoverTimer = setTimeout(() => { if (!floating || !floating.pinned) openFloating(n, build, false); }, 250); });
    n.addEventListener('mouseleave', () => { clearTimeout(hoverTimer); hoverTimer = setTimeout(() => { if (floating && !floating.pinned && !floating.box.matches(':hover')) closeFloating(); }, 300); });
    n.addEventListener('click', e => { e.stopPropagation(); clearTimeout(hoverTimer); toggleFloating(n, build, true); });
    n.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); toggleFloating(n, build, true); } });
    return n;
  }

  // FTS host account in WinSCP (winscp-ftp:// opens WinSCP rather than another FTP handler)
  function winscpLink(r) {
    if (!r.FTSHostAccount_c || !r.FTSHostPassword_c) return el('span', { class: 'otsmb-dim' }, 'No FTS account');
    let host = FTS_HOST;
    try { if (r.FTSLogin_c) host = new URL(r.FTSLogin_c).host; } catch (e) { /* keep the default */ }
    const url = `winscp-ftp://${encodeURIComponent(r.FTSHostAccount_c)}:${encodeURIComponent(r.FTSHostPassword_c)}@${host}/`;
    return el('a', { class: 'otsmb-btn', href: url, title: `Open ${host} in WinSCP as ${r.FTSHostAccount_c}` }, 'WinSCP');
  }

  function copy(node, text) {
    navigator.clipboard.writeText(String(text)).then(() => {
      node.classList.add('otsmb-copied'); setTimeout(() => node.classList.remove('otsmb-copied'), 900);
    });
  }

  // ---------- popups and contact cards ----------
  function toggleFloating(anchor, build, pinned) {
    if (floating && floating.anchor === anchor) {
      if (pinned && !floating.pinned) { floating.pinned = true; floating.box.classList.add('otsmb-pinned'); return; }
      closeFloating(); return;
    }
    openFloating(anchor, build, pinned);
  }
  function openFloating(anchor, build, pinned) {
    closeFloating();
    const box = el('div', { class: 'otsmb-float' + (pinned ? ' otsmb-pinned' : '') });
    box.addEventListener('click', e => e.stopPropagation());
    box.addEventListener('mouseleave', () => { if (floating && !floating.pinned) { hoverTimer = setTimeout(closeFloating, 300); } });
    box.addEventListener('mouseenter', () => clearTimeout(hoverTimer));
    document.body.append(box);
    floating = { anchor, box, pinned };
    const a = anchor.getBoundingClientRect();
    box.style.top = (a.bottom + 6) + 'px';
    box.style.left = Math.max(8, Math.min(a.left, window.innerWidth - 560)) + 'px';
    const body = el('div', { class: 'otsmb-dim' }, 'Loading…');
    box.append(body);
    Promise.resolve(build()).then(node => { if (floating && floating.box === box) body.replaceWith(node); })
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
      el('div', { class: 'otsmb-card-title' }, p.Name || '', p.IsVIP ? el('span', { class: 'otsmb-pill otsmb-vip' }, 'VIP') : null),
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

  // The customer's other cases, or the whole account's
  async function casesPopup() {
    const r = current.req;
    const wrap = el('div');
    const show = async scope => {
      const filter = scope === 'account' ? `RequestToCompany = ${r.RequestToCompany}` : `RequestedForPerson = ${r.RequestedForPerson}`;
      wrap.replaceChildren(el('div', { class: 'otsmb-dim' }, 'Loading…'));
      const { rows, total } = await getList('Request', filter,
        'Id,DisplayLabel,Status,Priority,OwnedByPerson.Name,RequestedForPerson.Name,EmsCreationTime', 'EmsCreationTime desc');
      const tabs = el('div', { class: 'otsmb-tabs' },
        ['customer', 'account'].map(s => el('button', { type: 'button', class: s === scope ? 'otsmb-on' : '', onclick: () => show(s).catch(err => wrap.replaceChildren(el('div', { class: 'otsmb-err' }, err.message))) },
          s === 'customer' ? 'This customer' : 'Whole account')));
      const head = ['Case', 'Title', 'Status', 'Owner'].concat(scope === 'account' ? ['Customer'] : [], ['Created']);
      const body = rows.map(x => el('tr', { class: (x.Id === r.Id ? 'otsmb-current ' : '') + (CLOSED.includes(x.Status) ? 'otsmb-closed' : '') },
        el('td', null, el('a', { href: recordUrl('Request', x.Id) }, x.Id)),
        el('td', { class: 'otsmb-wrap' }, x.DisplayLabel || ''),
        el('td', null, STATUS[x.Status] || x.Status || ''),
        el('td', null, rel(x, 'OwnedByPerson', 'Name')),
        scope === 'account' ? el('td', null, rel(x, 'RequestedForPerson', 'Name')) : null,
        el('td', null, x.EmsCreationTime ? new Date(+x.EmsCreationTime).toLocaleDateString('en-US') : '')));
      const open = rows.filter(x => !CLOSED.includes(x.Status)).length;
      wrap.replaceChildren(tabs,
        el('div', { class: 'otsmb-card-title' }, `${total} case${total === 1 ? '' : 's'}`, el('span', { class: 'otsmb-dim' }, ` · ${open} open` + (total > rows.length ? ` · newest ${rows.length} shown` : ''))),
        el('div', { class: 'otsmb-scroll' }, table(head, body)));
    };
    await show('customer');
    return wrap;
  }

  // The account's entitlements and the product each covers
  async function entitlementsPopup() {
    const r = current.req;
    const { rows } = await getList('Entitlement', `OwnerCompany = ${r.RequestToCompany}`,
      'Id,DisplayLabel,PhaseId,StartDate_c,EndDate_c,ProductModel_c.DisplayLabel,SupportPlan_c.DisplayLabel,Contract.DisplayLabel');
    const now = Date.now();
    const product = x => rel(x, 'ProductModel_c', 'DisplayLabel');
    rows.sort((a, b) => product(a).localeCompare(product(b)) || (+b.EndDate_c || 0) - (+a.EndDate_c || 0));
    const body = rows.map(x => {
      const expired = x.EndDate_c && +x.EndDate_c < now;
      return el('tr', { class: (x.Id === r.Entitlement ? 'otsmb-current ' : '') + (expired || (x.PhaseId && x.PhaseId !== 'Inuse') ? 'otsmb-closed' : '') },
        el('td', null, el('a', { href: recordUrl('Entitlement', x.Id) }, product(x) || '(no product)')),
        el('td', null, x.DisplayLabel || ''),
        el('td', null, rel(x, 'Contract', 'DisplayLabel')),
        el('td', null, dateOnly(x.StartDate_c)),
        el('td', null, dateOnly(x.EndDate_c)),
        el('td', null, x.PhaseId === 'Inuse' ? (expired ? 'Expired' : 'In use') : (x.PhaseId || '')));
    });
    return el('div', null,
      el('div', { class: 'otsmb-card-title' }, `${rows.length} entitlement${rows.length === 1 ? '' : 's'}`,
        r.Entitlement ? el('span', { class: 'otsmb-dim' }, ' · this case\'s is highlighted') : null),
      rows.length ? el('div', { class: 'otsmb-scroll' }, table(['Product', 'Support plan', 'Contract', 'Start', 'End', 'State'], body))
        : el('div', { class: 'otsmb-dim' }, 'None found for this account.'));
  }

  // ---------- loading and page watching ----------
  const CASE_LAYOUT = 'Id,DisplayLabel,Status,Priority,EmsCreationTime,LastUpdateTime,OwnedByPerson.Name,' +
    'RequestedForPerson,RequestedForPerson.Name,RequestToCompany,RequestToCompany.DisplayLabel,Entitlement,Entitlement.DisplayLabel,' +
    'FTSHostAccount_c,FTSHostPassword_c,FTSLogin_c';

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
  setInterval(check, 700);   // SMAX changes cases without reloading the page
  window.addEventListener('focus', () => { if (current && current.loadedAt && Date.now() - current.loadedAt > 60000) load(current.id, true); });
  check();
})();
