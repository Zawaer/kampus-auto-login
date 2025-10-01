# Kampus Auto Login Chrome Extension

This Chrome extension automates the login process for Kampus Sanoma Pro by automatically navigating through the authentication flow:

1. Start at `kampus.sanomapro.fi` (automatically redirects to `kirjautuminen.sanomapro.fi`)
2. Automatically clicks the MPASSid login button
3. `mpass-proxy.csc.fi` → automatically continues to `sanomapro.fi`

<img width="491" height="675" alt="image" src="https://github.com/user-attachments/assets/f37dfcee-73f5-4db2-ac90-ba9218364fd1" />

## Installation

### Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" button
4. Select the folder containing this extension (`kampus-login`)
5. The extension should now be installed and active

# Firefox

1. Open Firefox and navigate to about:debugging (or about:debugging#/runtime/this-firefox).
2. Click "This Firefox" in the sidebar.
3. Click "Load Temporary Add-on...".
4. In the file picker select this extension's `manifest.json` (or any file inside the `kampus-auto-login` folder).
5. The extension will load temporarily and appear in the Extensions list; note that it will be removed when Firefox restarts.

## How it works

The extension uses content scripts that run on specific domains:

- **kirjautuminen-content.js**: Automatically clicks the MPASSid login button on the login page
- **mpass-content.js**: Automatically submits forms or clicks continue buttons on the MPASS proxy page

## Security

- This extension only runs on the specified Sanoma Pro and MPASSid domains
- It doesn't store any personal information or credentials
- It only automates clicking buttons that you would normally click manually

## License

This project is licensed under the MIT License.
