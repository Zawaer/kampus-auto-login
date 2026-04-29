# Kampus Auto Login Browser Extension

Kampus Auto Login speeds up the Sanoma Pro Kampus sign-in flow by automatically handling repetitive navigation and button clicks.

## What it does

When enabled, the extension automates this flow:

1. `kampus.sanomapro.fi` → `kirjautuminen.sanomapro.fi`
2. Clicks the MPASSid login button
3. Continues through `mpass-proxy.csc.fi`
4. Handles your school login page automatically
5. Redirects from the `sanomapro.fi` landing page back to `https://kampus.sanomapro.fi/`

https://github.com/user-attachments/assets/df75f88c-db5c-43bb-a896-f4618fda40c9

## Installation

Install directly from browser stores:

- Chrome Web Store: https://chromewebstore.google.com/detail/kampus-auto-login/jnlidjmljocgjaapbnmfjbkcmghmogkd
- Firefox Add-ons: https://addons.mozilla.org/en-US/firefox/addon/kampus-auto-login/

Build browser-specific packages first:

```bash
node scripts/build-variants.mjs
```

This creates:

- `dist/chrome/`
- `dist/firefox/`

Create upload zips for both browsers:

```bash
node scripts/package-variants.mjs
```

This creates:

- `dist/releases/kampus-auto-login-chrome-v<version>.zip`
- `dist/releases/kampus-auto-login-firefox-v<version>.zip`

### Chrome / Chromium

1. Download the extension source/release and unzip it.
2. Open `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `dist/chrome` folder.

### Firefox / Zen

Temporary install (for local testing):

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `dist/firefox/manifest.json`.
4. Note: temporary add-ons are removed when the browser restarts.

## Quick tutorial (first-time setup)

1. Click the extension icon and open **Change settings**.
2. In **Koulun nimi / School name**, start typing and select your school from the dropdown.
3. In **Kirjautumisosoite / Login domain**, enter your municipality/school ADFS domain (example: `sts.edu.espoo.fi`).
4. Click **Tallenna / Save**.
5. Allow the requested permission for that exact login domain when prompted.
6. Return to Kampus and sign in; after that, the extension can automate the flow when enabled.

## Permissions and privacy

This extension only stores the settings needed to automate login (school name, login domain, on/off state, and language), and those settings stay in your browser's extension storage.

It does not store your password or other sensitive personal data.

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0).
