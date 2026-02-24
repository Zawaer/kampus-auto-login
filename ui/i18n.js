// i18n – translations for Kampus Auto Login extension

const translations = {
    en: {
        // Setup page
        setupPageTitle: 'Settings',
        setupSchoolLabel: 'School name (search term)',
        setupSchoolPlaceholder: 'School name',
        setupSchoolHint: 'Search term to find your school on mpass-proxy.csc.fi. E.g. "Kerttuli" or full school name.',
        setupDomainLabel: 'Login domain',
        setupDomainPlaceholder: 'sts.edu.espoo.fi',
        setupDomainHint: 'The address appears in the browser address bar when on your municipality\'s login page.',
        setupSaveBtn: 'Save',
        setupSuccessMsg: 'Settings saved.',
        setupSaveError: 'Save failed.',
        setupLangLabel: 'Language:',
        setupLangPrompt: 'Choose your language',
        setupLangFi: 'Suomi',
        setupLangEn: 'English',

        // Popup page
        popupTitle: 'Kampus Auto Login',
        popupEnableToggle: 'Enable Auto Login',
        popupInfoText: 'When enabled, this extension will automatically navigate through the Kampus login process:',
        popupProcess1: 'kampus.sanomapro.fi → kirjautuminen.sanomapro.fi',
        popupProcess2: 'Click MPASSid login button → mpass-proxy.csc.fi',
        popupProcess3: 'Select correct school → sanomapro.fi',
        popupProcess4: 'Open study materials → kampus.sanomapro.fi',
        popupSchoolLabel: 'School:',
        popupDomainLabel: 'Domain:',
        popupNotSet: 'Not set',
        popupChangeSettings: 'Change settings',
    },
    fi: {
        // Setup page
        setupPageTitle: 'Asetukset',
        setupSchoolLabel: 'Koulun nimi (hakusana)',
        setupSchoolPlaceholder: 'Lukion nimi',
        setupSchoolHint: 'Hakutermi, jolla koulu löytyy mpass-proxy.csc.fi -sivulla. Esim. "Kerttuli" tai koulun koko nimi.',
        setupDomainLabel: 'Kirjautumisdomain',
        setupDomainPlaceholder: 'sts.edu.espoo.fi',
        setupDomainHint: 'Osoite näkyy selaimen osoitepalkissa kun olet kunnan kirjautumissivulla.',
        setupSaveBtn: 'Tallenna',
        setupSuccessMsg: 'Asetukset tallennettu.',
        setupSaveError: 'Tallennus epäonnistui.',
        setupLangLabel: 'Kieli:',
        setupLangPrompt: 'Valitse kieli',
        setupLangFi: 'Suomi',
        setupLangEn: 'English',

        // Popup page
        popupTitle: 'Kampus Auto Login',
        popupEnableToggle: 'Ota automaattinen kirjautuminen käyttöön',
        popupInfoText: 'Kun käytössä, laajennus ohjaa automaattisesti Kampus-kirjautumisprosessin läpi:',
        popupProcess1: 'kampus.sanomapro.fi → kirjautuminen.sanomapro.fi',
        popupProcess2: 'Klikkaa MPASSid-kirjautumista → mpass-proxy.csc.fi',
        popupProcess3: 'Valitse oikea koulu → sanomapro.fi',
        popupProcess4: 'Avaa opetusmateriaalit → kampus.sanomapro.fi',
        popupSchoolLabel: 'Koulu:',
        popupDomainLabel: 'Domain:',
        popupNotSet: 'Ei asetettu',
        popupChangeSettings: 'Vaihda asetukset',
    },
};

const extensionApi = globalThis.browser || globalThis.chrome;

async function getLanguage() {
    try {
        const result = await extensionApi.storage.sync.get({ language: 'fi' });
        return result.language === 'en' ? 'en' : 'fi';
    } catch (e) {
        return 'fi';
    }
}

async function setLanguage(lang) {
    await extensionApi.storage.sync.set({ language: lang });
}

function t(lang, key) {
    const dict = translations[lang] || translations.fi;
    return dict[key] ?? key;
}

function applyTranslations(lang, scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    const dict = translations[lang] || translations.fi;
    root.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        const value = dict[key];
        if (value != null) {
            if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.getAttribute('data-i18n-attr')) {
                const attr = el.getAttribute('data-i18n-attr') || 'placeholder';
                el.setAttribute(attr, value);
            } else {
                el.textContent = value;
            }
            if (key === 'setupPageTitle' && el.tagName === 'TITLE') {
                document.title = value;
            }
        }
    });
    if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.lang = lang === 'en' ? 'en' : 'fi';
    }
}
