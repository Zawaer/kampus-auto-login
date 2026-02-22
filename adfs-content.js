// Content script for sts.edu.espoo.fi ADFS sign-in page
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

    async function runADFSAutomation() {
        console.log('Kampus Auto Login: Running on sts.edu.espoo.fi ADFS page');

        if (!(await isAutoLoginEnabled())) {
            console.log('Kampus Auto Login: Auto-login disabled, skipping ADFS Sign in click');
            return;
        }

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
