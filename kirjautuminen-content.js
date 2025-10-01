// Content script for kirjautuminen.sanomapro.fi
// This script automatically clicks the MPASSid login button

(function() {
    'use strict';
    
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
            const result = await chrome.storage.sync.get({
                autoLoginEnabled: true // Default to enabled for backward compatibility
            });
            return result.autoLoginEnabled;
        } catch (error) {
            console.error('Kampus Auto Login: Error checking settings:', error);
            return true; // Default to enabled if there's an error
        }
    }
    
    function findAndClickMPASSButton() {
        // Use the specific CSS selector for the MPASSid button
        const mpassButton = document.querySelector('#mpass > div.form-group > a > div');
        if (mpassButton) {
            console.log('Kampus Auto Login: Found MPASSid button with specific selector');
            // Click the parent anchor element instead of the div
            const anchorElement = mpassButton.closest('a');
            if (anchorElement) {
                anchorElement.click();
            } else {
                mpassButton.click();
            }
            return true;
        }
        
        // Fallback: Look for the anchor element directly
        const mpassAnchor = document.querySelector('#mpass > div.form-group > a');
        if (mpassAnchor) {
            console.log('Kampus Auto Login: Found MPASSid anchor element');
            mpassAnchor.click();
            return true;
        }
        
        console.log('Kampus Auto Login: MPASSid button not found with specific selector');
        return false;
    }
    
    async function waitAndTryClick() {
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
