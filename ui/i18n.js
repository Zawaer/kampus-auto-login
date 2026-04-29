// i18n – translations for Kampus Auto Login extension

const translations = {
    en: {
        // Setup page
        setupPageTitle: 'Settings',
        setupSchoolLabel: 'School name',
        setupSchoolPlaceholder: 'School name',
        setupDomainLabel: 'Login domain',
        setupDomainPlaceholder: 'sts.edu.espoo.fi',
        setupDomainHint: 'The address appears in the browser address bar when on your municipality\'s login page.',
        setupSaveBtn: 'Save',
        setupSuccessMsg: 'Settings saved.',
        setupSaveError: 'Save failed.',
        setupPermissionRequired: 'Please allow the login domain permission to enable auto login.',
        setupSchoolLoading: 'Loading schools...',
        setupSchoolLoadError: 'Could not load schools. You can type your school name manually.',
        setupSchoolNotFound: 'No schools found.',
        setupLangLabel: 'Language:',
        setupLangFi: 'Suomi',
        setupLangEn: 'English',

        // Popup page
        popupTitle: 'Kampus Auto Login',
        popupEnableToggle: 'Enable Auto Login',
        popupAutofillToggle: 'Use autofilled credentials automatically',
        popupAutofillDescription: 'If your browser fills in the saved username and password, the extension continues the login automatically.',
        popupSchoolLabel: 'School:',
        popupDomainLabel: 'Domain:',
        popupNotSet: 'Not set',
        popupChangeSettings: 'Settings',
        popupReportBug: 'Report a bug',

        // Shared labels
        commonLoggingInLabel: 'Logging in...',

        // MPASS page
        mpassSchoolRequiredTitle: 'School selection required',
        mpassSchoolRequiredDescription: 'Select a school in the extension settings so auto login can continue.',
        mpassSchoolRequiredAction: 'Open settings',

        // ADFS page
        adfsContinueTitle: 'Click anywhere or press any key to continue...',
        adfsContinueDescription: 'Chrome protects autofilled passwords by not exposing them to the page until the login form is interacted with. Clicking anywhere or pressing any key lets the browser finish applying the saved credentials, so Kampus Auto Login can continue logging in.',
    },
    fi: {
        // Setup page
        setupPageTitle: 'Asetukset',
        setupSchoolLabel: 'Koulun nimi',
        setupSchoolPlaceholder: 'Lukion nimi',
        setupDomainLabel: 'Kirjautumisosoite',
        setupDomainPlaceholder: 'sts.edu.espoo.fi',
        setupDomainHint: 'Osoite näkyy selaimen osoitepalkissa kun olet kunnan kirjautumissivulla.',
        setupSaveBtn: 'Tallenna',
        setupSuccessMsg: 'Asetukset tallennettu.',
        setupSaveError: 'Tallennus epäonnistui.',
        setupPermissionRequired: 'Salli kirjautumisosoitteen käyttöoikeus, jotta automaattinen kirjautuminen toimii.',
        setupSchoolLoading: 'Ladataan kouluja...',
        setupSchoolLoadError: 'Kouluja ei voitu ladata. Voit kirjoittaa koulun nimen manuaalisesti.',
        setupSchoolNotFound: 'Kouluja ei löytynyt.',
        setupLangLabel: 'Kieli:',
        setupLangFi: 'Suomi',
        setupLangEn: 'English',

        // Popup page
        popupTitle: 'Kampus Auto Login',
        popupEnableToggle: 'Ota automaattinen kirjautuminen käyttöön',
        popupAutofillToggle: 'Käytä selaimen täyttämiä tunnuksia automaattisesti',
        popupAutofillDescription: 'Jos selain täyttää tallennetun käyttäjätunnuksen ja salasanan, laajennus jatkaa kirjautumista automaattisesti.',
        popupSchoolLabel: 'Koulu:',
        popupDomainLabel: 'Kirjautumisosoite:',
        popupNotSet: 'Ei asetettu',
        popupChangeSettings: 'Asetukset',
        popupReportBug: 'Ilmoita ongelmasta',

        // Shared labels
        commonLoggingInLabel: 'Kirjaudutaan...',

        // MPASS page
        mpassSchoolRequiredTitle: 'Koulun valinta puuttuu',
        mpassSchoolRequiredDescription: 'Valitse koulu laajennuksen asetuksista jotta automaattinen kirjautuminen voi jatkua.',
        mpassSchoolRequiredAction: 'Avaa asetukset',

        // ADFS page
        adfsContinueTitle: 'Jatka klikkaamalla mistä tahansa tai painamalla mitä tahansa näppäintä...',
        adfsContinueDescription: 'Chrome suojaa automaattisesti täytettyjä salasanoja näyttämättä niitä sivulla, ennen kuin käyttäjä on vuorovaikutuksessa kirjautumislomakkeen kanssa. Klikkaamalla jostain tai painamalla jotain näppäintä selain voi täyttää automaattisesti täytetyt salasanat, jolloin Kampus Auto Login voi jatkaa kirjautumista.',
    },
};

const extensionApi = globalThis.browser || globalThis.chrome;

async function getLanguage() {
    try {
        const result = await extensionApi.storage.sync.get({ language: 'en' });
        return result.language === 'fi' ? 'fi' : 'en';
    } catch (e) {
        return 'en';
    }
}

async function setLanguage(lang) {
    await extensionApi.storage.sync.set({ language: lang });
}

function t(lang, key) {
    const dict = translations[lang] || translations.en;
    return dict[key] ?? key;
}

function applyTranslations(lang, scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    const dict = translations[lang] || translations.en;
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
        document.documentElement.lang = lang === 'fi' ? 'fi' : 'en';
    }
}
