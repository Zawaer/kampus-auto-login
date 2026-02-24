// Popup JavaScript for Kampus Auto Login Extension
// Uses extensionApi from i18n.js (loaded first)

document.addEventListener('DOMContentLoaded', async function() {
    const toggle = document.getElementById('autoLoginToggle');
    const schoolDisplay = document.getElementById('schoolDisplay');
    const domainDisplay = document.getElementById('domainDisplay');
    const changeLink = document.getElementById('changeMunicipality');

    const lang = await getLanguage();
    applyTranslations(lang);

    await loadSettings(lang);
    toggle.addEventListener('change', handleToggleChange);

    changeLink.addEventListener('click', function(e) {
        e.preventDefault();
        if (extensionApi.runtime.openOptionsPage) {
            extensionApi.runtime.openOptionsPage();
        } else {
            extensionApi.tabs.create({ url: extensionApi.runtime.getURL('ui/setup.html') });
        }
    });

    async function loadSettings(lang) {
        try {
            const result = await extensionApi.storage.sync.get({
                autoLoginEnabled: true,
                schoolName: '',
                adfsDomain: ''
            });

            toggle.checked = result.autoLoginEnabled;
            const notSet = t(lang, 'popupNotSet');
            schoolDisplay.textContent = result.schoolName || notSet;
            domainDisplay.textContent = result.adfsDomain || notSet;
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
