// Background service worker – open setup on install

const extensionApi = globalThis.browser || globalThis.chrome;

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
