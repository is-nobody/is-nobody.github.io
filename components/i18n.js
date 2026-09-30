let translations = {};
let currentLang = 'en';
const RTL = ['ar', 'ur'];
let initResolve;
const ready = new Promise(r => { initResolve = r; });

function t(key, vars) {
    vars = vars || {};
    const parts = key.split('.');
    let val = translations;
    for (let i = 0; i < parts.length; i++) {
        if (val == null) return key;
        val = val[parts[i]];
    }
    if (typeof val !== 'string') return key;
    return val.replace(/\{(\w+)\}/g, function(_, n) { return vars[n] != null ? vars[n] : ''; });
}

function tArr(key) {
    const parts = key.split('.');
    let val = translations;
    for (let i = 0; i < parts.length; i++) {
        if (val == null) return [];
        val = val[parts[i]];
    }
    return Array.isArray(val) ? val : [];
}

function applyTranslations(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function(el) {
        const key = el.getAttribute('data-i18n');
        const attr = el.getAttribute('data-i18n-attr');
        const translated = t(key);
        if (attr) el.setAttribute(attr, translated);
        else el.textContent = translated;
    });
}

async function loadTranslations(lang) {
    try {
        const res = await fetch('translations/' + lang + '.json');
        if (!res.ok) throw new Error('Missing translations for ' + lang);
        translations = await res.json();
        currentLang = lang;
    } catch (e) {
        console.error('[i18n]', e);
        if (lang !== 'en') return loadTranslations('en');
    }
}

async function init() {
    const saved = localStorage.getItem('apex-lang') || 'en';
    document.documentElement.lang = saved;
    document.documentElement.dir = RTL.indexOf(saved) >= 0 ? 'rtl' : 'ltr';
    await loadTranslations(saved);
    applyTranslations();
    initResolve();
}

async function setLanguage(lang) {
    if (!lang) return;
    localStorage.setItem('apex-lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL.indexOf(lang) >= 0 ? 'rtl' : 'ltr';
    await loadTranslations(lang);
    applyTranslations();
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
}

window.i18n = {
    t: t,
    tArr: tArr,
    applyTranslations: applyTranslations,
    init: init,
    setLanguage: setLanguage,
    ready: ready,
    getCurrentLang: function() { return currentLang; }
};