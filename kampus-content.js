// Content script for kampus.sanomapro.fi
// This script handles the initial page and any automatic redirects

(function() {
    'use strict';
    
    console.log('Kampus Auto Login: Running on kampus.sanomapro.fi');
    
    // Check if we're already being redirected
    if (window.location.href.includes('kirjautuminen.sanomapro.fi')) {
        return;
    }
    
    // Wait for page to load and check for redirects
    function checkForRedirect() {
        // Look for common redirect elements or meta tags
        const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
        if (metaRefresh) {
            console.log('Kampus Auto Login: Meta refresh detected');
            return;
        }
        
        // Look for login buttons or links that might trigger redirect
        const loginButton = document.querySelector('a[href*="kirjautuminen"], button[onclick*="kirjautuminen"], input[onclick*="kirjautuminen"]');
        if (loginButton) {
            console.log('Kampus Auto Login: Found login button, clicking...');
            loginButton.click();
            return;
        }
        
        // Look for any form that might need to be submitted
        const loginForm = document.querySelector('form[action*="kirjautuminen"]');
        if (loginForm) {
            console.log('Kampus Auto Login: Found login form, submitting...');
            loginForm.submit();
            return;
        }
        
        // If no explicit redirect mechanism found, wait a bit and check if redirect happens automatically
        setTimeout(() => {
            if (window.location.href === location.href) {
                console.log('Kampus Auto Login: No automatic redirect detected, checking for manual trigger elements...');
                
                // Look for any clickable elements that might contain "login" or similar text
                const clickableElements = document.querySelectorAll('a, button, input[type="button"], input[type="submit"]');
                for (let element of clickableElements) {
                    const text = element.textContent || element.value || element.alt || '';
                    if (text.toLowerCase().includes('kirjautu') || 
                        text.toLowerCase().includes('login') || 
                        text.toLowerCase().includes('sisään')) {
                        console.log('Kampus Auto Login: Found potential login element:', text);
                        element.click();
                        return;
                    }
                }
            }
        }, 2000);
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkForRedirect);
    } else {
        checkForRedirect();
    }
    
})();
