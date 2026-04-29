// Popup JavaScript for Kampus Auto Login Extension
// Uses extensionApi from i18n.js (loaded first)

document.addEventListener('DOMContentLoaded', async function() {
    const toggle = document.getElementById('autoLoginToggle');
    const autofillToggle = document.getElementById('autoFillToggle');
    const schoolDisplay = document.getElementById('schoolDisplay');
    const domainDisplay = document.getElementById('domainDisplay');
    const changeLink = document.getElementById('changeMunicipality');

    const lang = await getLanguage();
    applyTranslations(lang);

    await loadSettings(lang);
    toggle.addEventListener('change', handleToggleChange);
    autofillToggle.addEventListener('change', handleAutofillToggleChange);

    changeLink.addEventListener('click', openSettings);

    async function openSettings() {
        try {
            if (extensionApi.runtime?.openOptionsPage) {
                await extensionApi.runtime.openOptionsPage();
                window.close();
                return;
            }

            await new Promise((resolve, reject) => {
                extensionApi.runtime.sendMessage({ action: 'openSetupPage' }, (response) => {
                    if (extensionApi.runtime.lastError) {
                        reject(extensionApi.runtime.lastError);
                        return;
                    }

                    if (response?.opened === false) {
                        reject(new Error(response.error || 'Failed to open settings page'));
                        return;
                    }

                    resolve(response);
                });
            });
            window.close();
        } catch (error) {
            console.error('Error opening settings page:', error);
        }
    }

    async function loadSettings(lang) {
        try {
            const result = await extensionApi.storage.sync.get({
                autoLoginEnabled: true,
                autoFillCredentialsEnabled: true,
                schoolName: '',
                adfsDomain: ''
            });

            toggle.checked = result.autoLoginEnabled;
            autofillToggle.checked = result.autoFillCredentialsEnabled;
            const notSet = t(lang, 'popupNotSet');
            schoolDisplay.textContent = result.schoolName || notSet;
            domainDisplay.textContent = result.adfsDomain || notSet;
            return result;
        } catch (error) {
            console.error('Error loading settings:', error);
            toggle.checked = true;
            autofillToggle.checked = true;
            return {
                autoLoginEnabled: true,
                autoFillCredentialsEnabled: true,
                schoolName: '',
                adfsDomain: ''
            };
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

    async function handleAutofillToggleChange() {
        const isEnabled = autofillToggle.checked;

        try {
            await extensionApi.storage.sync.set({
                autoFillCredentialsEnabled: isEnabled
            });
        } catch (error) {
            console.error('Error saving autofill setting:', error);
            autofillToggle.checked = !isEnabled;
        }
    }

    // Add keyboard support
    document.addEventListener('keydown', function(event) {
        if (event.key === ' ' || event.key === 'Enter') {
            if (event.target === toggle) {
                event.preventDefault();
                toggle.checked = !toggle.checked;
                handleToggleChange();
            } else if (event.target === autofillToggle) {
                event.preventDefault();
                autofillToggle.checked = !autofillToggle.checked;
                handleAutofillToggleChange();
            }
        }
    });
});
