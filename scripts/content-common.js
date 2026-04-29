// Shared content-script helpers for Kampus Auto Login

(function () {
    'use strict';

    const KAMPUS_FLOW_HOSTS = Object.freeze([
        'sanomapro.fi',
        'kampus.sanomapro.fi',
        'kirjautuminen.sanomapro.fi',
        'mpass-proxy.csc.fi'
    ]);

    function includesKampusHost(value) {
        if (typeof value !== 'string' || value.length === 0) {
            return false;
        }

        const normalizedValue = value.toLowerCase();
        return KAMPUS_FLOW_HOSTS.some((host) => normalizedValue.includes(host));
    }

    function referrerIncludesKampusHost() {
        try {
            return includesKampusHost(document.referrer || '');
        } catch (e) {
            return false;
        }
    }

    async function hasRecentKampusFlowFlag(extensionApi, maxAgeMs = 10 * 60 * 1000) {
        try {
            const { kampusFlowStartedAt } = await extensionApi.storage.local.get({ kampusFlowStartedAt: 0 });
            return Boolean(kampusFlowStartedAt) && (Date.now() - kampusFlowStartedAt) < maxAgeMs;
        } catch (e) {
            return false;
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

    function removeElementWithFade(elementOrId, durationMs = 250) {
        try {
            const element = typeof elementOrId === 'string'
                ? document.getElementById(elementOrId)
                : elementOrId;

            if (!element) {
                return false;
            }

            element.style.opacity = '0';
            element.style.transition = 'opacity 0.2s ease';
            setTimeout(() => {
                try {
                    element.remove();
                } catch (e) {}
            }, durationMs);
            return true;
        } catch (e) {
            return false;
        }
    }

    function createShadowHost(id, { zIndex = 2147483646, pointerEvents = 'auto' } = {}) {
        if (document.getElementById(id)) {
            return null;
        }

        const host = document.createElement('div');
        host.id = id;
        host.style.position = 'fixed';
        host.style.inset = '0';
        host.style.zIndex = String(zIndex);
        host.style.pointerEvents = pointerEvents;

        const shadowRoot = host.attachShadow({ mode: 'open' });
        return { host, shadowRoot };
    }

    function appendShadowStyles(shadowRoot, rules) {
        const style = document.createElement('style');
        style.textContent = Array.isArray(rules) ? rules.join('\n') : String(rules || '');
        shadowRoot.appendChild(style);
        return style;
    }

    function showLoadingOverlay(message, { id = 'kampus-autologin-overlay', zIndex = 2147483646 } = {}) {
        try {
            const created = createShadowHost(id, { zIndex });
            if (!created) {
                return false;
            }

            const { host, shadowRoot } = created;
            appendShadowStyles(shadowRoot, [
                `:host { all: initial; position: fixed; inset: 0; z-index: ${zIndex}; }`,
                '.overlay { width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; }',
                '.card { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 28px 40px; background: #f7f7fb; color: #1f2937; border-radius: 14px; box-shadow: 0 12px 28px rgba(0,0,0,0.2); font-family: "Segoe UI", Roboto, Arial, sans-serif; box-sizing: border-box; }',
                '.spinner { width: 28px; height: 28px; border: 3px solid rgba(0,0,0,0.12); border-top-color: #643695; border-radius: 50%; animation: kampus-spin 0.7s linear infinite; }',
                '.label { font-size: 15px; font-weight: 500; letter-spacing: 0.3px; }',
                '@keyframes kampus-spin { to { transform: rotate(360deg); } }'
            ]);

            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            const card = document.createElement('div');
            card.className = 'card';
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            const label = document.createElement('div');
            label.className = 'label';
            label.textContent = message;

            card.appendChild(spinner);
            card.appendChild(label);
            overlay.appendChild(card);
            shadowRoot.appendChild(overlay);
            document.documentElement.appendChild(host);
            return true;
        } catch (e) {
            return false;
        }
    }

    function hideSchoolRequiredOverlay() {
        removeElementWithFade('kampus-autologin-school-required');
    }

    function showSchoolRequiredOverlay(extensionApi, titleMessage, descriptionMessage, actionLabel) {
        try {
            const created = createShadowHost('kampus-autologin-school-required', { zIndex: 2147483647 });
            if (!created) {
                return false;
            }

            const { host, shadowRoot } = created;
            appendShadowStyles(shadowRoot, [
                ':host { all: initial; position: fixed; inset: 0; z-index: 2147483647; }',
                '.overlay { width: 100vw; height: 100vh; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; }',
                '.card { position: relative; width: min(380px, calc(100vw - 32px)); display: flex; flex-direction: column; gap: 12px; padding: 28px 32px; background: #f7f7fb; color: #1f2937; border-radius: 14px; box-shadow: 0 12px 28px rgba(0,0,0,0.2); font-family: "Segoe UI", Roboto, Arial, sans-serif; box-sizing: border-box; text-align: center; }',
                '.close-button { position: absolute; top: 10px; right: 10px; width: 32px; height: 32px; border: none; border-radius: 999px; background: transparent; color: #6c757d; font-size: 22px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; }',
                '.close-button:hover { background: rgba(0,0,0,0.06); color: #343a40; }',
                '.title { font-size: 18px; font-weight: 600; line-height: 1.3; color: #643695; }',
                '.description { font-size: 14px; line-height: 1.5; color: #495057; }',
                '.button { margin-top: 4px; width: 100%; padding: 12px 16px; border: 1px solid transparent; border-radius: 6px; background: #643695; color: #fff; font-size: 15px; font-weight: 600; line-height: 1.4; cursor: pointer; transition: background-color 0.2s ease, box-shadow 0.2s ease; }',
                '.button:hover { background: #552a7d; }',
                '.button:focus { outline: none; box-shadow: 0 0 0 2px rgba(100, 54, 149, 0.25); }',
                '.button:active { background: #4c246f; }'
            ]);

            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            const card = document.createElement('div');
            card.className = 'card';
            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'close-button';
            closeButton.setAttribute('aria-label', 'Close');
            closeButton.textContent = '×';
            closeButton.addEventListener('click', hideSchoolRequiredOverlay);
            const title = document.createElement('div');
            title.className = 'title';
            title.textContent = titleMessage;
            const description = document.createElement('div');
            description.className = 'description';
            description.textContent = descriptionMessage;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'button';
            button.textContent = actionLabel;
            button.addEventListener('click', () => {
                try {
                    extensionApi.runtime.sendMessage({ action: 'openSetupPage' }, () => {
                        if (extensionApi.runtime.lastError) {
                            console.error('Kampus Auto Login: Failed to open settings page', extensionApi.runtime.lastError);
                        }
                    });
                } catch (error) {
                    console.error('Kampus Auto Login: Failed to open settings page', error);
                }
            });

            card.appendChild(closeButton);
            card.appendChild(title);
            card.appendChild(description);
            card.appendChild(button);
            overlay.appendChild(card);
            shadowRoot.appendChild(overlay);
            document.documentElement.appendChild(host);
            return true;
        } catch (error) {
            console.error('Kampus Auto Login: Failed to show school-required overlay', error);
            return false;
        }
    }

    globalThis.KampusContentCommon = Object.freeze({
        KAMPUS_FLOW_HOSTS,
        includesKampusHost,
        referrerIncludesKampusHost,
        hasRecentKampusFlowFlag,
        isVisible,
        removeElementWithFade,
        createShadowHost,
        appendShadowStyles,
        showLoadingOverlay,
        hideSchoolRequiredOverlay,
        showSchoolRequiredOverlay
    });
})();
