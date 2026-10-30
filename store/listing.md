# Chrome Web Store listing

Paste these into the developer dashboard (Items > OTSM case banner). Images: `store/img/` (made by `store/make.js`).
Upload zip: `store/upload/otsm-banner-<version>-chrome-store.zip` (made by `site/build.sh` / `site/deploy.sh`).

## Store listing tab

**Summary** (from the manifest's description; the dashboard shows it, it isn't typed in)

**Description**

    The key facts of every OTSM (SMAX) case in one line at the top of the page, so you don't have to scroll or open
    tabs to find them.

    For support engineers who work in OpenText Service Manager at us42-smax.saas.microfocus.com.

    • Case number, title, priority, status, owner, contact, account, Product Dev ID, created and updated dates
    • Contact card: email, office and mobile phone (calls with Jabber; pencil to edit the number first), local time
    • Account card: account number, region, local time, support team (TAM, SAM and others) and special handling notes
    • The contact's and the account's other cases, including cases you follow
    • The account's entitlements, with the case's own highlighted
    • FTS host and customer accounts open in WinSCP or your FTP program; right-click to copy the address
    • Change a case's status straight from your case lists, without opening the case (can be turned off)
    • Optionally start case lists with the case preview pane collapsed
    • Choose the fields, their order, the colours and more in Settings

    Everything comes from OTSM with your own sign-in, so it shows only what you can already see. No data leaves your
    browser: no server, no analytics, no tracking.

    This is an independent tool. It is not made, endorsed or supported by OpenText or Micro Focus.

    More, with the changelog: https://trevman.com/otsm-banner/

**Category:** Workflow & Planning (or Tools)
**Language:** English
**Store icon:** `extension/icons/icon-128.png`
**Screenshots (1280x800):** `store/img/1-banner.png` … `5-settings.png`, in that order
**Small promo tile (440x280):** `store/img/promo-440x280.png`
**Homepage URL:** https://trevman.com/otsm-banner/
**Support URL:** https://trevman.com/otsm-banner/

## Privacy tab

**Single purpose**

    Shows the details of the OTSM (SMAX) case being viewed in a banner at the top of the page, with related contact,
    account and case information, and lets the user change a case's status from OTSM's case lists.

**Permission justifications**

- **storage:** Saves the user's settings for the banner (fields shown, their order, colours and similar options).
- **Host permission (https://us42-smax.saas.microfocus.com/*):** The banner runs on OTSM pages and reads the case,
  contact and account details from OTSM's own API with the user's existing sign-in. OTSM moves between its sections
  without reloading the page, so the extension needs the whole site to be ready when the user opens a case.
- **Remote code:** No, I am not using remote code. (All code is in the package.)

**Data usage** (what the form calls "collect" includes data the extension reads and shows, even if nothing leaves the browser)

- Tick: **Personally identifiable information** (contact names, emails, phone numbers shown on the case's cards) and
  **Website content** (case details read from OTSM).
- Leave everything else unticked.
- Tick all three certifications: not sold to third parties; not used for purposes unrelated to the item's single
  purpose; not used for creditworthiness or lending.

**Privacy policy URL:** https://trevman.com/otsm-banner/privacy.html

## Distribution tab

**Visibility:** Unlisted. **Regions:** all.
