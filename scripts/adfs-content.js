// Content script for municipality ADFS sign-in pages (sts.edu.<municipality>.fi)
// Clicks the Sign in button when credentials are already autofilled

(function () {
    'use strict';

    const browserApi = globalThis.browser || globalThis.chrome;
    const contentCommon = globalThis.KampusContentCommon || {};
    const createShadowHost = contentCommon.createShadowHost || (() => null);
    const appendShadowStyles = contentCommon.appendShadowStyles || (() => null);
    const isVisible = contentCommon.isVisible || (() => false);
    const showLoadingOverlay = contentCommon.showLoadingOverlay || (() => false);
    const removeElementWithFade = contentCommon.removeElementWithFade || (() => false);
    const includesKampusHost = contentCommon.includesKampusHost || (() => false);
    const referrerIncludesKampusHost = contentCommon.referrerIncludesKampusHost || (() => false);
    const isFirefoxLikeBrowser = /Firefox\//.test(navigator.userAgent || '');
    const svgNamespace = 'http://www.w3.org/2000/svg';

    function createSvgElement(tagName, attributes) {
        const element = document.createElementNS(svgNamespace, tagName);
        Object.entries(attributes || {}).forEach(([name, value]) => {
            element.setAttribute(name, value);
        });
        return element;
    }

    function createAnimatedCircle({ strokeWidth, opacityValues, begin }) {
        const circle = createSvgElement('circle', {
            cx: '70',
            cy: '70',
            fill: 'none',
            stroke: 'var(--color-accent)',
            'stroke-width': strokeWidth
        });
        circle.appendChild(createSvgElement('animate', {
            attributeName: 'r',
            values: '0;48',
            dur: '1.8s',
            begin,
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keySplines: '0.22 1 0.36 1'
        }));
        circle.appendChild(createSvgElement('animate', {
            attributeName: 'opacity',
            values: opacityValues,
            dur: '1.8s',
            begin,
            repeatCount: 'indefinite',
            calcMode: 'spline',
            keySplines: '0.22 1 0.36 1'
        }));
        return circle;
    }

    function createCursorAnimationSvg() {
        const svg = createSvgElement('svg', {
            width: '104',
            height: '104',
            viewBox: '0 0 140 140',
            xmlns: svgNamespace
        });
        svg.appendChild(createAnimatedCircle({
            strokeWidth: '1.8',
            opacityValues: '0.7;0',
            begin: '0.85s'
        }));
        svg.appendChild(createAnimatedCircle({
            strokeWidth: '1.2',
            opacityValues: '0.42;0',
            begin: '1.08s'
        }));
        svg.appendChild(createSvgElement('path', {
            d: 'M70 70L70 112L80 102L86 118L92 115.5L86 100L99 100L70 70Z',
            fill: 'var(--color-card)',
            stroke: 'var(--color-text-primary)',
            'stroke-width': '2',
            'stroke-linejoin': 'round',
            'stroke-linecap': 'round'
        }));
        return svg;
    }

    function showContinueHint(titleMessage, subtitleMessage) {
        try {
            const created = createShadowHost('kampus-autologin-hint', {
                zIndex: 2147483646,
                pointerEvents: 'none'
            });
            if (!created) {
                return;
            }

            const { host, shadowRoot } = created;
            appendShadowStyles(shadowRoot, [
                ':host { all: initial; position: fixed; inset: 0; z-index: 2147483646; pointer-events: none; --color-text-primary: #1f2937; --color-muted: #6c757d; --color-border: #e9ecef; --color-card: #f7f7fb; --color-accent: #643695; }',
                '@keyframes clickCursor { 0%, 30% { transform: scale(1); } 45% { transform: scale(0.88); } 65%, 100% { transform: scale(1); } }',
                '@keyframes fadeInScale { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }',
                '.overlay { width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; }',
                '.card { display: flex; flex-direction: column; align-items: center; gap: 14px; width: min(280px, calc(100vw - 32px)); padding: 22px 32px 28px; background: var(--color-card); color: var(--color-text-primary); border-radius: 14px; box-shadow: 0 12px 28px rgba(0,0,0,0.2); font-family: "Segoe UI", Roboto, Arial, sans-serif; box-sizing: border-box; text-align: center; animation: fadeInScale 0.35s cubic-bezier(0.22,1,0.36,1) both; }',
                '.cursor-wrap { width: 104px; height: 104px; animation: clickCursor 1.8s cubic-bezier(0.22, 1, 0.36, 1) infinite; }',
                '.cursor-wrap svg { display: block; width: 100%; height: 100%; }',
                '.title { margin: 0; max-width: 270px; font-size: 15px; font-weight: 500; color: var(--color-text-primary); line-height: 1.45; letter-spacing: 0.2px; }',
                '.info-wrap { position: relative; display: inline-flex; align-items: center; margin-left: 6px; pointer-events: auto; vertical-align: 1px; }',
                '.info-button { width: 17px; height: 17px; border: 1px solid #c8cdd3; border-radius: 999px; background: #fff; color: #6c757d; font: 700 11px/1 "Segoe UI", Roboto, Arial, sans-serif; display: inline-flex; align-items: center; justify-content: center; cursor: help; padding: 0; }',
                '.info-button:focus-visible { outline: 2px solid rgba(100,54,149,0.28); outline-offset: 3px; }',
                '.tooltip { position: absolute; bottom: calc(100% + 10px); left: 50%; width: min(280px, calc(100vw - 72px)); padding: 10px 12px; border-radius: 8px; background: #1f2937; color: #fff; font-size: 12px; font-weight: 400; line-height: 1.5; text-align: center; box-shadow: 0 10px 24px rgba(0,0,0,0.22); opacity: 0; transform: translate(-50%, 4px); transition: opacity 0.16s ease, transform 0.16s ease; pointer-events: none; visibility: hidden; letter-spacing: 0; }',
                '.tooltip::after { content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 6px solid transparent; border-top-color: #1f2937; }',
                '.info-wrap:hover .tooltip, .info-wrap:focus-within .tooltip { opacity: 1; transform: translate(-50%, 0); visibility: visible; }',
                '@media (prefers-reduced-motion: reduce) { .cursor-wrap { animation: none; } }'
            ]);

            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            const card = document.createElement('div');
            card.className = 'card';
            const cursorWrap = document.createElement('div');
            cursorWrap.className = 'cursor-wrap';
            cursorWrap.setAttribute('aria-hidden', 'true');
            cursorWrap.appendChild(createCursorAnimationSvg());
            const title = document.createElement('p');
            title.className = 'title';
            const titleText = document.createElement('span');
            titleText.textContent = titleMessage;
            const infoWrap = document.createElement('span');
            infoWrap.className = 'info-wrap';
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.setAttribute('role', 'tooltip');
            tooltip.textContent = subtitleMessage;
            const infoButton = document.createElement('button');
            infoButton.type = 'button';
            infoButton.className = 'info-button';
            infoButton.setAttribute('aria-label', subtitleMessage);
            infoButton.textContent = 'i';

            infoWrap.appendChild(tooltip);
            infoWrap.appendChild(infoButton);
            title.appendChild(titleText);
            title.appendChild(infoWrap);
            card.appendChild(cursorWrap);
            card.appendChild(title);
            overlay.appendChild(card);
            shadowRoot.appendChild(overlay);
            document.documentElement.appendChild(host);
        } catch (e) {}
    }

    async function isAutoLoginEnabled() {
        try {
            const result = await browserApi.storage.sync.get({
                autoLoginEnabled: true,
                schoolSupported: true
            });
            return result.autoLoginEnabled && result.schoolSupported;
        } catch (error) {
            console.error('Kampus Auto Login: Error reading settings on ADFS page', error);
            return true;
        }
    }

    async function isAutofillAutoContinueEnabled() {
        try {
            const result = await browserApi.storage.sync.get({ autoFillCredentialsEnabled: true });
            return result.autoFillCredentialsEnabled;
        } catch (error) {
            console.error('Kampus Auto Login: Error reading autofill setting on ADFS page', error);
            return true;
        }
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
        try {
            const params = new URLSearchParams(window.location.search);
            const relayState = params.get('RelayState');
            if (relayState && includesKampusHost(decodeURIComponent(relayState))) {
                return true;
            }
        } catch (e) {}

        return referrerIncludesKampusHost();
    }

    async function runADFSAutomation() {
        const currentHost = window.location.hostname;
        let configuredDomain;
        try {
            const result = await browserApi.storage.sync.get({ adfsDomain: '' });
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

        const uiLanguage = await getLanguage();
        if (isFirefoxLikeBrowser) {
            showLoadingOverlay(t(uiLanguage, 'commonLoggingInLabel'));
        } else {
            showContinueHint(
                t(uiLanguage, 'adfsContinueTitle'),
                t(uiLanguage, 'adfsContinueDescription')
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
                    removeElementWithFade('kampus-autologin-hint');
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
                removeElementWithFade('kampus-autologin-overlay');
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
