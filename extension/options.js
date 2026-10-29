// OTSM case banner: the Options page. Every change saves at once (chrome.storage.sync); open banners redraw themselves.
(() => {
  'use strict';
  let s;
  const $ = id => document.getElementById(id);
  const byId = Object.fromEntries(OTSMB.FIELDS.map(f => [f.id, f]));

  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') n.className = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c !== null && c !== undefined) n.append(c instanceof Node ? c : String(c));
    return n;
  }

  let savedTimer;
  function changed() {
    OTSMB.save(s).then(() => { $('saved').classList.add('show'); clearTimeout(savedTimer); savedTimer = setTimeout(() => $('saved').classList.remove('show'), 1200); });
    draw();
  }

  // ---------- preview: case 11672418 (OpenText's own account), with made-up contact and owner names ----------
  const SAMPLE = {
    case: ['Case', el('span', { class: 'otsmb-id' }, '11672418')],
    title: ['Title', null],
    priority: ['Priority', el('span', { class: 'otsmb-pill otsmb-pr-high' }, 'High')],
    status: ['Status', el('span', { class: 'otsmb-pill otsmb-st-RequestStatusPending' }, 'Pending End User')],
    owner: ['Owner', null],
    contact: ['Contact', null],
    account: ['Account', null],
    product: ['Product', 'ArcSight Enterprise Security Manager (ESM)'],
    entitlement: ['Entitlement', el('a', { class: 'otsmb-link', href: '#' }, 'Standard Support')],
    devid: ['Product Dev ID', el('a', { class: 'otsmb-link', href: '#' }, 'OCTIM56A621098')],
    created: ['Created', '10/27/26, 3:58 AM'],
    updated: ['Updated', '10/28/26, 10:40 AM'],
  };
  const SAMPLE_TITLE = '[ESM] ESM tuning and performance as all Connectors Caching with status "Failed Connection Attempts"';
  const icon = () => el('span', { class: 'otsmb-icon' }, '▣');

  function preview() {
    const b = $('otsmb');
    const c = OTSMB.palette(s);
    for (const k of ['bg', 'fg', 'label', 'icon', 'line']) b.style.setProperty('--otsmb-' + k, c[k]);
    const value = id => {
      if (id === 'title') { const t = s.titleMax && SAMPLE_TITLE.length > s.titleMax ? SAMPLE_TITLE.slice(0, s.titleMax - 1).trimEnd() + '…' : SAMPLE_TITLE; return el('span', { class: 'otsmb-title' }, t); }
      if (id === 'contact') return [el('span', { class: 'otsmb-name' }, s.names === 'first' ? 'Jordan Ellis' : 'Ellis, Jordan'), icon()];
      if (id === 'owner') return s.names === 'first' ? 'Casey Morgan' : 'Morgan, Casey';
      if (id === 'account') return [el('span', { class: 'otsmb-name' }, 'OpenText - OpenText'), icon()];
      return SAMPLE[id][1];
    };
    const fts = s.fts === 'both'
      ? [el('div', { class: 'otsmb-col' }, el('div', { class: 'otsmb-label' }, 'FTS'), el('div', { class: 'otsmb-value otsmb-fts2' }, ...['Host', 'Cust'].map(t => el('span', { class: 'otsmb-btn otsmb-btn-sm' }, t))))]
      : [el('span', { class: 'otsmb-btn' }, 'FTS')];
    b.replaceChildren(...s.fields.filter(f => f.on).map(f => el('div', { class: 'otsmb-col' + (f.id === 'title' ? ' otsmb-grow' : '') },
      el('div', { class: 'otsmb-label' }, SAMPLE[f.id][0]), el('div', { class: 'otsmb-value' }, value(f.id)))),
      el('div', { class: 'otsmb-actions' }, ...fts, el('span', { class: 'otsmb-icon' }, '⚙')));
  }

  // ---------- fields: tick, arrows, drag ----------
  let dragFrom = null;
  function move(from, to) {
    if (to < 0 || to >= s.fields.length || from === to) return;
    const [f] = s.fields.splice(from, 1); s.fields.splice(to, 0, f); changed();
  }
  function fields() {
    const ul = $('fields');
    ul.replaceChildren(...s.fields.map((f, i) => {
      const def = byId[f.id];
      const li = el('li', { class: f.on ? '' : 'off', draggable: 'true' },
        el('span', { class: 'grip', 'aria-hidden': 'true' }, '≡'),
        el('label', null, el('input', { type: 'checkbox', checked: f.on, onchange: e => { f.on = e.target.checked; changed(); } }),
          el('span', null, def.label), def.note ? el('span', { class: 'note' }, def.note) : null),
        el('span', { class: 'arrows' },
          el('button', { type: 'button', title: 'Move up', 'aria-label': `Move ${def.label} up`, disabled: i === 0, onclick: () => move(i, i - 1) }, '↑'), ' ',
          el('button', { type: 'button', title: 'Move down', 'aria-label': `Move ${def.label} down`, disabled: i === s.fields.length - 1, onclick: () => move(i, i + 1) }, '↓')));
      li.addEventListener('dragstart', e => { dragFrom = i; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', f.id); });
      li.addEventListener('dragend', () => { li.classList.remove('dragging'); dragFrom = null; ul.querySelectorAll('.over').forEach(n => n.classList.remove('over')); });
      li.addEventListener('dragover', e => { if (dragFrom === null) return; e.preventDefault(); li.classList.add('over'); });
      li.addEventListener('dragleave', () => li.classList.remove('over'));
      li.addEventListener('drop', e => { e.preventDefault(); if (dragFrom !== null) move(dragFrom, i); });
      return li;
    }));
  }

  // ---------- radio groups ----------
  function radios(id, options, get, set) {
    $(id).replaceChildren(...options.map(([value, text, extra]) => el('label', null,
      el('input', { type: 'radio', name: id, checked: get() === value, onchange: () => { set(value); changed(); } }), extra || null, text)));
  }

  function draw() {
    preview();
    fields();
    radios('colors', Object.entries(OTSMB.COLORS).map(([k, c]) => [k, c.name, el('span', { class: 'swatch', style: `background:${c.bg}` })]).concat([['custom', 'Custom']]),
      () => s.colors, v => { s.colors = v; });
    $('custom').style.display = s.colors === 'custom' ? '' : 'none';
    $('customBg').value = s.customBg; $('customFg').value = s.customFg;
    radios('titleMax', [[40, '40 characters'], [60, '60'], [80, '80'], [0, 'Full title']], () => s.titleMax, v => { s.titleMax = v; });
    radios('cardsOnHover', [[true, 'Open on hover (click keeps it open)'], [false, 'Open on click only']], () => s.cardsOnHover, v => { s.cardsOnHover = v; });
    radios('casesTab', [['contact', 'Contact'], ['account', 'Account']], () => s.casesTab, v => { s.casesTab = v; });
    radios('names', [['first', 'First Last'], ['last', 'Last, First']], () => s.names, v => { s.names = v; });
    radios('fts', [['host', 'Host account'], ['customer', 'Customer account'], ['both', 'Both (Host and Cust buttons)']], () => s.fts, v => { s.fts = v; });
  }

  $('customBg').addEventListener('input', e => { s.customBg = e.target.value; changed(); });
  $('customFg').addEventListener('input', e => { s.customFg = e.target.value; changed(); });

  OTSMB.load().then(loaded => { s = loaded; draw(); });
})();
