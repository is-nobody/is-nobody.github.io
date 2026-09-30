const LANG_NAMES = {
    'ar': 'العربية', 'bn': 'বাংলা', 'zh': '中文', 'de': 'Deutsch',
    'en': 'English', 'eo': 'Esperanto', 'es': 'Español', 'fr': 'Français',
    'hi': 'हिन्दी', 'id': 'Bahasa Indonesia', 'it': 'Italiano',
    'ja': '日本語', 'ko': '한국어', 'pl': 'Polski', 'pt': 'Português',
    'ru': 'Русский', 'sw': 'Kiswahili', 'ta': 'தமிழ்', 'th': 'ไทย',
    'tr': 'Türkçe', 'uk': 'Українська', 'ur': 'اردو', 'vi': 'Tiếng Việt'
};

async function loadNavbar() {
    try {
        if (!window.i18n) {
            console.error('[navbar] i18n.js missing — include it before load-navbar.js');
            return;
        }

        await window.i18n.ready;

        const response = await fetch('components/navbar.html');
        const navbarHtml = await response.text();
        document.body.insertAdjacentHTML('afterbegin', navbarHtml);

        window.i18n.applyTranslations();

        const langBtn = document.getElementById('lang-btn');
        const langMenu = document.getElementById('lang-menu');
        const currentLangSpan = document.getElementById('current-lang');

        if (langBtn && langMenu && currentLangSpan) {
            const savedLang = localStorage.getItem('apex-lang') || 'en';
            currentLangSpan.textContent = LANG_NAMES[savedLang] || 'English';

            langBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                langMenu.classList.toggle('hidden');
            });

            const options = document.querySelectorAll('.lang-option');
            for (let i = 0; i < options.length; i++) {
                options[i].addEventListener('click', function(e) {
                    e.stopPropagation();
                    const lang = this.dataset.lang;
                    currentLangSpan.textContent = this.textContent;
                    window.i18n.setLanguage(lang);
                    langMenu.classList.add('hidden');
                });
            }

            document.addEventListener('click', function() {
                langMenu.classList.add('hidden');
            });
        }

        const themeScript = document.createElement('script');
        themeScript.src = 'components/theme.js';
        themeScript.onload = function() {
            if (window.initTheme) window.initTheme();
        };
        document.head.appendChild(themeScript);

    } catch (error) {
        console.error('[navbar] load error:', error);
    }
}

async function boot() {
    if (!window.i18n) {
        await new Promise(function(r) { setTimeout(r, 30); });
    }
    if (window.i18n) await window.i18n.init();
    await loadNavbar();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}