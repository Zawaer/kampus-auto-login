# Kampus Auto Login Browser Extension

Kampus Auto Login speeds up the Sanoma Pro Kampus sign-in flow by automatically handling repetitive navigation and button clicks.

## What it does

When enabled, the extension automates this flow:

1. `kampus.sanomapro.fi` → `kirjautuminen.sanomapro.fi`
2. Clicks the MPASSid login button
3. Continues through `mpass-proxy.csc.fi`
4. Handles the ADFS login page for your configured domain
5. Redirects from the `sanomapro.fi` landing page back to `https://kampus.sanomapro.fi/`

Demo video:

https://github.com/user-attachments/assets/57f13908-639c-4317-8e72-133216f97c81

<img width="491" height="675" alt="image" src="https://github.com/user-attachments/assets/f37dfcee-73f5-4db2-ac90-ba9218364fd1" />

## Installation

### Chrome / Chromium

1. Download the extension source/release and unzip it.
2. Open `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `kampus-auto-login` folder.

### Firefox / Zen

Temporary install (for local testing):

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `manifest.json` from this project.
4. Note: temporary add-ons are removed when the browser restarts.

## Quick tutorial (first-time setup)

1. Click the extension icon and open **Change settings**.
2. Choose language (Suomi / English).
3. In **Koulun nimi / School name**, start typing and select your school from the dropdown.
4. In **Kirjautumisosoite / Login domain**, enter your municipality/school ADFS domain (example: `sts.edu.espoo.fi`).
5. Click **Tallenna / Save**.
6. Return to Kampus and sign in; after that, the extension can automate the flow when enabled.

## Configuration and popup

- **Enable Auto Login** toggle controls whether automation runs.
- Popup shows the currently saved school and login domain.
- Settings are stored in browser sync storage (`schoolName`, `adfsDomain`, `autoLoginEnabled`, `language`).

## How it works

The extension uses content scripts that run on specific domains:

- `scripts/kirjautuminen-content.js` — clicks the MPASSid login button on the login page
- `scripts/mpass-content.js` — handles MPASS proxy flow logic
- `scripts/adfs-content.js` — handles ADFS page automation with flow checks
- `scripts/sanomapro-content.js` — redirects from Sanoma Pro landing page to Kampus

Background and UI files:

- `background.js` — background message handling
- `ui/popup.html`, `ui/popup.js`, `ui/popup.css` — popup UI
- `ui/setup.html`, `ui/setup.js`, `ui/i18n.js` — setup page and translations

## Permissions and privacy

- Uses `storage` and `tabs` permissions.
- Runs only on declared host permissions in `manifest.json`.
- Does not store credentials or personal identity data.
- Automates actions you would otherwise do manually.

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0).
