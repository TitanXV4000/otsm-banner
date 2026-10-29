# OTSM case banner

A Chrome/Edge extension that adds a fixed banner to the top of every OTSM (SMAX) case page
(`https://us42-smax.saas.microfocus.com/saw/Request/<id>/...`):

- Case number (click to copy), title, status, priority, owner, created and last updated.
- **Customer** and **Account**: hover for a contact card (email, phones, time zone with the local time there, location;
  account number, region, headquarters). Click to keep it open.
- Customer's other cases (case icon): this customer or the whole account, newest first, with links. The current case is highlighted and closed cases are greyed.
- Account's entitlements (shield icon): product, support plan, contract, start/end date and state, with links.
  The case's own entitlement is highlighted, and expired or inactive ones are greyed.
- **WinSCP**: opens the case's FTS host account in WinSCP (`winscp-ftp://` link; WinSCP must be installed).
- Refresh button. The banner also reloads when you come back to the tab after a minute or more.

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
- `extension/manifest.json`: Manifest V3. One content script, only on the SMAX `/saw/` pages.
- `extension/banner.js`: finds the case id in the URL. SMAX changes cases without reloading, so it checks every 0.7 s.
  It then loads the case and loads the contact cards and popups when they're opened.
- `extension/banner.css`: styles, all prefixed `otsmb`. The banner pushes SMAX down by moving `body` and SMAX's two fixed
  bars (`.navbar-fixed-top` and `.pl-entity-page-minimized-header`). If SMAX renames those, its header ends up under the banner.

## Test
`test/shot.js` logs in to OTSM with the qmon service account (headless Chrome in the smexporter image), opens a case,
injects the banner and takes screenshots of each popup. `test/layout.js` lists SMAX's fixed elements. Both need the qmon
repo's `test/api-poc/common.js`. The screenshots hold real case data, so they go to the gitignored `qmon/data/`:

    cd /root/source/qmon && docker run --rm -e CASE=<case> --env-file data/smexporter.env \
      -v $PWD/test/api-poc:/poc:ro -v /root/source/otsm-banner/extension:/ext:ro \
      -v /root/source/otsm-banner/test:/t:ro -v $PWD/data/otsm-banner-shots:/out \
      tsanford/smexporter node /t/shot.js
