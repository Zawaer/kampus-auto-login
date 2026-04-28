// Content script for municipality ADFS sign-in pages (sts.edu.<municipality>.fi)
// Clicks the Sign in button when credentials are already autofilled

(function () {
    'use strict';

    const extensionApi = globalThis.browser || globalThis.chrome;

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

        return {
            userLength: userValue.length,
            passLength: passValue.length,
            actuallyFilled: userValue.length > 0 && passValue.length > 0
        };
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

        let finished = false;
        let attemptingContinue = false;

        const tryContinue = () => {
            if (finished || attemptingContinue) {
                return finished;
            }

            attemptingContinue = true;
            try {
                const state = getCredentialState();
                if (state.actuallyFilled && clickSignInButton()) {
                    finished = true;
                    return true;
                }
                return false;
            } finally {
                attemptingContinue = false;
            }
        };

        installFieldWatchers(() => {
            tryContinue();
        });

        // Chrome can show autofill styling before values are committed to the page.
        // Nudge focus/blur and then wait for actual input values only.
        nudgeCredentialFields();
        await new Promise((resolve) => setTimeout(resolve, 1500));

        if (tryContinue()) {
            return;
        }

        let attempts = 0;
        const maxAttempts = 30;
        const interval = setInterval(() => {
            attempts += 1;
            if (attempts % 5 === 0) {
                nudgeCredentialFields();
            }

            if (tryContinue()) {
                clearInterval(interval);
                return;
            }

            if (attempts >= maxAttempts) {
                clearInterval(interval);
                const state = getCredentialState();
                console.log('Kampus Auto Login: ADFS fields never became real input values in time; not clicking Sign in', {
                    userLength: state.userLength,
                    passLength: state.passLength
                });
            }
        }, 400);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runADFSAutomation);
    } else {
        runADFSAutomation();
    }
})();
