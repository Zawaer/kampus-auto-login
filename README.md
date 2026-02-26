# Kampus Auto Login Browser Extension

This extension automates the login process for Kampus Sanoma Pro by automatically navigating through the authentication flow:

1. Start at `kampus.sanomapro.fi` (automatically redirects to `kirjautuminen.sanomapro.fi`)
2. Automatically clicks the MPASSid login button
3. `mpass-proxy.csc.fi` → automatically continues to `sanomapro.fi`
4. On the `sanomapro.fi` landing page, redirects directly to `https://kampus.sanomapro.fi/`

Demo:

https://github.com/user-attachments/assets/09b93963-7cee-4439-84fa-730497da34e8

<img width="491" height="675" alt="image" src="https://github.com/user-attachments/assets/f37dfcee-73f5-4db2-ac90-ba9218364fd1" />

## Installation

### Chrome / Chromium

1. Download the latest release and unzip it
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" button
5. Select the folder containing this extension (`kampus-auto-login`)
6. The extension should now be installed and active

# Firefox / Zen Browser

1. Download the latest release and unzip it
2. Open Firefox (or Zen) and navigate to about:debugging (or about:debugging#/runtime/this-firefox).
3. Click "This Firefox" in the sidebar.
4. Click "Load Temporary Add-on...".
5. In the file picker select this extension's `manifest.json` (or any file inside the `kampus-auto-login` folder).
6. The extension will load temporarily and appear in the Extensions list; note that it will be removed when Firefox restarts.

## How it works

The extension uses content scripts that run on specific domains:

- **kirjautuminen-content.js**: Automatically clicks the MPASSid login button on the login page
- **mpass-content.js**: Handles the MPASS proxy flow, limited to Kampus/Sanoma Pro redirects
- **adfs-content.js**: Only auto-signs in on ADFS pages when the flow originates from Kampus/Sanoma Pro
- **sanomapro-content.js**: Redirects only on the `sanomapro.fi` root landing page (not subpages)

During the flow the extension shows a full-screen overlay with a subtle spinner and the text "Logging in..." so you can tell the automation is running.

## Security

- This extension only runs on the specified Sanoma Pro and MPASSid domains and ignores unrelated MPASS/ADFS flows
- It doesn't store any personal information or credentials
- It only automates clicking buttons that you would normally click manually

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0).
