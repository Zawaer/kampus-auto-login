// Content script for mpass-proxy.csc.fi
// This script automatically clicks the button that redirects to sanomapro.fi

(function() {
    'use strict';
    
    console.log('Kampus Auto Login: Running on mpass-proxy.csc.fi');
    
    // Check if auto-login is enabled before proceeding
    async function checkAutoLoginEnabled() {
        try {
            const result = await chrome.storage.sync.get({
                autoLoginEnabled: true // Default to enabled for backward compatibility
            });
            return result.autoLoginEnabled;
        } catch (error) {
            console.error('Kampus Auto Login: Error checking settings:', error);
            return true; // Default to enabled if there's an error
        }
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

    // State detection & handlers
    function handleMPassProxyStates() {
        // State 1: Check if there's a "last selected" school (Otaniemen lukio)
        const lastSelectedSchool = document.querySelector('#selectedList > div > div.listItem > div');
        if (lastSelectedSchool) {
            console.log('Kampus Auto Login: Found last selected school, clicking it');
            lastSelectedSchool.click();
            return 'clicked_last_selected';
        }

        // State 2: Check if we need to search for and select "Otaniemen lukio"
        const searchInput = document.querySelector('#searchschoolterm');
        if (searchInput) {
            console.log('Kampus Auto Login: Found search input, looking for Otaniemen lukio');

            // Check if we haven't already filled the search
            if (!searchInput.value || searchInput.value.toLowerCase() !== 'otaniem') {
                console.log('Kampus Auto Login: Filling search input with "Otaniem"');
                searchInput.value = 'Otaniem';
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                searchInput.dispatchEvent(new Event('change', { bubbles: true }));

                // Return the searching state; the wait handler will observe the actual result element
                return 'searching_school';
            }

            // If search is already filled, try to click the item and continue button
            const otaniemiItem = document.querySelector('#item-151');
            const continueButton = document.querySelector('#continueButton');

            if (otaniemiItem && continueButton) {
                console.log('Kampus Auto Login: Found both item and continue button');
                otaniemiItem.click();
                setTimeout(() => {
                    continueButton.click();
                }, 300);
                return 'clicked_search_result';
            }
        }

        // State 3: Check if page is automatically redirecting (no action needed)
        // Look for signs that an automatic redirect is happening
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

        // Check for meta refresh
        const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
        if (metaRefresh) {
            console.log('Kampus Auto Login: Detected meta refresh, waiting for automatic redirect...');
            return 'auto_redirecting';
        }

        console.log('Kampus Auto Login: No recognizable state found on mpass-proxy page');
        return 'unknown_state';
    }
    
    async function waitAndTryClick() {
        // Check if auto-login is enabled first
        const isEnabled = await checkAutoLoginEnabled();
        
        if (!isEnabled) {
            console.log('Kampus Auto Login: Auto-login is disabled, skipping automation');
            return;
        }
        
        console.log('Kampus Auto Login: Auto-login is enabled, proceeding...');
        
        // First: try immediate presence of last-selected school
        const lastNow = document.querySelector('#selectedList > div > div.listItem > div');
        if (lastNow) {
            console.log('Kampus Auto Login: Found last selected school immediately, clicking it');
            try { lastNow.click(); } catch (e) { console.error('Error clicking last selected', e); }
            return;
        }

        // Wait for the last-selected school to appear (short timeout). If it appears, click and stop.
        const observedLast = await observeSelector('#selectedList > div > div.listItem > div', 5000);
        if (observedLast) {
            // Double-check auto-login setting before acting
            const stored = await chrome.storage.sync.get({ autoLoginEnabled: true });
            if (stored.autoLoginEnabled) {
                console.log('Kampus Auto Login: Observed last selected school after wait, clicking');
                try { observedLast.click(); } catch (e) { console.error('Error clicking observed element', e); }
            } else {
                console.log('Kampus Auto Login: Auto-login disabled; observed element will not be clicked');
            }
            return;
        }

        // If last-selected did not appear within the timeout, proceed to search/other handling
        const result = handleMPassProxyStates();

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

            // Observe for the search result item and click when it appears
            observeSelector('#item-151', 10000).then((el) => {
                if (el) {
                    console.log('Kampus Auto Login: Detected #item-151 via observer, clicking it');
                    el.click();
                    setTimeout(() => {
                        const cb = document.querySelector('#continueButton');
                        if (cb) {
                            console.log('Kampus Auto Login: Clicking continue button after selecting school');
                            cb.click();
                        } else {
                            console.log('Kampus Auto Login: Continue button not found after selecting school');
                        }
                    }, 300);
                } else {
                    console.log('Kampus Auto Login: #item-151 did not appear within timeout');
                }
            });

            return;
        }

        // Retry logic for unknown state
        if (result === 'unknown_state') {
            let attempts = 0;
            const maxAttempts = 10;
            const interval = setInterval(() => {
                attempts++;
                console.log(`Kampus Auto Login: Attempt ${attempts} to handle mpass-proxy state`);

                const retryResult = handleMPassProxyStates();
                if (retryResult !== 'unknown_state' || attempts >= maxAttempts) {
                    clearInterval(interval);
                    if (attempts >= maxAttempts) {
                        console.log('Kampus Auto Login: Could not handle mpass-proxy state after', maxAttempts, 'attempts');

                        // Log available elements for debugging
                        console.log('Kampus Auto Login: Page structure:');
                        console.log('- Selected list element:', document.querySelector('#selectedList'));
                        console.log('- Search input element:', document.querySelector('#searchschoolterm'));
                        console.log('- Otaniemi item element:', document.querySelector('#item-151'));
                        console.log('- Continue button element:', document.querySelector('#continueButton'));
                    } else {
                        console.log('Kampus Auto Login: Successfully handled state on retry:', retryResult);
                    }
                }
            }, 1500); // Longer interval for mpass-proxy states
        }
    }
    
    // Check if we're already on the final destination
    if (window.location.href.includes('sanomapro.fi') && !window.location.href.includes('mpass-proxy')) {
        console.log('Kampus Auto Login: Already on final destination');
        return;
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitAndTryClick);
    } else {
        waitAndTryClick();
    }
    
})();
