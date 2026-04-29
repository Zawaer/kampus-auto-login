// Background service worker – open setup on install

const extensionApi = globalThis.browser || globalThis.chrome;

function getAdfsPattern(domain) {
    return `https://${domain}/adfs/ls/*`;
}

async function openSetupPage() {
    if (!extensionApi.runtime?.openOptionsPage) {
        throw new Error('Options page API is not available');
    }

    await extensionApi.runtime.openOptionsPage();
    return { opened: true, tabId: null, method: 'options' };
}

function sendAsyncResponse(sendResponse, action) {
    action()
        .then((result) => sendResponse(result))
        .catch((error) => {
            console.error('Kampus Auto Login:', error);
            sendResponse({
                opened: false,
                closed: 0,
                error: error?.message || String(error)
            });
        });
}


async function shouldInjectAdfs(tabUrl) {
    if (!tabUrl) return false;

    let url;
    try {
        url = new URL(tabUrl);
    } catch (e) {
        return false;
    }

    if (url.protocol !== 'https:' || !url.pathname.startsWith('/adfs/ls/')) {
        return false;
    }

    const settings = await extensionApi.storage.sync.get({
        adfsDomain: '',
        autoLoginEnabled: true
    });

    const configuredDomain = (settings.adfsDomain || '').trim().toLowerCase();
    if (!settings.autoLoginEnabled || !configuredDomain) {
        return false;
    }

    if (url.hostname.toLowerCase() !== configuredDomain) {
        return false;
    }

    if (!extensionApi.permissions?.contains) {
        return false;
    }

    return await extensionApi.permissions.contains({
        origins: [getAdfsPattern(configuredDomain)]
    });
}

async function injectAdfsContentScript(tabId, tabUrl) {
    if (!extensionApi.scripting?.executeScript) {
        return;
    }

    if (!await shouldInjectAdfs(tabUrl)) {
        return;
    }

    try {
        await extensionApi.scripting.executeScript({
            target: { tabId },
            files: ['ui/i18n.js', 'scripts/content-common.js', 'scripts/adfs-content.js']
        });
    } catch (e) {
        console.error('Kampus Auto Login: Failed to inject ADFS script', e);
    }
}

extensionApi.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        openSetupPage().catch((error) => {
            console.error('Kampus Auto Login: Failed to open setup page on install', error);
        });
    }
});

extensionApi.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openSetupPage') {
        sendAsyncResponse(sendResponse, openSetupPage);
        return true;
    }

});

if (extensionApi.tabs?.onUpdated) {
    extensionApi.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status !== 'complete') {
            return;
        }
        injectAdfsContentScript(tabId, tab?.url).catch((e) => {
            console.error('Kampus Auto Login: ADFS tab check failed', e);
        });
    });
}
