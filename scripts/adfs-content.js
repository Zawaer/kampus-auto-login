// Content script for municipality ADFS sign-in pages (sts.edu.<municipality>.fi)
// Clicks the Sign in button when credentials are already autofilled

(function () {
    'use strict';

    const extensionApi = globalThis.browser || globalThis.chrome;

    async function getUiLanguage() {
        try {
            const result = await extensionApi.storage.sync.get({ language: 'en' });
            return result.language === 'fi' ? 'fi' : 'en';
        } catch (e) {
            return 'en';
        }
    }

    function getLoggingInLabel(lang) {
        return lang === 'en' ? 'Logging in...' : 'Kirjaudutaan...';
    }

    // Show a full-screen "Logging in..." overlay with spinner (Shadow DOM to avoid page CSS)
    function showLoginOverlay(message) {
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
            label.textContent = message;

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

    async function isAutofillAutoContinueEnabled() {
        try {
            const result = await extensionApi.storage.sync.get({ autoFillCredentialsEnabled: true });
            return result.autoFillCredentialsEnabled;
        } catch (error) {
            console.error('Kampus Auto Login: Error reading autofill setting on ADFS page', error);
            return true;
        }
    }

    function hideLoginOverlay() {
        try {
            const overlay = document.getElementById('kampus-autologin-overlay');
            if (overlay) {
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 0.2s ease';
                setTimeout(() => { try { overlay.remove(); } catch (e) {} }, 250);
            }
        } catch (e) {}
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

    function getAdfsElements() {
        const userField = document.querySelector('#userNameInput, input[name="UserName"], input[type="email"], input[type="text"]');
        const passField = document.querySelector('#passwordInput, input[name="Password"], input[type="password"]');
        const signInButton = document.querySelector('#submitButton');
        const form = (signInButton && signInButton.form) || (passField && passField.form) || document.querySelector('form');

        return { userField, passField, signInButton, form };
    }

    function getCredentialState() {
        const { userField, passField } = getAdfsElements();
        const userValue = (userField && userField.value || '').trim();
        const passValue = (passField && passField.value || '').trim();

        let userLooksAutofilled = false;
        let passLooksAutofilled = false;
        try {
            userLooksAutofilled = !!(userField && typeof userField.matches === 'function' && userField.matches(':-webkit-autofill'));
        } catch (e) {}
        try {
            passLooksAutofilled = !!(passField && typeof passField.matches === 'function' && passField.matches(':-webkit-autofill'));
        } catch (e) {}

        return {
            hasUserField: !!userField,
            hasPassField: !!passField,
            userVisible: !!(userField && isVisible(userField)),
            passVisible: !!(passField && isVisible(passField)),
            userLength: userValue.length,
            passLength: passValue.length,
            userLooksAutofilled,
            passLooksAutofilled,
            actuallyFilled: userValue.length > 0 && passValue.length > 0
        };
    }

    function logCredentialState(prefix) {
        const state = getCredentialState();
        console.log('Kampus Auto Login:', prefix, {
            hasUserField: state.hasUserField,
            hasPassField: state.hasPassField,
            userVisible: state.userVisible,
            passVisible: state.passVisible,
            userLength: state.userLength,
            passLength: state.passLength,
            userLooksAutofilled: state.userLooksAutofilled,
            passLooksAutofilled: state.passLooksAutofilled,
            actuallyFilled: state.actuallyFilled
        });
        return state;
    }

    function credentialsActuallyFilled() {
        return getCredentialState().actuallyFilled;
    }

    function nudgeField(field) {
        if (!field) {
            return;
        }

        try {
            field.focus();
        } catch (e) {}

        try {
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            field.dispatchEvent(new Event('blur', { bubbles: true }));
        } catch (e) {}

        try {
            field.blur();
        } catch (e) {}
    }

    function nudgeCredentialFields() {
        const { userField, passField } = getAdfsElements();
        nudgeField(userField);
        nudgeField(passField);
    }

    function clickSignInButton() {
        const { userField, passField, signInButton, form } = getAdfsElements();
        if (!signInButton || !isVisible(signInButton) || signInButton.disabled) {
            return false;
        }

        try {
            nudgeField(userField);
            nudgeField(passField);
            signInButton.focus && signInButton.focus();
            signInButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
            signInButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
            signInButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            if (typeof signInButton.click === 'function') {
                signInButton.click();
            }

            if (form && typeof form.requestSubmit === 'function') {
                setTimeout(() => {
                    try {
                        if (window.location.pathname.startsWith('/adfs/ls/')) {
                            form.requestSubmit(signInButton);
                        }
                    } catch (e) {}
                }, 250);
            }

            console.log('Kampus Auto Login: Clicked ADFS Sign in button');
            return true;
        } catch (error) {
            console.error('Kampus Auto Login: Failed to click ADFS Sign in button', error);
            return false;
        }
    }

    function installFieldWatchers(onFilled) {
        const { userField, passField } = getAdfsElements();
        const fields = [userField, passField].filter(Boolean);

        for (const field of fields) {
            const handler = () => {
                if (credentialsActuallyFilled()) {
                    onFilled();
                }
            };
            field.addEventListener('input', handler, { passive: true });
            field.addEventListener('change', handler, { passive: true });
            field.addEventListener('blur', handler, { passive: true });
            field.addEventListener('focus', handler, { passive: true });
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
        const currentHost = window.location.hostname;
        let configuredDomain;
        try {
            const result = await extensionApi.storage.sync.get({ adfsDomain: '' });
            configuredDomain = result.adfsDomain;
        } catch (e) {
            configuredDomain = '';
        }

        if (!configuredDomain) {
            console.log('Kampus Auto Login: No ADFS domain configured, skipping. Open extension options to set your login domain.');
            return;
        }

        if (currentHost !== configuredDomain) {
            return;
        }

        console.log('Kampus Auto Login: Running on', currentHost, 'ADFS page');

        if (!(await isAutoLoginEnabled())) {
            console.log('Kampus Auto Login: Auto-login disabled, skipping ADFS Sign in click');
            return;
        }

        if (!(await isAutofillAutoContinueEnabled())) {
            console.log('Kampus Auto Login: Autofill auto-continue disabled, skipping ADFS auto-click');
            return;
        }

        if (!isKampusFlow()) {
            console.log('Kampus Auto Login: ADFS page not related to Kampus flow, skipping');
            return;
        }

        // Hidden for Chrome autofill debugging: avoid any chance that the overlay affects focus/autofill behavior.
        logCredentialState('Initial ADFS credential state');

        let finished = false;
        let lastLoggedStateKey = '';

        const tryContinue = (reason = 'periodic check') => {
            if (finished) {
                return true;
            }

            const state = getCredentialState();
            const stateKey = `${state.userLength}:${state.passLength}:${state.userLooksAutofilled}:${state.passLooksAutofilled}`;
            if (stateKey !== lastLoggedStateKey) {
                lastLoggedStateKey = stateKey;
                console.log('Kampus Auto Login: ADFS credential check', {
                    reason,
                    userLength: state.userLength,
                    passLength: state.passLength,
                    userLooksAutofilled: state.userLooksAutofilled,
                    passLooksAutofilled: state.passLooksAutofilled,
                    actuallyFilled: state.actuallyFilled
                });
            }

            if (state.actuallyFilled && clickSignInButton()) {
                finished = true;
                return true;
            }
            return false;
        };

        installFieldWatchers(() => {
            tryContinue('field event');
        });

        // Chrome can show autofill styling before values are committed to the page.
        // Nudge focus/blur and then wait for actual input values only.
        nudgeCredentialFields();
        await new Promise((resolve) => setTimeout(resolve, 1500));

        if (tryContinue('after initial wait')) {
            return;
        }

        let attempts = 0;
        const maxAttempts = 30;
        const interval = setInterval(() => {
            attempts += 1;
            if (attempts % 5 === 0) {
                nudgeCredentialFields();
            }

            if (tryContinue(`poll ${attempts}`)) {
                clearInterval(interval);
                return;
            }

            if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.log('Kampus Auto Login: ADFS fields never became real input values in time; not clicking Sign in');
                logCredentialState('Final ADFS credential state before giving up');
            }
        }, 400);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runADFSAutomation);
    } else {
        runADFSAutomation();
    }
})();
