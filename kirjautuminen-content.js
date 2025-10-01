// Content script for kirjautuminen.sanomapro.fi
// This script automatically clicks the MPASSid login button

(function() {
    'use strict';
    
    console.log('Kampus Auto Login: Running on kirjautuminen.sanomapro.fi');
    
    function findAndClickMPASSButton() {
        // Look for MPASSid button with various possible selectors
        const selectors = [
            'button[data-provider="mpassid"]',
            'a[href*="mpass"]',
            'button[onclick*="mpass"]',
            'input[value*="mpass"]',
            '.mpass-button',
            '#mpass-login',
            '[data-testid*="mpass"]',
            'button[class*="mpass"]',
            'a[class*="mpass"]'
        ];
        
        for (let selector of selectors) {
            const button = document.querySelector(selector);
            if (button) {
                console.log('Kampus Auto Login: Found MPASSid button with selector:', selector);
                button.click();
                return true;
            }
        }
        
        // Look for buttons by text content
        const buttons = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
        for (let button of buttons) {
            const text = (button.textContent || button.value || button.alt || '').toLowerCase();
            if (text.includes('mpass') || 
                text.includes('mp-tunnuksilla') || 
                text.includes('opintopolku') ||
                text.includes('koulutustoimija')) {
                console.log('Kampus Auto Login: Found MPASSid button by text:', button.textContent || button.value);
                button.click();
                return true;
            }
        }
        
        // Look for any form elements that might be related to MPASSid
        const forms = document.querySelectorAll('form');
        for (let form of forms) {
            const action = form.action || '';
            if (action.includes('mpass') || action.includes('csc.fi')) {
                console.log('Kampus Auto Login: Found form with MPASSid action, submitting...');
                form.submit();
                return true;
            }
        }
        
        return false;
    }
    
    function waitAndTryClick() {
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
