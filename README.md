# Kampus Auto Login Chrome Extension

This Chrome extension automates the login process for Kampus Sanoma Pro by automatically navigating through the authentication flow:

1. Start at `kampus.sanomapro.fi` (automatically redirects to `kirjautuminen.sanomapro.fi`)
2. Automatically clicks the MPASSid login button
3. `mpass-proxy.csc.fi` → automatically continues to `sanomapro.fi`

## Installation

### Method 1: Developer Mode (Recommended for testing)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" button
4. Select the folder containing this extension (`kampus-login`)
5. The extension should now be installed and active

### Method 2: Package as .crx (For distribution)

1. In Chrome, go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Pack extension"
4. Select the extension folder
5. This will create a `.crx` file that can be shared

## How it works

The extension uses content scripts that run on specific domains:

- **kirjautuminen-content.js**: Automatically clicks the MPASSid login button on the login page
- **mpass-content.js**: Automatically submits forms or clicks continue buttons on the MPASS proxy page

## UI Features

- **Toggle Switch**: Enable/disable auto-login functionality through the extension popup
- **Status Display**: Shows current auto-login status and which site you're currently on
- **Test Button**: Refresh status and test automation on the current page

## Debugging

If the extension doesn't work as expected:

1. Open Chrome Developer Tools (F12)
2. Check the Console tab for messages starting with "Kampus Auto Login:"
3. The extension logs its actions and any issues it encounters

## Security Notes

- This extension only runs on the specified Sanoma Pro and MPASS domains
- It doesn't store any personal information or credentials
- It only automates clicking buttons that you would normally click manually

## Troubleshooting

If the automation fails:

1. Check that the extension is enabled in `chrome://extensions/`
2. Verify that the websites haven't changed their button layouts
3. Look at the console logs to see what elements the extension found
4. You may need to update the selectors in the content scripts if the websites change

## Customization

You can modify the content scripts to handle different button selectors or add delays if needed. The scripts are designed to be robust and try multiple approaches to find the right elements to click.
