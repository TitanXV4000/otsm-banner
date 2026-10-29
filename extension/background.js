// OTSM case banner service worker: only opens the Options page for the banner's ⚙ button (content scripts can't).
chrome.runtime.onMessage.addListener(msg => { if (msg && msg.openOptions) chrome.runtime.openOptionsPage(); });
