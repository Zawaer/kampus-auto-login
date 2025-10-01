(function(){
    'use strict';
    console.log('Kampus Auto Login: Running on sanomapro.fi (click sequence mode)');

    async function autoLoginEnabled() {
        try {
            const res = await chrome.storage.sync.get({ autoLoginEnabled: true });
            return res.autoLoginEnabled;
        } catch (e) {
            console.error('Kampus Auto Login: Error reading settings', e);
            return true;
        }
    }

    // Click sequence will run on every page load (no session flag)

    // Wait for a selector to appear using MutationObserver, resolves element or null on timeout
    function waitForSelector(selector, timeout = 10000) {
        return new Promise((resolve) => {
            try {
                const existing = document.querySelector(selector);
                if (existing) return resolve(existing);

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
            } catch (e) {
                console.error('Kampus Auto Login: waitForSelector error', e);
                resolve(null);
            }
        });
    }

    async function tryClickSequence() {
        if (!await autoLoginEnabled()) {
            console.log('Kampus Auto Login: Auto-login disabled; will not perform clicks on sanomapro');
            return;
        }

        // Skip if on kampus or mpass-proxy hosts
        const host = window.location.hostname;
        if (host.includes('kampus.sanomapro.fi') || host.includes('mpass-proxy.csc.fi')) {
            console.log('Kampus Auto Login: On kampus or mpass-proxy host; skipping sanomapro click sequence');
            return;
        }

        // No session flag check; always attempt click sequence on page load

        try {
            const firstSelector = 'ul.nav:nth-child(2) > li:nth-child(2) > a:nth-child(1)'; // Oppimateriaalit
            const secondSelector = '.open > div:nth-child(2) > div:nth-child(2) > a:nth-child(2) > span:nth-child(1)'; // Otaniemen lukio

            // Helper to simulate a realistic click (tries ancestor anchor, pointer/mouse events, focus/hover)
            async function simulateClick(targetEl) {
                if (!targetEl) return false;
                try {
                    const anchor = targetEl.closest && targetEl.closest('a');
                    if (anchor) {
                        // anchor click is usually most reliable
                        anchor.focus();
                        anchor.click();
                        return true;
                    }

                    // Try a sequence of events to mimic a user click
                    targetEl.focus && targetEl.focus();
                    targetEl.dispatchEvent && targetEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }));
                    targetEl.dispatchEvent && targetEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                    targetEl.dispatchEvent && targetEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                    // small pause
                    await new Promise(r => setTimeout(r, 40));
                    targetEl.dispatchEvent && targetEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                    targetEl.dispatchEvent && targetEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    return true;
                } catch (err) {
                    console.warn('Kampus Auto Login: simulateClick encountered error', err);
                    try {
                        // Last resort: dispatch a simple click event
                        targetEl.click && targetEl.click();
                        return true;
                    } catch (e) {
                        return false;
                    }
                }
            }

            console.log('Kampus Auto Login: Waiting for Oppimateriaalit element:', firstSelector);
            const firstEl = await waitForSelector(firstSelector, 12000);
            if (firstEl) {
                console.log('Kampus Auto Login: Found Oppimateriaalit; attempting realistic click');
                const clicked = await simulateClick(firstEl);
                if (!clicked) {
                    console.warn('Kampus Auto Login: simulateClick failed; will try a fallback dispatch');
                    try { firstEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); } catch (e) { console.warn('Fallback dispatch failed', e); }
                }

                // After clicking, wait a bit for submenu/UI to open
                await new Promise(r => setTimeout(r, 600));

                // If second element is not yet present, try hovering and retry click once
                let secondEl = document.querySelector(secondSelector);
                if (!secondEl) {
                    console.log('Kampus Auto Login: Second element not present yet; attempting hover + retry on Oppimateriaalit');
                    try { firstEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); } catch (e) {}
                    await new Promise(r => setTimeout(r, 400));
                    // retry simulateClick to ensure the submenu opens
                    try { await simulateClick(firstEl); } catch (e) {}
                }
            } else {
                console.log('Kampus Auto Login: Oppimateriaalit element not found');
            }

            // Wait briefly for the UI to update/navigation to occur

            await new Promise(r => setTimeout(r, 900));

            console.log('Kampus Auto Login: Waiting for Otaniemen lukio element:', secondSelector);
            const secondEl = await waitForSelector(secondSelector, 12000);
            if (secondEl) {
                try {
                    console.log('Kampus Auto Login: Clicking Otaniemen lukio');
                    secondEl.click();
                    // Mark successful click attempt to avoid repeating after success
                    // No session flag set; running on each load
                } catch (e) {
                    console.warn('Kampus Auto Login: Click failed on Otaniemen lukio, dispatching mouse event', e);
                    secondEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    // No session flag set; running on each load
                }
            } else {
                console.log('Kampus Auto Login: Otaniemen lukio element not found');
            }

        } catch (e) {
            console.error('Kampus Auto Login: Error during sanomapro click sequence', e);
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryClickSequence);
    } else {
        tryClickSequence();
    }

})();
