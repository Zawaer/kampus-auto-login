// Content script for sanomapro.fi
// Redirects to kampus.sanomapro.fi on the root path

(function(){
    'use strict';

    const extensionApi = globalThis.browser || globalThis.chrome;
    const contentCommon = globalThis.KampusContentCommon || {};
    const showLoadingOverlay = contentCommon.showLoadingOverlay || (() => false);
    const referrerIncludesKampusHost = contentCommon.referrerIncludesKampusHost || (() => false);
    const hasRecentKampusFlowFlag = contentCommon.hasRecentKampusFlowFlag || (async () => false);
    const kampusDirectUrl = 'https://kampus.sanomapro.fi/';
    console.log('Kampus Auto Login: Running on sanomapro.fi');

    async function autoLoginEnabled() {
        try {
            const res = await extensionApi.storage.sync.get({ autoLoginEnabled: true });
            return res.autoLoginEnabled;
        } catch (e) {
            console.error('Kampus Auto Login: Error reading settings', e);
            return true;
        }
    }

    async function isKampusFlow() {
        if (referrerIncludesKampusHost()) {
            return true;
        }

        return await hasRecentKampusFlowFlag(extensionApi);
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
            const path = window.location.pathname;
            const isLandingPage = path === '/' || path === '' || path === '/#';
            const isTukiPage = path.startsWith('/tuki');

            // Redirect the support page too when it is part of the Kampus flow.
            if (isLandingPage || (isTukiPage && await isKampusFlow())) {
                console.log('Kampus Auto Login: Redirecting directly to Kampus page');
                const uiLanguage = await getLanguage();
                showLoadingOverlay(t(uiLanguage, 'commonLoggingInLabel'));
                window.location.assign(kampusDirectUrl);
            } else {
                console.log('Kampus Auto Login: On sanomapro subpage', path, '— not redirecting');
            }
            return;
        }

        console.log('Kampus Auto Login: Host does not require sanomapro redirect');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runSanomaProRedirect);
    } else {
        runSanomaProRedirect();
    }

})();
