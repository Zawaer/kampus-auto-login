// Content script for mpass-proxy.csc.fi
// This script automatically clicks the button that redirects to sanomapro.fi

(function() {
    'use strict';

    const extensionApi = globalThis.browser || globalThis.chrome;
    
    console.log('Kampus Auto Login: Running on mpass-proxy.csc.fi');

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

    // Check if auto-login is enabled before proceeding
    async function checkAutoLoginEnabled() {
        try {
            const result = await extensionApi.storage.sync.get({
                autoLoginEnabled: true
            });
            return result.autoLoginEnabled;
        } catch (error) {
            console.error('Kampus Auto Login: Error checking settings:', error);
            return true;
        }
    }

    // Find school item by text content (matches configured school name)
    function findSchoolByText(searchTerm) {
        const items = document.querySelectorAll('[id^="item-"], .listItem, .schoolItem, li, div[role="option"]');
        const term = (searchTerm || '').toLowerCase();
        const termParts = term.split(/\s+/).filter(Boolean);
        for (const item of items) {
            const text = (item.textContent || '').toLowerCase();
            if (termParts.every((p) => text.includes(p)) || text.includes(term)) {
                return item;
            }
        }
        return null;
    }

    // Helper: observe for a selector to appear in the DOM and resolve with the element (or null on timeout)
    function observeSelector(selector, timeout = 10000) {
        return new Promise((resolve) => {
            const existing = document.querySelector(selector);
            if (existing) {
                return resolve(existing);
            }

            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });

            observer.observe(document.documentElement || document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                try { observer.disconnect(); } catch (e) {}
                resolve(null);
            }, timeout);
        });
    }

    // State detection & handlers – uses configured school from storage
    async function handleMPassProxyStates() {
        const { schoolName } = await extensionApi.storage.sync.get({ schoolName: '' });
        const searchTerm = (schoolName || '').trim().toLowerCase();
        if (!searchTerm) {
            console.log('Kampus Auto Login: No school configured, skipping school selection');
            return 'no_school_configured';
        }

        // State 1: Check if there's a "last selected" school
        const lastSelectedSchool = document.querySelector('#selectedList > div > div.listItem > div');
        if (lastSelectedSchool) {
            const lastText = (lastSelectedSchool.textContent || '').toLowerCase();
            if (lastText.includes(searchTerm) || searchTerm.includes(lastText.split(/[\s,]+/)[0])) {
                console.log('Kampus Auto Login: Found last selected school matching config, clicking it');
                lastSelectedSchool.click();
                return 'clicked_last_selected';
            }
        }

        // State 2: Check if we need to search for and select the configured school
        const searchInput = document.querySelector('#searchschoolterm');
        if (searchInput) {
            const currentValue = (searchInput.value || '').trim().toLowerCase();
            const minMatch = searchTerm.substring(0, Math.min(4, searchTerm.length));

            if (!currentValue || !currentValue.includes(minMatch)) {
                console.log('Kampus Auto Login: Filling search input with', searchTerm);

                try {
                    searchInput.focus();
                    searchInput.click();
                    searchInput.value = '';

                    for (let i = 0; i < searchTerm.length; i++) {
                        searchInput.value = searchTerm.substring(0, i + 1);
                        searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: searchTerm[i], bubbles: true }));
                        searchInput.dispatchEvent(new KeyboardEvent('keypress', { key: searchTerm[i], bubbles: true }));
                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                        searchInput.dispatchEvent(new KeyboardEvent('keyup', { key: searchTerm[i], bubbles: true }));
                    }

                    searchInput.dispatchEvent(new Event('change', { bubbles: true }));
                    searchInput.dispatchEvent(new Event('blur', { bubbles: true }));
                } catch (e) {
                    console.warn('Kampus Auto Login: Error during search input simulation', e);
                }

                return 'searching_school';
            }

            const schoolItem = findSchoolByText(searchTerm);
            const continueButton = document.querySelector('#continueButton');

            if (schoolItem && continueButton) {
                console.log('Kampus Auto Login: Found school and continue button');
                schoolItem.click();
                setTimeout(() => {
                    continueButton.click();
                }, 300);
                return 'clicked_search_result';
            }
        }

        // State 3: Check if page is automatically redirecting
        const scriptTags = document.querySelectorAll('script');
        for (let script of scriptTags) {
            if (script.textContent && 
                (script.textContent.includes('location.href') ||
                 script.textContent.includes('window.location') ||
                 script.textContent.includes('redirect'))) {
                console.log('Kampus Auto Login: Detected automatic redirect script, waiting...');
                return 'auto_redirecting';
            }
        }

        const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
        if (metaRefresh) {
            console.log('Kampus Auto Login: Detected meta refresh, waiting for automatic redirect...');
            return 'auto_redirecting';
        }

        return 'unknown_state';
    }

    async function isKampusFlow() {
        const allowedHosts = [
            'sanomapro.fi',
            'kampus.sanomapro.fi',
            'kirjautuminen.sanomapro.fi',
            'mpass-proxy.csc.fi'
        ];

        try {
            const params = new URLSearchParams(window.location.search);
            for (const [key, value] of params.entries()) {
                const lower = `${key}=${value}`.toLowerCase();
                if (allowedHosts.some((host) => lower.includes(host))) {
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

        // Fallback: accept if a recent Kampus flow flag was set on kirjautuminen
        try {
            const { kampusFlowStartedAt } = await extensionApi.storage.local.get({ kampusFlowStartedAt: 0 });
            const maxAgeMs = 10 * 60 * 1000;
            if (kampusFlowStartedAt && (Date.now() - kampusFlowStartedAt) < maxAgeMs) {
                return true;
            }
        } catch (e) {}

        return false;
    }
    
    async function waitAndTryClick() {
        const isEnabled = await checkAutoLoginEnabled();
        
        if (!isEnabled) {
            console.log('Kampus Auto Login: Auto-login is disabled, skipping automation');
            return;
        }

        if (!await isKampusFlow()) {
            console.log('Kampus Auto Login: MPASS page not related to Kampus flow, skipping');
            return;
        }
        
        console.log('Kampus Auto Login: Auto-login is enabled, proceeding...');
        showLoginOverlay();
        
        // First: try immediate presence of last-selected school (only if it matches configured school)
        const { schoolName } = await extensionApi.storage.sync.get({ schoolName: '' });
        const searchTerm = (schoolName || '').trim().toLowerCase();
        const lastNow = document.querySelector('#selectedList > div > div.listItem > div');
        if (lastNow && searchTerm) {
            const lastText = (lastNow.textContent || '').toLowerCase();
            if (lastText.includes(searchTerm) || searchTerm.split(/\s+/).some((p) => lastText.includes(p))) {
                console.log('Kampus Auto Login: Found last selected school matching config, clicking it');
                try { lastNow.click(); } catch (e) { console.error('Error clicking last selected', e); }
                return;
            }
        }

        // Wait for the last-selected school to appear (short timeout). If it matches config, click and stop.
        const observedLast = await observeSelector('#selectedList > div > div.listItem > div', 3000);
        if (observedLast && searchTerm) {
            const lastText = (observedLast.textContent || '').toLowerCase();
            if (lastText.includes(searchTerm) || searchTerm.split(/\s+/).some((p) => lastText.includes(p))) {
                const stored = await extensionApi.storage.sync.get({ autoLoginEnabled: true });
                if (stored.autoLoginEnabled) {
                    console.log('Kampus Auto Login: Observed last selected school matching config, clicking');
                    try { observedLast.click(); } catch (e) { console.error('Error clicking observed element', e); }
                }
                return;
            }
        }

        // If last-selected did not appear within the timeout, proceed to search/other handling
        const result = await handleMPassProxyStates();

        if (result === 'no_school_configured') {
            console.log('Kampus Auto Login: Configure your school in extension options');
            return;
        }

        if (result === 'clicked_last_selected' || result === 'clicked_search_result') {
            console.log('Kampus Auto Login: Successfully handled mpass-proxy state:', result);
            return;
        }

        if (result === 'auto_redirecting') {
            console.log('Kampus Auto Login: Page is auto-redirecting, waiting...');
            return;
        }

        if (result === 'searching_school') {
            console.log('Kampus Auto Login: Initiated school search, waiting for completion...');

            await new Promise(r => setTimeout(r, 800));

            const { schoolName } = await extensionApi.storage.sync.get({ schoolName: '' });
            const term = (schoolName || '').trim().toLowerCase();

            let schoolItem = findSchoolByText(term);
            if (schoolItem) {
                console.log('Kampus Auto Login: School found, clicking it');
                schoolItem.click();
                setTimeout(() => {
                    const cb = document.querySelector('#continueButton');
                    if (cb) cb.click();
                }, 300);
                return;
            }

            console.log('Kampus Auto Login: School not found immediately, observing...');
            const maxWait = 12000;
            const start = Date.now();
            const checkInterval = setInterval(async () => {
                const el = findSchoolByText(term);
                if (el) {
                    clearInterval(checkInterval);
                    console.log('Kampus Auto Login: Found school item, clicking it');
                    el.click();
                    setTimeout(() => {
                        const cb = document.querySelector('#continueButton');
                        if (cb) cb.click();
                    }, 300);
                } else if (Date.now() - start > maxWait) {
                    clearInterval(checkInterval);
                    console.log('Kampus Auto Login: School item not found after', maxWait, 'ms');
                    hideLoginOverlay();
                }
            }, 400);

            return;
        }

        // Retry logic for unknown state
        if (result === 'unknown_state') {
            let attempts = 0;
            const maxAttempts = 10;
            const interval = setInterval(async () => {
                attempts++;
                const retryResult = await handleMPassProxyStates();
                if (retryResult !== 'unknown_state' || attempts >= maxAttempts) {
                    clearInterval(interval);
                    if (attempts >= maxAttempts) {
                        console.log('Kampus Auto Login: Could not handle mpass-proxy state after', maxAttempts, 'attempts');
                        hideLoginOverlay();
                    } else {
                        console.log('Kampus Auto Login: Successfully handled state on retry:', retryResult);
                    }
                }
            }, 1500);
        }
    }
    
    // Check if we're already on the final destination
    if (window.location.href.includes('sanomapro.fi') && !window.location.href.includes('mpass-proxy')) {
        console.log('Kampus Auto Login: Already on final destination');
        return;
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitAndTryClick);
    } else {
        waitAndTryClick();
    }
    
})();
