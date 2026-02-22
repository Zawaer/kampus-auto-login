// Content script for kirjautuminen.sanomapro.fi
// This script automatically clicks the MPASSid login button

(function() {
    'use strict';

    const extensionApi = globalThis.browser || globalThis.chrome;
    
    console.log('Kampus Auto Login: Running on kirjautuminen.sanomapro.fi');
    // Visual indicator helper
    function showIndicator(message, bg = '#643695', timeout = 3500) {
        try {
            const id = 'kampus-autologin-indicator';
            let el = document.getElementById(id);
            if (!el) {
                el = document.createElement('div');
                el.id = id;
                Object.assign(el.style, {
                    position: 'fixed',right: '12px',bottom: '12px',padding: '8px 12px',background: bg,color: '#fff',borderRadius: '6px',boxShadow: '0 4px 12px rgba(0,0,0,0.15)',zIndex: 2147483647,fontFamily: 'Segoe UI, Roboto, Arial, sans-serif',fontSize: '13px'
                });
                document.documentElement.appendChild(el);
            } else { el.style.background = bg }
            el.textContent = message;
            if (timeout > 0) { clearTimeout(el._kampusTimeout); el._kampusTimeout = setTimeout(()=>{ try{ el.remove() }catch(e){} }, timeout) }
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
            return false;
        }

        if (!isVisible(target)) {
            return false;
        }

        try {
            target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        } catch (e) {}

        try {
            const topmost = pickTopmostAtCenter(target);
            dispatchUserClick(topmost || target);
            return true;
        } catch (error) {
            try {
                target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                return true;
            } catch (dispatchError) {
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
            return clickElement(mpassButton);
        }
        
        // Fallback: Look for the anchor element directly
        const mpassAnchor = document.querySelector('#mpass > div.form-group > a');
        if (mpassAnchor) {
            console.log('Kampus Auto Login: Found MPASSid anchor element');
            return clickElement(mpassAnchor);
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
            return clickElement(mpassByText);
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
