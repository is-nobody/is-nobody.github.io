async function loadNavbar() {
    try {
        const response = await fetch('components/navbar.html');
        const navbarHtml = await response.text();
        document.body.insertAdjacentHTML('afterbegin', navbarHtml);
        
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLearn = document.getElementById('nav-learn');
        const navNews = document.getElementById('nav-news');
        
        if (currentPage === 'index.html' || currentPage === '') {
            if (navLearn) {
                navLearn.className = 'nav-link transition';
                navLearn.style.fontWeight = 'normal';
            }
            if (navNews) navNews.className = 'nav-link transition';
        } else if (currentPage === 'learn.html') {
            if (navLearn) {
                navLearn.className = 'nav-link transition font-semibold';
                navLearn.style.fontWeight = '600';
            }
            if (navNews) navNews.className = 'nav-link transition';
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