// Content script for mpass-proxy.csc.fi
// This script automatically clicks the button that redirects to sanomapro.fi

(function() {
    'use strict';
    
    console.log('Kampus Auto Login: Running on mpass-proxy.csc.fi');
    
    function findAndClickContinueButton() {
        // Look for continue/proceed buttons with various selectors
        const selectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button[name="continue"]',
            'button[name="proceed"]',
            'form button',
            '.continue-button',
            '.proceed-button',
            '#continue',
            '#proceed',
            '[data-testid="continue"]',
            '[data-testid="proceed"]'
        ];
        
        for (let selector of selectors) {
            const button = document.querySelector(selector);
            if (button) {
                console.log('Kampus Auto Login: Found continue button with selector:', selector);
                button.click();
                return true;
            }
        }
        
        // Look for buttons by text content
        const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], a');
        for (let button of buttons) {
            const text = (button.textContent || button.value || '').toLowerCase();
            if (text.includes('continue') || 
                text.includes('proceed') || 
                text.includes('jatka') || 
                text.includes('siirry') ||
                text.includes('kirjaudu') ||
                text.includes('login') ||
                text.includes('next') ||
                text.includes('ok') ||
                text.includes('vahvista') ||
                text.includes('confirm')) {
                console.log('Kampus Auto Login: Found continue button by text:', button.textContent || button.value);
                button.click();
                return true;
            }
        }
        
        // Look for forms that might need to be submitted automatically
        const forms = document.querySelectorAll('form');
        for (let form of forms) {
            // Check if form has action pointing to sanomapro.fi or seems like a redirect form
            const action = form.action || '';
            if (action.includes('sanomapro.fi') || 
                form.method.toLowerCase() === 'post' ||
                form.querySelectorAll('input[type="hidden"]').length > 0) {
                console.log('Kampus Auto Login: Found form that might need submission, submitting...');
                form.submit();
                return true;
            }
        }
        
        // Check for JavaScript redirects or auto-submit forms
        const scriptTags = document.querySelectorAll('script');
        for (let script of scriptTags) {
            if (script.textContent && 
                (script.textContent.includes('submit()') || 
                 script.textContent.includes('location.href') ||
                 script.textContent.includes('window.location'))) {
                console.log('Kampus Auto Login: Found script with potential redirect, waiting for it to execute...');
                return true; // Don't interfere with existing redirects
            }
        }
        
        return false;
    }
    
    function waitAndTryClick() {
        // Try immediately
        if (findAndClickContinueButton()) {
            return;
        }
        
        // If not found, wait a bit for dynamic content to load
        let attempts = 0;
        const maxAttempts = 15; // Wait longer as this might involve authentication processing
        const interval = setInterval(() => {
            attempts++;
            console.log(`Kampus Auto Login: Attempt ${attempts} to find continue button`);
            
            if (findAndClickContinueButton() || attempts >= maxAttempts) {
                clearInterval(interval);
                if (attempts >= maxAttempts) {
                    console.log('Kampus Auto Login: Could not find continue button after', maxAttempts, 'attempts');
                    
                    // Log all available interactive elements for debugging
                    const allButtons = document.querySelectorAll('button, input[type="submit"], input[type="button"], a, form');
                    console.log('Kampus Auto Login: Available interactive elements on page:');
                    allButtons.forEach((element, index) => {
                        console.log(`${index + 1}:`, element.tagName, element.textContent || element.value || element.outerHTML.substring(0, 100));
                    });
                }
            }
        }, 1000);
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
