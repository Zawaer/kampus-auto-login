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

    globalThis.KampusContentCommon = Object.freeze({
        KAMPUS_FLOW_HOSTS,
        includesKampusHost,
        referrerIncludesKampusHost,
        hasRecentKampusFlowFlag,
        isVisible,
        removeElementWithFade,
        createShadowHost,
        appendShadowStyles,
        showLoadingOverlay
    });
})();
