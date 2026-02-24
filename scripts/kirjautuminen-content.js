// Content script for kirjautuminen.sanomapro.fi
// This script automatically clicks the MPASSid login button

(function() {
    'use strict';

    const extensionApi = globalThis.browser || globalThis.chrome;
    
    console.log('Kampus Auto Login: Running on kirjautuminen.sanomapro.fi');

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

    function pickTopmostAtCenter(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        if (centerX < 0 || centerY < 0 || centerX > window.innerWidth || centerY > window.innerHeight) {
            return element;
        }
        const topmost = document.elementFromPoint(centerX, centerY);
        if (!topmost) {
            return element;
        }
        return findClickableAncestor(topmost) || topmost;
    }

    function dispatchUserClick(target) {
        const events = [
            new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }),
            new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }),
            new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }),
            new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
        ];

        target.focus && target.focus();
        for (const event of events) {
            target.dispatchEvent(event);
        }
        if (typeof target.click === 'function') {
            target.click();
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
            dispatchUserClick(clickTarget);
            
            if (target.tagName === 'A' && target.href) {
                const targetHref = target.href;
                setTimeout(() => {
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

            let score = 0;
            if (text.includes('käytä mpassid:tä') || ownText.includes('käytä mpassid:tä')) score += 120;
            if (text.includes('mpassid') || ownText.includes('mpassid')) score += 90;
            if (text.includes('mpass') || ownText.includes('mpass')) score += 60;
            if (id.includes('mpass') || className.includes('mpass') || href.includes('mpass') || ariaLabel.includes('mpass')) score += 50;
            if (clickable.matches('a, button, [role="button"], input[type="button"], input[type="submit"]')) score += 30;
            if (isLikelyContainer(clickable)) score -= 100;

            if (score > 0) {
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
        const mpassButton = document.querySelector('#mpass > div.form-group > a > div');
        if (mpassButton) {
            return clickElement(mpassButton);
        }
        
        const mpassAnchor = document.querySelector('#mpass > div.form-group > a');
        if (mpassAnchor) {
            return clickElement(mpassAnchor);
        }

        const mpassByText = findMPASSElementByText();
        if (mpassByText) {
            return clickElement(mpassByText);
        }
        
        return false;
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

        // Mark a short-lived Kampus flow so mpass-proxy can allow automation
        try {
            await extensionApi.storage.local.set({ kampusFlowStartedAt: Date.now() });
        } catch (e) {
            console.warn('Kampus Auto Login: Failed to store Kampus flow flag', e);
        }
        
        console.log('Kampus Auto Login: Auto-login is enabled, proceeding...');
        showLoginOverlay();
        
        if (findAndClickMPASSButton()) {
            return;
        }
        
        let attempts = 0;
        const maxAttempts = 10;
        const interval = setInterval(() => {
            attempts++;
            
            if (findAndClickMPASSButton() || attempts >= maxAttempts) {
                clearInterval(interval);
                if (attempts >= maxAttempts) {
                    console.log('Kampus Auto Login: Could not find MPASSid button after', maxAttempts, 'attempts');
                    hideLoginOverlay();
                }
            }
        }, 1000);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitAndTryClick);
    } else {
        waitAndTryClick();
    }
    
})();
