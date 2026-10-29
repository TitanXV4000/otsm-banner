# OTSM case banner

A Chrome/Edge extension that adds a one-line banner, in OTSM's header navy, to the top of every OTSM (SMAX) case page
(`https://us42-smax.saas.microfocus.com/saw/Request/<id>/...`). The layout follows the old Salesforce case header,
with a small label over each value:

- **Case** (click to copy), **Title** (first 60 characters; hover for all of it), **Status** and **Priority** badges, **Owner**,
  **Customer**, **Account**, **Created**, **Updated**.
- **Customer** and **Account** names: hover for a contact card (email, phones, time zone with the local time there, location;
  account number, region, headquarters). Click to keep it open.
- Case icon next to the customer: their other cases, or the whole account's, newest first, with links. The current case
  is highlighted and closed cases are greyed.
- Shield icon next to the account: its entitlements. Columns: entitlement number (link), product, support plan,
  contract, start, end, state, and a ✓ when the case's contact is one of the entitlement's **Entitled users**.
  In-use entitlements are listed first, then the latest end date. The case's own entitlement is highlighted.
  Entitlements another company delegated to this account are included and say who owns them.
- **FTS**: opens the case's FTS host account in WinSCP (`winscp-ftp://` link; WinSCP must be installed).
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
- `extension/banner.css`: styles, all prefixed `otsmb`. Entitled users are the `EntitlementToViewCaseUsers` relation (a contact's: `Person/<id>/associations/ViewCaseUsersToEntitlement`).
  The banner pushes SMAX down by moving `body` and SMAX's two fixed
  bars (`.navbar-fixed-top` and `.pl-entity-page-minimized-header`). If SMAX renames those, its header ends up under the banner.

## Test
`test/shot.js` logs in to OTSM with the qmon service account (headless Chrome in the smexporter image), opens a case,
injects the banner and takes screenshots of each popup. `test/layout.js` lists SMAX's fixed elements. Both need the qmon
repo's `test/api-poc/common.js`. The screenshots hold real case data, so they go to the gitignored `qmon/data/`:

    cd /root/source/qmon && docker run --rm -e CASE=<case> --env-file data/smexporter.env \
      -v $PWD/test/api-poc:/poc:ro -v /root/source/otsm-banner/extension:/ext:ro \
      -v /root/source/otsm-banner/test:/t:ro -v $PWD/data/otsm-banner-shots:/out \
      tsanford/smexporter node /t/shot.js
