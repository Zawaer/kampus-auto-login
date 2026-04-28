// Setup page – user enters their municipality's ADFS domain and selects school
// Uses extensionApi from i18n.js (loaded first)

async function closeSetupTab() {
    try {
        const tab = await extensionApi.tabs.getCurrent();
        if (tab?.id) {
            await extensionApi.tabs.remove(tab.id);
            return;
        }
    } catch (e) {}
    try {
        await new Promise((resolve, reject) => {
            extensionApi.runtime.sendMessage({ action: 'closeSetupTab' }, (r) => {
                if (extensionApi.runtime.lastError) reject(extensionApi.runtime.lastError);
                else resolve(r);
            });
        });
    } catch (e) {
        throw e;
    }
}

function showSuccessOverlay(message) {
    if (document.getElementById('kampus-setup-success-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'kampus-setup-success-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:100vw;height:100vh;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;';
    const card = document.createElement('div');
    card.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:28px 40px;background:#f7f7fb;color:#1f2937;border-radius:14px;box-shadow:0 12px 28px rgba(0,0,0,0.2);font-family:"Segoe UI",Roboto,Arial,sans-serif;box-sizing:border-box;';
    const checkWrap = document.createElement('div');
    checkWrap.style.cssText = 'width:48px;height:48px;display:flex;align-items:center;justify-content:center;';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '48');
    svg.setAttribute('height', '48');
    svg.setAttribute('viewBox', '0 0 48 48');
    svg.setAttribute('fill', 'none');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '24');
    circle.setAttribute('cy', '24');
    circle.setAttribute('r', '24');
    circle.setAttribute('fill', '#28a745');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M14 24l8 8 12-14');
    path.setAttribute('stroke', '#fff');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(circle);
    svg.appendChild(path);
    checkWrap.appendChild(svg);
    const label = document.createElement('div');
    label.style.cssText = 'font-size:15px;font-weight:500;letter-spacing:0.3px;';
    label.textContent = message;
    card.appendChild(checkWrap);
    card.appendChild(label);
    wrap.appendChild(card);
    overlay.appendChild(wrap);
    document.documentElement.appendChild(overlay);
}

function hideSuccessOverlay() {
    const el = document.getElementById('kampus-setup-success-overlay');
    if (el) {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.2s ease';
        setTimeout(() => el.remove(), 250);
    }
}

function normalizeDomain(value) {
    const s = (value || '').trim().toLowerCase();
    return s.replace(/^https?:\/\//, '').replace(/\/.*$/, '').split('/')[0];
}

function getAdfsPattern(domain) {
    return `https://${domain}/adfs/ls/*`;
}

const preconfiguredSchoolDomains = {
    'Otaniemen lukio': 'sts.edu.espoo.fi'
};

function getLockedSchoolDomain(schoolName) {
    return preconfiguredSchoolDomains[schoolName] || '';
}

function applySchoolDomainRules(schoolName, domainInput) {
    const formGroup = domainInput.closest('.form-group');
    const lockedDomain = getLockedSchoolDomain(schoolName);

    if (lockedDomain) {
        domainInput.value = lockedDomain;
        domainInput.required = false;
        if (formGroup) {
            formGroup.hidden = true;
        }
        return;
    }

    domainInput.required = true;
    if (formGroup) {
        formGroup.hidden = false;
    }
}

async function ensureAdfsPermission(domain) {
    const optionalOrigins = extensionApi.runtime.getManifest()?.optional_host_permissions || [];
    const supportsOptionalAdfs = optionalOrigins.includes('https://*/adfs/ls/*');

    if (!supportsOptionalAdfs || !extensionApi.permissions?.contains || !extensionApi.permissions?.request) {
        return true;
    }

    const pattern = getAdfsPattern(domain);
    const alreadyGranted = await extensionApi.permissions.contains({ origins: [pattern] });
    if (alreadyGranted) {
        return true;
    }

    return await extensionApi.permissions.request({ origins: [pattern] });
}

async function loadSchoolNames() {
    try {
        const response = await fetch(extensionApi.runtime.getURL('school_names.json'));
        if (!response.ok) throw new Error('Failed to load bundled school list');

        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('Bundled school list is not an array');
        }

        return data
            .filter((name) => typeof name === 'string')
            .map((name) => name.trim())
            .filter(Boolean);
    } catch (e) {
        console.error('Failed to load school names:', e);
        return [];
    }
}

