async function loadNavbar() {
    try {
        const response = await fetch('components/navbar.html');
        const navbarHtml = await response.text();
        document.body.insertAdjacentHTML('afterbegin', navbarHtml);
        
        // Language dropdown
        const langBtn = document.getElementById('lang-btn');
        const langMenu = document.getElementById('lang-menu');
        const currentLangSpan = document.getElementById('current-lang');
        
        if (langBtn && langMenu) {
            const langNames = {
                'ar': 'العربية', 'bn': 'বাংলা', 'zh': '中文', 'de': 'Deutsch',
                'en': 'English', 'eo': 'Esperanto', 'es': 'Español', 'fr': 'Français',
                'hi': 'हिन्दी', 'id': 'Bahasa Indonesia', 'it': 'Italiano',
                'ja': '日本語', 'ko': '한국어', 'pl': 'Polski', 'pt': 'Português',
                'ru': 'Русский', 'sw': 'Kiswahili', 'ta': 'தமிழ்', 'th': 'ไทย',
                'tr': 'Türkçe', 'uk': 'Українська', 'ur': 'اردو', 'vi': 'Tiếng Việt'
            };
            
            const savedLang = localStorage.getItem('apex-lang') || 'en';
            currentLangSpan.textContent = langNames[savedLang] || 'English';
            
            langBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                langMenu.classList.toggle('hidden');
            });
            
            document.querySelectorAll('.lang-option').forEach(opt => {
                opt.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const lang = this.dataset.lang;
                    currentLangSpan.textContent = this.textContent;
                    localStorage.setItem('apex-lang', lang);
                    langMenu.classList.add('hidden');
                    window.dispatchEvent(new CustomEvent('languageChanged', { 
                        detail: { language: lang } 
                    }));
                });
            });
            
            document.addEventListener('click', function() {
                langMenu.classList.add('hidden');
            });
        }
        
        const themeScript = document.createElement('script');
        themeScript.src = 'components/theme.js';
        document.head.appendChild(themeScript);
        
        themeScript.onload = function() {
            if (window.initTheme) {
                window.initTheme();
            }
        };
        
    } catch (error) {
        console.error('Error loading navbar:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNavbar);
} else {
    loadNavbar();
}