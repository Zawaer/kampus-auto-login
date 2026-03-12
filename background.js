// Background service worker – open setup on install

const extensionApi = globalThis.browser || globalThis.chrome;

function getAdfsPattern(domain) {
    return `https://${domain}/adfs/ls/*`;
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
            files: ['scripts/adfs-content.js']
        });
    } catch (e) {
        console.error('Kampus Auto Login: Failed to inject ADFS script', e);
    }
}

extensionApi.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        extensionApi.tabs.create({ url: extensionApi.runtime.getURL('ui/setup.html') });
    }
});

extensionApi.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'closeSetupTab') {
        const setupUrl = extensionApi.runtime.getURL('ui/setup.html');
        extensionApi.tabs.query({ url: setupUrl }, (tabs) => {
            tabs.forEach((tab) => extensionApi.tabs.remove(tab.id));
            sendResponse({ closed: tabs.length });
        });
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