// Initialize school selector
async function initSchoolSelector(currentLang) {
    const searchInput = document.getElementById('schoolSearch');
    const dropdown = document.getElementById('schoolDropdown');
    const schoolNameHidden = document.getElementById('schoolName');
    let allSchoolNames = [];

    const errorMessage = document.getElementById('schoolErrorMessage');

    function clearDropdown() {
        while (dropdown.firstChild) {
            dropdown.removeChild(dropdown.firstChild);
        }
    }

    function showDropdownMessage(className, message) {
        clearDropdown();
        const node = document.createElement('div');
        node.className = className;
        node.textContent = message;
        dropdown.appendChild(node);
    }

    function showErrorMessage(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
    }

    function hideErrorMessage() {
        errorMessage.classList.remove('show');
        errorMessage.textContent = '';
    }

    // Show loading state
    showDropdownMessage('school-loading', t(currentLang, 'setupSchoolLoading'));
    dropdown.classList.add('active');

    allSchoolNames = await loadSchoolNames();

    if (allSchoolNames.length === 0) {
        dropdown.classList.remove('active');
        showErrorMessage(t(currentLang, 'setupSchoolLoadError'));
        return;
    }

    hideErrorMessage();

    // Render schools based on filter
    function renderSchools(filter = '') {
        const filtered = allSchoolNames.filter((schoolName) =>
            schoolName.toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0) {
            showDropdownMessage('school-error', t(currentLang, 'setupSchoolNotFound'));
            return;
        }

        clearDropdown();
        filtered.slice(0, 50).forEach((schoolName) => {
            const option = document.createElement('div');
            option.className = 'school-option';
            option.dataset.school = schoolName;
            option.textContent = schoolName;
            option.addEventListener('click', () => {
                searchInput.value = schoolName;
                schoolNameHidden.value = schoolName;
                applySchoolDomainRules(schoolName, document.getElementById('adfsDomain'));
                dropdown.classList.remove('active');
            });
            dropdown.appendChild(option);
        });
    }

    // Load stored school name
    try {
        const stored = await extensionApi.storage.sync.get({ schoolName: '' });
        if (stored.schoolName) {
            searchInput.value = stored.schoolName;
            schoolNameHidden.value = stored.schoolName;
            applySchoolDomainRules(stored.schoolName, document.getElementById('adfsDomain'));
        }
    } catch (e) {
        console.error('Error loading stored school:', e);
    }

    // Search on input
    searchInput.addEventListener('input', (e) => {
        const filter = e.target.value.trim();
        if (filter.length === 0) {
            dropdown.classList.remove('active');
            return;
        }
        hideErrorMessage();
        renderSchools(filter);
        dropdown.classList.add('active');
    });

    // Show dropdown on focus
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length > 0) {
            renderSchools(searchInput.value.trim());
            dropdown.classList.add('active');
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.id !== 'schoolSearch' && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    // Close dropdown initially
    dropdown.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', async function () {
    const searchInput = document.getElementById('schoolSearch');
    const schoolNameHidden = document.getElementById('schoolName');
    const domainInput = document.getElementById('adfsDomain');
    const form = document.getElementById('setupForm');
    const saveBtn = document.getElementById('saveBtn');
    const successMsg = document.getElementById('successMsg');
    const langSelect = document.getElementById('langSelect');

    function showFormError(message) {
        successMsg.textContent = message;
        successMsg.classList.add('show');
    }

    function hideFormError() {
        successMsg.classList.remove('show');
        successMsg.textContent = '';
    }

    let currentLang = await getLanguage();
    langSelect.value = currentLang;

    let storageResult = { schoolName: '', adfsDomain: '' };
    try {
        storageResult = await extensionApi.storage.sync.get({ schoolName: '', adfsDomain: '' });
        if (storageResult.adfsDomain) domainInput.value = storageResult.adfsDomain;
    } catch (e) {
        console.error('Error loading settings:', e);
    }

    applySchoolDomainRules(storageResult.schoolName, domainInput);

    applyTranslations(currentLang);

    // Initialize school selector
    await initSchoolSelector(currentLang);

    async function switchLanguage(lang) {
        currentLang = lang;
        try {
            await setLanguage(lang);
        } catch (e) {
            console.error('Error saving language:', e);
        }
        applyTranslations(currentLang);
    }

    langSelect.addEventListener('change', () => switchLanguage(langSelect.value));

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const schoolName = (schoolNameHidden.value || searchInput.value || '').trim();
        const domain = normalizeDomain(domainInput.value);
        
        if (!schoolName || !domain) {
            showFormError(t(currentLang, 'setupSaveError'));
            return;
        }

        hideFormError();
        saveBtn.disabled = true;
        try {
            const granted = await ensureAdfsPermission(domain);
            if (!granted) {
                showFormError(t(currentLang, 'setupPermissionRequired'));
                saveBtn.disabled = false;
                return;
            }

            await extensionApi.storage.sync.set({ schoolName, adfsDomain: domain });
            const msg = t(currentLang, 'setupSuccessMsg');
            showSuccessOverlay(msg);
            setTimeout(() => {
                closeSetupTab().then(() => {}).catch(() => {
                    hideSuccessOverlay();
                    saveBtn.disabled = false;
                });
            }, 1500);
        } catch (err) {
            console.error('Error saving:', err);
            showFormError(t(currentLang, 'setupSaveError'));
            saveBtn.disabled = false;
        }
    });
});
