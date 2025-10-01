// Popup JavaScript for Kampus Auto Login Extension

document.addEventListener('DOMContentLoaded', async function() {
    const toggle = document.getElementById('autoLoginToggle');
    // No status or current site elements; popup only has the toggle now.

    // Load saved settings and set up listeners
    await loadSettings();
    toggle.addEventListener('change', handleToggleChange);

    async function loadSettings() {
        try {
            const result = await chrome.storage.sync.get({
                autoLoginEnabled: true // Default to enabled
            });

            toggle.checked = result.autoLoginEnabled;
        } catch (error) {
            console.error('Error loading settings:', error);
            toggle.checked = true; // Default fallback
        }
    }

    async function handleToggleChange() {
        const isEnabled = toggle.checked;
        
        try {
            await chrome.storage.sync.set({
                autoLoginEnabled: isEnabled
            });
            // Notification removed: toggling no longer shows a tooltip/notification
            
        } catch (error) {
            console.error('Error saving settings:', error);
            // Revert toggle on error
            toggle.checked = !isEnabled;
        }
    }

    // Status display removed; no updateStatus function.

    // Current-site display removed; no updateCurrentSite function.

    // Refresh functionality removed.

    // The options/settings feature was removed from the popup UI.
    // If you add a dedicated options page later, implement opening it here.

    // showNotification removed: no visual tooltip/notification on toggle

    // Add keyboard support
    document.addEventListener('keydown', function(event) {
        if (event.key === ' ' || event.key === 'Enter') {
            if (event.target === toggle) {
                event.preventDefault();
                toggle.checked = !toggle.checked;
                handleToggleChange();
            }
        }
    });
});

// Background script communication (if needed in the future)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateStatus') {
        // Handle status updates from content scripts
        console.log('Status update from content script:', request.data);
    }
});
