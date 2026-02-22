// Popup JavaScript for Kampus Auto Login Extension

const extensionApi = globalThis.browser || globalThis.chrome;

document.addEventListener('DOMContentLoaded', async function() {
    const toggle = document.getElementById('autoLoginToggle');

    await loadSettings();
    toggle.addEventListener('change', handleToggleChange);

    async function loadSettings() {
        try {
            const result = await extensionApi.storage.sync.get({
                autoLoginEnabled: true
            });

            toggle.checked = result.autoLoginEnabled;
        } catch (error) {
            console.error('Error loading settings:', error);
            toggle.checked = true;
        }
    }

    async function handleToggleChange() {
        const isEnabled = toggle.checked;
        
        try {
            await extensionApi.storage.sync.set({
                autoLoginEnabled: isEnabled
            });
        } catch (error) {
            console.error('Error saving settings:', error);
            toggle.checked = !isEnabled;
        }
    }

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

extensionApi.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateStatus') {
        console.log('Status update from content script:', request.data);
    }
});
