// Content script for sts.edu.espoo.fi ADFS sign-in page
// Clicks the Sign in button when credentials are already autofilled

(function () {
    'use strict';

    const extensionApi = globalThis.browser || globalThis.chrome;

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
                '.spinner { width: 28px; height: 28px; border: 3px solid rgba(0,0,0,0.12); border-top-color: #2563eb; border-radius: 50%; animation: kampus-spin 0.7s linear infinite; }',
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

    async function isAutoLoginEnabled() {
        try {
            const result = await extensionApi.storage.sync.get({ autoLoginEnabled: true });
            return result.autoLoginEnabled;
        } catch (error) {
            console.error('Kampus Auto Login: Error reading settings on ADFS page', error);
            return true;
        }
    }

    function isVisible(element) {
        if (!element) {
            return false;
        }
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') {
            return false;
        }
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    function credentialsLikelyFilled() {
        const userField = document.querySelector('#userNameInput, input[name="UserName"], input[type="email"], input[type="text"]');
        const passField = document.querySelector('#passwordInput, input[name="Password"], input[type="password"]');

        if (!passField) {
            return false;
        }

        const userValue = (userField && userField.value || '').trim();
        const passValue = (passField.value || '').trim();

        return userValue.length > 0 && passValue.length > 0;
    }

    function clickSignInButton() {
        const signInButton = document.querySelector('#submitButton');
        if (!signInButton || !isVisible(signInButton)) {
            return false;
        }

        try {
            signInButton.focus && signInButton.focus();
            signInButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
            signInButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
            signInButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            if (typeof signInButton.click === 'function') {
                signInButton.click();
            }
            console.log('Kampus Auto Login: Clicked ADFS Sign in button');
            return true;
        } catch (error) {
            console.error('Kampus Auto Login: Failed to click ADFS Sign in button', error);
            return false;
        }
    }

    function isKampusFlow() {
        const allowedHosts = [
            'sanomapro.fi',
            'kampus.sanomapro.fi',
            'kirjautuminen.sanomapro.fi',
            'mpass-proxy.csc.fi'
        ];

        try {
            const params = new URLSearchParams(window.location.search);
            const relayState = params.get('RelayState');
            if (relayState) {
                const decoded = decodeURIComponent(relayState);
                if (allowedHosts.some((host) => decoded.includes(host))) {
                    return true;
                }
            }
        } catch (e) {}

        try {
            const referrer = document.referrer || '';
            if (allowedHosts.some((host) => referrer.includes(host))) {
                return true;
            }
        } catch (e) {}

        return false;
    }

    async function runADFSAutomation() {
        console.log('Kampus Auto Login: Running on sts.edu.espoo.fi ADFS page');

        if (!(await isAutoLoginEnabled())) {
            console.log('Kampus Auto Login: Auto-login disabled, skipping ADFS Sign in click');
            return;
        }

        if (!isKampusFlow()) {
            console.log('Kampus Auto Login: ADFS page not related to Kampus flow, skipping');
            return;
        }

        showLoginOverlay();

        // Give password managers a moment to autofill fields.
        await new Promise((resolve) => setTimeout(resolve, 900));

        if (credentialsLikelyFilled()) {
            if (clickSignInButton()) {
                return;
            }
        }

        let attempts = 0;
        const maxAttempts = 8;
        const interval = setInterval(() => {
            attempts += 1;
            if (credentialsLikelyFilled() && clickSignInButton()) {
                clearInterval(interval);
                return;
            }

            if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.log('Kampus Auto Login: ADFS fields were not autofilled in time; not clicking Sign in');
            }
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runADFSAutomation);
    } else {
        runADFSAutomation();
    }
})();
