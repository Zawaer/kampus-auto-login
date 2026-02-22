// Content script for sanomapro.fi
// Redirects to kampus.sanomapro.fi on the root path

(function(){
    'use strict';

    const extensionApi = globalThis.browser || globalThis.chrome;
    const kampusDirectUrl = 'https://kampus.sanomapro.fi/';
    console.log('Kampus Auto Login: Running on sanomapro.fi');

    // Show a full-screen "Logging in..." overlay with spinner (Shadow DOM to avoid page CSS)
    function showLoginOverlay() {
        try {
            if (document.getElementById('kampus-autologin-overlay')) return;

            const overlay = document.createElement('div');
            overlay.id = 'kampus-autologin-overlay';
            overlay.style.position = 'fixed';
            overlay.style.inset = '0';
            overlay.style.zIndex = '2147483646';

            const shadowRoot = overlay.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = [
                ':host { all: initial; position: fixed; inset: 0; z-index: 2147483646; }',
                '.overlay { width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; }',
                '.card { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 28px 40px; background: #f7f7fb; color: #1f2937; border-radius: 14px; box-shadow: 0 12px 28px rgba(0,0,0,0.2); font-family: "Segoe UI", Roboto, Arial, sans-serif; box-sizing: border-box; }',
                '.spinner { width: 28px; height: 28px; border: 3px solid rgba(0,0,0,0.12); border-top-color: #643695; border-radius: 50%; animation: kampus-spin 0.7s linear infinite; }',
                '.label { font-size: 15px; font-weight: 500; letter-spacing: 0.3px; }',
                '@keyframes kampus-spin { to { transform: rotate(360deg); } }'
            ].join('\n');

            const overlayWrap = document.createElement('div');
            overlayWrap.className = 'overlay';
            const card = document.createElement('div');
            card.className = 'card';
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            const label = document.createElement('div');
            label.className = 'label';
            label.textContent = 'Logging in...';

            card.appendChild(spinner);
            card.appendChild(label);
            overlayWrap.appendChild(card);
            shadowRoot.appendChild(style);
            shadowRoot.appendChild(overlayWrap);

            document.documentElement.appendChild(overlay);
        } catch (e) {}
    }

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
            const path = window.location.pathname;
            // Only redirect on the root/landing page, not subpages like /tuki, /edut, etc.
            if (path === '/' || path === '' || path === '/#') {
                console.log('Kampus Auto Login: Redirecting directly to Kampus page');
                showLoginOverlay();
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
