(function(){
    'use strict';

    const extensionApi = globalThis.browser || globalThis.chrome;
    const kampusDirectUrl = 'https://kampus.sanomapro.fi/';
    console.log('Kampus Auto Login: Running on sanomapro.fi (direct redirect mode)');

    async function autoLoginEnabled() {
        try {
            const res = await extensionApi.storage.sync.get({ autoLoginEnabled: true });
            return res.autoLoginEnabled;
        } catch (e) {
            console.error('Kampus Auto Login: Error reading settings', e);
            return true;
        }
    }

    async function runSanomaProRedirect() {
        if (!await autoLoginEnabled()) {
            console.log('Kampus Auto Login: Auto-login disabled; will not redirect on sanomapro');
            return;
        }

        const host = window.location.hostname;
        if (host.includes('kampus.sanomapro.fi')) {
            console.log('Kampus Auto Login: Already on kampus host; no redirect needed');
            return;
        }

        if (host === 'sanomapro.fi' || host === 'www.sanomapro.fi') {
            if (window.location.href !== kampusDirectUrl) {
                console.log('Kampus Auto Login: Redirecting directly to Kampus school page');
                window.location.assign(kampusDirectUrl);
            }
            return;
        }

        console.log('Kampus Auto Login: Host does not require sanomapro redirect');
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runSanomaProRedirect);
    } else {
        runSanomaProRedirect();
    }

})();
