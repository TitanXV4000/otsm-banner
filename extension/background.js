// OTSM case banner service worker (Firefox: background script): opens what a content script can't, or shouldn't.
// - the Options page, for the banner's ⚙ button
// - Quixy for a Product Dev ID: Quixy is on a private address, and opening it from the OTSM page makes Chrome ask for
//   local network access; a tab the extension opens doesn't
const QUIXY = 'https://rdapps.otxlab.net/quixy/#/viewEntity/';
chrome.runtime.onMessage.addListener(msg => {
  if (!msg) return;
  if (msg.openOptions) chrome.runtime.openOptionsPage();
  if (typeof msg.openQuixy === 'string' && /^[A-Za-z0-9._-]{1,64}$/.test(msg.openQuixy)) chrome.tabs.create({ url: QUIXY + encodeURIComponent(msg.openQuixy) });
});
