# Kampus Auto Login Browser Extension

Kampus Auto Login speeds up the Sanoma Pro Kampus sign-in flow by automatically handling repetitive navigation and button clicks.

**Disclaimer:** Kampus Auto Login is an unofficial browser extension and is not affiliated with, endorsed by, or supported by Sanoma Pro, MPASSid, or any school or municipality.

<img width="2560" height="1600" alt="Promo" src="https://github.com/user-attachments/assets/219a486c-6970-4abd-ac95-8a75f9c60615" />

## What it does

When enabled, the extension automates the login process for Sanoma Pro Kampus:

1. `kampus.sanomapro.fi` → `kirjautuminen.sanomapro.fi`
2. Clicks the MPASSid login button
3. Selects your configured school on `mpass-proxy.csc.fi` when that school is supported
4. Uses the configured school login domain for the municipality/school login page
5. Continues the login after your browser has autofilled saved credentials
6. Redirects from the `sanomapro.fi` landing page back to `https://kampus.sanomapro.fi/`

If the selected school is not supported yet, the extension lets you save the school but skips login automation for it.

https://github.com/user-attachments/assets/fb2a64f0-5d0d-466a-a311-19aea632caf8

## Installation

### Install from the browser stores

- Chrome Web Store: https://chromewebstore.google.com/detail/kampus-auto-login/jnlidjmljocgjaapbnmfjbkcmghmogkd
- Firefox Add-ons: https://addons.mozilla.org/en-US/firefox/addon/kampus-auto-login/

### Or build it locally

Build browser-specific packages first:

```bash
node scripts/build-variants.mjs
```

This creates:

- `dist/chrome/`
- `dist/firefox/`

Create uploadable zips for both browsers:

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

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `dist/firefox/manifest.json`.
4. Temporary add-ons are removed when the browser restarts.

## First-time setup

1. Click the extension icon and open **Settings**.
2. In **Koulun nimi / School name**, start typing and select your school from the dropdown.
3. If your school is supported, **Kirjautumisosoite / Login domain** is filled and locked automatically.
4. If your school is not supported yet, you can still save it and use the support request link in settings.
5. Click **Tallenna / Save**.
6. Allow the requested permission for that exact login domain when prompted.
7. Return to Kampus and sign in; after that, the extension can automate the flow when enabled.

## Browser variants

The user experience is slightly different between browsers on the municipality login page:

- Firefox usually continues immediately once the browser has autofilled your credentials. This requires no user intervention.
- Chrome often needs one extra click or key press on the login page before the autofilled credentials become visible and the extension can continue.

## Permissions and privacy

The extension stores only the settings needed for login automation in browser extension storage, such as selected school, login domain, language, and toggle states. If browser sync is enabled, those settings may sync between the user’s browsers.

On Chrome/Chromium and Firefox, the extension requests access to the exact supported login domain selected during setup. The broader `https://*/adfs/ls/*` pattern is declared only as an optional permission template so the extension can ask for the specific selected domain at runtime.

It does not store your password or other sensitive personal data.

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0).
