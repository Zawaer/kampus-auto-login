// Content script for mpass-proxy.csc.fi
// This script automatically clicks the button that redirects to sanomapro.fi

(function() {
    'use strict';

    const extensionApi = globalThis.browser || globalThis.chrome;
    const contentCommon = globalThis.KampusContentCommon || {};
    const showLoadingOverlay = contentCommon.showLoadingOverlay || (() => false);
    const removeElementWithFade = contentCommon.removeElementWithFade || (() => false);
    const createShadowHost = contentCommon.createShadowHost || (() => null);
    const appendShadowStyles = contentCommon.appendShadowStyles || (() => null);
    const includesKampusHost = contentCommon.includesKampusHost || (() => false);
    const referrerIncludesKampusHost = contentCommon.referrerIncludesKampusHost || (() => false);
    const hasRecentKampusFlowFlag = contentCommon.hasRecentKampusFlowFlag || (async () => false);

    console.log('Kampus Auto Login: Running on mpass-proxy.csc.fi');

    function hideSchoolRequiredOverlay() {
        removeElementWithFade('kampus-autologin-school-required');
    }

    function showSchoolRequiredOverlay(titleMessage, descriptionMessage, actionLabel) {
        try {
            const created = createShadowHost('kampus-autologin-school-required', { zIndex: 2147483647 });
            if (!created) {
                return;
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
        } catch (error) {
            console.error('Kampus Auto Login: Failed to show school-required overlay', error);
        }
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
        try {
            const params = new URLSearchParams(window.location.search);
            for (const [key, value] of params.entries()) {
                if (includesKampusHost(`${key}=${value}`)) {
                    return true;
                }
            }
        } catch (e) {}

        if (referrerIncludesKampusHost()) {
            return true;
        }

        return await hasRecentKampusFlowFlag(extensionApi);
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
        
        const uiLanguage = await getLanguage();
        const { schoolName } = await extensionApi.storage.sync.get({ schoolName: '' });
        const searchTerm = (schoolName || '').trim().toLowerCase();
        if (!searchTerm) {
            console.log('Kampus Auto Login: No school configured, waiting for user to choose one in settings');
            removeElementWithFade('kampus-autologin-overlay');
            showSchoolRequiredOverlay(
                t(uiLanguage, 'mpassSchoolRequiredTitle'),
                t(uiLanguage, 'mpassSchoolRequiredDescription'),
                t(uiLanguage, 'mpassSchoolRequiredAction')
            );
            return;
        }

        console.log('Kampus Auto Login: Auto-login is enabled, proceeding...');
        showLoadingOverlay(t(uiLanguage, 'commonLoggingInLabel'));
        
        // First: try immediate presence of last-selected school (only if it matches configured school)
        const lastNow = document.querySelector('#selectedList > div > div.listItem > div');
        if (lastNow && searchTerm) {
            const lastText = (lastNow.textContent || '').toLowerCase();
            if (lastText.includes(searchTerm) || searchTerm.split(/\s+/).some((p) => lastText.includes(p))) {
                console.log('Kampus Auto Login: Found last selected school matching config, clicking it');
                try { lastNow.click(); } catch (e) { console.error('Error clicking last selected', e); }
                return;
            }
        }

        // Wait briefly for the last-selected school to appear. If it matches config, click and stop.
        const observedLast = await observeSelector('#selectedList > div > div.listItem > div', 2000);
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
            removeElementWithFade('kampus-autologin-overlay');
            showSchoolRequiredOverlay(
                t(uiLanguage, 'mpassSchoolRequiredTitle'),
                t(uiLanguage, 'mpassSchoolRequiredDescription'),
                t(uiLanguage, 'mpassSchoolRequiredAction')
            );
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
                    removeElementWithFade('kampus-autologin-overlay');
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
                        removeElementWithFade('kampus-autologin-overlay');
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
