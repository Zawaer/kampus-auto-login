// Content script for kirjautuminen.sanomapro.fi
// This script automatically clicks the MPASSid login button

(function() {
    'use strict';

    const extensionApi = globalThis.browser || globalThis.chrome;
    const contentCommon = globalThis.KampusContentCommon || {};
    const isVisible = contentCommon.isVisible || (() => false);
    const showLoadingOverlay = contentCommon.showLoadingOverlay || (() => false);
    const removeElementWithFade = contentCommon.removeElementWithFade || (() => false);
    const showSchoolRequiredOverlay = contentCommon.showSchoolRequiredOverlay || (() => false);

    // The login page is a RequireJS single-page app: at document_end the DOM is
    // still just a "Loading..." placeholder, and the MPASSid link is rendered
    // seconds later. On a slow connection - or when several tabs are opened at
    // once from a bookmark folder and fight over the bandwidth - that can take
    // well over twenty seconds, so give it a generous window instead of a fixed
    // handful of tries.
    const MPASS_WAIT_TIMEOUT_MS = 45000;
    const MPASS_POLL_INTERVAL_MS = 500;

    // Ordered from most to least specific. The current page wraps the link in
    // .idp-links and points it at the MPASSid SAML endpoint; the #mpass markup
    // is kept for older/other realms that still use it.
    const MPASS_SELECTORS = Object.freeze([
        '.idp-links a[href*="mpass"]',
        'a[href*="mpass-proxy.csc.fi"]',
        'a[href*="spssoinit"][href*="mpass"]',
        '#mpass > div.form-group > a',
        '#mpass a'
    ]);

    console.log('Kampus Auto Login: Running on kirjautuminen.sanomapro.fi');
    
    // Check if auto-login is enabled before proceeding
    async function checkAutoLoginEnabled() {
        try {
            const result = await extensionApi.storage.sync.get({
                autoLoginEnabled: true,
                schoolSupported: true
            });
            return result.autoLoginEnabled && result.schoolSupported;
        } catch (error) {
            console.error('Kampus Auto Login: Error checking settings:', error);
            return true;
        }
    }

    async function getConfiguredSchoolName() {
        try {
            const { schoolName } = await extensionApi.storage.sync.get({ schoolName: '' });
            return (schoolName || '').trim();
        } catch (error) {
            console.error('Kampus Auto Login: Error checking configured school:', error);
            return '';
        }
    }

    function normalizeText(value) {
        return (value || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function findClickableAncestor(element) {
        if (!element) {
            return null;
        }
        return element.closest('a, button, [role="button"], input[type="button"], input[type="submit"], [onclick], [tabindex]') || element;
    }

    function isLikelyContainer(element) {
        if (!element) {
            return true;
        }
        const id = normalizeText(element.id || '');
        const className = normalizeText(element.className || '');
        const containerTokens = ['wrapper', 'container', 'content', 'main', 'layout', 'page'];
        if (containerTokens.some((token) => id === token || className.includes(token))) {
            return true;
        }

        const rect = element.getBoundingClientRect();
        const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
        const elementArea = rect.width * rect.height;
        return elementArea > viewportArea * 0.35;
    }

    function isOwnOverlay(element) {
        return Boolean(element && typeof element.id === 'string' && element.id.startsWith('kampus-autologin'));
    }

    function pickTopmostAtCenter(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        if (centerX < 0 || centerY < 0 || centerX > window.innerWidth || centerY > window.innerHeight) {
            return element;
        }

        // Our own loading overlay covers the whole viewport, so elementFromPoint
        // would hand back the overlay and the synthetic click would land there
        // instead of on the login link. Walk the hit-test stack past it.
        const stack = typeof document.elementsFromPoint === 'function'
            ? document.elementsFromPoint(centerX, centerY)
            : [document.elementFromPoint(centerX, centerY)];

        for (const candidate of stack) {
            if (!candidate || isOwnOverlay(candidate)) {
                continue;
            }
            return findClickableAncestor(candidate) || candidate;
        }

        return element;
    }

    // Returns true when the page's own handler consumed the click (it cancels the
    // event), which means it has already started navigating and we must not
    // navigate on top of it.
    function dispatchUserClick(target) {
        const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });

        target.focus && target.focus();
        target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }));
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        target.dispatchEvent(clickEvent);

        if (clickEvent.defaultPrevented) {
            return true;
        }

        if (typeof target.click === 'function') {
            target.click();
        }
        return false;
    }

    // The login page's MPASSid link runs an inline onclick that copies the
    // current `goto` into RelayState, so the IdP round-trip comes back to
    // Kampus. Mirror that whenever we have to navigate by hand.
    function withRelayState(href) {
        try {
            const goto = new URLSearchParams(window.location.search).get('goto');
            if (!goto) {
                return href;
            }

            const url = new URL(href, window.location.href);
            if (!url.searchParams.has('RelayState')) {
                url.searchParams.set('RelayState', goto);
            }
            return url.toString();
        } catch (error) {
            return href;
        }
    }

    function clickElement(element) {
        const target = findClickableAncestor(element);
        if (!target) {
            console.warn('Kampus Auto Login: No clickable ancestor found');
            return false;
        }

        if (!isVisible(target)) {
            console.warn('Kampus Auto Login: Target not visible');
            return false;
        }

        try {
            target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        } catch (e) {}

        try {
            const topmost = pickTopmostAtCenter(target);
            const clickTarget = topmost || target;
            const handledByPage = dispatchUserClick(clickTarget);

            if (!handledByPage && target.tagName === 'A' && target.href) {
                const targetHref = withRelayState(target.href);
                let unloading = false;
                const markUnloading = () => { unloading = true; };
                window.addEventListener('beforeunload', markUnloading, { once: true });
                window.addEventListener('pagehide', markUnloading, { once: true });

                setTimeout(() => {
                    if (unloading) {
                        return;
                    }
                    try {
                        window.location.href = targetHref;
                    } catch (e) {
                        console.error('Kampus Auto Login: Navigation failed', e);
                    }
                }, 400);
            }

            return true;
        } catch (error) {
            console.error('Kampus Auto Login: Click failed', error);
            try {
                target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            } catch (dispatchError) {
                console.error('Kampus Auto Login: Fallback click failed', dispatchError);
                return false;
            }
        }
    }

    function getDescendantImageAlt(element) {
        try {
            const image = element.querySelector && element.querySelector('img[alt]');
            return image ? image.getAttribute('alt') : '';
        } catch (e) {
            return '';
        }
    }

    function findMPASSElementByText() {
        const controls = document.querySelectorAll('a, button, [role="button"], input[type="button"], input[type="submit"], [onclick], [tabindex], div, span');
        const ranked = [];

        for (const element of controls) {
            const clickable = findClickableAncestor(element);
            if (!clickable || !isVisible(clickable)) {
                continue;
            }

            const text = normalizeText(clickable.textContent || clickable.value || element.textContent || element.value || '');
            const ownText = normalizeText(element.textContent || element.value || '');
            const id = normalizeText(clickable.id || element.id || '');
            const className = normalizeText(clickable.className || element.className || '');
            const href = normalizeText(clickable.getAttribute && clickable.getAttribute('href'));
            const ariaLabel = normalizeText(clickable.getAttribute && clickable.getAttribute('aria-label'));
            const title = normalizeText(clickable.getAttribute && clickable.getAttribute('title'));
            const imageAlt = normalizeText(getDescendantImageAlt(clickable));

            let score = 0;
            let hasMPASSEvidence = false;

            const mark = (points) => {
                score += points;
                hasMPASSEvidence = true;
            };

            if (text.includes('käytä mpassid:tä') || ownText.includes('käytä mpassid:tä')) mark(120);
            if (text.includes('mpassid') || ownText.includes('mpassid') || title.includes('mpassid') || imageAlt.includes('mpassid')) mark(90);
            if (text.includes('mpass') || ownText.includes('mpass') || title.includes('mpass') || imageAlt.includes('mpass')) mark(60);
            if (id.includes('mpass') || className.includes('mpass') || href.includes('mpass') || ariaLabel.includes('mpass')) mark(50);
            if (clickable.matches('a, button, [role="button"], input[type="button"], input[type="submit"]')) score += 30;
            if (isLikelyContainer(clickable)) score -= 100;

            // Being clickable alone is not evidence of anything: without it this
            // ranked every link on the page and happily clicked the footer while
            // the single-page app was still rendering the real MPASSid link.
            if (hasMPASSEvidence && score > 0) {
                ranked.push({ element: clickable, score });
            }
        }

        ranked.sort((a, b) => b.score - a.score);
        if (ranked.length > 0) {
            return ranked[0].element;
        }

        return null;
    }
    
    function findAndClickMPASSButton() {
        for (const selector of MPASS_SELECTORS) {
            const candidate = document.querySelector(selector);
            if (candidate && isVisible(candidate)) {
                return clickElement(candidate);
            }
        }

        const mpassByText = findMPASSElementByText();
        if (mpassByText) {
            return clickElement(mpassByText);
        }
        
        return false;
    }

    function waitForMPASSButtonAndClick(giveUpMessage) {
        const clicked = findAndClickMPASSButton();

        let observer = null;
        let poll = null;

        const stopWatching = () => {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            if (poll) {
                clearInterval(poll);
                poll = null;
            }
        };

        // The timeout is deliberately left running even after a successful click:
        // if the click somehow does not navigate, it still clears the overlay so
        // the user is not left staring at a spinner over a usable login form.
        setTimeout(() => {
            if (observer || poll) {
                stopWatching();
                console.log(giveUpMessage);
            }
            removeElementWithFade('kampus-autologin-overlay');
        }, MPASS_WAIT_TIMEOUT_MS);

        if (clicked) {
            return;
        }

        const attempt = () => {
            if (findAndClickMPASSButton()) {
                stopWatching();
            }
        };

        observer = new MutationObserver(attempt);
        observer.observe(document.documentElement, { childList: true, subtree: true });
        poll = setInterval(attempt, MPASS_POLL_INTERVAL_MS);
    }
    
    async function waitAndTryClick() {
        const pathname = (window.location.pathname || '').toLowerCase();
        const href = (window.location.href || '').toLowerCase();
        if (pathname.includes('/logout') || href.includes('/logout/')) {
            console.log('Kampus Auto Login: Logout page detected, skipping automation');
            return;
        }

        const isEnabled = await checkAutoLoginEnabled();
        
        if (!isEnabled) {
            console.log('Kampus Auto Login: Auto-login is disabled, skipping automation');
            return;
        }

        const uiLanguage = await getLanguage();
        const schoolName = await getConfiguredSchoolName();
        if (!schoolName) {
            console.log('Kampus Auto Login: No school configured, not starting auto-login flow');
            try {
                await extensionApi.storage.local.set({ kampusFlowStartedAt: 0 });
            } catch (e) {}
            removeElementWithFade('kampus-autologin-overlay');
            showSchoolRequiredOverlay(
                extensionApi,
                t(uiLanguage, 'mpassSchoolRequiredTitle'),
                t(uiLanguage, 'mpassSchoolRequiredDescription'),
                t(uiLanguage, 'mpassSchoolRequiredAction')
            );
            return;
        }

        // Mark a short-lived Kampus flow so mpass-proxy can allow automation
        try {
            await extensionApi.storage.local.set({ kampusFlowStartedAt: Date.now() });
        } catch (e) {
            console.warn('Kampus Auto Login: Failed to store Kampus flow flag', e);
        }
        
        console.log('Kampus Auto Login: Auto-login is enabled, proceeding...');
        showLoadingOverlay(t(uiLanguage, 'commonLoggingInLabel'));
        
        waitForMPASSButtonAndClick(
            `Kampus Auto Login: Could not find MPASSid button within ${MPASS_WAIT_TIMEOUT_MS} ms`
        );
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitAndTryClick);
    } else {
        waitAndTryClick();
    }
    
})();
