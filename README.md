# OTSM case banner

A Chrome/Edge extension that adds a one-line banner to the top of every OTSM (SMAX) case page
(`https://us42-smax.saas.microfocus.com/saw/Request/<id>/...`). The content script loads on every page of the site: OTSM moves
from Reports or contact pages (`/admin/...`) to a case without loading a new page, and a script limited to `/saw/*` was
never added to such a tab (the banner then only appeared after F5). The layout follows the old Salesforce case header,
with a small label over each value.

- Fields (choose which and their order in the settings): **Case** (click to copy), **Title** (shortened; hover for all of it; click to copy "number - title"),
  **Priority** and **Status** badges, **Owner**, **Contact**, **Account**, **Product**, **Entitlement** (support plan, links to it),
  **Product Dev ID** (only when the case has one; each ID opens its Quixy page in a new tab, opened by the extension: Quixy is
  on a private address, and a link from the OTSM page made Chrome ask for "local network access"), **Created**, **Updated**.
- **Contact** and **Account** names: hover for a contact card (email, phones, time zone with the local time there, location;
  account number, region, headquarters). Click to keep it open. The name at the top of a card opens the contact's or
  account's page in OTSM. The account card also lists the **Support team** from the entitlement fields (TAM, SAM, Accountable
  Premium Manager, Enterprise Support Manager, assignment group): the case's entitlement, or the account's in-use ones when
  that has none. Then the case's active Special Handling Notes (mostly on the account; often where the SAM and named
  engineer are written down). Phone numbers call with Jabber (`ciscotel:`); the pencil next to each opens it in Jabber to edit
  before calling (`clicktocallwithedit://`).
- Case icon next to the contact: other cases, on a "Contact: <name>" or "Account: <name>" tab, newest first, with links.
  The current case is highlighted and closed cases are greyed. The contact tab includes cases the contact follows
  (SMAX FollowedByUsers; their portal lists them too), marked Following with that case's contact and account.
