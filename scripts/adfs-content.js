// Content script for municipality ADFS sign-in pages (sts.edu.<municipality>.fi)
// Clicks the Sign in button when credentials are already autofilled

(function () {
    'use strict';

    const extensionApi = globalThis.browser || globalThis.chrome;
    const isFirefoxLikeBrowser = /Firefox\//.test(navigator.userAgent || '');

    async function getUiLanguage() {
        try {
            const result = await extensionApi.storage.sync.get({ language: 'en' });
            return result.language === 'fi' ? 'fi' : 'en';
        } catch (e) {
            return 'en';
        }
    }

    function getClickToContinueLabel(lang) {
        return lang === 'en'
            ? 'Click anywhere or press any key to continue'
            : 'Jatka napsauttamalla mitä tahansa tai painamalla mitä tahansa näppäintä';
    }

    function getClickToContinueDescription(lang) {
        return lang === 'en'
            ? 'Chrome needs page focus before the extension can continue.'
            : 'Chrome tarvitsee sivun fokuksen ennen kuin laajennus voi jatkaa.';
    }

    function showContinueHint(titleMessage, subtitleMessage) {
        try {
            if (document.getElementById('kampus-autologin-hint')) return;

            const host = document.createElement('div');
            host.id = 'kampus-autologin-hint';
            host.style.position = 'fixed';
            host.style.inset = '0';
            host.style.zIndex = '2147483646';
            host.style.pointerEvents = 'none';

            const shadowRoot = host.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = [
                ':host { all: initial; position: fixed; inset: 0; z-index: 2147483646; pointer-events: none; }',
                '.overlay { width: 100vw; height: 100vh; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; }',
                '.card { display: flex; flex-direction: column; align-items: center; gap: 10px; width: min(440px, calc(100vw - 32px)); padding: 28px 32px; background: #f7f7fb; color: #1f2937; border-radius: 14px; box-shadow: 0 12px 28px rgba(0,0,0,0.2); font-family: "Segoe UI", Roboto, Arial, sans-serif; box-sizing: border-box; text-align: center; }',
                '.title { font-size: 18px; font-weight: 600; color: #643695; line-height: 1.3; }',
                '.subtitle { font-size: 14px; line-height: 1.45; color: #495057; }'
            ].join('\n');

            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            const card = document.createElement('div');
            card.className = 'card';
            const title = document.createElement('div');
            title.className = 'title';
            title.textContent = titleMessage;
            const subtitle = document.createElement('div');
            subtitle.className = 'subtitle';
            subtitle.textContent = subtitleMessage;

            card.appendChild(title);
            card.appendChild(subtitle);
            overlay.appendChild(card);
            shadowRoot.appendChild(style);
            shadowRoot.appendChild(overlay);
            document.documentElement.appendChild(host);
        } catch (e) {}
    }

    function hideContinueHint() {
        try {
            const hint = document.getElementById('kampus-autologin-hint');
            if (hint) {
                hint.style.opacity = '0';
                hint.style.transition = 'opacity 0.2s ease';
                setTimeout(() => { try { hint.remove(); } catch (e) {} }, 250);
            }
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
        if (isFirefoxLikeBrowser) {
            return;
        }

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
            if (isFirefoxLikeBrowser) {
                if (typeof signInButton.click === 'function') {
                    signInButton.click();
                } else if (form && typeof form.requestSubmit === 'function') {
                    form.requestSubmit(signInButton);
                }
                console.log('Kampus Auto Login: Clicked ADFS Sign in button (Firefox-like)');
                return true;
            }

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

        const uiLanguage = await getUiLanguage();
        if (!isFirefoxLikeBrowser) {
            showContinueHint(
                getClickToContinueLabel(uiLanguage),
                getClickToContinueDescription(uiLanguage)
            );
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
                    hideContinueHint();
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

        if (tryContinue()) {
            return;
        }

        if (!isFirefoxLikeBrowser) {
            // Chrome can show autofill styling before values are committed to the page.
            // Nudge focus/blur and then wait for actual input values only.
            nudgeCredentialFields();
        }

        await new Promise((resolve) => setTimeout(resolve, isFirefoxLikeBrowser ? 300 : 1500));

        if (tryContinue()) {
            return;
        }

        let attempts = 0;
        const maxAttempts = isFirefoxLikeBrowser ? 24 : null;
        const interval = setInterval(() => {
            attempts += 1;
            if (!isFirefoxLikeBrowser && attempts % 5 === 0) {
                nudgeCredentialFields();
            }

            if (tryContinue()) {
                clearInterval(interval);
                return;
            }

            if (maxAttempts && attempts >= maxAttempts) {
                clearInterval(interval);
                const state = getCredentialState();
                console.log('Kampus Auto Login: ADFS fields never became real input values in time; not clicking Sign in', {
                    userLength: state.userLength,
                    passLength: state.passLength,
                    browser: isFirefoxLikeBrowser ? 'firefox-like' : 'chromium-like'
                });
            }
        }, isFirefoxLikeBrowser ? 250 : 400);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runADFSAutomation);
    } else {
        runADFSAutomation();
    }
})();
