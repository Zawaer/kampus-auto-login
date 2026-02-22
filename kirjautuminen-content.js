// Content script for kirjautuminen.sanomapro.fi
// This script automatically clicks the MPASSid login button

(function() {
    'use strict';

    const extensionApi = globalThis.browser || globalThis.chrome;
    
    console.log('Kampus Auto Login: Running on kirjautuminen.sanomapro.fi');
    // Visual overlay + centered popup indicator
    function showIndicator(message, bg = '#643695', timeout = 3500) {
        try {
            const overlayId = 'kampus-autologin-overlay';
            const popupId = 'kampus-autologin-indicator';
            let overlay = document.getElementById(overlayId);
            let popup = document.getElementById(popupId);

            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = overlayId;
                Object.assign(overlay.style, {
                    position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                    background: 'rgba(0, 0, 0, 0.35)', zIndex: '2147483646',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'opacity 0.2s ease'
                });
                document.documentElement.appendChild(overlay);
            }

            if (!popup) {
                popup = document.createElement('div');
                popup.id = popupId;
                Object.assign(popup.style, {
                    padding: '20px 32px', background: bg, color: '#fff',
                    borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    zIndex: '2147483647', fontFamily: 'Segoe UI, Roboto, Arial, sans-serif',
                    fontSize: '15px', fontWeight: '500', textAlign: 'center',
                    maxWidth: '320px', lineHeight: '1.4',
                    animation: 'kampus-fadein 0.2s ease'
                });
                overlay.appendChild(popup);

                // Inject keyframe animation if not already present
                if (!document.getElementById('kampus-autologin-style')) {
                    const style = document.createElement('style');
                    style.id = 'kampus-autologin-style';
                    style.textContent = '@keyframes kampus-fadein { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }';
                    document.head.appendChild(style);
                }
            } else {
                popup.style.background = bg;
            }

            popup.textContent = message;

            if (timeout > 0) {
                clearTimeout(overlay._kampusTimeout);
                overlay._kampusTimeout = setTimeout(() => {
                    try {
                        overlay.style.opacity = '0';
                        setTimeout(() => { try { overlay.remove(); } catch (e) {} }, 250);
                    } catch (e) {}
                }, timeout);
            }
        } catch (e) {}
    }
    
    // Check if auto-login is enabled before proceeding
    async function checkAutoLoginEnabled() {
        try {
            const result = await extensionApi.storage.sync.get({
                autoLoginEnabled: true // Default to enabled for backward compatibility
            });
            return result.autoLoginEnabled;
        } catch (error) {
            console.error('Kampus Auto Login: Error checking settings:', error);
            return true; // Default to enabled if there's an error
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

        console.log('Kampus Auto Login: Attempting click on', {
            tag: target.tagName,
            id: target.id || null,
            href: target.getAttribute && target.getAttribute('href'),
            text: normalizeText((target.textContent || '').slice(0, 80))
        });

        try {
            target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        } catch (e) {}

        // Strategy 1: Get topmost element and dispatch full event sequence
        try {
            const topmost = pickTopmostAtCenter(target);
            const clickTarget = topmost || target;
            console.log('Kampus Auto Login: Click target:', clickTarget.tagName, clickTarget.id || '(no id)');
            dispatchUserClick(clickTarget);
            
            // Strategy 2: If target is an anchor with href, also navigate directly after a brief delay
            if (target.tagName === 'A' && target.href) {
                const targetHref = target.href;
                console.log('Kampus Auto Login: Target is anchor, will navigate to:', targetHref);
                setTimeout(() => {
                    console.log('Kampus Auto Login: Executing direct navigation fallback to:', targetHref);
                    try {
                        window.location.href = targetHref;
                    } catch (e) {
                        console.error('Kampus Auto Login: Direct navigation failed', e);
                    }
                }, 400);
            }
            
            return true;
        } catch (error) {
            console.error('Kampus Auto Login: Primary click failed', error);
            try {
                target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            } catch (dispatchError) {
                console.error('Kampus Auto Login: Fallback click also failed', dispatchError);
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
                ranked.push({ element: clickable, score, text: text.slice(0, 160) });
            }
        }

        ranked.sort((a, b) => b.score - a.score);
        if (ranked.length > 0) {
            console.log('Kampus Auto Login: MPASS ranked candidates', ranked.slice(0, 3).map((item) => ({
                tag: item.element.tagName,
                id: item.element.id || null,
                className: item.element.className || null,
                score: item.score,
                text: item.text
            })));
            return ranked[0].element;
        }

        return null;
    }
    
    function findAndClickMPASSButton() {
        // Use the specific CSS selector for the MPASSid button
        const mpassButton = document.querySelector('#mpass > div.form-group > a > div');
        if (mpassButton) {
            console.log('Kampus Auto Login: Found MPASSid button with specific selector');
            const result = clickElement(mpassButton);
            console.log('Kampus Auto Login: Click result:', result);
            return result;
        }
        
        // Fallback: Look for the anchor element directly
        const mpassAnchor = document.querySelector('#mpass > div.form-group > a');
        if (mpassAnchor) {
            console.log('Kampus Auto Login: Found MPASSid anchor element');
            const result = clickElement(mpassAnchor);
            console.log('Kampus Auto Login: Click result:', result);
            return result;
        }

        // Firefox/Zen fallback: locate element by visible text
        const mpassByText = findMPASSElementByText();
        if (mpassByText) {
            console.log('Kampus Auto Login: Found MPASSid button by text', {
                tag: mpassByText.tagName,
                id: mpassByText.id || null,
                className: mpassByText.className || null,
                text: normalizeText((mpassByText.textContent || '').slice(0, 120))
            });
            const result = clickElement(mpassByText);
            console.log('Kampus Auto Login: Click result:', result);
            return result;
        }
        
        console.log('Kampus Auto Login: MPASSid button not found with specific selector');
        return false;
    }
    
    async function waitAndTryClick() {
        const pathname = (window.location.pathname || '').toLowerCase();
        const href = (window.location.href || '').toLowerCase();
        if (pathname.includes('/logout') || href.includes('/logout/')) {
            console.log('Kampus Auto Login: Logout page detected, skipping automation');
            return;
        }

        // Check if auto-login is enabled first
        const isEnabled = await checkAutoLoginEnabled();
        
        if (!isEnabled) {
            console.log('Kampus Auto Login: Auto-login is disabled, skipping automation');
            return;
        }
        
    console.log('Kampus Auto Login: Auto-login is enabled, proceeding...');
    showIndicator('Kampus Auto Login: starting...', '#643695', 4000);
        
        // Try immediately
        if (findAndClickMPASSButton()) {
            showIndicator('Kampus Auto Login: clicked MPASS', '#28a745', 2500);
            return;
        }
        
        // If not found, wait a bit for dynamic content to load
        let attempts = 0;
        const maxAttempts = 10;
        const interval = setInterval(() => {
            attempts++;
            console.log(`Kampus Auto Login: Attempt ${attempts} to find MPASSid button`);
            
            if (findAndClickMPASSButton() || attempts >= maxAttempts) {
                clearInterval(interval);
                if (attempts >= maxAttempts) {
                    console.log('Kampus Auto Login: Could not find MPASSid button after', maxAttempts, 'attempts');
                    
                    // Log all available buttons for debugging
                    const allButtons = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
                    console.log('Kampus Auto Login: Available buttons on page:');
                    allButtons.forEach((btn, index) => {
                        console.log(`${index + 1}:`, btn.textContent || btn.value || btn.outerHTML);
                    });
                } else {
                    showIndicator('Kampus Auto Login: clicked MPASS', '#28a745', 2500);
                }
            }
        }, 1000);
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitAndTryClick);
    } else {
        waitAndTryClick();
    }
    
})();
