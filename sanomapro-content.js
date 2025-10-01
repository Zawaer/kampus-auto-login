(function(){
    'use strict';
    console.log('Kampus Auto Login: Running on sanomapro.fi');

    async function shouldRedirect() {
        try {
            const res = await chrome.storage.sync.get({ autoLoginEnabled: true });
            return res.autoLoginEnabled;
        } catch (e) {
            console.error('Kampus Auto Login: Error reading settings', e);
            return true;
        }
    }

    // Safety: limit retry attempts to avoid infinite loops
    const REDIRECT_FLAG = 'kampus_auto_redirected';
    const REDIRECT_ATTEMPTS = 'kampus_auto_redirect_attempts';
    const MAX_ATTEMPTS = 3;

    (async function run() {
        if (!await shouldRedirect()) {
            console.log('Kampus Auto Login: Auto-login disabled; will not redirect from sanomapro');
            return;
        }

        try {
            // If we're already on kampus.sanomapro, nothing to do
            if (window.location.hostname.includes('kampus.sanomapro.fi')) {
                return;
            }

            const target = 'https://kampus.sanomapro.fi/';

            // Use sessionStorage on the page to avoid cross-tab/global persistence
            const hasFlag = sessionStorage.getItem(REDIRECT_FLAG);
            const attempts = parseInt(sessionStorage.getItem(REDIRECT_ATTEMPTS) || '0', 10) || 0;

            if (hasFlag) {
                if (attempts >= MAX_ATTEMPTS) {
                    console.log('Kampus Auto Login: Redirect previously attempted', attempts, 'times; giving up');
                    return;
                }

                // Retry redirect (previous attempt likely failed); increment attempts and replace location
                const next = attempts + 1;
                sessionStorage.setItem(REDIRECT_ATTEMPTS, String(next));
                console.log('Kampus Auto Login: Previous redirect flag present; retrying redirect attempt', next);
                // Use replace to avoid polluting history
                location.replace(target);
                return;
            }

            // First attempt: set flag and attempts, then redirect
            sessionStorage.setItem(REDIRECT_FLAG, '1');
            sessionStorage.setItem(REDIRECT_ATTEMPTS, '1');
            console.log('Kampus Auto Login: Redirecting to', target);
            location.replace(target);
        } catch (e) {
            console.error('Kampus Auto Login: Error during sanomapro redirect', e);
        }
    })();
})();
