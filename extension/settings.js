// OTSM case banner settings: shared by the banner (content script) and the Options page.
// Stored in chrome.storage.sync, so they follow the browser profile.
var OTSMB = (() => {
  'use strict';

  // The banner's fields, in their default order. on: shown by default.
  const FIELDS = [
    { id: 'case', label: 'Case', on: true },
    { id: 'title', label: 'Title', on: true },
    { id: 'priority', label: 'Priority', on: true },
    { id: 'status', label: 'Status', on: true },
    { id: 'owner', label: 'Owner', on: true },
    { id: 'contact', label: 'Contact', on: true, note: 'contact card and other cases' },
    { id: 'account', label: 'Account', on: true, note: 'account card and entitlements' },
    { id: 'product', label: 'Product', on: false },
    { id: 'entitlement', label: 'Entitlement', on: false, note: "the case's support plan" },
    { id: 'devid', label: 'Product Dev ID', on: true, note: 'only when the case has one' },
    { id: 'created', label: 'Created', on: true },
    { id: 'updated', label: 'Updated', on: true },
  ];

  // bg: background, fg: text, label: the small labels, icon: icons and name underlines, line: bottom edge
  const COLORS = {
    navy: { name: 'OTSM navy', bg: '#00264b', fg: '#ffffff', label: '#9db4cc', icon: '#8cc4ff', line: 'rgba(255,255,255,.22)' },
    light: { name: 'Light', bg: '#fff8e1', fg: '#1d2733', label: '#5a6470', icon: '#0b5cad', line: '#e8b400' },
    grey: { name: 'Dark grey', bg: '#2b2f33', fg: '#f1f3f5', label: '#a8b0b8', icon: '#8cc4ff', line: 'rgba(255,255,255,.2)' },
    contrast: { name: 'High contrast', bg: '#000000', fg: '#ffffff', label: '#ffd400', icon: '#6fd3ff', line: '#ffd400' },
  };

  const DEFAULTS = {
    fields: FIELDS.map(f => ({ id: f.id, on: f.on })),
    colors: 'navy',            // a COLORS key, or 'custom'
    customBg: '#00264b',
    customFg: '#ffffff',
    titleMax: 60,              // characters; 0 = the full title
    cardsOnHover: true,        // false: contact cards open only on click
    casesTab: 'contact',       // the cases popup opens on 'contact' or 'account'
    fts: 'host',               // 'host', 'customer' or 'both'
    names: 'first',            // people's names as 'first' (First Last) or 'last' (Last, First, as OTSM stores them)
  };

  // Saved settings over the defaults. Fields: saved order first, then any field added since (in its default place).
  function complete(saved) {
    const s = Object.assign({}, DEFAULTS, saved || {});
    const known = new Set(FIELDS.map(f => f.id));
    const list = (Array.isArray(s.fields) ? s.fields : []).filter(f => f && known.has(f.id));
    const have = new Set(list.map(f => f.id));
    FIELDS.forEach((f, i) => { if (!have.has(f.id)) list.splice(Math.min(i, list.length), 0, { id: f.id, on: f.on }); });
    s.fields = list.map(f => ({ id: f.id, on: !!f.on }));
    return s;
  }

  const storage = () => (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) || null;

  function load() {
    return new Promise(resolve => {
      const st = storage();
      if (!st) { resolve(complete(window.OTSMB_TEST_SETTINGS)); return; }   // the headless test injects the script without the extension
      st.get('settings', got => resolve(complete(got && got.settings)));
    });
  }
  function save(s) {
    return new Promise(resolve => { const st = storage(); if (st) st.set({ settings: s }, resolve); else resolve(); });
  }
  function onChange(fn) {
    if (storage()) chrome.storage.onChanged.addListener((changes, area) => { if (area === 'sync' && changes.settings) fn(complete(changes.settings.newValue)); });
  }

  // The colours to use: a preset, or custom background/text with the rest worked out from them
  function palette(s) {
    if (s.colors !== 'custom') return COLORS[s.colors] || COLORS.navy;
    const mix = (pct) => `color-mix(in srgb, ${s.customFg} ${pct}%, ${s.customBg})`;
    return { bg: s.customBg, fg: s.customFg, label: mix(65), icon: s.customFg, line: mix(30) };
  }

  return { FIELDS, COLORS, DEFAULTS, load, save, onChange, palette, complete };
})();