- Shield icon next to the account: its entitlements. Columns: Contact (✓ when the case's contact is one of the entitlement's
  **Entitled users**), entitlement number (link), product, support plan, contract, start, end and state. In-use entitlements
  are listed first, then the latest end date. The case's own entitlement is highlighted (or the heading says the case has
  none). Entitlements owned by another company (delegated, or the contact's) are included and say who owns them.
- **FTS**: opens the case's FTS account in WinSCP (`winscp-ftp://` link) or, by setting, the default FTP app (`ftp://`: whatever
  Windows has for FTP links; Windows 11 doesn't offer FileZilla there).
  Right-clicking it copies the `ftp://user:password@host/` URL for FileZilla or any other FTP program. The link carries
  `skip-domain-check`, so SMAX's "External link navigation" warning doesn't appear; Chrome still asks before opening an app.
- **Status in case lists** (setting, on by default): click the Status of a case in SMAX's own lists (My Cases and the
  others) to pick Ready, In Progress, Pending End User, Needs Attention, Pending Internal or Suspended; it saves at once
  (the same `ems/bulk` UPDATE SMAX's Save sends, with the case's LastUpdateTime, so a case changed since is refused with
  OTSM's message) and refreshes the list. Not Resolved or Closed, which need a solution and completion code.
- A ⚙ (settings) button. The banner reloads with SMAX's own Refresh button on the case, after a Save (or Ctrl+S) once OTSM has the change, and when you come back to the tab after a minute or more.

## Settings
⚙ on the banner, or right-click the extension's icon > Options. Saved in the browser profile (`chrome.storage.sync`);
open banners redraw straight away.
- Fields: show/hide and order (drag or arrows).
- Colours: OTSM navy (default), Light, Dark grey, High contrast, or custom background/text.
- Title length: 40, 60 (default), 80 characters or the full title.
- Contact cards: open on hover (default) or on click only.
- Other cases popup opens on the Contact (default) or Account tab.
- Names: First Last (default) or Last, First (as OTSM stores them).
- FTS button: host account (default), customer account, or both (small Host and Cust buttons under an FTS label).
- FTS opens in: WinSCP (default) or the default FTP app (`ftp://` link).
- Status in case lists: on (default) or off.
- Case preview: collapsed each time a case list opens, or as OTSM shows it (default). It presses the preview pane's own
  Collapse button (`.grid-preview-wrapper.expended [data-aid="sidebar-btn-collapse"]`) once per visit to a list.

All data comes from the SMAX EMS REST API (`/rest/<tenant>/ems/...`) with your own browser login, so it only shows what
your OTSM account can see. Nothing is stored or sent anywhere else. API notes: `qmon/notes/otsm-api.md`
("Entitlements, contacts and companies").

## Install (Chrome or Edge)
1. Download the repo (GitHub: Code > Download ZIP) and extract it.
2. Open `chrome://extensions` (Edge: `edge://extensions`), turn on **Developer mode**.
3. **Load unpacked** and pick the `extension` folder.
4. Open or reload an OTSM case.

To update, replace the folder with the new one and click the reload arrow on the extension's card.

## Layout
- `extension/manifest.json`: Manifest V3. One content script (`settings.js` + `banner.js`), only on the SMAX `/saw/` pages;
  `storage` permission for the settings; `background.js` only opens the Options page for the ⚙ button.
- `extension/settings.js`: the fields, colour presets and defaults, shared by the banner and `options.html`/`options.js`.
- `extension/banner.js`: finds the case id in the URL. SMAX changes cases without reloading, so it checks every 0.7 s.
  It then loads the case and loads the contact cards and popups when they're opened.
- `extension/banner.css`: styles, all prefixed `otsmb`. Entitled users are the `EntitlementToViewCaseUsers` relation (a contact's: `Person/<id>/associations/ViewCaseUsersToEntitlement`).
  The banner pushes SMAX down by moving `body` and SMAX's two fixed
  bars (`.navbar-fixed-top` and `.pl-entity-page-minimized-header`). If SMAX renames those, its header ends up under the banner.

## Test
`test/options-test.js` opens the Options page from the folder (no extension APIs, so defaults and no saving) and tries
the tick boxes, arrows, drag and colours. `test/shot.js` takes `SETTINGS='<json>'` to try settings on a real case, and
`WIDTH` for the window width. `test/shot.js` logs in to OTSM with the qmon service account (headless Chrome in the smexporter image), opens a case,
injects the banner and takes screenshots of each popup. `test/layout.js` lists SMAX's fixed elements. `test/status-edit.js` tests the status change: it re-points one list row at
test case 11068961 (Trevor's; the only case it may change), picks Pending Internal, then sets it back to Closed. Both need the qmon
repo's `test/api-poc/common.js`. The screenshots hold real case data, so they go to the gitignored `qmon/data/`:

    cd /root/source/qmon && docker run --rm -e CASE=<case> --env-file data/smexporter.env \
      -v $PWD/test/api-poc:/poc:ro -v /root/source/otsm-banner/extension:/ext:ro \
      -v /root/source/otsm-banner/test:/t:ro -v $PWD/data/otsm-banner-shots:/out \
      tsanford/smexporter node /t/shot.js

## Web page
https://trevman.com/otsm-banner/ (HostMonster). Source in `site/`: `test/demo.js` makes the screenshots
from the real banner code with made-up API answers (no real case data), then `site/build.sh` builds `dist/` (the page with
the version filled in, the screenshots and `otsm-banner-<version>.zip`); `site/deploy.sh` builds and uploads it
(ssh tsanford@trevman.com with phoenix's key, `~/www/trevman/otsm-banner/`) and checks every file is served. Older
zips stay on the site. For each release, add its entry to the Changelog tab in `site/index.html` (newest first;
test builds like 1.7.0.1 are not listed).

## Firefox
The same code runs in Firefox (128 or later). `site/build.sh` also makes `dist/otsm-banner-<version>-firefox.zip`:
the extension with Firefox's manifest from `site/firefox-manifest.py` (background script instead of the service worker,
add-on ID `otsm-banner@trevman.com`, host access to the OTSM site granted at install, no data collection). Firefox only
keeps unsigned add-ons until it restarts, so that zip is signed by Mozilla as an unlisted (private) add-on, giving an
`.xpi` that installs permanently: `site/sign-firefox.sh` (keys in qmon/data/amo.env; each version can be signed only
once, so signed .xpi files are kept in the gitignored `signed/`). `site/deploy.sh` signs and uploads it with the page. In Firefox the content script's requests go through `content.fetch`, so OTSM sees
them as the page's own (cookies and the XSRF check as in Chrome).

## Chrome Web Store
Listed unlisted under Trevor's developer account (setup started 2026-10-30). `store/listing.md` has the text for the
dashboard's Store listing and Privacy tabs; `store/make.js` makes the icon (`extension/icons/`), promo tile and
screenshots in `store/img/` from the fake-data web page screenshots. `site/build.sh` also builds
`otsm-banner-<version>-chrome-store.zip` (manifest at the root); `site/deploy.sh` moves it to `store/upload/`
(gitignored) for uploading by hand. Privacy policy: `site/privacy.html` (https://trevman.com/otsm-banner/privacy.html).
