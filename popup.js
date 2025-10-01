// Popup JavaScript for Kampus Auto Login Extension

document.addEventListener('DOMContentLoaded', async function() {
    const toggle = document.getElementById('autoLoginToggle');
    const statusElement = document.getElementById('status');
    const currentSiteElement = document.getElementById('currentSite');
    const refreshButton = document.getElementById('refreshStatus');
    const optionsButton = document.getElementById('openOptions');

    // Load saved settings
    await loadSettings();
    
    // Set up event listeners
    toggle.addEventListener('change', handleToggleChange);
    refreshButton.addEventListener('click', refreshStatus);
    optionsButton.addEventListener('click', openOptions);
    
    // Update current site info
    await updateCurrentSite();

    async function loadSettings() {
        try {
            const result = await chrome.storage.sync.get({
                autoLoginEnabled: true // Default to enabled
            });
            
            toggle.checked = result.autoLoginEnabled;
            updateStatus(result.autoLoginEnabled);
        } catch (error) {
            console.error('Error loading settings:', error);
            toggle.checked = true; // Default fallback
            updateStatus(true);
        }
    }

    async function handleToggleChange() {
        const isEnabled = toggle.checked;
        
        try {
            await chrome.storage.sync.set({
                autoLoginEnabled: isEnabled
            });
            
            updateStatus(isEnabled);
            
            // Show a brief confirmation
            showNotification(isEnabled ? 'Auto-login enabled' : 'Auto-login disabled');
            
        } catch (error) {
            console.error('Error saving settings:', error);
            // Revert toggle on error
            toggle.checked = !isEnabled;
        }
    }

    function updateStatus(isEnabled) {
        statusElement.textContent = isEnabled ? 'Enabled' : 'Disabled';
        statusElement.className = `status-value ${isEnabled ? 'enabled' : 'disabled'}`;
    }

    async function updateCurrentSite() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab && tab.url) {
                const url = new URL(tab.url);
                const hostname = url.hostname;
                
                let siteStatus = 'Other';
                
                if (hostname.includes('kampus.sanomapro.fi')) {
                    siteStatus = 'Kampus (Start)';
                } else if (hostname.includes('kirjautuminen.sanomapro.fi')) {
                    siteStatus = 'Login Page';
                } else if (hostname.includes('mpass-proxy.csc.fi')) {
                    siteStatus = 'MPASS Proxy';
                } else if (hostname.includes('sanomapro.fi')) {
                    siteStatus = 'Sanoma Pro';
                }
                
                currentSiteElement.textContent = siteStatus;
            }
        } catch (error) {
            console.error('Error getting current tab:', error);
            currentSiteElement.textContent = 'Unknown';
        }
    }

    async function refreshStatus() {
        refreshButton.textContent = 'Refreshing...';
        refreshButton.disabled = true;
        
        try {
            await loadSettings();
            await updateCurrentSite();
            showNotification('Status refreshed');
        } catch (error) {
            console.error('Error refreshing status:', error);
            showNotification('Error refreshing status');
        } finally {
            refreshButton.textContent = 'Refresh Status';
            refreshButton.disabled = false;
        }
    }

    function openOptions() {
        // For now, just show an alert - you can implement a full options page later
        showNotification('Settings feature coming soon!');
    }

    function showNotification(message) {
        // Create a temporary notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: #2196F3;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Fade out and remove
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }

    // Add keyboard support
    document.addEventListener('keydown', function(event) {
        if (event.key === ' ' || event.key === 'Enter') {
            if (event.target === toggle) {
                event.preventDefault();
                toggle.checked = !toggle.checked;
                handleToggleChange();
            }
        }
    });
});

// Background script communication (if needed in the future)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateStatus') {
        // Handle status updates from content scripts
        console.log('Status update from content script:', request.data);
    }
});
